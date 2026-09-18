const DB_NAME = 'synapse-offline';
const DB_VERSION = 1;
const STORE_NAME = 'offline-impulses';

interface OfflineImpulse {
  id: string;
  content: string;
  tags: string[];
  status: string;
  created_at: string;
  synced: boolean;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineImpulse(impulse: OfflineImpulse): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(impulse);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getOfflineImpulses(): Promise<OfflineImpulse[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const request = tx.objectStore(STORE_NAME).getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingImpulses(): Promise<OfflineImpulse[]> {
  const all = await getOfflineImpulses();
  return all.filter(i => !i.synced);
}

export async function markAsSynced(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const request = store.get(id);
  request.onsuccess = () => {
    const impulse = request.result;
    if (impulse) {
      impulse.synced = true;
      store.put(impulse);
    }
  };
}

export async function removeOfflineImpulse(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(id);
}

export async function syncOfflineImpulses(): Promise<number> {
  const { supabase } = await import('@/integrations/supabase/client');
  const pending = await getPendingImpulses();
  let synced = 0;

  for (const impulse of pending) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) continue;
      const { error } = await supabase.from('impulses').insert({
        content: impulse.content,
        tags: impulse.tags,
        status: impulse.status,
        user_id: userId,
      });
      if (!error) {
        await removeOfflineImpulse(impulse.id);
        synced++;
      }
    } catch {
      // Will retry next sync cycle
    }
  }
  return synced;
}
