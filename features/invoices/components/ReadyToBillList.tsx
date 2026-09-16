import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatINR } from "@/lib/money";

type ReadyToBillRow = {
  party_id: string;
  pending_count: number;
  pending_amount_paise: number;
  parties: { name: string } | null;
};

/** Surfaces "who should I bill next" up front, so creating an invoice starts
 *  from a party with pending work rather than a blank party dropdown. */
export function ReadyToBillList({ rows }: { rows: ReadyToBillRow[] }) {
  if (rows.length === 0) return null;

  return (
    <section>
      <h2 className="text-[15px] font-medium text-ink">Ready to bill</h2>
      <p className="mt-1 text-[13px] text-ink-2">
        Completed services waiting to be invoiced, grouped by party.
      </p>
      <div className="mt-3 grid gap-3 min-[640px]:grid-cols-2 min-[960px]:grid-cols-3">
        {rows.map((r) => (
          <Link
            key={r.party_id}
            href={`/invoices/new/${r.party_id}`}
            transitionTypes={["nav-forward"]}
            className="group flex items-center justify-between gap-3 rounded-[10px] border border-line bg-white p-4 transition-colors duration-150 hover:border-brand hover:bg-brand-tint"
          >
            <div className="min-w-0">
              <p className="truncate text-[14px] font-medium text-ink">{r.parties?.name ?? "—"}</p>
              <p className="mt-0.5 text-[12.5px] text-ink-2">
                {r.pending_count} {r.pending_count === 1 ? "service" : "services"} ·{" "}
                <span className="font-mono">{formatINR(r.pending_amount_paise)}</span>
              </p>
            </div>
            <ArrowRight className="size-4 shrink-0 text-ink-3 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-brand" />
          </Link>
        ))}
      </div>
    </section>
  );
}
