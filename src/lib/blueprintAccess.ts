import type { SubscriptionTier } from "@/hooks/useSubscriptionTier";

export function canApplyBlueprint(tier: SubscriptionTier, aiUnlocked: boolean): boolean {
  return tier !== "free" || aiUnlocked;
}

