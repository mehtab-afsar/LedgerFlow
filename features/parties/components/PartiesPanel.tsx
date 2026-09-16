"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GST_STATE_OPTIONS, stateName } from "@/lib/india/states";
import { isValidGstin, stateCodeFromGstin } from "@/lib/india/validators";
import { inputClass, buttonPrimaryClass } from "@/lib/ui/styles";

type Party = {
  id: string;
  name: string;
  gstin: string | null;
  state_code: string | null;
  payment_terms_days: number;
  created_at: string;
};

const emptyForm = { name: "", gstin: "", state_code: "", payment_terms_days: "30" };

/**
 * Data arrives as a prop from the server component — no fetch-on-mount
 * effect. After a mutation, router.refresh() re-runs the server component
 * and this component re-renders with fresh props; nothing here mirrors the
 * list into local state, so there's no prop→state sync effect either.
 */
export function PartiesPanel({ initialParties }: { initialParties: Party[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  function toggleAdd() {
    if (showForm && !editingId) {
      closeForm();
    } else {
      setEditingId(null);
      setForm(emptyForm);
      setShowForm(true);
    }
  }

  function openEdit(p: Party) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      gstin: p.gstin ?? "",
      state_code: p.state_code ?? "",
      payment_terms_days: String(p.payment_terms_days),
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      gstin: form.gstin || null,
      state_code: form.state_code || null,
      payment_terms_days: Number(form.payment_terms_days) || 30,
    };
    const res = await fetch(editingId ? `/api/parties/${editingId}` : "/api/parties", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error(body.error ?? "Could not save this party");
      return;
    }
    toast.success(editingId ? `${form.name} updated` : `${form.name} added`);
    closeForm();
    router.refresh();
  }

  return (
    <div className="space-y-5 p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Parties</h1>
          <p className="mt-1 text-[13.5px] text-ink-2">
            Customers, brokers and consignees — anyone you might bill or deliver to.
          </p>
        </div>
        <button
          type="button"
          onClick={toggleAdd}
          className={buttonPrimaryClass}
        >
          {showForm && !editingId ? "Cancel" : "Add party"}
        </button>
      </header>

      {showForm && (
        <form onSubmit={submit} className="grid gap-3 rounded-[10px] border border-line bg-white p-5 min-[640px]:grid-cols-2">
          <div className="min-[640px]:col-span-2 flex items-center justify-between">
            <h2 className="text-[15px] font-medium text-ink">{editingId ? `Edit ${form.name}` : "New party"}</h2>
            {editingId && (
              <button type="button" onClick={closeForm} className="text-[13px] font-medium text-ink-2 hover:text-ink">
                Cancel
              </button>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-ink">Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="Acme Traders" />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-ink">GSTIN</label>
            <input
              value={form.gstin}
              onChange={(e) => {
                const gstin = e.target.value.toUpperCase().replace(/\s/g, "").slice(0, 15);
                const code = stateCodeFromGstin(gstin);
                setForm({ ...form, gstin, state_code: code ?? form.state_code });
              }}
              className={`${inputClass} font-mono uppercase`}
              placeholder="Optional"
            />
            {form.gstin.length === 15 && !isValidGstin(form.gstin) && (
              <p className="mt-1 text-[12px] text-alert">Check this GSTIN — the checksum doesn&apos;t match.</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-ink">State</label>
            <select value={form.state_code} onChange={(e) => setForm({ ...form, state_code: e.target.value })} className={inputClass}>
              <option value="">Select a state</option>
              {GST_STATE_OPTIONS.map((s) => (
                <option key={s.code} value={s.code}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-ink">Payment terms (days)</label>
            <input
              type="number"
              min={0}
              value={form.payment_terms_days}
              onChange={(e) => setForm({ ...form, payment_terms_days: e.target.value })}
              className={`${inputClass} font-mono`}
            />
          </div>
          <div className="min-[640px]:col-span-2">
            <button type="submit" disabled={saving} className="rounded-md bg-brand px-5 py-2.5 text-[13.5px] font-medium text-white hover:bg-brand-hover disabled:bg-ink-3">
              {saving ? "Saving…" : editingId ? "Save changes" : "Save party"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-[10px] border border-line bg-white">
        <table className="w-full text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-line-soft text-[12px] uppercase tracking-wide text-ink-3">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">GSTIN</th>
              <th className="px-5 py-3 font-medium">State</th>
              <th className="px-5 py-3 font-medium">Payment terms</th>
              <th className="px-5 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {initialParties.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-ink-3">No parties yet.</td></tr>
            )}
            {initialParties.map((p) => (
              <tr key={p.id} className="border-b border-line-soft last:border-b-0 hover:bg-paper">
                <td className="px-5 py-3 font-medium text-ink">{p.name}</td>
                <td className="px-5 py-3 font-mono text-ink-2">{p.gstin ?? "—"}</td>
                <td className="px-5 py-3 text-ink-2">{stateName(p.state_code) ?? "—"}</td>
                <td className="px-5 py-3 font-mono text-ink-2">{p.payment_terms_days} days</td>
                <td className="px-5 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => openEdit(p)}
                    className="text-[12.5px] font-medium text-brand hover:text-brand-hover hover:underline"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
