/**
 * T2.8.b · schedule-seat-change
 *
 * Enterprise-only seat change with "at period end" semantics for downgrades.
 *  - Upgrade (newSeats >= currentSeats): apply immediately, always_invoice proration.
 *  - Downgrade (newSeats <  currentSeats): create a subscription schedule
 *    with phase 2 starting at current_period_end and the new quantity.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { validateSeatChange } from '../_shared/seatValidation.ts';
import { ValidationException } from '../_shared/validation.ts';
import { getJsonHeaders, securityHeaders } from '../_shared/securityHeaders.ts';
import { assertBillingEnabled } from '../_shared/stripeGuards.ts';

const corsHeaders = securityHeaders;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    assertBillingEnabled(Deno.env.get('BILLING_ENABLED'));
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const body = await req.json();
    const { newSeats } = validateSeatChange(body);

    // Load profile → stripe_subscription_id + current seats
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('stripe_customer_id, stripe_subscription_id, seats, subscription_tier')
      .eq('id', user.id)
      .single();
    if (profileError) throw profileError;
    if (!profile?.stripe_subscription_id) throw new Error('No active subscription');
    if (profile.subscription_tier !== 'enterprise') {
      throw new Error('Seat changes are only available on the enterprise plan');
    }

    const currentSeats = profile.seats ?? 1;
    const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    const itemId = subscription.items.data[0]?.id;
    const priceId = subscription.items.data[0]?.price.id;
    if (!itemId || !priceId) throw new Error('Subscription has no items');

    let effectiveAt: string | null = null;
    let mode: 'immediate' | 'scheduled';

    if (newSeats >= currentSeats) {
      // Upgrade: apply immediately with prorated invoice
      await stripe.subscriptions.update(profile.stripe_subscription_id, {
        items: [{ id: itemId, quantity: newSeats }],
        proration_behavior: 'always_invoice',
      });
      mode = 'immediate';

      // Sync profile immediately (webhook will re-confirm)
      await supabaseClient
        .from('profiles')
        .update({ seats: newSeats, pending_seats: null, pending_seats_effective_at: null })
        .eq('id', user.id);
    } else {
      // Downgrade: schedule for period end
      const periodEnd = subscription.current_period_end;
      effectiveAt = new Date(periodEnd * 1000).toISOString();

      const schedule = await stripe.subscriptionSchedules.create({
        from_subscription: profile.stripe_subscription_id,
      });
      await stripe.subscriptionSchedules.update(schedule.id, {
        end_behavior: 'release',
        phases: [
          {
            items: [{ price: priceId, quantity: currentSeats }],
            start_date: (schedule.phases[0]?.start_date ?? subscription.current_period_start) as number,
            end_date: periodEnd,
            proration_behavior: 'none',
          },
          {
            items: [{ price: priceId, quantity: newSeats }],
            iterations: 1,
            proration_behavior: 'none',
          },
        ],
      });
      mode = 'scheduled';

      await supabaseClient
        .from('profiles')
        .update({ pending_seats: newSeats, pending_seats_effective_at: effectiveAt })
        .eq('id', user.id);
    }

    // Fire-and-forget audit
    try {
      await supabaseClient.rpc('emit_audit', {
        _action: 'subscription.seat_change_scheduled',
        _resource_type: 'subscription',
        _resource_id: null,
        _space_id: null,
        _team_id: null,
        _metadata: {
          old_seats: currentSeats,
          new_seats: newSeats,
          mode,
          effective_at: effectiveAt,
        } as never,
      });
    } catch (_) { /* non-blocking */ }

    return new Response(
      JSON.stringify({ ok: true, mode, currentSeats, newSeats, effectiveAt }),
      { headers: getJsonHeaders(), status: 200 },
    );
  } catch (error) {
    if (error instanceof ValidationException) {
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: error.errors }),
        { headers: getJsonHeaders(), status: 422 },
      );
    }
    console.error('schedule-seat-change error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: getJsonHeaders(), status: 400 },
    );
  }
});
