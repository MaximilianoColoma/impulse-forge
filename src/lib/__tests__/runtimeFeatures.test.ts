import { describe, expect, it } from 'vitest';
import { resolveRuntimeFeatures } from '../runtimeFeatures';

describe('resolveRuntimeFeatures', () => {
  it('disables optional AI and billing by default', () => {
    expect(resolveRuntimeFeatures({})).toEqual({
      optionalAiEnabled: false,
      billingEnabled: false,
    });
  });

  it('enables a feature only for the explicit string true', () => {
    expect(resolveRuntimeFeatures({
      VITE_AI_FEATURES_ENABLED: 'true',
      VITE_BILLING_ENABLED: 'false',
    })).toEqual({ optionalAiEnabled: true, billingEnabled: false });

    expect(resolveRuntimeFeatures({
      VITE_AI_FEATURES_ENABLED: '1',
      VITE_BILLING_ENABLED: 'yes',
    })).toEqual({ optionalAiEnabled: false, billingEnabled: false });
  });
});
