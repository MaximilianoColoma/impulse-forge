import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImpulseCatcher } from '../ImpulseCatcher';
import { supabase } from '@/integrations/supabase/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Cast supabase to access mocked methods
const mockSupabase = vi.mocked(supabase, true);

// Mock AI tagging service
import { generateTags } from '@/services/aiTagging';
vi.mock('@/services/aiTagging', () => ({
  generateTags: vi.fn(),
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
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

describe('ImpulseCatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Re-set AI tagging mock after clearAllMocks
    vi.mocked(generateTags).mockResolvedValue(['ai-tag-1', 'ai-tag-2']);

    // Setup default mocks
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    } as any);

    // Default from() returns chainable with empty data
    (mockSupabase.from as any).mockReturnValue(
      createChainable({ data: [], error: null })
    );
  });

  it('should render dialog when open', () => {
    render(<ImpulseCatcher open={true} onOpenChange={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Fang deinen Impuls')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Was geht dir durch den Kopf/i)).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<ImpulseCatcher open={false} onOpenChange={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    expect(screen.queryByText('Fang deinen Impuls')).not.toBeInTheDocument();
  });

  it('should load projects on open', async () => {
    render(<ImpulseCatcher open={true} onOpenChange={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
    });
  });

  it('should allow content input', async () => {
    render(<ImpulseCatcher open={true} onOpenChange={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    const textarea = screen.getByPlaceholderText(/Was geht dir durch den Kopf/i);
    fireEvent.change(textarea, { target: { value: 'Test impulse content' } });

    expect(textarea).toHaveValue('Test impulse content');
  });

  it('should toggle tags', async () => {
    render(<ImpulseCatcher open={true} onOpenChange={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    const textarea = screen.getByPlaceholderText(/Was geht dir durch den Kopf/i);
    fireEvent.change(textarea, { target: { value: 'Test content for AI tags' } });

    const suggestion = await screen.findByText('+ ai-tag-1', {}, { timeout: 3000 });
    expect(vi.mocked(generateTags)).toHaveBeenCalled();

    fireEvent.click(suggestion);
    expect(screen.getByText('ai-tag-1 ×')).toBeInTheDocument();
  });

  it('should submit impulse with content', async () => {
    const user = userEvent.setup();
    const onImpulseCreated = vi.fn();
    const onOpenChange = vi.fn();

    // Mock the insert chain to return an impulse with id
    const insertChain = createChainable({
      data: { id: 'impulse-123' },
      error: null,
    });

    // First calls are for projects/user_tools fetch, then insert
    (mockSupabase.from as any).mockReturnValue(
      createChainable({ data: [], error: null })
    );

    render(
      <ImpulseCatcher
        open={true}
        onOpenChange={onOpenChange}
        onImpulseCreated={onImpulseCreated}
      />,
      { wrapper: createWrapper() }
    );

    const textarea = screen.getByPlaceholderText(/Was geht dir durch den Kopf/i);
    fireEvent.change(textarea, { target: { value: 'Test impulse' } });

    // Before clicking submit, set up the insert mock
    (mockSupabase.from as any).mockReturnValue(insertChain);

    const submitButton = screen.getByRole('button', { name: /speichern/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('impulses');
      expect(onImpulseCreated).toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('should not submit empty impulse', async () => {
    const user = userEvent.setup();
    const impulsesChain = createChainable({ data: [], error: null, count: 0 });
    const defaultChain = createChainable({ data: [], error: null });
    (mockSupabase.from as any).mockImplementation((table: string) =>
      table === 'impulses' ? impulsesChain : defaultChain
    );

    render(<ImpulseCatcher open={true} onOpenChange={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    const submitButton = screen.getByRole('button', { name: /speichern/i });
    expect(submitButton).toBeDisabled();
    await user.click(submitButton);

    // Opening the dialog queries the impulse count for the upgrade nudge, but
    // disabled empty input must never reach the insert operation.
    expect(impulsesChain.insert).not.toHaveBeenCalled();
  });

  it('should handle submission errors', async () => {
    const user = userEvent.setup();
    const { toast } = await import('sonner');

    // Set up from() to return error chain for impulses table
    const errorChain = createChainable({
      data: null,
      error: { message: 'Database error' },
    });
    const defaultChain = createChainable({ data: [], error: null });

    (mockSupabase.from as any).mockImplementation((table: string) => {
      if (table === 'impulses') return errorChain;
      return defaultChain;
    });

    render(<ImpulseCatcher open={true} onOpenChange={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    const textarea = screen.getByPlaceholderText(/Was geht dir durch den Kopf/i);
    fireEvent.change(textarea, { target: { value: 'Test impulse' } });

    const submitButton = screen.getByRole('button', { name: /speichern/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Fehler beim Speichern');
    });
  });

  it('should set initial content when provided', () => {
    render(
      <ImpulseCatcher
        open={true}
        onOpenChange={vi.fn()}
        initialContent="Initial test content"
      />,
      { wrapper: createWrapper() }
    );

    const textarea = screen.getByPlaceholderText(/Was geht dir durch den Kopf/i);
    expect(textarea).toHaveValue('Initial test content');
  });

  it('should set default project when provided', async () => {
    render(
      <ImpulseCatcher
        open={true}
        onOpenChange={vi.fn()}
        defaultProjectId="proj-1"
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
    });
  });

  it('should show loading state during submission', async () => {
    const user = userEvent.setup();

    // Create a chain that never resolves for the insert
    const neverResolvingChain: any = {};
    neverResolvingChain.select = vi.fn().mockReturnValue(neverResolvingChain);
    neverResolvingChain.insert = vi.fn().mockReturnValue(neverResolvingChain);
    neverResolvingChain.update = vi.fn().mockReturnValue(neverResolvingChain);
    neverResolvingChain.delete = vi.fn().mockReturnValue(neverResolvingChain);
    neverResolvingChain.eq = vi.fn().mockReturnValue(neverResolvingChain);
    neverResolvingChain.order = vi.fn().mockReturnValue(neverResolvingChain);
    neverResolvingChain.single = vi.fn().mockReturnValue(neverResolvingChain);
    neverResolvingChain.maybeSingle = vi.fn().mockReturnValue(neverResolvingChain);
    neverResolvingChain.then = () => new Promise(() => {}); // Never resolves

    render(<ImpulseCatcher open={true} onOpenChange={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    const textarea = screen.getByPlaceholderText(/Was geht dir durch den Kopf/i);
    fireEvent.change(textarea, { target: { value: 'Test impulse' } });

    // Set up the insert mock to never resolve
    (mockSupabase.from as any).mockReturnValue(neverResolvingChain);

    const submitButton = screen.getByRole('button', { name: /speichern/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Speichert...')).toBeInTheDocument();
    });
  });

  it('should reset form after successful submission', async () => {
    const user = userEvent.setup();

    const insertChain = createChainable({
      data: { id: 'impulse-123' },
      error: null,
    });

    render(<ImpulseCatcher open={true} onOpenChange={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    const textarea = screen.getByPlaceholderText(/Was geht dir durch den Kopf/i);
    fireEvent.change(textarea, { target: { value: 'Test impulse' } });

    (mockSupabase.from as any).mockReturnValue(insertChain);

    const submitButton = screen.getByRole('button', { name: /speichern/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('impulses');
    });

    // Form should be reset
    expect(textarea).toHaveValue('');
  });

  it('should load user tools on open', async () => {
    render(<ImpulseCatcher open={true} onOpenChange={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('user_tools');
    });
  });
});
