import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Wrench, Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function ToolManager() {
  const [tools, setTools] = useState<Array<{ id: string; tool_name: string }>>([]);
  const [newTool, setNewTool] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    try {
      const { data, error } = await supabase
        .from('user_tools')
        .select('*')
        .order('tool_name');

      if (error) throw error;
      setTools(data || []);
    } catch (error: any) {
      console.error('Fehler beim Laden der Tools:', error);
    }
  };

  const handleAddTool = async () => {
    if (!newTool.trim()) {
      toast.error('Bitte einen Tool-Namen eingeben');
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht authentifiziert');

      const { error } = await supabase
        .from('user_tools')
        .insert({ user_id: user.id, tool_name: newTool.trim() });

      if (error) throw error;

      toast.success('Tool hinzugefügt');
      setNewTool('');
      fetchTools();
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Dieses Tool existiert bereits');
      } else {
        toast.error('Fehler beim Hinzufügen des Tools');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTool = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_tools')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Tool entfernt');
      fetchTools();
    } catch (error: any) {
      toast.error('Fehler beim Entfernen des Tools');
    }
  };

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center gap-3 mb-4">
        <div className="rounded-full bg-primary/10 p-2">
          <Wrench className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Meine Tools</h2>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="new-tool" className="sr-only">Neues Tool</Label>
            <Input
              id="new-tool"
              placeholder="Tool-Name (z.B. Figma, Slack...)"
              value={newTool}
              onChange={(e) => setNewTool(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTool()}
            />
          </div>
          <Button
            onClick={handleAddTool}
            disabled={isLoading}
            size="icon"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {tools.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tools.map((tool) => (
              <Badge
                key={tool.id}
                variant="secondary"
                className="text-sm px-3 py-1.5 flex items-center gap-2"
              >
                {tool.tool_name}
                <button
                  onClick={() => handleDeleteTool(tool.id)}
                  className="hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Noch keine Tools hinzugefügt. Füge deine bevorzugten Tools hinzu, um sie beim Erfassen von Impulsen schnell auswählen zu können.
          </p>
        )}
      </div>
    </Card>
  );
}
