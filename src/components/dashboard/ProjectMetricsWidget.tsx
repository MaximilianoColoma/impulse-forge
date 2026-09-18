import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";

interface ProjectMetrics {
  id: string;
  name: string;
  totalImpulses: number;
  newImpulses: number;
}

export function ProjectMetricsWidget() {
  const [projects, setProjects] = useState<ProjectMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjectMetrics();
  }, []);

  const fetchProjectMetrics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!projectsData) {
        setProjects([]);
        return;
      }

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const metricsPromises = projectsData.map(async (project) => {
        const { data: allImpulses } = await supabase
          .from('impulses')
          .select('id, created_at')
          .eq('project_id', project.id);

        const totalImpulses = allImpulses?.length || 0;
        const newImpulses = allImpulses?.filter(
          imp => new Date(imp.created_at) > sevenDaysAgo
        ).length || 0;

        return {
          id: project.id,
          name: project.name,
          totalImpulses,
          newImpulses,
        };
      });

      const metrics = await Promise.all(metricsPromises);
      setProjects(metrics);
    } catch (error) {
      console.error('Error fetching project metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Projekt-Übersicht</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Projekt-Übersicht</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {projects.length === 0 ? (
          <p className="text-muted-foreground text-sm">Noch keine Projekte erstellt.</p>
        ) : (
          projects.map(project => (
            <div
              key={project.id}
              onClick={() => navigate(`/project/${project.id}`)}
              className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors group"
            >
              <div className="flex-1">
                <h3 className="font-medium">{project.name}</h3>
                <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                  <span>Gesamt: {project.totalImpulses}</span>
                  {project.newImpulses > 0 && (
                    <span className="text-[#FF8A50] font-medium">
                      Neu: {project.newImpulses}
                    </span>
                  )}
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
