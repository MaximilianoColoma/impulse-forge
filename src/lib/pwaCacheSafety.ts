export interface CacheStorageLike {
  delete(cacheName: string): Promise<boolean>;
}

const UNSAFE_LEGACY_CACHES = new Set(['supabase-cache']);

export async function removeUnsafeLegacyCaches(
  cacheStorage: CacheStorageLike | undefined = typeof caches === 'undefined' ? undefined : caches,
): Promise<string[]> {
  if (!cacheStorage) return [];

  const unsafeCaches = [...UNSAFE_LEGACY_CACHES];
  const deletionResults = await Promise.all(
    unsafeCaches.map((name) => cacheStorage.delete(name)),
  );

  return unsafeCaches.filter((_, index) => deletionResults[index]);
}
