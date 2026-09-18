#!/usr/bin/env node
// Baseline capture (Ω1): reads real signals from the working tree so that
// later phases can diff against a stable snapshot. Any collector that cannot
// resolve returns `null` — the schema stays consistent either way.
import { writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const OUT = join(ROOT, "docs/v2/petri/snapshots/baseline.json");

function walk(dir, filter) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) out.push(...walk(full, filter));
    else if (filter(full)) out.push({ path: full, size: s.size });
  }
  return out;
}

function collectBundle() {
  const dist = join(ROOT, "dist");
  if (!existsSync(dist)) return { totalKb: null, initialKb: null, threshold: 500 };
  const assets = walk(join(dist, "assets"), (p) => p.endsWith(".js") || p.endsWith(".css"));
  const totalKb = Math.round(assets.reduce((a, f) => a + f.size, 0) / 1024);
  const entry = assets
    .filter((f) => /index-.*\.js$/.test(f.path))
    .sort((a, b) => b.size - a.size)[0];
  const initialKb = entry ? Math.round(entry.size / 1024) : null;
  return { totalKb, initialKb, threshold: 500 };
}

function collectTests() {
  const testFiles = walk(join(ROOT, "src"), (p) => /\.(test|spec)\.(t|j)sx?$/.test(p));
  return { files: testFiles.length, total: null, passing: null, coveragePct: null };
}

function collectEdgeFunctions() {
  const dir = join(ROOT, "supabase/functions");
  if (!existsSync(dir)) return { count: 0, avgP50Ms: null, avgP95Ms: null };
  const entries = readdirSync(dir).filter((n) => {
    const s = statSync(join(dir, n));
    return s.isDirectory() && !n.startsWith("_");
  });
  return { count: entries.length, avgP50Ms: null, avgP95Ms: null };
}

const baseline = {
  capturedAt: new Date().toISOString(),
  bundle: collectBundle(),
  tests: collectTests(),
  linter: { warnings: null, errors: null },
  edgeFunctions: collectEdgeFunctions(),
  db: { slowQueries: null },
  notes: "Ω1 collectors: bundle (dist/), tests (src globs), edgeFunctions (supabase/functions).",
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(baseline, null, 2));
console.log(`Petri baseline → ${OUT}`);
