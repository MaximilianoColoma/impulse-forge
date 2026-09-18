import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, FolderKanban } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HierarchicalProjectList } from './HierarchicalProjectList';

interface Project {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface ProjectWithMetrics extends Project {
  totalImpulses: number;
  inProgressImpulses: number;
  completedImpulses: number;
  newImpulses: number;
}

type SortOption = 'alphabetical' | 'newImpulses' | 'inProgress' | 'completed' | 'total';

export function ProjectList() {
  const [projects, setProjects] = useState<ProjectWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [parentProjectId, setParentProjectId] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    const saved = localStorage.getItem('projectSortBy');
    return (saved as SortOption) || 'total';
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    localStorage.setItem('projectSortBy', sortBy);
  }, [sortBy]);

  const fetchProjects = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

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

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht authentifiziert');

      const { data, error } = await supabase
        .from('projects')
        .insert([{ 
          name: newProjectName, 
          user_id: user.id,
          parent_project_id: parentProjectId || null
        }])
        .select()
        .single();

      if (error) throw error;

      const newProject: ProjectWithMetrics = {
        ...data,
        totalImpulses: 0,
        inProgressImpulses: 0,
        completedImpulses: 0,
        newImpulses: 0
      };

      setProjects(prev => [newProject, ...prev]);
      setNewProjectName('');
      setParentProjectId(undefined);
      setIsCreating(false);
      toast.success('Projekt erstellt');
    } catch (error: any) {
      toast.error('Projekt konnte nicht erstellt werden');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Projekte
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCreating(!isCreating)}
          className="h-7 w-7 p-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        <label htmlFor="project-sort-select" className="text-xs text-muted-foreground">
          Sortieren nach:
        </label>
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
          <SelectTrigger id="project-sort-select" className="h-8 text-xs">
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

      {isCreating && (
        <form onSubmit={handleCreateProject} className="space-y-2">
          <Input
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Projektname..."
            className="h-9"
            autoFocus
          />
          <Select value={parentProjectId} onValueChange={setParentProjectId}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Hauptprojekt (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Kein Hauptprojekt</SelectItem>
              {sortedProjects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="flex-1">
              Erstellen
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCreating(false);
                setNewProjectName('');
                setParentProjectId(undefined);
              }}
            >
              Abbrechen
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {sortedProjects.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            Noch keine Projekte
          </p>
        ) : (
          <HierarchicalProjectList projects={sortedProjects} />
        )}
      </div>
    </div>
  );
}
