-- ═══════════════════════════════════════════════════════════════════════════
-- 09 · Audit log, communications log, export batches
--
-- audit_events is append-only: INSERT is granted (scoped to the caller's own
-- org and actor identity), UPDATE/DELETE are not granted to any client role
-- at all, so history cannot be edited or erased once written — same shape as
-- LogiFlow's consignment_events.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.audit_events (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organisations(id) on delete cascade,
  actor_id    uuid references public.profiles(id),
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  before      jsonb,
  after       jsonb,
  reason      text,
  at          timestamptz not null default now()
);

create index if not exists audit_events_org_idx on public.audit_events (org_id, at desc);
create index if not exists audit_events_entity_idx on public.audit_events (entity_type, entity_id);

comment on table public.audit_events is
  'Append-only. No UPDATE or DELETE grant to any client role — history cannot be edited or erased once written.';

alter table public.audit_events enable row level security;

drop policy if exists "audit_events_select" on public.audit_events;
create policy "audit_events_select" on public.audit_events
  for select to authenticated using (org_id = (select public.current_org_id()));

drop policy if exists "audit_events_insert" on public.audit_events;
create policy "audit_events_insert" on public.audit_events
  for insert to authenticated
  with check (org_id = (select public.current_org_id()) and actor_id = (select auth.uid()));

-- No UPDATE, no DELETE policy — append-only by construction.

revoke all on public.audit_events from anon;
grant select, insert on public.audit_events to authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- communications: one row per invoice send attempt (email/WhatsApp), so
-- "did the customer actually get this" has an answer instead of a shrug.
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.communications (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references public.organisations(id) on delete cascade,
  invoice_id         uuid not null references public.invoices(id) on delete cascade,
  channel            text not null
                     constraint communications_channel_chk check (channel in ('email', 'whatsapp')),
  recipient          text not null,
  status             text not null default 'sent'
                     constraint communications_status_chk check (status in ('sent', 'failed', 'delivered')),
  provider_message_id text,
  failure_reason     text,
  sent_at            timestamptz not null default now(),
  sent_by            uuid references public.profiles(id)
);

create index if not exists communications_invoice_idx on public.communications (invoice_id);

alter table public.communications enable row level security;

drop policy if exists "communications_select" on public.communications;
create policy "communications_select" on public.communications
  for select to authenticated using (org_id = (select public.current_org_id()));
drop policy if exists "communications_insert" on public.communications;
create policy "communications_insert" on public.communications
  for insert to authenticated with check (org_id = (select public.current_org_id()));

revoke all on public.communications from anon;
grant select, insert on public.communications to authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- export_batches: tracks each Tally export so nothing is exported twice and
-- an accountant has a batch to point to when reconciling.
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.export_batches (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organisations(id) on delete cascade,
  kind         text not null
               constraint export_batches_kind_chk check (kind in ('tally_sales', 'tally_receipts')),
  range_from   date not null,
  range_to     date not null,
  record_count integer not null default 0,
  exported_at  timestamptz not null default now(),
  exported_by  uuid references public.profiles(id)
);

create index if not exists export_batches_org_idx on public.export_batches (org_id, exported_at desc);

alter table public.export_batches enable row level security;

drop policy if exists "export_batches_select" on public.export_batches;
create policy "export_batches_select" on public.export_batches
  for select to authenticated using (org_id = (select public.current_org_id()));
drop policy if exists "export_batches_insert" on public.export_batches;
create policy "export_batches_insert" on public.export_batches
  for insert to authenticated
  with check (org_id = (select public.current_org_id()) and (select public.has_role('owner')));

revoke all on public.export_batches from anon;
grant select, insert on public.export_batches to authenticated;

-- ─── Rollback ──────────────────────────────────────────────────────────────
-- drop table if exists public.export_batches;
-- drop table if exists public.communications;
-- drop table if exists public.audit_events;
