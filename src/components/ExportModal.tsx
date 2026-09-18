import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Loader2 } from 'lucide-react';
import { exportImpulses, ExportFormat, ExportTimeframe } from '@/services/exportService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string;
}

interface Project {
  id: string;
  name: string;
}

export function ExportModal({ 
  open, 
  onOpenChange, 
  defaultProjectId 
}: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [timeframe, setTimeframe] = useState<ExportTimeframe>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [projects, setProjects] = useState<Project[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  useEffect(() => {
    if (open) {
      fetchProjects();
      if (defaultProjectId) {
        setSelectedProjectId(defaultProjectId);
      }
    }
  }, [open, defaultProjectId]);

  const fetchProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      toast.error('Projekte konnten nicht geladen werden');
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportImpulses({
        format,
        filters: {
          timeframe,
          projectId: selectedProjectId === 'all' ? null : selectedProjectId === 'unassigned' ? 'unassigned' : selectedProjectId,
        },
      });
      toast.success('Export erfolgreich');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Export fehlgeschlagen');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Impulse exportieren</DialogTitle>
          <DialogDescription>
            Wähle das Format und den Umfang deines Exports
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label>Format</Label>
            <Select value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="markdown">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Markdown</span>
                    <span className="text-xs text-muted-foreground">Schön formatiert, lesbar</span>
                  </div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">JSON</span>
                    <span className="text-xs text-muted-foreground">Strukturiert, für Backups</span>
                  </div>
                </SelectItem>
                <SelectItem value="csv">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">CSV</span>
                    <span className="text-xs text-muted-foreground">Für Excel & Tabellen</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Timeframe Filter */}
          <div className="space-y-3">
            <Label>Zeitraum</Label>
            <Select value={timeframe} onValueChange={(value) => setTimeframe(value as ExportTimeframe)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Zeit</SelectItem>
                <SelectItem value="today">Heute</SelectItem>
                <SelectItem value="thisWeek">Diese Woche</SelectItem>
                <SelectItem value="thisMonth">Dieser Monat</SelectItem>
                <SelectItem value="last7Days">Letzte 7 Tage</SelectItem>
                <SelectItem value="last30Days">Letzte 30 Tage</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Project Filter */}
          <div className="space-y-3">
            <Label>Projekt</Label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId} disabled={isLoadingProjects}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Projekte</SelectItem>
                <SelectItem value="unassigned">Ohne Projekt</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Info Box */}
          <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            {format === 'markdown' && '📝 Markdown eignet sich perfekt zum Lesen und Archivieren'}
            {format === 'json' && '💾 JSON ist ideal für Backups und Datenverarbeitung'}
            {format === 'csv' && '📊 CSV kann direkt in Excel oder Google Sheets geöffnet werden'}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Abbrechen
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exportiere...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Exportieren
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}