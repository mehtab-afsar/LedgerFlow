"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { formatINR, addPaise } from "@/lib/money";
import { formatDate } from "@/lib/india/format";
import { StatCard } from "@/features/dashboard/components/StatCard";

type Party = { id: string; name: string; gstin: string | null; state_code: string | null; payment_terms_days: number };

type Invoice = {
  id: string;
  invoice_no: string;
  invoice_date: string;
  due_date: string | null;
  status: "draft" | "issued" | "cancelled";
  total_paise: number;
  invoice_balances: { balance_due_paise: number; amount_paid_paise: number }[];
};

const STATUS_STYLE: Record<Invoice["status"], string> = {
  draft: "bg-line-soft text-ink-2",
  issued: "bg-forest-tint text-forest-ink",
  cancelled: "bg-alert-tint text-alert",
};

export function PartyLedgerPanel({
  party,
  invoices,
}: {
  party: Party;
  invoices: Invoice[];
}) {
  const router = useRouter();

  const isOverdue = (inv: Invoice) =>
    inv.status === "issued" &&
    !!inv.due_date &&
    inv.due_date < new Date().toISOString().slice(0, 10) &&
    (inv.invoice_balances[0]?.balance_due_paise ?? 0) > 0;

  const outstandingInvoices = invoices.filter((inv) => (inv.invoice_balances[0]?.balance_due_paise ?? 0) > 0);
  const totalOutstandingPaise =
    outstandingInvoices.length > 0
      ? addPaise(...outstandingInvoices.map((inv) => inv.invoice_balances[0]?.balance_due_paise ?? 0))
      : 0;
  const overdueInvoices = invoices.filter(isOverdue);
  const totalOverduePaise =
    overdueInvoices.length > 0
      ? addPaise(...overdueInvoices.map((inv) => inv.invoice_balances[0]?.balance_due_paise ?? 0))
      : 0;

  return (
    <div className="space-y-6 p-8">
      <div>
        <Link
          href="/dashboard/outstanding"
          transitionTypes={["nav-back"]}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 hover:text-ink"
        >
          <ArrowLeft className="size-3.5" />
          Outstanding
        </Link>
      </div>

      <header>
        <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">{party.name}</h1>
        <p className="mt-1 text-[13.5px] text-ink-2">
          {party.gstin ? `GSTIN ${party.gstin}` : "No GSTIN on file"}
          {party.state_code ? ` · State ${party.state_code}` : ""} · {party.payment_terms_days}-day terms
        </p>
      </header>

      <div className="grid gap-4 min-[640px]:grid-cols-3">
        <StatCard label="Outstanding" value={formatINR(totalOutstandingPaise)} tone="ink" />
        <StatCard label="Overdue" value={formatINR(totalOverduePaise)} tone="alert" />
        <StatCard label="Invoices" value={String(invoices.length)} tone="ink" />
      </div>

      <section>
        <h2 className="text-[15px] font-medium text-ink">Invoices</h2>
        <p className="mt-1 text-[12.5px] text-ink-3">Click a row to open the invoice — payments and balance are shown there.</p>
        <div className="mt-3 overflow-x-auto rounded-[10px] border border-line bg-white">
          <table className="w-full text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-line-soft text-[12px] uppercase tracking-wide text-ink-3">
                <th className="px-5 py-3 font-medium">Invoice</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Due</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Total</th>
                <th className="px-5 py-3 font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-ink-3">
                    No invoices for this party yet.
                  </td>
                </tr>
              )}
              {invoices.map((inv) => {
                const balance = inv.invoice_balances[0]?.balance_due_paise ?? 0;
                const overdue = isOverdue(inv);
                return (
                  <tr
                    key={inv.id}
                    onClick={() => router.push(`/invoices/${inv.id}`)}
                    className="cursor-pointer border-b border-line-soft last:border-b-0 hover:bg-paper"
                  >
                    <td className="px-5 py-3 font-mono text-ink">
                      <Link
                        href={`/invoices/${inv.id}`}
                        transitionTypes={["nav-forward"]}
                        onClick={(e) => e.stopPropagation()}
                        className="text-brand hover:text-brand-hover hover:underline"
                      >
                        {inv.invoice_no}
                      </Link>
                    </td>
                    <td className="px-5 py-3 font-mono text-ink-2">{formatDate(inv.invoice_date)}</td>
                    <td className="px-5 py-3 font-mono text-ink-2">
                      {inv.due_date ? (
                        overdue ? (
                          <span className="text-alert">{formatDate(inv.due_date)}</span>
                        ) : (
                          formatDate(inv.due_date)
                        )
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-medium capitalize ${STATUS_STYLE[inv.status]}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-ink-2">{formatINR(inv.total_paise)}</td>
                    <td className="px-5 py-3 font-mono">
                      {balance > 0 ? (
                        <span className={overdue ? "text-alert" : "text-ink"}>{formatINR(balance)}</span>
                      ) : (
                        <span className="text-forest-ink">Paid</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
