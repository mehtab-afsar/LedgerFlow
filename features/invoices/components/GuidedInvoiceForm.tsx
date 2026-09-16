"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { formatINR, addPaise } from "@/lib/money";
import { formatDate } from "@/lib/india/format";
import { cn } from "@/lib/utils";
import { inputClass } from "@/lib/ui/styles";

type Party = { id: string; name: string };
type EligibleService = {
  id: string;
  party_id: string;
  external_reference: string | null;
  service_type: string | null;
  amount_paise: number;
  occurred_on: string;
};
type Org = { default_tax_treatment: "reverse_charge" | "forward"; default_tax_rate_pct: number } | null;

/**
 * The guided path onto an invoice: land already scoped to one party with
 * every pending service pre-selected, so the common case is "review, then
 * generate" rather than "hunt for the party, then hunt for the services" —
 * see InvoicesPanel's manual form (kept, demoted to "Advanced") for the
 * general-purpose version this narrows.
 */
export function GuidedInvoiceForm({
  party,
  parties,
  eligibleServiceCompletions,
  org,
}: {
  party: Party;
  parties: Party[];
  eligibleServiceCompletions: EligibleService[];
  org: Org;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(eligibleServiceCompletions.map((sc) => [sc.id, true])),
  );
  const [deliverToId, setDeliverToId] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [exempt, setExempt] = useState(false);
  const [taxTreatment, setTaxTreatment] = useState<"reverse_charge" | "forward">(org?.default_tax_treatment ?? "forward");
  const [taxRatePct, setTaxRatePct] = useState(String(org?.default_tax_rate_pct ?? 18));

  const effectiveDeliverTo = deliverToId || party.id;
  const selectedIds = Object.keys(selected).filter((id) => selected[id]);
  const taxableValuePaise = useMemo(() => {
    const amounts = eligibleServiceCompletions.filter((sc) => selected[sc.id]).map((sc) => sc.amount_paise);
    return amounts.length > 0 ? addPaise(...amounts) : 0;
  }, [eligibleServiceCompletions, selected]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.length === 0) {
      toast.error("Select at least one completed service to bill");
      return;
    }
    if (effectiveDeliverTo !== party.id && !overrideReason.trim()) {
      toast.error("The bill-to party differs from who received the goods — add a reason for the record");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bill_to_party_id: party.id,
        deliver_to_party_id: effectiveDeliverTo,
        bill_to_override_reason: effectiveDeliverTo !== party.id ? overrideReason : null,
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
    router.push(`/invoices/${body.data.invoice_id}`);
  }

  return (
    <div className="space-y-5 p-8">
      <div>
        <Link
          href="/invoices"
          transitionTypes={["nav-back"]}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 hover:text-ink"
        >
          <ArrowLeft className="size-3.5" />
          Invoices
        </Link>
      </div>

      <header>
        <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Bill {party.name}</h1>
        <p className="mt-1 text-[13.5px] text-ink-2">
          Every completed, not-yet-invoiced service for this party is selected below — uncheck anything you
          don&apos;t want on this invoice.
        </p>
      </header>

      <form onSubmit={submit} className="space-y-4 rounded-[10px] border border-line bg-white p-5">
        {eligibleServiceCompletions.length === 0 ? (
          <p className="text-[13.5px] text-ink-3">
            No completed, not-yet-invoiced services for this party right now.
          </p>
        ) : (
          <ul className="max-h-[320px] overflow-y-auto rounded-md border border-line">
            {eligibleServiceCompletions.map((sc) => (
              <li key={sc.id} className="flex items-center justify-between gap-3 border-b border-line-soft px-3 py-2.5 last:border-b-0">
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

        <div>
          <button
            type="button"
            onClick={() => setAdvancedOpen((s) => !s)}
            className="flex items-center gap-1 text-[13px] font-medium text-ink-2 hover:text-ink"
          >
            <ChevronDown className={cn("size-3.5 transition-transform duration-150", advancedOpen && "rotate-180")} />
            Advanced
          </button>

          {advancedOpen && (
            <div className="mt-3 space-y-3 border-t border-line-soft pt-3">
              <div className="grid gap-3 min-[640px]:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-ink">Delivered to (if different)</label>
                  <select value={deliverToId} onChange={(e) => setDeliverToId(e.target.value)} className={inputClass}>
                    <option value="">Same as bill-to</option>
                    {parties.filter((p) => p.id !== party.id).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-ink">Due date</label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={`${inputClass} font-mono`} />
                </div>
              </div>

              {deliverToId && deliverToId !== party.id && (
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

              <div className="grid gap-3 min-[640px]:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-ink">Tax treatment</label>
                  <select
                    value={taxTreatment}
                    onChange={(e) => setTaxTreatment(e.target.value as "forward" | "reverse_charge")}
                    className={inputClass}
                    disabled={exempt}
                  >
                    <option value="forward">Charge GST</option>
                    <option value="reverse_charge">Reverse charge</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-ink">GST rate (%)</label>
                  <input
                    type="number"
                    step="any"
                    value={taxRatePct}
                    onChange={(e) => setTaxRatePct(e.target.value)}
                    className={`${inputClass} font-mono`}
                    disabled={exempt || taxTreatment === "reverse_charge"}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-[13px] text-ink-2">
                <input type="checkbox" checked={exempt} onChange={(e) => setExempt(e.target.checked)} className="size-4 accent-brand" />
                This invoice is tax-exempt
              </label>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-line-soft pt-4">
          <span className="text-[13.5px] text-ink-2">
            Taxable value: <span className="font-mono font-medium text-ink">{formatINR(taxableValuePaise)}</span>
          </span>
          <button
            type="submit"
            disabled={saving || eligibleServiceCompletions.length === 0}
            className="rounded-md bg-brand px-5 py-2.5 text-[13.5px] font-medium text-white hover:bg-brand-hover disabled:bg-ink-3"
          >
            {saving ? "Issuing…" : "Issue invoice"}
          </button>
        </div>
      </form>
    </div>
  );
}
