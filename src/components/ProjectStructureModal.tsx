import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, FolderPlus, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { runtimeFeatures } from '@/lib/runtimeFeatures';

interface Folder {
  name: string;
  description: string;
}

interface ProjectStructureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectsCreated: () => void;
}

export function ProjectStructureModal({ open, onOpenChange, onProjectsCreated }: ProjectStructureModalProps) {
  const [projectIdea, setProjectIdea] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const { checkProjectLimit } = useUsageLimits();

  const canCreateRootProject = async (userId: string) => {
    const { count, error } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('parent_project_id', null);

    if (error) throw error;
    return checkProjectLimit(count ?? 0);
  };

  const handleGenerate = async () => {
    if (!runtimeFeatures.optionalAiEnabled) {
      toast.info('Optionale KI-Strukturierung ist in der privaten PWA deaktiviert. Nutze „Manuell erstellen“.');
      return;
    }

    if (!projectIdea.trim() || projectIdea.trim().length < 5) {
      toast.error('Projektidee zu kurz (mindestens 5 Zeichen)');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('brainstorm-structure', {
        body: { projectIdea: projectIdea.trim() }
      });

      if (error) throw error;

      if (data?.folders && Array.isArray(data.folders)) {
        setFolders(data.folders);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error: any) {
      console.error('Error generating structure:', error);
      toast.error('KI-Generierung fehlgeschlagen');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateStructure = async () => {
    if (folders.length === 0) return;

    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      if (!(await canCreateRootProject(user.id))) return;

      // Create parent project first
      const { data: parentProject, error: parentError } = await supabase
        .from('projects')
        .insert([{ name: projectIdea.trim(), user_id: user.id }])
        .select()
        .single();

      if (parentError) throw parentError;

      // Create sub-projects
      const subProjects = folders.map(folder => ({
        name: folder.name,
        user_id: user.id,
        parent_project_id: parentProject.id
      }));

      const { error: subError } = await supabase
        .from('projects')
        .insert(subProjects);

      if (subError) throw subError;

      toast.success(`✨ Projekt "${parentProject.name}" mit ${folders.length} Bereichen erstellt`);
      handleReset();
      onProjectsCreated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating structure:', error);
      toast.error('Projekterstellung fehlgeschlagen');
    } finally {
      setIsCreating(false);
    }
  };

  const handleManualCreate = async () => {
    if (!projectIdea.trim()) {
      toast.error('Projektname erforderlich');
      return;
    }

    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      if (!(await canCreateRootProject(user.id))) return;

      const { error } = await supabase
        .from('projects')
        .insert([{ name: projectIdea.trim(), user_id: user.id }]);

      if (error) throw error;

      toast.success(`Projekt "${projectIdea.trim()}" erstellt`);
      handleReset();
      onProjectsCreated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast.error('Projekterstellung fehlgeschlagen');
    } finally {
      setIsCreating(false);
    }
  };

  const handleReset = () => {
    setProjectIdea('');
    setFolders([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Neues Projekt erstellen
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="project-idea" className="text-sm font-medium">
              Projektidee
            </label>
            <Input
              id="project-idea"
              placeholder="z.B. Website Relaunch, Marketing-Kampagne..."
              value={projectIdea}
              onChange={(e) => setProjectIdea(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !folders.length) {
                  handleGenerate();
                }
              }}
              disabled={isGenerating || isCreating}
            />
          </div>

          {!folders.length ? (
            <div className="flex gap-2">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !projectIdea.trim() || !runtimeFeatures.optionalAiEnabled}
                className="flex-1"
              >
                {!runtimeFeatures.optionalAiEnabled ? (
                  <>Private PWA: KI pausiert</>
                ) : isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    KI denkt nach...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Struktur mit KI generieren
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleManualCreate}
                disabled={isCreating || !projectIdea.trim()}
              >
                <FolderPlus className="mr-2 h-4 w-4" />
                Manuell erstellen
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium">Vorgeschlagene Struktur:</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {folders.map((folder, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border"
                    >
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{folder.name}</p>
                        <p className="text-sm text-muted-foreground">{folder.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleCreateStructure}
                  disabled={isCreating}
                  className="flex-1"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Erstelle...
                    </>
                  ) : (
                    'Struktur übernehmen'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={isCreating}
                >
                  Neu generieren
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
