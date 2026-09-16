import { ViewTransition } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth/verify";
import { InvoiceDetail } from "@/features/invoices/components/InvoiceDetail";
import { attachInvoiceBalances } from "@/lib/invoices/with-balances";
import { pageEnter, pageExit } from "@/lib/ui/page-transition";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invoice" };

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await verifyAuth();
  if (!auth.ok) redirect("/");

  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      `id, invoice_no, invoice_date, due_date, status, notes, bill_to_override_reason,
       tax_treatment, tax_rate_pct, taxable_value_paise, cgst_paise, sgst_paise, igst_paise,
       round_off_paise, total_paise, created_at,
       bill_to: parties!invoices_bill_to_party_id_fkey(id, name, gstin, state_code),
       deliver_to: parties!invoices_deliver_to_party_id_fkey(id, name, gstin, state_code)`,
    )
    .eq("id", id)
    .maybeSingle();

  // RLS scopes this to the caller's org already — a missing row means either
  // it doesn't exist or it belongs to another org, and both should 404, not
  // leak which case it was.
  if (!invoice) notFound();

  const [{ data: lines }, { data: allocations }, { data: creditNotes }, [invoiceWithBalance]] = await Promise.all([
    supabase
      .from("invoice_lines")
      .select("id, description, hsn_sac, quantity, unit, rate_paise, discount_paise, amount_paise")
      .eq("invoice_id", id),
    supabase
      .from("receipt_allocations")
      .select("id, amount_allocated_paise, receipts(id, received_on, method, reference_no, payer_party_id)")
      .eq("invoice_id", id),
    supabase
      .from("credit_notes")
      .select("id, credit_note_no, reason, amount_paise, cgst_paise, sgst_paise, igst_paise, issued_on")
      .eq("invoice_id", id)
      .order("issued_on", { ascending: false }),
    attachInvoiceBalances(supabase, [{ id: invoice.id }]),
  ]);

  return (
    <ViewTransition enter={pageEnter} exit={pageExit}>
      <InvoiceDetail
        invoice={invoice as unknown as Parameters<typeof InvoiceDetail>[0]["invoice"]}
        lines={lines ?? []}
        allocations={(allocations ?? []) as unknown as Parameters<typeof InvoiceDetail>[0]["allocations"]}
        creditNotes={creditNotes ?? []}
        balanceDuePaise={invoiceWithBalance?.invoice_balances[0]?.balance_due_paise ?? 0}
        amountPaidPaise={invoiceWithBalance?.invoice_balances[0]?.amount_paid_paise ?? 0}
        canCancel={auth.ctx.role === "owner"}
      />
    </ViewTransition>
  );
}
