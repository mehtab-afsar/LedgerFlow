import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth/verify";
import { parseBody } from "@/lib/api/validate";
import { apiErr, apiOk } from "@/lib/api/response";
import { log } from "@/lib/logger";
import { createInvoiceSchema } from "@/features/onboarding/schemas/onboarding";
import { computeTax } from "@/lib/tax";
import { addPaise } from "@/lib/money";
import { attachInvoiceBalances } from "@/lib/invoices/with-balances";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await verifyAuth();
  if (!auth.ok) return apiErr(auth.error, auth.status);

  const billToPartyId = req.nextUrl.searchParams.get("bill_to_party_id");

  const supabase = await createClient();
  let query = supabase
    .from("invoices")
    .select(
      "id, invoice_no, invoice_date, due_date, status, total_paise, bill_to_party_id, parties!invoices_bill_to_party_id_fkey(name)",
    )
    .order("invoice_date", { ascending: false });
  if (billToPartyId) query = query.eq("bill_to_party_id", billToPartyId);

  const { data, error } = await query;

  if (error) {
    log.error("GET /api/invoices", { err: error.message });
    return apiErr("Could not load invoices", 500);
  }

  // The live balance view (migration 08) is merged in separately — see
  // lib/invoices/with-balances.ts for why it can't be a nested select.
  try {
    return apiOk(await attachInvoiceBalances(supabase, data));
  } catch (err) {
    log.error("GET /api/invoices (balances)", { err: (err as Error).message });
    return apiErr("Could not load invoices", 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuth();
  if (!auth.ok) return apiErr(auth.error, auth.status);

  const parsed = await parseBody(req, createInvoiceSchema);
  if (!parsed.ok) return apiErr(parsed.error, 422);
  const v = parsed.data;

  if (v.service_completion_ids.length === 0 && v.free_lines.length === 0) {
    return apiErr("Add at least one completed service or a line item", 422);
  }

  const supabase = await createClient();

  const [{ data: org }, { data: billTo }] = await Promise.all([
    supabase.from("organisations").select("state_code").eq("id", auth.ctx.orgId).single(),
    supabase.from("parties").select("id, state_code").eq("id", v.bill_to_party_id).single(),
  ]);
  if (!org) return apiErr("Organisation not found", 404);
  if (!billTo) return apiErr("Bill-to party not found", 404);

  let taxableValuePaise = 0;
  if (v.service_completion_ids.length > 0) {
    const { data: completions } = await supabase
      .from("service_completions")
      .select("id, amount_paise")
      .in("id", v.service_completion_ids);
    taxableValuePaise = addPaise(...(completions ?? []).map((c) => c.amount_paise), taxableValuePaise);
  }
  taxableValuePaise = addPaise(taxableValuePaise, ...v.free_lines.map((l) => l.amount_paise));

  const tax = computeTax({
    taxableValuePaise,
    treatment: v.tax_treatment,
    ratePct: v.tax_rate_pct,
    supplierStateCode: org.state_code,
    placeOfSupplyStateCode: billTo.state_code ?? org.state_code,
    exempt: v.exempt,
  });

  const { data, error } = await supabase
    .rpc("create_invoice", {
      p_bill_to_party_id: v.bill_to_party_id,
      p_deliver_to_party_id: v.deliver_to_party_id ?? v.bill_to_party_id,
      p_service_completion_ids: v.service_completion_ids,
      p_free_lines: v.free_lines,
      p_bill_to_override_reason: v.bill_to_override_reason ?? undefined,
      p_due_date: v.due_date ?? undefined,
      p_notes: v.notes ?? undefined,
      p_tax: {
        treatment: v.tax_treatment,
        rate_pct: tax.ratePct,
        taxable_value_paise: tax.taxableValuePaise,
        cgst_paise: tax.cgstPaise,
        sgst_paise: tax.sgstPaise,
        igst_paise: tax.igstPaise,
        round_off_paise: 0,
        total_paise: tax.invoiceTotalPaise,
      },
    })
    .single();

  if (error) {
    if (error.code === "23514") return apiErr("One or more services are not billable — check they're marked completed and not already invoiced", 409);
    if (error.code === "23505") return apiErr("One or more services have already been invoiced", 409);
    log.error("POST /api/invoices", { err: error.message });
    return apiErr("Could not create this invoice", 500);
  }

  return apiOk(data, 201);
}
