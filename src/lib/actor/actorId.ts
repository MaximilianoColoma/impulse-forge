/**
 * Actor-ID (Ω1 Foundation)
 *
 * A stable, per-device identifier that is combined with the authenticated
 * `user_id` to form a composite "actor" address. This is the base
 * primitive used later by teams, spaces, MCP tokens and the regelkreis
 * evidence pipeline — every mutation must be attributable to an actor.
 *
 * Rules:
 * - The device-id is generated once via `crypto.randomUUID()` and stored
 *   in `localStorage` under a versioned key. It is NOT a secret.
 * - Never send the raw device-id to third parties; it is only used as a
 *   suffix on our own analytics/proof events.
 * - When there is no authenticated user we fall back to `anon:<device>`.
 */

const DEVICE_KEY = "synapse.actor.device.v1";

function safeLocalStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function randomId(): string {
  const g: any = globalThis as any;
  if (g?.crypto?.randomUUID) return g.crypto.randomUUID();
  // Fallback for environments without crypto (older jsdom)
  return "dev-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getDeviceId(): string {
  const store = safeLocalStorage();
  if (!store) return randomId();
  let id = store.getItem(DEVICE_KEY);
  if (!id) {
    id = randomId();
    try {
      store.setItem(DEVICE_KEY, id);
    } catch {
      /* private mode / quota */
    }
  }
  return id;
}

export function composeActorId(userId: string | null | undefined): string {
  const device = getDeviceId();
  if (!userId) return `anon:${device}`;
  return `user:${userId}#${device}`;
}

/** Test helper — clears the persisted device-id. */
export function __resetDeviceIdForTests() {
  const store = safeLocalStorage();
  try {
    store?.removeItem(DEVICE_KEY);
  } catch {
    /* noop */
  }
}