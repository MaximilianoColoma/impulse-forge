import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ReactNode } from 'react';
import { SpaceSwitcher } from '@/components/tenancy/SpaceSwitcher';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    // Save current path for post-login redirect
    const currentPath = location.pathname + location.search;
    if (currentPath && currentPath !== '/auth') {
      try {
        localStorage.setItem('synapse_redirect_path', currentPath);
      } catch {
        // localStorage might be unavailable in private browsing
      }
    }
    return <Navigate to="/auth" replace />;
  }

  return (
    <>
      <div className="pointer-events-none fixed right-3 top-3 z-40 flex justify-end">
        <div className="pointer-events-auto">
          <SpaceSwitcher />
        </div>
      </div>
      {children}
    </>
  );
}
