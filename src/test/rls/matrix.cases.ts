export type ActorKey = "owner" | "member" | "outsider" | "anon";
export type Action = "select" | "insert" | "update" | "delete";
export type MatrixTable = "impulses" | "projects" | "spaces";

export interface MatrixCase {
  table: MatrixTable;
  action: Action;
  actor: ActorKey;
  row?: string;
  expect: "allow" | "deny";
  note?: string;
}

export const MATRIX_CASES: MatrixCase[] = [
  { table: "impulses", action: "select", actor: "owner", row: "owner-personal-impulse", expect: "allow" },
  { table: "impulses", action: "select", actor: "member", row: "team-impulse", expect: "allow" },
  { table: "impulses", action: "select", actor: "outsider", row: "owner-personal-impulse", expect: "deny" },
  { table: "impulses", action: "select", actor: "anon", row: "public-impulse", expect: "deny" },
  { table: "impulses", action: "insert", actor: "owner", expect: "allow" },
  { table: "impulses", action: "insert", actor: "anon", expect: "deny" },
  { table: "impulses", action: "update", actor: "outsider", row: "owner-personal-impulse", expect: "deny" },
  { table: "impulses", action: "delete", actor: "outsider", row: "owner-personal-impulse", expect: "deny" },

  { table: "projects", action: "select", actor: "owner", row: "owner-personal-project", expect: "allow" },
  { table: "projects", action: "select", actor: "member", row: "team-project", expect: "allow" },
  { table: "projects", action: "select", actor: "outsider", row: "owner-personal-project", expect: "deny" },
  { table: "projects", action: "select", actor: "anon", row: "public-project", expect: "deny" },
  { table: "projects", action: "insert", actor: "owner", expect: "allow" },
  { table: "projects", action: "insert", actor: "anon", expect: "deny" },
  { table: "projects", action: "update", actor: "outsider", row: "owner-personal-project", expect: "deny" },
  { table: "projects", action: "delete", actor: "outsider", row: "owner-personal-project", expect: "deny" },

  { table: "spaces", action: "select", actor: "owner", row: "owner-personal-space", expect: "allow" },
  { table: "spaces", action: "select", actor: "member", row: "team-space", expect: "allow" },
  { table: "spaces", action: "select", actor: "outsider", row: "owner-personal-space", expect: "deny" },
  { table: "spaces", action: "select", actor: "anon", row: "public-space", expect: "deny" },
  { table: "spaces", action: "insert", actor: "owner", expect: "allow" },
  { table: "spaces", action: "insert", actor: "anon", expect: "deny" },
  { table: "spaces", action: "update", actor: "outsider", row: "owner-personal-space", expect: "deny" },
  { table: "spaces", action: "delete", actor: "outsider", row: "owner-personal-space", expect: "deny" },
];
