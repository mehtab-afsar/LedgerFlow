-- ═══════════════════════════════════════════════════════════════════════════
-- 05 · Service completions, invoices, invoice lines, credit notes
--
-- REFINEMENT ON THE PRD'S OWN WORDING: the PRD lists invoice status as
-- "draft | issued | sent | partially_paid | paid | overdue | disputed |
-- cancelled" — but partially_paid/paid/overdue are payment-derived, and the
-- PRD's own outstanding-balance section is explicit that payment state must
-- never be a stored value that can drift. So `invoices.status` here covers
-- only the DOCUMENT lifecycle (draft/issued/cancelled); payment state is
-- always computed live by the invoice_balances view in migration 06.
-- `is_disputed` is a separate, owner-set flag — a disputed invoice can be
-- issued and partially paid at the same time, so it isn't a status value.
-- "sent" is derived from the communications table (migration 07), not stored
-- here either.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.service_completions (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references public.organisations(id) on delete cascade,
  party_id          uuid not null references public.parties(id) on delete restrict,
  external_reference text,
  service_type      text,
  origin            text,
  destination       text,
  unit              text,
  quantity          numeric(12,2),
  rate_paise        bigint,
  amount_paise      bigint not null
                    constraint service_completions_amount_chk check (amount_paise >= 0),
  occurred_on       date not null,
  notes             text,
  proof_file_path   text,
  status            text not null default 'pending'
                    constraint service_completions_status_chk
                    check (status in ('pending', 'completed', 'invoiced', 'cancelled')),
  created_by        uuid references public.profiles(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists service_completions_org_idx on public.service_completions (org_id);
create index if not exists service_completions_party_idx on public.service_completions (party_id);
create index if not exists service_completions_billable_idx on public.service_completions (org_id, party_id)
  where status = 'completed';

comment on table public.service_completions is
  'The proof-of-delivery-lite unit: a completed service or delivery, billable once status = completed. Not a dispatch record — no vehicle, driver or route.';

create table if not exists public.invoices (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null references public.organisations(id) on delete cascade,
  invoice_no            text not null,
  invoice_date          date not null default current_date,
  due_date              date,
  bill_to_party_id      uuid not null references public.parties(id) on delete restrict,
  deliver_to_party_id   uuid references public.parties(id) on delete restrict,
  bill_to_override_reason text,
  status                text not null default 'draft'
                        constraint invoices_status_chk check (status in ('draft', 'issued', 'cancelled')),
  is_disputed           boolean not null default false,
  disputed_reason       text,
  currency              text not null default 'INR',
  taxable_value_paise   bigint not null default 0
                        constraint invoices_taxable_value_chk check (taxable_value_paise >= 0),
  tax_treatment         text not null
                        constraint invoices_tax_treatment_chk check (tax_treatment in ('reverse_charge', 'forward')),
  tax_rate_pct          numeric(5,2) not null default 0,
  cgst_paise            bigint not null default 0,
  sgst_paise            bigint not null default 0,
  igst_paise            bigint not null default 0,
  round_off_paise       bigint not null default 0,
  total_paise           bigint not null default 0
                        constraint invoices_total_chk check (total_paise >= 0),
  notes                 text,
  pdf_path              text,
  -- The exact data the PDF was generated from, frozen at issue time — a later
  -- edit to a party's address can never change what an issued document is
  -- proven to say.
  issued_snapshot       jsonb,
  created_by            uuid references public.profiles(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint invoices_org_no_uniq unique (org_id, invoice_no)
);

create index if not exists invoices_org_idx on public.invoices (org_id);
create index if not exists invoices_bill_to_idx on public.invoices (bill_to_party_id);
create index if not exists invoices_status_idx on public.invoices (org_id, status);

comment on table public.invoices is
  'An issued (or draft) invoice. bill_to_party_id and deliver_to_party_id are independent — the billed party is not assumed to be who received the service.';
comment on column public.invoices.bill_to_override_reason is
  'Set (and written to audit_events) when bill_to_party_id differs from the underlying service_completions'' own party_id.';

create table if not exists public.invoice_lines (
  id                    uuid primary key default gen_random_uuid(),
  invoice_id            uuid not null references public.invoices(id) on delete cascade,
  service_completion_id uuid references public.service_completions(id) on delete restrict,
  description           text not null,
  hsn_sac               text,
  quantity              numeric(12,2),
  unit                  text,
  rate_paise            bigint,
  discount_paise        bigint not null default 0
                        constraint invoice_lines_discount_chk check (discount_paise >= 0),
  amount_paise          bigint not null
                        constraint invoice_lines_amount_chk check (amount_paise >= 0)
);

-- Double-billing prevention at the storage layer, same pattern as LogiFlow's
-- bill_lines: a service completion can appear on at most one invoice, ever.
create unique index if not exists invoice_lines_service_completion_uniq
  on public.invoice_lines (service_completion_id) where service_completion_id is not null;
create index if not exists invoice_lines_invoice_idx on public.invoice_lines (invoice_id);

create table if not exists public.credit_notes (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.organisations(id) on delete cascade,
  invoice_id     uuid not null references public.invoices(id) on delete restrict,
  credit_note_no text not null,
  reason         text not null,
  amount_paise   bigint not null
                 constraint credit_notes_amount_chk check (amount_paise > 0),
  cgst_paise     bigint not null default 0,
  sgst_paise     bigint not null default 0,
  igst_paise     bigint not null default 0,
  status         text not null default 'issued'
                 constraint credit_notes_status_chk check (status in ('draft', 'issued', 'applied')),
  issued_on      date not null default current_date,
  created_by     uuid references public.profiles(id),
  created_at     timestamptz not null default now(),
  constraint credit_notes_org_no_uniq unique (org_id, credit_note_no)
);

create index if not exists credit_notes_invoice_idx on public.credit_notes (invoice_id);

comment on table public.credit_notes is
  'The only sanctioned way to reduce an issued invoice''s balance other than a payment — an issued invoice is never silently edited.';

drop trigger if exists invoices_updated_at on public.invoices;
create trigger invoices_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();
drop trigger if exists service_completions_updated_at on public.service_completions;
create trigger service_completions_updated_at before update on public.service_completions
  for each row execute function public.set_updated_at();

-- ───────────────────────────────────────────────────────────────────────────
-- RLS
-- ───────────────────────────────────────────────────────────────────────────
alter table public.service_completions enable row level security;
alter table public.invoices            enable row level security;
alter table public.invoice_lines       enable row level security;
alter table public.credit_notes        enable row level security;

drop policy if exists "service_completions_select" on public.service_completions;
create policy "service_completions_select" on public.service_completions
  for select to authenticated using (org_id = (select public.current_org_id()));
drop policy if exists "service_completions_insert" on public.service_completions;
create policy "service_completions_insert" on public.service_completions
  for insert to authenticated with check (org_id = (select public.current_org_id()));
drop policy if exists "service_completions_update" on public.service_completions;
create policy "service_completions_update" on public.service_completions
  for update to authenticated
  using      (org_id = (select public.current_org_id()))
  with check (org_id = (select public.current_org_id()));

drop policy if exists "invoices_select" on public.invoices;
create policy "invoices_select" on public.invoices
  for select to authenticated using (org_id = (select public.current_org_id()));
-- No direct INSERT policy: invoices are created only via create_invoice()
-- (SECURITY DEFINER, migration 06), so tax and numbering can never be
-- bypassed by a client writing the table directly.
drop policy if exists "invoices_update" on public.invoices;
create policy "invoices_update" on public.invoices
  for update to authenticated
  using      (org_id = (select public.current_org_id()) and (select public.has_role('owner')))
  with check (org_id = (select public.current_org_id()));

drop policy if exists "invoice_lines_select" on public.invoice_lines;
create policy "invoice_lines_select" on public.invoice_lines
  for select to authenticated
  using (exists (select 1 from public.invoices i where i.id = invoice_id and i.org_id = (select public.current_org_id())));
-- No write policy at all: invoice_lines are written only by create_invoice().

drop policy if exists "credit_notes_select" on public.credit_notes;
create policy "credit_notes_select" on public.credit_notes
  for select to authenticated using (org_id = (select public.current_org_id()));
-- No direct write policy: credit notes are created only via create_credit_note()
-- (migration 06), same reasoning as invoices.

revoke all on public.service_completions from anon;
revoke all on public.invoices            from anon;
revoke all on public.invoice_lines       from anon;
revoke all on public.credit_notes        from anon;

grant select, insert, update on public.service_completions to authenticated;
grant select, update         on public.invoices            to authenticated;
grant select                 on public.invoice_lines       to authenticated;
grant select                 on public.credit_notes        to authenticated;

-- ─── Rollback ──────────────────────────────────────────────────────────────
-- drop table if exists public.credit_notes;
-- drop table if exists public.invoice_lines;
-- drop table if exists public.invoices;
-- drop table if exists public.service_completions;
