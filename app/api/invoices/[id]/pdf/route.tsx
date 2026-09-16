import { type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth/verify";
import { apiErr } from "@/lib/api/response";
import { InvoicePdf } from "@/lib/pdf/InvoicePdf";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAuth();
  if (!auth.ok) return apiErr(auth.error, auth.status);

  const { id } = await params;
  const supabase = await createClient();

  // RLS scopes this to the caller's org already.
  const [{ data: invoice }, { data: balance }] = await Promise.all([
    supabase.from("invoices").select("invoice_no, issued_snapshot").eq("id", id).maybeSingle(),
    supabase.from("invoice_balances").select("amount_paid_paise, balance_due_paise").eq("invoice_id", id).maybeSingle(),
  ]);

  if (!invoice) return apiErr("Invoice not found", 404);
  if (!invoice.issued_snapshot) return apiErr("This invoice has no frozen snapshot to render", 409);

  const buffer = await renderToBuffer(
    <InvoicePdf
      snapshot={invoice.issued_snapshot as unknown as Parameters<typeof InvoicePdf>[0]["snapshot"]}
      amountPaidPaise={balance?.amount_paid_paise ?? 0}
      balanceDuePaise={balance?.balance_due_paise ?? null}
    />,
  );

  const download = req.nextUrl.searchParams.get("download") === "1";
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${invoice.invoice_no}.pdf"`,
    },
  });
}
