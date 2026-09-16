-- ═══════════════════════════════════════════════════════════════════════════
-- 11 · Cost tracking
--
-- Nothing in the schema before this tracks what a job actually cost — only
-- what it billed for (service_completions.amount_paise is revenue). Profit
-- needs both sides: a per-job direct cost (fuel, driver, vendor) and
-- overhead not tied to any one job (rent, salaries, subscriptions).
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.service_completions
  add column if not exists cost_paise bigint
  constraint service_completions_cost_chk check (cost_paise is null or cost_paise >= 0);

comment on column public.service_completions.cost_paise is
  'Direct cost of delivering this job (fuel, driver, vendor) — nullable, entered separately from the billed amount_paise.';

create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organisations(id) on delete cascade,
  category     text not null,
  description  text,
  amount_paise bigint not null
               constraint expenses_amount_chk check (amount_paise > 0),
  incurred_on  date not null default current_date,
  party_id     uuid references public.parties(id) on delete set null,
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now()
);

create index if not exists expenses_org_idx on public.expenses (org_id, incurred_on desc);

comment on table public.expenses is
  'Overhead not tied to a specific service completion — rent, salaries, subscriptions. Direct job costs live on service_completions.cost_paise instead.';

alter table public.expenses enable row level security;

-- Same RLS shape as service_completions: read/write scoped to the caller's
-- org, no anon access.
drop policy if exists "expenses_select" on public.expenses;
create policy "expenses_select" on public.expenses
  for select using (org_id = public.current_org_id());

drop policy if exists "expenses_insert" on public.expenses;
create policy "expenses_insert" on public.expenses
  for insert with check (org_id = public.current_org_id());

drop policy if exists "expenses_update" on public.expenses;
create policy "expenses_update" on public.expenses
  for update using (org_id = public.current_org_id());

revoke all on public.expenses from anon;
grant select, insert, update on public.expenses to authenticated;

-- Per-job margin, live-computed — same security_invoker convention as
-- invoice_balances/party_outstanding (migration 08).
create or replace view public.service_completion_margin
with (security_invoker = true) as
select
  id,
  org_id,
  party_id,
  occurred_on,
  status,
  amount_paise                              as revenue_paise,
  cost_paise,
  amount_paise - coalesce(cost_paise, 0)    as margin_paise
from public.service_completions;

comment on view public.service_completion_margin is
  'Per-job revenue, cost and margin. Feeds the dashboard profit figure; also the seam for a future per-job profit breakdown.';

grant select on public.service_completion_margin to authenticated;
revoke all on public.service_completion_margin from anon;

-- ─── Rollback ──────────────────────────────────────────────────────────────
-- drop view if exists public.service_completion_margin;
-- drop table if exists public.expenses;
-- alter table public.service_completions drop column if exists cost_paise;
