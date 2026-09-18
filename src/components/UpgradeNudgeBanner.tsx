/**
 * T2.8.d · Compact upgrade nudge (Settings/Pricing surfaces).
 * Renders nothing when no active candidate exists.
 */
import { useEffect } from "react";
import { X, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useLocale } from "@/i18n";
import { logAudit } from "@/lib/audit";
import { useUpgradeNudge, type UseUpgradeNudgeOpts } from "@/hooks/useUpgradeNudge";
import { billingEnabled } from "@/lib/billing";

interface Props extends UseUpgradeNudgeOpts {
  /** Surface identifier for audit correlation (e.g. "settings.seats"). */
  surface: string;
  /** Override navigation target (default: /pricing). */
  ctaHref?: string;
  className?: string;
}

export function UpgradeNudgeBanner({ surface, ctaHref = "/pricing", className, ...opts }: Props) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { nudge, dismiss, acknowledgeShown } = useUpgradeNudge({
    ...opts,
    disabled: opts.disabled || !billingEnabled,
  });

  useEffect(() => {
    if (!nudge) return;
    acknowledgeShown();
    void logAudit({
      action: "upgrade.nudge_shown",
      resourceType: "nudge",
      metadata: { event: nudge.event, from_tier: nudge.trigger.fromTier, to_tier: nudge.trigger.toTier, surface },
    });
    // We intentionally only fire once per candidate render.
     
  }, [nudge?.event, surface]);

  if (!nudge) return null;

  const handleCta = () => {
    void logAudit({
      action: "upgrade.nudge_clicked",
      resourceType: "nudge",
      metadata: { event: nudge.event, surface },
    });
    navigate(ctaHref);
  };
  const handleDismiss = () => {
    void logAudit({
      action: "upgrade.nudge_dismissed",
      resourceType: "nudge",
      metadata: { event: nudge.event, surface },
    });
    dismiss();
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={
        "flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm " +
        (className ?? "")
      }
      data-nudge-event={nudge.event}
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground">{t(nudge.trigger.copyKey)}</p>
        <p className="text-muted-foreground mt-0.5">{t(nudge.trigger.emotionalHookKey)}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button size="sm" variant="default" onClick={handleCta}>
          {t("pricing.nudge.cta")}
          <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label={t("pricing.nudge.dismiss")}
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
