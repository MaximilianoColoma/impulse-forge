import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Undo2, Loader2 } from 'lucide-react';

export const RollbackButton = ({ onUpdate }: { onUpdate: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const { toast } = useToast();

  const rollbackToLastSnapshot = async () => {
    setIsRollingBack(true);
    try {
      // Get the most recent snapshot
      const { data: snapshot, error: snapshotError } = await supabase
        .from('structure_snapshots')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (snapshotError || !snapshot) {
        toast({
          title: 'Kein Snapshot gefunden',
          description: 'Es gibt keine vorherige Struktur zum Wiederherstellen.',
          variant: 'destructive',
        });
        return;
      }

      // Restore the structure
      const snapshotData = snapshot.snapshot_data as Array<{
        id: string;
        name: string;
        parent_project_id: string | null;
      }>;

      // Update all projects to match the snapshot
      for (const project of snapshotData) {
        await supabase
          .from('projects')
          .update({
            name: project.name,
            parent_project_id: project.parent_project_id,
          } as any)
          .eq('id', project.id);
      }

      // Delete the snapshot after successful restore
      await supabase
        .from('structure_snapshots')
        .delete()
        .eq('id', snapshot.id);

      toast({
        title: 'Struktur wiederhergestellt',
        description: 'Die vorherige Projektstruktur wurde erfolgreich wiederhergestellt.',
      });

      setIsOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Rollback error:', error);
      toast({
        title: 'Fehler',
        description: 'Die Struktur konnte nicht wiederhergestellt werden.',
        variant: 'destructive',
      });
    } finally {
      setIsRollingBack(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Undo2 className="h-4 w-4" />
        Letzte Änderung rückgängig machen
      </Button>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Struktur wiederherstellen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dies wird deine Projektstruktur auf den Stand vor der letzten KI-Optimierung zurücksetzen.
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={rollbackToLastSnapshot}
              disabled={isRollingBack}
            >
              {isRollingBack ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Stelle wieder her...
                </>
              ) : (
                'Wiederherstellen'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};