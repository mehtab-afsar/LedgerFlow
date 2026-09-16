import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { formatINR, addPaise, subtractPaise } from "@/lib/money";
import { formatDate } from "@/lib/india/format";
import { buttonPrimaryClass, buttonSecondaryClass } from "@/lib/ui/styles";

type Receipt = {
  id: string;
  amount_paise: number;
  received_on: string;
  method: "cash" | "bank" | "upi" | "cheque";
  reference_no: string | null;
  notes: string | null;
  payer_party_id: string;
  parties: { name: string; gstin: string | null; state_code: string | null } | null;
};

type Allocation = {
  id: string;
  amount_allocated_paise: number;
  invoices: { id: string; invoice_no: string; invoice_date: string; total_paise: number; status: string } | null;
};

export function ReceiptDetail({ receipt, allocations }: { receipt: Receipt; allocations: Allocation[] }) {
  const allocatedPaise = allocations.length > 0 ? addPaise(...allocations.map((a) => a.amount_allocated_paise)) : 0;
  const unappliedPaise = subtractPaise(receipt.amount_paise, allocatedPaise);

  return (
    <div className="space-y-6 p-8">
      <div>
        <Link
          href="/receipts"
          transitionTypes={["nav-back"]}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 hover:text-ink"
        >
          <ArrowLeft className="size-3.5" />
          Receipts
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-mono text-[22px] font-semibold tracking-[-0.01em] text-ink">
            {formatINR(receipt.amount_paise)}
          </h1>
          <p className="mt-1 text-[13.5px] text-ink-2">
            Received {formatDate(receipt.received_on)} · <span className="capitalize">{receipt.method}</span>
            {receipt.reference_no && <> · Ref {receipt.reference_no}</>}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/receipts/${receipt.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className={buttonSecondaryClass}
          >
            Print
          </a>
          <a
            href={`/api/receipts/${receipt.id}/pdf?download=1`}
            className={buttonPrimaryClass}
          >
            Download PDF
          </a>
        </div>
      </header>

      <div className="grid gap-4 min-[640px]:grid-cols-2">
        <section className="rounded-[10px] border border-line bg-white p-5">
          <h2 className="text-[13px] font-medium text-ink-2">Received from</h2>
          <p className="mt-1.5 text-[14.5px] font-medium text-ink">{receipt.parties?.name ?? "—"}</p>
          {receipt.parties?.gstin && <p className="mt-0.5 font-mono text-[12.5px] text-ink-3">GSTIN {receipt.parties.gstin}</p>}
        </section>

        <section className="rounded-[10px] border border-line bg-white p-5">
          <h2 className="text-[13px] font-medium text-ink-2">Applied</h2>
          <dl className="mt-3 space-y-1.5 text-[13.5px]">
            <div className="flex items-center justify-between">
              <dt className="text-ink-2">Applied to invoices</dt>
              <dd className="font-mono text-ink">{formatINR(allocatedPaise)}</dd>
            </div>
            <div className="flex items-center justify-between border-t border-line-soft pt-1.5">
              <dt className="text-ink-2">Not yet matched to an invoice</dt>
              <dd className={`font-mono font-semibold ${unappliedPaise > 0 ? "text-marigold-ink" : "text-ink"}`}>
                {formatINR(unappliedPaise)}
              </dd>
            </div>
          </dl>
          {unappliedPaise > 0 && (
            <p className="mt-2.5 text-[12px] text-ink-3">
              Part of this payment hasn&apos;t been allocated to a specific invoice yet — common for an advance or an
              overpayment. It stays here until you match it to one.
            </p>
          )}
        </section>
      </div>

      <section>
        <h2 className="text-[15px] font-medium text-ink">Applied to</h2>
        <div className="mt-3 overflow-x-auto rounded-[10px] border border-line bg-white">
          <table className="w-full text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-line-soft text-[12px] uppercase tracking-wide text-ink-3">
                <th className="px-5 py-3 font-medium">Invoice</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Invoice total</th>
                <th className="px-5 py-3 font-medium">Amount applied</th>
              </tr>
            </thead>
            <tbody>
              {allocations.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-ink-3">
                    Not yet applied to any invoice.
                  </td>
                </tr>
              )}
              {allocations.map((a) => (
                <tr key={a.id} className="border-b border-line-soft last:border-b-0">
                  <td className="px-5 py-3 font-mono text-ink">
                    {a.invoices ? (
                      <Link href={`/invoices/${a.invoices.id}`} className="text-brand hover:text-brand-hover">
                        {a.invoices.invoice_no}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-5 py-3 font-mono text-ink-2">{a.invoices ? formatDate(a.invoices.invoice_date) : "—"}</td>
                  <td className="px-5 py-3 font-mono text-ink-2">{a.invoices ? formatINR(a.invoices.total_paise) : "—"}</td>
                  <td className="px-5 py-3 font-mono text-ink">{formatINR(a.amount_allocated_paise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {receipt.notes && (
        <section className="rounded-[10px] border border-line bg-white p-5">
          <h2 className="text-[13px] font-medium text-ink-2">Notes</h2>
          <p className="mt-2 text-[13.5px] text-ink">{receipt.notes}</p>
        </section>
      )}
    </div>
  );
}
