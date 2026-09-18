/**
 * T2.7.b · Scoped queryKey factories.
 * Every list/detail key now carries the active space id as its first segment
 * so a SpaceSwitcher invalidation (`predicate: key.includes(prevSpaceId)`)
 * can surgically drop old-scope data without touching unrelated caches.
 *
 * Legacy shape (`queryKeys.projects.list(filters)`) is preserved for callers
 * that have not migrated yet — they resolve to a "__unscoped__" segment which
 * the Ω2 runtime guard reports via `securityMonitor` as a soft warning.
 */
export const UNSCOPED = "__unscoped__" as const;

export const scoped = {
  impulses: {
    all: (spaceId: string) => [spaceId, "impulses"] as const,
    list: (spaceId: string, filters?: Record<string, unknown>) =>
      [spaceId, "impulses", "list", filters] as const,
    detail: (spaceId: string, id: string) =>
      [spaceId, "impulses", "detail", id] as const,
  },
  projects: {
    all: (spaceId: string) => [spaceId, "projects"] as const,
    list: (spaceId: string, filters?: Record<string, unknown>) =>
      [spaceId, "projects", "list", filters] as const,
    detail: (spaceId: string, id: string) =>
      [spaceId, "projects", "detail", id] as const,
  },
  blueprints: {
    all: (spaceId: string) => [spaceId, "blueprints"] as const,
    list: (spaceId: string) => [spaceId, "blueprints", "list"] as const,
  },
};

export const queryKeys = {
  impulses: {
    all: ['impulses'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.impulses.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.impulses.all, 'detail', id] as const,
  },
  projects: {
    all: ['projects'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.projects.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.projects.all, 'detail', id] as const,
  },
  subscriptionTier: ['subscription-tier'] as const,
  activityStatus: ['activity-status'] as const,
  blueprints: {
    all: ['blueprints'] as const,
    list: () => [...queryKeys.blueprints.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.blueprints.all, 'detail', id] as const,
  },
  analytics: {
    all: ['analytics'] as const,
    data: (range?: string) => [...queryKeys.analytics.all, 'data', range] as const,
  },
  admin: {
    all: ['admin'] as const,
    users: () => [...queryKeys.admin.all, 'users'] as const,
    stats: () => [...queryKeys.admin.all, 'stats'] as const,
  },
} as const;
