-- ═══════════════════════════════════════════════════════════════════════════
-- 15 · Money that could go missing
--
-- Two defects, both found by running the operations rather than reading them,
-- and both demonstrated by scripts/verify-cancel-and-allocations.mjs — which
-- was written first and observed to fail on every assertion below.
--
-- ── 1. An allocation could exceed what an invoice owed ──────────────────────
-- record_receipt checked the allocations against the RECEIPT total and never
-- against the target invoice's balance. Allocating 5,00,000 to an invoice for
-- 11,800 was accepted, and drove balance_due_paise to -4,88,200 — a negative
-- receivable, which then netted off every other invoice in the party's
-- outstanding total and understated what the customer really owed.
--
-- Fixed by locking the invoice and checking the allocation against what it
-- still owes, computed the way invoice_balances computes it. The lock is what
-- makes it correct under concurrency; the check alone would still let two
-- simultaneous allocations each pass on a balance that was true when read.
--
-- ── 2. A part-paid invoice could be cancelled outright ──────────────────────
-- cancel_invoice checked the role, the reason and the status — never whether
-- money had been received. Because invoice_balances is filtered to
-- status = 'issued', cancelling a part-paid invoice did not leave a visible
-- dangling allocation; it made the money DISAPPEAR. The receipt still recorded
-- the cash and the allocation still recorded it as applied, but the invoice it
-- pointed at appeared in no balance view. Cash collected stopped reconciling
-- to invoices settled, with nothing reporting the discrepancy.
--
-- Now refused while any receipt or applied credit note touches the invoice.
--
-- ── 3. And the same function only half-reopened the work ────────────────────
-- Cancelling set the service completions back to 'completed' but left the
-- invoice_lines rows in place. invoice_lines has a UNIQUE index on
-- service_completion_id to stop double-billing, so the work showed as billable
-- everywhere and create_invoice refused it with "already invoiced". Cancel and
-- re-issue — the ordinary reason to cancel — did not work at all. The lines
-- are now deleted; issued_snapshot and the audit event preserve what the
-- document said.
--
-- Both functions are superseded whole, signatures unchanged, bodies carried
-- forward with their original comments intact.
--
-- Rollback: re-apply both definitions from 20260915000012_audit_trail.sql.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.record_receipt(
  p_payer_party_id uuid,
  p_amount_paise   bigint,
  p_received_on    date,
  p_method         text,
  p_allocations    jsonb,
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
  v_invoice_id uuid;
  v_amount     bigint;
  v_remaining  bigint;
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
      v_invoice_id := (v_row->>'invoice_id')::uuid;
      v_amount     := (v_row->>'amount_paise')::bigint;

      if v_amount is null or v_amount <= 0 then
        raise exception 'record_receipt: an allocation must be a positive amount'
          using errcode = '22003';
      end if;

      -- Lock the invoice for the rest of the transaction. Without this, two
      -- staff allocating against the same invoice at the same moment each read
      -- a balance that is true when read and false by the time they write, and
      -- the pair of them settle it twice.
      --
      -- The lock is taken in its own statement rather than alongside the sum
      -- below, because FOR UPDATE cannot appear with an aggregate.
      perform 1
         from public.invoices
        where id = v_invoice_id and org_id = v_org and status = 'issued'
          for update;

      if not found then
        raise exception 'record_receipt: invoice % not found or not issued', v_invoice_id
          using errcode = 'P0002';
      end if;

      -- What this invoice still owes, computed the same way invoice_balances
      -- computes it: the total, less receipts already allocated, less applied
      -- credit notes. Read INSIDE the loop and after each insert, so two
      -- allocations to the same invoice in one receipt cannot both pass.
      select i.total_paise
             - coalesce((select sum(ra.amount_allocated_paise)
                           from public.receipt_allocations ra
                          where ra.invoice_id = i.id), 0)
             - coalesce((select sum(cn.amount_paise)
                           from public.credit_notes cn
                          where cn.invoice_id = i.id and cn.status = 'applied'), 0)
        into v_remaining
        from public.invoices i
       where i.id = v_invoice_id;

      if v_amount > v_remaining then
        raise exception 'record_receipt: % exceeds the % still owed on invoice %',
              v_amount, v_remaining, v_invoice_id
          using errcode = '22003';
      end if;

      insert into public.receipt_allocations (receipt_id, invoice_id, amount_allocated_paise)
      values (v_id, v_invoice_id, v_amount);
    end loop;
  end if;

  insert into public.audit_events (org_id, actor_id, action, entity_type, entity_id, after, reason)
  values (
    v_org, v_uid, 'receipt.recorded', 'receipt', v_id,
    jsonb_build_object(
      'amount_paise', p_amount_paise, 'payer_party_id', p_payer_party_id, 'allocations', p_allocations
    ),
    p_notes
  );

  return query select v_id;
end;
$$;

create or replace function public.cancel_invoice(
  p_invoice_id uuid,
  p_reason     text
)
returns table (invoice_id uuid)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_org uuid := (select public.current_org_id());
  v_uid uuid := auth.uid();
  v_before jsonb;
  v_allocated bigint;
  v_credited  bigint;
begin
  if not (select public.has_role('owner')) then
    raise exception 'cancel_invoice: requires the owner role' using errcode = '42501';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'cancel_invoice: a reason is required' using errcode = '22004';
  end if;

  select to_jsonb(i) into v_before
    from public.invoices i
   where i.id = p_invoice_id and i.org_id = v_org and i.status = 'issued';

  if v_before is null then
    raise exception 'cancel_invoice: invoice not found or not issued' using errcode = 'P0002';
  end if;

  -- Money first. invoice_balances is filtered to status = 'issued', so
  -- cancelling an invoice that has taken a receipt does not merely leave the
  -- allocation dangling — it makes the money INVISIBLE. The receipt still says
  -- the cash arrived and the allocation still says it was applied, but no
  -- balance view shows the invoice it was applied to, so collections stop
  -- reconciling to billing and nothing in the app reports why.
  --
  -- A cancellation is therefore refused while anything is applied. Reversing
  -- the receipt, or raising a credit note, is the right instrument, and both
  -- leave a trail; silently voiding the bill leaves none.
  select coalesce(sum(ra.amount_allocated_paise), 0) into v_allocated
    from public.receipt_allocations ra
   where ra.invoice_id = p_invoice_id;

  if v_allocated > 0 then
    raise exception 'cancel_invoice: % has already been received against this invoice — reverse the receipt or raise a credit note instead', v_allocated
      using errcode = '23514';
  end if;

  select coalesce(sum(cn.amount_paise), 0) into v_credited
    from public.credit_notes cn
   where cn.invoice_id = p_invoice_id and cn.status = 'applied';

  if v_credited > 0 then
    raise exception 'cancel_invoice: a credit note for % is already applied to this invoice', v_credited
      using errcode = '23514';
  end if;

  update public.invoices
     set status = 'cancelled'
   where id = p_invoice_id;

  -- The work itself isn't cancelled — only the bill for it — so the
  -- underlying completions become billable again rather than permanently
  -- stuck in 'invoiced'.
  update public.service_completions
     set status = 'completed'
   where id in (
     select il.service_completion_id from public.invoice_lines il
      where il.invoice_id = p_invoice_id and il.service_completion_id is not null
   );

  -- And the lines go with them. Setting the completion back to 'completed'
  -- was only half the job: invoice_lines carries a UNIQUE index on
  -- service_completion_id to prevent double-billing, so while the cancelled
  -- invoice's line still exists, create_invoice refuses the work with "already
  -- invoiced". The completion looked billable in every list and could not
  -- actually be billed — reopened in name only.
  --
  -- The lines are safe to delete because the invoice keeps issued_snapshot,
  -- which is what the document was and what the audit event below records.
  -- Aliased. This function declares `returns table (invoice_id uuid)`, so the
  -- bare column name is ambiguous against that output parameter and Postgres
  -- raises 42702 at CALL time — the migration applies perfectly and the
  -- feature fails later. The surrounding query already aliases for this
  -- reason; so does this one.
  delete from public.invoice_lines il where il.invoice_id = p_invoice_id;

  insert into public.audit_events (org_id, actor_id, action, entity_type, entity_id, before, after, reason)
  values (
    v_org, v_uid, 'invoice.cancelled', 'invoice', p_invoice_id,
    v_before, jsonb_build_object('status', 'cancelled'), p_reason
  );

  return query select p_invoice_id;
end;
$$;

comment on function public.record_receipt(uuid, bigint, date, text, jsonb, text, text) is
  'Records a receipt and its invoice allocations in one transaction, and logs a receipt.recorded audit event. Since 15 each allocation locks its invoice and may not exceed what that invoice still owes.';

revoke execute on function public.record_receipt(uuid, bigint, date, text, jsonb, text, text) from public;
grant  execute on function public.record_receipt(uuid, bigint, date, text, jsonb, text, text) to authenticated;

comment on function public.cancel_invoice(uuid, text) is
  'Owner-only. Cancels an issued invoice, reopens the service completions it billed, and logs an invoice.cancelled audit event with the pre-cancel row. Since 15 it refuses an invoice with any receipt or applied credit note against it, and deletes the invoice lines so the work is genuinely re-billable.';

revoke execute on function public.cancel_invoice(uuid, text) from public;
grant  execute on function public.cancel_invoice(uuid, text) to authenticated;
