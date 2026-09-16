"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { toPaise, formatINR } from "@/lib/money";
import { formatDate } from "@/lib/india/format";
import { inputClass, buttonPrimaryClass } from "@/lib/ui/styles";

type Party = { id: string; name: string };
type OpenInvoice = {
  id: string;
  invoice_no: string;
  bill_to_party_id: string;
  invoice_balances: { balance_due_paise: number }[];
};
type Receipt = {
  id: string;
  amount_paise: number;
  received_on: string;
  method: string;
  reference_no: string | null;
  parties: { name: string } | null;
  receipt_allocations: { invoice_id: string; amount_allocated_paise: number }[];
};

const emptyForm = {
  payer_party_id: "",
  amount: "",
  received_on: new Date().toISOString().slice(0, 10),
  method: "bank" as "cash" | "bank" | "upi" | "cheque",
  reference_no: "",
  invoice_id: "",
};

export function ReceiptsPanel({
  initialReceipts,
  parties,
  openInvoices,
}: {
  initialReceipts: Receipt[];
  parties: Party[];
  openInvoices: OpenInvoice[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const payerOpenInvoices = useMemo(
    () => (form.payer_party_id ? openInvoices.filter((i) => i.bill_to_party_id === form.payer_party_id) : []),
    [form.payer_party_id, openInvoices],
  );
  const selectedInvoice = payerOpenInvoices.find((i) => i.id === form.invoice_id);
  const selectedBalancePaise = selectedInvoice?.invoice_balances[0]?.balance_due_paise ?? 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amountRupees = Number(form.amount);
    if (!form.payer_party_id || !amountRupees || amountRupees <= 0) {
      toast.error("Pick a payer and enter an amount greater than zero");
      return;
    }
    const amountPaise = toPaise(amountRupees);
    const allocationPaise = form.invoice_id ? Math.min(amountPaise, selectedBalancePaise) : 0;

    setSaving(true);
    const res = await fetch("/api/receipts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payer_party_id: form.payer_party_id,
        amount_paise: amountPaise,
        received_on: form.received_on,
        method: form.method,
        reference_no: form.reference_no || null,
        allocations: form.invoice_id ? [{ invoice_id: form.invoice_id, amount_paise: allocationPaise }] : [],
      }),
    });
    const body = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error(body.error ?? "Could not record this receipt");
      return;
    }
    toast.success("Receipt recorded");
    setForm(emptyForm);
    setShowForm(false);
    router.refresh();
  }

  return (
    <div className="space-y-5 p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Receipts</h1>
          <p className="mt-1 text-[13.5px] text-ink-2">
            Money received. Allocate it to an invoice, or leave it unapplied to match later.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className={buttonPrimaryClass}
        >
          {showForm ? "Cancel" : "Record receipt"}
        </button>
      </header>

      {showForm && (
        <form onSubmit={submit} className="grid gap-3 rounded-[10px] border border-line bg-white p-5 min-[640px]:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-ink">Payer</label>
            <select
              required
              value={form.payer_party_id}
              onChange={(e) => setForm({ ...form, payer_party_id: e.target.value, invoice_id: "" })}
              className={inputClass}
            >
              <option value="">Select a party</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-ink">Amount (₹)</label>
            <input type="number" step="any" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={`${inputClass} font-mono`} />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-ink">Date</label>
            <input type="date" required value={form.received_on} onChange={(e) => setForm({ ...form, received_on: e.target.value })} className={`${inputClass} font-mono`} />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-ink">Method</label>
            <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value as typeof form.method })} className={inputClass}>
              <option value="bank">Bank transfer</option>
              <option value="upi">UPI</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-ink">Reference no.</label>
            <input value={form.reference_no} onChange={(e) => setForm({ ...form, reference_no: e.target.value })} className={inputClass} placeholder="UTR / cheque no." />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-ink">Apply to invoice</label>
            <select value={form.invoice_id} onChange={(e) => setForm({ ...form, invoice_id: e.target.value })} className={inputClass} disabled={!form.payer_party_id}>
              <option value="">Leave unapplied</option>
              {payerOpenInvoices.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.invoice_no} — {formatINR(i.invoice_balances[0]?.balance_due_paise ?? 0)} due
                </option>
              ))}
            </select>
          </div>

          <div className="min-[640px]:col-span-2">
            <button type="submit" disabled={saving} className="rounded-md bg-brand px-5 py-2.5 text-[13.5px] font-medium text-white hover:bg-brand-hover disabled:bg-ink-3">
              {saving ? "Saving…" : "Save receipt"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-[10px] border border-line bg-white">
        <table className="w-full text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-line-soft text-[12px] uppercase tracking-wide text-ink-3">
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Payer</th>
              <th className="px-5 py-3 font-medium">Method</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Applied</th>
            </tr>
          </thead>
          <tbody>
            {initialReceipts.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-ink-3">No receipts yet.</td></tr>
            )}
            {initialReceipts.map((r) => {
              const applied = r.receipt_allocations.reduce((sum, a) => sum + a.amount_allocated_paise, 0);
              return (
                <tr
                  key={r.id}
                  onClick={() => router.push(`/receipts/${r.id}`)}
                  className="cursor-pointer border-b border-line-soft last:border-b-0 hover:bg-paper"
                >
                  <td className="px-5 py-3 font-mono text-ink-2">
                    <Link
                      href={`/receipts/${r.id}`}
                      transitionTypes={["nav-forward"]}
                      onClick={(e) => e.stopPropagation()}
                      className="text-brand hover:text-brand-hover hover:underline"
                    >
                      {formatDate(r.received_on)}
                    </Link>
                  </td>
                  <td className="px-5 py-3 font-medium text-ink">{r.parties?.name ?? "—"}</td>
                  <td className="px-5 py-3 capitalize text-ink-2">{r.method}</td>
                  <td className="px-5 py-3 font-mono text-ink">{formatINR(r.amount_paise)}</td>
                  <td className="px-5 py-3 font-mono text-ink-2">
                    {applied > 0 ? (
                      formatINR(applied)
                    ) : (
                      <span
                        className="text-marigold-ink"
                        title="Not yet matched to a specific invoice — common for an advance or overpayment"
                      >
                        Not applied yet
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
