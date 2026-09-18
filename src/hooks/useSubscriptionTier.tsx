import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';

export type SubscriptionTier = 'free' | 'pro' | 'power' | 'enterprise';

interface UseSubscriptionTierReturn {
  tier: SubscriptionTier;
  isLoading: boolean;
  error: Error | null;
  isAdmin: boolean;
  canAccess: (requiredTier: SubscriptionTier) => boolean;
  limits: {
    projects: number;
    impulses: number;
    apiCalls: number;
    storage: number;
  };
}

const tierHierarchy: Record<SubscriptionTier, number> = {
  free: 0,
  pro: 1,
  power: 2,
  enterprise: 3,
};

const tierLimits: Record<SubscriptionTier, { projects: number; impulses: number; apiCalls: number; storage: number }> = {
  free: {
    projects: 3,
    impulses: 50,
    apiCalls: 100,
    storage: 100
  },
  pro: {
    projects: Infinity,
    impulses: Infinity,
    apiCalls: 10000,
    storage: 1000
  },
  power: {
    projects: Infinity,
    impulses: Infinity,
    apiCalls: 100000,
    storage: 10000
  },
  enterprise: {
    projects: Infinity,
    impulses: Infinity,
    apiCalls: Infinity,
    storage: Infinity
  }
};

export function useSubscriptionTier(): UseSubscriptionTierReturn {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.subscriptionTier,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if user has admin role - admins get full access
      const { data: isAdminResult } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });

      if (isAdminResult) {
        return {
          tier: 'power' as SubscriptionTier,
          isAdmin: true,
          usage: { projects: 0, impulses: 0, apiCalls: 0, storage: 0 }
        };
      }

      // Run remaining queries in parallel
      const [profileResult, projectCountResult, impulseCountResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('subscription_tier, subscription_status, subscription_ends_at, stripe_customer_id, stripe_subscription_id')
          .eq('id', user.id)
          .single(),
        supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .is('parent_project_id', null),
        supabase
          .from('impulses')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ]);

      if (profileResult.error) throw profileResult.error;

      const profile = profileResult.data;

      // Check if subscription is expired
      let tier = (profile?.subscription_tier || 'free') as SubscriptionTier;
      if (profile?.subscription_ends_at && new Date(profile.subscription_ends_at) < new Date()) {
        tier = 'free';
      }

      return {
        tier,
        isAdmin: false,
        usage: {
          projects: projectCountResult.count || 0,
          impulses: impulseCountResult.count || 0,
          apiCalls: 0, // TODO: Implement API call tracking
          storage: 0, // TODO: Implement storage tracking
        }
      };
    },
    retry: false,
  });

  const tier = data?.tier || 'free';
  const isAdmin = data?.isAdmin || false;
  const usage = data?.usage || { projects: 0, impulses: 0, apiCalls: 0, storage: 0 };

  const canAccess = (requiredTier: SubscriptionTier): boolean => {
    if (isAdmin) return true;
    return tierHierarchy[tier] >= tierHierarchy[requiredTier];
  };

  return {
    tier,
    isLoading,
    error: error as Error | null,
    isAdmin,
    canAccess,
    limits: tierLimits[tier],
  };
}
