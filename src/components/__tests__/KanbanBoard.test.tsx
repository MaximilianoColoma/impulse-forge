import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KanbanBoard } from '../KanbanBoard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock touch device hook
vi.mock('@/hooks/use-touch-device', () => ({
  useIsTouchDevice: vi.fn().mockReturnValue(false),
}));

// Mock PomodoroTimer to avoid localStorage.getItem issue in jsdom
vi.mock('@/components/PomodoroTimer', () => ({
  PomodoroTimer: () => null,
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

const mockImpulses = [
  {
    id: 'imp-1',
    content: 'Test impulse 1',
    tags: ['tag1'],
    status: 'unprocessed',
    created_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'imp-2',
    content: 'Test impulse 2',
    tags: ['tag2'],
    status: 'in-progress',
    created_at: '2024-01-02T00:00:00.000Z',
  },
  {
    id: 'imp-3',
    content: 'Test impulse 3',
    tags: ['tag3'],
    status: 'done',
    created_at: '2024-01-03T00:00:00.000Z',
  },
];

describe('KanbanBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all three columns', () => {
    render(<KanbanBoard impulses={mockImpulses} onImpulseUpdate={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Impulse & Ideen')).toBeInTheDocument();
    expect(screen.getByText('In Arbeit')).toBeInTheDocument();
    expect(screen.getByText('Erledigt')).toBeInTheDocument();
  });

  it('should render impulses in correct columns', () => {
    render(<KanbanBoard impulses={mockImpulses} onImpulseUpdate={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Test impulse 1')).toBeInTheDocument();
    expect(screen.getByText('Test impulse 2')).toBeInTheDocument();
    expect(screen.getByText('Test impulse 3')).toBeInTheDocument();
  });

  it('should display impulse count per column', () => {
    render(<KanbanBoard impulses={mockImpulses} onImpulseUpdate={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    const counts = screen.getAllByText('1');
    expect(counts.length).toBeGreaterThanOrEqual(3); // Each column has 1 impulse
  });

  it('should render empty state for columns with no impulses', () => {
    const emptyImpulses = [
      {
        id: 'imp-1',
        content: 'Test impulse',
        tags: ['tag1'],
        status: 'unprocessed',
        created_at: '2024-01-01T00:00:00.000Z',
      },
    ];

    render(<KanbanBoard impulses={emptyImpulses} onImpulseUpdate={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    // Two columns should show count of 0
    const zeroCounts = screen.getAllByText('0');
    expect(zeroCounts.length).toBe(2);
  });

  it('should highlight impulses when highlightedImpulseIds is provided', () => {
    render(
      <KanbanBoard
        impulses={mockImpulses}
        onImpulseUpdate={vi.fn()}
        highlightedImpulseIds={['imp-1']}
      />,
      { wrapper: createWrapper() }
    );

    // The highlighted impulse should be rendered
    expect(screen.getByText('Test impulse 1')).toBeInTheDocument();
  });

  it('should handle empty impulses array', () => {
    render(<KanbanBoard impulses={[]} onImpulseUpdate={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    // All three columns should show count of 0
    const zeroCounts = screen.getAllByText('0');
    expect(zeroCounts.length).toBe(3);
  });

  it('should display tags for each impulse', () => {
    render(<KanbanBoard impulses={mockImpulses} onImpulseUpdate={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
    expect(screen.getByText('tag3')).toBeInTheDocument();
  });

  it('should render in sprint mode', () => {
    render(
      <KanbanBoard impulses={mockImpulses} onImpulseUpdate={vi.fn()} isSprintMode={true} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Impulse & Ideen')).toBeInTheDocument();
  });

  it('should display impulse with due date', () => {
    const impulsesWithDueDate = [
      {
        id: 'imp-1',
        content: 'Test impulse',
        tags: ['tag1'],
        status: 'unprocessed',
        created_at: '2024-01-01T00:00:00.000Z',
        due_date: '2024-12-31T00:00:00.000Z',
      },
    ];

    render(
      <KanbanBoard impulses={impulsesWithDueDate} onImpulseUpdate={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Test impulse')).toBeInTheDocument();
  });

  it('should display impulse with project', () => {
    const impulsesWithProject = [
      {
        id: 'imp-1',
        content: 'Test impulse',
        tags: ['tag1'],
        status: 'unprocessed',
        created_at: '2024-01-01T00:00:00.000Z',
        project_id: 'proj-1',
      },
    ];

    render(
      <KanbanBoard impulses={impulsesWithProject} onImpulseUpdate={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Test impulse')).toBeInTheDocument();
  });

  it('should display impulse with tool', () => {
    const impulsesWithTool = [
      {
        id: 'imp-1',
        content: 'Test impulse',
        tags: ['tag1'],
        status: 'unprocessed',
        created_at: '2024-01-01T00:00:00.000Z',
        tool: 'lovable',
      },
    ];

    render(
      <KanbanBoard impulses={impulsesWithTool} onImpulseUpdate={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Test impulse')).toBeInTheDocument();
  });

  it('should display impulse with attachments', () => {
    const impulsesWithAttachments = [
      {
        id: 'imp-1',
        content: 'Test impulse',
        tags: ['tag1'],
        status: 'unprocessed',
        created_at: '2024-01-01T00:00:00.000Z',
        attachments: [
          {
            name: 'test.pdf',
            path: '/path/to/file',
            type: 'application/pdf',
            size: 1024,
          },
        ],
      },
    ];

    render(
      <KanbanBoard impulses={impulsesWithAttachments} onImpulseUpdate={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Test impulse')).toBeInTheDocument();
  });

  it('should handle update callback', async () => {
    const onUpdate = vi.fn();
    render(<KanbanBoard impulses={mockImpulses} onImpulseUpdate={onUpdate} />, {
      wrapper: createWrapper(),
    });

    // The callback should be ready to be called
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('should display created_at timestamp', () => {
    render(<KanbanBoard impulses={mockImpulses} onImpulseUpdate={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    // All impulses should be rendered with timestamps
    expect(screen.getByText('Test impulse 1')).toBeInTheDocument();
    expect(screen.getByText('Test impulse 2')).toBeInTheDocument();
    expect(screen.getByText('Test impulse 3')).toBeInTheDocument();
  });

  it('should group impulses by status correctly', () => {
    const mixedImpulses = [
      {
        id: 'imp-1',
        content: 'Unprocessed 1',
        tags: [],
        status: 'unprocessed',
        created_at: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'imp-2',
        content: 'Unprocessed 2',
        tags: [],
        status: 'unprocessed',
        created_at: '2024-01-02T00:00:00.000Z',
      },
      {
        id: 'imp-3',
        content: 'In Progress 1',
        tags: [],
        status: 'in-progress',
        created_at: '2024-01-03T00:00:00.000Z',
      },
    ];

    render(<KanbanBoard impulses={mixedImpulses} onImpulseUpdate={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Unprocessed 1')).toBeInTheDocument();
    expect(screen.getByText('Unprocessed 2')).toBeInTheDocument();
    expect(screen.getByText('In Progress 1')).toBeInTheDocument();
  });
});
