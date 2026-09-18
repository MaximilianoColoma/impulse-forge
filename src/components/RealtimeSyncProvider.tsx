import { ReactNode } from 'react';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Wifi, WifiOff } from 'lucide-react';

export function RealtimeSyncProvider({ children }: { children: ReactNode }) {
  useRealtimeSync();
  const { isOnline, pendingCount } = useOnlineStatus();

  return (
    <>
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-600/90 text-white text-center py-1 text-xs flex items-center justify-center gap-2 backdrop-blur-sm">
          <WifiOff className="h-3 w-3" />
          <span>Offline — Änderungen werden lokal gespeichert</span>
          {pendingCount > 0 && (
            <span className="bg-white/20 rounded-full px-2 py-0.5 text-[10px]">
              {pendingCount} wartend
            </span>
          )}
        </div>
      )}
      {isOnline && pendingCount > 0 && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-primary/90 text-white text-center py-1 text-xs flex items-center justify-center gap-2 backdrop-blur-sm">
          <Wifi className="h-3 w-3" />
          <span>Synchronisiere {pendingCount} Impulse...</span>
        </div>
      )}
      {children}
    </>
  );
}
