#!/usr/bin/env node
// Petri verify: validates all phase JSONs, computes token status, writes status.json.
// Exits non-zero when a required proof is missing (except when a phase declares no proofs yet).
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const PHASES_DIR = join(ROOT, "docs/v2/petri/phases");
const SNAP_DIR = join(ROOT, "docs/v2/petri/snapshots");
const STATUS_PATH = join(ROOT, "docs/v2/petri/status.json");

const args = new Set(process.argv.slice(2));
const dryFault = args.has("--dry-fault");
const phaseFilter = (() => {
  const i = process.argv.indexOf("--phase");
  return i >= 0 ? process.argv[i + 1] : null;
})();

function loadPhases() {
  if (!existsSync(PHASES_DIR)) return [];
  return readdirSync(PHASES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(PHASES_DIR, f), "utf8")));
}

// Minimal structural validation (no zod runtime for the script).
function validate(phase) {
  const errs = [];
  const req = ["id", "title", "goalPlace", "places", "transitions"];
  for (const k of req) if (!(k in phase)) errs.push(`missing ${k}`);
  if (!/^Ω[0-9]+$/u.test(phase.id ?? "")) errs.push("id must match Ω[0-9]+");
  for (const t of phase.transitions ?? []) {
    // Allows T2, T2.10, T2.10_A, T2.10_A_sweep, T2_R10A_purge_orphans …
    if (!/^T[0-9]+(\.[0-9]+)*([._][A-Za-z0-9]+)*$/.test(t.id)) errs.push(`bad transition id ${t.id}`);
    if (!Array.isArray(t.proof) || t.proof.length === 0) errs.push(`transition ${t.id} needs at least one proof`);
  }
  return errs;
}

function hash(obj) {
  return createHash("sha256").update(JSON.stringify(obj)).digest("hex").slice(0, 12);
}

const phases = loadPhases().filter((p) => !phaseFilter || p.id === phaseFilter);
const status = { generatedAt: new Date().toISOString(), phases: {}, faults: [] };
let hasError = false;

for (const phase of phases) {
  const errs = validate(phase);
  if (errs.length) {
    hasError = true;
    status.faults.push({ phase: phase.id, errs });
    continue;
  }
  const tokens = {};
  for (const p of phase.places) tokens[p] = { fired: false, proofs: [] };
  for (const p of phase.faultPlaces ?? []) tokens[p] = { fired: false, faultPlace: true };

  for (const t of phase.transitions) {
    // A transition is considered "fired" only when at least one proof of a
    // machine-checkable type is present. Manual proofs mark it "attested".
    const machine = t.proof.some((p) => p.type === "test" || p.type === "metric" || p.type === "flow");
    const attested = t.proof.length > 0;
    const state = machine ? "fired" : attested ? "attested" : "pending";
    for (const p of t.outputPlaces ?? []) {
      tokens[p] ??= { fired: false, proofs: [] };
      tokens[p].fired = state !== "pending";
      tokens[p].proofs.push({ transition: t.id, state, refs: t.proof.map((x) => `${x.type}:${x.ref}`) });
    }
  }

  const goal = tokens[phase.goalPlace]?.fired ?? false;
  const faultsOpen = (phase.faultPlaces ?? []).some((fp) => tokens[fp]?.fired);
  const complete = goal && !faultsOpen;

  status.phases[phase.id] = {
    title: phase.title,
    complete,
    goalPlace: phase.goalPlace,
    goalFired: goal,
    faultsOpen,
    tokens,
  };

  if (complete) {
    mkdirSync(SNAP_DIR, { recursive: true });
    const h = hash({ phase: phase.id, tokens });
    writeFileSync(join(SNAP_DIR, `${phase.id}-${h}.json`),
      JSON.stringify({ phase: phase.id, hash: h, firedAt: status.generatedAt, tokens }, null, 2));
  }
}

if (dryFault) {
  status.faults.push({ phase: "dry-run", errs: ["forced fault via --dry-fault"] });
  hasError = true;
}

mkdirSync(dirname(STATUS_PATH), { recursive: true });
writeFileSync(STATUS_PATH, JSON.stringify(status, null, 2));

const summary = Object.entries(status.phases)
  .map(([id, p]) => `${id} ${p.complete ? "✓" : "…"} (goal=${p.goalPlace})`).join("\n");
console.log(`Petri verify → ${STATUS_PATH}\n${summary || "(no phases)"}`);
if (status.faults.length) {
  console.error("Faults:", JSON.stringify(status.faults, null, 2));
}
process.exit(hasError ? 1 : 0);
