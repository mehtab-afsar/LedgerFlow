"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { toPaise, formatINR, addPaise } from "@/lib/money";
import { formatDate } from "@/lib/india/format";
import { inputClass, buttonPrimaryClass } from "@/lib/ui/styles";

type Party = { id: string; name: string };
type Expense = {
  id: string;
  category: string;
  description: string | null;
  amount_paise: number;
  incurred_on: string;
  party_id: string | null;
  parties: { name: string } | null;
};

const CATEGORY_SUGGESTIONS = ["Fuel", "Driver wages", "Vendor / subcontractor", "Tolls", "Maintenance", "Rent", "Salaries", "Subscriptions"];

const emptyForm = {
  category: "",
  description: "",
  amount: "",
  incurred_on: new Date().toISOString().slice(0, 10),
  party_id: "",
};

/**
 * Overhead not tied to a specific job — direct job costs are entered on the
 * service completion itself (cost_paise). Both feed the dashboard's Cost
 * and Profit figures; see service_completion_margin (migration 11).
 */
export function ExpensesPanel({ initialExpenses, parties }: { initialExpenses: Expense[]; parties: Party[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const totalPaise = initialExpenses.length > 0 ? addPaise(...initialExpenses.map((e) => e.amount_paise)) : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amountRupees = Number(form.amount);
    if (!form.category.trim() || !amountRupees || amountRupees <= 0) {
      toast.error("Enter a category and an amount greater than zero");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: form.category,
        description: form.description || null,
        amount_paise: toPaise(amountRupees),
        incurred_on: form.incurred_on,
        party_id: form.party_id || null,
      }),
    });
    const body = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error(body.error ?? "Could not save this expense");
      return;
    }
    toast.success("Expense recorded");
    setForm(emptyForm);
    setShowForm(false);
    router.refresh();
  }

  return (
    <div className="space-y-5 p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Expenses</h1>
          <p className="mt-1 text-[13.5px] text-ink-2">
            Overhead not tied to a specific job — rent, salaries, subscriptions. Feeds the Cost and Profit figures on
            the dashboard, alongside per-job cost entered on Services.
          </p>
        </div>
        <button type="button" onClick={() => setShowForm((s) => !s)} className={buttonPrimaryClass}>
          {showForm ? "Cancel" : "Log an expense"}
        </button>
      </header>

      {showForm && (
        <form onSubmit={submit} className="grid gap-3 rounded-[10px] border border-line bg-white p-5 min-[640px]:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-ink">Category</label>
            <input
              required
              list="expense-categories"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className={inputClass}
              placeholder="Fuel, rent, salaries…"
            />
            <datalist id="expense-categories">
              {CATEGORY_SUGGESTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-ink">Date</label>
            <input
              type="date"
              required
              value={form.incurred_on}
              onChange={(e) => setForm({ ...form, incurred_on: e.target.value })}
              className={`${inputClass} font-mono`}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-ink">Amount (₹)</label>
            <input
              type="number"
              step="any"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className={`${inputClass} font-mono`}
            />
          </div>
          <div className="min-[640px]:col-span-2">
            <label className="mb-1.5 block text-[13px] font-medium text-ink">Description</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={inputClass}
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-ink">Related party (optional)</label>
            <select value={form.party_id} onChange={(e) => setForm({ ...form, party_id: e.target.value })} className={inputClass}>
              <option value="">None</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="min-[640px]:col-span-3">
            <button type="submit" disabled={saving} className="rounded-md bg-brand px-5 py-2.5 text-[13.5px] font-medium text-white hover:bg-brand-hover disabled:bg-ink-3">
              {saving ? "Saving…" : "Save expense"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-[10px] border border-line bg-white">
        <table className="w-full text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-line-soft text-[12px] uppercase tracking-wide text-ink-3">
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Category</th>
              <th className="px-5 py-3 font-medium">Description</th>
              <th className="px-5 py-3 font-medium">Party</th>
              <th className="px-5 py-3 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {initialExpenses.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-ink-3">Nothing logged yet.</td></tr>
            )}
            {initialExpenses.map((ex) => (
              <tr key={ex.id} className="border-b border-line-soft last:border-b-0">
                <td className="px-5 py-3 font-mono text-ink-2">{formatDate(ex.incurred_on)}</td>
                <td className="px-5 py-3 font-medium text-ink">{ex.category}</td>
                <td className="px-5 py-3 text-ink-2">{ex.description ?? "—"}</td>
                <td className="px-5 py-3 text-ink-2">{ex.parties?.name ?? "—"}</td>
                <td className="px-5 py-3 font-mono text-ink">{formatINR(ex.amount_paise)}</td>
              </tr>
            ))}
          </tbody>
          {initialExpenses.length > 0 && (
            <tfoot>
              <tr className="border-t border-line-soft">
                <td colSpan={4} className="px-5 py-3 text-right text-[13px] font-medium text-ink-2">Total</td>
                <td className="px-5 py-3 font-mono font-semibold text-ink">{formatINR(totalPaise)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
