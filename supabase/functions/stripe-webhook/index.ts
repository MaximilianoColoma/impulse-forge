import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { securityHeaders } from '../_shared/securityHeaders.ts';
import { assertBillingEnabled, assertExpectedAccount, ConfigurationError } from '../_shared/stripeGuards.ts';

const corsHeaders = securityHeaders;

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    assertBillingEnabled(Deno.env.get('BILLING_ENABLED'));
  } catch (_error) {
    return new Response(JSON.stringify({ error: 'Payment configuration error' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 503,
    });
  }

  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature || !webhookSecret) {
    return new Response('Missing signature or webhook secret', { status: 400 });
  }

  try {
    const body = await req.text();

    // Guard: only process events for the account this project is pinned to.
    const expectedAccountId = Deno.env.get('STRIPE_EXPECTED_ACCOUNT_ID');
    let liveAccountId: string | null = null;
    try {
      const account = await stripe.accounts.retrieve();
      liveAccountId = account?.id ?? null;
    } catch (_e) {
      liveAccountId = null;
    }
    assertExpectedAccount(liveAccountId, expectedAccountId);

    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );

    console.log('Webhook event received:', event.type);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const tier = session.metadata?.tier;
        const billingCycle = session.metadata?.billing_cycle;

        if (userId && tier) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const seats = subscription.items.data[0]?.quantity ?? 1;
          
          await supabaseAdmin
            .from('profiles')
            .update({
              subscription_tier: tier,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              subscription_status: 'active',
              subscription_period: billingCycle === 'yearly' ? 'year' : 'month',
              subscription_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
              seats,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

          console.log(`Updated user ${userId} to tier ${tier} (${billingCycle}), seats=${seats}`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const customerId = subscription.customer as string;

          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single();

          if (profile) {
            await supabaseAdmin
              .from('profiles')
              .update({
                subscription_status: 'active',
                subscription_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', profile.id);

            console.log(`Renewed subscription for user ${profile.id}`);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const customerId = subscription.customer as string;

          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single();

          if (profile) {
            await supabaseAdmin
              .from('profiles')
              .update({
                subscription_status: 'past_due',
                updated_at: new Date().toISOString(),
              })
              .eq('id', profile.id);

            console.log(`Payment failed for user ${profile.id}`);
          }
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          if (event.type === 'customer.subscription.deleted') {
            await supabaseAdmin
              .from('profiles')
              .update({
                subscription_tier: 'free',
                subscription_status: 'canceled',
                subscription_ends_at: new Date().toISOString(),
                pending_seats: null,
                pending_seats_effective_at: null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', profile.id);
            console.log(`Canceled subscription for user ${profile.id}`);
          } else {
            const tier = subscription.metadata?.tier || 'free';
            const status = subscription.status === 'active' || subscription.status === 'trialing'
              ? 'active'
              : subscription.status === 'past_due'
              ? 'past_due'
              : 'canceled';
            const seats = subscription.items.data[0]?.quantity ?? 1;

            await supabaseAdmin
              .from('profiles')
              .update({
                subscription_tier: tier,
                subscription_status: status,
                subscription_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
                stripe_subscription_id: subscription.id,
                seats,
                updated_at: new Date().toISOString(),
              })
              .eq('id', profile.id);
            console.log(`Updated subscription for user ${profile.id} to ${tier} (${status}), seats=${seats}`);
          }
        }
        break;
      }

      case 'subscription_schedule.updated': {
        const schedule = event.data.object as Stripe.SubscriptionSchedule;
        const customerId = schedule.customer as string;
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();
        if (profile) {
          // Phase 2 (if any) carries the future quantity + start_date
          const futurePhase = schedule.phases?.[1];
          const pendingSeats = futurePhase?.items?.[0]?.quantity ?? null;
          const effectiveAt = futurePhase?.start_date
            ? new Date(futurePhase.start_date * 1000).toISOString()
            : null;
          await supabaseAdmin
            .from('profiles')
            .update({
              pending_seats: pendingSeats,
              pending_seats_effective_at: effectiveAt,
              updated_at: new Date().toISOString(),
            })
            .eq('id', profile.id);
          console.log(`Schedule updated for user ${profile.id}: pending=${pendingSeats} @ ${effectiveAt}`);
        }
        break;
      }

      case 'subscription_schedule.released': {
        const schedule = event.data.object as Stripe.SubscriptionSchedule;
        const customerId = schedule.customer as string;
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id, pending_seats')
          .eq('stripe_customer_id', customerId)
          .single();
        if (profile) {
          const promotedSeats = profile.pending_seats;
          await supabaseAdmin
            .from('profiles')
            .update({
              seats: promotedSeats ?? undefined,
              pending_seats: null,
              pending_seats_effective_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', profile.id);
          console.log(`Schedule released for user ${profile.id}, promoted seats=${promotedSeats}`);
        }
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    if (error instanceof ConfigurationError) {
      return new Response(JSON.stringify({ error: 'Payment configuration error' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
