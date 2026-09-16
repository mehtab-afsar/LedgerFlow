import { ViewTransition } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth/verify";
import { ReceiptDetail } from "@/features/receipts/components/ReceiptDetail";
import { pageEnter, pageExit } from "@/lib/ui/page-transition";

export const dynamic = "force-dynamic";
export const metadata = { title: "Receipt" };

export default async function ReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await verifyAuth();
  if (!auth.ok) redirect("/");

  const supabase = await createClient();

  const { data: receipt } = await supabase
    .from("receipts")
    .select(
      "id, amount_paise, received_on, method, reference_no, notes, payer_party_id, parties(name, gstin, state_code)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!receipt) notFound();

  const { data: allocations } = await supabase
    .from("receipt_allocations")
    .select("id, amount_allocated_paise, invoices(id, invoice_no, invoice_date, total_paise, status)")
    .eq("receipt_id", id);

  return (
    <ViewTransition enter={pageEnter} exit={pageExit}>
      <ReceiptDetail
        receipt={receipt as unknown as Parameters<typeof ReceiptDetail>[0]["receipt"]}
        allocations={(allocations ?? []) as unknown as Parameters<typeof ReceiptDetail>[0]["allocations"]}
      />
    </ViewTransition>
  );
}
