import { describe, expect, it } from "vitest";
import { resolveSupabaseRuntimeConfig } from "../runtimeConfig";

const preview = {
  VITE_APP_ENV: "preview",
  VITE_SUPABASE_PROJECT_ID: "qxcjvplihrocexptbchr",
  VITE_SUPABASE_URL: "https://qxcjvplihrocexptbchr.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
};

const production = {
  VITE_APP_ENV: "production",
  VITE_SUPABASE_PROJECT_ID: "edgpqsjqlrnuqwikfwjh",
  VITE_SUPABASE_URL: "https://edgpqsjqlrnuqwikfwjh.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_production",
};

describe("resolveSupabaseRuntimeConfig", () => {
  it("accepts the reconstructed backend for preview", () => {
    expect(resolveSupabaseRuntimeConfig(preview).projectRef).toBe("qxcjvplihrocexptbchr");
  });

  it("rejects a mismatched project ID and URL", () => {
    expect(() => resolveSupabaseRuntimeConfig({ ...preview, VITE_SUPABASE_PROJECT_ID: "different" }))
      .toThrow("does not match");
  });

  it("fails closed when production points at the preview backend", () => {
    expect(() => resolveSupabaseRuntimeConfig({ ...preview, VITE_APP_ENV: "production" }))
      .toThrow("Production cannot use");
  });

  it("fails closed for a production build when VITE_APP_ENV is missing", () => {
    const { VITE_APP_ENV: _omitted, ...withoutExplicitEnvironment } = preview;

    expect(() => resolveSupabaseRuntimeConfig({ ...withoutExplicitEnvironment, PROD: true }))
      .toThrow("Production cannot use");
  });

  it("accepts only the dedicated backend for production", () => {
    expect(resolveSupabaseRuntimeConfig(production).projectRef).toBe("edgpqsjqlrnuqwikfwjh");
    expect(() => resolveSupabaseRuntimeConfig({
      ...production,
      VITE_SUPABASE_PROJECT_ID: "unknownproduction",
      VITE_SUPABASE_URL: "https://unknownproduction.supabase.co",
    })).toThrow("must use the Synapse production backend");
  });

  it("blocks the production backend in preview and local builds", () => {
    expect(() => resolveSupabaseRuntimeConfig({ ...production, VITE_APP_ENV: "preview" }))
      .toThrow("Non-production environments cannot use");
    expect(() => resolveSupabaseRuntimeConfig({ ...production, VITE_APP_ENV: "local" }))
      .toThrow("Non-production environments cannot use");
  });
});
