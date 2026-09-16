import { type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth/verify";
import { parseBody } from "@/lib/api/validate";
import { apiErr, apiOk } from "@/lib/api/response";
import { log } from "@/lib/logger";

const cancelInvoiceSchema = z.object({
  action: z.literal("cancel"),
  reason: z.string().trim().min(1, "A reason is required"),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner();
  if (!auth.ok) return apiErr(auth.error, auth.status);

  const { id } = await params;
  const parsed = await parseBody(req, cancelInvoiceSchema);
  if (!parsed.ok) return apiErr(parsed.error, 422);

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("cancel_invoice", { p_invoice_id: id, p_reason: parsed.data.reason })
    .single();

  if (error) {
    if (error.code === "P0002") return apiErr("Invoice not found or not issued", 404);
    if (error.code === "42501") return apiErr("Cancelling an invoice requires the owner role", 403);
    log.error("PATCH /api/invoices/[id]", { err: error.message });
    return apiErr("Could not cancel this invoice", 500);
  }

  return apiOk(data);
}
