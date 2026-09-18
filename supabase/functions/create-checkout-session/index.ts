import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { validateCheckoutRequest, ValidationException } from '../_shared/validation.ts';
import { getJsonHeaders, securityHeaders } from '../_shared/securityHeaders.ts';
import {
  assertExpectedAccount,
  assertExpectedPrice,
  resolveCustomerId,
  checkoutQuantity,
  priceKeyFor,
  ConfigurationError,
  assertBillingEnabled,
} from '../_shared/stripeGuards.ts';

const corsHeaders = securityHeaders;

// Price IDs come exclusively from secrets bound to the Synapse Stripe account.
// No fallbacks: a missing secret must fail closed, not silently target a wrong price.
function priceIdFor(key: string): string {
  const envName: Record<string, string> = {
    pro_monthly: 'STRIPE_PRICE_PRO_MONTHLY',
    pro_yearly: 'STRIPE_PRICE_PRO_YEARLY',
    power_monthly: 'STRIPE_PRICE_POWER_MONTHLY',
    power_yearly: 'STRIPE_PRICE_POWER_YEARLY',
    enterprise_monthly: 'STRIPE_PRICE_ENTERPRISE_SEAT_MONTHLY',
    enterprise_yearly: 'STRIPE_PRICE_ENTERPRISE_SEAT_YEARLY',
  };
  const value = Deno.env.get(envName[key] ?? '');
  if (!value) throw new ConfigurationError('Payment configuration error');
  return value;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    assertBillingEnabled(Deno.env.get('BILLING_ENABLED'));
    console.log('Starting checkout session creation...');
    
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Guard: the secret key must belong to the account this project is pinned to.
    const expectedAccountId = Deno.env.get('STRIPE_EXPECTED_ACCOUNT_ID');
    let liveAccountId: string | null = null;
    try {
      const account = await stripe.accounts.retrieve();
      liveAccountId = account?.id ?? null;
    } catch (_e) {
      liveAccountId = null;
    }
    assertExpectedAccount(liveAccountId, expectedAccountId);
    console.log('Stripe account guard passed');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      console.error('User not authenticated');
      throw new Error('User not authenticated');
    }

    console.log('User authenticated:', user.id);

    // Parse and validate request body
    const requestBody = await req.json();
    const { tier, billingCycle, seats } = validateCheckoutRequest(requestBody);
    
    console.log('Validated request:', { tier, billingCycle, seats });

    // Resolve + verify the price BEFORE any customer mutation happens.
    const priceKey = priceKeyFor(tier, billingCycle);
    const priceId = priceIdFor(priceKey);
    let price;
    try {
      price = await stripe.prices.retrieve(priceId);
    } catch (_e) {
      throw new ConfigurationError('Payment configuration error');
    }
    const expectedLivemode = Deno.env.get('STRIPE_EXPECT_LIVEMODE');
    if (expectedLivemode !== 'true' && expectedLivemode !== 'false') {
      throw new ConfigurationError('Payment configuration error');
    }
    assertExpectedPrice(priceKey, price as never, expectedLivemode === 'true');
    console.log('Price guard passed for', priceKey);

    // Get or create Stripe customer
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .single();

    // Reuse the stored customer; only replace it when Stripe says it is missing/deleted.
    const customerId = await resolveCustomerId({
      existingCustomerId: profile?.stripe_customer_id ?? null,
      retrieveCustomer: async (id) => {
        const customer = await stripe.customers.retrieve(id);
        return customer as unknown as { id: string; deleted?: boolean };
      },
      createCustomer: async () => {
        const customer = await stripe.customers.create({
          email: profile?.email || user.email,
          metadata: { supabase_user_id: user.id },
        });
        return { id: customer.id };
      },
      persistCustomerId: async (id) => {
        await supabaseClient.from('profiles').update({ stripe_customer_id: id }).eq('id', user.id);
      },
    });

    // Create checkout session
    console.log('Creating checkout session...');
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: checkoutQuantity(tier, seats),
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/pricing`,
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          tier: tier,
          billing_cycle: billingCycle,
          seats: String(checkoutQuantity(tier, seats)),
        },
      },
      metadata: {
        supabase_user_id: user.id,
        tier: tier,
        billing_cycle: billingCycle,
        seats: String(checkoutQuantity(tier, seats)),
      },
    });

    console.log('Checkout session created:', session.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      { 
        headers: getJsonHeaders(),
        status: 200,
      }
    );
  } catch (error) {
    console.error('Checkout error:', error);
    
    // Neutral 500 for configuration/account/price mismatches — no IDs, no secrets.
    if (error instanceof ConfigurationError) {
      return new Response(
        JSON.stringify({ error: 'Payment configuration error' }),
        { headers: getJsonHeaders(), status: 500 }
      );
    }

    // Handle validation errors specially
    if (error instanceof ValidationException) {
      return new Response(
        JSON.stringify({ 
          error: 'Validation failed',
          details: error.errors 
        }),
        { 
          headers: getJsonHeaders(),
          status: 422,
        }
      );
    }
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: getJsonHeaders(),
        status: 400,
      }
    );
  }
});
