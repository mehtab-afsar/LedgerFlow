import { ViewTransition } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth/verify";
import { attachInvoiceBalances } from "@/lib/invoices/with-balances";
import { PartyLedgerPanel } from "@/features/dashboard/components/PartyLedgerPanel";
import { pageEnter, pageExit } from "@/lib/ui/page-transition";

export const dynamic = "force-dynamic";
export const metadata = { title: "Party ledger" };

export default async function PartyLedgerPage({ params }: { params: Promise<{ partyId: string }> }) {
  const { partyId } = await params;
  const auth = await verifyAuth();
  if (!auth.ok) redirect("/");

  const supabase = await createClient();

  const { data: party } = await supabase
    .from("parties")
    .select("id, name, gstin, state_code, payment_terms_days")
    .eq("id", partyId)
    .maybeSingle();

  if (!party) notFound();

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_no, invoice_date, due_date, status, total_paise")
    .eq("bill_to_party_id", partyId)
    .order("invoice_date", { ascending: false });

  const invoicesWithBalances = await attachInvoiceBalances(supabase, invoices ?? []);

  return (
    <ViewTransition enter={pageEnter} exit={pageExit}>
      <PartyLedgerPanel
        party={party}
        invoices={invoicesWithBalances as unknown as Parameters<typeof PartyLedgerPanel>[0]["invoices"]}
      />
    </ViewTransition>
  );
}
