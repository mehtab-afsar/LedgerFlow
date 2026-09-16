-- ═══════════════════════════════════════════════════════════════════════════
-- 10 · Populate issued_snapshot
--
-- invoices.issued_snapshot (migration 05) has existed since the table was
-- created but nothing has ever written it — create_invoice() never built one.
-- PDF generation needs to render an issued invoice from data that is proven
-- frozen at issue time, not from live/mutable rows a later party edit could
-- silently change underneath it. This migration makes that column real:
-- create_invoice() now builds and stores the snapshot, and existing issued
-- invoices are backfilled so they get a working PDF too.
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

  -- Freeze exactly what the invoice says, right now, before anything else
  -- (a party's address, the org's letterhead details) can drift under it.
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

  return query select v_invoice_id, v_invoice_no;
end;
$$;

comment on function public.create_invoice(
  uuid, uuid, uuid[], jsonb, jsonb, text, date, text
) is 'Transactionally creates an invoice and its lines from service completions and/or free-form lines, locking against double-billing, and freezes an issued_snapshot for PDF rendering.';

revoke execute on function public.create_invoice(uuid, uuid, uuid[], jsonb, jsonb, text, date, text) from public;
grant  execute on function public.create_invoice(uuid, uuid, uuid[], jsonb, jsonb, text, date, text) to authenticated;

-- Backfill: existing issued invoices (seeded demo data, anything created
-- before this migration) get a snapshot built from their current data, so
-- PDF generation works for them too rather than 409ing.
update public.invoices i
   set issued_snapshot = jsonb_build_object(
         'invoice', to_jsonb(i),
         'lines', coalesce((select jsonb_agg(to_jsonb(l) order by l.id) from public.invoice_lines l where l.invoice_id = i.id), '[]'::jsonb),
         'bill_to_party', (select to_jsonb(p) from public.parties p where p.id = i.bill_to_party_id),
         'deliver_to_party', (select to_jsonb(p) from public.parties p where p.id = i.deliver_to_party_id),
         'organisation', (select to_jsonb(o) from public.organisations o where o.id = i.org_id)
       )
 where i.issued_snapshot is null
   and i.status = 'issued';

-- ─── Rollback ──────────────────────────────────────────────────────────────
-- update public.invoices set issued_snapshot = null;
-- (create_invoice reverts to migration 06's body if this file is dropped and re-applied from a fresh reset)
