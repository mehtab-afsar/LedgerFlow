"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatINR, addPaise } from "@/lib/money";
import { formatDate } from "@/lib/india/format";
import { ReadyToBillList } from "@/features/invoices/components/ReadyToBillList";
import { inputClass, buttonSecondaryClass } from "@/lib/ui/styles";

type Party = { id: string; name: string };
type ReadyToBillRow = {
  party_id: string;
  pending_count: number;
  pending_amount_paise: number;
  parties: { name: string } | null;
};
type EligibleService = {
  id: string;
  party_id: string;
  external_reference: string | null;
  service_type: string | null;
  amount_paise: number;
  occurred_on: string;
};
type Invoice = {
  id: string;
  invoice_no: string;
  invoice_date: string;
  due_date: string | null;
  status: "draft" | "issued" | "cancelled";
  total_paise: number;
  parties: { name: string } | null;
  invoice_balances: { balance_due_paise: number; amount_paid_paise: number }[];
};
type Org = { default_tax_treatment: "reverse_charge" | "forward"; default_tax_rate_pct: number } | null;

/**
 * eligibleServiceCompletions arrives as one prop covering every party — small
 * enough for a v1 office workflow — and is filtered per selected bill-to
 * party with useMemo rather than re-fetched in an effect keyed on that
 * selection, so there's no fetch-in-effect to get wrong.
 */
export function InvoicesPanel({
  initialInvoices,
  parties,
  org,
  eligibleServiceCompletions,
  readyToBill,
}: {
  initialInvoices: Invoice[];
  parties: Party[];
  org: Org;
  eligibleServiceCompletions: EligibleService[];
  readyToBill: ReadyToBillRow[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [billToId, setBillToId] = useState("");
  const [deliverToId, setDeliverToId] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [exempt, setExempt] = useState(false);
  const [taxTreatment, setTaxTreatment] = useState<"reverse_charge" | "forward">(org?.default_tax_treatment ?? "forward");
  const [taxRatePct, setTaxRatePct] = useState(String(org?.default_tax_rate_pct ?? 18));
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const eligible = useMemo(
    () => (billToId ? eligibleServiceCompletions.filter((sc) => sc.party_id === billToId) : []),
    [billToId, eligibleServiceCompletions],
  );
  const effectiveDeliverTo = deliverToId || billToId;
  const selectedIds = Object.keys(selected).filter((id) => selected[id]);
  const taxableValuePaise = useMemo(() => {
    const amounts = eligible.filter((sc) => selected[sc.id]).map((sc) => sc.amount_paise);
    return amounts.length > 0 ? addPaise(...amounts) : 0;
  }, [eligible, selected]);

  function resetForm() {
    setBillToId("");
    setDeliverToId("");
    setOverrideReason("");
    setDueDate("");
    setExempt(false);
    setSelected({});
    setTaxTreatment(org?.default_tax_treatment ?? "forward");
    setTaxRatePct(String(org?.default_tax_rate_pct ?? 18));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!billToId) {
      toast.error("Pick who this invoice is billed to");
      return;
    }
    if (selectedIds.length === 0) {
      toast.error("Select at least one completed service to bill");
      return;
    }
    if (effectiveDeliverTo !== billToId && !overrideReason.trim()) {
      toast.error("The bill-to party differs from who received the goods — add a reason for the record");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bill_to_party_id: billToId,
        deliver_to_party_id: effectiveDeliverTo,
        bill_to_override_reason: effectiveDeliverTo !== billToId ? overrideReason : null,
        service_completion_ids: selectedIds,
        free_lines: [],
        due_date: dueDate || null,
        tax_treatment: taxTreatment,
        tax_rate_pct: exempt ? 0 : Number(taxRatePct) || 0,
        exempt,
      }),
    });
    const body = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error(body.error ?? "Could not create this invoice");
      return;
    }
    toast.success(`Invoice ${body.data.invoice_no} issued`);
    resetForm();
    setShowForm(false);
    router.refresh();
  }

  return (
    <div className="space-y-8 p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Invoices</h1>
          <p className="mt-1 text-[13.5px] text-ink-2">
            Issued invoices are frozen — corrections go through a credit note, not an edit.
          </p>
        </div>
      </header>

      <ReadyToBillList rows={readyToBill} />

      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-medium text-ink">Manual invoice</h2>
            <p className="mt-1 text-[13px] text-ink-2">
              Pick any party directly — for free-form invoices or parties without pending work above.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            className={buttonSecondaryClass}
          >
            {showForm ? "Cancel" : "New invoice"}
          </button>
        </div>

        {showForm && (
        <form onSubmit={submit} className="space-y-4 rounded-[10px] border border-line bg-white p-5">
          <div className="grid gap-3 min-[640px]:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-ink">Bill to</label>
              <select
                required
                value={billToId}
                onChange={(e) => {
                  setBillToId(e.target.value);
                  setSelected({});
                }}
                className={inputClass}
              >
                <option value="">Select a party</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-ink">Delivered to (if different)</label>
              <select value={deliverToId} onChange={(e) => setDeliverToId(e.target.value)} className={inputClass}>
                <option value="">Same as bill-to</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {deliverToId && deliverToId !== billToId && (
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-ink">
                Reason the billed party differs from who received the goods
              </label>
              <input
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className={inputClass}
                placeholder="e.g. Billed to head office per contract"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-ink">
              Completed services to bill {billToId && `(${eligible.length} available)`}
            </label>
            {!billToId && <p className="text-[13px] text-ink-3">Pick a bill-to party first.</p>}
            {billToId && eligible.length === 0 && (
              <p className="text-[13px] text-ink-3">No completed, not-yet-invoiced services for this party.</p>
            )}
            {eligible.length > 0 && (
              <ul className="max-h-[220px] overflow-y-auto rounded-md border border-line">
                {eligible.map((sc) => (
                  <li key={sc.id} className="flex items-center justify-between gap-3 border-b border-line-soft px-3 py-2 last:border-b-0">
                    <label className="flex flex-1 items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={!!selected[sc.id]}
                        onChange={(e) => setSelected({ ...selected, [sc.id]: e.target.checked })}
                        className="size-4 accent-brand"
                      />
                      <span className="text-[13px] text-ink">
                        {formatDate(sc.occurred_on)} — {sc.service_type ?? "Service"}
                        {sc.external_reference ? ` — ${sc.external_reference}` : ""}
                      </span>
                    </label>
                    <span className="font-mono text-[13px] text-ink-2">{formatINR(sc.amount_paise)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid gap-3 min-[640px]:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-ink">Due date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={`${inputClass} font-mono`} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-ink">Tax treatment</label>
              <select value={taxTreatment} onChange={(e) => setTaxTreatment(e.target.value as "forward" | "reverse_charge")} className={inputClass} disabled={exempt}>
                <option value="forward">Charge GST</option>
                <option value="reverse_charge">Reverse charge</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-ink">GST rate (%)</label>
              <input type="number" step="any" value={taxRatePct} onChange={(e) => setTaxRatePct(e.target.value)} className={`${inputClass} font-mono`} disabled={exempt || taxTreatment === "reverse_charge"} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-[13px] text-ink-2">
            <input type="checkbox" checked={exempt} onChange={(e) => setExempt(e.target.checked)} className="size-4 accent-brand" />
            This invoice is tax-exempt
          </label>

          <div className="flex items-center justify-between border-t border-line-soft pt-4">
            <span className="text-[13.5px] text-ink-2">
              Taxable value: <span className="font-mono font-medium text-ink">{formatINR(taxableValuePaise)}</span>
            </span>
            <button type="submit" disabled={saving} className="rounded-md bg-brand px-5 py-2.5 text-[13.5px] font-medium text-white hover:bg-brand-hover disabled:bg-ink-3">
              {saving ? "Issuing…" : "Issue invoice"}
            </button>
          </div>
        </form>
        )}
      </section>

      <section>
        <h2 className="text-[15px] font-medium text-ink">All invoices</h2>
        <div className="mt-3 overflow-x-auto rounded-[10px] border border-line bg-white">
        <table className="w-full text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-line-soft text-[12px] uppercase tracking-wide text-ink-3">
              <th className="px-5 py-3 font-medium">Invoice</th>
              <th className="px-5 py-3 font-medium">Bill to</th>
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Total</th>
              <th className="px-5 py-3 font-medium">Balance due</th>
            </tr>
          </thead>
          <tbody>
            {initialInvoices.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-ink-3">No invoices yet.</td></tr>
            )}
            {initialInvoices.map((inv) => {
              const balance = inv.invoice_balances[0]?.balance_due_paise ?? 0;
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
                  <td className="px-5 py-3 font-medium text-ink">{inv.parties?.name ?? "—"}</td>
                  <td className="px-5 py-3 font-mono text-ink-2">{formatDate(inv.invoice_date)}</td>
                  <td className="px-5 py-3 font-mono text-ink-2">{formatINR(inv.total_paise)}</td>
                  <td className="px-5 py-3 font-mono">
                    {balance > 0 ? (
                      <span className="text-alert">{formatINR(balance)}</span>
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
