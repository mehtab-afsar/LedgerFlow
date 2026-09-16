-- ═══════════════════════════════════════════════════════════════════════════
-- 04 · Gapless document numbering, per organisation, per financial year
--
-- A table, not a sequence: Postgres sequences are non-transactional (they do
-- not roll back), so a failed insert would permanently burn a number — an
-- invoice number with a missing serial is a compliance problem, not a
-- cosmetic one. A counter row updated inside the caller's transaction rolls
-- back with it and is therefore genuinely gapless. Same design as LogiFlow's
-- document_sequences, keyed by org_id instead of branch_id since this product
-- has no multi-location concept in v1.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.document_sequences (
  org_id     uuid not null references public.organisations(id) on delete cascade,
  doc_type   text not null
             constraint document_sequences_type_chk check (doc_type in ('INVOICE', 'CREDIT_NOTE')),
  fy         text not null
             constraint document_sequences_fy_chk check (fy ~ '^[0-9]{4}$'),
  last_value bigint not null default 0
             constraint document_sequences_value_chk check (last_value >= 0),
  updated_at timestamptz not null default now(),
  primary key (org_id, doc_type, fy)
);

comment on table public.document_sequences is
  'Transactional counters for invoice and credit-note numbers. One row per org per doc type per financial year. Never reset, never rewound.';

-- Deny-all: RLS on, zero policies. Only SECURITY DEFINER functions may touch
-- this — a client that could increment the counter directly could burn
-- numbers or forge them.
alter table public.document_sequences enable row level security;
revoke all on public.document_sequences from anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- next_doc_number: allocate the next number for an org/type/FY.
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.next_doc_number(
  p_org_id   uuid,
  p_doc_type text,
  p_date     date
)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_fy     text;
  v_seq    bigint;
  v_prefix text;
begin
  if p_doc_type not in ('INVOICE', 'CREDIT_NOTE') then
    raise exception 'next_doc_number: unknown doc_type %', p_doc_type using errcode = '22023';
  end if;

  v_fy := public.fy_code(p_date);

  select case p_doc_type when 'INVOICE' then invoice_prefix when 'CREDIT_NOTE' then credit_note_prefix end
    into v_prefix
    from public.organisations
   where id = p_org_id;

  if v_prefix is null then
    raise exception 'next_doc_number: organisation % not found', p_org_id using errcode = 'P0002';
  end if;

  insert into public.document_sequences as ds (org_id, doc_type, fy, last_value)
  values (p_org_id, p_doc_type, v_fy, 1)
  on conflict (org_id, doc_type, fy)
  do update set last_value = ds.last_value + 1,
                updated_at = now()
  returning ds.last_value into v_seq;

  if v_seq > 999999 then
    raise exception 'next_doc_number: sequence exhausted for % % %', p_org_id, p_doc_type, v_fy
      using errcode = '22003';
  end if;

  return v_prefix || '-' || v_fy || '-' || lpad(v_seq::text, 6, '0');
end;
$$;

comment on function public.next_doc_number(uuid, text, date) is
  'Allocates the next gapless document number. Transactional: rolls back with the caller, so no number is ever burned.';

revoke execute on function public.next_doc_number(uuid, text, date) from public;
grant  execute on function public.next_doc_number(uuid, text, date) to authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- seed_document_sequence: continue an existing paper/software invoice book.
-- Owner-only, and only before any number has been issued this FY — see the
-- check on last_value being absent (insert, not upsert, so a second call
-- is a no-op rather than silently overwriting an already-issued sequence).
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.seed_document_sequence(
  p_org_id          uuid,
  p_doc_type        text,
  p_fy              text,
  p_starting_number integer
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if p_org_id <> (select public.current_org_id()) or not (select public.has_role('owner')) then
    raise exception 'seed_document_sequence: requires the owner role, on your own organisation' using errcode = '42501';
  end if;
  if p_doc_type not in ('INVOICE', 'CREDIT_NOTE') then
    raise exception 'seed_document_sequence: unknown doc_type %', p_doc_type using errcode = '22023';
  end if;
  if p_starting_number <= 0 or p_starting_number > 999999 then
    raise exception 'seed_document_sequence: starting number out of range' using errcode = '22003';
  end if;

  insert into public.document_sequences (org_id, doc_type, fy, last_value)
  values (p_org_id, p_doc_type, p_fy, p_starting_number)
  on conflict (org_id, doc_type, fy) do nothing;
end;
$$;

revoke execute on function public.seed_document_sequence(uuid, text, text, integer) from public;
grant  execute on function public.seed_document_sequence(uuid, text, text, integer) to authenticated;

-- ─── Rollback ──────────────────────────────────────────────────────────────
-- drop function if exists public.seed_document_sequence(uuid, text, text, integer);
-- drop function if exists public.next_doc_number(uuid, text, date);
-- drop table if exists public.document_sequences;
