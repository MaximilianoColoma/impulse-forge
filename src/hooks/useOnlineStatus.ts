import { useState, useEffect } from 'react';
import { syncOfflineImpulses, getPendingImpulses } from '@/services/offlineStorage';
import { toast } from 'sonner';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      const synced = await syncOfflineImpulses();
      if (synced > 0) {
        toast.success(`${synced} Offline-Impulse synchronisiert`);
      }
      const remaining = await getPendingImpulses();
      setPendingCount(remaining.length);
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.info('Offline — Änderungen werden lokal gespeichert');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check pending count on mount
    getPendingImpulses().then(p => setPendingCount(p.length));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, pendingCount };
}
