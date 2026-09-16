import { type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth/verify";
import { parseBody } from "@/lib/api/validate";
import { apiErr, apiOk } from "@/lib/api/response";
import { log } from "@/lib/logger";

export const runtime = "nodejs";

const COLUMNS = "id, category, description, amount_paise, incurred_on, party_id, created_at";

const expenseSchema = z.object({
  category: z.string().trim().min(1, "category is required").max(100),
  description: z.string().max(500).optional().nullable(),
  amount_paise: z.number().int().positive(),
  incurred_on: z.iso.date(),
  party_id: z.uuid().optional().nullable(),
});

export async function GET() {
  const auth = await verifyAuth();
  if (!auth.ok) return apiErr(auth.error, auth.status);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .select(`${COLUMNS}, parties(name)`)
    .order("incurred_on", { ascending: false });

  if (error) return apiErr("Could not load expenses", 500);
  return apiOk(data);
}

export async function POST(req: NextRequest) {
  const auth = await verifyAuth();
  if (!auth.ok) return apiErr(auth.error, auth.status);

  const parsed = await parseBody(req, expenseSchema);
  if (!parsed.ok) return apiErr(parsed.error, 422);
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .insert({
      org_id: auth.ctx.orgId,
      category: v.category,
      description: v.description || null,
      amount_paise: v.amount_paise,
      incurred_on: v.incurred_on,
      party_id: v.party_id || null,
      created_by: auth.ctx.userId,
    })
    .select(`${COLUMNS}, parties(name)`)
    .single();

  if (error) {
    log.error("POST /api/expenses", { err: error.message });
    return apiErr("Could not save this expense", 500);
  }
  return apiOk(data, 201);
}
