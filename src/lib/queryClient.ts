import { QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Bei 401 (Unauthorized) oder 403 (Forbidden) nicht wiederholen
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        // Bei Netzwerkfehlern bis zu 3 Mal wiederholen
        return failureCount < 3;
      },
      staleTime: 1000 * 60 * 5, // 5 Minuten
    },
    mutations: {
      retry: 1,
    },
  },
});
