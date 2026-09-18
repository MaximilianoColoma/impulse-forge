import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

interface ShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortcutsModal({ open, onOpenChange }: ShortcutsModalProps) {
  const shortcuts = [
    { keys: ["Ctrl/Cmd", "K"], description: "Semantische Suche öffnen" },
    { keys: ["Ctrl/Cmd", "N"], description: "Impuls-Fänger öffnen" },
    { keys: ["Leertaste"], description: "Impuls-Fänger öffnen (alternative)" },
    { keys: ["Ctrl/Cmd", "\\"], description: "Projekt-Sidebar umschalten" },
    { keys: ["Esc"], description: "Overlays schließen" },
    { keys: ["?"], description: "Diese Übersicht anzeigen" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            Keyboard-Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-4">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex gap-2">
                {shortcut.keys.map((key, i) => (
                  <kbd
                    key={i}
                    className="px-2 py-1 text-xs font-semibold text-foreground bg-card border border-border rounded shadow-sm"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {shortcut.description}
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
          Drücke <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-card border border-border rounded">?</kbd> um diese Übersicht jederzeit zu öffnen
        </p>
      </DialogContent>
    </Dialog>
  );
}
