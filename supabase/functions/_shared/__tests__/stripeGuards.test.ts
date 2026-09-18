import { describe, it, expect, vi } from 'vitest';
import {
  assertExpectedAccount,
  assertExpectedPrice,
  resolveCustomerId,
  isMissingOrDeletedCustomerError,
  checkoutQuantity,
  priceKeyFor,
  ConfigurationError,
  EXPECTED_PRICES,
  assertBillingEnabled,
} from '../stripeGuards';

describe('assertBillingEnabled', () => {
  it('fails closed unless billing is explicitly enabled', () => {
    expect(() => assertBillingEnabled(undefined)).toThrow(ConfigurationError);
    expect(() => assertBillingEnabled(null)).toThrow(ConfigurationError);
    expect(() => assertBillingEnabled('')).toThrow(ConfigurationError);
    expect(() => assertBillingEnabled('false')).toThrow(ConfigurationError);
    expect(() => assertBillingEnabled('TRUE')).toThrow(ConfigurationError);
  });

  it('accepts only the exact opt-in value', () => {
    expect(() => assertBillingEnabled('true')).not.toThrow();
  });
});

describe('assertExpectedAccount', () => {
  it('passes when the live account matches the expected account', () => {
    expect(() => assertExpectedAccount('acct_123', 'acct_123')).not.toThrow();
  });

  it('fails closed when the expected account id is not configured', () => {
    expect(() => assertExpectedAccount('acct_123', undefined)).toThrow(ConfigurationError);
    expect(() => assertExpectedAccount('acct_123', '')).toThrow(ConfigurationError);
  });

  it('fails closed when the live account is a different account', () => {
    expect(() => assertExpectedAccount('acct_wrong', 'acct_123')).toThrow(ConfigurationError);
  });

  it('never leaks account ids in the error message', () => {
    try {
      assertExpectedAccount('acct_wrong', 'acct_123');
    } catch (error) {
      expect((error as Error).message).toBe('Payment configuration error');
      expect((error as Error).message).not.toContain('acct_');
    }
  });
});

describe('EXPECTED_PRICES catalogue', () => {
  it('encodes the six canonical EUR prices', () => {
    expect(EXPECTED_PRICES).toEqual({
      pro_monthly: { unit_amount: 1200, interval: 'month' },
      pro_yearly: { unit_amount: 12200, interval: 'year' },
      power_monthly: { unit_amount: 3500, interval: 'month' },
      power_yearly: { unit_amount: 35700, interval: 'year' },
      enterprise_monthly: { unit_amount: 1500, interval: 'month' },
      enterprise_yearly: { unit_amount: 15000, interval: 'year' },
    });
  });
});

describe('assertExpectedPrice', () => {
  const validPro = { id: 'price_1', active: true, livemode: false, currency: 'eur', unit_amount: 1200, recurring: { interval: 'month' } };

  it('accepts a matching active EUR recurring price', () => {
    expect(() => assertExpectedPrice('pro_monthly', validPro)).not.toThrow();
  });

  it('rejects an inactive price', () => {
    expect(() => assertExpectedPrice('pro_monthly', { ...validPro, active: false })).toThrow(ConfigurationError);
  });

  it('rejects a live price in the preview environment', () => {
    expect(() => assertExpectedPrice('pro_monthly', { ...validPro, livemode: true })).toThrow(ConfigurationError);
  });

  it('rejects a non-EUR price', () => {
    expect(() => assertExpectedPrice('pro_monthly', { ...validPro, currency: 'usd' })).toThrow(ConfigurationError);
  });

  it('rejects a wrong unit amount', () => {
    expect(() => assertExpectedPrice('pro_monthly', { ...validPro, unit_amount: 900 })).toThrow(ConfigurationError);
  });

  it('rejects a wrong recurring interval', () => {
    expect(() => assertExpectedPrice('pro_monthly', { ...validPro, recurring: { interval: 'year' } })).toThrow(
      ConfigurationError
    );
  });

  it('rejects a one-time (non-recurring) price', () => {
    expect(() => assertExpectedPrice('pro_monthly', { ...validPro, recurring: null })).toThrow(ConfigurationError);
  });

  it('rejects a missing price', () => {
    expect(() => assertExpectedPrice('pro_monthly', null)).toThrow(ConfigurationError);
  });

  it('validates the enterprise seat prices', () => {
    expect(() =>
      assertExpectedPrice('enterprise_monthly', { active: true, livemode: false, currency: 'eur', unit_amount: 1500, recurring: { interval: 'month' } })
    ).not.toThrow();
    expect(() =>
      assertExpectedPrice('enterprise_yearly', { active: true, livemode: false, currency: 'eur', unit_amount: 15000, recurring: { interval: 'year' } })
    ).not.toThrow();
  });
});

describe('isMissingOrDeletedCustomerError', () => {
  it('detects resource_missing', () => {
    expect(isMissingOrDeletedCustomerError({ code: 'resource_missing' })).toBe(true);
  });

  it('ignores other Stripe errors', () => {
    expect(isMissingOrDeletedCustomerError({ code: 'rate_limit' })).toBe(false);
  });
});

describe('checkoutQuantity', () => {
  it('uses seats for enterprise', () => {
    expect(checkoutQuantity('enterprise', 12)).toBe(12);
    expect(checkoutQuantity('enterprise', 5)).toBe(5);
  });

  it('uses quantity 1 for pro and power', () => {
    expect(checkoutQuantity('pro', 7)).toBe(1);
    expect(checkoutQuantity('power', 7)).toBe(1);
  });
});

describe('priceKeyFor', () => {
  it('maps tier + cycle to a catalogue key', () => {
    expect(priceKeyFor('power', 'yearly')).toBe('power_yearly');
    expect(priceKeyFor('enterprise', 'monthly')).toBe('enterprise_monthly');
  });

  it('fails closed on an unknown combination', () => {
    expect(() => priceKeyFor('platinum', 'monthly')).toThrow(ConfigurationError);
  });
});

describe('isMissingOrDeletedCustomerError (edge inputs)', () => {
  it('detects resource_missing', () => {
    expect(isMissingOrDeletedCustomerError({ code: 'resource_missing' })).toBe(true);
  });

  it('ignores other Stripe errors', () => {
    expect(isMissingOrDeletedCustomerError({ code: 'rate_limit' })).toBe(false);
    expect(isMissingOrDeletedCustomerError(new Error('network down'))).toBe(false);
    expect(isMissingOrDeletedCustomerError(null)).toBe(false);
  });
});

describe('resolveCustomerId', () => {
  it('reuses an existing customer without creating a new one', async () => {
    const createCustomer = vi.fn();
    const persistCustomerId = vi.fn();
    const id = await resolveCustomerId({
      existingCustomerId: 'cus_existing',
      retrieveCustomer: vi.fn().mockResolvedValue({ id: 'cus_existing' }),
      createCustomer,
      persistCustomerId,
    });
    expect(id).toBe('cus_existing');
    expect(createCustomer).not.toHaveBeenCalled();
    expect(persistCustomerId).not.toHaveBeenCalled();
  });

  it('creates a customer when the profile has none', async () => {
    const persistCustomerId = vi.fn().mockResolvedValue(undefined);
    const id = await resolveCustomerId({
      existingCustomerId: null,
      retrieveCustomer: vi.fn(),
      createCustomer: vi.fn().mockResolvedValue({ id: 'cus_new' }),
      persistCustomerId,
    });
    expect(id).toBe('cus_new');
    expect(persistCustomerId).toHaveBeenCalledWith('cus_new');
  });

  it('lazily replaces the customer on resource_missing', async () => {
    const persistCustomerId = vi.fn().mockResolvedValue(undefined);
    const id = await resolveCustomerId({
      existingCustomerId: 'cus_foreign',
      retrieveCustomer: vi.fn().mockRejectedValue({ code: 'resource_missing' }),
      createCustomer: vi.fn().mockResolvedValue({ id: 'cus_fresh' }),
      persistCustomerId,
    });
    expect(id).toBe('cus_fresh');
    expect(persistCustomerId).toHaveBeenCalledWith('cus_fresh');
  });

  it('lazily replaces the customer when Stripe reports it deleted', async () => {
    const persistCustomerId = vi.fn().mockResolvedValue(undefined);
    const id = await resolveCustomerId({
      existingCustomerId: 'cus_deleted',
      retrieveCustomer: vi.fn().mockResolvedValue({ id: 'cus_deleted', deleted: true }),
      createCustomer: vi.fn().mockResolvedValue({ id: 'cus_fresh' }),
      persistCustomerId,
    });
    expect(id).toBe('cus_fresh');
    expect(persistCustomerId).toHaveBeenCalledWith('cus_fresh');
  });

  it('does NOT replace the customer on unrelated Stripe errors', async () => {
    const createCustomer = vi.fn();
    const persistCustomerId = vi.fn();
    await expect(
      resolveCustomerId({
        existingCustomerId: 'cus_existing',
        retrieveCustomer: vi.fn().mockRejectedValue({ code: 'rate_limit', message: 'slow down' }),
        createCustomer,
        persistCustomerId,
      })
    ).rejects.toMatchObject({ code: 'rate_limit' });
    expect(createCustomer).not.toHaveBeenCalled();
    expect(persistCustomerId).not.toHaveBeenCalled();
  });
});
