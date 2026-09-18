import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Clock, FolderKanban, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface FocusBlockImpulse {
  id: string;
  content: string;
  project_id: string | null;
  created_at: string;
  status: string;
}

export function FocusBlockWidget() {
  const [focusBlocks, setFocusBlocks] = useState<FocusBlockImpulse[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFocusBlocks();
  }, []);

  const fetchFocusBlocks = async () => {
    try {
      const { data, error } = await supabase
        .from('impulses')
        .select('id, content, project_id, created_at, status')
        .eq('is_focus_block', true)
        .neq('status', 'done')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setFocusBlocks(data || []);
    } catch (error) {
      console.error('Fehler beim Laden der Focus-Blöcke:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockClick = (impulse: FocusBlockImpulse) => {
    if (impulse.project_id) {
      navigate(`/project/${impulse.project_id}`);
    }
  };

  if (loading) {
    return (
      <Card className="border-[#A855F7]/20 bg-gradient-to-br from-card to-[#A855F7]/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#A855F7]" />
            <CardTitle className="text-lg">10-Minuten Fokus</CardTitle>
          </div>
          <CardDescription>Schnelle Aufgaben für zwischendurch</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Lädt...</p>
        </CardContent>
      </Card>
    );
  }

  if (focusBlocks.length === 0) {
    return (
      <Card className="border-[#A855F7]/20 bg-gradient-to-br from-card to-[#A855F7]/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#A855F7]" />
            <CardTitle className="text-lg">10-Minuten Fokus</CardTitle>
          </div>
          <CardDescription>Schnelle Aufgaben für zwischendurch</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Markiere Impulse als 10-Minuten-Blöcke, um sie hier zu sehen.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[#A855F7]/20 bg-gradient-to-br from-card to-[#A855F7]/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-[#A855F7]" />
          <CardTitle className="text-lg">10-Minuten Fokus</CardTitle>
        </div>
        <CardDescription>
          {focusBlocks.length} {focusBlocks.length === 1 ? 'schnelle Aufgabe' : 'schnelle Aufgaben'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {focusBlocks.map((impulse) => (
          <div
            key={impulse.id}
            onClick={() => handleBlockClick(impulse)}
            className="group p-3 rounded-lg border border-[#A855F7]/20 bg-card/50 hover:bg-[#A855F7]/10 hover:border-[#A855F7]/40 transition-all cursor-pointer"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <Zap className="h-4 w-4 text-[#A855F7]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground line-clamp-2 mb-2">
                  {impulse.content}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge 
                    variant="outline" 
                    className="text-xs border-[#A855F7]/40 text-[#A855F7]"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    10 Min
                  </Badge>
                  {impulse.project_id && (
                    <Badge variant="outline" className="text-xs">
                      <FolderKanban className="h-3 w-3 mr-1" />
                      Projekt
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(impulse.created_at), { 
                      addSuffix: true,
                      locale: de 
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
