-- ═══════════════════════════════════════════════════════════════════════════
-- 14 · Expenses: an org-crossing reference, and three convention breaches
--
-- The expenses table was added later than the rest of the schema and did not
-- follow it. Four things are corrected here. Only ONE of them was exploitable,
-- and the difference is worth writing down, because the other three read like
-- vulnerabilities and are not.
--
-- ── THE REAL BUG ───────────────────────────────────────────────────────────
-- `party_id` referenced public.parties with nothing requiring the party to
-- belong to the same organisation. A signed-in user could attach their own
-- expense to a STRANGER's customer: their own books then carry a foreign
-- party id, and the reference is a probe — it confirms which ids exist in
-- other tenants, one insert at a time.
--
-- Fixed in the schema rather than in application code, with a composite
-- foreign key on (party_id, org_id). No write path can forget it, including
-- the ones not written yet, because there is no code path to remember it in.
--
-- Verified by scripts/verify-expenses-tenancy.mjs, which attempts the attack
-- and was observed to FAIL with this constraint dropped.
--
-- ── WHAT IS *NOT* A VULNERABILITY, despite appearances ──────────────────────
-- `expenses_update` carried a USING clause and no WITH CHECK:
--
--     create policy "expenses_update" on public.expenses
--       for update using (org_id = public.current_org_id());
--
-- That looks like it permits moving a row to another tenant, and a reading of
-- the convention alone would say so. It does not. PostgreSQL documents that
-- when WITH CHECK is omitted from an UPDATE policy, the USING expression is
-- applied to the NEW row as well as to the old one. The cross-tenant update
-- was already refused, and the verification script confirms it empirically
-- against the pre-fix policy.
--
-- It is corrected anyway, for a narrower reason than security: the fallback
-- silently couples two rules that are conceptually different. The day someone
-- widens USING — to let an accountant see another branch's expenses, say —
-- the write rule widens with it, invisibly, in a diff that touches only the
-- read side. Writing both out means that change has to be made on purpose.
--
-- Likewise the other two: the policies omitted `to authenticated`, so they
-- applied to PUBLIC — but `revoke all ... from anon` means anon holds no
-- grant and cannot reach the table regardless. And the helper was called
-- un-hoisted, `public.current_org_id()` rather than `(select ...)`, which is
-- a per-row instead of per-query evaluation: a performance cost, not a
-- correctness one.
--
-- Rollback is at the foot of this file.
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- A composite key target on parties, so children can pin (party, org) as one.
-- Redundant as a uniqueness claim — `id` is already the primary key — and
-- that is the point: it exists purely to be referenced.
-- ───────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'parties_id_org_uniq'
  ) then
    alter table public.parties
      add constraint parties_id_org_uniq unique (id, org_id);
  end if;
end $$;

-- Any expense already pointing at another org's party is severed rather than
-- silently carried forward — the reference was never legitimate, and the
-- alternative is a migration that cannot apply.
update public.expenses e
   set party_id = null
 where e.party_id is not null
   and not exists (
     select 1 from public.parties p
      where p.id = e.party_id and p.org_id = e.org_id
   );

do $$
begin
  if exists (
    select 1 from pg_constraint
     where conname = 'expenses_party_id_fkey' and conrelid = 'public.expenses'::regclass
  ) then
    alter table public.expenses drop constraint expenses_party_id_fkey;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'expenses_party_org_fk'
  ) then
    -- `on delete set null (party_id)` nulls ONLY the party column. A plain
    -- `set null` would try to null org_id too, which is NOT NULL — so the
    -- column list is what preserves the original behaviour rather than
    -- quietly changing it to RESTRICT. Postgres 15+.
    alter table public.expenses
      add constraint expenses_party_org_fk
      foreign key (party_id, org_id) references public.parties (id, org_id)
      on delete set null (party_id);
  end if;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- The policies, rewritten to the convention every other table here follows:
-- always `to authenticated`, always the hoisted `(select …)` form, and every
-- UPDATE carrying both USING and WITH CHECK.
-- ───────────────────────────────────────────────────────────────────────────
drop policy if exists "expenses_select" on public.expenses;
create policy "expenses_select" on public.expenses
  for select to authenticated
  using (org_id = (select public.current_org_id()));

drop policy if exists "expenses_insert" on public.expenses;
create policy "expenses_insert" on public.expenses
  for insert to authenticated
  with check (org_id = (select public.current_org_id()));

drop policy if exists "expenses_update" on public.expenses;
create policy "expenses_update" on public.expenses
  for update to authenticated
  using      (org_id = (select public.current_org_id()))
  with check (org_id = (select public.current_org_id()));

comment on constraint expenses_party_org_fk on public.expenses is
  'An expense may only reference a party in its own organisation. Enforced in the schema so no write path can forget it.';

-- ─── Rollback ──────────────────────────────────────────────────────────────
-- Restores the vulnerable state; for reference only.
--
-- drop policy if exists "expenses_update" on public.expenses;
-- create policy "expenses_update" on public.expenses
--   for update using (org_id = public.current_org_id());
-- alter table public.expenses drop constraint if exists expenses_party_org_fk;
-- alter table public.expenses
--   add constraint expenses_party_id_fkey
--   foreign key (party_id) references public.parties(id) on delete set null;
-- alter table public.parties drop constraint if exists parties_id_org_uniq;
