// Fail-closed guards for Stripe checkout (M1).
// Dependency-free so it is unit-testable outside Deno.

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export type PriceKey =
  | 'pro_monthly'
  | 'pro_yearly'
  | 'power_monthly'
  | 'power_yearly'
  | 'enterprise_monthly'
  | 'enterprise_yearly';

export interface ExpectedPrice {
  unit_amount: number;
  interval: 'month' | 'year';
}

/** Canonical Synapse EUR price catalogue (amounts in cents). */
export const EXPECTED_PRICES: Record<PriceKey, ExpectedPrice> = {
  pro_monthly: { unit_amount: 1200, interval: 'month' },
  pro_yearly: { unit_amount: 12200, interval: 'year' },
  power_monthly: { unit_amount: 3500, interval: 'month' },
  power_yearly: { unit_amount: 35700, interval: 'year' },
  enterprise_monthly: { unit_amount: 1500, interval: 'month' },
  enterprise_yearly: { unit_amount: 15000, interval: 'year' },
};

/**
 * Verifies the live Stripe account matches the account this project is pinned to.
 * Throws a neutral ConfigurationError (never leaks IDs or secrets) on mismatch.
 */
export function assertExpectedAccount(
  actualAccountId: string | null | undefined,
  expectedAccountId: string | null | undefined
): void {
  if (!expectedAccountId || typeof expectedAccountId !== 'string') {
    throw new ConfigurationError('Payment configuration error');
  }
  if (!actualAccountId || actualAccountId !== expectedAccountId) {
    throw new ConfigurationError('Payment configuration error');
  }
}

export interface StripePriceLike {
  id?: string;
  active?: boolean;
  livemode?: boolean;
  currency?: string;
  unit_amount?: number | null;
  recurring?: { interval?: string } | null;
}

/**
 * Validates a Stripe price against the expected catalogue entry.
 * Fails closed with a neutral ConfigurationError on any mismatch.
 */
export function assertExpectedPrice(
  priceKey: PriceKey,
  price: StripePriceLike | null | undefined,
  expectedLivemode = false,
): void {
  const expected = EXPECTED_PRICES[priceKey];
  if (!expected) throw new ConfigurationError('Payment configuration error');
  if (!price) throw new ConfigurationError('Payment configuration error');
  if (price.active !== true) throw new ConfigurationError('Payment configuration error');
  if (price.livemode !== expectedLivemode) throw new ConfigurationError('Payment configuration error');
  if (price.currency !== 'eur') throw new ConfigurationError('Payment configuration error');
  if (price.unit_amount !== expected.unit_amount) throw new ConfigurationError('Payment configuration error');
  if (!price.recurring || price.recurring.interval !== expected.interval) {
    throw new ConfigurationError('Payment configuration error');
  }
}

export function isMissingOrDeletedCustomerError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string };
  return e.code === 'resource_missing';
}

/** Enterprise bills per seat; every other tier is a single subscription unit. */
export function checkoutQuantity(tier: string, seats: number): number {
  return tier === 'enterprise' ? seats : 1;
}

export function priceKeyFor(tier: string, billingCycle: string): PriceKey {
  const key = `${tier}_${billingCycle}`;
  if (!(key in EXPECTED_PRICES)) throw new ConfigurationError('Payment configuration error');
  return key as PriceKey;
}

export interface ResolveCustomerDeps {
  /** Existing profile.stripe_customer_id, if any. */
  existingCustomerId: string | null | undefined;
  retrieveCustomer: (id: string) => Promise<{ id: string; deleted?: boolean } | null>;
  createCustomer: () => Promise<{ id: string }>;
  /** Persists the new customer id on THIS profile only. */
  persistCustomerId: (id: string) => Promise<void>;
}

/**
 * Reuses the profile's Stripe customer when it still exists in the current account.
 * Creates a replacement ONLY when Stripe reports resource_missing or a deleted customer.
 * Any other Stripe error propagates unchanged.
 */
export async function resolveCustomerId(deps: ResolveCustomerDeps): Promise<string> {
  const { existingCustomerId, retrieveCustomer, createCustomer, persistCustomerId } = deps;

  if (existingCustomerId) {
    let needsReplacement = false;
    try {
      const customer = await retrieveCustomer(existingCustomerId);
      if (!customer || customer.deleted === true) {
        needsReplacement = true;
      } else {
        return customer.id;
      }
    } catch (error) {
      if (!isMissingOrDeletedCustomerError(error)) throw error;
      needsReplacement = true;
    }
    if (!needsReplacement) return existingCustomerId;
  }

  const created = await createCustomer();
  await persistCustomerId(created.id);
  return created.id;
}

/** Billing remains disabled unless a deployment explicitly opts in. */
export function assertBillingEnabled(value: string | null | undefined): void {
  if (value !== 'true') {
    throw new ConfigurationError('Payment configuration error');
  }
}
