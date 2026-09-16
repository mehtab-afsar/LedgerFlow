import { StyleSheet } from "@react-pdf/renderer";

/**
 * Hex mirrors of the tokens in app/globals.css — @react-pdf/renderer can't
 * read CSS custom properties, so the palette is restated here to keep every
 * PDF visually part of the same family as the web app.
 */
export const colors = {
  paper: "#f6f8f7",
  ink: "#16211f",
  ink2: "#3d4844",
  ink3: "#67746f",
  line: "#dfe6e3",
  lineSoft: "#edf1ef",
  brand: "#0f6a5c",
  brandTint: "#e4f3ef",
  alert: "#b42318",
  forestInk: "#17603c",
};

export const pdfStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9.5,
    color: colors.ink,
    fontFamily: "Helvetica",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  mark: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: colors.brand,
  },
  orgName: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 2,
  },
  orgMeta: {
    fontSize: 8.5,
    color: colors.ink3,
    lineHeight: 1.4,
  },
  title: {
    fontSize: 15,
    fontWeight: 700,
    color: colors.brand,
    textAlign: "right",
  },
  docMeta: {
    fontSize: 8.5,
    color: colors.ink2,
    textAlign: "right",
    marginTop: 3,
    lineHeight: 1.4,
  },
  sectionRow: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 16,
  },
  block: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 4,
  },
  blockLabel: {
    fontSize: 8,
    color: colors.ink3,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  blockTitle: {
    fontSize: 10.5,
    fontWeight: 700,
    marginBottom: 2,
  },
  blockMeta: {
    fontSize: 8.5,
    color: colors.ink2,
    lineHeight: 1.4,
  },
  table: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 4,
    marginBottom: 16,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: colors.lineSoft,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
  },
  th: {
    fontSize: 8,
    color: colors.ink3,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  td: {
    fontSize: 9,
    color: colors.ink,
  },
  totalsBlock: {
    width: 220,
    marginLeft: "auto",
    marginBottom: 16,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  totalsRowStrong: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    marginTop: 3,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  note: {
    fontSize: 8.5,
    color: colors.ink2,
    marginTop: 4,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 7.5,
    color: colors.ink3,
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: colors.lineSoft,
    paddingTop: 8,
  },
});
