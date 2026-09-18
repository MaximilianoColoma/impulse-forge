import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const invoke = vi.fn();
  const localRows = [{ id: 'impulse-1', content: 'Launch blocker customer' }];
  const limit = vi.fn(async () => ({ data: localRows, error: null }));
  const ilike = vi.fn(() => ({ limit }));
  const select = vi.fn(() => ({ ilike }));
  const from = vi.fn(() => ({ select }));
  return { invoke, localRows, limit, ilike, select, from };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: mocks.invoke },
    from: mocks.from,
  },
}));

import { generateTags } from '../aiTagging';
import { searchImpulses } from '../semanticSearch';

describe('self-hosted AI-independent service fallbacks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates tags locally without invoking an edge function', async () => {
    const tags = await generateTags('Launch blocker customer outcome');

    expect(tags.length).toBeGreaterThan(0);
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it('searches impulses directly without invoking semantic-search', async () => {
    await expect(searchImpulses('launch')).resolves.toEqual(mocks.localRows);

    expect(mocks.from).toHaveBeenCalledWith('impulses');
    expect(mocks.select).toHaveBeenCalledWith('*');
    expect(mocks.ilike).toHaveBeenCalledWith('content', '%launch%');
    expect(mocks.limit).toHaveBeenCalledWith(50);
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
});
