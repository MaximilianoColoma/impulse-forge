import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Navigator {
  setAppBadge?: (count?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
}

export function useAppBadge() {
  const updateBadge = async () => {
    // Check if Badge API is supported
    const nav = navigator as Navigator;
    if (!nav.setAppBadge || !nav.clearAppBadge) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get today's date at midnight
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Count impulses created today
      const { count, error } = await supabase
        .from('impulses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString());

      if (error) throw error;

      const impulseCount = count || 0;
      
      if (impulseCount > 0) {
        await nav.setAppBadge(impulseCount);
      } else {
        await nav.clearAppBadge();
      }
    } catch (error) {
      console.error('Error updating app badge:', error);
    }
  };

  const clearBadge = async () => {
    const nav = navigator as Navigator;
    if (!nav.clearAppBadge) return;

    try {
      await nav.clearAppBadge();
    } catch (error) {
      console.error('Error clearing app badge:', error);
    }
  };

  useEffect(() => {
    // Update badge when hook mounts
    updateBadge();

    // Set up realtime subscription to update badge on new impulses
    const channel = supabase
      .channel('impulses-badge')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'impulses'
        },
        () => {
          updateBadge();
        }
      )
      .subscribe();

    // Update badge when app becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateBadge();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      channel.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return { updateBadge, clearBadge };
}