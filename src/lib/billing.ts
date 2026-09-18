/**
 * Billing is opt-in. Missing, malformed, or false configuration keeps every
 * payment and upgrade entry point disabled for the 0-EUR beta.
 */
export function billingEnabledFromEnv(value: string | undefined): boolean {
  return value === "true";
}

export const billingEnabled = billingEnabledFromEnv(
  import.meta.env.VITE_BILLING_ENABLED,
);
