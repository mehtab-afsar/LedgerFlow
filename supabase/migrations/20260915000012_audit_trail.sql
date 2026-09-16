-- ═══════════════════════════════════════════════════════════════════════════
-- 12 · Audit trail
--
-- audit_events (migration 09) has existed since the table was created but
-- nothing has ever written a row to it. This migration makes it real: the
-- four money-moving RPCs each log themselves, and a new cancel_invoice()
-- RPC — which didn't exist before — gives invoices a reversible lifecycle
-- and something to log when that happens.
--
-- create_invoice() here is layered on top of migration 10's version (the one
-- that populates issued_snapshot), not migration 06's original — dropping
-- this migration without also keeping migration 10's snapshot logic would
-- silently lose it.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.create_invoice(
  p_bill_to_party_id        uuid,
  p_deliver_to_party_id     uuid,
  p_service_completion_ids  uuid[],
  p_free_lines              jsonb,
  p_tax                     jsonb,
  p_bill_to_override_reason text default null,
  p_due_date                date default null,
  p_notes                   text default null
)
returns table (invoice_id uuid, invoice_no text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_org       uuid := (select public.current_org_id());
  v_uid       uuid := auth.uid();
  v_invoice_id uuid;
  v_invoice_no text;
  v_line      jsonb;
  v_sc_id     uuid;
  v_sc_count  integer;
  v_snapshot  jsonb;
begin
  if v_org is null then
    raise exception 'create_invoice: no organisation for this account' using errcode = '28000';
  end if;

  if not exists (select 1 from public.parties where id = p_bill_to_party_id and org_id = v_org) then
    raise exception 'create_invoice: bill-to party not found in your organisation' using errcode = 'P0002';
  end if;
  if p_deliver_to_party_id is not null
     and not exists (select 1 from public.parties where id = p_deliver_to_party_id and org_id = v_org) then
    raise exception 'create_invoice: deliver-to party not found in your organisation' using errcode = 'P0002';
  end if;

  if array_length(p_service_completion_ids, 1) > 0 then
    select count(*) into v_sc_count
      from (
        select id
          from public.service_completions
         where id = any(p_service_completion_ids)
           and org_id = v_org
           and status = 'completed'
         for update
      ) locked;

    if v_sc_count <> array_length(p_service_completion_ids, 1) then
      raise exception 'create_invoice: one or more service completions are not billable (wrong org, not completed, or already invoiced)'
        using errcode = '23514';
    end if;

    if exists (
      select 1 from public.invoice_lines
       where service_completion_id = any(p_service_completion_ids)
    ) then
      raise exception 'create_invoice: one or more service completions have already been invoiced'
        using errcode = '23505';
    end if;
  end if;

  v_invoice_no := public.next_doc_number(v_org, 'INVOICE', current_date);

  insert into public.invoices (
    org_id, invoice_no, due_date, bill_to_party_id, deliver_to_party_id,
    bill_to_override_reason, status, tax_treatment, tax_rate_pct,
    taxable_value_paise, cgst_paise, sgst_paise, igst_paise, round_off_paise, total_paise,
    notes, created_by
  ) values (
    v_org, v_invoice_no, p_due_date, p_bill_to_party_id, p_deliver_to_party_id,
    p_bill_to_override_reason, 'issued',
    p_tax->>'treatment', (p_tax->>'rate_pct')::numeric,
    (p_tax->>'taxable_value_paise')::bigint, (p_tax->>'cgst_paise')::bigint,
    (p_tax->>'sgst_paise')::bigint, (p_tax->>'igst_paise')::bigint,
    coalesce((p_tax->>'round_off_paise')::bigint, 0), (p_tax->>'total_paise')::bigint,
    p_notes, v_uid
  )
  returning id into v_invoice_id;

  if array_length(p_service_completion_ids, 1) > 0 then
    foreach v_sc_id in array p_service_completion_ids loop
      insert into public.invoice_lines (invoice_id, service_completion_id, description, amount_paise)
      select v_invoice_id, sc.id,
             coalesce(sc.service_type, 'Service') ||
               case when sc.external_reference is not null then ' — ' || sc.external_reference else '' end,
             sc.amount_paise
        from public.service_completions sc
       where sc.id = v_sc_id;
    end loop;

    update public.service_completions
       set status = 'invoiced'
     where id = any(p_service_completion_ids);
  end if;

  if p_free_lines is not null then
    for v_line in select * from jsonb_array_elements(p_free_lines) loop
      insert into public.invoice_lines (
        invoice_id, description, hsn_sac, quantity, unit, rate_paise, discount_paise, amount_paise
      ) values (
        v_invoice_id, v_line->>'description', v_line->>'hsn_sac',
        (v_line->>'quantity')::numeric, v_line->>'unit',
        (v_line->>'rate_paise')::bigint, coalesce((v_line->>'discount_paise')::bigint, 0),
        (v_line->>'amount_paise')::bigint
      );
    end loop;
  end if;

  select jsonb_build_object(
           'invoice', to_jsonb(i),
           'lines', coalesce((select jsonb_agg(to_jsonb(l) order by l.id) from public.invoice_lines l where l.invoice_id = v_invoice_id), '[]'::jsonb),
           'bill_to_party', (select to_jsonb(p) from public.parties p where p.id = p_bill_to_party_id),
           'deliver_to_party', (select to_jsonb(p) from public.parties p where p.id = p_deliver_to_party_id),
           'organisation', (select to_jsonb(o) from public.organisations o where o.id = v_org)
         )
    into v_snapshot
    from public.invoices i
   where i.id = v_invoice_id;

  update public.invoices set issued_snapshot = v_snapshot where id = v_invoice_id;

  insert into public.audit_events (org_id, actor_id, action, entity_type, entity_id, after, reason)
  values (v_org, v_uid, 'invoice.issued', 'invoice', v_invoice_id, v_snapshot, p_notes);

  return query select v_invoice_id, v_invoice_no;
end;
$$;

comment on function public.create_invoice(
  uuid, uuid, uuid[], jsonb, jsonb, text, date, text
) is 'Transactionally creates an invoice and its lines, freezes an issued_snapshot, and logs an invoice.issued audit event.';

revoke execute on function public.create_invoice(uuid, uuid, uuid[], jsonb, jsonb, text, date, text) from public;
grant  execute on function public.create_invoice(uuid, uuid, uuid[], jsonb, jsonb, text, date, text) to authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- create_credit_note: same body as migration 06, plus an audit_events row.
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.create_credit_note(
  p_invoice_id  uuid,
  p_reason      text,
  p_amount_paise bigint,
  p_cgst_paise  bigint default 0,
  p_sgst_paise  bigint default 0,
  p_igst_paise  bigint default 0
)
returns table (credit_note_id uuid, credit_note_no text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_org uuid := (select public.current_org_id());
  v_uid uuid := auth.uid();
  v_id  uuid;
  v_no  text;
begin
  if not (select public.has_role('owner')) then
    raise exception 'create_credit_note: requires the owner role' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.invoices where id = p_invoice_id and org_id = v_org and status = 'issued'
  ) then
    raise exception 'create_credit_note: invoice not found or not issued' using errcode = 'P0002';
  end if;
  if p_amount_paise <= 0 then
    raise exception 'create_credit_note: amount must be positive' using errcode = '22003';
  end if;

  v_no := public.next_doc_number(v_org, 'CREDIT_NOTE', current_date);

  insert into public.credit_notes (
    org_id, invoice_id, credit_note_no, reason, amount_paise, cgst_paise, sgst_paise, igst_paise, status, created_by
  ) values (
    v_org, p_invoice_id, v_no, p_reason, p_amount_paise, p_cgst_paise, p_sgst_paise, p_igst_paise, 'applied', v_uid
  )
  returning id into v_id;

  insert into public.audit_events (org_id, actor_id, action, entity_type, entity_id, after, reason)
  values (
    v_org, v_uid, 'credit_note.applied', 'credit_note', v_id,
    jsonb_build_object(
      'invoice_id', p_invoice_id, 'amount_paise', p_amount_paise,
      'cgst_paise', p_cgst_paise, 'sgst_paise', p_sgst_paise, 'igst_paise', p_igst_paise
    ),
    p_reason
  );

  return query select v_id, v_no;
end;
$$;

revoke execute on function public.create_credit_note(uuid, text, bigint, bigint, bigint, bigint) from public;
grant  execute on function public.create_credit_note(uuid, text, bigint, bigint, bigint, bigint) to authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- record_receipt: same body as migration 07, plus an audit_events row.
-- ───────────────────────────────────────────────────────────────────────────
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

comment on function public.record_receipt(uuid, bigint, date, text, jsonb, text, text) is
  'Records a receipt and its invoice allocations in one transaction, and logs a receipt.recorded audit event.';

revoke execute on function public.record_receipt(uuid, bigint, date, text, jsonb, text, text) from public;
grant  execute on function public.record_receipt(uuid, bigint, date, text, jsonb, text, text) to authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- cancel_invoice: new. Owner-only, reopens the service completions it
-- billed so the work becomes billable again, and logs before/after.
-- ───────────────────────────────────────────────────────────────────────────
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

  insert into public.audit_events (org_id, actor_id, action, entity_type, entity_id, before, after, reason)
  values (
    v_org, v_uid, 'invoice.cancelled', 'invoice', p_invoice_id,
    v_before, jsonb_build_object('status', 'cancelled'), p_reason
  );

  return query select p_invoice_id;
end;
$$;

comment on function public.cancel_invoice(uuid, text) is
  'Owner-only. Cancels an issued invoice, reopens the service completions it billed, and logs an invoice.cancelled audit event with the pre-cancel row.';

revoke execute on function public.cancel_invoice(uuid, text) from public;
grant  execute on function public.cancel_invoice(uuid, text) to authenticated;

-- ─── Rollback ──────────────────────────────────────────────────────────────
-- drop function if exists public.cancel_invoice(uuid, text);
-- (record_receipt / create_credit_note / create_invoke revert to their
--  pre-audit bodies if this file is dropped and re-applied from a fresh reset)
