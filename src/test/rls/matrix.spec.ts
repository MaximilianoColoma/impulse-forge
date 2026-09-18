import { beforeAll, describe, expect, it } from "vitest";
// @ts-expect-error node built-ins are available in the Vitest runtime
import { createHash, createHmac } from "crypto";
// @ts-expect-error node built-ins are available in the Vitest runtime
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
// @ts-expect-error node built-ins are available in the Vitest runtime
import { resolve } from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { MATRIX_CASES, type ActorKey, type MatrixTable } from "./matrix.cases";

declare const process: { cwd: () => string; env: Record<string, string | undefined> };

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
const FIXTURES_PATH = resolve(process.cwd(), "docs/v2/petri/fixtures/rls-fixtures.json");
const SNAP_DIR = resolve(process.cwd(), "docs/v2/petri/snapshots");
const SNAP_LATEST = resolve(SNAP_DIR, "rls-matrix.latest.json");

const canRun =
  !!SUPABASE_URL &&
  !!ANON_KEY &&
  !!JWT_SECRET &&
  existsSync(FIXTURES_PATH) &&
  /localhost|127\.0\.0\.1|supabase\.internal|kong:8000/.test(SUPABASE_URL);

interface Fixtures {
  users: Record<Exclude<ActorKey, "anon">, string>;
  actors: Record<Exclude<ActorKey, "anon">, string>;
  spaces: Record<string, string>;
  projects: Record<string, string>;
  impulses: Record<string, string>;
}

function base64url(value: string | Uint8Array): string {
  return Buffer.from(value).toString("base64url");
}

function mintJwt(sub: string, secret: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({
    sub,
    role: "authenticated",
    aud: "authenticated",
    iss: "supabase",
    iat: now,
    exp: now + 3600,
  }));
  const signature = base64url(createHmac("sha256", secret).update(`${header}.${payload}`).digest());
  return `${header}.${payload}.${signature}`;
}

const suite = canRun ? describe : describe.skip;

suite("RLS runtime matrix (impulses, projects, spaces)", () => {
  let fixtures: Fixtures;
  const clients = new Map<ActorKey, SupabaseClient>();

  beforeAll(() => {
    fixtures = JSON.parse(readFileSync(FIXTURES_PATH, "utf8"));
    for (const actor of ["owner", "member", "outsider"] as const) {
      const jwt = mintJwt(fixtures.users[actor], JWT_SECRET!);
      clients.set(actor, createClient(SUPABASE_URL!, ANON_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${jwt}` } },
      }));
    }
    clients.set("anon", createClient(SUPABASE_URL!, ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    }));
  });

  const results: Array<{ id: string; observed: "allow" | "deny" | "silent"; expected: string }> = [];

  function rowId(table: MatrixTable, label: string): string {
    return fixtures[table][label];
  }

  function insertPayload(table: MatrixTable, actor: ActorKey) {
    const authenticatedActor = actor === "anon" ? "outsider" : actor;
    const suffix = `${actor}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    if (table === "projects") {
      return {
        name: `matrix-project-${suffix}`,
        user_id: fixtures.users[authenticatedActor],
        space_id: fixtures.spaces[`${authenticatedActor}-personal-space`],
      };
    }
    if (table === "impulses") {
      return {
        content: `matrix-impulse-${suffix}`,
        user_id: fixtures.users[authenticatedActor],
        space_id: fixtures.spaces[`${authenticatedActor}-personal-space`],
      };
    }
    return {
      name: `matrix-space-${suffix}`,
      owner_actor_id: fixtures.actors[authenticatedActor],
      visibility: "private",
    };
  }

  function updatePayload(table: MatrixTable) {
    if (table === "projects") return { name: "matrix-update-probe" };
    if (table === "impulses") return { content: "matrix-update-probe" };
    return { name: "matrix-update-probe" };
  }

  for (const testCase of MATRIX_CASES) {
    const id = `${testCase.table}.${testCase.action}.${testCase.actor}.${testCase.row ?? "*"}`;
    it(id, async () => {
      const client = clients.get(testCase.actor)!;
      let observed: "allow" | "deny" | "silent" = "silent";

      if (testCase.action === "select") {
        const result = await client
          .from(testCase.table)
          .select("id")
          .eq("id", rowId(testCase.table, testCase.row!));
        observed = result.error ? "deny" : result.data?.length ? "allow" : "silent";
      } else if (testCase.action === "insert") {
        const result = await client
          .from(testCase.table)
          .insert(insertPayload(testCase.table, testCase.actor))
          .select("id");
        observed = result.error ? "deny" : result.data?.length ? "allow" : "silent";
        const createdId = result.data?.[0]?.id;
        if (createdId) await client.from(testCase.table).delete().eq("id", createdId);
      } else if (testCase.action === "update") {
        const result = await client
          .from(testCase.table)
          .update(updatePayload(testCase.table))
          .eq("id", rowId(testCase.table, testCase.row!))
          .select("id");
        observed = result.error ? "deny" : result.data?.length ? "allow" : "silent";
      } else {
        const result = await client
          .from(testCase.table)
          .delete()
          .eq("id", rowId(testCase.table, testCase.row!))
          .select("id");
        observed = result.error ? "deny" : result.data?.length ? "allow" : "silent";
      }

      results.push({ id, observed, expected: testCase.expect });
      if (testCase.expect === "allow") expect(observed).toBe("allow");
      else expect(observed).not.toBe("allow");
    });
  }

  it("writes a deterministic snapshot", () => {
    results.sort((a, b) => a.id.localeCompare(b.id));
    const hash = createHash("sha256").update(JSON.stringify(results)).digest("hex").slice(0, 12);
    const snapshot = {
      generatedAt: new Date().toISOString(),
      hash,
      cases: results,
      counts: {
        total: results.length,
        allow: results.filter((r) => r.observed === "allow").length,
        deny: results.filter((r) => r.observed === "deny").length,
        silent: results.filter((r) => r.observed === "silent").length,
      },
    };
    mkdirSync(SNAP_DIR, { recursive: true });
    writeFileSync(SNAP_LATEST, JSON.stringify(snapshot, null, 2) + "\n");
    writeFileSync(resolve(SNAP_DIR, `rls-matrix-${hash}.json`), JSON.stringify(snapshot, null, 2) + "\n");
    expect(hash).toMatch(/^[a-f0-9]{12}$/);
  });
});

if (!canRun) {
  console.warn(
    "[RLS matrix] skipped: seed a local Supabase with scripts/petri/rls-fixtures.mjs " +
    "and set SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_JWT_SECRET.",
  );
}
