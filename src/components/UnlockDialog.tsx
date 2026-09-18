import { useEffect, useState } from "react";
import { useActivityStatus } from "@/hooks/useActivityStatus";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Sparkles, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";

interface UnlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UnlockDialog({ open, onOpenChange }: UnlockDialogProps) {
  const { data: activityStatus, isLoading } = useActivityStatus();
  const [hasShownUnlock, setHasShownUnlock] = useState(false);

  useEffect(() => {
    if (activityStatus?.aiUnlocked && !hasShownUnlock) {
      setHasShownUnlock(true);
      toast.success("🎉 Herzlichen Glückwunsch! Die KI-Analyse wurde freigeschaltet.", {
        duration: 5000,
      });
      onOpenChange(false);
    }
  }, [activityStatus?.aiUnlocked, hasShownUnlock, onOpenChange]);

  if (isLoading || !activityStatus) {
    return null;
  }

  const progressPercentage = (activityStatus.synapseScore / activityStatus.threshold) * 100;
  const { impulses, doneImpulses, projects } = activityStatus.progress;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Schalte die KI-Analyse frei
          </DialogTitle>
          <DialogDescription>
            Entdecke die volle Power von Synapse! Je mehr du das System nutzt, desto präziser
            werden die Analysen und Vorschläge der KI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Fortschritt</span>
              <Badge variant="secondary">
                {activityStatus.synapseScore} / {activityStatus.threshold} Punkte
              </Badge>
            </div>
            <Progress value={progressPercentage} className="h-3" />
          </div>

          {/* Checklist */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Ziele:</h4>
            
            {/* Impulses Goal */}
            <div className="flex items-start gap-3 rounded-lg border p-3">
              {impulses.current >= impulses.target ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              )}
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Erstelle {impulses.target} Impulse
                  </span>
                  <Badge variant="outline" className="ml-2">
                    {impulses.points}/{impulses.maxPoints}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {impulses.current}/{impulses.target} Impulse erstellt
                </p>
              </div>
            </div>

            {/* Done Impulses Goal */}
            <div className="flex items-start gap-3 rounded-lg border p-3">
              {doneImpulses.current >= doneImpulses.target ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              )}
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Schließe {doneImpulses.target} Aufgaben ab
                  </span>
                  <Badge variant="outline" className="ml-2">
                    {doneImpulses.points}/{doneImpulses.maxPoints}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {doneImpulses.current}/{doneImpulses.target} Aufgaben abgeschlossen
                </p>
              </div>
            </div>

            {/* Projects Goal */}
            <div className="flex items-start gap-3 rounded-lg border p-3">
              {projects.current >= projects.target ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              )}
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Erstelle {projects.target} Projekte
                  </span>
                  <Badge variant="outline" className="ml-2">
                    {projects.points}/{projects.maxPoints}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {projects.current}/{projects.target} Projekte erstellt
                </p>
              </div>
            </div>
          </div>

          {activityStatus.aiUnlocked && (
            <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4 text-center">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                🎉 KI-Analyse freigeschaltet!
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}