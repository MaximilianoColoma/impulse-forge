#!/usr/bin/env node
// Render all phase JSONs into a single Mermaid flowchart.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const PHASES_DIR = join(ROOT, "docs/v2/petri/phases");
const OUT = join(ROOT, "docs/v2/petri/graph.mmd");

const DIM_CLASS = {
  code: "dimCode", data: "dimData", security: "dimSec",
  ux: "dimUx", ops: "dimOps", product: "dimProd",
};

function nodeId(s) { return s.replace(/[^A-Za-z0-9_]/g, "_"); }

const phases = readdirSync(PHASES_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(join(PHASES_DIR, f), "utf8")))
  .sort((a, b) => a.id.localeCompare(b.id));

const lines = ["flowchart LR"];
lines.push("  classDef place fill:#1e293b,color:#e2e8f0,stroke:#475569;");
lines.push("  classDef fault fill:#7f1d1d,color:#fee2e2,stroke:#ef4444;");
lines.push("  classDef dimCode fill:#1e3a8a,color:#dbeafe,stroke:#3b82f6;");
lines.push("  classDef dimData fill:#064e3b,color:#d1fae5,stroke:#10b981;");
lines.push("  classDef dimSec fill:#78350f,color:#fef3c7,stroke:#f59e0b;");
lines.push("  classDef dimUx fill:#4c1d95,color:#ede9fe,stroke:#8b5cf6;");
lines.push("  classDef dimOps fill:#334155,color:#f1f5f9,stroke:#94a3b8;");
lines.push("  classDef dimProd fill:#831843,color:#fce7f3,stroke:#ec4899;");

for (const ph of phases) {
  lines.push(`  subgraph ${nodeId(ph.id)} ["${ph.id} · ${ph.title}"]`);
  for (const p of ph.places) lines.push(`    ${nodeId(p)}(("${p}")):::place`);
  for (const p of ph.faultPlaces ?? []) lines.push(`    ${nodeId(p)}(("⊘ ${p}")):::fault`);
  for (const t of ph.transitions) {
    const cls = DIM_CLASS[t.dimension] ?? "dimOps";
    lines.push(`    ${nodeId(t.id)}["${t.id} · ${t.title}"]:::${cls}`);
    for (const g of t.guardPlaces ?? []) lines.push(`    ${nodeId(g)} --> ${nodeId(t.id)}`);
    for (const o of t.outputPlaces ?? []) lines.push(`    ${nodeId(t.id)} --> ${nodeId(o)}`);
    for (const f of t.faultPlaces ?? []) lines.push(`    ${nodeId(t.id)} -.-> ${nodeId(f)}`);
    for (const c of t.compensations ?? []) lines.push(`    ${nodeId(c)} -.compensate.-> ${nodeId(t.id)}`);
  }
  lines.push("  end");
}

// Cross-phase requires
for (const ph of phases) {
  for (const req of ph.requires ?? []) {
    const source = phases.find((p) => p.goalPlace === req || p.places.includes(req));
    if (source) lines.push(`  ${nodeId(req)} ==> ${nodeId(ph.id)}`);
  }
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, lines.join("\n") + "\n");
console.log(`Petri render → ${OUT}`);
