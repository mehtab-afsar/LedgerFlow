/**
 * Two org-crossing moves on expenses, attempted rather than reasoned about.
 *
 * This script is the reason migration 14's header can distinguish a real bug
 * from a convention breach. Run against the PRE-FIX schema it fails on
 * exactly one assertion — the cross-org party reference — and passes the
 * cross-tenant update, because PostgreSQL applies an UPDATE policy's USING
 * expression to the new row when WITH CHECK is omitted.
 *
 * That is the whole argument for attempting an attack instead of reading the
 * policy and deciding it looks wrong.
 *
 *   npx supabase start && npm run db:reset
 *   node scripts/verify-expenses-tenancy.mjs
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

console.log("\nLedgerFlow — expenses cross-tenant write\n");

const a = await signIn(`attacker+${RUN}@lf.test`);
const b = await signIn(`victim+${RUN}@lf.test`);

const { data: orgA, error: eA } = await a.rpc("create_organisation", {
  p_legal_name: `Attacker Logistics ${RUN}`, p_gstin: `29AAAAA0000A1Z${RUN.slice(-1)}`, p_transin: null, p_pan: null, p_state_code: "29", p_address: null,
}).single();
if (eA) throw new Error(`org A: ${eA.message}`);
const { data: orgB, error: eB } = await b.rpc("create_organisation", {
  p_legal_name: `Victim Logistics ${RUN}`, p_gstin: `27BBBBB0000B1Z${RUN.slice(-1)}`, p_transin: null, p_pan: null, p_state_code: "27", p_address: null,
}).single();
if (eB) throw new Error(`org B: ${eB.message}`);

const orgAId = orgA.org_id ?? orgA.id;
const orgBId = orgB.org_id ?? orgB.id;

// The attacker's own expense, legitimately created.
const { data: expense, error: insErr } = await a.from("expenses").insert({
  org_id: orgAId, category: "fuel", description: "Diesel", amount_paise: 500000,
  incurred_on: "2026-06-01",
}).select("id").single();
check("an expense can be created in one's own org", !insErr && !!expense, insErr?.message);

// THE ATTACK: move it into the victim's tenant.
const { error: moveErr } = await a.from("expenses")
  .update({ org_id: orgBId }).eq("id", expense.id);
check("moving an expense into another org is REFUSED",
  moveErr !== null && /policy|violates/i.test(moveErr?.message ?? ""),
  moveErr ? moveErr.message : "the update was ACCEPTED — the hole is still open");

// And nothing landed in the victim's books.
const { data: victimSees } = await b.from("expenses").select("id, amount_paise");
check("the victim's expenses are untouched", (victimSees ?? []).length === 0, JSON.stringify(victimSees));

const { data: stillMine } = await a.from("expenses").select("id, org_id");
check("and the attacker still has their own row, unmoved",
  stillMine?.length === 1 && stillMine[0].org_id === orgAId, JSON.stringify(stillMine));

// The second issue: referencing a stranger's party.
// Created as the victim, not the service role: LedgerFlow grants service_role
// nothing on parties, and a silent null here would make the next assertion
// vacuous rather than failing.
const { data: victimParty, error: vpErr } = await b.from("parties").insert({
  org_id: orgBId, name: "Victim's Customer", state_code: "27",
}).select("id").single();
if (vpErr) throw new Error(`victim party: ${vpErr.message}`);

const { error: partyErr } = await a.from("expenses").insert({
  org_id: orgAId, category: "vendor", amount_paise: 100000,
  incurred_on: "2026-06-02", party_id: victimParty.id,
});
check("attaching an expense to another org's party is REFUSED",
  partyErr !== null,
  partyErr ? partyErr.message : "the insert was ACCEPTED — cross-org party reference still possible");

// A party in one's OWN org still works, so the constraint isn't just blocking everything.
const { data: ownParty, error: opErr } = await a.from("parties").insert({
  org_id: orgAId, name: "My Customer", state_code: "29",
}).select("id").single();
if (opErr) throw new Error(`own party: ${opErr.message}`);
const { error: okErr } = await a.from("expenses").insert({
  org_id: orgAId, category: "vendor", amount_paise: 100000,
  incurred_on: "2026-06-02", party_id: ownParty.id,
});
check("but a party in one's own org still works", okErr === null, okErr?.message);

console.log(`\n${failures.length === 0 ? "PASS" : "FAIL"} — ${passed} passed, ${failures.length} failed`);
if (failures.length) process.exit(1);
