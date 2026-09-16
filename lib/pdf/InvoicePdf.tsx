import { View, Text } from "@react-pdf/renderer";
import { DocumentShell } from "@/lib/pdf/DocumentShell";
import { pdfStyles, colors } from "@/lib/pdf/styles";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/india/format";
import { REVERSE_CHARGE_NOTE, EXEMPT_NOTE } from "@/lib/tax";

type Party = { id: string; name: string; gstin: string | null; state_code: string | null } | null;

type IssuedSnapshot = {
  invoice: {
    invoice_no: string;
    invoice_date: string;
    due_date: string | null;
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
  };
  lines: {
    id: string;
    description: string;
    hsn_sac: string | null;
    quantity: number | null;
    unit: string | null;
    rate_paise: number | null;
    amount_paise: number;
  }[];
  bill_to_party: Party;
  deliver_to_party: Party;
  organisation: {
    legal_name: string;
    gstin: string | null;
    transin: string | null;
    state_code: string | null;
    address: string | null;
  };
};

/**
 * Renders line items, tax and totals strictly from the frozen
 * issued_snapshot — an issued invoice's billed amounts must never change
 * after the fact. Payment status (amountPaidPaise/balanceDuePaise) is the
 * one thing that's deliberately live: it's not part of what was billed, it's
 * what's been collected against it since, exactly like the web detail page.
 */
export function InvoicePdf({
  snapshot,
  amountPaidPaise = 0,
  balanceDuePaise = null,
}: {
  snapshot: IssuedSnapshot;
  amountPaidPaise?: number;
  balanceDuePaise?: number | null;
}) {
  const { invoice, lines, bill_to_party, deliver_to_party, organisation } = snapshot;
  const isExempt = invoice.cgst_paise === 0 && invoice.sgst_paise === 0 && invoice.igst_paise === 0;

  return (
    <DocumentShell
      title="TAX INVOICE"
      docNo={invoice.invoice_no}
      docDate={formatDate(invoice.invoice_date)}
      org={organisation}
    >
      <View style={pdfStyles.sectionRow}>
        <View style={pdfStyles.block}>
          <Text style={pdfStyles.blockLabel}>Bill to</Text>
          <Text style={pdfStyles.blockTitle}>{bill_to_party?.name ?? "—"}</Text>
          {bill_to_party?.gstin && <Text style={pdfStyles.blockMeta}>GSTIN {bill_to_party.gstin}</Text>}
          {bill_to_party?.state_code && <Text style={pdfStyles.blockMeta}>State {bill_to_party.state_code}</Text>}
          {invoice.bill_to_override_reason && (
            <Text style={pdfStyles.note}>{invoice.bill_to_override_reason}</Text>
          )}
        </View>
        {deliver_to_party && deliver_to_party.id !== bill_to_party?.id && (
          <View style={pdfStyles.block}>
            <Text style={pdfStyles.blockLabel}>Delivered to</Text>
            <Text style={pdfStyles.blockTitle}>{deliver_to_party.name}</Text>
            {deliver_to_party.gstin && <Text style={pdfStyles.blockMeta}>GSTIN {deliver_to_party.gstin}</Text>}
          </View>
        )}
        <View style={pdfStyles.block}>
          <Text style={pdfStyles.blockLabel}>Due date</Text>
          <Text style={pdfStyles.blockTitle}>{invoice.due_date ? formatDate(invoice.due_date) : "On receipt"}</Text>
        </View>
      </View>

      <View style={pdfStyles.table}>
        <View style={pdfStyles.tableHeaderRow}>
          <Text style={[pdfStyles.th, { flex: 3 }]}>Description</Text>
          <Text style={[pdfStyles.th, { flex: 1 }]}>HSN/SAC</Text>
          <Text style={[pdfStyles.th, { flex: 1, textAlign: "right" }]}>Qty</Text>
          <Text style={[pdfStyles.th, { flex: 1, textAlign: "right" }]}>Rate</Text>
          <Text style={[pdfStyles.th, { flex: 1, textAlign: "right" }]}>Amount</Text>
        </View>
        {lines.map((l) => (
          <View key={l.id} style={pdfStyles.tableRow}>
            <Text style={[pdfStyles.td, { flex: 3 }]}>{l.description}</Text>
            <Text style={[pdfStyles.td, { flex: 1 }]}>{l.hsn_sac ?? "—"}</Text>
            <Text style={[pdfStyles.td, { flex: 1, textAlign: "right" }]}>
              {l.quantity != null ? `${l.quantity} ${l.unit ?? ""}`.trim() : "—"}
            </Text>
            <Text style={[pdfStyles.td, { flex: 1, textAlign: "right" }]}>
              {l.rate_paise != null ? formatINR(l.rate_paise) : "—"}
            </Text>
            <Text style={[pdfStyles.td, { flex: 1, textAlign: "right" }]}>{formatINR(l.amount_paise)}</Text>
          </View>
        ))}
      </View>

      <View style={pdfStyles.totalsBlock}>
        <View style={pdfStyles.totalsRow}>
          <Text style={pdfStyles.td}>Taxable value</Text>
          <Text style={pdfStyles.td}>{formatINR(invoice.taxable_value_paise)}</Text>
        </View>
        {invoice.cgst_paise > 0 && (
          <View style={pdfStyles.totalsRow}>
            <Text style={pdfStyles.td}>CGST ({invoice.tax_rate_pct / 2}%)</Text>
            <Text style={pdfStyles.td}>{formatINR(invoice.cgst_paise)}</Text>
          </View>
        )}
        {invoice.sgst_paise > 0 && (
          <View style={pdfStyles.totalsRow}>
            <Text style={pdfStyles.td}>SGST ({invoice.tax_rate_pct / 2}%)</Text>
            <Text style={pdfStyles.td}>{formatINR(invoice.sgst_paise)}</Text>
          </View>
        )}
        {invoice.igst_paise > 0 && (
          <View style={pdfStyles.totalsRow}>
            <Text style={pdfStyles.td}>IGST ({invoice.tax_rate_pct}%)</Text>
            <Text style={pdfStyles.td}>{formatINR(invoice.igst_paise)}</Text>
          </View>
        )}
        {invoice.round_off_paise !== 0 && (
          <View style={pdfStyles.totalsRow}>
            <Text style={pdfStyles.td}>Round off</Text>
            <Text style={pdfStyles.td}>{formatINR(invoice.round_off_paise)}</Text>
          </View>
        )}
        <View style={pdfStyles.totalsRowStrong}>
          <Text style={[pdfStyles.td, { fontWeight: 700 }]}>Total</Text>
          <Text style={[pdfStyles.td, { fontWeight: 700 }]}>{formatINR(invoice.total_paise)}</Text>
        </View>
        {balanceDuePaise !== null && (
          <>
            {amountPaidPaise > 0 && (
              <View style={pdfStyles.totalsRow}>
                <Text style={pdfStyles.td}>Paid</Text>
                <Text style={pdfStyles.td}>-{formatINR(amountPaidPaise)}</Text>
              </View>
            )}
            <View style={pdfStyles.totalsRowStrong}>
              <Text style={[pdfStyles.td, { fontWeight: 700, color: balanceDuePaise > 0 ? colors.alert : colors.forestInk }]}>
                Balance due
              </Text>
              <Text style={[pdfStyles.td, { fontWeight: 700, color: balanceDuePaise > 0 ? colors.alert : colors.forestInk }]}>
                {formatINR(balanceDuePaise)}
              </Text>
            </View>
          </>
        )}
      </View>

      {isExempt && invoice.tax_treatment === "reverse_charge" && (
        <Text style={pdfStyles.note}>{REVERSE_CHARGE_NOTE}</Text>
      )}
      {isExempt && invoice.tax_treatment === "forward" && <Text style={pdfStyles.note}>{EXEMPT_NOTE}</Text>}
      {invoice.notes && <Text style={pdfStyles.note}>{invoice.notes}</Text>}
    </DocumentShell>
  );
}
