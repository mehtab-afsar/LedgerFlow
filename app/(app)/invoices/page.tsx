import { ViewTransition } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth/verify";
import { InvoicesPanel } from "@/features/invoices/components/InvoicesPanel";
import { attachInvoiceBalances } from "@/lib/invoices/with-balances";
import { pageEnter, pageExit } from "@/lib/ui/page-transition";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invoices" };

export default async function InvoicesPage() {
  const auth = await verifyAuth();
  if (!auth.ok) redirect("/");

  const supabase = await createClient();
  const [{ data: invoices }, { data: parties }, { data: org }, { data: eligible }, { data: readyToBill }] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id, invoice_no, invoice_date, due_date, status, total_paise, bill_to_party_id, parties!invoices_bill_to_party_id_fkey(name)",
      )
      .order("invoice_date", { ascending: false }),
    supabase.from("parties").select("id, name").order("name"),
    supabase
      .from("organisations")
      .select("default_tax_treatment, default_tax_rate_pct")
      .eq("id", auth.ctx.orgId)
      .single(),
    supabase
      .from("service_completions")
      .select("id, party_id, external_reference, service_type, amount_paise, occurred_on")
      .eq("status", "completed")
      .order("occurred_on", { ascending: false }),
    supabase
      .from("party_ready_to_bill")
      .select("party_id, pending_count, pending_amount_paise, parties(name)")
      .order("pending_amount_paise", { ascending: false }),
  ]);

  // The live balance view (migration 08) is merged in separately — see
  // lib/invoices/with-balances.ts for why it can't be a nested select.
  const invoicesWithBalances = await attachInvoiceBalances(supabase, invoices ?? []);

  return (
    <ViewTransition enter={pageEnter} exit={pageExit}>
      <InvoicesPanel
        // Supabase's generated types widen enum columns (status, tax treatment)
        // to `string` — narrower and non-null in practice given how these rows
        // are only ever written through create_invoice()/create_organisation().
        initialInvoices={invoicesWithBalances as unknown as Parameters<typeof InvoicesPanel>[0]["initialInvoices"]}
        parties={parties ?? []}
        org={org as unknown as Parameters<typeof InvoicesPanel>[0]["org"]}
        eligibleServiceCompletions={eligible ?? []}
        readyToBill={(readyToBill ?? []) as unknown as Parameters<typeof InvoicesPanel>[0]["readyToBill"]}
      />
    </ViewTransition>
  );
}
