"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { formatINR, addPaise } from "@/lib/money";
import { formatDate } from "@/lib/india/format";
import { cardClass } from "@/lib/ui/styles";

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

type Allocation = {
  id: string;
  invoice_id: string;
  amount_allocated_paise: number;
  receipts: { received_on: string; method: string; reference_no: string | null } | null;
};

const STATUS_STYLE: Record<Invoice["status"], string> = {
  draft: "bg-line-soft text-ink-2",
  issued: "bg-forest-tint text-forest-ink",
  cancelled: "bg-alert-tint text-alert",
};

/**
 * Payment history expands in place — the whole point of drilling in from
 * Outstanding is "how much was received, and when," and making that a full
 * navigation to the invoice document (line items, tax breakdown, the works)
 * is a detour when this is all the question needs.
 */
export function PartyLedgerPanel({
  party,
  invoices,
  allocations,
}: {
  party: Party;
  invoices: Invoice[];
  allocations: Allocation[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const allocationsByInvoice = useMemo(() => {
    const map = new Map<string, Allocation[]>();
    for (const a of allocations) {
      const list = map.get(a.invoice_id) ?? [];
      list.push(a);
      map.set(a.invoice_id, list);
    }
    return map;
  }, [allocations]);

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
        <div className={cardClass}>
          <p className="text-[12.5px] text-ink-2">Outstanding</p>
          <p className="mt-1.5 font-mono text-[24px] font-semibold text-ink">{formatINR(totalOutstandingPaise)}</p>
        </div>
        <div className={cardClass}>
          <p className="text-[12.5px] text-ink-2">Overdue</p>
          <p className="mt-1.5 font-mono text-[24px] font-semibold text-alert">{formatINR(totalOverduePaise)}</p>
        </div>
        <div className={cardClass}>
          <p className="text-[12.5px] text-ink-2">Invoices</p>
          <p className="mt-1.5 font-mono text-[24px] font-semibold text-ink">{invoices.length}</p>
        </div>
      </div>

      <section>
        <h2 className="text-[15px] font-medium text-ink">Invoices</h2>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Click a row to see what&apos;s been received against it, and when — no need to open the full invoice.
        </p>
        <div className="mt-3 overflow-x-auto rounded-[10px] border border-line bg-white">
          <table className="w-full text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-line-soft text-[12px] uppercase tracking-wide text-ink-3">
                <th className="w-8 px-3 py-3" />
                <th className="px-2 py-3 font-medium">Invoice</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Due</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Total</th>
                <th className="px-5 py-3 font-medium">Received</th>
                <th className="px-5 py-3 font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-ink-3">
                    No invoices for this party yet.
                  </td>
                </tr>
              )}
              {invoices.map((inv) => {
                const paid = inv.invoice_balances[0]?.amount_paid_paise ?? 0;
                const balance = inv.invoice_balances[0]?.balance_due_paise ?? 0;
                const overdue = isOverdue(inv);
                const expanded = expandedId === inv.id;
                const invoiceAllocations = allocationsByInvoice.get(inv.id) ?? [];
                return (
                  <Fragment key={inv.id}>
                    <tr
                      onClick={() => setExpandedId((id) => (id === inv.id ? null : inv.id))}
                      aria-expanded={expanded}
                      className="cursor-pointer border-b border-line-soft last:border-b-0 hover:bg-paper"
                    >
                      <td className="px-3 py-3 text-ink-3">
                        <ChevronDown className={`size-3.5 transition-transform duration-150 ${expanded ? "rotate-180" : ""}`} />
                      </td>
                      <td className="px-2 py-3 font-mono text-ink">
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
                      <td className="px-5 py-3 font-mono text-ink-2">{formatINR(paid)}</td>
                      <td className="px-5 py-3 font-mono">
                        {balance > 0 ? (
                          <span className={overdue ? "text-alert" : "text-ink"}>{formatINR(balance)}</span>
                        ) : (
                          <span className="text-forest-ink">Paid</span>
                        )}
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="border-b border-line-soft bg-paper last:border-b-0">
                        <td colSpan={8} className="px-5 py-4">
                          {invoiceAllocations.length === 0 ? (
                            <p className="text-[13px] text-ink-3">Nothing received against this invoice yet.</p>
                          ) : (
                            <div className="overflow-hidden rounded-md border border-line bg-white">
                              <table className="w-full text-left text-[13px]">
                                <thead>
                                  <tr className="border-b border-line-soft text-[11.5px] uppercase tracking-wide text-ink-3">
                                    <th className="px-4 py-2 font-medium">Received</th>
                                    <th className="px-4 py-2 font-medium">Method</th>
                                    <th className="px-4 py-2 font-medium">Reference</th>
                                    <th className="px-4 py-2 font-medium">Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {invoiceAllocations.map((a) => (
                                    <tr key={a.id} className="border-b border-line-soft last:border-b-0">
                                      <td className="px-4 py-2 font-mono text-ink-2">
                                        {a.receipts ? formatDate(a.receipts.received_on) : "—"}
                                      </td>
                                      <td className="px-4 py-2 capitalize text-ink-2">{a.receipts?.method ?? "—"}</td>
                                      <td className="px-4 py-2 text-ink-2">{a.receipts?.reference_no ?? "—"}</td>
                                      <td className="px-4 py-2 font-mono text-ink">{formatINR(a.amount_allocated_paise)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                          <p className="mt-2.5 text-[13px] text-ink-2">
                            {balance > 0 ? (
                              <>
                                <span className="font-mono font-medium text-alert">{formatINR(balance)}</span> still
                                outstanding on this invoice.
                              </>
                            ) : (
                              <span className="font-medium text-forest-ink">Fully paid.</span>
                            )}
                          </p>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
