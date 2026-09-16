/**
 * Cancelling an invoice, and allocating money to one.
 *
 * Written BEFORE the fixes in migration 15, and run against the unfixed
 * schema first, so that each assertion below is known to have failed at least
 * once. A guard that has never been seen to fail is not known to work.
 *
 * What is being checked:
 *   · an allocation may not exceed what the invoice still owes
 *   · an invoice that has taken money may not simply be cancelled
 *   · a cancelled invoice stops counting as money owed
 *   · work that was billed and then cancelled becomes genuinely re-billable
 *
 *   npx supabase start && npm run db:reset
 *   node scripts/verify-cancel-and-allocations.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let passed = 0; const failures = [];
const check = (label, ok, detail = "") => {
  if (ok) { passed++; console.log(`  ✓ ${label}`); }
  else { failures.push(label); console.log(`  ✗ ${label}\n      ${detail}`); }
};

async function signIn(email) {
  await admin.auth.admin.createUser({ email, email_confirm: true });
  const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const c = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data, error } = await c.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "email" });
  if (error) throw error;
  await c.auth.setSession(data.session);
  for (let i = 0; i < 40; i++) {
    const { error: e } = await c.from("organisations").select("id").limit(1);
    if (!e || !/issued at future/i.test(e.message)) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  return c;
}

const RUN = Date.now().toString(36);
const db = await signIn(`cancel+${RUN}@lf.test`);

const { data: org, error: orgErr } = await db.rpc("create_organisation", {
  p_legal_name: `Cancel Test Logistics ${RUN}`,
  p_gstin: `29CCCCC0000C1Z${RUN.slice(-1)}`, p_transin: null, p_pan: null,
  p_state_code: "29", p_address: null,
}).single();
if (orgErr) throw new Error(`org: ${orgErr.message}`);
const orgId = org.org_id ?? org.id;

const { data: party, error: partyErr } = await db.from("parties")
  .insert({ org_id: orgId, name: "Test Customer", state_code: "29" })
  .select("id").single();
if (partyErr) throw new Error(`party: ${partyErr.message}`);

/** A completed job, ready to bill. */
async function completion(amountPaise, ref) {
  const { data, error } = await db.from("service_completions").insert({
    org_id: orgId, party_id: party.id, amount_paise: amountPaise,
    occurred_on: "2026-06-10", status: "completed", external_reference: ref,
  }).select("id").single();
  if (error) throw new Error(`completion: ${error.message}`);
  return data.id;
}

/**
 * Tax is computed in the client and passed in — LedgerFlow's create_invoice
 * stores the breakdown it is handed and never recomputes it. Both parties are
 * in state 29, so this is an intra-state supply: 18% split into CGST 9% and
 * SGST 9%.
 */
function intraStateTax(amountPaise) {
  const half = Math.round(amountPaise * 0.09);
  return {
    treatment: "forward", rate_pct: 18,
    taxable_value_paise: amountPaise,
    cgst_paise: half, sgst_paise: half, igst_paise: 0,
    round_off_paise: 0,
    total_paise: amountPaise + half * 2,
  };
}

async function invoiceFor(completionId, amountPaise) {
  const { data, error } = await db.rpc("create_invoice", {
    p_bill_to_party_id: party.id, p_deliver_to_party_id: null,
    p_service_completion_ids: [completionId], p_free_lines: [],
    p_tax: intraStateTax(amountPaise),
  }).single();
  if (error) throw new Error(`create_invoice: ${error.message}`);
  return data;
}

const balanceOf = async (id) => {
  const { data } = await db.from("invoice_balances")
    .select("balance_due_paise, amount_paid_paise").eq("invoice_id", id).single();
  return data;
};

console.log("\nLedgerFlow — cancelling invoices and allocating money\n");

// ── 1. An allocation must not exceed what the invoice owes ─────────────────
console.log("Allocating more than is owed");
const c1 = await completion(10_000_00, "JOB-1");
const inv1 = await invoiceFor(c1, 10_000_00);
const before1 = await balanceOf(inv1.invoice_id);

const { error: overErr } = await db.rpc("record_receipt", {
  p_payer_party_id: party.id,
  p_amount_paise: 500_000_00,
  p_received_on: "2026-07-01", p_method: "bank",
  p_allocations: [{ invoice_id: inv1.invoice_id, amount_paise: 500_000_00 }],
});
check("an allocation larger than the invoice balance is REFUSED",
  overErr !== null,
  overErr ? overErr.message : "ACCEPTED — the invoice balance can be driven negative");

const after1 = await balanceOf(inv1.invoice_id);
check("and the balance never goes negative",
  (after1?.balance_due_paise ?? 0) >= 0,
  `balance is ${after1?.balance_due_paise} (was ${before1?.balance_due_paise})`);

// ── 2. An invoice that has taken money must not just be cancelled ──────────
console.log("\nCancelling an invoice that has taken money");
const c2 = await completion(20_000_00, "JOB-2");
const inv2 = await invoiceFor(c2, 20_000_00);

const { error: payErr } = await db.rpc("record_receipt", {
  p_payer_party_id: party.id, p_amount_paise: 5_000_00,
  p_received_on: "2026-07-01", p_method: "bank",
  p_allocations: [{ invoice_id: inv2.invoice_id, amount_paise: 5_000_00 }],
});
if (payErr) throw new Error(`part payment: ${payErr.message}`);

const { error: cancelPaidErr } = await db.rpc("cancel_invoice", {
  p_invoice_id: inv2.invoice_id, p_reason: "Customer disputed it",
});
check("cancelling a part-paid invoice is REFUSED",
  cancelPaidErr !== null,
  cancelPaidErr ? cancelPaidErr.message : "ACCEPTED — the receipt is now allocated to a void invoice");

const { data: inv2Row } = await db.from("invoices").select("status").eq("id", inv2.invoice_id).single();
check("so the invoice is still issued and the money still has a home",
  inv2Row?.status === "issued", `status is ${inv2Row?.status}`);

// ── 3. A cancelled invoice stops counting as money owed ────────────────────
console.log("\nCancelling an unpaid invoice");
const c3 = await completion(30_000_00, "JOB-3");
const inv3 = await invoiceFor(c3, 30_000_00);

const { data: outBefore } = await db.from("party_outstanding")
  .select("amount_outstanding_paise").eq("party_id", party.id).single();

const { error: cancelErr } = await db.rpc("cancel_invoice", {
  p_invoice_id: inv3.invoice_id, p_reason: "Raised in error",
});
check("an unpaid invoice can be cancelled", cancelErr === null, cancelErr?.message);

const { data: outAfter } = await db.from("party_outstanding")
  .select("amount_outstanding_paise").eq("party_id", party.id).single();
const dropped = (outBefore?.amount_outstanding_paise ?? 0) - (outAfter?.amount_outstanding_paise ?? 0);
check("and it stops being counted as outstanding",
  dropped === 35_400_00,
  `outstanding fell by ${dropped}, expected 3540000 (30,000 + 18%)`);

// ── 4. Cancelled work becomes genuinely re-billable ────────────────────────
console.log("\nRe-billing the work that was cancelled");
const { data: c3Row } = await db.from("service_completions").select("status").eq("id", c3).single();
check("the completion is reopened", c3Row?.status === "completed", `status is ${c3Row?.status}`);

let rebillErr = null;
try {
  await invoiceFor(c3, 30_000_00);
} catch (e) {
  rebillErr = e;
}
check("and it can actually be invoiced again",
  rebillErr === null,
  rebillErr ? `${rebillErr.message} — the old invoice_lines row still blocks it` : "");

console.log(`\n${failures.length === 0 ? "PASS" : "FAIL"} — ${passed} passed, ${failures.length} failed`);
if (failures.length) process.exit(1);
