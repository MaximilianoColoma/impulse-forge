import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionTier } from '@/hooks/useSubscriptionTier';
import { ReactNode } from 'react';
import { toast } from 'sonner';

interface AdminRouteProps {
  children: ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: tierLoading } = useSubscriptionTier();

  if (authLoading || tierLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    toast.error('Kein Zugriff — Administratorrechte erforderlich.');
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
