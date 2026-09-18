import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { screen, fireEvent } from '@testing-library/dom';
import { BrowserRouter } from 'react-router-dom';
import { UpgradeNudgeBanner } from '../UpgradeNudgeBanner';

vi.mock('@/lib/billing', () => ({ billingEnabled: true }));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const logAudit = vi.fn();
vi.mock('@/lib/audit', () => ({ logAudit: (...a: unknown[]) => logAudit(...a) }));

vi.mock('@/hooks/useActorId', () => ({
  useActorId: () => ({ actorId: 'user:test#dev', userId: 'test', deviceId: 'dev', isAnonymous: false }),
}));

const mockTier = vi.fn(() => 'free');
vi.mock('@/hooks/useSubscriptionTier', () => ({
  useSubscriptionTier: () => ({ tier: mockTier() }),
}));

function renderBanner(props: React.ComponentProps<typeof UpgradeNudgeBanner>) {
  return render(
    <BrowserRouter>
      <UpgradeNudgeBanner {...props} />
    </BrowserRouter>,
  );
}

describe('UpgradeNudgeBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockTier.mockReturnValue('free');
  });

  it('renders nothing when no trigger matches', () => {
    const { container } = renderBanner({ surface: 'test', context: { projectsCount: 0 } });
    expect(container.firstChild).toBeNull();
  });

  it('renders copy + CTA when trigger fires and emits shown audit', () => {
    renderBanner({ surface: 'test', context: { projectsCount: 3 } });
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'upgrade.nudge_shown' }),
    );
  });

  it('navigates + logs click on CTA', () => {
    renderBanner({ surface: 'test', context: { projectsCount: 3 } });
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/pricing');
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'upgrade.nudge_clicked' }),
    );
  });

  it('hides banner + logs dismiss on X button', () => {
    renderBanner({ surface: 'test', context: { projectsCount: 3 } });
    const buttons = screen.getAllByRole('button');
    act(() => {
      fireEvent.click(buttons[buttons.length - 1]);
    });
    expect(screen.queryByRole('status')).toBeNull();
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'upgrade.nudge_dismissed' }),
    );
  });

  it('is disabled via prop', () => {
    const { container } = renderBanner({ surface: 'test', context: { projectsCount: 3 }, disabled: true });
    expect(container.firstChild).toBeNull();
  });
});
