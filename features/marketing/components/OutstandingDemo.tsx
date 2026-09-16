import { Reveal } from "@/features/marketing/components/Reveal";
import { formatINR } from "@/lib/money";

/**
 * A static rendering of the exact scenario the product was scoped against:
 * 10 invoices, 5 paid, 1 partially — and the dashboard says "5 outstanding"
 * without anyone having to reconcile a spreadsheet to be sure of it. This is
 * the one thing worth showing rather than describing.
 */
const INVOICES = [
  { no: "INV-2526-000001", amount: 1180000, status: "paid" as const },
  { no: "INV-2526-000002", amount: 1180000, status: "paid" as const },
  { no: "INV-2526-000003", amount: 1180000, status: "paid" as const },
  { no: "INV-2526-000004", amount: 1180000, status: "paid" as const },
  { no: "INV-2526-000005", amount: 1180000, status: "paid" as const },
  { no: "INV-2526-000006", amount: 1180000, status: "partial" as const, balance: 680000 },
  { no: "INV-2526-000007", amount: 1180000, status: "outstanding" as const },
  { no: "INV-2526-000008", amount: 1180000, status: "outstanding" as const },
  { no: "INV-2526-000009", amount: 1180000, status: "outstanding" as const },
  { no: "INV-2526-000010", amount: 1180000, status: "outstanding" as const },
];

const STATUS_STYLE: Record<string, string> = {
  paid: "bg-forest-tint text-forest-ink",
  partial: "bg-marigold-tint text-marigold-ink",
  outstanding: "bg-alert-tint text-alert",
};

const STATUS_LABEL: Record<string, string> = {
  paid: "Paid",
  partial: "Partially paid",
  outstanding: "Outstanding",
};

export function OutstandingDemo() {
  const outstandingCount = INVOICES.filter((i) => i.status !== "paid").length;
  const outstandingPaise = INVOICES.reduce((sum, i) => {
    if (i.status === "paid") return sum;
    if (i.status === "partial") return sum + i.balance;
    return sum + i.amount;
  }, 0);

  return (
    <section id="outstanding" className="border-t border-line bg-white">
      <div className="mx-auto grid max-w-[1120px] gap-12 px-7 py-[104px] min-[900px]:grid-cols-[minmax(0,1fr)_460px] min-[900px]:items-center min-[900px]:gap-16">
        <div>
          <Reveal>
            <h2 className="max-w-[22ch] text-[clamp(30px,3.6vw,44px)] leading-[1.08] font-medium tracking-[-0.03em] text-ink">
              Ten invoices, five paid — it says five outstanding. Always.
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="mt-4 max-w-[48ch] text-[18px] leading-[1.5] text-ink-2">
              Not a counter someone forgot to update. Every balance is recomputed from invoices,
              payments and credit notes on every read — recording a payment can never leave the
              dashboard wrong, even for a second.
            </p>
          </Reveal>
        </div>

        <Reveal delay={150}>
          <div className="rounded-[10px] border border-line bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-line-soft px-5 py-4">
              <span className="text-[13.5px] font-medium text-ink">Sundaram Freight Pvt Ltd</span>
              <span className="rounded-full bg-alert-tint px-2.5 py-1 font-mono text-[12.5px] font-medium text-alert">
                {outstandingCount} outstanding
              </span>
            </div>
            <ul className="max-h-[300px] overflow-y-auto">
              {INVOICES.map((inv) => (
                <li
                  key={inv.no}
                  className="flex items-center justify-between gap-3 border-b border-line-soft px-5 py-2.5 last:border-b-0"
                >
                  <span className="font-mono text-[12.5px] text-ink-2">{inv.no}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11.5px] font-medium ${STATUS_STYLE[inv.status]}`}
                  >
                    {STATUS_LABEL[inv.status]}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-[13px] text-ink-2">Total outstanding</span>
              <span className="font-mono text-[15px] font-semibold text-ink">
                {formatINR(outstandingPaise)}
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
