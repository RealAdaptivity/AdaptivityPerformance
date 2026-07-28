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
      customerName,
      shippingAddress,
      techStripeAccountId,
      bookingReference,
      preferFinancing,
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
      // Dynamic methods: Affirm, Afterpay, Zip, Sunbit, Klarna when enabled in Dashboard
      // (do not set payment_method_types — Stripe best practice).
      automatic_payment_methods: { enabled: true },
      receipt_email: customerEmail || undefined,
      metadata: {
        booking_reference: bookingReference || '',
        platform: 'adaptivity_performance',
        prefer_financing: preferFinancing ? 'true' : 'false',
        bnpl_providers: 'affirm,afterpay,zip,sunbit,klarna',
        bnpl_hint:
          totalCents >= 5000 && totalCents <= 70000
            ? 'pay_in_4'
            : totalCents > 70000
              ? 'longer_monthly'
              : 'card',
      },
    };

    // Optional: Stripe Dashboard → Payment method configurations → platform PMC id
    const pmc =
      Deno.env.get('STRIPE_PAYMENT_METHOD_CONFIGURATION')?.trim() ||
      Deno.env.get('STRIPE_PMC_CHECKOUT')?.trim();
    if (pmc?.startsWith('pmc_')) {
      params.payment_method_configuration = pmc;
    }

    // BNPL conversion: shipping address improves Affirm / Afterpay / Zip / Klarna eligibility
    const ship = shippingAddress && typeof shippingAddress === 'object' ? shippingAddress : null;
    const name = typeof customerName === 'string' && customerName.trim() ? customerName.trim() : 'Customer';
    params.shipping = {
      name,
      address: {
        line1:
          typeof ship?.line1 === 'string' && ship.line1.trim()
            ? ship.line1.trim()
            : 'Service address on booking',
        line2: typeof ship?.line2 === 'string' ? ship.line2 : undefined,
        city: typeof ship?.city === 'string' && ship.city.trim() ? ship.city.trim() : 'Justin',
        state: typeof ship?.state === 'string' && ship.state.trim() ? ship.state.trim() : 'TX',
        postal_code:
          typeof ship?.postal_code === 'string' && ship.postal_code.trim()
            ? ship.postal_code.trim()
            : '76247',
        country: 'US',
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
