import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { waitFor } from '@/test/utils';
import { useSubscriptionTier } from '../useSubscriptionTier';
import { supabase } from '@/integrations/supabase/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Cast supabase to access mocked methods
const mockSupabase = vi.mocked(supabase, true) as any;

// Add rpc mock if not present in global setup
if (!mockSupabase.rpc) {
  (supabase as any).rpc = vi.fn().mockResolvedValue({ data: null, error: null });
}

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Helper: creates a chainable mock that resolves via .then()
function createChainable(resolvedValue: any) {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.is = vi.fn().mockReturnValue(chain);
  chain.neq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockReturnValue(chain);
  chain.head = vi.fn().mockReturnValue(chain);
  chain.count = vi.fn().mockReturnValue(chain);
  chain.then = (resolve: any) => resolve(resolvedValue);
  return chain;
}

describe('useSubscriptionTier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return default free tier for unauthenticated users', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null
    } as any);

    const { result } = renderHook(() => useSubscriptionTier(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.tier).toBe('free');
  });

  it('should return correct tier for authenticated users', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: mockUser },
      error: null
    } as any);

    // rpc('has_role') returns false (not admin)
    (mockSupabase.rpc as any).mockResolvedValueOnce({ data: false, error: null });

    // Promise.all calls from() 3 times: profiles, projects, impulses
    const profileChain = createChainable({
      data: {
        subscription_tier: 'pro',
        subscription_status: 'active',
        subscription_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      error: null,
    });
    const projectsChain = createChainable({ data: null, error: null, count: 5 });
    const impulsesChain = createChainable({ data: null, error: null, count: 10 });

    (mockSupabase.from as any)
      .mockReturnValueOnce(profileChain)
      .mockReturnValueOnce(projectsChain)
      .mockReturnValueOnce(impulsesChain);

    const { result } = renderHook(() => useSubscriptionTier(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.tier).toBe('pro');
    expect(projectsChain.is).toHaveBeenCalledWith('parent_project_id', null);
  });

  it('should handle expired subscriptions', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: mockUser },
      error: null
    } as any);

    (mockSupabase.rpc as any).mockResolvedValueOnce({ data: false, error: null });

    const profileChain = createChainable({
      data: {
        subscription_tier: 'pro',
        subscription_ends_at: new Date(Date.now() - 1000).toISOString(), // Expired
      },
      error: null,
    });
    const projectsChain = createChainable({ data: null, error: null, count: 0 });
    const impulsesChain = createChainable({ data: null, error: null, count: 0 });

    (mockSupabase.from as any)
      .mockReturnValueOnce(profileChain)
      .mockReturnValueOnce(projectsChain)
      .mockReturnValueOnce(impulsesChain);

    const { result } = renderHook(() => useSubscriptionTier(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.tier).toBe('free');
  });

  it('should correctly check access permissions', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: mockUser },
      error: null
    } as any);

    (mockSupabase.rpc as any).mockResolvedValueOnce({ data: false, error: null });

    const profileChain = createChainable({
      data: {
        subscription_tier: 'pro',
        subscription_status: 'active',
        subscription_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      error: null,
    });
    const projectsChain = createChainable({ data: null, error: null, count: 0 });
    const impulsesChain = createChainable({ data: null, error: null, count: 0 });

    (mockSupabase.from as any)
      .mockReturnValueOnce(profileChain)
      .mockReturnValueOnce(projectsChain)
      .mockReturnValueOnce(impulsesChain);

    const { result } = renderHook(() => useSubscriptionTier(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.canAccess('free')).toBe(true);
    expect(result.current.canAccess('pro')).toBe(true);
    expect(result.current.canAccess('power')).toBe(false);
    expect(result.current.canAccess('enterprise')).toBe(false);
  });

  it('should return correct usage limits for each tier', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: mockUser },
      error: null
    } as any);

    (mockSupabase.rpc as any).mockResolvedValueOnce({ data: false, error: null });

    const profileChain = createChainable({
      data: {
        subscription_tier: 'free',
        subscription_status: 'active',
      },
      error: null,
    });
    const projectsChain = createChainable({ data: null, error: null, count: 0 });
    const impulsesChain = createChainable({ data: null, error: null, count: 0 });

    (mockSupabase.from as any)
      .mockReturnValueOnce(profileChain)
      .mockReturnValueOnce(projectsChain)
      .mockReturnValueOnce(impulsesChain);

    const { result } = renderHook(() => useSubscriptionTier(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.limits).toEqual({
      projects: 3,
      impulses: 50,
      apiCalls: 100,
      storage: 100,
    });
  });

  it('should identify admin users', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: mockUser },
      error: null
    } as any);

    // rpc('has_role') returns true (admin)
    (mockSupabase.rpc as any).mockResolvedValueOnce({ data: true, error: null });

    // Admin path returns early, no from() calls needed

    const { result } = renderHook(() => useSubscriptionTier(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.canAccess('enterprise')).toBe(true);
  });
});
