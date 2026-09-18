const PREVIEW_PROJECT_REFS = new Set(["qxcjvplihrocexptbchr"]);
const PRODUCTION_PROJECT_REFS = new Set(["edgpqsjqlrnuqwikfwjh"]);

export interface SupabaseRuntimeEnv {
  PROD?: boolean;
  VITE_APP_ENV?: string;
  VITE_SUPABASE_PROJECT_ID?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

export interface SupabaseRuntimeConfig {
  appEnvironment: "local" | "preview" | "production";
  projectRef: string;
  url: string;
  publishableKey: string;
}

function projectRefFromUrl(url: string): string | null {
  try {
    const hostname = new URL(url).hostname;
    const match = hostname.match(/^([a-z0-9]+)\.supabase\.co$/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function resolveSupabaseRuntimeConfig(env: SupabaseRuntimeEnv): SupabaseRuntimeConfig {
  const appEnvironment = (env.VITE_APP_ENV ?? (env.PROD ? "production" : "local")) as SupabaseRuntimeConfig["appEnvironment"];
  const url = env.VITE_SUPABASE_URL?.trim() ?? "";
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
  const configuredRef = env.VITE_SUPABASE_PROJECT_ID?.trim() ?? "";
  const urlRef = projectRefFromUrl(url);

  if (!url || !publishableKey || !urlRef) {
    throw new Error("Supabase runtime configuration is incomplete");
  }
  if (configuredRef && configuredRef !== urlRef) {
    throw new Error("Supabase project ID does not match the configured URL");
  }
  if (!["local", "preview", "production"].includes(appEnvironment)) {
    throw new Error("Unknown application environment");
  }
  if (appEnvironment === "production" && PREVIEW_PROJECT_REFS.has(urlRef)) {
    throw new Error("Production cannot use the Synapse preview backend");
  }
  if (appEnvironment === "production" && !PRODUCTION_PROJECT_REFS.has(urlRef)) {
    throw new Error("Production must use the Synapse production backend");
  }
  if (appEnvironment !== "production" && PRODUCTION_PROJECT_REFS.has(urlRef)) {
    throw new Error("Non-production environments cannot use the Synapse production backend");
  }

  return { appEnvironment, projectRef: urlRef, url, publishableKey };
}
