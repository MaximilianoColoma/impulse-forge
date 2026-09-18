import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import { getOnboardingCompleted, persistOnboardingCompleted } from "../onboardingStatus";

const mockedFrom = vi.mocked(supabase.from);

interface QueryMock {
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  then: (resolve: (value: unknown) => void) => void;
}

function chain(result: unknown) {
  const query = {} as QueryMock;
  query.select = vi.fn(() => query);
  query.update = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.single = vi.fn(async () => result);
  query.then = (resolve: (value: unknown) => void) => resolve(result);
  return query;
}

describe("onboarding persistence", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads the server-side completion flag", async () => {
    const query = chain({ data: { onboarding_completed: true }, error: null });
    mockedFrom.mockReturnValueOnce(query as never);
    await expect(getOnboardingCompleted("user-1")).resolves.toBe(true);
    expect(query.eq).toHaveBeenCalledWith("id", "user-1");
  });

  it("persists completion in profiles", async () => {
    const query = chain({ data: { id: "user-1" }, error: null });
    mockedFrom.mockReturnValueOnce(query as never);
    await expect(persistOnboardingCompleted("user-1")).resolves.toBeUndefined();
    expect(query.update).toHaveBeenCalledWith({ onboarding_completed: true });
    expect(query.select).toHaveBeenCalledWith("id");
    expect(query.single).toHaveBeenCalledOnce();
  });

  it("fails when no profile row can be confirmed", async () => {
    const query = chain({ data: null, error: { message: "no row" } });
    mockedFrom.mockReturnValueOnce(query as never);

    await expect(persistOnboardingCompleted("missing-user")).rejects.toEqual({ message: "no row" });
  });
});
