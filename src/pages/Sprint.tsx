import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { KanbanBoard } from '@/components/KanbanBoard';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Zap, Target, Calendar, AlertTriangle, CheckCircle2, TrendingUp, LayoutList, Columns } from 'lucide-react';
import { isPast, isToday, isTomorrow, format, startOfToday, differenceInHours } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';
import { ImpulseCard } from '@/components/ImpulseCard';
import { cn } from '@/lib/utils';

interface SprintImpulse {
  id: string;
  content: string;
  tags: string[];
  status: string;
  created_at: string;
  due_date?: string | null;
  project_id?: string | null;
  tool?: string | null;
  is_focus_block?: boolean;
  attachments?: Array<{ name: string; path: string; type: string; size: number }>;
}

interface Project {
  id: string;
  name: string;
}

type ViewMode = 'kanban' | 'list';

export default function Sprint() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [impulses, setImpulses] = useState<SprintImpulse[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [impRes, projRes] = await Promise.all([
        supabase
          .from('impulses')
          .select('id, content, tags, status, created_at, due_date, project_id, tool, is_focus_block, attachments')
          .eq('user_id', user.id)
          .eq('is_archived', false)
          .neq('status', 'done')
          .order('due_date', { ascending: true, nullsFirst: false }),
        supabase
          .from('projects')
          .select('id, name')
          .eq('user_id', user.id)
          .eq('is_archived', false)
          .order('name'),
      ]);

      if (impRes.error) throw impRes.error;
      if (projRes.error) throw projRes.error;

      setImpulses((impRes.data || []) as SprintImpulse[]);
      setProjects(projRes.data || []);
    } catch {
      toast.error('Fehler beim Laden der Sprint-Daten');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sprint impulses: overdue, due today, due tomorrow, or in-progress without date
  const sprintImpulses = useMemo(() => {
    return impulses.filter(imp => {
      // Always include in-progress items
      if (imp.status === 'in-progress') return true;
      // Include items with due dates that are overdue, today, or tomorrow
      if (imp.due_date) {
        const dueDate = new Date(imp.due_date);
        return isPast(dueDate) || isToday(dueDate) || isTomorrow(dueDate);
      }
      // Include focus blocks
      if (imp.is_focus_block) return true;
      return false;
    });
  }, [impulses]);

  // Apply project filter
  const filteredImpulses = useMemo(() => {
    if (selectedProject === 'all') return sprintImpulses;
    if (selectedProject === 'none') return sprintImpulses.filter(i => !i.project_id);
    return sprintImpulses.filter(i => i.project_id === selectedProject);
  }, [sprintImpulses, selectedProject]);

  // Stats
  const stats = useMemo(() => {
    const overdue = filteredImpulses.filter(i => i.due_date && isPast(new Date(i.due_date)) && !isToday(new Date(i.due_date))).length;
    const today = filteredImpulses.filter(i => i.due_date && isToday(new Date(i.due_date))).length;
    const inProgress = filteredImpulses.filter(i => i.status === 'in-progress').length;
    const total = filteredImpulses.length;
    return { overdue, today, inProgress, total };
  }, [filteredImpulses]);

  // Highlight overdue impulses
  const highlightedIds = useMemo(() => {
    return filteredImpulses
      .filter(i => i.due_date && isPast(new Date(i.due_date)) && !isToday(new Date(i.due_date)))
      .map(i => i.id);
  }, [filteredImpulses]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Sprint wird geladen…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold">Sprint Modus</h1>
              {stats.total > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {stats.total}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex bg-muted rounded-lg p-0.5">
                <Button
                  variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setViewMode('kanban')}
                >
                  <Columns className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setViewMode('list')}
                >
                  <LayoutList className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Stats bar */}
          {stats.total > 0 && (
            <div className="flex items-center gap-3 mt-2 text-xs">
              {stats.overdue > 0 && (
                <span className="flex items-center gap-1 text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  {stats.overdue} überfällig
                </span>
              )}
              {stats.today > 0 && (
                <span className="flex items-center gap-1 text-primary">
                  <Calendar className="h-3 w-3" />
                  {stats.today} heute
                </span>
              )}
              {stats.inProgress > 0 && (
                <span className="flex items-center gap-1 text-yellow-500">
                  <TrendingUp className="h-3 w-3" />
                  {stats.inProgress} in Arbeit
                </span>
              )}
            </div>
          )}

          {/* Project filter */}
          {stats.total > 0 && (
            <div className="mt-2">
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="h-8 text-xs w-48">
                  <SelectValue placeholder="Projekt filtern" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Projekte</SelectItem>
                  <SelectItem value="none">Ohne Projekt</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-4">
        {filteredImpulses.length === 0 ? (
          <div className="pt-12">
            <EmptyState
              icon={CheckCircle2}
              title="Alles erledigt!"
              description={
                sprintImpulses.length > 0
                  ? "Keine Impulse in diesem Projekt. Wähle ein anderes Projekt oder entferne den Filter."
                  : "Keine überfälligen oder heutigen Aufgaben. Genieße den Moment!"
              }
              action={{
                label: "Zum Dashboard",
                onClick: () => navigate('/app'),
              }}
            />
          </div>
        ) : viewMode === 'kanban' ? (
          <KanbanBoard
            impulses={filteredImpulses}
            onImpulseUpdate={fetchData}
            isSprintMode={true}
            highlightedImpulseIds={highlightedIds}
          />
        ) : (
          <div className="space-y-3 max-w-2xl mx-auto">
            {/* Overdue section */}
            {stats.overdue > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-destructive mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Überfällig
                </h2>
                <div className="space-y-2">
                  {filteredImpulses
                    .filter(i => i.due_date && isPast(new Date(i.due_date)) && !isToday(new Date(i.due_date)))
                    .map(impulse => (
                      <ImpulseCard
                        key={impulse.id}
                        impulse={impulse}
                        onUpdate={fetchData}
                        isSprintMode={true}
                        isHighlighted={true}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Today section */}
            {stats.today > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-primary mb-2 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Heute fällig
                </h2>
                <div className="space-y-2">
                  {filteredImpulses
                    .filter(i => i.due_date && isToday(new Date(i.due_date)))
                    .map(impulse => (
                      <ImpulseCard
                        key={impulse.id}
                        impulse={impulse}
                        onUpdate={fetchData}
                        isSprintMode={true}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* In progress / Focus / Tomorrow */}
            {filteredImpulses.filter(i => {
              if (i.due_date && (isPast(new Date(i.due_date)) || isToday(new Date(i.due_date)))) return false;
              return true;
            }).length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  In Arbeit & Bevorstehend
                </h2>
                <div className="space-y-2">
                  {filteredImpulses
                    .filter(i => {
                      if (i.due_date && (isPast(new Date(i.due_date)) || isToday(new Date(i.due_date)))) return false;
                      return true;
                    })
                    .map(impulse => (
                      <ImpulseCard
                        key={impulse.id}
                        impulse={impulse}
                        onUpdate={fetchData}
                        isSprintMode={true}
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
