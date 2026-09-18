import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ResetPassword from '../ResetPassword';
import { AuthProvider } from '@/hooks/useAuth';

const auth = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  onAuthStateChange: vi.fn(),
  getSession: vi.fn(),
  updateUser: vi.fn(),
}));

const functions = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

const toast = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
}));

const recovery = vi.hoisted(() => {
  let active = false;
  const listeners = new Set<() => void>();
  const setActive = (next: boolean) => {
    if (active === next) return;
    active = next;
    for (const listener of listeners) listener();
  };
  return {
    getSnapshot: () => active,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    clear: () => setActive(false),
    emit: (event: string) => {
      if (event === 'PASSWORD_RECOVERY') setActive(true);
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') setActive(false);
    },
    reset: () => { active = false; },
  };
});

let authStateCallback: (event: string, session: unknown) => void;

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth, functions },
}));

vi.mock('@/integrations/supabase/passwordRecoveryState', () => ({
  getPasswordRecoverySnapshot: recovery.getSnapshot,
  subscribeToPasswordRecovery: recovery.subscribe,
  clearPasswordRecovery: recovery.clear,
}));

vi.mock('sonner', () => ({ toast }));

vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const renderPage = (entry = '/reset-password') =>
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[entry]}>
        <ResetPassword />
      </MemoryRouter>
    </AuthProvider>,
  );

const emitAuthEvent = async (event: string) => {
  await act(async () => {
    authStateCallback(event, { user: { id: 'user-1' } });
    recovery.emit(event);
  });
};

describe('ResetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recovery.reset();
    auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    auth.onAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    auth.updateUser.mockResolvedValue({ data: {}, error: null });
    functions.invoke.mockResolvedValue({ data: null, error: null });
  });

  it('requests a recovery email locally when no token is present', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Passwort zurücksetzen' }),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText('E-Mail'), 'max@example.com');
    await user.click(screen.getByRole('button', { name: 'Reset-Link anfordern' }));

    await waitFor(() =>
      expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('max@example.com', {
        redirectTo: `${window.location.origin}/reset-password`,
      }),
    );
    expect(
      screen.getByText(/Wenn ein Konto für diese E-Mail existiert/),
    ).toBeInTheDocument();
  });

  it('opens password entry only after Supabase confirms PASSWORD_RECOVERY', async () => {
    window.history.replaceState({}, '', '/reset-password#type=recovery');
    renderPage();
    expect(await screen.findByLabelText('E-Mail')).toBeInTheDocument();

    await emitAuthEvent('PASSWORD_RECOVERY');

    expect(await screen.findByLabelText('Neues Passwort')).toBeInTheDocument();
    expect(functions.invoke).not.toHaveBeenCalled();
  });

  it('uses recovery authority captured before the page mounts', async () => {
    recovery.emit('PASSWORD_RECOVERY');

    renderPage();

    expect(await screen.findByLabelText('Neues Passwort')).toBeInTheDocument();
  });

  it('does not treat a normal signed-in session as recovery authority', async () => {
    renderPage();
    expect(await screen.findByLabelText('E-Mail')).toBeInTheDocument();

    await emitAuthEvent('SIGNED_IN');

    expect(screen.queryByLabelText('Neues Passwort')).not.toBeInTheDocument();
    expect(screen.getByLabelText('E-Mail')).toBeInTheDocument();
  });

  it('revokes recovery authority when a later normal sign-in occurs', async () => {
    renderPage();
    await emitAuthEvent('PASSWORD_RECOVERY');
    expect(await screen.findByLabelText('Neues Passwort')).toBeInTheDocument();

    await emitAuthEvent('SIGNED_IN');

    expect(screen.queryByLabelText('Neues Passwort')).not.toBeInTheDocument();
    expect(screen.getByLabelText('E-Mail')).toBeInTheDocument();
  });

  it('does not update when passwords differ or are too short', async () => {
    const user = userEvent.setup();
    renderPage();
    await emitAuthEvent('PASSWORD_RECOVERY');
    const password = await screen.findByLabelText('Neues Passwort');
    const confirmation = screen.getByLabelText('Passwort bestätigen');

    await user.type(password, 'short');
    await user.type(confirmation, 'other');
    await user.click(screen.getByRole('button', { name: 'Passwort zurücksetzen' }));

    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it('rejects weak and overlong passwords using the registration policy', async () => {
    const user = userEvent.setup();
    renderPage();
    await emitAuthEvent('PASSWORD_RECOVERY');
    const password = await screen.findByLabelText('Neues Passwort');
    const confirmation = screen.getByLabelText('Passwort bestätigen');

    await user.type(password, 'abcdefgh');
    await user.type(confirmation, 'abcdefgh');
    await user.click(screen.getByRole('button', { name: 'Passwort zurücksetzen' }));
    expect(auth.updateUser).not.toHaveBeenCalled();

    await user.clear(password);
    await user.clear(confirmation);
    const overlongPassword = `A1${'a'.repeat(99)}`;
    expect(password).toHaveAttribute('maxLength', '100');
    expect(confirmation).toHaveAttribute('maxLength', '100');
    fireEvent.change(password, { target: { value: overlongPassword } });
    fireEvent.change(confirmation, { target: { value: overlongPassword } });
    await user.click(screen.getByRole('button', { name: 'Passwort zurücksetzen' }));
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it('updates the password after a valid recovery link', async () => {
    const user = userEvent.setup();
    renderPage();
    await emitAuthEvent('PASSWORD_RECOVERY');
    const password = await screen.findByLabelText('Neues Passwort');

    await user.type(password, 'NewSecure1');
    await user.type(screen.getByLabelText('Passwort bestätigen'), 'NewSecure1');
    await user.click(screen.getByRole('button', { name: 'Passwort zurücksetzen' }));

    await waitFor(() =>
      expect(auth.updateUser).toHaveBeenCalledWith({ password: 'NewSecure1' }),
    );
  });

  it('shows the same completion state when a reset request fails', async () => {
    const user = userEvent.setup();
    auth.resetPasswordForEmail.mockResolvedValue({
      error: new Error('User not found'),
    });
    renderPage();

    await user.type(screen.getByLabelText('E-Mail'), 'unknown@example.com');
    await user.click(screen.getByRole('button', { name: 'Reset-Link anfordern' }));

    expect(
      await screen.findByText(/Wenn ein Konto für diese E-Mail existiert/),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'E-Mail prüfen' })).toBeInTheDocument();
    expect(screen.queryByLabelText('E-Mail')).not.toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalledWith('User not found');
  });

  it('does not reveal provider details when password update fails', async () => {
    const user = userEvent.setup();
    auth.updateUser.mockResolvedValue({
      data: null,
      error: new Error('Provider policy detail'),
    });
    renderPage();
    await emitAuthEvent('PASSWORD_RECOVERY');

    await user.type(await screen.findByLabelText('Neues Passwort'), 'NewSecure1');
    await user.type(screen.getByLabelText('Passwort bestätigen'), 'NewSecure1');
    await user.click(screen.getByRole('button', { name: 'Passwort zurücksetzen' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    expect(toast.error).toHaveBeenCalledWith(
      'Das Passwort konnte gerade nicht geändert werden. Bitte öffne den Reset-Link erneut oder versuche es später.',
    );
    expect(toast.error).not.toHaveBeenCalledWith('Provider policy detail');
  });
});
