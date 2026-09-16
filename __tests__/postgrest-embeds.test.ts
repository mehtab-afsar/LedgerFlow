import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { allSql, loadMigrations } from "./helpers/migrations";

/**
 * An ambiguous PostgREST embed is an ERROR, not a fallback.
 *
 * Where two foreign keys reach the same table — `invoices` reaches `parties`
 * by both bill_to_party_id and deliver_to_party_id — a bare
 * `.select("...parties(name)")` cannot be resolved, and PostgREST answers
 * PGRST200 rather than guessing. Any caller that destructured `{ data }`
 * without checking `error` then renders a permanently empty list that looks
 * exactly like "no rows yet".
 *
 * AMBIGUITY IS PER PAIR, NOT PER TABLE. `expenses` reaches `parties` by one
 * key only, so `parties(name)` there is unambiguous and correct. A guard that
 * flagged every embed of `parties` anywhere would report fifty findings, all
 * but a handful false, and be switched off within a week. So this resolves the
 * SOURCE table of each query — the `.from("…")` the `.select(…)` hangs off —
 * and only requires a named key where that specific pair is ambiguous.
 *
 * KNOWN LIMIT: only top-level embeds are checked. A nested embed resolves
 * against the embedded table rather than the root, and matching that reliably
 * needs a parser rather than a regex. Nested embeds are rare here and the
 * false-negative is preferable to the fifty false positives.
 */

const SOURCE_ROOTS = ["app", "features", "lib"];

/** For each source table, the targets more than one of its foreign keys reach. */
function ambiguousBySource(): Map<string, Set<string>> {
  const counts = new Map<string, Map<string, number>>();

  const tableBlocks = allSql().matchAll(
    /create\s+table\s+if\s+not\s+exists\s+public\.([a-z_]+)\s*\(([\s\S]*?)\n\);/gi,
  );
  for (const [, source, body] of tableBlocks) {
    const perSource = counts.get(source) ?? new Map<string, number>();
    for (const [, target] of body.matchAll(/references\s+public\.([a-z_]+)\s*\(/gi)) {
      perSource.set(target, (perSource.get(target) ?? 0) + 1);
    }
    counts.set(source, perSource);
  }

  const out = new Map<string, Set<string>>();
  for (const [source, targets] of counts) {
    const ambiguous = new Set(
      [...targets.entries()].filter(([, n]) => n > 1).map(([t]) => t),
    );
    if (ambiguous.size > 0) out.set(source, ambiguous);
  }
  return out;
}

function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.tsx?$/.test(path)) out.push(path);
    }
  };
  for (const root of SOURCE_ROOTS) {
    try {
      walk(root);
    } catch {
      // A root that doesn't exist yet is not a failure.
    }
  }
  return out;
}

/** Every `.from("x") … .select("…")` pair in a file, with its select string. */
function queries(src: string): { source: string; select: string }[] {
  const out: { source: string; select: string }[] = [];
  const re = /\.from\(\s*["'`]([a-z_]+)["'`]\s*\)[\s\S]{0,120}?\.select\(\s*(["'`])([\s\S]*?)\2/g;
  for (const m of src.matchAll(re)) out.push({ source: m[1], select: m[3] });
  return out;
}

describe("PostgREST embeds", () => {
  const ambiguous = ambiguousBySource();

  it("has migrations to check (guards must never pass vacuously)", () => {
    expect(loadMigrations().length).toBeGreaterThan(0);
  });

  it("found at least one genuinely ambiguous pair", () => {
    // Anti-vacuous. If this empties, the rule below stops meaning anything
    // and should be deleted rather than left passing.
    expect(ambiguous.size).toBeGreaterThan(0);
  });

  it("found queries to check", () => {
    const total = sourceFiles().reduce((n, f) => n + queries(readFileSync(f, "utf8")).length, 0);
    expect(total).toBeGreaterThan(0);
  });

  it("every embed of a pair reachable by two keys names the key", () => {
    const offenders: { file: string; from: string; embed: string }[] = [];

    for (const file of sourceFiles()) {
      const src = readFileSync(file, "utf8");
      for (const { source, select } of queries(src)) {
        const targets = ambiguous.get(source);
        if (!targets) continue;

        for (const target of targets) {
          // `target(` is an embed; `target!some_fkey(` is a named one.
          const bare = new RegExp(`(^|[,\\s])${target}\\s*\\(`, "g");
          if (bare.test(select) && !new RegExp(`${target}\\s*!`).test(select)) {
            offenders.push({ file, from: source, embed: `${target}(` });
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
