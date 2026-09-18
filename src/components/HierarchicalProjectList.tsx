import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronDown, Folder } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SwipeableCard } from './SwipeableCard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProjectWithMetrics {
  id: string;
  name: string;
  parent_project_id?: string | null;
  updated_at: string;
  totalImpulses: number;
  inProgressImpulses: number;
  completedImpulses: number;
  newImpulses: number;
  children?: ProjectWithMetrics[];
}

interface HierarchicalProjectListProps {
  projects: ProjectWithMetrics[];
}

function buildHierarchy(projects: ProjectWithMetrics[]): ProjectWithMetrics[] {
  const map = new Map<string, ProjectWithMetrics>();
  const roots: ProjectWithMetrics[] = [];

  // Create map of all projects
  projects.forEach(project => {
    map.set(project.id, { ...project, children: [] });
  });

  // Build tree structure
  projects.forEach(project => {
    const node = map.get(project.id)!;
    if (project.parent_project_id) {
      const parent = map.get(project.parent_project_id);
      if (parent && parent.children) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  // Sort by updated_at (newest first)
  const sortByDate = (a: ProjectWithMetrics, b: ProjectWithMetrics) =>
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();

  roots.sort(sortByDate);

  // Recursively sort children
  const sortChildren = (items: ProjectWithMetrics[]) => {
    items.forEach(item => {
      if (item.children && item.children.length > 0) {
        item.children.sort(sortByDate);
        sortChildren(item.children);
      }
    });
  };
  sortChildren(roots);

  return roots;
}

function ProjectNode({ project, depth = 0, onUpdate }: { project: ProjectWithMetrics; depth?: number; onUpdate?: () => void }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const navigate = useNavigate();
  const hasChildren = project.children && project.children.length > 0;

  const handleArchive = async () => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ is_archived: true })
        .eq('id', project.id);

      if (error) throw error;

      toast.success('📦 Projekt archiviert');
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast.error('Fehler beim Archivieren');
      console.error(error);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);

      if (error) throw error;

      toast.success('🗑️ Projekt gelöscht');
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast.error('Fehler beim Löschen');
      console.error(error);
    }
  };

  return (
    <div className="space-y-1">
      <SwipeableCard
        onArchive={handleArchive}
        onDelete={handleDelete}
      >
        <Card
        className="p-4 hover:border-primary/50 transition-colors cursor-pointer"
        style={{ marginLeft: `${depth * 20}px` }}
        onClick={() => navigate(`/project/${project.id}`)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="hover:bg-muted rounded p-1"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            )}
            <Folder className="h-4 w-4 text-primary" />
            <span className="font-medium">{project.name}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {project.newImpulses > 0 && (
              <Badge variant="secondary" className="text-xs">
                {project.newImpulses} neu
              </Badge>
            )}
            {project.inProgressImpulses > 0 && (
              <Badge variant="outline" className="text-xs">
                {project.inProgressImpulses} in Arbeit
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {project.totalImpulses}
            </Badge>
          </div>
        </div>
      </Card>
      </SwipeableCard>

      {hasChildren && isExpanded && (
        <div className="space-y-1">
          {project.children!.map(child => (
            <ProjectNode key={child.id} project={child} depth={depth + 1} onUpdate={onUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}

export function HierarchicalProjectList({ projects, onUpdate }: HierarchicalProjectListProps & { onUpdate?: () => void }) {
  const hierarchy = buildHierarchy(projects);

  return (
    <div className="space-y-2">
      {hierarchy.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          Noch keine Projekte
        </p>
      ) : (
        hierarchy.map(project => (
          <ProjectNode key={project.id} project={project} onUpdate={onUpdate} />
        ))
      )}
    </div>
  );
}
