import { ViewTransition } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth/verify";
import { SettingsPanel } from "@/features/settings/components/SettingsPanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const auth = await verifyAuth();
  if (!auth.ok) redirect("/");

  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organisations")
    .select(
      "id, legal_name, gstin, transin, pan, state_code, address, invoice_prefix, credit_note_prefix, default_tax_treatment, default_tax_rate_pct",
    )
    .eq("id", auth.ctx.orgId)
    .single();

  return (
    <ViewTransition enter="slide-up" default="none">
      <SettingsPanel
        org={org as unknown as Parameters<typeof SettingsPanel>[0]["org"]}
        isOwner={auth.ctx.role === "owner"}
      />
    </ViewTransition>
  );
}
