import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, Settings } from 'lucide-react';
import { HierarchicalProjectList } from '@/components/HierarchicalProjectList';
import { ProjectStructureModal } from '@/components/ProjectStructureModal';
import { OptimizationWidget } from '@/components/OptimizationWidget';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { UpgradeNudgeBanner } from '@/components/UpgradeNudgeBanner';
import { useSubscriptionTier } from '@/hooks/useSubscriptionTier';

interface ProjectWithMetrics {
  id: string;
  name: string;
  parent_project_id?: string | null;
  updated_at: string;
  totalImpulses: number;
  inProgressImpulses: number;
  completedImpulses: number;
  newImpulses: number;
}

export default function Projects() {
  const [modalOpen, setModalOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tier } = useSubscriptionTier();
  const rootProjectCount = projects.filter((project) => !project.parent_project_id).length;

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all non-archived projects, sorted by updated_at
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, parent_project_id, updated_at')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });

      if (projectsError) throw projectsError;

      // Fetch all non-archived impulses
      const { data: impulsesData, error: impulsesError } = await supabase
        .from('impulses')
        .select('project_id, status, created_at')
        .eq('user_id', user.id)
        .eq('is_archived', false);

      if (impulsesError) throw impulsesError;

      // Calculate metrics for each project
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const projectsWithMetrics: ProjectWithMetrics[] = (projectsData || []).map(project => {
        const projectImpulses = (impulsesData || []).filter(i => i.project_id === project.id);
        
        const totalImpulses = projectImpulses.length;
        const inProgressImpulses = projectImpulses.filter(i => i.status === 'in-progress').length;
        const completedImpulses = projectImpulses.filter(i => i.status === 'done').length;
        const newImpulses = projectImpulses.filter(i => 
          new Date(i.created_at) >= sevenDaysAgo
        ).length;

        return {
          ...project,
          totalImpulses,
          inProgressImpulses,
          completedImpulses,
          newImpulses
        };
      });

      setProjects(projectsWithMetrics);
    } catch (error: any) {
      toast.error('Projekte konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectsCreated = () => {
    fetchProjects();
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Projekte</h1>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/settings')}
            >
              <Settings className="h-5 w-5" />
            </Button>
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Neu
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 pt-24">
        {!loading && tier === 'free' && (
          <div className="mb-4">
            <UpgradeNudgeBanner
              surface="projects.list"
              context={{ projectsCount: rootProjectCount }}
            />
          </div>
        )}
        {!loading && projects.length > 0 && (
          <div className="mb-6">
            <OptimizationWidget onUpdate={fetchProjects} />
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              Noch keine Projekte erstellt
            </p>
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Erstes Projekt erstellen
            </Button>
          </div>
        ) : (
          <HierarchicalProjectList projects={projects} onUpdate={fetchProjects} />
        )}
      </main>

      <ProjectStructureModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onProjectsCreated={handleProjectsCreated}
      />
    </div>
  );
}
