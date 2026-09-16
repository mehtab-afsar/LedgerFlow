/**
 * GST computation for an invoice.
 *
 * Generalised from LogiFlow's GTA-specific version (lib/tax.ts there hardcodes
 * the 0%/5%/18% reverse-charge slabs a goods transport agency is restricted
 * to). This product serves brokers, 3PLs, warehouses and couriers, whose
 * applicable rates and reverse-charge eligibility vary by service — so the
 * rate and mode are supplied by the caller (ultimately the organisation's own
 * configured tax defaults, or a per-invoice override), not fixed here.
 *
 * What IS fixed, because it is a GST mechanics rule and not a business
 * choice: intra-state splits into CGST+SGST, inter-state is a single IGST
 * line, and exemption is checked before reverse-charge (an exempt invoice
 * prints no tax note at all — there is no liability to shift).
 *
 * Pure, exhaustively tested, no I/O and no clock — same discipline as
 * LogiFlow's version, for the same reason: a wrong tax line makes an invoice
 * unusable for the customer's own books.
 *
 * A dedicated GST/compliance design pass (HSN/SAC requirement, place-of-supply
 * edge cases, tax-inclusive vs exclusive pricing, nil-rated items) is an
 * explicit open item before schema freeze — see the PRD. This is the
 * mechanism that pass will configure, not the final word on Indian GST rules.
 */
import { assertPaise } from "@/lib/money";

export type TaxTreatment = "reverse_charge" | "forward";

export interface TaxInput {
  /** The invoice's taxable value, in integer paise. */
  taxableValuePaise: number;
  treatment: TaxTreatment;
  /** The rate that applies when treatment is "forward". Ignored under reverse
   *  charge (no tax line) and when exempt. */
  ratePct: number;
  /** The organisation's registered GST state code, 2 digits, e.g. '29'. */
  supplierStateCode: string;
  /** Place of supply — normally the bill-to party's state code. */
  placeOfSupplyStateCode: string;
  /** Per-invoice flag: nil-rated or exempt goods/services. */
  exempt: boolean;
}

export interface TaxResult {
  taxableValuePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalTaxPaise: number;
  invoiceTotalPaise: number;
  ratePct: number;
  isInterState: boolean;
  /** Why the amounts are what they are. Drives which note the PDF prints. */
  reason: "reverse_charge" | "exempt" | "intra_state" | "inter_state";
  /** Statutory note to print, or null when there is nothing to say. */
  note: string | null;
}

export const REVERSE_CHARGE_NOTE = "GST payable by recipient under reverse charge";
export const EXEMPT_NOTE = "Exempt / nil-rated — no GST";

const STATE_CODE = /^[0-9]{2}$/;

export function computeTax(input: TaxInput): TaxResult {
  const { taxableValuePaise, treatment, ratePct, supplierStateCode, placeOfSupplyStateCode, exempt } =
    input;

  assertPaise(taxableValuePaise);
  if (taxableValuePaise < 0) {
    throw new Error(`computeTax: taxable value cannot be negative (got ${taxableValuePaise} paise)`);
  }
  if (!STATE_CODE.test(supplierStateCode)) {
    throw new Error(`computeTax: invalid supplier state code '${supplierStateCode}' (expected 2 digits)`);
  }
  if (!STATE_CODE.test(placeOfSupplyStateCode)) {
    throw new Error(
      `computeTax: invalid place of supply state code '${placeOfSupplyStateCode}' (expected 2 digits)`,
    );
  }
  if (ratePct < 0 || ratePct > 100) {
    throw new Error(`computeTax: rate out of range (got ${ratePct})`);
  }

  const isInterState = supplierStateCode !== placeOfSupplyStateCode;

  const zero = (reason: TaxResult["reason"], note: string | null): TaxResult => ({
    taxableValuePaise,
    cgstPaise: 0,
    sgstPaise: 0,
    igstPaise: 0,
    totalTaxPaise: 0,
    invoiceTotalPaise: taxableValuePaise,
    ratePct: 0,
    isInterState,
    reason,
    note,
  });

  // Order matters. Exemption is checked BEFORE treatment: an exempt invoice
  // under reverse charge prints no reverse-charge note, because there is no
  // liability to shift in the first place.
  if (exempt) return zero("exempt", EXEMPT_NOTE);
  if (treatment === "reverse_charge") return zero("reverse_charge", REVERSE_CHARGE_NOTE);

  let cgstPaise = 0;
  let sgstPaise = 0;
  let igstPaise = 0;

  if (isInterState) {
    igstPaise = Math.round((taxableValuePaise * ratePct) / 100);
  } else {
    // Each half rounds independently, so their sum can differ from the single
    // IGST figure by one paisa on odd values. That is correct, and it is what
    // Tally does. Covered by a test.
    const half = Math.round((taxableValuePaise * ratePct) / 200);
    cgstPaise = half;
    sgstPaise = half;
  }

  const totalTaxPaise = cgstPaise + sgstPaise + igstPaise;

  return {
    taxableValuePaise,
    cgstPaise,
    sgstPaise,
    igstPaise,
    totalTaxPaise,
    invoiceTotalPaise: taxableValuePaise + totalTaxPaise,
    ratePct,
    isInterState,
    reason: isInterState ? "inter_state" : "intra_state",
    note: null,
  };
}
