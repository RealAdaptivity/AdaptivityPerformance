import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse, stripeRequest } from './_shared/stripe.ts';
import { splitJobTotalCents } from './_shared/revenueSplit.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const {
      baseAmountDollars,
      tipAmountDollars = 0,
      customerEmail,
      techStripeAccountId,
      bookingReference,
    } = await req.json();

    const base = Number(baseAmountDollars);
    const tip = Number(tipAmountDollars);
    if (!Number.isFinite(base) || base <= 0) {
      return jsonResponse({ error: 'Invalid baseAmountDollars' }, 400);
    }

    const baseCents = Math.round(base * 100);
    const tipCents = Math.round(Math.max(0, tip) * 100);
    const totalCents = baseCents + tipCents;
    const laborSplit = splitJobTotalCents(baseCents);
    const platformFeeCents = laborSplit.platformFeeCents;
    const techTransferCents = laborSplit.techTransferCents + tipCents;

    const params: Record<string, unknown> = {
      amount: totalCents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      receipt_email: customerEmail || undefined,
      metadata: {
        booking_reference: bookingReference || '',
        platform: 'adaptivity_performance',
      },
    };

    if (techStripeAccountId && String(techStripeAccountId).startsWith('acct_')) {
      params.transfer_data = { destination: techStripeAccountId };
      params.application_fee_amount = platformFeeCents;
    }

    const paymentIntent = await stripeRequest('/payment_intents', 'POST', params);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let bookingId: string | null = null;
    if (bookingReference) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('id')
        .eq('reference_code', bookingReference)
        .maybeSingle();
      bookingId = booking?.id ?? null;
    }

    await supabase.from('payments').upsert(
      {
        booking_reference: bookingReference || null,
        booking_id: bookingId,
        payment_intent_id: paymentIntent.id,
        customer_email: customerEmail || null,
        amount_cents: totalCents,
        tip_cents: tipCents,
        platform_fee_cents: platformFeeCents,
        tech_transfer_cents: techTransferCents,
        tech_stripe_account_id: techStripeAccountId || null,
        status: paymentIntent.status === 'succeeded' ? 'succeeded' : 'pending',
        payout_status: techStripeAccountId ? 'awaiting_payment' : 'skipped',
      },
      { onConflict: 'payment_intent_id' }
    );

    return jsonResponse({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      totalCharged: totalCents / 100,
      techShareAmount: techTransferCents / 100,
      platformShareAmount: platformFeeCents / 100,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Payment intent failed';
    return jsonResponse({ error: message }, 500);
  }
});
