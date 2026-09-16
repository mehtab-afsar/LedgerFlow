import { z } from "zod";
import { isValidGstin, isValidPan } from "@/lib/india/validators";

const stateCode = z.string().regex(/^\d{2}$/, "must be a 2-digit state code");
const docPrefix = z.string().trim().toUpperCase().regex(/^[A-Z]{2,6}$/, "2 to 6 letters, e.g. INV");

const gstin = z
  .string().trim().toUpperCase()
  .refine((v) => v === "" || isValidGstin(v), "that GSTIN is not valid — check the digits")
  .optional().nullable();

const transin = z.string().trim().toUpperCase().max(20).optional().nullable();

const pan = z
  .string().trim().toUpperCase()
  .refine((v) => v === "" || isValidPan(v), "not a valid PAN, e.g. AAACA1234F")
  .optional().nullable();

const hasIdentity = (v: { gstin?: string | null; transin?: string | null }) =>
  Boolean(v.gstin) || Boolean(v.transin);
const IDENTITY_ISSUE = {
  message: "enter a GSTIN, or a TRANSIN if you are not GST registered",
  path: ["gstin"] as string[],
};

export const createOrganisationSchema = z
  .object({
    legal_name: z.string().min(2, "company name is required").max(200),
    gstin,
    transin,
    pan,
    state_code: stateCode,
    address: z.string().max(500).optional().nullable(),
    invoice_prefix: docPrefix,
    credit_note_prefix: docPrefix,
    default_tax_treatment: z.enum(["reverse_charge", "forward"]),
    default_tax_rate_pct: z.number().min(0).max(100),
  })
  .refine(hasIdentity, IDENTITY_ISSUE);

export type CreateOrganisationInput = z.infer<typeof createOrganisationSchema>;

export const partySchema = z.object({
  name: z.string().min(2, "name is required").max(200),
  gstin,
  state_code: stateCode.optional().nullable(),
  default_tax_treatment: z.enum(["reverse_charge", "forward"]).optional().nullable(),
  payment_terms_days: z.number().int().min(0).max(365).default(30),
  credit_limit_paise: z.number().int().min(0).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export type PartyInput = z.infer<typeof partySchema>;

export const serviceCompletionSchema = z.object({
  party_id: z.uuid(),
  external_reference: z.string().max(100).optional().nullable(),
  service_type: z.string().max(100).optional().nullable(),
  origin: z.string().max(200).optional().nullable(),
  destination: z.string().max(200).optional().nullable(),
  unit: z.string().max(30).optional().nullable(),
  quantity: z.number().optional().nullable(),
  rate_paise: z.number().int().optional().nullable(),
  amount_paise: z.number().int().min(0),
  cost_paise: z.number().int().min(0).optional().nullable(),
  occurred_on: z.iso.date(),
  notes: z.string().max(1000).optional().nullable(),
});

export type ServiceCompletionInput = z.infer<typeof serviceCompletionSchema>;

export const createInvoiceSchema = z.object({
  bill_to_party_id: z.uuid(),
  deliver_to_party_id: z.uuid().optional().nullable(),
  bill_to_override_reason: z.string().max(500).optional().nullable(),
  service_completion_ids: z.array(z.uuid()).default([]),
  free_lines: z
    .array(
      z.object({
        description: z.string().min(1).max(300),
        hsn_sac: z.string().max(20).optional().nullable(),
        quantity: z.number().optional().nullable(),
        unit: z.string().max(30).optional().nullable(),
        rate_paise: z.number().int().optional().nullable(),
        discount_paise: z.number().int().min(0).default(0),
        amount_paise: z.number().int().min(0),
      }),
    )
    .default([]),
  due_date: z.iso.date().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  tax_treatment: z.enum(["reverse_charge", "forward"]),
  tax_rate_pct: z.number().min(0).max(100),
  exempt: z.boolean().default(false),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const recordReceiptSchema = z.object({
  payer_party_id: z.uuid(),
  amount_paise: z.number().int().positive(),
  received_on: z.iso.date(),
  method: z.enum(["cash", "bank", "upi", "cheque"]),
  reference_no: z.string().max(100).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  allocations: z
    .array(z.object({ invoice_id: z.uuid(), amount_paise: z.number().int().positive() }))
    .default([]),
});

export type RecordReceiptInput = z.infer<typeof recordReceiptSchema>;
