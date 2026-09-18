import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { UnlockDialog } from "@/components/UnlockDialog";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, Search, Download, Heart, TrendingUp, Zap, Plus, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivityStatus } from "@/hooks/useActivityStatus";
import { canApplyBlueprint } from "@/lib/blueprintAccess";
import { runtimeFeatures } from "@/lib/runtimeFeatures";

export default function Blueprints() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { tier } = useSubscriptionTier();
  const { data: activityStatus } = useActivityStatus();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [publishForm, setPublishForm] = useState({
    templateName: "",
    description: "",
    makeAnonymous: true,
  });

  // Fetch community templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ["community-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_templates")
        .select("*")
        .order("downloads_count", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch user's liked templates
  const { data: userLikes } = useQuery({
    queryKey: ["user-template-likes"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("user_template_likes")
        .select("template_id")
        .eq("user_id", user.id);

      if (error) throw error;
      return data.map(like => like.template_id);
    },
  });

  // Publish blueprint mutation
  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!runtimeFeatures.optionalAiEnabled) {
        throw new Error('In der privaten PWA deaktiviert');
      }
      const { data, error } = await supabase.functions.invoke("publish-blueprint", {
        body: publishForm,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Blueprint erfolgreich veröffentlicht!");
      setIsPublishOpen(false);
      setPublishForm({ templateName: "", description: "", makeAnonymous: true });
      queryClient.invalidateQueries({ queryKey: ["community-templates"] });
    },
    onError: (error: Error) => {
      toast.error(`Fehler beim Veröffentlichen: ${error.message}`);
    },
  });

  // Trigger evolution analysis mutation
  const triggerEvolutionMutation = useMutation({
    mutationFn: async (templateId: string) => {
      if (!runtimeFeatures.optionalAiEnabled) {
        throw new Error('In der privaten PWA deaktiviert');
      }
      const { data, error } = await supabase.functions.invoke('evolve-blueprint', {
        body: { templateId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(
        data.suggestions?.length > 0 
          ? `Evolution-Analyse abgeschlossen: ${data.suggestions.length} Vorschläge gefunden!`
          : "Noch nicht genug Feedback für konkrete Vorschläge."
      );
      queryClient.invalidateQueries({ queryKey: ["community-templates"] });
    },
    onError: (error: Error) => {
      toast.error(`Fehler bei Evolution-Analyse: ${error.message}`);
    },
  });

  // Apply blueprint mutation
  const applyMutation = useMutation({
    mutationFn: async (templateId: string) => {
      if (!canApplyBlueprint(tier, activityStatus?.aiUnlocked === true)) {
        setShowUnlockDialog(true);
        throw new Error('Premium feature');
      }
      
      const { data, error } = await supabase.functions.invoke("apply-blueprint", {
        body: { templateId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Blueprint erfolgreich angewendet!");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      navigate("/projects");
    },
    onError: (error: Error) => {
      if (error.message !== 'Premium feature') {
        toast.error(`Fehler beim Anwenden: ${error.message}`);
      }
    },
  });

  // Toggle like mutation
  const toggleLikeMutation = useMutation({
    mutationFn: async ({ templateId, isLiked }: { templateId: string; isLiked: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (isLiked) {
        // Remove like
        const { error } = await supabase
          .from("user_template_likes")
          .delete()
          .eq("user_id", user.id)
          .eq("template_id", templateId);

        if (error) throw error;

        // Decrement likes count
        const template = templates?.find(t => t.id === templateId);
        if (template) {
          await supabase
            .from("community_templates")
            .update({ likes_count: Math.max(0, template.likes_count - 1) })
            .eq("id", templateId);
        }
      } else {
        // Add like
        const { error } = await supabase
          .from("user_template_likes")
          .insert({ user_id: user.id, template_id: templateId });

        if (error) throw error;

        // Increment likes count
        const template = templates?.find(t => t.id === templateId);
        if (template) {
          await supabase
            .from("community_templates")
            .update({ likes_count: template.likes_count + 1 })
            .eq("id", templateId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-templates"] });
      queryClient.invalidateQueries({ queryKey: ["user-template-likes"] });
    },
    onError: (error: Error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  const filteredTemplates = templates?.filter(template =>
    template.anonymized_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto p-4 pb-20 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Blueprint Library</h1>
        <p className="text-muted-foreground">
          Entdecke und teile Projektstrukturen aus der Community
        </p>
      </header>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Blueprints durchsuchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={isPublishOpen} onOpenChange={setIsPublishOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Blueprint teilen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Blueprint veröffentlichen</DialogTitle>
              <DialogDescription>
                Teile deine Projektstruktur mit der Community
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="z.B. Freelancer Flow"
                  value={publishForm.templateName}
                  onChange={(e) => setPublishForm({ ...publishForm, templateName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Beschreibung (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Wofür ist diese Struktur geeignet?"
                  value={publishForm.description}
                  onChange={(e) => setPublishForm({ ...publishForm, description: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="anonymous"
                  checked={publishForm.makeAnonymous}
                  onCheckedChange={(checked) => setPublishForm({ ...publishForm, makeAnonymous: checked })}
                />
                <Label htmlFor="anonymous" className="text-sm">
                  Projektnamen anonymisieren (empfohlen)
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => publishMutation.mutate()}
                disabled={!publishForm.templateName || publishMutation.isPending || !runtimeFeatures.optionalAiEnabled}
              >
                {publishMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Veröffentlichen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <>
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))}
          </>
        ) : filteredTemplates?.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            {searchQuery ? "Keine Blueprints gefunden" : "Noch keine Blueprints verfügbar"}
          </div>
        ) : (
          filteredTemplates?.map((template) => {
            const isLiked = userLikes?.includes(template.id) || false;
            const templateData = template.template_data as any[];
            const projectCount = templateData?.length || 0;

            return (
              <Card key={template.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{template.anonymized_name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {template.description || "Keine Beschreibung verfügbar"}
                      </CardDescription>
                    </div>
                    {template.parent_template_id && (
                      <Badge variant="secondary" className="shrink-0">
                        <Sparkles className="h-3 w-3 mr-1" />
                        v2.0
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>📁 {projectCount} Projekte</div>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1">
                        <Download className="h-4 w-4" />
                        {template.downloads_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className={`h-4 w-4 ${isLiked ? "fill-current text-red-500" : ""}`} />
                        {template.likes_count}
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                  <div className="flex gap-2 w-full">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => toggleLikeMutation.mutate({ templateId: template.id, isLiked })}
                      disabled={toggleLikeMutation.isPending}
                    >
                      <Heart className={`h-4 w-4 mr-1 ${isLiked ? "fill-current" : ""}`} />
                      {isLiked ? "Liked" : "Like"}
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => applyMutation.mutate(template.id)}
                      disabled={applyMutation.isPending}
                    >
                      {applyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Download className="h-4 w-4 mr-1" />
                      Anwenden
                    </Button>
                  </div>
                  {user?.id === template.creator_id && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => triggerEvolutionMutation.mutate(template.id)}
                      disabled={triggerEvolutionMutation.isPending || !runtimeFeatures.optionalAiEnabled}
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      {runtimeFeatures.optionalAiEnabled ? 'Evolution prüfen' : 'Private PWA: KI pausiert'}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })
        )}
      </div>

      <UnlockDialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog} />
    </div>
  );
}
