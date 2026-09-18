#!/usr/bin/env node
/**
 * T2.5.a · RLS Schema-Contract snapshot generator.
 *
 * Queries the live Supabase database via psql (uses the standard PG* env vars)
 * and writes a deterministic JSON snapshot of:
 *   • every public table's rowsecurity flag
 *   • every RLS policy (name, cmd, qual, with_check)
 *   • the presence of tenancy columns (space_id / user_id) per domain table
 *
 * The snapshot is what the vitest contract (src/test/rls/schema.contract.spec.ts)
 * validates. Regenerate whenever a migration touches policies.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const OUT_DIR = resolve(ROOT, "docs/v2/petri/snapshots");
const OUT_LATEST = resolve(OUT_DIR, "rls-contract.latest.json");

function psqlJson(sql) {
  // Aggregate rows into a single JSON array on the DB side so multiline
  // pg_policies.qual expressions round-trip intact.
  const wrapped = `SELECT coalesce(json_agg(t), '[]'::json)::text FROM (${sql}) t;`;
  const out = execFileSync("psql", ["-Atc", wrapped], { encoding: "utf8" });
  return JSON.parse(out.trim());
}

const tables = psqlJson(
  "SELECT tablename, rowsecurity AS rls FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
);

const policies = psqlJson(
  "SELECT tablename, policyname, cmd, coalesce(qual,'') AS qual, coalesce(with_check,'') AS with_check FROM pg_policies WHERE schemaname='public' ORDER BY tablename, policyname"
);

const columnRows = psqlJson(
  "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' AND column_name IN ('space_id','user_id','actor_id','team_id') ORDER BY table_name, column_name"
);
const tenancyColumns = {};
for (const { table_name, column_name } of columnRows) {
  tenancyColumns[table_name] ??= [];
  tenancyColumns[table_name].push(column_name);
}

const snapshot = {
  generatedAt: new Date().toISOString(),
  tables,
  policies,
  tenancyColumns,
};
snapshot.hash = createHash("sha256")
  .update(JSON.stringify({ tables, policies, tenancyColumns }))
  .digest("hex")
  .slice(0, 12);

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_LATEST, JSON.stringify(snapshot, null, 2) + "\n");
const versioned = resolve(OUT_DIR, `rls-contract-${snapshot.hash}.json`);
writeFileSync(versioned, JSON.stringify(snapshot, null, 2) + "\n");

console.log(
  `RLS contract snapshot → ${OUT_LATEST}\n  hash=${snapshot.hash} tables=${tables.length} policies=${policies.length}`
);
