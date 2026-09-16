import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/india/format";
import { CancelInvoiceButton } from "@/features/invoices/components/CancelInvoiceButton";
import { buttonPrimaryClass, buttonSecondaryClass } from "@/lib/ui/styles";

type Party = { id: string; name: string; gstin: string | null; state_code: string | null } | null;

type Invoice = {
  id: string;
  invoice_no: string;
  invoice_date: string;
  due_date: string | null;
  status: "draft" | "issued" | "cancelled";
  notes: string | null;
  bill_to_override_reason: string | null;
  tax_treatment: "reverse_charge" | "forward";
  tax_rate_pct: number;
  taxable_value_paise: number;
  cgst_paise: number;
  sgst_paise: number;
  igst_paise: number;
  round_off_paise: number;
  total_paise: number;
  created_at: string;
  bill_to: Party;
  deliver_to: Party;
};

type Line = {
  id: string;
  description: string;
  hsn_sac: string | null;
  quantity: number | null;
  unit: string | null;
  rate_paise: number | null;
  discount_paise: number;
  amount_paise: number;
};

type Allocation = {
  id: string;
  amount_allocated_paise: number;
  receipts: { id: string; received_on: string; method: string; reference_no: string | null; payer_party_id: string } | null;
};

type CreditNote = {
  id: string;
  credit_note_no: string;
  reason: string;
  amount_paise: number;
  cgst_paise: number;
  sgst_paise: number;
  igst_paise: number;
  issued_on: string;
};

const STATUS_STYLE: Record<Invoice["status"], string> = {
  draft: "bg-line-soft text-ink-2",
  issued: "bg-forest-tint text-forest-ink",
  cancelled: "bg-alert-tint text-alert",
};

export function InvoiceDetail({
  invoice,
  lines,
  allocations,
  creditNotes,
  balanceDuePaise,
  amountPaidPaise,
  canCancel,
}: {
  invoice: Invoice;
  lines: Line[];
  allocations: Allocation[];
  creditNotes: CreditNote[];
  balanceDuePaise: number;
  amountPaidPaise: number;
  canCancel: boolean;
}) {
  return (
    <div className="space-y-6 p-8">
      <div>
        <Link
          href="/invoices"
          transitionTypes={["nav-back"]}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 hover:text-ink"
        >
          <ArrowLeft className="size-3.5" />
          Invoices
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-mono text-[22px] font-semibold tracking-[-0.01em] text-ink">{invoice.invoice_no}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium capitalize ${STATUS_STYLE[invoice.status]}`}>
              {invoice.status}
            </span>
          </div>
          <p className="mt-1 text-[13.5px] text-ink-2">
            Issued {formatDate(invoice.invoice_date)}
            {invoice.due_date && <> · Due {formatDate(invoice.due_date)}</>}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/invoices/${invoice.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className={buttonSecondaryClass}
          >
            Print
          </a>
          <a
            href={`/api/invoices/${invoice.id}/pdf?download=1`}
            className={buttonPrimaryClass}
          >
            Download PDF
          </a>
          {canCancel && invoice.status === "issued" && (
            <CancelInvoiceButton invoiceId={invoice.id} invoiceNo={invoice.invoice_no} />
          )}
        </div>
      </header>

      <div className="grid gap-4 min-[640px]:grid-cols-2">
        <PartyCard label="Bill to" party={invoice.bill_to} note={invoice.bill_to_override_reason} />
        {invoice.deliver_to && invoice.deliver_to.id !== invoice.bill_to?.id && (
          <PartyCard label="Delivered to" party={invoice.deliver_to} />
        )}
      </div>

      <section>
        <h2 className="text-[15px] font-medium text-ink">Line items</h2>
        <div className="mt-3 overflow-x-auto rounded-[10px] border border-line bg-white">
          <table className="w-full text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-line-soft text-[12px] uppercase tracking-wide text-ink-3">
                <th className="px-5 py-3 font-medium">Description</th>
                <th className="px-5 py-3 font-medium">HSN/SAC</th>
                <th className="px-5 py-3 font-medium">Qty</th>
                <th className="px-5 py-3 font-medium">Rate</th>
                <th className="px-5 py-3 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id} className="border-b border-line-soft last:border-b-0">
                  <td className="px-5 py-3 text-ink">{l.description}</td>
                  <td className="px-5 py-3 font-mono text-ink-2">{l.hsn_sac ?? "—"}</td>
                  <td className="px-5 py-3 font-mono text-ink-2">
                    {l.quantity != null ? `${l.quantity} ${l.unit ?? ""}`.trim() : "—"}
                  </td>
                  <td className="px-5 py-3 font-mono text-ink-2">{l.rate_paise != null ? formatINR(l.rate_paise) : "—"}</td>
                  <td className="px-5 py-3 font-mono text-ink">{formatINR(l.amount_paise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 min-[640px]:grid-cols-2">
        <section className="rounded-[10px] border border-line bg-white p-5">
          <h2 className="text-[13px] font-medium text-ink-2">Tax summary</h2>
          <dl className="mt-3 space-y-1.5 text-[13.5px]">
            <Row label="Taxable value" value={formatINR(invoice.taxable_value_paise)} />
            {invoice.cgst_paise > 0 && <Row label={`CGST (${invoice.tax_rate_pct / 2}%)`} value={formatINR(invoice.cgst_paise)} />}
            {invoice.sgst_paise > 0 && <Row label={`SGST (${invoice.tax_rate_pct / 2}%)`} value={formatINR(invoice.sgst_paise)} />}
            {invoice.igst_paise > 0 && <Row label={`IGST (${invoice.tax_rate_pct}%)`} value={formatINR(invoice.igst_paise)} />}
            {invoice.round_off_paise !== 0 && <Row label="Round off" value={formatINR(invoice.round_off_paise)} />}
            <Row label="Total" value={formatINR(invoice.total_paise)} strong />
          </dl>
        </section>

        <section className="rounded-[10px] border border-line bg-white p-5">
          <h2 className="text-[13px] font-medium text-ink-2">Balance</h2>
          <dl className="mt-3 space-y-1.5 text-[13.5px]">
            <Row label="Paid" value={formatINR(amountPaidPaise)} />
            <Row
              label="Balance due"
              value={formatINR(balanceDuePaise)}
              strong
              tone={balanceDuePaise > 0 ? "alert" : "forest"}
            />
          </dl>
        </section>
      </div>

      {allocations.length > 0 && (
        <section>
          <h2 className="text-[15px] font-medium text-ink">Payments received</h2>
          <div className="mt-3 overflow-x-auto rounded-[10px] border border-line bg-white">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-line-soft text-[12px] uppercase tracking-wide text-ink-3">
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Method</th>
                  <th className="px-5 py-3 font-medium">Reference</th>
                  <th className="px-5 py-3 font-medium">Applied</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((a) => (
                  <tr key={a.id} className="border-b border-line-soft last:border-b-0">
                    <td className="px-5 py-3 font-mono text-ink-2">{a.receipts ? formatDate(a.receipts.received_on) : "—"}</td>
                    <td className="px-5 py-3 capitalize text-ink-2">{a.receipts?.method ?? "—"}</td>
                    <td className="px-5 py-3 text-ink-2">{a.receipts?.reference_no ?? "—"}</td>
                    <td className="px-5 py-3 font-mono text-ink">{formatINR(a.amount_allocated_paise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {creditNotes.length > 0 && (
        <section>
          <h2 className="text-[15px] font-medium text-ink">Credit notes</h2>
          <div className="mt-3 overflow-x-auto rounded-[10px] border border-line bg-white">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-line-soft text-[12px] uppercase tracking-wide text-ink-3">
                  <th className="px-5 py-3 font-medium">Credit note</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Reason</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {creditNotes.map((c) => (
                  <tr key={c.id} className="border-b border-line-soft last:border-b-0">
                    <td className="px-5 py-3 font-mono text-ink">{c.credit_note_no}</td>
                    <td className="px-5 py-3 font-mono text-ink-2">{formatDate(c.issued_on)}</td>
                    <td className="px-5 py-3 text-ink-2">{c.reason}</td>
                    <td className="px-5 py-3 font-mono text-ink">
                      {formatINR(c.amount_paise + c.cgst_paise + c.sgst_paise + c.igst_paise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {invoice.notes && (
        <section className="rounded-[10px] border border-line bg-white p-5">
          <h2 className="text-[13px] font-medium text-ink-2">Notes</h2>
          <p className="mt-2 text-[13.5px] text-ink">{invoice.notes}</p>
        </section>
      )}
    </div>
  );
}

function PartyCard({ label, party, note }: { label: string; party: Party; note?: string | null }) {
  return (
    <section className="rounded-[10px] border border-line bg-white p-5">
      <h2 className="text-[13px] font-medium text-ink-2">{label}</h2>
      <p className="mt-1.5 text-[14.5px] font-medium text-ink">{party?.name ?? "—"}</p>
      {party?.gstin && <p className="mt-0.5 font-mono text-[12.5px] text-ink-3">GSTIN {party.gstin}</p>}
      {party?.state_code && <p className="font-mono text-[12.5px] text-ink-3">State {party.state_code}</p>}
      {note && <p className="mt-2 text-[12.5px] text-ink-3">{note}</p>}
    </section>
  );
}

function Row({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "alert" | "forest";
}) {
  const toneClass = tone === "alert" ? "text-alert" : tone === "forest" ? "text-forest-ink" : "text-ink";
  return (
    <div className={`flex items-center justify-between ${strong ? "border-t border-line-soft pt-1.5" : ""}`}>
      <dt className="text-ink-2">{label}</dt>
      <dd className={`font-mono ${strong ? "font-semibold" : ""} ${toneClass}`}>{value}</dd>
    </div>
  );
}
