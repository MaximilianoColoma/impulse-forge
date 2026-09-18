/**
 * T2.8.d · Upgrade-Nudge trigger engine (pure).
 *
 * Deterministic evaluation of `upgradeTriggers` given a runtime context.
 * No React, no I/O — cooldown state is supplied by the caller so the
 * function stays testable and side-effect free.
 */
import {
  upgradeTriggers,
  type TriggerEvent,
  type UpgradeTrigger,
} from "@/data/upgradeTriggers";
import type { SubscriptionTier } from "@/hooks/useSubscriptionTier";

export interface NudgeContext {
  tier: SubscriptionTier;
  projectsCount?: number;
  impulsesCount?: number;
  seatsActive?: number;
  seatsPurchased?: number | null;
  seatsPending?: number;
  /** Event-style boolean signals (click_locked, invite_attempted …). */
  signals?: Partial<Record<TriggerEvent, boolean>>;
  /** Unix ms of the last time each trigger was shown. */
  lastShown?: Partial<Record<TriggerEvent, number>>;
  now?: number;
  cooldownDays?: number;
}

export interface NudgeCandidate {
  event: TriggerEvent;
  trigger: UpgradeTrigger;
  weight: number; // higher = more urgent
}

const PRIORITY_WEIGHT = { high: 3, medium: 2, low: 1 } as const;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Returns true when the trigger's condition is met for the given context. */
export function isTriggerActive(t: UpgradeTrigger, ctx: NudgeContext): boolean {
  if (t.fromTier !== ctx.tier) return false;
  const signal = ctx.signals?.[t.event] === true;

  switch (t.event) {
    case "project_limit_reached":
      return (ctx.projectsCount ?? 0) >= (t.threshold ?? 3);
    case "impulse_limit_approaching":
      return (ctx.impulsesCount ?? 0) >= (t.threshold ?? 45);
    case "seat_utilization_high": {
      const purchased = ctx.seatsPurchased ?? 0;
      if (purchased <= 0) return false;
      const pct = ((ctx.seatsActive ?? 0) / purchased) * 100;
      return pct >= (t.threshold ?? 90);
    }
    case "pending_invites_exceed_seats": {
      const purchased = ctx.seatsPurchased ?? 0;
      const active = ctx.seatsActive ?? 0;
      const pending = ctx.seatsPending ?? 0;
      return purchased > 0 && active + pending > purchased;
    }
    default:
      // All other triggers are pure event signals.
      return signal;
  }
}

function isCooledDown(t: UpgradeTrigger, ctx: NudgeContext): boolean {
  const last = ctx.lastShown?.[t.event];
  if (!last) return true;
  const cooldown = (ctx.cooldownDays ?? 7) * DAY_MS;
  const now = ctx.now ?? Date.now();
  return now - last >= cooldown;
}

/** Sorted list of active, non-cooled-down nudges — highest urgency first. */
export function evaluateTriggers(ctx: NudgeContext): NudgeCandidate[] {
  const active = upgradeTriggers
    .filter((t) => isTriggerActive(t, ctx))
    .filter((t) => isCooledDown(t, ctx))
    .map<NudgeCandidate>((t) => ({
      event: t.event,
      trigger: t,
      weight: PRIORITY_WEIGHT[t.priority],
    }));
  return active.sort((a, b) => b.weight - a.weight);
}

/** Convenience: pick the single most urgent candidate, or null. */
export function pickTopNudge(ctx: NudgeContext): NudgeCandidate | null {
  return evaluateTriggers(ctx)[0] ?? null;
}

export const COOLDOWN_DEFAULT_DAYS = 7;

/** Lookup helper for imperative surfaces (toasts, LockedState CTA). */
export function pickTriggerByEvent(event: TriggerEvent): UpgradeTrigger | null {
  return upgradeTriggers.find((t) => t.event === event) ?? null;
}