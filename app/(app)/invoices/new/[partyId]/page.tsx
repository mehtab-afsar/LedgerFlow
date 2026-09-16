import { ViewTransition } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth/verify";
import { GuidedInvoiceForm } from "@/features/invoices/components/GuidedInvoiceForm";
import { pageEnter, pageExit } from "@/lib/ui/page-transition";

export const dynamic = "force-dynamic";
export const metadata = { title: "New invoice" };

export default async function NewGuidedInvoicePage({ params }: { params: Promise<{ partyId: string }> }) {
  const { partyId } = await params;
  const auth = await verifyAuth();
  if (!auth.ok) redirect("/");

  const supabase = await createClient();

  const [{ data: party }, { data: parties }, { data: eligible }, { data: org }] = await Promise.all([
    supabase.from("parties").select("id, name").eq("id", partyId).maybeSingle(),
    supabase.from("parties").select("id, name").order("name"),
    supabase
      .from("service_completions")
      .select("id, party_id, external_reference, service_type, amount_paise, occurred_on")
      .eq("party_id", partyId)
      .eq("status", "completed")
      .order("occurred_on", { ascending: false }),
    supabase
      .from("organisations")
      .select("default_tax_treatment, default_tax_rate_pct")
      .eq("id", auth.ctx.orgId)
      .single(),
  ]);

  if (!party) notFound();

  return (
    <ViewTransition enter={pageEnter} exit={pageExit}>
      <GuidedInvoiceForm
        party={party}
        parties={parties ?? []}
        eligibleServiceCompletions={eligible ?? []}
        org={org as unknown as Parameters<typeof GuidedInvoiceForm>[0]["org"]}
      />
    </ViewTransition>
  );
}
