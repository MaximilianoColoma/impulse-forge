import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

interface Impulse {
  id: string;
  content: string;
  tags: string[];
  status: string;
  created_at: string;
  due_date?: string | null;
  project_id?: string | null;
  tool?: string | null;
  is_focus_block?: boolean;
  attachments?: Array<{
    name: string;
    path: string;
    type: string;
    size: number;
  }>;
}

interface VirtualizedImpulseListProps {
  impulses: Impulse[];
  renderItem: (impulse: Impulse, index: number) => React.ReactNode;
}

export const VirtualizedImpulseList: React.FC<VirtualizedImpulseListProps> = ({
  impulses,
  renderItem,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: impulses.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 224, // Geschätzte Höhe eines Impuls-Elements (h-56 = 14rem = 224px)
    overscan: 5, // Render 5 extra items for smooth scrolling
  });

  return (
    <div
      ref={parentRef}
      className="h-[calc(100vh-250px)] overflow-auto"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(impulses[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
};
