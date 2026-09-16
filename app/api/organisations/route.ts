import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyAuth, requireOwner } from "@/lib/auth/verify";
import { parseBody } from "@/lib/api/validate";
import { apiErr, apiOk } from "@/lib/api/response";
import { log } from "@/lib/logger";
import { createOrganisationSchema } from "@/features/onboarding/schemas/onboarding";

const SETTINGS_COLUMNS =
  "id, legal_name, gstin, transin, pan, state_code, address, invoice_prefix, credit_note_prefix, default_tax_treatment, default_tax_rate_pct";

export const runtime = "nodejs";

export async function GET() {
  const auth = await verifyAuth();
  if (!auth.ok) return apiErr(auth.error, auth.status);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organisations")
    .select(SETTINGS_COLUMNS)
    .eq("id", auth.ctx.orgId)
    .single();

  if (error) return apiErr("Could not load your organisation", 500);
  return apiOk(data);
}

/**
 * POST cannot use verifyAuth(): it requires a profiles row to already exist,
 * which is precisely what this call is about to create. The check here is
 * only "is there a signed-in Supabase user at all" — create_organisation()
 * itself is the authorisation boundary (rejects a caller who already has a
 * profile).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return apiErr("Not signed in", 401);

  const parsed = await parseBody(req, createOrganisationSchema);
  if (!parsed.ok) return apiErr(parsed.error, 422);
  const v = parsed.data;

  const { data, error } = await supabase
    .rpc("create_organisation", {
      p_legal_name: v.legal_name,
      p_gstin: v.gstin ?? "",
      p_transin: v.transin ?? "",
      p_pan: v.pan ?? "",
      p_state_code: v.state_code,
      p_address: v.address ?? "",
      p_invoice_prefix: v.invoice_prefix,
      p_credit_note_prefix: v.credit_note_prefix,
      p_default_tax_treatment: v.default_tax_treatment,
      p_default_tax_rate_pct: v.default_tax_rate_pct,
    })
    .single();

  if (error) {
    if (error.code === "23505") {
      return apiErr("This account is already set up — go to your dashboard", 409);
    }
    log.error("POST /api/organisations", { err: error.message });
    return apiErr("Could not set up your organisation", 500);
  }

  return apiOk(data, 201);
}

/**
 * Owner-only, both here and at the RLS layer (organisations_update requires
 * has_role('owner')) — this is account-level configuration, not routine
 * data entry.
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireOwner();
  if (!auth.ok) return apiErr(auth.error, auth.status);

  const parsed = await parseBody(req, createOrganisationSchema);
  if (!parsed.ok) return apiErr(parsed.error, 422);
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organisations")
    .update({
      legal_name: v.legal_name,
      gstin: v.gstin || null,
      transin: v.transin || null,
      pan: v.pan || null,
      state_code: v.state_code,
      address: v.address || null,
      invoice_prefix: v.invoice_prefix,
      credit_note_prefix: v.credit_note_prefix,
      default_tax_treatment: v.default_tax_treatment,
      default_tax_rate_pct: v.default_tax_rate_pct,
    })
    .eq("id", auth.ctx.orgId)
    .select(SETTINGS_COLUMNS)
    .single();

  if (error) {
    log.error("PATCH /api/organisations", { err: error.message });
    return apiErr("Could not save these settings", 500);
  }
  return apiOk(data);
}
