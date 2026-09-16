-- ═══════════════════════════════════════════════════════════════════════════
-- 02 · Tenancy: organisations → profiles, RLS helpers, and self-serve signup
--
-- Multi-tenant from day one (per the PRD's tenancy decision) — a second
-- business is an INSERT, not a migration.
--
-- create_organisation() exists because RLS cannot authorise the very first
-- insert: a brand-new auth.users row has no profiles row yet, so
-- current_org_id() is null and has_role() is false, and profiles_insert's own
-- policy requires the inserter to already be owner of the org they're
-- inserting into. A SECURITY DEFINER function whose only check is "this
-- account has no profile yet" is the only self-serve path onto these tables —
-- same pattern as LogiFlow's create_organisation() (20260908000001).
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.organisations (
  id           uuid primary key default gen_random_uuid(),
  legal_name   text not null,
  gstin        text,
  transin      text,
  pan          text,
  state_code   char(2) not null,
  address      text,
  logo_path    text,
  invoice_prefix text not null default 'INV'
               constraint organisations_invoice_prefix_chk check (invoice_prefix ~ '^[A-Z]{2,6}$'),
  credit_note_prefix text not null default 'CN'
               constraint organisations_credit_note_prefix_chk check (credit_note_prefix ~ '^[A-Z]{2,6}$'),
  default_tax_treatment text not null default 'forward'
               constraint organisations_tax_treatment_chk
               check (default_tax_treatment in ('reverse_charge', 'forward')),
  default_tax_rate_pct numeric(5,2) not null default 18.00,
  bank_details jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint organisations_state_code_chk check (state_code ~ '^[0-9]{2}$'),
  constraint organisations_identity_chk check (gstin is not null or transin is not null)
);

comment on table public.organisations is 'One business. The tenancy root.';

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  org_id     uuid not null references public.organisations(id) on delete cascade,
  full_name  text,
  role       text not null default 'staff'
             constraint profiles_role_chk
             check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_org_idx on public.profiles (org_id);

comment on table public.profiles is 'Staff. role owner may issue, cancel, record payments and export; staff may record and view.';

drop trigger if exists organisations_updated_at on public.organisations;
create trigger organisations_updated_at before update on public.organisations
  for each row execute function public.set_updated_at();
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ───────────────────────────────────────────────────────────────────────────
-- RLS helpers. SECURITY DEFINER to break policy recursion on profiles.
-- Callers use `(select public.current_org_id())` inside policies — the
-- parenthesised subselect is hoisted to an InitPlan evaluated once per query.
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select org_id from public.profiles where id = (select auth.uid())
$$;

create or replace function public.current_role_name()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid())
$$;

create or replace function public.has_role(variadic p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_role_name() = any(p_roles), false)
$$;

comment on function public.current_org_id() is
  'The calling user''s organisation. SECURITY DEFINER to avoid RLS recursion on profiles.';

revoke execute on function public.current_org_id()          from public;
revoke execute on function public.current_role_name()       from public;
revoke execute on function public.has_role(variadic text[]) from public;
grant  execute on function public.current_org_id()          to authenticated;
grant  execute on function public.current_role_name()       to authenticated;
grant  execute on function public.has_role(variadic text[]) to authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- RLS
-- ───────────────────────────────────────────────────────────────────────────
alter table public.organisations enable row level security;
alter table public.profiles      enable row level security;

drop policy if exists "organisations_select" on public.organisations;
create policy "organisations_select" on public.organisations
  for select to authenticated
  using (id = (select public.current_org_id()));

drop policy if exists "organisations_update" on public.organisations;
create policy "organisations_update" on public.organisations
  for update to authenticated
  using      (id = (select public.current_org_id()) and (select public.has_role('owner')))
  with check (id = (select public.current_org_id()));

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (org_id = (select public.current_org_id()));

drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles
  for insert to authenticated
  with check (org_id = (select public.current_org_id()) and (select public.has_role('owner')));

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update to authenticated
  using      (id = (select auth.uid()) or
              (org_id = (select public.current_org_id()) and (select public.has_role('owner'))))
  with check (org_id = (select public.current_org_id()));

-- No DELETE policy: organisations and staff are deactivated, never deleted,
-- so issued invoices keep their references.

revoke all on public.organisations from anon;
revoke all on public.profiles      from anon;

grant select, update         on public.organisations to authenticated;
grant select, insert, update on public.profiles      to authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- create_organisation: the only self-serve path onto organisations/profiles.
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.create_organisation(
  p_legal_name  text,
  p_gstin       text,
  p_transin     text,
  p_pan         text,
  p_state_code  text,
  p_address     text,
  p_invoice_prefix text default 'INV',
  p_credit_note_prefix text default 'CN',
  p_default_tax_treatment text default 'forward',
  p_default_tax_rate_pct numeric default 18.00
)
returns table (org_id uuid)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_org_id uuid;
begin
  if v_uid is null then
    raise exception 'create_organisation: no authenticated user' using errcode = '28000';
  end if;

  if exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'create_organisation: this account already belongs to an organisation'
      using errcode = '23505';
  end if;

  insert into public.organisations
    (legal_name, gstin, transin, pan, state_code, address,
     invoice_prefix, credit_note_prefix, default_tax_treatment, default_tax_rate_pct)
  values
    (p_legal_name, nullif(p_gstin, ''), nullif(p_transin, ''), nullif(p_pan, ''), p_state_code, p_address,
     p_invoice_prefix, p_credit_note_prefix, p_default_tax_treatment, p_default_tax_rate_pct)
  returning id into v_org_id;

  insert into public.profiles (id, org_id, full_name, role)
  values (
    v_uid, v_org_id,
    (select raw_user_meta_data ->> 'full_name' from auth.users where id = v_uid),
    'owner'
  );

  return query select v_org_id;
end;
$$;

comment on function public.create_organisation(
  text, text, text, text, text, text, text, text, text, numeric
) is 'Creates an organisation and the caller as owner, in one transaction. The only self-serve path onto organisations/profiles.';

revoke execute on function public.create_organisation(
  text, text, text, text, text, text, text, text, text, numeric
) from public;
grant execute on function public.create_organisation(
  text, text, text, text, text, text, text, text, text, numeric
) to authenticated;

-- ─── Rollback ──────────────────────────────────────────────────────────────
-- drop function if exists public.create_organisation(text, text, text, text, text, text, text, text, text, numeric);
-- drop function if exists public.has_role(variadic text[]);
-- drop function if exists public.current_role_name();
-- drop function if exists public.current_org_id();
-- drop table if exists public.profiles;
-- drop table if exists public.organisations;
