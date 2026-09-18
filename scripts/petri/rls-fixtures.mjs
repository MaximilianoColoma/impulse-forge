#!/usr/bin/env node
/** Seeds the local-only RLS matrix for impulses, projects and spaces. */
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT_PATH = resolve(ROOT, "docs/v2/petri/fixtures/rls-fixtures.json");
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(2);
}
if (!/localhost|127\.0\.0\.1|supabase\.internal|kong:8000/.test(url)) {
  console.error(`Refusing to seed non-local Supabase: ${url}`);
  process.exit(2);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const PASSWORD = "rls-matrix-fixture-pw-9f2a";

async function ensureUser(email) {
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listError) throw listError;
  const existing = listed.users.find((user) => user.email === email);
  if (existing) return existing;
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error) throw error;
  return data.user;
}

async function insertOne(table, row) {
  const { data, error } = await admin.from(table).insert(row).select("id").single();
  if (error) throw error;
  return data.id;
}

async function main() {
  const roster = [
    ["owner", "rls-owner@petri.local"],
    ["member", "rls-member@petri.local"],
    ["outsider", "rls-outsider@petri.local"],
  ];
  const users = {};
  const actors = {};
  for (const [key, email] of roster) {
    const user = await ensureUser(email);
    users[key] = user.id;
    const { data: actor, error } = await admin.from("actors").select("id").eq("user_id", user.id).eq("kind", "human").single();
    if (error) throw error;
    actors[key] = actor.id;
  }

  const run = Date.now().toString(36);
  const teamId = await insertOne("teams", { name: `Petri RLS Team ${run}`, owner_actor_id: actors.owner });
  const { error: memberError } = await admin.from("team_members").insert([
    { team_id: teamId, actor_id: actors.owner, role: "owner" },
    { team_id: teamId, actor_id: actors.member, role: "member" },
  ]);
  if (memberError) throw memberError;

  const spaceRows = {
    "owner-personal-space": { name: `owner-personal-${run}`, visibility: "private", owner_actor_id: actors.owner, is_personal: true },
    "member-personal-space": { name: `member-personal-${run}`, visibility: "private", owner_actor_id: actors.member, is_personal: true },
    "outsider-personal-space": { name: `outsider-personal-${run}`, visibility: "private", owner_actor_id: actors.outsider, is_personal: true },
    "team-space": { name: `team-space-${run}`, visibility: "team", owner_actor_id: actors.owner, team_id: teamId },
    "public-space": { name: `public-space-${run}`, visibility: "public", owner_actor_id: actors.owner },
  };
  const spaces = {};
  for (const [label, row] of Object.entries(spaceRows)) spaces[label] = await insertOne("spaces", row);

  const projectRows = {
    "owner-personal-project": { name: "owner-personal-project", user_id: users.owner, space_id: spaces["owner-personal-space"] },
    "team-project": { name: "team-project", user_id: users.owner, space_id: spaces["team-space"] },
    "public-project": { name: "public-project", user_id: users.owner, space_id: spaces["public-space"] },
    "outsider-project": { name: "outsider-project", user_id: users.outsider, space_id: spaces["outsider-personal-space"] },
  };
  const projects = {};
  for (const [label, row] of Object.entries(projectRows)) projects[label] = await insertOne("projects", row);

  const impulseRows = {
    "owner-personal-impulse": { content: "owner-personal-impulse", user_id: users.owner, space_id: spaces["owner-personal-space"] },
    "team-impulse": { content: "team-impulse", user_id: users.owner, space_id: spaces["team-space"] },
    "public-impulse": { content: "public-impulse", user_id: users.owner, space_id: spaces["public-space"] },
    "outsider-impulse": { content: "outsider-impulse", user_id: users.outsider, space_id: spaces["outsider-personal-space"] },
  };
  const impulses = {};
  for (const [label, row] of Object.entries(impulseRows)) impulses[label] = await insertOne("impulses", row);

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), users, actors, teamId, spaces, projects, impulses }, null, 2) + "\n");
  console.log(`RLS fixtures -> ${OUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
