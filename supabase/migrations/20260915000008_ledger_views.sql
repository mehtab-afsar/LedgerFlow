-- ═══════════════════════════════════════════════════════════════════════════
-- 08 · Outstanding-balance views — the client's headline requirement
--
-- "If a party has 10 outstanding bills and 5 are paid, it must show 5
-- outstanding." Never a stored counter: these are plain views recomputed on
-- every read from invoices, receipt_allocations and credit_notes. Recording a
-- receipt or a credit note changes nothing except inserting a row, so this
-- can never go stale the way a cached "outstanding_count" column could.
--
-- SECURITY INVOKER IS NOT OPTIONAL HERE. A view created by the migration
-- role (which has BYPASSRLS) defaults to running with the VIEW OWNER's
-- privileges, not the querying user's — which would make this view silently
-- leak every organisation's balances to every signed-in user. `security_invoker
-- = true` (Postgres 15+) makes the view evaluate RLS as the actual caller,
-- exactly like querying the underlying tables directly would.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace view public.invoice_balances
with (security_invoker = true) as
select
  i.id as invoice_id,
  i.org_id,
  i.bill_to_party_id,
  i.deliver_to_party_id,
  i.status,
  i.invoice_no,
  i.invoice_date,
  i.due_date,
  i.total_paise,
  coalesce(alloc.total_allocated_paise, 0) as amount_paid_paise,
  coalesce(cn.total_credited_paise, 0)     as amount_credited_paise,
  i.total_paise - coalesce(alloc.total_allocated_paise, 0) - coalesce(cn.total_credited_paise, 0)
    as balance_due_paise
from public.invoices i
left join (
  select invoice_id, sum(amount_allocated_paise) as total_allocated_paise
    from public.receipt_allocations
   group by invoice_id
) alloc on alloc.invoice_id = i.id
left join (
  select invoice_id, sum(amount_paise) as total_credited_paise
    from public.credit_notes
   where status = 'applied'
   group by invoice_id
) cn on cn.invoice_id = i.id
where i.status = 'issued';

comment on view public.invoice_balances is
  'Live per-invoice balance: total minus allocated receipts minus applied credit notes. Recomputed on every read — never a stored counter.';

create or replace view public.party_outstanding
with (security_invoker = true) as
select
  bill_to_party_id as party_id,
  org_id,
  count(*) filter (where balance_due_paise > 0)                                        as invoices_outstanding,
  coalesce(sum(balance_due_paise) filter (where balance_due_paise > 0), 0)              as amount_outstanding_paise,
  count(*) filter (where balance_due_paise > 0 and due_date < current_date)             as invoices_overdue,
  coalesce(sum(balance_due_paise) filter (where balance_due_paise > 0 and due_date < current_date), 0)
                                                                                          as amount_overdue_paise
from public.invoice_balances
group by bill_to_party_id, org_id;

comment on view public.party_outstanding is
  'Per-party rollup of invoice_balances. The exact answer to "how many bills are outstanding and for how much" — always derived, never cached.';

grant select on public.invoice_balances  to authenticated;
grant select on public.party_outstanding to authenticated;
revoke all on public.invoice_balances  from anon;
revoke all on public.party_outstanding from anon;

-- ─── Rollback ──────────────────────────────────────────────────────────────
-- drop view if exists public.party_outstanding;
-- drop view if exists public.invoice_balances;
