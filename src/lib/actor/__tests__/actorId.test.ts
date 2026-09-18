import { describe, it, expect, beforeEach } from "vitest";
import {
  composeActorId,
  getDeviceId,
  __resetDeviceIdForTests,
} from "../actorId";

describe("actorId (Ω1)", () => {
  beforeEach(() => {
    __resetDeviceIdForTests();
  });

  it("generates a stable device id across calls", () => {
    const a = getDeviceId();
    const b = getDeviceId();
    expect(a).toBe(b);
    expect(a).toMatch(/[a-z0-9-]+/i);
  });

  it("composes anon actor id when no user is present", () => {
    const id = composeActorId(null);
    expect(id.startsWith("anon:")).toBe(true);
  });

  it("composes user actor id with device suffix", () => {
    const id = composeActorId("user-123");
    expect(id.startsWith("user:user-123#")).toBe(true);
  });

  it("device id survives between composeActorId calls", () => {
    const first = composeActorId("u1");
    const second = composeActorId("u1");
    expect(first).toBe(second);
  });
});