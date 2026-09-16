import { allSql, loadMigrations } from "./helpers/migrations";

/**
 * LedgerFlow has no public surface at all — no tracking links, no share
 * tokens, nothing an unauthenticated caller may reach. The expected anon
 * surface is therefore EMPTY, and adding anything to it means editing this
 * test on purpose rather than by accident.
 *
 * The mechanism matters: rather than checking that individual GRANT statements
 * are absent, this replays every GRANT and REVOKE in migration order into a
 * Set, so a later REVOKE cancels an earlier GRANT. What is asserted is the
 * FINAL reachable surface, which is the only thing that is actually true of
 * the database.
 */

/**
 * Tables the service role is allowed to reach at all.
 *
 * EMPTY, and deliberately so. lib/supabase/admin.ts exists but nothing calls
 * it, so no table needs service-role access today — and Supabase's default
 * privileges give a new table only REFERENCES/TRIGGER/TRUNCATE to
 * service_role anyway, which is to say no DML and no SELECT.
 *
 * This is the opposite of the sibling Moonbook rule, which requires every
 * table to grant the service role something because its import and support
 * paths genuinely use it. The divergence is the point: a guard should encode
 * the decision this codebase has actually made, not the one next door made.
 * Here the decision is that RLS is the only way in, for everyone.
 *
 * If a service-role path is built later — signed storage URLs, a PDF cache, a
 * seed script — it will fail with "permission denied", and the fix is to add
 * the table here AND write the grant, both on purpose. That is a feature: a
 * privilege that bypasses every tenancy policy in the schema should never be
 * acquired by accident.
 */
const SERVICE_ROLE_MAY_REACH = new Set<string>([]);

interface Reachable {
  functions: string[];
  tables: string[];
}

function anonReachable(): Reachable {
  const functions = new Set<string>();
  const tables = new Set<string>();

  for (const m of loadMigrations()) {
    for (const stmt of m.sql.split(";")) {
      const s = stmt.trim();
      if (!s) continue;

      const isGrant = /^grant\s/i.test(s);
      const isRevoke = /^revoke\s/i.test(s);
      if (!isGrant && !isRevoke) continue;
      if (!/\banon\b/i.test(s)) continue;

      const fn = /on\s+function\s+(public\.[a-z_]+)/i.exec(s);
      const tbl = /on\s+(?:table\s+)?(public\.[a-z_]+)\s+(?:to|from)/i.exec(s);

      if (fn) {
        if (isGrant) functions.add(fn[1]);
        else functions.delete(fn[1]);
      } else if (tbl) {
        if (isGrant) tables.add(tbl[1]);
        else tables.delete(tbl[1]);
      }
    }
  }

  return { functions: [...functions].sort(), tables: [...tables].sort() };
}

function createdTables(): string[] {
  const matches = allSql().matchAll(/create\s+table\s+if\s+not\s+exists\s+(public\.[a-z_]+)/gi);
  return [...new Set([...matches].map((m) => m[1]))].sort();
}

describe("anon grants", () => {
  it("has migrations to check (guards must never pass vacuously)", () => {
    expect(loadMigrations().length).toBeGreaterThan(0);
  });

  it("anon can execute no function", () => {
    expect(anonReachable().functions).toEqual([]);
  });

  it("anon can reach no table", () => {
    expect(anonReachable().tables).toEqual([]);
  });

  it("no table grants the service role anything it has not been listed for", () => {
    // The service role bypasses RLS completely, so a grant to it is a hole
    // through every tenancy policy in this schema at once. Nothing uses it
    // today; a grant appearing without a matching entry above means one was
    // added without the decision being made.
    const sql = allSql();
    const granted = createdTables().filter((t) => {
      const re = new RegExp(`grant\\s+[a-z,\\s]+\\s+on\\s+${t.replace(".", "\\.")}\\s+to[^;]*service_role`, "i");
      return re.test(sql);
    });
    expect(granted.filter((t) => !SERVICE_ROLE_MAY_REACH.has(t))).toEqual([]);
  });

  it("every created table explicitly revokes from anon", () => {
    const sql = allSql();
    const missing = createdTables().filter((t) => {
      const re = new RegExp(`revoke\\s+all\\s+on\\s+${t.replace(".", "\\.")}\\s+from[^;]*anon`, "i");
      return !re.test(sql);
    });
    expect(missing).toEqual([]);
  });
});
