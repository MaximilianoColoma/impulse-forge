import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUsageLimits } from '../useUsageLimits';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Mock useSubscriptionTier
const mockUseSubscriptionTier = vi.fn();
vi.mock('../useSubscriptionTier', () => ({
  useSubscriptionTier: () => mockUseSubscriptionTier(),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('useUsageLimits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Free Tier Limits', () => {
    beforeEach(() => {
      mockUseSubscriptionTier.mockReturnValue({
        tier: 'free',
        isLoading: false,
        limits: {
          projects: 3,
          impulses: 50,
          apiCalls: 100,
          storage: 100,
        },
      });
    });

    it('should block project creation when limit reached', () => {
      const { result } = renderHook(() => useUsageLimits(), {
        wrapper: createWrapper(),
      });

      const canCreate = result.current.checkProjectLimit(3);

      expect(canCreate).toBe(false);
    });

    it('should allow project creation when under limit', () => {
      const { result } = renderHook(() => useUsageLimits(), {
        wrapper: createWrapper(),
      });

      const canCreate = result.current.checkProjectLimit(2);

      expect(canCreate).toBe(true);
    });

    it('should block impulse creation when limit reached', () => {
      const { result } = renderHook(() => useUsageLimits(), {
        wrapper: createWrapper(),
      });

      const canCreate = result.current.checkImpulseLimit(50);

      expect(canCreate).toBe(false);
    });

    it('should block API access for free tier', () => {
      const { result } = renderHook(() => useUsageLimits(), {
        wrapper: createWrapper(),
      });

      const hasAccess = result.current.checkApiLimit();

      expect(hasAccess).toBe(false);
    });
  });

  describe('Pro Tier Limits', () => {
    beforeEach(() => {
      mockUseSubscriptionTier.mockReturnValue({
        tier: 'pro',
        isLoading: false,
        limits: {
          projects: Infinity,
          impulses: Infinity,
          apiCalls: 10000,
          storage: 1000,
        },
      });
    });

    it('should allow unlimited project creation', () => {
      const { result } = renderHook(() => useUsageLimits(), {
        wrapper: createWrapper(),
      });

      const canCreate = result.current.checkProjectLimit(100);

      expect(canCreate).toBe(true);
    });

    it('should allow unlimited impulse creation', () => {
      const { result } = renderHook(() => useUsageLimits(), {
        wrapper: createWrapper(),
      });

      const canCreate = result.current.checkImpulseLimit(1000);

      expect(canCreate).toBe(true);
    });

    it('should allow API access for pro tier', () => {
      const { result } = renderHook(() => useUsageLimits(), {
        wrapper: createWrapper(),
      });

      const hasAccess = result.current.checkApiLimit();

      expect(hasAccess).toBe(true);
    });
  });

  describe('Power Tier Limits', () => {
    beforeEach(() => {
      mockUseSubscriptionTier.mockReturnValue({
        tier: 'power',
        isLoading: false,
        limits: {
          projects: Infinity,
          impulses: Infinity,
          apiCalls: 100000,
          storage: 10000,
        },
      });
    });

    it('should allow all operations for power tier', () => {
      const { result } = renderHook(() => useUsageLimits(), {
        wrapper: createWrapper(),
      });

      expect(result.current.checkApiLimit()).toBe(true);
    });
  });
});
