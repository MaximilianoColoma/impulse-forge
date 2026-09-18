import { describe, expect, it } from "vitest";
import { canApplyBlueprint } from "../blueprintAccess";

describe("canApplyBlueprint", () => {
  it("keeps the gate closed for a free account below the activity threshold", () => {
    expect(canApplyBlueprint("free", false)).toBe(false);
  });

  it("releases the gate for a free account after the activity unlock", () => {
    expect(canApplyBlueprint("free", true)).toBe(true);
  });

  it("allows paid tiers independently of the activity gate", () => {
    expect(canApplyBlueprint("pro", false)).toBe(true);
  });
});

