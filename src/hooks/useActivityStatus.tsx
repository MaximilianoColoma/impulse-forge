import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from '@/lib/queryKeys';

export interface ActivityStatus {
  synapseScore: number;
  aiUnlocked: boolean;
  threshold: number;
  progress: {
    impulses: {
      current: number;
      target: number;
      points: number;
      maxPoints: number;
    };
    doneImpulses: {
      current: number;
      target: number;
      points: number;
      maxPoints: number;
    };
    projects: {
      current: number;
      target: number;
      points: number;
      maxPoints: number;
    };
  };
}

export function useActivityStatus() {
  const query = useQuery({
    queryKey: queryKeys.activityStatus,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<ActivityStatus>(
        "get-user-activity-status"
      );

      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Refetch when window regains focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        query.refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return query;
}