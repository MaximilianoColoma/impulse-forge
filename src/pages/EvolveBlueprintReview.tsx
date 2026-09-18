import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Sparkles, TrendingUp, CheckCircle2, XCircle, ArrowLeft, AlertCircle } from "lucide-react";

interface EvolutionSuggestion {
  type: 'rename' | 'add' | 'remove';
  oldName?: string;
  newName?: string;
  newFolderName?: string;
  reason: string;
}

interface EvolutionData {
  successRating: 'hoch' | 'mittel' | 'niedrig';
  summary: string;
  suggestions: EvolutionSuggestion[];
  generatedAt: string;
  feedbackCount: number;
  usageCount: number;
}

export default function EvolveBlueprintReview() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: template, isLoading } = useQuery({
    queryKey: ['template-evolution', templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_templates')
        .select('*')
        .eq('id', templateId!)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Template nicht gefunden');
      return data;
    },
    enabled: !!templateId,
  });

  const evolutionData = template?.evolution_data as any as EvolutionData | null;

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!evolutionData || !template) return;

      // Apply suggestions to template_data
      const templateData = template.template_data as any[];
      let updatedData = [...templateData];

      evolutionData.suggestions.forEach(suggestion => {
        if (suggestion.type === 'rename' && suggestion.oldName && suggestion.newName) {
          updatedData = updatedData.map(project => 
            project.name === suggestion.oldName 
              ? { ...project, name: suggestion.newName }
              : project
          );
        } else if (suggestion.type === 'add' && suggestion.newFolderName) {
          updatedData.push({
            id: `new-${Date.now()}`,
            name: suggestion.newFolderName,
            parent_project_id: null,
          });
        }
      });

      const { error } = await supabase
        .from('community_templates')
        .update({
          template_data: updatedData,
          is_evolution: false,
          evolution_data: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', templateId!);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evolution erfolgreich veröffentlicht! 🧬");
      queryClient.invalidateQueries({ queryKey: ['community-templates'] });
      queryClient.invalidateQueries({ queryKey: ['templates-with-evolution'] });
      navigate('/blueprints');
    },
    onError: (error) => {
      toast.error(`Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('community_templates')
        .update({
          is_evolution: false,
          evolution_data: null,
        })
        .eq('id', templateId!);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evolution-Vorschlag abgelehnt");
      queryClient.invalidateQueries({ queryKey: ['community-templates'] });
      queryClient.invalidateQueries({ queryKey: ['templates-with-evolution'] });
      navigate('/blueprints');
    },
    onError: (error) => {
      toast.error(`Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    },
  });

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'hoch':
        return 'bg-green-500';
      case 'mittel':
        return 'bg-yellow-500';
      case 'niedrig':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'rename':
        return '✏️';
      case 'add':
        return '➕';
      case 'remove':
        return '➖';
      default:
        return '🔄';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 pb-20 space-y-6">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!template || !evolutionData) {
    return (
      <div className="container mx-auto p-4 pb-20">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Keine Evolution gefunden</h2>
            <p className="text-muted-foreground mb-4">
              Dieses Blueprint hat keine ausstehenden Evolution-Vorschläge.
            </p>
            <Button onClick={() => navigate('/blueprints')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück zur Bibliothek
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 pb-20 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/blueprints')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Evolution Review</h1>
          </div>
          <p className="text-muted-foreground">
            Blueprint: {template.anonymized_name}
          </p>
        </div>
      </div>

      {/* Success Rating Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Erfolgsanalyse</CardTitle>
            <Badge className={`${getRatingColor(evolutionData.successRating)} text-white`}>
              {evolutionData.successRating === 'hoch' ? '🔥 Sehr beliebt' : 
               evolutionData.successRating === 'mittel' ? '👍 Beliebt' : 
               '📊 Noch ausbaufähig'}
            </Badge>
          </div>
          <CardDescription>
            Basierend auf {evolutionData.feedbackCount} Feedback-Einträgen und {evolutionData.usageCount} Anwendungen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Erfolgsrate: {evolutionData.successRating}
            </span>
          </div>
          <p className="text-base leading-relaxed">{evolutionData.summary}</p>
        </CardContent>
      </Card>

      {/* Suggestions */}
      {evolutionData.suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Verbesserungsvorschläge</CardTitle>
            <CardDescription>
              Die KI hat basierend auf Community-Feedback {evolutionData.suggestions.length} Vorschläge generiert
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {evolutionData.suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{getSuggestionIcon(suggestion.type)}</div>
                  <div className="flex-1">
                    <div className="font-medium mb-1">
                      {suggestion.type === 'rename' && (
                        <span>
                          "{suggestion.oldName}" → "{suggestion.newName}"
                        </span>
                      )}
                      {suggestion.type === 'add' && (
                        <span>
                          Neuer Ordner: "{suggestion.newFolderName}"
                        </span>
                      )}
                      {suggestion.type === 'remove' && (
                        <span>Entfernen vorgeschlagen</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="flex-1" disabled={rejectMutation.isPending}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Vorschlag ablehnen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Vorschlag ablehnen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Die Evolution-Vorschläge werden verworfen und das Blueprint bleibt unverändert.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={() => rejectMutation.mutate()}>
                    Ablehnen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="flex-1" disabled={approveMutation.isPending}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Evolution für alle freigeben
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Evolution veröffentlichen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Die vorgeschlagenen Änderungen werden auf dein Blueprint angewendet und für die gesamte Community verfügbar gemacht. Dies kann nicht rückgängig gemacht werden.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={() => approveMutation.mutate()}>
                    Jetzt veröffentlichen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Metadata */}
      <div className="text-xs text-center text-muted-foreground">
        Evolution generiert am {new Date(evolutionData.generatedAt).toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>
    </div>
  );
}
