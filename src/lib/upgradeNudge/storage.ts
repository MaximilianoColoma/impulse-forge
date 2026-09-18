/**
 * localStorage-backed cooldown store for upgrade nudges.
 * Keys are namespaced so different actors on the same browser
 * don't share dismissal state.
 */
import type { TriggerEvent } from "@/data/upgradeTriggers";

const KEY_PREFIX = "synapse.nudge.lastShown";

function keyFor(actorId: string | null): string {
  return `${KEY_PREFIX}:${actorId ?? "anon"}`;
}

export function readLastShown(actorId: string | null): Partial<Record<TriggerEvent, number>> {
  try {
    const raw = localStorage.getItem(keyFor(actorId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

export function markShown(actorId: string | null, event: TriggerEvent, now = Date.now()): void {
  try {
    const current = readLastShown(actorId);
    current[event] = now;
    localStorage.setItem(keyFor(actorId), JSON.stringify(current));
  } catch {
    /* private mode / quota – ignore */
  }
}