"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { isValidGstin, stateCodeFromGstin } from "@/lib/india/validators";
import { GST_STATE_OPTIONS, stateName } from "@/lib/india/states";
import { EmailSignIn } from "@/features/onboarding/components/EmailSignIn";

/**
 * Four questions, one per screen, then done — deliberately shorter than
 * LogiFlow's six-step wizard, since there's no branch/fleet/driver step to
 * ask about. Ends by creating the organisation for real (POST
 * /api/organisations → create_organisation()), not a UI mock.
 */
const STEPS = [
  { id: "company", rail: "Company" },
  { id: "tax", rail: "Tax treatment" },
  { id: "numbering", rail: "Invoice numbering" },
] as const;

const TAX_TREATMENTS = [
  {
    value: "forward" as const,
    label: "Yes, I charge GST on my invoices",
    consequence: "Set the rate you charge (commonly 18% for most services). You can change this per invoice later.",
  },
  {
    value: "reverse_charge" as const,
    label: "No, the customer pays under reverse charge",
    consequence: "Your invoice prints the statutory reverse-charge note and no GST line.",
  },
];

export function OnboardingWizard({ signedInEmail }: { signedInEmail: string | null }) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [company, setCompany] = useState({ name: "", gstin: "", pan: "", stateCode: "", address: "" });
  const [tax, setTax] = useState<{ treatment: "forward" | "reverse_charge"; ratePct: string }>({
    treatment: "forward",
    ratePct: "18",
  });
  const [numbering, setNumbering] = useState({ invoicePrefix: "INV", creditNotePrefix: "CN" });

  const next = () => (step === STEPS.length - 1 ? finishSetup() : setStep(step + 1));
  const back = () => setStep(Math.max(0, step - 1));

  async function finishSetup() {
    setSubmitting(true);
    setSubmitError("");

    const res = await fetch("/api/organisations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        legal_name: company.name,
        gstin: isValidGstin(company.gstin) ? company.gstin : "",
        transin: isValidGstin(company.gstin) ? "" : company.gstin,
        pan: company.pan,
        state_code: company.stateCode,
        address: company.address,
        invoice_prefix: numbering.invoicePrefix,
        credit_note_prefix: numbering.creditNotePrefix,
        default_tax_treatment: tax.treatment,
        default_tax_rate_pct: Number(tax.ratePct) || 0,
      }),
    });
    const body = await res.json();

    if (!res.ok) {
      setSubmitting(false);
      setSubmitError(body.error ?? "Something went wrong. Please try again.");
      return;
    }
    setDone(true);
  }

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-7">
          <Link href="/" className="font-semibold text-ink">
            LedgerFlow
          </Link>
          <Link
            href="/"
            className="rounded-md px-3 py-2 text-[13px] text-ink-2 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Save and exit
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1120px] flex-col gap-10 px-7 py-10 min-[820px]:flex-row min-[820px]:gap-16 min-[820px]:py-14">
        {signedInEmail && <StepRail step={step} done={done} onJump={(i) => !done && i < step && setStep(i)} />}

        <main className="w-full min-[820px]:max-w-[560px]">
          {!signedInEmail ? (
            <EmailSignIn
              next="/start"
              heading="Let's get your company set up."
              reason="Enter your email — we'll send a link, and you're straight into three quick questions."
            />
          ) : done ? (
            <Summary company={company} treatment={tax.treatment} ratePct={tax.ratePct} prefix={numbering.invoicePrefix} />
          ) : (
            <>
              {step === 0 && (
                <Step
                  heading="Tell us about your company."
                  reason="This prints at the top of every invoice you issue."
                  primary="Continue"
                  canContinue={company.name.trim().length > 1 && company.stateCode !== "" && company.gstin.trim().length > 0}
                  onNext={next}
                >
                  <Text id="name" label="Company name" value={company.name} onChange={(v) => setCompany({ ...company, name: v })} placeholder="Sundaram Logistics Pvt Ltd" />
                  <GstinField
                    value={company.gstin}
                    onChange={(gstin) => {
                      const code = stateCodeFromGstin(gstin);
                      setCompany({ ...company, gstin, stateCode: code ?? company.stateCode });
                    }}
                  />
                  <div>
                    <FieldLabel htmlFor="state">State</FieldLabel>
                    <select
                      id="state"
                      value={company.stateCode}
                      onChange={(e) => setCompany({ ...company, stateCode: e.target.value })}
                      className={inputClass}
                    >
                      <option value="">Select a state</option>
                      {GST_STATE_OPTIONS.map((s) => (
                        <option key={s.code} value={s.code}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <Text id="address" label="Address" value={company.address} onChange={(v) => setCompany({ ...company, address: v })} placeholder="Optional, for the invoice header" />
                </Step>
              )}

              {step === 1 && (
                <Step heading="Do you charge GST on your invoices?" reason="Set it once — every invoice after this prints the right tax block, and it can be changed later per invoice." primary="Continue" onNext={next} onBack={back}>
                  <div className="space-y-2.5">
                    {TAX_TREATMENTS.map((m) => (
                      <label
                        key={m.value}
                        className={cn(
                          "flex cursor-pointer gap-3 rounded-md border p-4 transition-colors duration-150",
                          tax.treatment === m.value ? "border-brand bg-brand-tint" : "border-line bg-white hover:border-ink-3",
                        )}
                      >
                        <input type="radio" name="tax-treatment" checked={tax.treatment === m.value} onChange={() => setTax({ ...tax, treatment: m.value })} className="mt-1 size-4 shrink-0 accent-brand" />
                        <span>
                          <span className="block text-[14px] font-medium text-ink">{m.label}</span>
                          <span className="mt-1 block text-[13px] leading-[1.5] text-ink-2">{m.consequence}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  {tax.treatment === "forward" && (
                    <Text id="rate" label="GST rate (%)" value={tax.ratePct} onChange={(v) => setTax({ ...tax, ratePct: v.replace(/[^0-9.]/g, "") })} mono inputMode="decimal" />
                  )}
                </Step>
              )}

              {step === 2 && (
                <Step heading="How should your invoice numbers look?" reason="Keep the series you already use, so your customers' records stay in step." primary={submitting ? "Setting up…" : "Finish setup"} canContinue={!submitting} onNext={next} onBack={back}>
                  <div className="grid grid-cols-2 gap-4">
                    <Text id="inv-prefix" label="Invoice prefix" value={numbering.invoicePrefix} onChange={(v) => setNumbering({ ...numbering, invoicePrefix: v.toUpperCase().slice(0, 6) })} mono />
                    <Text id="cn-prefix" label="Credit note prefix" value={numbering.creditNotePrefix} onChange={(v) => setNumbering({ ...numbering, creditNotePrefix: v.toUpperCase().slice(0, 6) })} mono />
                  </div>
                  {submitError && <p className="rounded-md bg-alert-tint p-3 text-[13px] text-alert">{submitError}</p>}
                </Step>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function StepRail({ step, done, onJump }: { step: number; done: boolean; onJump: (i: number) => void }) {
  return (
    <nav aria-label="Setup steps" className="min-[820px]:w-[240px] min-[820px]:shrink-0">
      <ol className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 min-[820px]:sticky min-[820px]:top-10 min-[820px]:flex-col min-[820px]:gap-1 min-[820px]:overflow-visible min-[820px]:pb-0">
        {STEPS.map((s, i) => {
          const complete = done || i < step;
          const current = !done && i === step;
          return (
            <li key={s.id} className="shrink-0">
              <button type="button" onClick={() => onJump(i)} disabled={!complete || done} aria-current={current ? "step" : undefined}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13.5px] whitespace-nowrap",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                  current ? "font-medium text-ink" : complete ? "text-ink-2" : "text-ink-3",
                  complete && !done && "hover:bg-white",
                )}
              >
                <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-[12px]",
                  complete ? "border-brand bg-brand text-white" : current ? "border-brand text-brand" : "border-line text-ink-3")}>
                  {complete ? <Check className="size-3.5" strokeWidth={2.5} aria-hidden /> : i + 1}
                </span>
                {s.rail}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Step({ heading, reason, primary, children, onNext, onBack, canContinue = true }: {
  heading: string; reason: string; primary: string; children: React.ReactNode;
  onNext: () => void; onBack?: () => void; canContinue?: boolean;
}) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (canContinue) onNext(); }}>
      <h1 className="text-[28px] leading-[1.15] font-semibold tracking-[-0.01em] text-ink">{heading}</h1>
      <p className="mt-2.5 max-w-[52ch] text-[14px] leading-[1.55] text-ink-2">{reason}</p>
      <div className="mt-8 space-y-5">{children}</div>
      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-line-soft pt-6">
        <button type="submit" disabled={!canContinue} className="rounded-md bg-brand px-5 py-3 text-[14px] font-medium text-white transition-colors duration-150 hover:bg-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:bg-ink-3">
          {primary}
        </button>
        {onBack && (
          <button type="button" onClick={onBack} className="text-[13.5px] text-ink-2 underline underline-offset-4 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
            Back
          </button>
        )}
      </div>
    </form>
  );
}

function Summary({ company, treatment, ratePct, prefix }: { company: { name: string; stateCode: string }; treatment: string; ratePct: string; prefix: string }) {
  return (
    <div>
      <span className="flex size-10 items-center justify-center rounded-full bg-forest-tint text-forest-ink">
        <Check className="size-5" strokeWidth={2.5} aria-hidden />
      </span>
      <h1 className="mt-5 text-[28px] font-semibold tracking-[-0.01em] text-ink">You&apos;re set up.</h1>
      <p className="mt-2.5 max-w-[52ch] text-[14px] leading-[1.55] text-ink-2">Everything below can be changed later in Settings.</p>
      <dl className="mt-8 border-t border-line-soft">
        <SummaryRow term="Company" value={company.name || "—"} />
        <SummaryRow term="State" value={stateName(company.stateCode) ?? "Not set"} />
        <SummaryRow term="Tax treatment" value={treatment === "forward" ? `${ratePct}% charged` : "Reverse charge"} />
        <SummaryRow term="Next invoice number" value={`${prefix}-…-000001`} mono />
      </dl>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link href="/dashboard" className="rounded-md bg-brand px-5 py-3 text-[14px] font-medium text-white transition-colors duration-150 hover:bg-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}

function SummaryRow({ term, value, mono }: { term: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-line-soft py-3">
      <dt className="text-[13.5px] text-ink-2">{term}</dt>
      <dd className={cn("text-right text-[13.5px] font-medium text-ink", mono && "font-mono")}>{value}</dd>
    </div>
  );
}

const inputClass = "w-full rounded-md border border-line bg-white px-3 py-2.5 text-[14px] text-ink placeholder:text-ink-3 focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-brand";

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-ink">{children}</label>;
}

function Text({ id, label, value, onChange, mono, ...props }: {
  id: string; label: string; value: string; onChange: (v: string) => void; mono?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputClass, mono && "font-mono")} {...props} />
    </div>
  );
}

function GstinField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const trimmed = value.trim();
  const state = stateName(stateCodeFromGstin(trimmed));
  let hint = "15 characters. If you are not GST registered, enter your TRANSIN instead.";
  let tone = "text-ink-3";
  if (trimmed.length === 15) {
    if (isValidGstin(trimmed) && state) { hint = `Looks right. State set to ${state}.`; tone = "text-forest-ink"; }
    else { hint = "Check this one — the last character does not match the rest of the number."; tone = "text-alert"; }
  }
  return (
    <div>
      <FieldLabel htmlFor="gstin">GSTIN or transporter ID</FieldLabel>
      <input id="gstin" value={value} onChange={(e) => onChange(e.target.value.toUpperCase().replace(/\s/g, "").slice(0, 15))} placeholder="29AAACA1234F1Z6" spellCheck={false} className={cn(inputClass, "font-mono uppercase")} />
      <p className={cn("mt-1.5 text-[12.5px]", tone)}>{hint}</p>
    </div>
  );
}
