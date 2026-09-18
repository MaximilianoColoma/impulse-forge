import { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ImpulseCard as ImpulseCardComponent } from './ImpulseCard';
import { useIsTouchDevice } from '@/hooks/use-touch-device';

interface Impulse {
  id: string;
  content: string;
  tags: string[];
  status: string;
  created_at: string;
  due_date?: string | null;
  project_id?: string | null;
  tool?: string | null;
  attachments?: Array<{
    name: string;
    path: string;
    type: string;
    size: number;
  }>;
}

interface KanbanBoardProps {
  impulses: Impulse[];
  onImpulseUpdate: () => void;
  isSprintMode?: boolean;
  highlightedImpulseIds?: string[];
}

const columns = [
  { id: 'unprocessed', title: 'Impulse & Ideen', color: 'border-l-secondary' },
  { id: 'in-progress', title: 'In Arbeit', color: 'border-l-primary' },
  { id: 'done', title: 'Erledigt', color: 'border-l-[#4ADE80]' },
];

export function KanbanBoard({ impulses, onImpulseUpdate, isSprintMode = false, highlightedImpulseIds = [] }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const isTouchDevice = useIsTouchDevice();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
        delay: 100,
      },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    setOverId(over ? (over.id as string) : null);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);
    setOverId(null);

    if (!over) {
      return;
    }

    const impulseId = active.id as string;
    const newStatus = over.id as string;

    // Check if it's a valid column
    if (!columns.find(col => col.id === newStatus)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('impulses')
        .update({ status: newStatus })
        .eq('id', impulseId);

      if (error) throw error;

      toast.success('Status aktualisiert');
      onImpulseUpdate();
    } catch (error: any) {
      toast.error('Status konnte nicht aktualisiert werden');
    }
  }, [onImpulseUpdate]);

  const getImpulsesByStatus = useCallback((status: string) => {
    return impulses.filter((impulse) => impulse.status === status);
  }, [impulses]);

  const activeImpulse = useMemo(() => impulses.find((imp) => imp.id === activeId), [impulses, activeId]);

  // On touch devices, render without Drag & Drop to avoid scroll conflicts
  if (isTouchDevice) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 overflow-x-auto lg:overflow-x-visible pb-4">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            color={column.color}
            impulses={getImpulsesByStatus(column.id)}
            isOver={false}
            onImpulseUpdate={onImpulseUpdate}
            isSprintMode={isSprintMode}
            highlightedImpulseIds={highlightedImpulseIds}
            isTouchDevice={true}
          />
        ))}
      </div>
    );
  }

  // Desktop: Full Drag & Drop experience
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 overflow-x-auto lg:overflow-x-visible pb-4">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            color={column.color}
            impulses={getImpulsesByStatus(column.id)}
            isOver={overId === column.id}
            onImpulseUpdate={onImpulseUpdate}
            isSprintMode={isSprintMode}
            highlightedImpulseIds={highlightedImpulseIds}
            isTouchDevice={false}
          />
        ))}
      </div>

      <DragOverlay>
        {activeImpulse ? (
          <Card
            className="p-4 rotate-3 scale-105 opacity-80"
          >
            <div className="space-y-2">
              <p className="text-sm leading-relaxed">{activeImpulse.content}</p>

              <div className="flex flex-wrap items-center gap-2">
                {activeImpulse.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(activeImpulse.created_at), {
                    addSuffix: true,
                    locale: de,
                  })}
                </span>
              </div>
            </div>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  impulses: Impulse[];
  isOver: boolean;
  onImpulseUpdate: () => void;
  isSprintMode?: boolean;
  highlightedImpulseIds?: string[];
  isTouchDevice?: boolean;
}

function KanbanColumn({ id, title, color, impulses, isOver, onImpulseUpdate, isSprintMode = false, highlightedImpulseIds = [], isTouchDevice = false }: KanbanColumnProps) {
  const impulseIds = impulses.map(imp => imp.id);

  return (
    <div className="space-y-3 min-w-[280px] lg:min-w-0">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant="secondary" className="text-xs">
          {impulses.length}
        </Badge>
      </div>

      {isTouchDevice ? (
        // Touch devices: Simple scrollable list without DnD
        <div
          className={`min-h-[300px] max-h-[calc(100vh-250px)] lg:min-h-[400px] lg:max-h-[calc(100vh-300px)] overflow-y-auto space-y-3 rounded-lg border-2 border-dashed p-3 sm:p-4 transition-colors border-border`}
        >
          {impulses.map((impulse) => (
            <ImpulseCardComponent 
              key={impulse.id} 
              impulse={impulse} 
              onUpdate={onImpulseUpdate}
              isSprintMode={isSprintMode}
              isHighlighted={highlightedImpulseIds.includes(impulse.id)}
              isTouchDevice={true}
            />
          ))}
        </div>
      ) : (
        // Desktop: Full DnD experience
        <SortableContext items={impulseIds} strategy={verticalListSortingStrategy} id={id}>
          <div
            className={`min-h-[300px] max-h-[calc(100vh-250px)] lg:min-h-[400px] lg:max-h-[calc(100vh-300px)] overflow-y-auto space-y-3 rounded-lg border-2 border-dashed p-3 sm:p-4 transition-colors ${
              isOver ? 'border-primary bg-accent/30' : 'border-border'
            }`}
          >
            {impulses.map((impulse) => (
              <SortableImpulse 
                key={impulse.id} 
                impulse={impulse} 
                onUpdate={onImpulseUpdate}
                isSprintMode={isSprintMode}
                isHighlighted={highlightedImpulseIds.includes(impulse.id)}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  );
}

interface SortableImpulseProps {
  impulse: Impulse;
  onUpdate: () => void;
  isSprintMode?: boolean;
  isHighlighted?: boolean;
}

function SortableImpulse({ impulse, onUpdate, isSprintMode = false, isHighlighted = false }: SortableImpulseProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: impulse.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="touch-none"
    >
      <ImpulseCardComponent impulse={impulse} onUpdate={onUpdate} isSprintMode={isSprintMode} isHighlighted={isHighlighted} />
    </div>
  );
}
