import { describe, it, expect } from "vitest";
import {
  resolveActiveSpace,
  PERSONAL_SPACE_SENTINEL,
  storageKeyFor,
  type SpaceSummary,
} from "../spaceContext";

const personal: SpaceSummary = {
  id: "p1",
  name: "Personal",
  visibility: "personal",
  teamId: null,
  isPersonal: true,
};
const team: SpaceSummary = {
  id: "t1",
  name: "Acme",
  visibility: "team",
  teamId: "team-1",
  isPersonal: false,
};

describe("resolveActiveSpace", () => {
  it("returns persisted space when still accessible", () => {
    const r = resolveActiveSpace({
      actorId: "a",
      persistedSpaceId: "t1",
      available: [personal, team],
    });
    expect(r.id).toBe("t1");
  });

  it("falls back to personal when persisted is gone", () => {
    const r = resolveActiveSpace({
      actorId: "a",
      persistedSpaceId: "missing",
      available: [personal, team],
    });
    expect(r.isPersonal).toBe(true);
  });

  it("picks the first accessible space when no personal", () => {
    const r = resolveActiveSpace({
      actorId: "a",
      persistedSpaceId: null,
      available: [team],
    });
    expect(r.id).toBe("t1");
  });

  it("returns sentinel personal space when nothing available", () => {
    const r = resolveActiveSpace({
      actorId: "a",
      persistedSpaceId: null,
      available: [],
    });
    expect(r.id).toBe(PERSONAL_SPACE_SENTINEL);
    expect(r.isPersonal).toBe(true);
  });

  it("scopes the storage key to the actor", () => {
    expect(storageKeyFor("user-42")).toBe("active_space:user-42");
    expect(storageKeyFor(null)).toBe("active_space:anon");
  });
});
