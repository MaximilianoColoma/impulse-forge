import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Play } from "lucide-react";
import { toast } from "sonner";
import { rankTasksByPareto } from '../../../supabase/functions/_shared/paretoPrioritization';

interface Project {
  id: string;
  name: string;
}

interface TopTask {
  id: string;
  content: string;
  status: string;
}

export function NextStepsWidget() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [topTasks, setTopTasks] = useState<TopTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('projects')
        .select('id, name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleProjectSelect = async (projectId: string) => {
    setSelectedProject(projectId);
    setLoading(true);
    setTopTasks([]);

    try {
      const { data, error } = await supabase
        .from('impulses')
        .select('id, content, status, tags, tool')
        .eq('project_id', projectId)
        .eq('is_archived', false)
        .in('status', ['unprocessed', 'in-progress'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTopTasks(rankTasksByPareto(data ?? []).map(({ task }) => task));
    } catch (error) {
      console.error('Error applying Pareto prioritization:', error);
      toast.error('Fehler beim Priorisieren der Aufgaben');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = (projectId: string) => {
    navigate(`/project/${projectId}`);
  };

  if (loadingProjects) {
    return (
      <Card className="next-steps-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Nächste Schritte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="next-steps-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Nächste Schritte
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedProject} onValueChange={handleProjectSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Projekt auswählen..." />
          </SelectTrigger>
          <SelectContent>
            {projects.map(project => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {!loading && topTasks.length > 0 && (
          <div className="space-y-3">
            {topTasks.map((task, index) => (
              <div
                key={task.id}
                className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 hover:border-primary/40 transition-all hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-xs font-medium text-primary">{index + 1}</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium mb-2">{task.content}</p>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleStartTask(selectedProject)}
                      className="w-full"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Jetzt anfangen
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && selectedProject && topTasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Keine offenen Aufgaben für dieses Projekt gefunden.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
