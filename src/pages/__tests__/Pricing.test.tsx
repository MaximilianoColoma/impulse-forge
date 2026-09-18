import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/utils';
import PricingPage from '../Pricing';
import { supabase } from '@/integrations/supabase/client';

// Cast supabase to access mocked methods
const mockSupabase = vi.mocked(supabase, true);

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock react-helmet-async
vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  HelmetProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock sonner toast
const mockToast = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
}));
vi.mock('sonner', () => ({
  toast: mockToast,
}));

// Pricing owns the checkout behavior under test. Keep contextual upgrade
// nudges and subscription lookup out of this unit boundary.
vi.mock('@/components/UpgradeNudgeBanner', () => ({
  UpgradeNudgeBanner: () => null,
}));

vi.mock('@/hooks/useSubscriptionTier', () => ({
  useSubscriptionTier: () => ({ tier: 'free' }),
}));

vi.mock('@/lib/billing', () => ({
  billingEnabled: true,
}));

describe('PricingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Page Rendering', () => {
    it('should render pricing page with all tiers', () => {
      renderWithProviders(<PricingPage />);

      expect(screen.getByText(/Wähle deinen Weg zu mehr Klarheit/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Free/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Pro/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Power/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Enterprise/i).length).toBeGreaterThan(0);
    });

    it('should display monthly billing by default', () => {
      renderWithProviders(<PricingPage />);

      const monthlyLabel = screen.getByText('Monatlich');
      expect(monthlyLabel).toHaveClass('text-foreground');
    });

    it('should show popular badge on Pro tier', () => {
      renderWithProviders(<PricingPage />);

      const popularBadges = screen.getAllByText(/beliebtesten/i);
      expect(popularBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Billing Toggle', () => {
    it('should toggle between monthly and yearly billing', async () => {
      const { container } = renderWithProviders(<PricingPage />);

      const billingSwitch = container.querySelector('[role="switch"]');
      expect(billingSwitch).toBeInTheDocument();

      // Initial state should be monthly
      expect(screen.getByText('Monatlich')).toHaveClass('text-foreground');

      // Click to toggle to yearly
      if (billingSwitch && 'click' in billingSwitch) {
        (billingSwitch as HTMLElement).click();
      }

      await waitFor(() => {
        expect(screen.getByText('Jährlich')).toHaveClass('text-foreground');
      });
    });

    it('should show savings badge when yearly is selected', async () => {
      const { container } = renderWithProviders(<PricingPage />);

      const billingSwitch = container.querySelector('[role="switch"]');
      if (billingSwitch && 'click' in billingSwitch) {
        (billingSwitch as HTMLElement).click();
      }

      await waitFor(() => {
        expect(screen.getByText(/15% gespart/i)).toBeInTheDocument();
      });
    });
  });

  describe('Checkout Flow', () => {
    it('should redirect to auth when user is not authenticated', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      } as any);

      renderWithProviders(<PricingPage />);

      const startButtons = screen.getAllByText(/Jetzt starten/i);
      const proStartButton = startButtons[0];

      proStartButton.click();

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Bitte melde dich zuerst an');
        expect(mockNavigate).toHaveBeenCalledWith('/auth');
      });
    });

    it('should create checkout session when user is authenticated', async () => {
      const mockSession = {
        access_token: 'mock-token',
        user: { id: 'user-123', email: 'test@example.com' },
      };

      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      } as any);

      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: { url: 'https://checkout.stripe.com/test' },
        error: null,
      } as any);

      // Mock window.open
      const mockOpen = vi.fn();
      globalThis.window.open = mockOpen;

      renderWithProviders(<PricingPage />);

      const startButtons = screen.getAllByText(/Jetzt starten/i);
      const proStartButton = startButtons[0];

      proStartButton.click();

      await waitFor(() => {
        expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
          'create-checkout-session',
          expect.objectContaining({
            body: expect.objectContaining({
              tier: expect.any(String),
              billingCycle: 'monthly',
            }),
          })
        );
        expect(mockOpen).toHaveBeenCalledWith('https://checkout.stripe.com/test', '_blank');
      });
    });

    it('should show loading state during checkout', async () => {
      const mockSession = {
        access_token: 'mock-token',
        user: { id: 'user-123', email: 'test@example.com' },
      };

      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      } as any);

      mockSupabase.functions.invoke.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100)) as any
      );

      renderWithProviders(<PricingPage />);

      const startButtons = screen.getAllByText(/Jetzt starten/i);
      const proStartButton = startButtons[0];

      proStartButton.click();

      await waitFor(() => {
        expect(screen.getByText('Lädt...')).toBeInTheDocument();
      });
    });

    it('should handle checkout errors', async () => {
      const mockSession = {
        access_token: 'mock-token',
        user: { id: 'user-123', email: 'test@example.com' },
      };

      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      } as any);

      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: null,
        error: { message: 'Payment error' },
      } as any);

      renderWithProviders(<PricingPage />);

      const startButtons = screen.getAllByText(/Jetzt starten/i);
      const proStartButton = startButtons[0];

      proStartButton.click();

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          expect.stringContaining('Payment error')
        );
      });
    });

    it('should pass correct billing cycle to checkout', async () => {
      const mockSession = {
        access_token: 'mock-token',
        user: { id: 'user-123', email: 'test@example.com' },
      };

      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      } as any);

      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: { url: 'https://checkout.stripe.com/test' },
        error: null,
      } as any);

      const { container } = renderWithProviders(<PricingPage />);

      // Toggle to yearly
      const billingSwitch = container.querySelector('[role="switch"]');
      if (billingSwitch && 'click' in billingSwitch) {
        (billingSwitch as HTMLElement).click();
      }

      await waitFor(() => {
        expect(screen.getByText('Jährlich')).toHaveClass('text-foreground');
      });

      const startButtons = screen.getAllByText(/Jetzt starten/i);
      const proStartButton = startButtons[0];
      proStartButton.click();

      await waitFor(() => {
        expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
          'create-checkout-session',
          expect.objectContaining({
            body: expect.objectContaining({
              billingCycle: 'yearly',
            }),
          })
        );
      });
    });
  });

  describe('Price Display', () => {
    it('should display correct prices for all tiers', () => {
      renderWithProviders(<PricingPage />);

      // Free tier should show €0
      expect(screen.getByText('€0')).toBeInTheDocument();

      // Pro and Power should show prices
      const prices = screen.getAllByText(/€\d+/);
      expect(prices.length).toBeGreaterThan(1);
    });

    it('should show enterprise contact option instead of price', () => {
      renderWithProviders(<PricingPage />);

      // Enterprise tier has no price section, instead shows a contact button
      expect(screen.getByText(/Kontakt aufnehmen/)).toBeInTheDocument();
    });
  });

  describe('Feature Lists', () => {
    it('should display features for each tier', () => {
      renderWithProviders(<PricingPage />);

      // Check for feature text items
      expect(screen.getByText('Impuls-Fänger')).toBeInTheDocument();
      expect(screen.getByText('Kanban-Board')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should have a link back to home or dashboard', () => {
      renderWithProviders(<PricingPage />);

      // Check for navigation elements
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderWithProviders(<PricingPage />);

      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toBeInTheDocument();
    });

    it('should have descriptive button labels', () => {
      renderWithProviders(<PricingPage />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button.textContent).toBeTruthy();
      });
    });
  });
});
