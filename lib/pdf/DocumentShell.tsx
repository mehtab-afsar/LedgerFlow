import { Document, Page, View, Text } from "@react-pdf/renderer";
import { pdfStyles } from "@/lib/pdf/styles";

type Org = {
  legal_name: string;
  gstin: string | null;
  transin: string | null;
  state_code: string | null;
  address: string | null;
};

/** Shared letterhead/page-setup/footer so invoices, receipts, and service
 *  summaries read as one visual family rather than three unrelated PDFs. */
export function DocumentShell({
  title,
  docNo,
  docDate,
  org,
  children,
}: {
  title: string;
  docNo: string;
  docDate: string;
  org: Org;
  children: React.ReactNode;
}) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.headerRow}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={pdfStyles.mark} />
            <View>
              <Text style={pdfStyles.orgName}>{org.legal_name}</Text>
              <Text style={pdfStyles.orgMeta}>
                {org.gstin ? `GSTIN ${org.gstin}` : org.transin ? `TRANSIN ${org.transin}` : ""}
                {org.state_code ? `  ·  State ${org.state_code}` : ""}
              </Text>
              {org.address && <Text style={pdfStyles.orgMeta}>{org.address}</Text>}
            </View>
          </View>
          <View>
            <Text style={pdfStyles.title}>{title}</Text>
            <Text style={pdfStyles.docMeta}>{docNo}</Text>
            <Text style={pdfStyles.docMeta}>{docDate}</Text>
          </View>
        </View>

        {children}

        <Text
          style={pdfStyles.footer}
          render={({ pageNumber, totalPages }) => `${org.legal_name} · Page ${pageNumber} of ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}
