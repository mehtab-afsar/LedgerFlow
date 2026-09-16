import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth/verify";
import { parseBody } from "@/lib/api/validate";
import { apiErr, apiOk } from "@/lib/api/response";
import { log } from "@/lib/logger";
import { serviceCompletionSchema } from "@/features/onboarding/schemas/onboarding";

export const runtime = "nodejs";

const COLUMNS =
  "id, party_id, external_reference, service_type, origin, destination, unit, quantity, rate_paise, amount_paise, cost_paise, occurred_on, notes, status, created_at";

export async function GET(req: NextRequest) {
  const auth = await verifyAuth();
  if (!auth.ok) return apiErr(auth.error, auth.status);

  const status = req.nextUrl.searchParams.get("status");
  const partyId = req.nextUrl.searchParams.get("party_id");

  const supabase = await createClient();
  let query = supabase.from("service_completions").select(`${COLUMNS}, parties(name)`).order("occurred_on", { ascending: false });
  if (status) query = query.eq("status", status);
  if (partyId) query = query.eq("party_id", partyId);

  const { data, error } = await query;
  if (error) return apiErr("Could not load service completions", 500);
  return apiOk(data);
}

/** Marked "completed" immediately — office staff record it once it's done,
 *  matching the PRD's lightweight (non-driver-facing) proof-of-delivery. */
export async function POST(req: NextRequest) {
  const auth = await verifyAuth();
  if (!auth.ok) return apiErr(auth.error, auth.status);

  const parsed = await parseBody(req, serviceCompletionSchema);
  if (!parsed.ok) return apiErr(parsed.error, 422);
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("service_completions")
    .insert({
      org_id: auth.ctx.orgId,
      party_id: v.party_id,
      external_reference: v.external_reference || null,
      service_type: v.service_type || null,
      origin: v.origin || null,
      destination: v.destination || null,
      unit: v.unit || null,
      quantity: v.quantity ?? null,
      rate_paise: v.rate_paise ?? null,
      amount_paise: v.amount_paise,
      cost_paise: v.cost_paise ?? null,
      occurred_on: v.occurred_on,
      notes: v.notes || null,
      status: "completed",
      created_by: auth.ctx.userId,
    })
    .select(COLUMNS)
    .single();

  if (error) {
    log.error("POST /api/service-completions", { err: error.message });
    return apiErr("Could not save this service completion", 500);
  }
  return apiOk(data, 201);
}
