/**
 * T2.9.e · audit_log append-only proof.
 *
 * Runs against a live Supabase Data API with a per-actor JWT (same env pattern
 * as T2.5.b). Verifies:
 *   1. authenticated actor can INSERT via emit_audit RPC (allowed)
 *   2. same actor cannot UPDATE the row (blocked by RLS + trigger)
 *   3. same actor cannot DELETE the row (blocked by RLS + trigger)
 *   4. anon SELECT returns no rows
 *
 * Skips gracefully when env vars are missing so local `vitest run` stays green.
 */
import { describe, it, expect, beforeAll } from 'vitest';
// @ts-expect-error - node built-ins at runtime
import { readFileSync, existsSync } from 'fs';
// @ts-expect-error - node built-ins at runtime
import { resolve } from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
// @ts-expect-error - .mjs sibling script
import { mintJwt } from '../../../scripts/petri/mint-jwt.mjs';

declare const process: { cwd: () => string; env: Record<string, string | undefined> };

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
const FIXTURES_PATH = resolve(process.cwd(), 'docs/v2/petri/fixtures/rls-fixtures.json');

const canRun =
  !!SUPABASE_URL &&
  !!ANON_KEY &&
  !!JWT_SECRET &&
  existsSync(FIXTURES_PATH) &&
  /localhost|127\.0\.0\.1|supabase\.internal|kong:8000/.test(SUPABASE_URL);

const d = canRun ? describe : describe.skip;

d('audit_log append-only (T2.9.e)', () => {
  let owner: SupabaseClient;
  let anon: SupabaseClient;
  let insertedId: string | null = null;

  beforeAll(() => {
    const fixtures = JSON.parse(readFileSync(FIXTURES_PATH, 'utf8')) as {
      users: { owner: string };
    };
    const jwt = mintJwt(fixtures.users.owner, { secret: JWT_SECRET });
    owner = createClient(SUPABASE_URL!, ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    anon = createClient(SUPABASE_URL!, ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  it('owner can emit via RPC', async () => {
    const { data, error } = await owner.rpc('emit_audit', {
      _action: 'test.append_only_probe',
      _resource_type: 'test',
      _resource_id: null,
      _space_id: null,
      _team_id: null,
      _metadata: { probe: true } as never,
    });
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    insertedId = data as unknown as string;
  });

  it('owner cannot UPDATE audit_log', async () => {
    if (!insertedId) return;
    const res = await owner.from('audit_log').update({ action: 'mutated' }).eq('id', insertedId).select('id');
    expect(res.error, 'update must be denied').not.toBeNull();
  });

  it('owner cannot DELETE audit_log', async () => {
    if (!insertedId) return;
    const res = await owner.from('audit_log').delete().eq('id', insertedId).select('id');
    expect(res.error, 'delete must be denied').not.toBeNull();
  });

  it('anon cannot SELECT audit_log', async () => {
    const res = await anon.from('audit_log').select('id').limit(1);
    // either explicit error or empty rows — never a leak
    if (!res.error) {
      expect(res.data?.length ?? 0).toBe(0);
    }
  });
});

if (!canRun) {
  // eslint-disable-next-line no-console
  console.warn(
    '[T2.9.e] audit_log append-only skipped — set SUPABASE_URL/SUPABASE_ANON_KEY/SUPABASE_JWT_SECRET.',
  );
}