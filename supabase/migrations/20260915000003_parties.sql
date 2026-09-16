-- ═══════════════════════════════════════════════════════════════════════════
-- 03 · Parties, contacts and addresses
--
-- Party identity is split from contacts and addresses (per the PRD review),
-- not because it's more "normalised" for its own sake, but because a
-- customer with a billing office in one city and a delivery dock in another
-- is the normal case for a logistics business's counterparties, and cramming
-- both into one row makes duplicate-party detection and multi-location
-- customers both harder than they need to be.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.parties (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organisations(id) on delete cascade,
  name          text not null,
  gstin         text,
  state_code    char(2),
  default_tax_treatment text
                constraint parties_tax_treatment_chk
                check (default_tax_treatment is null or default_tax_treatment in ('reverse_charge', 'forward')),
  payment_terms_days integer not null default 30
                constraint parties_payment_terms_chk check (payment_terms_days >= 0),
  credit_limit_paise bigint
                constraint parties_credit_limit_chk check (credit_limit_paise is null or credit_limit_paise >= 0),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint parties_state_code_chk check (state_code is null or state_code ~ '^[0-9]{2}$')
);

create index if not exists parties_org_idx on public.parties (org_id);
-- Trigram index for duplicate-party detection (match on name before creating
-- a new row) — see the PRD's "no data migration / duplicate parties" gap.
create index if not exists parties_name_trgm_idx on public.parties
  using gin (name extensions.gin_trgm_ops);
create unique index if not exists parties_org_gstin_uniq
  on public.parties (org_id, gstin) where gstin is not null;

comment on table public.parties is 'A counterparty: customer, broker, or any other party that can be billed or received a service.';

create table if not exists public.party_contacts (
  id         uuid primary key default gen_random_uuid(),
  party_id   uuid not null references public.parties(id) on delete cascade,
  name       text not null,
  role       text not null default 'billing'
             constraint party_contacts_role_chk
             check (role in ('billing', 'operations', 'accounts_payable')),
  email      text,
  phone      text,
  created_at timestamptz not null default now()
);

create index if not exists party_contacts_party_idx on public.party_contacts (party_id);

create table if not exists public.party_addresses (
  id          uuid primary key default gen_random_uuid(),
  party_id    uuid not null references public.parties(id) on delete cascade,
  label       text,
  address     text not null,
  is_billing  boolean not null default false,
  is_delivery boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists party_addresses_party_idx on public.party_addresses (party_id);

drop trigger if exists parties_updated_at on public.parties;
create trigger parties_updated_at before update on public.parties
  for each row execute function public.set_updated_at();

-- ───────────────────────────────────────────────────────────────────────────
-- RLS — straightforward org-scoped CRUD, owner and staff both may manage
-- masters (unlike issuing/cancelling documents, which is owner-only).
-- ───────────────────────────────────────────────────────────────────────────
alter table public.parties         enable row level security;
alter table public.party_contacts  enable row level security;
alter table public.party_addresses enable row level security;

drop policy if exists "parties_select" on public.parties;
create policy "parties_select" on public.parties
  for select to authenticated using (org_id = (select public.current_org_id()));
drop policy if exists "parties_insert" on public.parties;
create policy "parties_insert" on public.parties
  for insert to authenticated with check (org_id = (select public.current_org_id()));
drop policy if exists "parties_update" on public.parties;
create policy "parties_update" on public.parties
  for update to authenticated
  using      (org_id = (select public.current_org_id()))
  with check (org_id = (select public.current_org_id()));

drop policy if exists "party_contacts_select" on public.party_contacts;
create policy "party_contacts_select" on public.party_contacts
  for select to authenticated
  using (exists (select 1 from public.parties p where p.id = party_id and p.org_id = (select public.current_org_id())));
drop policy if exists "party_contacts_write" on public.party_contacts;
create policy "party_contacts_write" on public.party_contacts
  for all to authenticated
  using      (exists (select 1 from public.parties p where p.id = party_id and p.org_id = (select public.current_org_id())))
  with check  (exists (select 1 from public.parties p where p.id = party_id and p.org_id = (select public.current_org_id())));

drop policy if exists "party_addresses_select" on public.party_addresses;
create policy "party_addresses_select" on public.party_addresses
  for select to authenticated
  using (exists (select 1 from public.parties p where p.id = party_id and p.org_id = (select public.current_org_id())));
drop policy if exists "party_addresses_write" on public.party_addresses;
create policy "party_addresses_write" on public.party_addresses
  for all to authenticated
  using      (exists (select 1 from public.parties p where p.id = party_id and p.org_id = (select public.current_org_id())))
  with check  (exists (select 1 from public.parties p where p.id = party_id and p.org_id = (select public.current_org_id())));

revoke all on public.parties         from anon;
revoke all on public.party_contacts  from anon;
revoke all on public.party_addresses from anon;

grant select, insert, update on public.parties         to authenticated;
grant select, insert, update, delete on public.party_contacts  to authenticated;
grant select, insert, update, delete on public.party_addresses to authenticated;

-- ─── Rollback ──────────────────────────────────────────────────────────────
-- drop table if exists public.party_addresses;
-- drop table if exists public.party_contacts;
-- drop table if exists public.parties;
