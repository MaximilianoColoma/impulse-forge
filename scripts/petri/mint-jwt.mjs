/**
 * T2.5.b · Mint a Supabase-compatible HS256 JWT for a given auth.users.id.
 *
 * Reads the signing secret from SUPABASE_JWT_SECRET (local Supabase default:
 * super-secret-jwt-token-with-at-least-32-characters-long). Never point this
 * script at a production JWT secret — it is intended for the RLS matrix
 * fixtures only.
 *
 * Usage:
 *   node scripts/petri/mint-jwt.mjs <sub-uuid> [role=authenticated] [ttlSeconds=3600]
 */
import { createHmac } from "node:crypto";

const b64url = (buf) =>
  Buffer.from(buf)
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

export function mintJwt(sub, {
  role = "authenticated",
  ttlSeconds = 3600,
  secret = process.env.SUPABASE_JWT_SECRET,
} = {}) {
  if (!secret) throw new Error("SUPABASE_JWT_SECRET is required to mint a test JWT");
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub,
    role,
    aud: "authenticated",
    iss: "supabase",
    iat: now,
    exp: now + ttlSeconds,
  };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(payload));
  const sig = b64url(createHmac("sha256", secret).update(`${h}.${p}`).digest());
  return `${h}.${p}.${sig}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [sub, role, ttl] = process.argv.slice(2);
  if (!sub) {
    console.error("usage: mint-jwt.mjs <sub-uuid> [role] [ttlSeconds]");
    process.exit(2);
  }
  process.stdout.write(mintJwt(sub, {
    role: role || undefined,
    ttlSeconds: ttl ? Number(ttl) : undefined,
  }));
}
