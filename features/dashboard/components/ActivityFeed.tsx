import { FileText, FilePlus2, FileX2, Receipt } from "lucide-react";
import { timeAgo } from "@/lib/india/format";
import { formatINR } from "@/lib/money";

type AuditEvent = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  after: Record<string, unknown> | null;
  reason: string | null;
  at: string;
};

const ACTION_ICON: Record<string, typeof FileText> = {
  "invoice.issued": FilePlus2,
  "invoice.cancelled": FileX2,
  "credit_note.applied": FileText,
  "receipt.recorded": Receipt,
};

const ACTION_LABEL: Record<string, string> = {
  "invoice.issued": "Invoice issued",
  "invoice.cancelled": "Invoice cancelled",
  "credit_note.applied": "Credit note applied",
  "receipt.recorded": "Receipt recorded",
};

function describe(event: AuditEvent): string {
  const after = event.after ?? {};
  if (event.action === "invoice.issued") {
    const invoiceNo = (after.invoice as { invoice_no?: string } | undefined)?.invoice_no;
    const total = (after.invoice as { total_paise?: number } | undefined)?.total_paise;
    return [invoiceNo, total != null ? formatINR(total) : null].filter(Boolean).join(" · ");
  }
  if (event.action === "receipt.recorded") {
    const amount = after.amount_paise as number | undefined;
    return amount != null ? formatINR(amount) : "";
  }
  if (event.action === "credit_note.applied") {
    const amount = after.amount_paise as number | undefined;
    return amount != null ? formatINR(amount) : "";
  }
  return "";
}

export function ActivityFeed({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) {
    return <p className="px-5 py-8 text-center text-[13px] text-ink-3">Nothing recorded yet.</p>;
  }

  return (
    <ul className="divide-y divide-line-soft">
      {events.map((e) => {
        const Icon = ACTION_ICON[e.action] ?? FileText;
        return (
          <li key={e.id} className="flex items-start gap-3 px-5 py-3">
            <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand">
              <Icon className="size-3.5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-medium text-ink">{ACTION_LABEL[e.action] ?? e.action}</p>
              <p className="truncate text-[12.5px] text-ink-2">{describe(e)}</p>
              {e.reason && <p className="truncate text-[12px] text-ink-3">{e.reason}</p>}
            </div>
            <span className="shrink-0 text-[12px] text-ink-3">{timeAgo(e.at)}</span>
          </li>
        );
      })}
    </ul>
  );
}
