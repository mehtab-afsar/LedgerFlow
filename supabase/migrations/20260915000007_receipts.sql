-- ═══════════════════════════════════════════════════════════════════════════
-- 07 · Receipts and allocations
--
-- A receipt is money received; an allocation is that money applied against a
-- specific invoice. Deliberately two tables, not payments.invoice_id, because
-- a single bank transfer commonly settles several invoices at once (the
-- exact case a one-payment-per-invoice model cannot represent) — see the PRD.
-- v1's UI may start with a simple one-invoice-per-receipt flow; this schema
-- is the full shape from day one so that isn't a migration later.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.receipts (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organisations(id) on delete cascade,
  payer_party_id  uuid not null references public.parties(id) on delete restrict,
  amount_paise    bigint not null
                  constraint receipts_amount_chk check (amount_paise > 0),
  received_on     date not null default current_date,
  method          text not null
                  constraint receipts_method_chk check (method in ('cash', 'bank', 'upi', 'cheque')),
  reference_no    text,
  notes           text,
  attachment_path text,
  created_by      uuid references public.profiles(id),
  created_at      timestamptz not null default now()
);

create index if not exists receipts_org_idx on public.receipts (org_id);
create index if not exists receipts_payer_idx on public.receipts (payer_party_id);

comment on table public.receipts is 'Money received. May settle several invoices (see receipt_allocations) or none yet (unapplied).';

create table if not exists public.receipt_allocations (
  id                   uuid primary key default gen_random_uuid(),
  receipt_id           uuid not null references public.receipts(id) on delete cascade,
  invoice_id           uuid not null references public.invoices(id) on delete restrict,
  amount_allocated_paise bigint not null
                       constraint receipt_allocations_amount_chk check (amount_allocated_paise > 0),
  created_at           timestamptz not null default now(),
  constraint receipt_allocations_receipt_invoice_uniq unique (receipt_id, invoice_id)
);

create index if not exists receipt_allocations_receipt_idx on public.receipt_allocations (receipt_id);
create index if not exists receipt_allocations_invoice_idx on public.receipt_allocations (invoice_id);

comment on table public.receipt_allocations is
  'How much of a receipt applies to a given invoice. A receipt''s unapplied amount is its amount_paise minus the sum of its allocations.';

-- ───────────────────────────────────────────────────────────────────────────
-- RLS — same shape as invoices: read is open to the org, write goes only
-- through record_receipt() so the allocation-sums-to-receipt-amount rule
-- (see the function below) can never be bypassed by a direct table write.
-- ───────────────────────────────────────────────────────────────────────────
alter table public.receipts            enable row level security;
alter table public.receipt_allocations enable row level security;

drop policy if exists "receipts_select" on public.receipts;
create policy "receipts_select" on public.receipts
  for select to authenticated using (org_id = (select public.current_org_id()));

drop policy if exists "receipt_allocations_select" on public.receipt_allocations;
create policy "receipt_allocations_select" on public.receipt_allocations
  for select to authenticated
  using (exists (select 1 from public.receipts r where r.id = receipt_id and r.org_id = (select public.current_org_id())));

revoke all on public.receipts            from anon;
revoke all on public.receipt_allocations from anon;

grant select on public.receipts            to authenticated;
grant select on public.receipt_allocations to authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- record_receipt: create a receipt and (optionally) allocate it across one
-- or more invoices in the same transaction.
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.record_receipt(
  p_payer_party_id uuid,
  p_amount_paise   bigint,
  p_received_on    date,
  p_method         text,
  p_allocations    jsonb,  -- [{invoice_id, amount_paise}], [] for a fully-unapplied receipt
  -- Trailing and defaulted so PostgREST/supabase-js can omit them — see the
  -- same convention on create_invoice() in migration 06.
  p_reference_no   text default null,
  p_notes          text default null
)
returns table (receipt_id uuid)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_org uuid := (select public.current_org_id());
  v_uid uuid := auth.uid();
  v_id  uuid;
  v_row jsonb;
  v_allocated_total bigint := 0;
begin
  if v_org is null then
    raise exception 'record_receipt: no organisation for this account' using errcode = '28000';
  end if;
  if not exists (select 1 from public.parties where id = p_payer_party_id and org_id = v_org) then
    raise exception 'record_receipt: payer not found in your organisation' using errcode = 'P0002';
  end if;

  if p_allocations is not null then
    select coalesce(sum((elem->>'amount_paise')::bigint), 0) into v_allocated_total
      from jsonb_array_elements(p_allocations) elem;
  end if;

  if v_allocated_total > p_amount_paise then
    raise exception 'record_receipt: allocations (%) exceed the receipt amount (%)', v_allocated_total, p_amount_paise
      using errcode = '22003';
  end if;

  insert into public.receipts (org_id, payer_party_id, amount_paise, received_on, method, reference_no, notes, created_by)
  values (v_org, p_payer_party_id, p_amount_paise, p_received_on, p_method, p_reference_no, p_notes, v_uid)
  returning id into v_id;

  if p_allocations is not null then
    for v_row in select * from jsonb_array_elements(p_allocations) loop
      if not exists (
        select 1 from public.invoices
         where id = (v_row->>'invoice_id')::uuid and org_id = v_org and status = 'issued'
      ) then
        raise exception 'record_receipt: invoice % not found or not issued', v_row->>'invoice_id'
          using errcode = 'P0002';
      end if;

      insert into public.receipt_allocations (receipt_id, invoice_id, amount_allocated_paise)
      values (v_id, (v_row->>'invoice_id')::uuid, (v_row->>'amount_paise')::bigint);
    end loop;
  end if;

  return query select v_id;
end;
$$;

comment on function public.record_receipt(uuid, bigint, date, text, jsonb, text, text) is
  'Records money received and allocates it across zero or more invoices, in one transaction.';

revoke execute on function public.record_receipt(uuid, bigint, date, text, jsonb, text, text) from public;
grant  execute on function public.record_receipt(uuid, bigint, date, text, jsonb, text, text) to authenticated;

-- ─── Rollback ──────────────────────────────────────────────────────────────
-- drop function if exists public.record_receipt(uuid, bigint, date, text, jsonb, text, text);
-- drop table if exists public.receipt_allocations;
-- drop table if exists public.receipts;
