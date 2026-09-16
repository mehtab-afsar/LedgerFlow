import { View, Text } from "@react-pdf/renderer";
import { DocumentShell } from "@/lib/pdf/DocumentShell";
import { pdfStyles } from "@/lib/pdf/styles";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/india/format";

type Org = { legal_name: string; gstin: string | null; transin: string | null; state_code: string | null; address: string | null };

export function ServiceCompletionPdf({
  completion,
  org,
}: {
  completion: {
    id: string;
    external_reference: string | null;
    service_type: string | null;
    origin: string | null;
    destination: string | null;
    quantity: number | null;
    unit: string | null;
    rate_paise: number | null;
    amount_paise: number;
    occurred_on: string;
    status: string;
    party: { name: string } | null;
  };
  org: Org;
}) {
  return (
    <DocumentShell
      title="SERVICE SUMMARY"
      docNo={completion.external_reference ?? completion.id.slice(0, 8).toUpperCase()}
      docDate={formatDate(completion.occurred_on)}
      org={org}
    >
      <View style={pdfStyles.sectionRow}>
        <View style={pdfStyles.block}>
          <Text style={pdfStyles.blockLabel}>Party</Text>
          <Text style={pdfStyles.blockTitle}>{completion.party?.name ?? "—"}</Text>
        </View>
        <View style={pdfStyles.block}>
          <Text style={pdfStyles.blockLabel}>Service</Text>
          <Text style={pdfStyles.blockTitle}>{completion.service_type ?? "Service"}</Text>
          {(completion.origin || completion.destination) && (
            <Text style={pdfStyles.blockMeta}>
              {completion.origin ?? "—"} → {completion.destination ?? "—"}
            </Text>
          )}
        </View>
        <View style={pdfStyles.block}>
          <Text style={pdfStyles.blockLabel}>Status</Text>
          <Text style={pdfStyles.blockTitle}>{completion.status}</Text>
        </View>
      </View>

      <View style={pdfStyles.table}>
        <View style={pdfStyles.tableHeaderRow}>
          <Text style={[pdfStyles.th, { flex: 2 }]}>Description</Text>
          <Text style={[pdfStyles.th, { flex: 1, textAlign: "right" }]}>Qty</Text>
          <Text style={[pdfStyles.th, { flex: 1, textAlign: "right" }]}>Rate</Text>
          <Text style={[pdfStyles.th, { flex: 1, textAlign: "right" }]}>Amount</Text>
        </View>
        <View style={pdfStyles.tableRow}>
          <Text style={[pdfStyles.td, { flex: 2 }]}>{completion.service_type ?? "Service"}</Text>
          <Text style={[pdfStyles.td, { flex: 1, textAlign: "right" }]}>
            {completion.quantity != null ? `${completion.quantity} ${completion.unit ?? ""}`.trim() : "—"}
          </Text>
          <Text style={[pdfStyles.td, { flex: 1, textAlign: "right" }]}>
            {completion.rate_paise != null ? formatINR(completion.rate_paise) : "—"}
          </Text>
          <Text style={[pdfStyles.td, { flex: 1, textAlign: "right" }]}>{formatINR(completion.amount_paise)}</Text>
        </View>
      </View>

      <View style={pdfStyles.totalsBlock}>
        <View style={pdfStyles.totalsRowStrong}>
          <Text style={[pdfStyles.td, { fontWeight: 700 }]}>Amount</Text>
          <Text style={[pdfStyles.td, { fontWeight: 700 }]}>{formatINR(completion.amount_paise)}</Text>
        </View>
      </View>

      {completion.status !== "invoiced" && (
        <Text style={pdfStyles.note}>Not yet invoiced — this is a job record, not a billing document.</Text>
      )}
    </DocumentShell>
  );
}
