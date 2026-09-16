import { View, Text } from "@react-pdf/renderer";
import { DocumentShell } from "@/lib/pdf/DocumentShell";
import { pdfStyles } from "@/lib/pdf/styles";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/india/format";

type Org = { legal_name: string; gstin: string | null; transin: string | null; state_code: string | null; address: string | null };

export function ReceiptPdf({
  receipt,
  allocations,
  org,
}: {
  receipt: {
    id: string;
    amount_paise: number;
    received_on: string;
    method: string;
    reference_no: string | null;
    notes: string | null;
    party: { name: string; gstin: string | null } | null;
  };
  allocations: { invoice_no: string; invoice_date: string; amount_allocated_paise: number }[];
  org: Org;
}) {
  return (
    <DocumentShell
      title="PAYMENT RECEIPT"
      docNo={`REC-${receipt.id.slice(0, 8).toUpperCase()}`}
      docDate={formatDate(receipt.received_on)}
      org={org}
    >
      <View style={pdfStyles.sectionRow}>
        <View style={pdfStyles.block}>
          <Text style={pdfStyles.blockLabel}>Received from</Text>
          <Text style={pdfStyles.blockTitle}>{receipt.party?.name ?? "—"}</Text>
          {receipt.party?.gstin && <Text style={pdfStyles.blockMeta}>GSTIN {receipt.party.gstin}</Text>}
        </View>
        <View style={pdfStyles.block}>
          <Text style={pdfStyles.blockLabel}>Amount received</Text>
          <Text style={[pdfStyles.blockTitle, { fontSize: 13 }]}>{formatINR(receipt.amount_paise)}</Text>
          <Text style={pdfStyles.blockMeta}>
            {receipt.method.toUpperCase()}
            {receipt.reference_no ? ` · Ref ${receipt.reference_no}` : ""}
          </Text>
        </View>
      </View>

      {allocations.length > 0 && (
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeaderRow}>
            <Text style={[pdfStyles.th, { flex: 2 }]}>Invoice</Text>
            <Text style={[pdfStyles.th, { flex: 1 }]}>Date</Text>
            <Text style={[pdfStyles.th, { flex: 1, textAlign: "right" }]}>Amount applied</Text>
          </View>
          {allocations.map((a, i) => (
            <View key={i} style={pdfStyles.tableRow}>
              <Text style={[pdfStyles.td, { flex: 2 }]}>{a.invoice_no}</Text>
              <Text style={[pdfStyles.td, { flex: 1 }]}>{formatDate(a.invoice_date)}</Text>
              <Text style={[pdfStyles.td, { flex: 1, textAlign: "right" }]}>{formatINR(a.amount_allocated_paise)}</Text>
            </View>
          ))}
        </View>
      )}

      {receipt.notes && <Text style={pdfStyles.note}>{receipt.notes}</Text>}
    </DocumentShell>
  );
}
