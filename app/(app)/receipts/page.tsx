import { ViewTransition } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth/verify";
import { ReceiptsPanel } from "@/features/receipts/components/ReceiptsPanel";
import { attachInvoiceBalances } from "@/lib/invoices/with-balances";
import { pageEnter, pageExit } from "@/lib/ui/page-transition";

export const dynamic = "force-dynamic";
export const metadata = { title: "Receipts" };

export default async function ReceiptsPage() {
  const auth = await verifyAuth();
  if (!auth.ok) redirect("/");

  const supabase = await createClient();
  const [{ data: receipts }, { data: parties }, { data: invoices }] = await Promise.all([
    supabase
      .from("receipts")
      .select(
        "id, amount_paise, received_on, method, reference_no, notes, payer_party_id, parties(name), receipt_allocations(invoice_id, amount_allocated_paise)",
      )
      .order("received_on", { ascending: false }),
    supabase.from("parties").select("id, name").order("name"),
    supabase.from("invoices").select("id, invoice_no, bill_to_party_id").eq("status", "issued"),
  ]);

  // The live balance view (migration 08) is merged in separately — see
  // lib/invoices/with-balances.ts for why it can't be a nested select.
  const invoicesWithBalances = await attachInvoiceBalances(supabase, invoices ?? []);
  const openInvoices = invoicesWithBalances.filter((inv) => (inv.invoice_balances[0]?.balance_due_paise ?? 0) > 0);

  return (
    <ViewTransition enter={pageEnter} exit={pageExit}>
      <ReceiptsPanel
        initialReceipts={receipts ?? []}
        parties={parties ?? []}
        openInvoices={openInvoices as unknown as Parameters<typeof ReceiptsPanel>[0]["openInvoices"]}
      />
    </ViewTransition>
  );
}
