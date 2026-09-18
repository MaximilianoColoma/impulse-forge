import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, FolderInput } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  parent_project_id: string | null;
}

interface MoveProjectsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentProjectId: string;
  currentProjectName: string;
  onProjectsMoved: () => void;
}

export function MoveProjectsModal({
  open,
  onOpenChange,
  currentProjectId,
  currentProjectName,
  onProjectsMoved
}: MoveProjectsModalProps) {
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchProjects();
      setSelectedProjectIds(new Set());
      setSearchQuery('');
    }
  }, [open, currentProjectId]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('projects')
        .select('id, name, parent_project_id')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('name');

      if (error) throw error;
      setAllProjects(data || []);
    } catch (error: any) {
      toast.error('Projekte konnten nicht geladen werden');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Get all descendant project IDs (children, grandchildren, etc.)
  const getDescendantIds = (projectId: string, projects: Project[]): Set<string> => {
    const descendants = new Set<string>();
    const children = projects.filter(p => p.parent_project_id === projectId);
    
    children.forEach(child => {
      descendants.add(child.id);
      const grandchildren = getDescendantIds(child.id, projects);
      grandchildren.forEach(id => descendants.add(id));
    });
    
    return descendants;
  };

  // Filter out current project and its descendants
  const availableProjects = useMemo(() => {
    const descendantIds = getDescendantIds(currentProjectId, allProjects);
    return allProjects.filter(p => 
      p.id !== currentProjectId && !descendantIds.has(p.id)
    );
  }, [allProjects, currentProjectId]);

  // Filter by search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return availableProjects;
    const query = searchQuery.toLowerCase();
    return availableProjects.filter(p => 
      p.name.toLowerCase().includes(query)
    );
  }, [availableProjects, searchQuery]);

  const handleToggleProject = (projectId: string) => {
    const newSelected = new Set(selectedProjectIds);
    if (newSelected.has(projectId)) {
      newSelected.delete(projectId);
    } else {
      newSelected.add(projectId);
    }
    setSelectedProjectIds(newSelected);
  };

  const handleMoveProjects = async () => {
    if (selectedProjectIds.size === 0) return;

    setMoving(true);
    try {
      const { error } = await supabase.functions.invoke('move-projects', {
        body: {
          projectIdsToMove: Array.from(selectedProjectIds),
          destinationParentId: currentProjectId
        }
      });

      if (error) throw error;

      toast.success(
        `${selectedProjectIds.size} ${selectedProjectIds.size === 1 ? 'Projekt wurde' : 'Projekte wurden'} erfolgreich nach "${currentProjectName}" verschoben.`
      );
      
      onProjectsMoved();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Move projects error:', error);
      toast.error('Projekte konnten nicht verschoben werden');
    } finally {
      setMoving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderInput className="h-5 w-5" />
            Projekte nach "{currentProjectName}" verschieben
          </DialogTitle>
          <DialogDescription>
            Wähle Projekte aus, die zu Unterordnern von "{currentProjectName}" werden sollen.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Projekte durchsuchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Project List */}
          <div className="flex-1 overflow-y-auto border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                {searchQuery ? 'Keine Projekte gefunden' : 'Keine verfügbaren Projekte zum Verschieben'}
              </div>
            ) : (
              <div className="divide-y">
                {filteredProjects.map(project => (
                  <label
                    key={project.id}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={selectedProjectIds.has(project.id)}
                      onCheckedChange={() => handleToggleProject(project.id)}
                    />
                    <span className="flex-1 text-sm">{project.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {selectedProjectIds.size > 0 
                ? `${selectedProjectIds.size} ${selectedProjectIds.size === 1 ? 'Projekt' : 'Projekte'} ausgewählt`
                : 'Keine Projekte ausgewählt'
              }
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={moving}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleMoveProjects}
                disabled={selectedProjectIds.size === 0 || moving}
              >
                {moving ? 'Verschiebe...' : `${selectedProjectIds.size || ''} ${selectedProjectIds.size === 1 ? 'Projekt' : 'Projekte'} verschieben`.trim()}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
