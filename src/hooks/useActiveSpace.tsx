import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActorId } from "@/hooks/useActorId";
import {
  resolveActiveSpace,
  storageKeyFor,
  PERSONAL_SPACE_SENTINEL,
  type SpaceSummary,
} from "@/lib/tenancy/spaceContext";
import { logSecurityEvent } from "@/lib/securityMonitor";
import { emitOperationalEvent } from "@/lib/observability/emitOperationalEvent";

interface ActiveSpaceContextValue {
  active: SpaceSummary;
  available: SpaceSummary[];
  loading: boolean;
  switching: boolean;
  setActive: (id: string) => void;
  refresh: () => Promise<void>;
}

const ActiveSpaceContext = createContext<ActiveSpaceContextValue | null>(null);

const FALLBACK: SpaceSummary = {
  id: PERSONAL_SPACE_SENTINEL,
  name: "Personal",
  visibility: "personal",
  teamId: null,
  isPersonal: true,
};

function readPersisted(actorId: string | null): string | null {
  try {
    return localStorage.getItem(storageKeyFor(actorId));
  } catch {
    return null;
  }
}

function writePersisted(actorId: string | null, spaceId: string) {
  try {
    localStorage.setItem(storageKeyFor(actorId), spaceId);
  } catch {
    /* private mode – ignore */
  }
}

export function ActiveSpaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { actorId } = useActorId();
  const queryClient = useQueryClient();

  const [available, setAvailable] = useState<SpaceSummary[]>([]);
  const [activeId, setActiveId] = useState<string>(FALLBACK.id);
  const [loading, setLoading] = useState<boolean>(!!user);
  const [switching, startTransition] = useTransition();

  const load = useCallback(async () => {
    if (!user) {
      setAvailable([]);
      setActiveId(FALLBACK.id);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // spaces the actor can access; RLS enforces membership.
      const { data, error } = await supabase
        .from("spaces" as any)
        .select("id, name, visibility, team_id, owner_actor_id");
      if (error) throw error;
      const rows = ((data ?? []) as unknown) as Array<{
        id: string;
        name: string;
        visibility: string;
        team_id: string | null;
        owner_actor_id: string | null;
      }>;
      const summaries: SpaceSummary[] = rows.map((r) => ({
        id: r.id,
        name: r.name,
        visibility: (r.visibility as SpaceSummary["visibility"]) ?? "personal",
        teamId: r.team_id,
        isPersonal:
          r.visibility === "personal" || (!r.team_id && !!r.owner_actor_id),
      }));
      setAvailable(summaries);
      const resolved = resolveActiveSpace({
        actorId,
        persistedSpaceId: readPersisted(actorId),
        available: summaries,
      });
      setActiveId(resolved.id);
    } catch {
      // Graceful fallback: personal sentinel keeps app usable during Ω2 rollout.
      setAvailable([]);
      setActiveId(FALLBACK.id);
    } finally {
      setLoading(false);
    }
  }, [user, actorId]);

  useEffect(() => {
    void load();
  }, [load]);

  const setActive = useCallback(
    (id: string) => {
      if (id === activeId) return;
      const previousId = activeId;
      writePersisted(actorId, id);
      // T2.7_R1 · revoke_and_refetch: drop caches of the old scope
      // so a switch never flashes stale-space data.
      startTransition(() => {
        setActiveId(id);
      });
      queryClient.invalidateQueries({
        predicate: (q) => {
          const key = q.queryKey as unknown[];
          return Array.isArray(key) && key.includes(previousId);
        },
      });
      logSecurityEvent(
        "suspicious_activity",
        {
          signal: "space_switch",
          from: previousId,
          to: id,
        },
        "low",
      );

      // T2.10_A · pseudonymous operational event (space_ref only; no target/source pair).
      void emitOperationalEvent({
        event_name: "tenancy.space_switch.success",
        result: "success",
        space_ref: id === PERSONAL_SPACE_SENTINEL ? null : id,
        surface: "space_switcher",
      });
    },
    [activeId, actorId, queryClient],
  );

  const active = useMemo<SpaceSummary>(() => {
    return (
      available.find((s) => s.id === activeId) ?? {
        ...FALLBACK,
        id: activeId,
      }
    );
  }, [available, activeId]);

  const value = useMemo<ActiveSpaceContextValue>(
    () => ({ active, available, loading, switching, setActive, refresh: load }),
    [active, available, loading, switching, setActive, load],
  );

  return (
    <ActiveSpaceContext.Provider value={value}>
      {children}
    </ActiveSpaceContext.Provider>
  );
}

export function useActiveSpace(): ActiveSpaceContextValue {
  const ctx = useContext(ActiveSpaceContext);
  if (!ctx) {
    // Non-breaking default so pages/tests without provider still render.
    return {
      active: FALLBACK,
      available: [],
      loading: false,
      switching: false,
      setActive: () => {},
      refresh: async () => {},
    };
  }
  return ctx;
}

export function useActiveSpaceId(): string {
  return useActiveSpace().active.id;
}
