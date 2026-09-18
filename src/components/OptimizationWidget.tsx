import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Brain, Loader2, Sparkles, Archive, FolderPlus, Edit, GitMerge, Lock } from 'lucide-react';
import { useActivityStatus } from '@/hooks/useActivityStatus';
import { useSubscriptionTier } from '@/hooks/useSubscriptionTier';
import { UnlockDialog } from './UnlockDialog';
import { RollbackButton } from './RollbackButton';
import { runtimeFeatures } from '@/lib/runtimeFeatures';

interface Suggestion {
  type: 'merge' | 'create' | 'archive' | 'rename';
  description: string;
  projectIds?: string[];
  projectId?: string;
  newParentName?: string;
  newProjectName?: string;
  newName?: string;
}

interface Analysis {
  summary: string;
  suggestions: Suggestion[];
}

export const OptimizationWidget = ({ onUpdate }: { onUpdate: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [showRollback, setShowRollback] = useState(false);
  const { toast } = useToast();
  const { data: activityStatus } = useActivityStatus();
  const { tier } = useSubscriptionTier();

  const runAnalysis = async () => {
    if (!runtimeFeatures.optionalAiEnabled) {
      toast({
        title: 'In der privaten PWA pausiert',
        description: 'Optionale KI-Strukturanalyse ist deaktiviert. Pareto-Priorisierung bleibt verfügbar.',
      });
      return;
    }

    // Check subscription tier first
    if (tier === 'free') {
      setShowUnlockDialog(true);
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('optimize-structure');
      
      if (error) throw error;
      
      // Check if no data available
      if (data.empty) {
        toast({
          title: 'Keine Daten vorhanden',
          description: data.message || 'Erstelle zuerst Projekte und Impulse, um die KI-Optimierung zu nutzen.',
          variant: 'default',
        });
        return;
      }
      
      if (data.error) {
        if (data.error.includes('Rate limit')) {
          toast({
            title: 'Rate Limit erreicht',
            description: 'Bitte versuche es später erneut.',
            variant: 'destructive',
          });
        } else if (data.error.includes('credits')) {
          toast({
            title: 'Keine Credits verfügbar',
            description: 'Bitte füge Credits zu deinem Workspace hinzu.',
            variant: 'destructive',
          });
        } else {
          throw new Error(data.error);
        }
        return;
      }
      
      setAnalysis(data);
      setIsOpen(true);
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: 'Fehler bei der Analyse',
        description: 'Die KI-Analyse konnte nicht durchgeführt werden.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const createSnapshot = async () => {
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, parent_project_id')
      .eq('is_archived', false);

    if (projects) {
      const snapshotData = {
        snapshot_data: projects,
        description: 'Vor KI-Optimierung',
      };
      // @ts-ignore - Type mismatch due to new column not in types yet
      await supabase.from('structure_snapshots').insert(snapshotData);
    }
  };

  const toggleSuggestion = (index: number) => {
    const newSelected = new Set(selectedSuggestions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSuggestions(newSelected);
  };

  const applySuggestions = async () => {
    if (!analysis || selectedSuggestions.size === 0) return;

    setIsApplying(true);
    const previousAnalysis = analysis;
    const previousSelected = new Set(selectedSuggestions);
    
    try {
      // Create snapshot before applying changes
      await createSnapshot();

      const selectedItems = Array.from(selectedSuggestions).map(i => analysis.suggestions[i]);

      for (const suggestion of selectedItems) {
        switch (suggestion.type) {
          case 'create':
            const newProject = { name: suggestion.newProjectName! };
            // @ts-ignore - Type mismatch
            await supabase.from('projects').insert(newProject);
            break;
          
          case 'rename':
            const updateData = { name: suggestion.newName! };
            // @ts-ignore - Type mismatch
            await supabase.from('projects')
              .update(updateData)
              .eq('id', suggestion.projectId!);
            break;
          
          case 'archive':
            await supabase.from('projects')
              .update({ is_archived: true })
              .eq('id', suggestion.projectId!);
            break;
          
          case 'merge':
            // Create new parent project
            const { data: newParent } = await supabase.from('projects')
              .insert({ name: suggestion.newParentName! } as any)
              .select()
              .single();
            
            if (newParent) {
              // Move projects under new parent
              await supabase.from('projects')
                .update({ parent_project_id: newParent.id } as any)
                .in('id', suggestion.projectIds!);
            }
            break;
        }
      }

      toast({
        title: 'Optimierung erfolgreich',
        description: `${selectedSuggestions.size} Vorschläge wurden angewendet.`,
      });

      setIsOpen(false);
      setSelectedSuggestions(new Set());
      setAnalysis(null);
      setShowRollback(true);
      onUpdate();
      
      // Ask if user wants to save as template
      setShowTemplateDialog(true);
    } catch (error) {
      console.error('Error applying suggestions:', error);
      
      // Rollback UI state on error
      setAnalysis(previousAnalysis);
      setSelectedSuggestions(previousSelected);
      setIsOpen(true);
      
      toast({
        title: 'Fehler',
        description: 'Einige Vorschläge konnten nicht angewendet werden. Die Auswahl wurde zurückgesetzt.',
        variant: 'destructive',
      });
    } finally {
      setIsApplying(false);
    }
  };

  const saveAsTemplate = async () => {
    try {
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, parent_project_id')
        .eq('is_archived', false);

      const templateData = {
        name: templateName,
        description: templateDescription,
        template_data: projects,
      };
      // @ts-ignore - Type mismatch due to new column not in types yet
      await supabase.from('structure_templates').insert(templateData);

      toast({
        title: 'Template gespeichert',
        description: `Die Struktur wurde als "${templateName}" gespeichert.`,
      });

      setShowTemplateDialog(false);
      setTemplateName('');
      setTemplateDescription('');
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: 'Fehler',
        description: 'Das Template konnte nicht gespeichert werden.',
        variant: 'destructive',
      });
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'merge': return <GitMerge className="h-4 w-4" />;
      case 'create': return <FolderPlus className="h-4 w-4" />;
      case 'archive': return <Archive className="h-4 w-4" />;
      case 'rename': return <Edit className="h-4 w-4" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {tier !== 'free' ? (
              <Brain className="h-6 w-6 text-primary" />
            ) : (
              <Lock className="h-6 w-6 text-muted-foreground" />
            )}
            <h3 className="text-lg font-semibold">KI-Optimierung</h3>
          </div>
          {showRollback && (
            <RollbackButton onUpdate={() => { onUpdate(); setShowRollback(false); }} />
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {!runtimeFeatures.optionalAiEnabled ? (
            'Optionale KI-Optimierung ist in der privaten PWA deaktiviert.'
          ) : tier !== 'free' ? (
            'Lass die KI deine Projektstruktur analysieren und Verbesserungsvorschläge machen.'
          ) : (
            'Upgrade zu Pro, um KI-gestützte Optimierungsvorschläge zu nutzen.'
          )}
        </p>
        <Button
          onClick={runAnalysis}
          disabled={isAnalyzing || !runtimeFeatures.optionalAiEnabled}
          className="w-full"
        >
          {!runtimeFeatures.optionalAiEnabled ? (
            <>Private PWA: KI pausiert</>
          ) : isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analysiere...
            </>
          ) : tier !== 'free' ? (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Struktur analysieren
            </>
          ) : (
            <>
              <Lock className="mr-2 h-4 w-4" />
              Upgrade erforderlich
            </>
          )}
        </Button>
      </Card>

      <UnlockDialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog} />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Optimierungsvorschläge
            </DialogTitle>
            <DialogDescription>
              Die KI hat deine Projektstruktur analysiert und folgende Verbesserungen vorgeschlagen.
            </DialogDescription>
          </DialogHeader>

          {analysis && (
            <div className="space-y-6">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm">{analysis.summary}</p>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Vorschläge ({analysis.suggestions.length})</h4>
                {analysis.suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => toggleSuggestion(index)}
                  >
                    <Checkbox
                      checked={selectedSuggestions.has(index)}
                      onCheckedChange={() => toggleSuggestion(index)}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        {getSuggestionIcon(suggestion.type)}
                        <span className="text-sm font-medium capitalize">{suggestion.type}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Abbrechen
                </Button>
                <Button
                  onClick={applySuggestions}
                  disabled={selectedSuggestions.size === 0 || isApplying}
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wende an...
                    </>
                  ) : (
                    `${selectedSuggestions.size} Vorschläge anwenden`
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Struktur als Template speichern?</DialogTitle>
            <DialogDescription>
              Speichere deine neue Projektstruktur als Vorlage für zukünftige Verwendung.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="z.B. Q4 2025 Struktur"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Beschreibung (optional)</label>
              <Textarea
                placeholder="Beschreibe diese Struktur..."
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
                Überspringen
              </Button>
              <Button onClick={saveAsTemplate} disabled={!templateName}>
                Template speichern
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};