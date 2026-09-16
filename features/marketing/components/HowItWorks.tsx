import { Reveal } from "@/features/marketing/components/Reveal";

/**
 * Same three-hairline-columns layout as LogiFlow's HowItWorks, adapted to the
 * three things a receivables ledger actually has to get right: who gets
 * billed, what's still owed, and whether the numbers survive an audit.
 */
const PILLARS = [
  {
    title: "Bill whoever's responsible",
    lead: "The party that received the goods and the party that pays are often not the same one.",
    points: [
      "Bill-to and deliver-to are set independently on every invoice, not tied to a role.",
      "Override the default billing party with a reason — it's written to an audit log, not silently changed.",
      "Multiple contacts and addresses per customer, with duplicate detection before you create a new one.",
      "GSTIN-checksum validated, state auto-filled — no wrong-state tax on a typo.",
    ],
  },
  {
    title: "Always know what's outstanding",
    lead: "Never a stored counter that can drift — every balance is computed live from source transactions.",
    points: [
      "10 invoices, 5 paid: the dashboard shows exactly 5 outstanding, recomputed on every read.",
      "One bank transfer can settle several invoices at once, or partially settle one.",
      "Ageing by 0–30, 31–60, 61–90 and 90+ days, per party and in aggregate.",
      "Overpayments sit as unapplied credit — never silently discarded.",
    ],
  },
  {
    title: "An audit trail, not just a PDF",
    lead: "An issued invoice is never silently edited — corrections leave a paper trail.",
    points: [
      "Issued invoices freeze a snapshot; corrections go through a credit note, never an edit.",
      "Every send attempt is logged — email, and the status the channel reports back.",
      "Every bill-to override and financial action is written to an append-only audit log.",
      "Export sales and receipts to Tally in a form that actually reconciles.",
    ],
  },
] as const;

export function HowItWorks() {
  return (
    <section id="how" className="border-t border-line bg-paper">
      <div className="mx-auto max-w-[1120px] px-7 py-[104px]">
        <Reveal>
          <h2 className="max-w-[24ch] text-[clamp(30px,3.6vw,44px)] leading-[1.08] font-medium tracking-[-0.03em] text-ink">
            Invoicing and receivables, done properly.
          </h2>
        </Reveal>
        <Reveal delay={100}>
          <p className="mt-4 max-w-[52ch] text-[18px] leading-[1.5] text-ink-2">
            Not an ERP, not a dispatch system. Just the ledger — who owes what, who was billed,
            and proof of both.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-10 min-[860px]:grid-cols-3 min-[860px]:gap-0">
          {PILLARS.map((p, i) => (
            <div
              key={p.title}
              className={
                i === 0
                  ? "border-t border-ink pt-5 min-[860px]:pr-8"
                  : "border-t border-ink pt-5 min-[860px]:border-l min-[860px]:border-l-line min-[860px]:px-8 last:min-[860px]:pr-0"
              }
            >
              <Reveal delay={i * 100}>
                <h3 className="text-[21px] font-medium tracking-[-0.015em] text-ink">{p.title}</h3>
                <p className="mt-2 text-[16px] leading-[1.55] text-ink-2">{p.lead}</p>
                <ul className="mt-5 grid gap-3">
                  {p.points.map((point) => (
                    <li key={point} className="flex gap-2.5 text-[15px] leading-[1.55] text-ink-2">
                      <span className="mt-[11px] h-px w-2 shrink-0 bg-brand" aria-hidden />
                      {point}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
