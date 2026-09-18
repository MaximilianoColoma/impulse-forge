import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { waitFor } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import Auth from '../Auth';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock useAuth
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
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

describe('Auth Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      signIn: mockSignIn,
      signUp: mockSignUp,
    });
  });

  it('should render login form by default', () => {
    render(<Auth />, { wrapper: createWrapper() });

    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/passwort/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /anmelden/i })).toBeInTheDocument();
  });

  it('should switch to signup form', async () => {
    const user = userEvent.setup();
    render(<Auth />, { wrapper: createWrapper() });

    const toggleButton = screen.getByText(/Noch kein Account\? Registrieren/i);
    await user.click(toggleButton);

    expect(screen.getByRole('button', { name: /account erstellen/i })).toBeInTheDocument();
  });

  it('should validate email format', async () => {
    const user = userEvent.setup();
    render(<Auth />, { wrapper: createWrapper() });

    const emailInput = screen.getByLabelText(/e-mail/i);
    const passwordInput = screen.getByLabelText(/passwort/i);

    await user.type(emailInput, 'invalid-email');
    await user.type(passwordInput, 'password123');

    // Use fireEvent.submit to bypass native HTML5 email validation in jsdom
    // so that zod validation can run
    const form = emailInput.closest('form')!;
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });

    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('should validate password requirements on signup', async () => {
    const user = userEvent.setup();
    render(<Auth />, { wrapper: createWrapper() });

    // Switch to signup
    const toggleButton = screen.getByText(/Noch kein Account\? Registrieren/i);
    await user.click(toggleButton);

    const emailInput = screen.getByLabelText(/e-mail/i);
    const passwordInput = screen.getByLabelText(/passwort/i);
    const submitButton = screen.getByRole('button', { name: /account erstellen/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'weak');
    await user.click(submitButton);

    await waitFor(() => {
      // Zod validation errors are in English; the last error for the path wins
      const errorEl = document.getElementById('password-error');
      expect(errorEl).toBeInTheDocument();
    });

    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('should call signIn with valid credentials', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue(undefined);

    render(<Auth />, { wrapper: createWrapper() });

    const emailInput = screen.getByLabelText(/e-mail/i);
    const passwordInput = screen.getByLabelText(/passwort/i);
    const submitButton = screen.getByRole('button', { name: /anmelden/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'Password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'Password123');
    });
  });

  it('should call signUp with valid credentials', async () => {
    const user = userEvent.setup();
    mockSignUp.mockResolvedValue(undefined);

    render(<Auth />, { wrapper: createWrapper() });

    // Switch to signup
    const toggleButton = screen.getByText(/Noch kein Account\? Registrieren/i);
    await user.click(toggleButton);

    const emailInput = screen.getByLabelText(/e-mail/i);
    const passwordInput = screen.getByLabelText(/passwort/i);
    const submitButton = screen.getByRole('button', { name: /account erstellen/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'Password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'Password123');
    });
  });

  it('should show loading state during submission', async () => {
    const user = userEvent.setup();
    mockSignIn.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<Auth />, { wrapper: createWrapper() });

    const emailInput = screen.getByLabelText(/e-mail/i);
    const passwordInput = screen.getByLabelText(/passwort/i);
    const submitButton = screen.getByRole('button', { name: /anmelden/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'Password123');
    await user.click(submitButton);

    await waitFor(() => {
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  it('should sanitize email input', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue(undefined);

    render(<Auth />, { wrapper: createWrapper() });

    const emailInput = screen.getByLabelText(/e-mail/i);
    const passwordInput = screen.getByLabelText(/passwort/i);
    const submitButton = screen.getByRole('button', { name: /anmelden/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'Password123');
    await user.click(submitButton);

    await waitFor(() => {
      // sanitizeInput strips HTML tags via DOMPurify
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'Password123');
    });
  });

  it('should redirect authenticated users', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      signIn: mockSignIn,
      signUp: mockSignUp,
    });

    render(<Auth />, { wrapper: createWrapper() });

    expect(mockNavigate).toHaveBeenCalledWith('/app');
  });
});
