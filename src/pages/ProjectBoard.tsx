import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { KanbanBoard } from '@/components/KanbanBoard';
import { ImpulseCatcher } from '@/components/ImpulseCatcher';
import { ExportModal } from '@/components/ExportModal';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Download, LayoutDashboard, Sparkles, FolderInput } from 'lucide-react';
import { toast } from 'sonner';
import { MoveProjectsModal } from '@/components/MoveProjectsModal';
import { rankTasksByPareto } from '../../supabase/functions/_shared/paretoPrioritization';

export default function ProjectBoard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [impulses, setImpulses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [catcherOpen, setCatcherOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [isSprintMode, setIsSprintMode] = useState(false);
  const [prioritizedTaskIds, setPrioritizedTaskIds] = useState<string[]>([]);
  const [isPrioritizing, setIsPrioritizing] = useState(false);
  const [moveProjectsModalOpen, setMoveProjectsModalOpen] = useState(false);

  useEffect(() => {
    fetchProjectData();
  }, [id]);

  const fetchProjectData = async () => {
    if (!id) return;

    try {
      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Fetch project impulses
      const { data: impulsesData, error: impulsesError } = await supabase
        .from('impulses')
        .select('*')
        .eq('project_id', id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (impulsesError) throw impulsesError;
      setImpulses(impulsesData || []);
    } catch (error: any) {
      toast.error('Projekt konnte nicht geladen werden');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleAIPrioritization = () => {
    if (!id) return;

    setIsPrioritizing(true);
    setPrioritizedTaskIds([]);

    try {
      const openImpulses = impulses.filter((impulse) =>
        ['unprocessed', 'in-progress'].includes(impulse.status),
      );
      const rankedTasks = rankTasksByPareto(openImpulses);

      if (rankedTasks.length > 0) {
        const taskIds = rankedTasks.map(({ task }) => task.id);
        setPrioritizedTaskIds(taskIds);
        toast.success(`🎯 Pareto-Fokus: ${rankedTasks.length} nächste Schritte`, {
          description: 'Deterministisch aus Status-, Impact-, Blocker- und Dringlichkeitssignalen.'
        });
      } else {
        toast.info('Keine offenen Aufgaben zum Priorisieren gefunden.');
      }
    } catch (error) {
      console.error('Pareto-Priorisierung fehlgeschlagen:', error);
      toast.error('Pareto-Priorisierung fehlgeschlagen');
    } finally {
      setIsPrioritizing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="min-h-screen">
      {/* Sprint Mode Banner */}
      {isSprintMode && (
        <div className="bg-primary text-primary-foreground py-3 px-4 sm:px-6 lg:px-8 sticky top-0 z-20 shadow-lg">
          <div className="mx-auto max-w-7xl flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-lg sm:text-xl">🏃</span>
              <div>
                <p className="font-bold text-sm sm:text-base">SPRINT MODUS</p>
                <p className="text-xs sm:text-sm opacity-90">{project.name}</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsSprintMode(false)}
              className="flex-shrink-0"
            >
              Sprint beenden
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/')}
                  className="flex-shrink-0"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/dashboard')}
                  title="Strategisches Dashboard"
                  className="flex-shrink-0"
                >
                  <LayoutDashboard className="h-5 w-5" />
                </Button>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-bold truncate">{project.name}</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {impulses.length} Impulse
                </p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              {!isSprintMode && (
                <>
                  <Button 
                    variant="outline" 
                    onClick={() => setMoveProjectsModalOpen(true)}
                    size="sm"
                    className="flex-1 sm:flex-initial"
                    title="Projekte hierher verschieben"
                  >
                    <FolderInput className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Projekte verschieben</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setExportModalOpen(true)}
                    size="sm"
                    className="flex-1 sm:flex-initial"
                  >
                    <Download className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Exportieren</span>
                  </Button>
                  <Button 
                    variant="default"
                    onClick={() => setIsSprintMode(true)}
                    size="sm"
                    className="flex-1 sm:flex-initial"
                  >
                    Sprint starten
                  </Button>
                </>
              )}
              <Button 
                onClick={() => setCatcherOpen(true)}
                size="sm"
                className="flex-1 sm:flex-initial"
              >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Neuer Impuls</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Kanban Board */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pt-24">
        {/* AI Prioritization Button */}
        {!isSprintMode && impulses.some(i => i.status !== 'done') && (
          <div className="mb-6 flex justify-center">
            <Button
              onClick={handleAIPrioritization}
              disabled={isPrioritizing}
              size="lg"
              className="gap-2 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
            >
              <Sparkles className={`h-5 w-5 ${isPrioritizing ? 'animate-spin' : ''}`} />
              {isPrioritizing ? 'Priorisiere Aufgaben...' : 'Nächste Schritte finden (Pareto)'}
            </Button>
          </div>
        )}

        {impulses.length === 0 ? (
          <div className="py-12 text-center">
            <p className="mb-4 text-muted-foreground">
              Noch keine Impulse in diesem Projekt
            </p>
            <Button onClick={() => setCatcherOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Ersten Impuls hinzufügen
            </Button>
          </div>
        ) : (
          <KanbanBoard 
            impulses={impulses} 
            onImpulseUpdate={fetchProjectData}
            isSprintMode={isSprintMode}
            highlightedImpulseIds={prioritizedTaskIds}
          />
        )}
      </main>

      <ImpulseCatcher
        open={catcherOpen}
        onOpenChange={setCatcherOpen}
        onImpulseCreated={fetchProjectData}
        defaultProjectId={id}
      />

      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        defaultProjectId={id}
      />

      <MoveProjectsModal
        open={moveProjectsModalOpen}
        onOpenChange={setMoveProjectsModalOpen}
        currentProjectId={id!}
        currentProjectName={project.name}
        onProjectsMoved={fetchProjectData}
      />
    </div>
  );
}
