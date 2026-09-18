import type { AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from './client';

type RecoveryListener = () => void;

const listeners = new Set<RecoveryListener>();
let passwordRecoveryActive = false;

const notify = () => {
  for (const listener of listeners) listener();
};

const setPasswordRecoveryActive = (active: boolean) => {
  if (passwordRecoveryActive === active) return;
  passwordRecoveryActive = active;
  notify();
};

const scrubRecoveryUrl = () => {
  const cleanUrl = new URL(window.location.href);
  cleanUrl.hash = '';
  for (const name of ['access_token', 'refresh_token', 'token', 'token_hash']) {
    cleanUrl.searchParams.delete(name);
  }
  window.history.replaceState(
    window.history.state,
    '',
    `${cleanUrl.pathname}${cleanUrl.search}`,
  );
};

const handleAuthEvent = (event: AuthChangeEvent) => {
  if (event === 'PASSWORD_RECOVERY') {
    setPasswordRecoveryActive(true);
    scrubRecoveryUrl();
    return;
  }

  if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
    setPasswordRecoveryActive(false);
  }
};

// Subscribe during module evaluation so PASSWORD_RECOVERY cannot be lost while
// cache cleanup delays React and AuthProvider mounting.
supabase.auth.onAuthStateChange((event) => {
  handleAuthEvent(event);
});

export const getPasswordRecoverySnapshot = () => passwordRecoveryActive;

export const subscribeToPasswordRecovery = (listener: RecoveryListener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const clearPasswordRecovery = () => {
  setPasswordRecoveryActive(false);
};
