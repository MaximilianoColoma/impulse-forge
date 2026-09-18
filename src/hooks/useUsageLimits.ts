import { useCallback } from 'react';
import { useSubscriptionTier } from './useSubscriptionTier';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '@/i18n';

export const useUsageLimits = () => {
  const { tier, limits, isLoading } = useSubscriptionTier();
  const navigate = useNavigate();
  const { t } = useLocale();

  const checkProjectLimit = useCallback((currentCount: number) => {
    if (tier !== 'free') return true;

    if (currentCount >= limits.projects) {
      toast.error(t('limits.project_limit_toast', { max: limits.projects }), {
        action: {
          label: t('limits.upgrade_action'),
          onClick: () => navigate('/pricing'),
        },
      });
      return false;
    }
    return true;
  }, [tier, limits.projects, navigate, t]);

  const checkImpulseLimit = useCallback((currentCount: number) => {
    if (tier !== 'free') return true;

    if (currentCount >= limits.impulses) {
      toast.error(t('limits.impulse_limit_toast', { max: limits.impulses }), {
        action: {
          label: t('limits.upgrade_action'),
          onClick: () => navigate('/pricing'),
        },
      });
      return false;
    }
    return true;
  }, [tier, limits.impulses, navigate, t]);

  const checkApiLimit = useCallback(() => {
    if (tier === 'free') {
      toast.error(t('limits.api_limit_toast'), {
        action: {
          label: t('limits.upgrade_action'),
          onClick: () => navigate('/pricing'),
        },
      });
      return false;
    }
    return true;
  }, [tier, navigate, t]);

  return {
    checkProjectLimit,
    checkImpulseLimit,
    checkApiLimit,
    isLoading,
    tier,
    limits,
  };
};
