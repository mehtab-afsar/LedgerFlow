-- ═══════════════════════════════════════════════════════════════════════════
-- 13 · party_ready_to_bill
--
-- "Who should I invoice next?" is the mirror image of party_outstanding's
-- "who owes me money?" — both are live rollups, never a stored counter,
-- following the same convention as migration 08.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace view public.party_ready_to_bill
with (security_invoker = true) as
select
  party_id,
  org_id,
  count(*)                     as pending_count,
  coalesce(sum(amount_paise), 0) as pending_amount_paise
from public.service_completions
where status = 'completed'
group by party_id, org_id;

comment on view public.party_ready_to_bill is
  'Per-party rollup of completed-but-not-yet-invoiced service completions — drives the "Ready to bill" surface on the invoices page.';

grant select on public.party_ready_to_bill to authenticated;
revoke all on public.party_ready_to_bill from anon;

-- ─── Rollback ──────────────────────────────────────────────────────────────
-- drop view if exists public.party_ready_to_bill;
