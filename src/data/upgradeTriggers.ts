/**
 * Upgrade-Trigger-Katalog (T2.8 Vorbereitung).
 *
 * Maschinenlesbare Spiegelung von `docs/v2/pricing/archetypes.md`.
 * Konsumiert von: LockedState, Pricing-Page, Dashboard-Nudges,
 * Seat-Billing-Checkout (T2.8.a-e).
 *
 * Regel: Bei Änderung immer BEIDE Dateien im selben Commit anfassen.
 */

import type { SubscriptionTier } from "@/hooks/useSubscriptionTier";

export type TriggerPriority = "low" | "medium" | "high";

export type TriggerEvent =
  // Free -> Pro
  | "project_limit_reached"
  | "impulse_limit_approaching"
  | "ai_feature_click_locked"
  | "export_click_locked"
  // Pro -> Power
  | "repeated_project_structure"
  | "api_docs_visited"
  | "evolution_feature_click_locked"
  | "optimize_structure_used_3x"
  // Power -> Enterprise
  | "team_invite_attempted"
  | "space_share_requested"
  | "audit_log_export_requested"
  | "second_active_actor"
  | "sso_click_locked"
  // Enterprise expansion (seat top-up)
  | "seat_utilization_high"
  | "pending_invites_exceed_seats";

export interface UpgradeTrigger {
  fromTier: SubscriptionTier;
  toTier: SubscriptionTier | "seat_topup";
  event: TriggerEvent;
  /** Numerischer Schwellwert (z.B. Impuls-Count) oder null wenn rein event-basiert. */
  threshold: number | null;
  /** i18n-Key für Nutzer-Copy. Über `t(copyKey)` auflösen. */
  copyKey: string;
  /** i18n-Key für emotionalen Aufhänger (Micro-Copy in Modals). */
  emotionalHookKey: string;
  priority: TriggerPriority;
}

const triggerKey = (event: TriggerEvent, field: "copy" | "emotionalHook") =>
  `pricing.triggers.${event}.${field}`;

export const upgradeTriggers: UpgradeTrigger[] = [
  // Free -> Pro
  { fromTier: "free", toTier: "pro", event: "project_limit_reached", threshold: 3,
    copyKey: triggerKey("project_limit_reached", "copy"),
    emotionalHookKey: triggerKey("project_limit_reached", "emotionalHook"), priority: "high" },
  { fromTier: "free", toTier: "pro", event: "impulse_limit_approaching", threshold: 45,
    copyKey: triggerKey("impulse_limit_approaching", "copy"),
    emotionalHookKey: triggerKey("impulse_limit_approaching", "emotionalHook"), priority: "high" },
  { fromTier: "free", toTier: "pro", event: "ai_feature_click_locked", threshold: null,
    copyKey: triggerKey("ai_feature_click_locked", "copy"),
    emotionalHookKey: triggerKey("ai_feature_click_locked", "emotionalHook"), priority: "medium" },
  { fromTier: "free", toTier: "pro", event: "export_click_locked", threshold: null,
    copyKey: triggerKey("export_click_locked", "copy"),
    emotionalHookKey: triggerKey("export_click_locked", "emotionalHook"), priority: "medium" },

  // Pro -> Power
  { fromTier: "pro", toTier: "power", event: "repeated_project_structure", threshold: 3,
    copyKey: triggerKey("repeated_project_structure", "copy"),
    emotionalHookKey: triggerKey("repeated_project_structure", "emotionalHook"), priority: "high" },
  { fromTier: "pro", toTier: "power", event: "api_docs_visited", threshold: null,
    copyKey: triggerKey("api_docs_visited", "copy"),
    emotionalHookKey: triggerKey("api_docs_visited", "emotionalHook"), priority: "medium" },
  { fromTier: "pro", toTier: "power", event: "evolution_feature_click_locked", threshold: null,
    copyKey: triggerKey("evolution_feature_click_locked", "copy"),
    emotionalHookKey: triggerKey("evolution_feature_click_locked", "emotionalHook"), priority: "medium" },
  { fromTier: "pro", toTier: "power", event: "optimize_structure_used_3x", threshold: 3,
    copyKey: triggerKey("optimize_structure_used_3x", "copy"),
    emotionalHookKey: triggerKey("optimize_structure_used_3x", "emotionalHook"), priority: "medium" },

  // Power -> Enterprise
  { fromTier: "power", toTier: "enterprise", event: "team_invite_attempted", threshold: null,
    copyKey: triggerKey("team_invite_attempted", "copy"),
    emotionalHookKey: triggerKey("team_invite_attempted", "emotionalHook"), priority: "high" },
  { fromTier: "power", toTier: "enterprise", event: "space_share_requested", threshold: null,
    copyKey: triggerKey("space_share_requested", "copy"),
    emotionalHookKey: triggerKey("space_share_requested", "emotionalHook"), priority: "high" },
  { fromTier: "power", toTier: "enterprise", event: "audit_log_export_requested", threshold: null,
    copyKey: triggerKey("audit_log_export_requested", "copy"),
    emotionalHookKey: triggerKey("audit_log_export_requested", "emotionalHook"), priority: "medium" },
  { fromTier: "power", toTier: "enterprise", event: "second_active_actor", threshold: 2,
    copyKey: triggerKey("second_active_actor", "copy"),
    emotionalHookKey: triggerKey("second_active_actor", "emotionalHook"), priority: "high" },
  { fromTier: "power", toTier: "enterprise", event: "sso_click_locked", threshold: null,
    copyKey: triggerKey("sso_click_locked", "copy"),
    emotionalHookKey: triggerKey("sso_click_locked", "emotionalHook"), priority: "medium" },

  // Enterprise Seat-Top-up (T2.8 core)
  { fromTier: "enterprise", toTier: "seat_topup", event: "seat_utilization_high", threshold: 90,
    copyKey: triggerKey("seat_utilization_high", "copy"),
    emotionalHookKey: triggerKey("seat_utilization_high", "emotionalHook"), priority: "high" },
  { fromTier: "enterprise", toTier: "seat_topup", event: "pending_invites_exceed_seats", threshold: null,
    copyKey: triggerKey("pending_invites_exceed_seats", "copy"),
    emotionalHookKey: triggerKey("pending_invites_exceed_seats", "emotionalHook"), priority: "high" },
];

/** Trigger nach Ausgangstier gruppieren (für Nudge-Engine). */
export const triggersByFromTier = upgradeTriggers.reduce<
  Record<SubscriptionTier, UpgradeTrigger[]>
>(
  (acc, t) => {
    (acc[t.fromTier] ||= []).push(t);
    return acc;
  },
  { free: [], pro: [], power: [], enterprise: [] },
);
