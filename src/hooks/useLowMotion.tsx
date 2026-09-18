import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useLowMotion = () => {
  const queryClient = useQueryClient();
  
  const { data: profile } = useQuery({
    queryKey: ['profile-preferences'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('low_motion, compact_mode, ui_preferences')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (profile?.low_motion) {
      document.documentElement.setAttribute('data-low-motion', 'true');
    } else {
      document.documentElement.removeAttribute('data-low-motion');
    }
    
    if (profile?.compact_mode) {
      document.documentElement.setAttribute('data-compact', 'true');
    } else {
      document.documentElement.removeAttribute('data-compact');
    }
  }, [profile]);

  const updateLowMotion = async (lowMotion: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { error } = await supabase
        .from('profiles')
        .update({ low_motion: lowMotion })
        .eq('id', user.id);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['profile-preferences'] });
      toast.success(lowMotion ? 'Reduzierte Animationen aktiviert' : 'Normale Animationen aktiviert');
    } catch (error: any) {
      toast.error('Fehler beim Aktualisieren: ' + error.message);
    }
  };

  const updateCompactMode = async (compactMode: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { error } = await supabase
        .from('profiles')
        .update({ compact_mode: compactMode })
        .eq('id', user.id);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['profile-preferences'] });
      toast.success(compactMode ? 'Kompakter Modus aktiviert' : 'Normaler Modus aktiviert');
    } catch (error: any) {
      toast.error('Fehler beim Aktualisieren: ' + error.message);
    }
  };

  return {
    isLowMotion: profile?.low_motion || false,
    isCompactMode: profile?.compact_mode || false,
    updateLowMotion,
    updateCompactMode,
  };
};