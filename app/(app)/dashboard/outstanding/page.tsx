import { ViewTransition } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth/verify";
import { OutstandingPanel } from "@/features/dashboard/components/OutstandingPanel";
import { pageEnter, pageExit } from "@/lib/ui/page-transition";

export const dynamic = "force-dynamic";
export const metadata = { title: "Outstanding" };

export default async function OutstandingPage() {
  const auth = await verifyAuth();
  if (!auth.ok) redirect("/");

  const supabase = await createClient();
  const { data } = await supabase
    .from("party_outstanding")
    .select(
      "party_id, invoices_outstanding, amount_outstanding_paise, invoices_overdue, amount_overdue_paise, parties(name)",
    )
    .order("amount_outstanding_paise", { ascending: false });

  return (
    <ViewTransition enter={pageEnter} exit={pageExit}>
      <OutstandingPanel rows={(data ?? []) as unknown as Parameters<typeof OutstandingPanel>[0]["rows"]} />
    </ViewTransition>
  );
}
