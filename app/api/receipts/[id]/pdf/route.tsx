import { type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth/verify";
import { apiErr } from "@/lib/api/response";
import { ReceiptPdf } from "@/lib/pdf/ReceiptPdf";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAuth();
  if (!auth.ok) return apiErr(auth.error, auth.status);

  const { id } = await params;
  const supabase = await createClient();

  const [{ data: receipt }, { data: org }] = await Promise.all([
    supabase
      .from("receipts")
      .select(
        "id, amount_paise, received_on, method, reference_no, notes, parties(name, gstin), receipt_allocations(amount_allocated_paise, invoices(invoice_no, invoice_date))",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("organisations")
      .select("legal_name, gstin, transin, state_code, address")
      .eq("id", auth.ctx.orgId)
      .single(),
  ]);

  if (!receipt) return apiErr("Receipt not found", 404);
  if (!org) return apiErr("Organisation not found", 404);

  const allocations = (receipt.receipt_allocations ?? []).map((a: { amount_allocated_paise: number; invoices: { invoice_no: string; invoice_date: string } | null }) => ({
    invoice_no: a.invoices?.invoice_no ?? "—",
    invoice_date: a.invoices?.invoice_date ?? receipt.received_on,
    amount_allocated_paise: a.amount_allocated_paise,
  }));

  const buffer = await renderToBuffer(
    <ReceiptPdf
      receipt={{
        id: receipt.id,
        amount_paise: receipt.amount_paise,
        received_on: receipt.received_on,
        method: receipt.method,
        reference_no: receipt.reference_no,
        notes: receipt.notes,
        party: receipt.parties as unknown as { name: string; gstin: string | null } | null,
      }}
      allocations={allocations}
      org={org}
    />,
  );

  const download = req.nextUrl.searchParams.get("download") === "1";
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="receipt-${receipt.id.slice(0, 8)}.pdf"`,
    },
  });
}
