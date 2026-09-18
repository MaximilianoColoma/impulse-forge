import { useState, useRef, ReactNode } from 'react';
import { useSwipeable } from 'react-swipeable';
import { Archive, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsTouchDevice } from '@/hooks/use-touch-device';
import { Button } from '@/components/ui/button';

interface SwipeableCardProps {
  children: ReactNode;
  onArchive?: () => Promise<void>;
  onDelete?: () => Promise<void>;
  className?: string;
}

export function SwipeableCard({ children, onArchive, onDelete, className }: SwipeableCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const isTouchDevice = useIsTouchDevice();
  const cardRef = useRef<HTMLDivElement>(null);

  const handlers = useSwipeable({
    onSwiping: (eventData) => {
      if (!isTouchDevice || eventData.dir !== 'Left') return;
      
      const offset = Math.min(0, eventData.deltaX);
      setSwipeOffset(offset);
      setIsSwiping(true);
    },
    onSwiped: async (eventData) => {
      if (!isTouchDevice || eventData.dir !== 'Left') return;
      
      const cardWidth = cardRef.current?.offsetWidth || 300;
      const swipePercentage = Math.abs(swipeOffset) / cardWidth;
      
      // Haptic feedback when threshold is reached
      if (swipePercentage >= 0.5 && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
      
      // Show action buttons if swiped past 50%
      if (swipePercentage >= 0.5) {
        setShowActions(true);
        setSwipeOffset(0);
      } else {
        // Reset if not enough swipe
        setSwipeOffset(0);
        setShowActions(false);
      }
      
      setIsSwiping(false);
    },
    trackMouse: false,
    trackTouch: true,
  });

  const handleArchive = async () => {
    if (onArchive) {
      await onArchive();
    }
    setShowActions(false);
  };

  const handleDelete = async () => {
    if (onDelete && confirm('Wirklich löschen?')) {
      await onDelete();
    }
    setShowActions(false);
  };

  const handleCancel = () => {
    setShowActions(false);
  };

  if (!isTouchDevice) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn("relative overflow-visible", className)} ref={cardRef}>
      {/* Action Buttons - shown after swipe */}
      {showActions && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex gap-2 animate-fade-in">
          <Button
            size="sm"
            variant="outline"
            onClick={handleArchive}
            className="h-10 px-3 bg-orange-500 text-white border-orange-600 hover:bg-orange-600 shadow-lg"
          >
            <Archive className="h-4 w-4 mr-1" />
            Archivieren
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleDelete}
            className="h-10 px-3 shadow-lg"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Löschen
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            className="h-10 px-2"
          >
            ✕
          </Button>
        </div>
      )}

      {/* Swipeable content */}
      <div
        {...handlers}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        className="relative z-10 bg-card"
      >
        {children}
      </div>
    </div>
  );
}