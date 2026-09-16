"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpDown, Search } from "lucide-react";
import { formatINR } from "@/lib/money";
import { cardClass } from "@/lib/ui/styles";

type Row = {
  party_id: string;
  invoices_outstanding: number;
  amount_outstanding_paise: number;
  invoices_overdue: number;
  amount_overdue_paise: number;
  parties: { name: string } | null;
};

type SortKey = "name" | "amount" | "overdue";

export function OutstandingPanel({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("amount");
  const [sortDesc, setSortDesc] = useState(true);

  const withBalance = useMemo(() => rows.filter((r) => r.invoices_outstanding > 0), [rows]);
  const totalOutstandingPaise = withBalance.reduce((sum, r) => sum + r.amount_outstanding_paise, 0);
  const totalOverduePaise = withBalance.reduce((sum, r) => sum + r.amount_overdue_paise, 0);
  const overdueCount = withBalance.filter((r) => r.invoices_overdue > 0).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q ? withBalance.filter((r) => (r.parties?.name ?? "").toLowerCase().includes(q)) : withBalance;
    const sorted = [...matched].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = (a.parties?.name ?? "").localeCompare(b.parties?.name ?? "");
      if (sortKey === "amount") cmp = a.amount_outstanding_paise - b.amount_outstanding_paise;
      if (sortKey === "overdue") cmp = a.amount_overdue_paise - b.amount_overdue_paise;
      return sortDesc ? -cmp : cmp;
    });
    return sorted;
  }, [withBalance, query, sortKey, sortDesc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDesc((d) => !d);
    else {
      setSortKey(key);
      setSortDesc(true);
    }
  }

  return (
    <div className="space-y-6 p-8">
      <header>
        <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Outstanding</h1>
        <p className="mt-1 text-[13.5px] text-ink-2">
          Every party with an unpaid balance, as of today — always computed live from invoices, receipts and credit
          notes.
        </p>
      </header>

      <div className="grid gap-4 min-[640px]:grid-cols-3">
        <div className={cardClass}>
          <p className="text-[12.5px] text-ink-2">Total outstanding</p>
          <p className="mt-1.5 font-mono text-[24px] font-semibold text-ink">{formatINR(totalOutstandingPaise)}</p>
        </div>
        <div className={cardClass}>
          <p className="text-[12.5px] text-ink-2">Overdue</p>
          <p className="mt-1.5 font-mono text-[24px] font-semibold text-alert">{formatINR(totalOverduePaise)}</p>
        </div>
        <div className={cardClass}>
          <p className="text-[12.5px] text-ink-2">Parties with a balance</p>
          <p className="mt-1.5 font-mono text-[24px] font-semibold text-ink">{withBalance.length}</p>
          {overdueCount > 0 && (
            <p className="mt-1 text-[12px] text-alert">{overdueCount} {overdueCount === 1 ? "is" : "are"} overdue</p>
          )}
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search parties…"
          className="w-full rounded-md border border-line bg-white py-2 pl-9 pr-3 text-[13.5px] text-ink placeholder:text-ink-3 focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-brand"
        />
      </div>

      <div className="overflow-x-auto rounded-[10px] border border-line bg-white">
        <table className="w-full text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-line-soft text-[12px] uppercase tracking-wide text-ink-3">
              <Th label="Party" active={sortKey === "name"} desc={sortDesc} onClick={() => toggleSort("name")} />
              <th className="px-5 py-3 font-medium">Invoices</th>
              <Th label="Amount" active={sortKey === "amount"} desc={sortDesc} onClick={() => toggleSort("amount")} align="left" />
              <th className="px-5 py-3 font-medium">Overdue count</th>
              <Th label="Overdue amount" active={sortKey === "overdue"} desc={sortDesc} onClick={() => toggleSort("overdue")} align="left" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-ink-3">
                  {withBalance.length === 0
                    ? "Nothing outstanding right now — every issued invoice is fully paid."
                    : "No parties match that search."}
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr
                key={r.party_id}
                onClick={() => router.push(`/dashboard/outstanding/${r.party_id}`)}
                className="cursor-pointer border-b border-line-soft last:border-b-0 hover:bg-paper"
              >
                <td className="px-5 py-3 font-medium text-ink">
                  <Link
                    href={`/dashboard/outstanding/${r.party_id}`}
                    transitionTypes={["nav-forward"]}
                    onClick={(e) => e.stopPropagation()}
                    className="text-brand hover:text-brand-hover hover:underline"
                  >
                    {r.parties?.name ?? "—"}
                  </Link>
                </td>
                <td className="px-5 py-3 font-mono text-ink-2">{r.invoices_outstanding}</td>
                <td className="px-5 py-3 font-mono text-ink">{formatINR(r.amount_outstanding_paise)}</td>
                <td className="px-5 py-3 font-mono text-ink-2">
                  {r.invoices_overdue > 0 ? (
                    <span className="rounded-full bg-alert-tint px-2 py-0.5 text-[12px] font-medium text-alert">
                      {r.invoices_overdue}
                    </span>
                  ) : (
                    "0"
                  )}
                </td>
                <td className="px-5 py-3 font-mono text-ink-2">
                  {r.amount_overdue_paise > 0 ? (
                    <span className="text-alert">{formatINR(r.amount_overdue_paise)}</span>
                  ) : (
                    formatINR(0)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  label,
  active,
  desc,
  onClick,
}: {
  label: string;
  active: boolean;
  desc: boolean;
  onClick: () => void;
  align?: "left";
}) {
  return (
    <th className="px-5 py-3 font-medium">
      <button
        type="button"
        onClick={onClick}
        className={`flex items-center gap-1 uppercase tracking-wide transition-colors ${active ? "text-ink" : "text-ink-3 hover:text-ink-2"}`}
      >
        {label}
        <ArrowUpDown className={`size-3 ${active ? (desc ? "" : "rotate-180") : "opacity-40"}`} />
      </button>
    </th>
  );
}
