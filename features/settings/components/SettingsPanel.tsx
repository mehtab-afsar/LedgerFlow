"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GST_STATE_OPTIONS, stateName } from "@/lib/india/states";
import { isValidGstin, isValidPan, stateCodeFromGstin } from "@/lib/india/validators";
import { inputClass, buttonPrimaryClass, cardClass } from "@/lib/ui/styles";

type Org = {
  id: string;
  legal_name: string;
  gstin: string | null;
  transin: string | null;
  pan: string | null;
  state_code: string;
  address: string | null;
  invoice_prefix: string;
  credit_note_prefix: string;
  default_tax_treatment: "reverse_charge" | "forward";
  default_tax_rate_pct: number;
} | null;

export function SettingsPanel({ org, isOwner }: { org: Org; isOwner: boolean }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    legal_name: org?.legal_name ?? "",
    gstin: org?.gstin ?? "",
    transin: org?.transin ?? "",
    pan: org?.pan ?? "",
    state_code: org?.state_code ?? "",
    address: org?.address ?? "",
    invoice_prefix: org?.invoice_prefix ?? "INV",
    credit_note_prefix: org?.credit_note_prefix ?? "CN",
    default_tax_treatment: org?.default_tax_treatment ?? "forward",
    default_tax_rate_pct: String(org?.default_tax_rate_pct ?? 18),
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.gstin && !form.transin) {
      toast.error("Enter a GSTIN, or a TRANSIN if you're not GST registered");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/organisations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        legal_name: form.legal_name,
        gstin: form.gstin || null,
        transin: form.transin || null,
        pan: form.pan || null,
        state_code: form.state_code,
        address: form.address || null,
        invoice_prefix: form.invoice_prefix,
        credit_note_prefix: form.credit_note_prefix,
        default_tax_treatment: form.default_tax_treatment,
        default_tax_rate_pct: Number(form.default_tax_rate_pct) || 0,
      }),
    });
    const body = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error(body.error ?? "Could not save these settings");
      return;
    }
    toast.success("Settings saved");
    router.refresh();
  }

  if (!org) {
    return (
      <div className="p-8">
        <p className="text-[13.5px] text-ink-3">No organisation found for this account.</p>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="space-y-5 p-8">
        <header>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Settings</h1>
          <p className="mt-1 text-[13.5px] text-ink-2">Only the account owner can change these — you can view them.</p>
        </header>
        <div className={`${cardClass} grid gap-4 min-[640px]:grid-cols-2`}>
          <ReadOnlyField label="Company name" value={org.legal_name} />
          <ReadOnlyField label="GSTIN / TRANSIN" value={org.gstin || org.transin || "—"} />
          <ReadOnlyField label="PAN" value={org.pan || "—"} />
          <ReadOnlyField label="State" value={stateName(org.state_code) ?? "—"} />
          <ReadOnlyField label="Invoice prefix" value={org.invoice_prefix} />
          <ReadOnlyField label="Credit note prefix" value={org.credit_note_prefix} />
          <ReadOnlyField label="Default tax treatment" value={org.default_tax_treatment === "forward" ? "Charge GST" : "Reverse charge"} />
          <ReadOnlyField label="Default GST rate" value={`${org.default_tax_rate_pct}%`} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-8">
      <header>
        <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Settings</h1>
        <p className="mt-1 text-[13.5px] text-ink-2">
          Your company&apos;s letterhead details and invoicing defaults — used on every invoice, receipt and PDF.
        </p>
      </header>

      <form onSubmit={submit} className="space-y-6">
        <section className={cardClass}>
          <h2 className="text-[13px] font-medium text-ink-2">Company</h2>
          <div className="mt-3 grid gap-3 min-[640px]:grid-cols-2">
            <div className="min-[640px]:col-span-2">
              <label className="mb-1.5 block text-[13px] font-medium text-ink">Legal name</label>
              <input
                required
                value={form.legal_name}
                onChange={(e) => setForm({ ...form, legal_name: e.target.value })}
                className={inputClass}
              />
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
                placeholder="If GST registered"
              />
              {form.gstin.length === 15 && !isValidGstin(form.gstin) && (
                <p className="mt-1 text-[12px] text-alert">Check this GSTIN — the checksum doesn&apos;t match.</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-ink">TRANSIN</label>
              <input
                value={form.transin}
                onChange={(e) => setForm({ ...form, transin: e.target.value.toUpperCase() })}
                className={`${inputClass} font-mono uppercase`}
                placeholder="If not GST registered"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-ink">PAN</label>
              <input
                value={form.pan}
                onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })}
                className={`${inputClass} font-mono uppercase`}
                placeholder="Optional"
              />
              {form.pan.length === 10 && !isValidPan(form.pan) && (
                <p className="mt-1 text-[12px] text-alert">Doesn&apos;t look like a valid PAN.</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-ink">State</label>
              <select
                required
                value={form.state_code}
                onChange={(e) => setForm({ ...form, state_code: e.target.value })}
                className={inputClass}
              >
                <option value="">Select a state</option>
                {GST_STATE_OPTIONS.map((s) => (
                  <option key={s.code} value={s.code}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="min-[640px]:col-span-2">
              <label className="mb-1.5 block text-[13px] font-medium text-ink">Address</label>
              <textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className={`${inputClass} min-h-20`}
                placeholder="Printed on invoices"
              />
            </div>
          </div>
        </section>

        <section className={cardClass}>
          <h2 className="text-[13px] font-medium text-ink-2">Document numbering</h2>
          <div className="mt-3 grid gap-3 min-[640px]:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-ink">Invoice prefix</label>
              <input
                required
                value={form.invoice_prefix}
                onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value.toUpperCase() })}
                className={`${inputClass} font-mono uppercase`}
                placeholder="INV"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-ink">Credit note prefix</label>
              <input
                required
                value={form.credit_note_prefix}
                onChange={(e) => setForm({ ...form, credit_note_prefix: e.target.value.toUpperCase() })}
                className={`${inputClass} font-mono uppercase`}
                placeholder="CN"
              />
            </div>
          </div>
        </section>

        <section className={cardClass}>
          <h2 className="text-[13px] font-medium text-ink-2">GST defaults</h2>
          <p className="mt-1 text-[12.5px] text-ink-3">Pre-fills every new invoice — you can still override per invoice.</p>
          <div className="mt-3 grid gap-3 min-[640px]:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-ink">Tax treatment</label>
              <select
                value={form.default_tax_treatment}
                onChange={(e) => setForm({ ...form, default_tax_treatment: e.target.value as "forward" | "reverse_charge" })}
                className={inputClass}
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
                value={form.default_tax_rate_pct}
                onChange={(e) => setForm({ ...form, default_tax_rate_pct: e.target.value })}
                className={`${inputClass} font-mono`}
                disabled={form.default_tax_treatment === "reverse_charge"}
              />
            </div>
          </div>
        </section>

        <button type="submit" disabled={saving} className={buttonPrimaryClass}>
          {saving ? "Saving…" : "Save settings"}
        </button>
      </form>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[12.5px] text-ink-2">{label}</p>
      <p className="mt-0.5 text-[13.5px] font-medium text-ink">{value}</p>
    </div>
  );
}
