import { beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
  callback: undefined as undefined | ((event: string, session: unknown) => void),
  onAuthStateChange: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: harness.onAuthStateChange.mockImplementation((callback) => {
        harness.callback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
    },
  },
}));

import {
  clearPasswordRecovery,
  getPasswordRecoverySnapshot,
  subscribeToPasswordRecovery,
} from '../passwordRecoveryState';

describe('passwordRecoveryState', () => {
  beforeEach(() => {
    clearPasswordRecovery();
    window.history.replaceState({}, '', '/reset-password');
  });

  it('captures PASSWORD_RECOVERY before any React subscriber mounts', () => {
    window.history.replaceState(
      {},
      '',
      '/reset-password?token_hash=FAKE_SENTINEL&keep=ok#type=recovery',
    );
    harness.callback?.('PASSWORD_RECOVERY', null);

    expect(getPasswordRecoverySnapshot()).toBe(true);
    expect(window.location.search).toBe('?keep=ok');
    expect(window.location.hash).toBe('');

    const listener = vi.fn();
    const unsubscribe = subscribeToPasswordRecovery(listener);
    harness.callback?.('SIGNED_IN', { user: { id: 'user-1' } });

    expect(getPasswordRecoverySnapshot()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('revokes a latched recovery on SIGNED_OUT', () => {
    harness.callback?.('PASSWORD_RECOVERY', null);
    expect(getPasswordRecoverySnapshot()).toBe(true);

    harness.callback?.('SIGNED_OUT', null);

    expect(getPasswordRecoverySnapshot()).toBe(false);
  });
});
