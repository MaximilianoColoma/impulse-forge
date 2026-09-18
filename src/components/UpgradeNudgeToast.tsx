/**
 * T2.8.d · Imperative upgrade nudge via sonner toast.
 *
 * Use for event-driven surfaces (e.g. SEAT_LIMIT_REACHED response) where a
 * persistent banner is inappropriate. Respects the same 7-day cooldown as
 * the banner and emits the same audit trio (shown/clicked/dismissed).
 */
import { toast } from "sonner";
import { pickTriggerByEvent } from "@/lib/upgradeNudge/engine";
import { markShown, readLastShown } from "@/lib/upgradeNudge/storage";
import { logAudit } from "@/lib/audit";
import type { TriggerEvent } from "@/data/upgradeTriggers";
import { billingEnabled } from "@/lib/billing";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ShowUpgradeToastOpts {
  event: TriggerEvent;
  actorId: string | null;
  /** Translator (usually `t` from useLocale). */
  t: (key: string, vars?: Record<string, string>) => string;
  /** Router push — passed in so this stays a pure helper (no react-router import). */
  navigate: (href: string) => void;
  ctaHref?: string;
  ctaLabelKey?: string;
  surface?: string;
  cooldownDays?: number;
  now?: number;
}

/**
 * Fire a nudge toast if the cooldown allows.
 * Returns true when a toast was shown, false when suppressed by cooldown.
 */
export function showUpgradeToast(opts: ShowUpgradeToastOpts): boolean {
  if (!billingEnabled) return false;

  const {
    event,
    actorId,
    t,
    navigate,
    ctaHref = "/pricing",
    ctaLabelKey = "pricing.nudge.cta",
    surface = `toast.${event}`,
    cooldownDays = 7,
    now = Date.now(),
  } = opts;

  const trigger = pickTriggerByEvent(event);
  if (!trigger) return false;

  const last = readLastShown(actorId)[event];
  if (last && now - last < cooldownDays * DAY_MS) return false;

  markShown(actorId, event, now);
  void logAudit({
    action: "upgrade.nudge_shown",
    resourceType: "nudge",
    metadata: { event, from_tier: trigger.fromTier, to_tier: trigger.toTier, surface },
  });

  toast(t(trigger.copyKey), {
    description: t(trigger.emotionalHookKey),
    duration: 8000,
    action: {
      label: t(ctaLabelKey),
      onClick: () => {
        void logAudit({
          action: "upgrade.nudge_clicked",
          resourceType: "nudge",
          metadata: { event, surface },
        });
        navigate(ctaHref);
      },
    },
    onDismiss: () => {
      void logAudit({
        action: "upgrade.nudge_dismissed",
        resourceType: "nudge",
        metadata: { event, surface },
      });
    },
  });
  return true;
}
