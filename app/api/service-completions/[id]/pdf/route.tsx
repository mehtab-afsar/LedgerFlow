import { type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth/verify";
import { apiErr } from "@/lib/api/response";
import { ServiceCompletionPdf } from "@/lib/pdf/ServiceCompletionPdf";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAuth();
  if (!auth.ok) return apiErr(auth.error, auth.status);

  const { id } = await params;
  const supabase = await createClient();

  const [{ data: completion }, { data: org }] = await Promise.all([
    supabase
      .from("service_completions")
      .select(
        "id, external_reference, service_type, origin, destination, quantity, unit, rate_paise, amount_paise, occurred_on, status, parties(name)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("organisations")
      .select("legal_name, gstin, transin, state_code, address")
      .eq("id", auth.ctx.orgId)
      .single(),
  ]);

  if (!completion) return apiErr("Service completion not found", 404);
  if (!org) return apiErr("Organisation not found", 404);

  const buffer = await renderToBuffer(
    <ServiceCompletionPdf
      completion={{
        id: completion.id,
        external_reference: completion.external_reference,
        service_type: completion.service_type,
        origin: completion.origin,
        destination: completion.destination,
        quantity: completion.quantity,
        unit: completion.unit,
        rate_paise: completion.rate_paise,
        amount_paise: completion.amount_paise,
        occurred_on: completion.occurred_on,
        status: completion.status,
        party: completion.parties as unknown as { name: string } | null,
      }}
      org={org}
    />,
  );

  const download = req.nextUrl.searchParams.get("download") === "1";
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="service-${completion.id.slice(0, 8)}.pdf"`,
    },
  });
}
