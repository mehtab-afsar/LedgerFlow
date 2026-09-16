import { ViewTransition } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth/verify";
import { PartiesPanel } from "@/features/parties/components/PartiesPanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Parties" };

export default async function PartiesPage() {
  const auth = await verifyAuth();
  if (!auth.ok) redirect("/");

  const supabase = await createClient();
  const { data } = await supabase
    .from("parties")
    .select("id, name, gstin, state_code, payment_terms_days, created_at")
    .order("name");

  return (
    <ViewTransition enter="slide-up" default="none">
      <PartiesPanel initialParties={data ?? []} />
    </ViewTransition>
  );
}
