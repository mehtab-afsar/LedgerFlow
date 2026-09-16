import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth/verify";
import { parseBody } from "@/lib/api/validate";
import { apiErr, apiOk } from "@/lib/api/response";
import { log } from "@/lib/logger";
import { recordReceiptSchema } from "@/features/onboarding/schemas/onboarding";

export const runtime = "nodejs";

export async function GET() {
  const auth = await verifyAuth();
  if (!auth.ok) return apiErr(auth.error, auth.status);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("receipts")
    .select("id, amount_paise, received_on, method, reference_no, notes, payer_party_id, parties(name), receipt_allocations(invoice_id, amount_allocated_paise)")
    .order("received_on", { ascending: false });

  if (error) return apiErr("Could not load receipts", 500);
  return apiOk(data);
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuth();
  if (!auth.ok) return apiErr(auth.error, auth.status);

  const parsed = await parseBody(req, recordReceiptSchema);
  if (!parsed.ok) return apiErr(parsed.error, 422);
  const v = parsed.data;

  const allocatedTotal = v.allocations.reduce((sum, a) => sum + a.amount_paise, 0);
  if (allocatedTotal > v.amount_paise) {
    return apiErr("Allocations cannot exceed the receipt amount", 422);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("record_receipt", {
      p_payer_party_id: v.payer_party_id,
      p_amount_paise: v.amount_paise,
      p_received_on: v.received_on,
      p_method: v.method,
      p_reference_no: v.reference_no ?? undefined,
      p_notes: v.notes ?? undefined,
      p_allocations: v.allocations,
    })
    .single();

  if (error) {
    log.error("POST /api/receipts", { err: error.message });
    return apiErr("Could not record this receipt", 500);
  }
  return apiOk(data, 201);
}
