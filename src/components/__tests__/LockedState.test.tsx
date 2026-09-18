import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { LockedState } from '../LockedState';
import { BrowserRouter } from 'react-router-dom';

// Mock useSubscriptionTier
const mockUseSubscriptionTier = vi.fn();
vi.mock('@/hooks/useSubscriptionTier', () => ({
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

const TestComponent = () => <div>Premium Content</div>;

describe('LockedState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render children when user has access', () => {
    mockUseSubscriptionTier.mockReturnValue({
      tier: 'pro',
      canAccess: vi.fn().mockReturnValue(true),
      isAdmin: false,
    });

    render(
      <BrowserRouter>
        <LockedState requiredTier="pro">
          <TestComponent />
        </LockedState>
      </BrowserRouter>
    );

    expect(screen.getByText('Premium Content')).toBeInTheDocument();
  });

  it('should render locked state when user lacks access', () => {
    mockUseSubscriptionTier.mockReturnValue({
      tier: 'free',
      canAccess: vi.fn().mockReturnValue(false),
      isAdmin: false,
    });

    render(
      <BrowserRouter>
        <LockedState requiredTier="pro">
          <TestComponent />
        </LockedState>
      </BrowserRouter>
    );

    expect(screen.queryByText('Premium Content')).not.toBeInTheDocument();
    expect(screen.getByText(/Pro-Funktion/i)).toBeInTheDocument();
  });

  it('should allow admin access regardless of tier', () => {
    mockUseSubscriptionTier.mockReturnValue({
      tier: 'free',
      canAccess: vi.fn().mockReturnValue(false),
      isAdmin: true,
    });

    render(
      <BrowserRouter>
        <LockedState requiredTier="enterprise">
          <TestComponent />
        </LockedState>
      </BrowserRouter>
    );

    expect(screen.getByText('Premium Content')).toBeInTheDocument();
  });

  it('should display correct tier information for pro', () => {
    mockUseSubscriptionTier.mockReturnValue({
      tier: 'free',
      canAccess: vi.fn().mockReturnValue(false),
      isAdmin: false,
    });

    render(
      <BrowserRouter>
        <LockedState requiredTier="pro">
          <TestComponent />
        </LockedState>
      </BrowserRouter>
    );

    expect(screen.getByText('Pro-Funktion')).toBeInTheDocument();
    expect(screen.getByText(/Jetzt upgraden/i)).toBeInTheDocument();
  });

  it('should display correct tier information for power', () => {
    mockUseSubscriptionTier.mockReturnValue({
      tier: 'free',
      canAccess: vi.fn().mockReturnValue(false),
      isAdmin: false,
    });

    render(
      <BrowserRouter>
        <LockedState requiredTier="power">
          <TestComponent />
        </LockedState>
      </BrowserRouter>
    );

    expect(screen.getByText('Power-Funktion')).toBeInTheDocument();
  });

  it('should display correct tier information for enterprise', () => {
    mockUseSubscriptionTier.mockReturnValue({
      tier: 'free',
      canAccess: vi.fn().mockReturnValue(false),
      isAdmin: false,
    });

    render(
      <BrowserRouter>
        <LockedState requiredTier="enterprise">
          <TestComponent />
        </LockedState>
      </BrowserRouter>
    );

    expect(screen.getByText('Enterprise-Funktion')).toBeInTheDocument();
  });

  it('should render locked state when canAccess returns false for higher tier', () => {
    mockUseSubscriptionTier.mockReturnValue({
      tier: 'pro',
      canAccess: vi.fn().mockReturnValue(false),
      isAdmin: false,
    });

    render(
      <BrowserRouter>
        <LockedState requiredTier="power">
          <TestComponent />
        </LockedState>
      </BrowserRouter>
    );

    // canAccess returns false, so locked state should show
    expect(screen.queryByText('Premium Content')).not.toBeInTheDocument();
    expect(screen.getByText('Power-Funktion')).toBeInTheDocument();
  });
});
