import { ViewTransition } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth/verify";
import { ServiceCompletionsPanel } from "@/features/service-completions/components/ServiceCompletionsPanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Service completions" };

const COLUMNS =
  "id, external_reference, service_type, origin, destination, amount_paise, cost_paise, occurred_on, status";

export default async function ServiceCompletionsPage() {
  const auth = await verifyAuth();
  if (!auth.ok) redirect("/");

  const supabase = await createClient();
  const [{ data: rows }, { data: parties }] = await Promise.all([
    supabase.from("service_completions").select(`${COLUMNS}, parties(name)`).order("occurred_on", { ascending: false }),
    supabase.from("parties").select("id, name").order("name"),
  ]);

  return (
    <ViewTransition enter="slide-up" default="none">
      <ServiceCompletionsPanel
        initialRows={(rows ?? []) as unknown as Parameters<typeof ServiceCompletionsPanel>[0]["initialRows"]}
        parties={parties ?? []}
      />
    </ViewTransition>
  );
}
