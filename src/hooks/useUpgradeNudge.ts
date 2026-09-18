/**
 * T2.8.d · React hook exposing the current top upgrade nudge for a surface.
 */
import { useCallback, useMemo, useState } from "react";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { useActorId } from "@/hooks/useActorId";
import {
  pickTopNudge,
  type NudgeCandidate,
  type NudgeContext,
} from "@/lib/upgradeNudge/engine";
import { markShown, readLastShown } from "@/lib/upgradeNudge/storage";

export interface UseUpgradeNudgeOpts {
  /** Free-form context: projects/impulses counts, seat usage, event signals. */
  context?: Omit<NudgeContext, "tier" | "lastShown">;
  /** Skip evaluation entirely (feature flag / non-authed surfaces). */
  disabled?: boolean;
}

export interface UseUpgradeNudgeReturn {
  nudge: NudgeCandidate | null;
  dismiss: () => void;
  /** Call once when the banner becomes visible so cooldown starts. */
  acknowledgeShown: () => void;
}

export function useUpgradeNudge(opts: UseUpgradeNudgeOpts = {}): UseUpgradeNudgeReturn {
  const { tier } = useSubscriptionTier();
  const { actorId } = useActorId();
  const [sessionDismissed, setSessionDismissed] = useState<Set<string>>(new Set());

  const nudge = useMemo<NudgeCandidate | null>(() => {
    if (opts.disabled) return null;
    const lastShown = readLastShown(actorId);
    const candidate = pickTopNudge({
      tier,
      ...(opts.context ?? {}),
      lastShown,
    });
    if (!candidate) return null;
    if (sessionDismissed.has(candidate.event)) return null;
    return candidate;
  }, [tier, opts.context, opts.disabled, actorId, sessionDismissed]);

  const dismiss = useCallback(() => {
    if (!nudge) return;
    setSessionDismissed((prev) => {
      const next = new Set(prev);
      next.add(nudge.event);
      return next;
    });
    markShown(actorId, nudge.event);
  }, [nudge, actorId]);

  const acknowledgeShown = useCallback(() => {
    if (!nudge) return;
    markShown(actorId, nudge.event);
  }, [nudge, actorId]);

  return { nudge, dismiss, acknowledgeShown };
}