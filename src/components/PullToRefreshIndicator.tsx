import React from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshIndicatorProps {
  isPulling: boolean;
  pullDistance: number;
  pullProgress: number;
  isRefreshing: boolean;
  threshold?: number;
}

export const PullToRefreshIndicator: React.FC<PullToRefreshIndicatorProps> = ({
  isPulling,
  pullDistance,
  pullProgress,
  isRefreshing,
  threshold = 80,
}) => {
  if (!isPulling && !isRefreshing) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
      style={{ 
        transform: `translateY(${Math.max(0, pullDistance - 20)}px)`,
        opacity: Math.min(1, pullDistance / 20)
      }}
    >
      <div className="bg-background border rounded-full p-2 shadow-md flex items-center justify-center">
        {isRefreshing ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <RefreshCw 
            className={cn(
              "h-5 w-5 text-primary transition-transform",
              pullProgress >= 1 && "rotate-180"
            )} 
            style={{ 
              transform: `rotate(${pullProgress * 180}deg)` 
            }}
          />
        )}
      </div>
    </div>
  );
};
