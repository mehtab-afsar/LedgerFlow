import Link from "next/link";
import { ViewTransition } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { verifyAuth } from "@/lib/auth/verify";
import { formatINR, addPaise, subtractPaise } from "@/lib/money";
import { resolvePeriod } from "@/lib/dashboard/period";
import { PeriodPicker } from "@/features/dashboard/components/PeriodPicker";
import { StatCard } from "@/features/dashboard/components/StatCard";
import { buttonPrimaryClass, buttonSecondaryClass, cardClass } from "@/lib/ui/styles";
import { pageEnter, pageExit } from "@/lib/ui/page-transition";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const auth = await verifyAuth();
  if (!auth.ok) redirect("/");

  const period = resolvePeriod(await searchParams);
  const supabase = await createClient();

  const [{ data: outstandingRows }, { data: issuedInvoices }, { data: jobMargins }, { data: expenseRows }, { data: receiptRows }] =
    await Promise.all([
      supabase
        .from("party_outstanding")
        .select("invoices_outstanding, amount_outstanding_paise, amount_overdue_paise, party_id"),
      supabase
        .from("invoices")
        .select("taxable_value_paise")
        .eq("status", "issued")
        .gte("invoice_date", period.from)
        .lte("invoice_date", period.to),
      supabase
        .from("service_completion_margin")
        .select("cost_paise")
        .gte("occurred_on", period.from)
        .lte("occurred_on", period.to),
      supabase
        .from("expenses")
        .select("amount_paise")
        .gte("incurred_on", period.from)
        .lte("incurred_on", period.to),
      supabase
        .from("receipts")
        .select("amount_paise")
        .gte("received_on", period.from)
        .lte("received_on", period.to),
    ]);

  const rows = outstandingRows ?? [];
  const totalOutstandingPaise = rows.reduce((sum, r) => sum + (r.amount_outstanding_paise ?? 0), 0);
  const totalOverduePaise = rows.reduce((sum, r) => sum + (r.amount_overdue_paise ?? 0), 0);
  const totalInvoicesOutstanding = rows.reduce((sum, r) => sum + (r.invoices_outstanding ?? 0), 0);
  const partiesWithBalance = rows.filter((r) => (r.amount_outstanding_paise ?? 0) > 0).length;

  // Revenue excludes GST — collected tax isn't the business's money.
  const revenuePaise =
    issuedInvoices && issuedInvoices.length > 0 ? addPaise(...issuedInvoices.map((i) => i.taxable_value_paise)) : 0;
  const jobCostPaise =
    jobMargins && jobMargins.length > 0 ? addPaise(...jobMargins.map((m) => m.cost_paise ?? 0)) : 0;
  const expensePaise =
    expenseRows && expenseRows.length > 0 ? addPaise(...expenseRows.map((e) => e.amount_paise)) : 0;
  const costPaise = addPaise(jobCostPaise, expensePaise);
  const profitPaise = subtractPaise(revenuePaise, costPaise);
  const collectedPaise =
    receiptRows && receiptRows.length > 0 ? addPaise(...receiptRows.map((r) => r.amount_paise)) : 0;

  return (
    <ViewTransition enter={pageEnter} exit={pageExit}>
      <div className="space-y-6 p-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Dashboard</h1>
            <p className="mt-1 text-[13.5px] text-ink-2">Where things stand, and what&apos;s moved lately.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/service-completions" className={buttonSecondaryClass}>
              Log a service
            </Link>
            <Link href="/invoices" className={buttonPrimaryClass}>
              New invoice
            </Link>
          </div>
        </header>

        <section className={cardClass}>
          <div className="grid gap-6 min-[720px]:grid-cols-2">
            <div>
              <SectionLabel>As of today</SectionLabel>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <StatCard
                  label="Outstanding"
                  value={formatINR(totalOutstandingPaise)}
                  tone="ink"
                  href="/dashboard/outstanding"
                  bordered={false}
                  sub={`${totalInvoicesOutstanding} across ${partiesWithBalance} ${partiesWithBalance === 1 ? "party" : "parties"}`}
                />
                <StatCard
                  label="Overdue"
                  value={formatINR(totalOverduePaise)}
                  tone="alert"
                  href="/dashboard/outstanding"
                  bordered={false}
                  sub="See who owes what →"
                />
              </div>
            </div>

            <div className="border-t border-line-soft pt-6 min-[720px]:border-l min-[720px]:border-t-0 min-[720px]:pl-6 min-[720px]:pt-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <SectionLabel>{period.label}</SectionLabel>
                <PeriodPicker activePreset={period.preset} from={period.from} to={period.to} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <StatCard
                  label="Profit"
                  value={formatINR(profitPaise)}
                  tone={profitPaise < 0 ? "alert" : "forest"}
                  bordered={false}
                  sub={`Revenue ${formatINR(revenuePaise)} − cost ${formatINR(costPaise)}`}
                />
                <StatCard
                  label="Collected"
                  value={formatINR(collectedPaise)}
                  tone="forest"
                  bordered={false}
                  sub="cash received"
                />
              </div>
            </div>
          </div>
        </section>

        <p className="text-[12.5px] text-ink-3">
          Full breakdowns live under Dashboard in the sidebar —{" "}
          <Link href="/dashboard/outstanding" className="font-medium text-brand hover:text-brand-hover">
            Outstanding
          </Link>{" "}
          and{" "}
          <Link href="/dashboard/activity" className="font-medium text-brand hover:text-brand-hover">
            Activity
          </Link>
          .
        </p>
      </div>
    </ViewTransition>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[12px] font-medium uppercase tracking-wide text-ink-3">{children}</h2>;
}
