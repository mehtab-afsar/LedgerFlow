/**
 * Format validators for Indian statutory identifiers.
 *
 * Ported from LogiFlow's lib/india/validators.ts, trimmed to what a billing
 * product needs — no vehicle registration, driving licence, or e-way bill
 * validators, since this product has no dispatch domain.
 */

const GSTIN_CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const GSTIN_SHAPE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

/**
 * GSTIN mod-36 check digit.
 *
 * Positions 1..14 are weighted alternately 1 and 2. For each, the product is
 * folded as floor(p/36) + (p%36); the 15th character is the value that brings
 * the running sum to a multiple of 36.
 */
export function gstinCheckDigit(first14: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i += 1) {
    const value = GSTIN_CHARSET.indexOf(first14[i]);
    if (value < 0) throw new Error(`gstinCheckDigit: invalid character '${first14[i]}'`);
    const factor = i % 2 === 0 ? 1 : 2;
    const product = value * factor;
    sum += Math.floor(product / 36) + (product % 36);
  }
  return GSTIN_CHARSET[(36 - (sum % 36)) % 36];
}

/** Shape AND checksum. A shape-only check accepts typos that GST portals reject. */
export function isValidGstin(gstin: string): boolean {
  if (typeof gstin !== "string") return false;
  const value = gstin.trim().toUpperCase();
  if (!GSTIN_SHAPE.test(value)) return false;
  return gstinCheckDigit(value.slice(0, 14)) === value[14];
}

/** First two digits of a GSTIN are the state code. */
export function stateCodeFromGstin(gstin: string): string | null {
  const value = gstin.trim().toUpperCase();
  return GSTIN_SHAPE.test(value) ? value.slice(0, 2) : null;
}

/** 10-digit Indian mobile, no country code. */
export function isValidPhone(phone: string): boolean {
  return typeof phone === "string" && /^[6-9][0-9]{9}$/.test(phone.trim());
}

/**
 * Strips how a person actually types a phone number down to the bare 10
 * digits a contact form can validate and store — handles "98450 12345" and
 * a leading +91/0 the same way.
 */
export function normaliseIndianPhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

export function isValidPincode(pin: string): boolean {
  return typeof pin === "string" && /^[1-9][0-9]{5}$/.test(pin.trim());
}

export function isValidPan(pan: string): boolean {
  return typeof pan === "string" && /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.trim().toUpperCase());
}
