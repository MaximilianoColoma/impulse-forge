import { describe, it, expect } from "vitest";
import {
  evaluateTriggers,
  isTriggerActive,
  pickTopNudge,
  pickTriggerByEvent,
} from "@/lib/upgradeNudge/engine";
import { upgradeTriggers } from "@/data/upgradeTriggers";

describe("upgradeNudge engine", () => {
  it("returns nothing when nothing matches", () => {
    expect(evaluateTriggers({ tier: "free" })).toEqual([]);
  });

  it("fires project_limit_reached at threshold for free tier", () => {
    const t = upgradeTriggers.find((x) => x.event === "project_limit_reached")!;
    expect(isTriggerActive(t, { tier: "free", projectsCount: 3 })).toBe(true);
    expect(isTriggerActive(t, { tier: "free", projectsCount: 2 })).toBe(false);
    expect(isTriggerActive(t, { tier: "pro", projectsCount: 99 })).toBe(false);
  });

  it("fires seat_utilization_high at 90% for enterprise", () => {
    const t = upgradeTriggers.find((x) => x.event === "seat_utilization_high")!;
    expect(
      isTriggerActive(t, { tier: "enterprise", seatsActive: 9, seatsPurchased: 10 }),
    ).toBe(true);
    expect(
      isTriggerActive(t, { tier: "enterprise", seatsActive: 5, seatsPurchased: 10 }),
    ).toBe(false);
  });

  it("fires pending_invites_exceed_seats when active+pending > purchased", () => {
    const t = upgradeTriggers.find((x) => x.event === "pending_invites_exceed_seats")!;
    expect(
      isTriggerActive(t, {
        tier: "enterprise",
        seatsActive: 5,
        seatsPurchased: 5,
        seatsPending: 1,
      }),
    ).toBe(true);
    expect(
      isTriggerActive(t, {
        tier: "enterprise",
        seatsActive: 3,
        seatsPurchased: 5,
        seatsPending: 1,
      }),
    ).toBe(false);
  });

  it("respects boolean signals for event-only triggers", () => {
    const top = pickTopNudge({
      tier: "power",
      signals: { team_invite_attempted: true, sso_click_locked: true },
    });
    expect(top?.event).toBe("team_invite_attempted"); // high beats medium
  });

  it("honors cooldown from lastShown", () => {
    const now = 10_000_000;
    const recent = now - 24 * 60 * 60 * 1000; // 1 day ago
    const stale = now - 8 * 24 * 60 * 60 * 1000; // >7 days
    const withRecent = evaluateTriggers({
      tier: "free",
      projectsCount: 3,
      lastShown: { project_limit_reached: recent },
      now,
    });
    expect(withRecent).toHaveLength(0);
    const withStale = evaluateTriggers({
      tier: "free",
      projectsCount: 3,
      lastShown: { project_limit_reached: stale },
      now,
    });
    expect(withStale[0]?.event).toBe("project_limit_reached");
  });

  it("sorts by priority descending", () => {
    const list = evaluateTriggers({
      tier: "free",
      projectsCount: 3,
      impulsesCount: 45,
      signals: { export_click_locked: true },
    });
    // First two are 'high', last is 'medium'
    expect(list.slice(0, 2).map((c) => c.trigger.priority)).toEqual(["high", "high"]);
    expect(list[list.length - 1]?.trigger.priority).toBe("medium");
  });

  it("pickTriggerByEvent resolves every catalog entry", () => {
    for (const trg of upgradeTriggers) {
      const found = pickTriggerByEvent(trg.event);
      expect(found?.event).toBe(trg.event);
    }
    expect(pickTriggerByEvent("nope" as never)).toBeNull();
  });
});