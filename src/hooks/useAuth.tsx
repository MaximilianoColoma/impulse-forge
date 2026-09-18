import { useState, useEffect, createContext, useContext, useCallback, useSyncExternalStore, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
import {
  clearPasswordRecovery as clearPasswordRecoveryState,
  getPasswordRecoverySnapshot,
  subscribeToPasswordRecovery,
} from '@/integrations/supabase/passwordRecoveryState';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  passwordRecoveryActive: boolean;
  clearPasswordRecovery: () => void;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const passwordRecoveryActive = useSyncExternalStore(
    subscribeToPasswordRecovery,
    getPasswordRecoverySnapshot,
    getPasswordRecoverySnapshot,
  );

  useEffect(() => {
    let mounted = true;

    const apply = (nextSession: Session | null) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        apply(session);
        // T2.10_A · one-shot login confirm (dedup by access_token → single row per session).
        if (event === 'SIGNED_IN' && session?.access_token) {
          void supabaseClient.functions.invoke('auth-login-confirm').catch(() => {
            // observability failures must never break auth flow
          });
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession()
      .then(({ data: { session } }) => apply(session))
      .catch(() => apply(null));

    // Ω1 session-runtime-fix: guarantee that `loading` cannot hang forever.
    // If neither getSession nor the auth listener has resolved within 4s
    // (e.g. network hiccup after tab-suspend / PWA cold start), we release
    // the UI so lazy routes don't get stuck behind a black Suspense fallback.
    const safety = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 4000);

    // When the tab becomes visible again, re-hydrate the session so a stale
    // JWT doesn't produce ghost-401s that manifest as black screens.
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
        }
      }).catch(() => { /* silent */ });
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      mounted = false;
      clearTimeout(safety);
      document.removeEventListener("visibilitychange", onVisible);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      toast.error(error.message || 'Registrierung fehlgeschlagen');
      throw error;
    }

    toast.success('Account erstellt! Willkommen bei Synapse.');
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message || 'Anmeldung fehlgeschlagen');
      throw error;
    }

    toast.success('Willkommen zurück bei Synapse!');
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message || 'Abmeldung fehlgeschlagen');
      return;
    }
    toast.success('Erfolgreich abgemeldet');
  }, []);

  const clearPasswordRecovery = useCallback(() => {
    clearPasswordRecoveryState();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      passwordRecoveryActive,
      clearPasswordRecovery,
      signUp,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
