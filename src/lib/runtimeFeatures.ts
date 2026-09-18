export interface RuntimeFeatureEnv {
  VITE_AI_FEATURES_ENABLED?: string;
  VITE_BILLING_ENABLED?: string;
}

export interface RuntimeFeatures {
  optionalAiEnabled: boolean;
  billingEnabled: boolean;
}

export function resolveRuntimeFeatures(env: RuntimeFeatureEnv): RuntimeFeatures {
  return {
    optionalAiEnabled: env.VITE_AI_FEATURES_ENABLED === 'true',
    billingEnabled: env.VITE_BILLING_ENABLED === 'true',
  };
}

export const runtimeFeatures = resolveRuntimeFeatures(
  import.meta.env as unknown as RuntimeFeatureEnv,
);
