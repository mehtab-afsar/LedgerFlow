import { ViewTransition } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth/verify";
import { ExpensesPanel } from "@/features/expenses/components/ExpensesPanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Expenses" };

export default async function ExpensesPage() {
  const auth = await verifyAuth();
  if (!auth.ok) redirect("/");

  const supabase = await createClient();
  const [{ data: expenses }, { data: parties }] = await Promise.all([
    supabase
      .from("expenses")
      .select("id, category, description, amount_paise, incurred_on, party_id, parties(name)")
      .order("incurred_on", { ascending: false }),
    supabase.from("parties").select("id, name").order("name"),
  ]);

  return (
    <ViewTransition enter="slide-up" default="none">
      <ExpensesPanel
        initialExpenses={(expenses ?? []) as unknown as Parameters<typeof ExpensesPanel>[0]["initialExpenses"]}
        parties={parties ?? []}
      />
    </ViewTransition>
  );
}
