import { ViewTransition } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth/verify";
import { ActivityFeed } from "@/features/dashboard/components/ActivityFeed";

export const dynamic = "force-dynamic";
export const metadata = { title: "Activity" };

export default async function ActivityPage() {
  const auth = await verifyAuth();
  if (!auth.ok) redirect("/");

  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_events")
    .select("id, action, entity_type, entity_id, after, reason, at")
    .order("at", { ascending: false })
    .limit(100);

  return (
    <ViewTransition enter="slide-up" default="none">
      <div className="space-y-6 p-8">
        <header>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Activity</h1>
          <p className="mt-1 text-[13.5px] text-ink-2">
            Every invoice issued or cancelled, credit note applied, and receipt recorded — an append-only log,
            most recent first.
          </p>
        </header>
        <div className="overflow-hidden rounded-[10px] border border-line bg-white">
          <ActivityFeed events={(data ?? []) as unknown as Parameters<typeof ActivityFeed>[0]["events"]} />
        </div>
      </div>
    </ViewTransition>
  );
}
