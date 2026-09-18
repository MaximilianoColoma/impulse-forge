import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, Download, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { runtimeFeatures } from "@/lib/runtimeFeatures";

interface TemplateMatch {
  templateId: string;
  templateName: string;
  reason: string;
  hasEvolution?: boolean;
}

export function SmartMatchingWidget() {
  const queryClient = useQueryClient();
  const [applyingId, setApplyingId] = useState<string | null>(null);

  // Fetch smart matches
  const { data, isLoading } = useQuery({
    queryKey: ["smart-matches"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-fingerprint");

      if (error) throw error;
      return data as { matches: TemplateMatch[]; message?: string };
    },
    retry: 1,
    enabled: runtimeFeatures.optionalAiEnabled,
  });

  // Apply blueprint mutation
  const applyMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { data, error } = await supabase.functions.invoke("apply-blueprint", {
        body: { templateId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Blueprint erfolgreich angewendet!");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setApplyingId(null);
    },
    onError: (error: Error) => {
      toast.error(`Fehler beim Anwenden: ${error.message}`);
      setApplyingId(null);
    },
  });

  const handleApply = (templateId: string) => {
    setApplyingId(templateId);
    applyMutation.mutate(templateId);
  };

  if (!runtimeFeatures.optionalAiEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Empfehlungen pausiert
          </CardTitle>
          <CardDescription>
            Optionale KI-Empfehlungen sind in der privaten PWA deaktiviert. Pareto-Priorisierung bleibt verfügbar.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Für dich empfohlen
          </CardTitle>
          <CardDescription>
            KI analysiert deine Projektstruktur...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (data?.message || !data?.matches || data.matches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Für dich empfohlen
          </CardTitle>
          <CardDescription>
            {data?.message || "Keine Empfehlungen verfügbar"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              {data?.message === 'No projects found. Create some projects first!' 
                ? 'Erstelle zuerst einige Projekte, dann kann die KI passende Blueprints für dich finden.'
                : 'Noch keine Community-Blueprints verfügbar.'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Für dich empfohlen
        </CardTitle>
        <CardDescription>
          Basierend auf deiner Projektstruktur
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.matches.map((match, index) => (
          <div
            key={match.templateId}
            className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                    {index + 1}
                  </span>
                  <h4 className="font-semibold">{match.templateName}</h4>
                  {match.hasEvolution && (
                    <Badge variant="secondary" className="text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      v2.0
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground pl-8">
                  {match.reason}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => handleApply(match.templateId)}
                disabled={applyingId === match.templateId}
                className="shrink-0"
              >
                {applyingId === match.templateId ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Anwenden...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-1" />
                    Anwenden
                  </>
                )}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}