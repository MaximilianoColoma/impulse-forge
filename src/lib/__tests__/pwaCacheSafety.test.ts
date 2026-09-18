import { describe, expect, it, vi } from 'vitest';
import { removeUnsafeLegacyCaches } from '../pwaCacheSafety';

describe('removeUnsafeLegacyCaches', () => {
  it('deletes only the legacy Supabase response cache', async () => {
    const deleteCache = vi.fn(async () => true);
    const cacheStorage = {
      delete: deleteCache,
    };

    await expect(removeUnsafeLegacyCaches(cacheStorage)).resolves.toEqual(['supabase-cache']);
    expect(deleteCache).toHaveBeenCalledTimes(1);
    expect(deleteCache).toHaveBeenCalledWith('supabase-cache');
  });

  it('reports no deletion when the legacy cache is absent', async () => {
    const cacheStorage = { delete: vi.fn(async () => false) };

    await expect(removeUnsafeLegacyCaches(cacheStorage)).resolves.toEqual([]);
  });

  it('is a no-op when CacheStorage is unavailable', async () => {
    await expect(removeUnsafeLegacyCaches(undefined)).resolves.toEqual([]);
  });
});
