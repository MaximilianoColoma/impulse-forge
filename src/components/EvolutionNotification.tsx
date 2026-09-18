import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";

interface EvolutionData {
  successRating: 'hoch' | 'mittel' | 'niedrig';
  summary: string;
  suggestions: Array<{
    type: string;
    oldName?: string;
    newName?: string;
    newFolderName?: string;
    reason: string;
  }>;
  generatedAt: string;
  feedbackCount: number;
  usageCount: number;
}

interface Template {
  id: string;
  anonymized_name: string;
  is_evolution: boolean;
  evolution_data: EvolutionData | null;
}

export const EvolutionNotification = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: templatesWithEvolution } = useQuery({
    queryKey: ['templates-with-evolution', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('community_templates')
        .select('*')
        .eq('creator_id', user.id)
        .eq('is_evolution', true);

      if (error) throw error;
      return data as any as Template[];
    },
    enabled: !!user,
  });

  const dismissEvolutionMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('community_templates')
        .update({ is_evolution: false, evolution_data: null })
        .eq('id', templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast("Evolution-Benachrichtigung verworfen");
      queryClient.invalidateQueries({ queryKey: ['templates-with-evolution'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Fehler beim Verwerfen");
    },
  });

  // Show notification toast when new evolutions are detected
  useEffect(() => {
    if (templatesWithEvolution && templatesWithEvolution.length > 0) {
      const firstTemplate = templatesWithEvolution[0];
      
      toast.info(`🧬 Blueprint Evolution verfügbar!`, {
        description: `Dein Blueprint "${firstTemplate.anonymized_name}" hat sich weiterentwickelt.`,
        action: {
          label: "Ansehen",
          onClick: () => navigate(`/blueprints/evolve/${firstTemplate.id}`),
        },
      });
    }
  }, [templatesWithEvolution, navigate]);

  return null;
};
