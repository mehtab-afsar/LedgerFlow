-- ═══════════════════════════════════════════════════════════════════════════
-- 06 · create_invoice / create_credit_note
--
-- Tax is computed in application code (lib/tax.ts), once, and passed in as
-- p_tax — the same split LogiFlow uses (computeTax() in the API route,
-- create_bill() only persists the result). SQL never recomputes tax, so
-- there is exactly one place the GST mechanics live.
--
-- Both functions are SECURITY DEFINER so double-billing prevention (locking
-- service_completions FOR UPDATE, checking status, checking no existing
-- invoice_line) happens under a real transaction the client's own read
-- cannot race — two staff raising invoices for the same party at once can't
-- both bill the same completed service.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.create_invoice(
  p_bill_to_party_id        uuid,
  p_deliver_to_party_id     uuid,
  p_service_completion_ids  uuid[],
  p_free_lines              jsonb,   -- [{description, hsn_sac, quantity, unit, rate_paise, discount_paise, amount_paise}]
  p_tax                     jsonb,   -- {treatment, rate_pct, taxable_value_paise, cgst_paise, sgst_paise, igst_paise, round_off_paise, total_paise}
  -- Trailing and defaulted so PostgREST/supabase-js can omit them, matching
  -- LogiFlow's create_bill(..., p_notes default null) convention — Postgres
  -- requires every parameter after the first defaulted one to have a default too.
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

  -- Lock and validate every service completion being billed. FOR UPDATE
  -- cannot appear with an aggregate, so lock in a subquery and count outside
  -- it — the row lock itself is what serialises concurrent attempts to bill
  -- the same completion.
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

  -- One line per billed service completion.
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

  -- Free-form lines with no underlying service completion.
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

  return query select v_invoice_id, v_invoice_no;
end;
$$;

comment on function public.create_invoice(
  uuid, uuid, uuid[], jsonb, jsonb, text, date, text
) is 'Transactionally creates an invoice and its lines from service completions and/or free-form lines, locking against double-billing.';

revoke execute on function public.create_invoice(uuid, uuid, uuid[], jsonb, jsonb, text, date, text) from public;
grant  execute on function public.create_invoice(uuid, uuid, uuid[], jsonb, jsonb, text, date, text) to authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- create_credit_note: the only sanctioned correction to an issued invoice.
-- Owner-only — a financial correction, not a routine data-entry action.
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

  return query select v_id, v_no;
end;
$$;

revoke execute on function public.create_credit_note(uuid, text, bigint, bigint, bigint, bigint) from public;
grant  execute on function public.create_credit_note(uuid, text, bigint, bigint, bigint, bigint) to authenticated;

-- ─── Rollback ──────────────────────────────────────────────────────────────
-- drop function if exists public.create_credit_note(uuid, text, bigint, bigint, bigint, bigint);
-- drop function if exists public.create_invoice(uuid, uuid, uuid[], jsonb, jsonb, text, date, text);
