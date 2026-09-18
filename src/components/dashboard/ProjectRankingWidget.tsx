import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProjectWithMetrics {
  id: string;
  name: string;
  totalImpulses: number;
  inProgressImpulses: number;
  completedImpulses: number;
  newImpulses: number;
  progress: number;
}

type SortOption = 'alphabetical' | 'newImpulses' | 'inProgress' | 'completed' | 'total';

export function ProjectRankingWidget() {
  const [projects, setProjects] = useState<ProjectWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    const saved = localStorage.getItem('projectSortBy');
    return (saved as SortOption) || 'total';
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjectsWithMetrics();
  }, []);

  useEffect(() => {
    localStorage.setItem('projectSortBy', sortBy);
  }, [sortBy]);

  const fetchProjectsWithMetrics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name')
        .eq('user_id', user.id);

      if (projectsError) throw projectsError;

      // Fetch all impulses
      const { data: impulsesData, error: impulsesError } = await supabase
        .from('impulses')
        .select('project_id, status, created_at')
        .eq('user_id', user.id);

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
        
        const progress = totalImpulses > 0 
          ? Math.round((completedImpulses / totalImpulses) * 100)
          : 0;

        return {
          id: project.id,
          name: project.name,
          totalImpulses,
          inProgressImpulses,
          completedImpulses,
          newImpulses,
          progress
        };
      });

      setProjects(projectsWithMetrics);
    } catch (error) {
      console.error('Error fetching projects with metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortedProjects = useMemo(() => {
    const sorted = [...projects];
    
    switch (sortBy) {
      case 'alphabetical':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'newImpulses':
        return sorted.sort((a, b) => b.newImpulses - a.newImpulses);
      case 'inProgress':
        return sorted.sort((a, b) => b.inProgressImpulses - a.inProgressImpulses);
      case 'completed':
        return sorted.sort((a, b) => b.completedImpulses - a.completedImpulses);
      case 'total':
        return sorted.sort((a, b) => b.totalImpulses - a.totalImpulses);
      default:
        return sorted;
    }
  }, [projects, sortBy]);

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return "text-green-500";
    if (progress >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  const getProgressIcon = (progress: number) => {
    if (progress >= 50) {
      return <TrendingUp className="h-4 w-4" />;
    }
    return <TrendingDown className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Projekt-Fortschritt Ranking</CardTitle>
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
        <CardTitle>Projekt-Fortschritt Ranking</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="text-sm font-medium">
            Sortieren nach:
          </label>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger id="sort-select" className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alphabetical">Alphabetisch (A-Z)</SelectItem>
              <SelectItem value="newImpulses">Neue Impulse (7 Tage)</SelectItem>
              <SelectItem value="inProgress">Impulse in Arbeit</SelectItem>
              <SelectItem value="completed">Erledigte Impulse</SelectItem>
              <SelectItem value="total">Impulse insgesamt</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          {sortedProjects.length === 0 ? (
            <p className="text-muted-foreground text-sm">Keine Projekte vorhanden.</p>
          ) : (
            sortedProjects.map((project, index) => (
              <div
                key={project.id}
                onClick={() => navigate(`/project/${project.id}`)}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{project.name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-sm">
                      <span className="text-muted-foreground">
                        {project.completedImpulses} / {project.totalImpulses} erledigt
                      </span>
                      <span className={`flex items-center gap-1 font-medium ${getProgressColor(project.progress)}`}>
                        {getProgressIcon(project.progress)}
                        {project.progress}%
                      </span>
                      {project.newImpulses > 0 && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {project.newImpulses} neu
                        </span>
                      )}
                      {project.inProgressImpulses > 0 && (
                        <span className="text-xs bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full">
                          {project.inProgressImpulses} in Arbeit
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
