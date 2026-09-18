/**
 * T2.5.a · RLS Schema-Contract (static, snapshot-based).
 *
 * Reads the deterministic snapshot produced by
 *   `node scripts/petri/rls-contract.mjs`
 * and asserts the invariants that make Ω2 P_zero_trust_reads observable:
 *
 *  1. Every public table has RLS enabled.
 *  2. Every domain table has at least one SELECT policy.
 *  3. Every non-trivial SELECT/UPDATE/DELETE policy references at least one
 *     approved guard function (auth.uid, has_role, current_actor_id,
 *     has_space_access, is_team_member) — no silent public reads.
 *  4. Tables that are intentionally public must be listed in PUBLIC_TABLES.
 *  5. Every tenancy-relevant domain table exposes a scoping column
 *     (space_id or user_id).
 */
import { describe, it, expect } from "vitest";
// @ts-expect-error - node types are available at runtime via vitest
import { readFileSync, existsSync } from "fs";
// @ts-expect-error - node types are available at runtime via vitest
import { resolve } from "path";
declare const process: { cwd: () => string };

type Policy = {
  tablename: string;
  policyname: string;
  cmd: string;
  qual: string;
  with_check: string;
};
type Snapshot = {
  hash: string;
  generatedAt: string;
  tables: Array<{ tablename: string; rls: boolean }>;
  policies: Policy[];
  tenancyColumns: Record<string, string[]>;
};

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  "docs/v2/petri/snapshots/rls-contract.latest.json",
);
const TENANCY_BACKBONE_MIGRATION_PATH = resolve(
  process.cwd(),
  "supabase/migrations/20260715140516_ed0cb397-2212-4c9a-8e89-c0adcd5138cb.sql",
);

// Tables that are intentionally readable by anyone (documented exceptions).
const PUBLIC_TABLES = new Set<string>([
  "community_templates", // marketplace listings
  "user_template_likes", // public like counts
  "waitlist_subscribers", // insert-only public form, still RLS-guarded on read
]);

// Tables we do not treat as user-tenancy scoped (system/reference tables).
const NON_TENANCY_TABLES = new Set<string>([
  "profiles",
  "user_roles",
  "actors",
  "teams",
  "team_members",
  "spaces",
  "space_access",
  "actor_credentials",
  "audit_log",
  "unassigned_rows",
  "community_templates",
  "user_template_likes",
  "waitlist_subscribers",
  "consent_status_options",
  "contact_status_options",
  "impulse_history",
]);

const APPROVED_GUARDS = [
  "auth.uid()",
  "has_role(",
  "current_actor_id()",
  "has_space_access(",
  "is_team_member(",
];

const loadSnapshot = (): Snapshot => {
  if (!existsSync(SNAPSHOT_PATH)) {
    throw new Error(
      `RLS contract snapshot missing at ${SNAPSHOT_PATH}. ` +
        `Run: node scripts/petri/rls-contract.mjs`,
    );
  }
  return JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8"));
};

const usesApprovedGuard = (expr: string): boolean => {
  if (!expr) return false;
  return APPROVED_GUARDS.some((g) => expr.includes(g));
};

describe("RLS schema contract (T2.5.a)", () => {
  const snap = loadSnapshot();

  it("bootstraps contacts before the tenancy migration scopes it", () => {
    const migration = readFileSync(TENANCY_BACKBONE_MIGRATION_PATH, "utf8");
    const createContacts = migration.indexOf(
      "CREATE TABLE IF NOT EXISTS public.contacts",
    );
    const alterContacts = migration.indexOf("ALTER TABLE public.contacts");

    expect(createContacts).toBeGreaterThanOrEqual(0);
    expect(alterContacts).toBeGreaterThan(createContacts);
  });

  it("snapshot is fresh (has hash + generatedAt)", () => {
    expect(snap.hash).toMatch(/^[a-f0-9]{12}$/);
    expect(new Date(snap.generatedAt).toString()).not.toBe("Invalid Date");
  });

  it("every public table has RLS enabled", () => {
    const withoutRls = snap.tables.filter((t) => !t.rls).map((t) => t.tablename);
    expect(withoutRls, `RLS disabled on: ${withoutRls.join(", ")}`).toEqual([]);
  });

  it("every table has at least one SELECT policy or is documented as public", () => {
    const byTable = new Map<string, Policy[]>();
    for (const p of snap.policies) {
      const arr = byTable.get(p.tablename) ?? [];
      arr.push(p);
      byTable.set(p.tablename, arr);
    }
    const missingSelect: string[] = [];
    for (const { tablename } of snap.tables) {
      const policies = byTable.get(tablename) ?? [];
      const hasSelect = policies.some(
        (p) => p.cmd === "SELECT" || p.cmd === "ALL",
      );
      if (!hasSelect) missingSelect.push(tablename);
    }
    expect(
      missingSelect,
      `Tables without SELECT/ALL policy: ${missingSelect.join(", ")}`,
    ).toEqual([]);
  });

  it("no SELECT policy grants access without an approved guard", () => {
    const violations: string[] = [];
    for (const p of snap.policies) {
      if (p.cmd !== "SELECT" && p.cmd !== "ALL") continue;
      const qual = p.qual.trim();
      if (qual === "" || qual === "true") {
        if (!PUBLIC_TABLES.has(p.tablename)) {
          violations.push(`${p.tablename}.${p.policyname} → unguarded (${qual || "empty"})`);
        }
        continue;
      }
      if (!usesApprovedGuard(qual)) {
        violations.push(`${p.tablename}.${p.policyname} → no approved guard in qual`);
      }
    }
    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("every UPDATE/DELETE policy is guarded", () => {
    const violations: string[] = [];
    for (const p of snap.policies) {
      if (p.cmd !== "UPDATE" && p.cmd !== "DELETE") continue;
      const expr = (p.qual || p.with_check || "").trim();
      if (!expr || expr === "true") {
        violations.push(`${p.tablename}.${p.policyname} → unguarded ${p.cmd}`);
      } else if (!usesApprovedGuard(expr)) {
        violations.push(`${p.tablename}.${p.policyname} → no approved guard`);
      }
    }
    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("tenancy-relevant tables carry a scoping column", () => {
    const violations: string[] = [];
    for (const { tablename } of snap.tables) {
      if (NON_TENANCY_TABLES.has(tablename)) continue;
      const cols = snap.tenancyColumns[tablename] ?? [];
      const hasScope =
        cols.includes("space_id") ||
        cols.includes("user_id") ||
        cols.includes("actor_id");
      if (!hasScope) {
        violations.push(`${tablename} → missing scope column (space_id/user_id/actor_id)`);
      }
    }
    expect(violations, violations.join("\n")).toEqual([]);
  });
});
