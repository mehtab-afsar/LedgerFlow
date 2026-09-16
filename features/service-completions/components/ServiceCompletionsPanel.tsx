"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { toPaise, formatINR } from "@/lib/money";
import { formatDate } from "@/lib/india/format";
import { inputClass, buttonPrimaryClass } from "@/lib/ui/styles";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Party = { id: string; name: string };
type ServiceCompletion = {
  id: string;
  external_reference: string | null;
  service_type: string | null;
  origin: string | null;
  destination: string | null;
  amount_paise: number;
  cost_paise: number | null;
  occurred_on: string;
  status: "pending" | "completed" | "invoiced" | "cancelled";
  parties: { name: string } | null;
};

const STATUS_STYLE: Record<string, string> = {
  completed: "bg-forest-tint text-forest-ink",
  invoiced: "bg-line-soft text-ink-2",
  pending: "bg-marigold-tint text-marigold-ink",
  cancelled: "bg-alert-tint text-alert",
};

const emptyForm = {
  party_id: "",
  external_reference: "",
  service_type: "",
  origin: "",
  destination: "",
  quantity: "",
  rate: "",
  amount: "",
  cost: "",
  occurred_on: new Date().toISOString().slice(0, 10),
};

export function ServiceCompletionsPanel({
  initialRows,
  parties,
}: {
  initialRows: ServiceCompletion[];
  parties: Party[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const computedAmount =
    form.quantity && form.rate ? (Number(form.quantity) * Number(form.rate)).toFixed(2) : form.amount;
  const partyName = parties.find((p) => p.id === form.party_id)?.name;

  function review(e: React.FormEvent) {
    e.preventDefault();
    const amountRupees = Number(computedAmount);
    if (!form.party_id || !amountRupees || amountRupees <= 0) {
      toast.error("Pick a party and enter an amount greater than zero");
      return;
    }
    setConfirmOpen(true);
  }

  async function confirmSave() {
    const amountRupees = Number(computedAmount);
    setSaving(true);
    const res = await fetch("/api/service-completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        party_id: form.party_id,
        external_reference: form.external_reference || null,
        service_type: form.service_type || null,
        origin: form.origin || null,
        destination: form.destination || null,
        quantity: form.quantity ? Number(form.quantity) : null,
        rate_paise: form.rate ? toPaise(Number(form.rate)) : null,
        amount_paise: toPaise(amountRupees),
        cost_paise: form.cost ? toPaise(Number(form.cost)) : null,
        occurred_on: form.occurred_on,
      }),
    });
    const body = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error(body.error ?? "Could not save this service completion");
      return;
    }
    toast.success("Service completion recorded");
    setForm(emptyForm);
    setShowForm(false);
    setConfirmOpen(false);
    router.refresh();
  }

  return (
    <div className="space-y-5 p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Service completions</h1>
          <p className="mt-1 text-[13.5px] text-ink-2">
            Record a completed service — freight, loading, detention, warehousing. Only
            &quot;completed&quot; records can be invoiced.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className={buttonPrimaryClass}
        >
          {showForm ? "Cancel" : "Log a service"}
        </button>
      </header>

      {showForm && (
        <form onSubmit={review} className="grid gap-3 rounded-[10px] border border-line bg-white p-5 min-[640px]:grid-cols-3">
          <div className="min-[640px]:col-span-2">
            <label className="mb-1.5 block text-[13px] font-medium text-ink">Party</label>
            <select required value={form.party_id} onChange={(e) => setForm({ ...form, party_id: e.target.value })} className={inputClass}>
              <option value="">Select a party</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-ink">Date</label>
            <input type="date" required value={form.occurred_on} onChange={(e) => setForm({ ...form, occurred_on: e.target.value })} className={`${inputClass} font-mono`} />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-ink">Reference no.</label>
            <input value={form.external_reference} onChange={(e) => setForm({ ...form, external_reference: e.target.value })} className={inputClass} placeholder="Booking / job no." />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-ink">Service type</label>
            <input value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })} className={inputClass} placeholder="Freight, detention…" />
          </div>
          <div />

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-ink">Origin</label>
            <input value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-ink">Destination</label>
            <input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className={inputClass} />
          </div>
          <div />

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-ink">Quantity</label>
            <input type="number" step="any" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className={`${inputClass} font-mono`} />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-ink">Rate (₹)</label>
            <input type="number" step="any" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} className={`${inputClass} font-mono`} />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-ink">Amount (₹)</label>
            <input
              type="number"
              step="any"
              value={computedAmount}
              onChange={(e) => setForm({ ...form, amount: e.target.value, quantity: "", rate: "" })}
              className={`${inputClass} font-mono`}
              placeholder="Auto from qty × rate"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-ink">Cost (₹)</label>
            <input
              type="number"
              step="any"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
              className={`${inputClass} font-mono`}
              placeholder="Fuel, driver, vendor…"
            />
            <p className="mt-1 text-[11.5px] text-ink-3">
              What this job cost you — feeds the Profit figure on the dashboard. Leave blank if unknown.
            </p>
          </div>
          <div />

          <div className="min-[640px]:col-span-3">
            <button type="submit" className="rounded-md bg-brand px-5 py-2.5 text-[13.5px] font-medium text-white hover:bg-brand-hover">
              Review &amp; save
            </button>
          </div>
        </form>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm this service completion</DialogTitle>
            <DialogDescription>
              This becomes a billable record. Once saved it can&apos;t be edited — only recorded once, so check
              the details below before confirming.
            </DialogDescription>
          </DialogHeader>
          <dl className="space-y-2 text-[13.5px]">
            <SummaryRow label="Party" value={partyName ?? "—"} />
            <SummaryRow label="Date" value={formatDate(form.occurred_on)} />
            {form.service_type && <SummaryRow label="Service type" value={form.service_type} />}
            {(form.origin || form.destination) && (
              <SummaryRow label="Route" value={`${form.origin || "—"} → ${form.destination || "—"}`} />
            )}
            {form.external_reference && <SummaryRow label="Reference" value={form.external_reference} />}
            <SummaryRow label="Amount" value={formatINR(toPaise(Number(computedAmount) || 0))} strong />
            {form.cost && <SummaryRow label="Cost" value={formatINR(toPaise(Number(form.cost)))} />}
          </dl>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="rounded-md border border-line bg-white px-4 py-2 text-[13.5px] font-medium text-ink hover:bg-paper"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={confirmSave}
              disabled={saving}
              className="rounded-md bg-brand px-4 py-2 text-[13.5px] font-medium text-white hover:bg-brand-hover disabled:bg-ink-3"
            >
              {saving ? "Saving…" : "Confirm & save"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="overflow-x-auto rounded-[10px] border border-line bg-white">
        <table className="w-full text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-line-soft text-[12px] uppercase tracking-wide text-ink-3">
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Party</th>
              <th className="px-5 py-3 font-medium">Reference</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Cost</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {initialRows.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-10 text-center text-ink-3">Nothing logged yet.</td></tr>
            )}
            {initialRows.map((r) => (
              <tr key={r.id} className="border-b border-line-soft last:border-b-0">
                <td className="px-5 py-3 font-mono text-ink-2">{formatDate(r.occurred_on)}</td>
                <td className="px-5 py-3 font-medium text-ink">{r.parties?.name ?? "—"}</td>
                <td className="px-5 py-3 font-mono text-ink-2">{r.external_reference ?? "—"}</td>
                <td className="px-5 py-3 text-ink-2">{r.service_type ?? "—"}</td>
                <td className="px-5 py-3 font-mono text-ink">{formatINR(r.amount_paise)}</td>
                <td className="px-5 py-3 font-mono text-ink-2">{r.cost_paise != null ? formatINR(r.cost_paise) : "—"}</td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-medium ${STATUS_STYLE[r.status]}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <a
                    href={`/api/service-completions/${r.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[12.5px] font-medium text-brand hover:text-brand-hover hover:underline"
                  >
                    PDF
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${strong ? "border-t border-line-soft pt-2" : ""}`}>
      <dt className="text-ink-2">{label}</dt>
      <dd className={strong ? "font-mono font-semibold text-ink" : "font-medium text-ink"}>{value}</dd>
    </div>
  );
}
