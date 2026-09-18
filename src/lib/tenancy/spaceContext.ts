/**
 * Pure logic for the Ω2 · T2.7 SpaceSwitcher.
 *
 * `resolveActiveSpace` is deterministic and side-effect free so it can be
 * unit-tested without touching Supabase, React or localStorage.
 */

export type SpaceVisibility = "personal" | "team" | "public";

export interface SpaceSummary {
  id: string;
  name: string;
  visibility: SpaceVisibility;
  teamId: string | null;
  isPersonal: boolean;
}

export interface ResolveInput {
  actorId: string | null;
  persistedSpaceId: string | null;
  available: SpaceSummary[];
}

export const PERSONAL_SPACE_SENTINEL = "__personal__";

/**
 * Priority:
 *   1. persisted id if still accessible
 *   2. explicit personal space
 *   3. first accessible space
 *   4. sentinel "personal" fallback (RLS then scopes to owner only)
 */
export function resolveActiveSpace(input: ResolveInput): SpaceSummary {
  const { persistedSpaceId, available } = input;

  if (persistedSpaceId) {
    const match = available.find((s) => s.id === persistedSpaceId);
    if (match) return match;
  }

  const personal = available.find((s) => s.isPersonal);
  if (personal) return personal;

  if (available.length > 0) return available[0];

  return {
    id: PERSONAL_SPACE_SENTINEL,
    name: "Personal",
    visibility: "personal",
    teamId: null,
    isPersonal: true,
  };
}

export function storageKeyFor(actorId: string | null): string {
  return `active_space:${actorId ?? "anon"}`;
}
