import { describe, expect, it } from "vitest";
import { billingEnabledFromEnv } from "../billing";

describe("billingEnabledFromEnv", () => {
  it("fails closed when the flag is missing or malformed", () => {
    expect(billingEnabledFromEnv(undefined)).toBe(false);
    expect(billingEnabledFromEnv("")).toBe(false);
    expect(billingEnabledFromEnv("false")).toBe(false);
    expect(billingEnabledFromEnv("TRUE")).toBe(false);
  });

  it("enables billing only through an explicit exact opt-in", () => {
    expect(billingEnabledFromEnv("true")).toBe(true);
  });
});
