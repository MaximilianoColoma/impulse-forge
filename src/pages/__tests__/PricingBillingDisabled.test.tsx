import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders, screen } from '@/test/utils';
import PricingPage from '../Pricing';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/lib/billing', () => ({ billingEnabled: false }));
vi.mock('@/components/UpgradeNudgeBanner', () => ({
  UpgradeNudgeBanner: () => null,
}));
vi.mock('@/hooks/useSubscriptionTier', () => ({
  useSubscriptionTier: () => ({ tier: 'free' }),
}));
vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  HelmetProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('PricingPage 0-EUR beta gate', () => {
  it('makes every paid checkout entry point unreachable', () => {
    renderWithProviders(<PricingPage />);

    const paidButtons = screen.getAllByRole('button', {
      name: 'In der kostenlosen Beta nicht verfügbar',
    });

    expect(paidButtons).toHaveLength(3);
    paidButtons.forEach((button) => expect(button).toBeDisabled());
    expect(supabase.auth.getSession).not.toHaveBeenCalled();
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });
});
