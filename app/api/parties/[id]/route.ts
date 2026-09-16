import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth/verify";
import { parseBody } from "@/lib/api/validate";
import { apiErr, apiOk } from "@/lib/api/response";
import { log } from "@/lib/logger";
import { partySchema } from "@/features/onboarding/schemas/onboarding";

export const runtime = "nodejs";

const COLUMNS = "id, name, gstin, state_code, default_tax_treatment, payment_terms_days, credit_limit_paise, notes, created_at";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAuth();
  if (!auth.ok) return apiErr(auth.error, auth.status);

  const { id } = await params;
  const parsed = await parseBody(req, partySchema);
  if (!parsed.ok) return apiErr(parsed.error, 422);
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parties")
    .update({
      name: v.name,
      gstin: v.gstin || null,
      state_code: v.state_code || null,
      default_tax_treatment: v.default_tax_treatment || null,
      payment_terms_days: v.payment_terms_days,
      credit_limit_paise: v.credit_limit_paise ?? null,
      notes: v.notes || null,
    })
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();

  if (error) {
    if (error.code === "23505") return apiErr("A party with that GSTIN already exists", 409);
    log.error("PATCH /api/parties/[id]", { err: error.message });
    return apiErr("Could not save this party", 500);
  }
  if (!data) return apiErr("Party not found", 404);

  return apiOk(data);
}
