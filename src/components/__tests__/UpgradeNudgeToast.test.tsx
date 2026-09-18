import { describe, it, expect, beforeEach, vi } from 'vitest';
import { showUpgradeToast } from '../UpgradeNudgeToast';

vi.mock('@/lib/billing', () => ({ billingEnabled: true }));

const toastSpy = vi.fn();
vi.mock('sonner', () => ({
  toast: (...args: unknown[]) => {
    toastSpy(...args);
    return 1;
  },
}));

const logAudit = vi.fn();
vi.mock('@/lib/audit', () => ({ logAudit: (...a: unknown[]) => logAudit(...a) }));

describe('showUpgradeToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const baseOpts = {
    actorId: 'user:test#dev',
    t: (k: string) => k,
    navigate: vi.fn(),
  };

  it('fires toast + shown audit on first call', () => {
    const ok = showUpgradeToast({ ...baseOpts, event: 'seat_utilization_high' });
    expect(ok).toBe(true);
    expect(toastSpy).toHaveBeenCalledTimes(1);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'upgrade.nudge_shown' }),
    );
  });

  it('suppresses second call within cooldown window', () => {
    showUpgradeToast({ ...baseOpts, event: 'seat_utilization_high' });
    toastSpy.mockClear();
    const ok = showUpgradeToast({ ...baseOpts, event: 'seat_utilization_high' });
    expect(ok).toBe(false);
    expect(toastSpy).not.toHaveBeenCalled();
  });

  it('re-fires after cooldown expires', () => {
    const now = 1_000_000_000_000;
    showUpgradeToast({ ...baseOpts, event: 'seat_utilization_high', now });
    toastSpy.mockClear();
    const ok = showUpgradeToast({
      ...baseOpts,
      event: 'seat_utilization_high',
      now: now + 8 * 24 * 60 * 60 * 1000,
    });
    expect(ok).toBe(true);
    expect(toastSpy).toHaveBeenCalledTimes(1);
  });

  it('returns false for unknown event', () => {
    const ok = showUpgradeToast({ ...baseOpts, event: 'not_a_real_event' as never });
    expect(ok).toBe(false);
  });
});
