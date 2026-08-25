import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse, stripeRequest } from '../_shared/stripe.ts';
import { splitJobTotalCents } from '../_shared/revenueSplit.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body = await req.json();
    let {
      baseAmountDollars,
      customerEmail,
      customerName,
      shippingAddress,
      techStripeAccountId,
      bookingReference,
    } = body;
    const { tipAmountDollars = 0, preferFinancing } = body;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Payment-link mode: a customer paying a tech-finalized total from a link.
    // The amount and the destination tech account come from the stored booking —
    // never from the client — so the customer cannot alter what they are charged.
    const paymentLinkReference =
      typeof body.paymentLinkReference === 'string' ? body.paymentLinkReference.trim() : '';
    let isPaymentLink = false;
    let linkTaxCents = 0;
    let linkPartsCents = 0;
    let linkPartsBy: 'tech' | 'company' = 'tech';
    let servicesList: string[] = [];

    if (paymentLinkReference) {
      const { data: b } = await supabase
        .from('bookings')
        .select(
          'reference_code, mechanic_id, customer_name, customer_email, customer_address, services, payment_link_status, payment_link_total_cents, payment_link_tax_cents, payment_link_parts_cents, payment_link_parts_by'
        )
        .ilike('reference_code', paymentLinkReference)
        .maybeSingle();

      if (
        !b ||
        b.payment_link_status !== 'sent' ||
        !b.payment_link_total_cents ||
        Number(b.payment_link_total_cents) <= 0
      ) {
        return jsonResponse({ error: 'This payment link is not available or has already been paid.' }, 404);
      }

      isPaymentLink = true;
      baseAmountDollars = Number(b.payment_link_total_cents) / 100;
      bookingReference = b.reference_code;
      customerEmail = customerEmail || b.customer_email || undefined;
      customerName = b.customer_name || customerName;
      shippingAddress = b.customer_address ? { line1: String(b.customer_address) } : shippingAddress;
      linkTaxCents = Number(b.payment_link_tax_cents) || 0;
      linkPartsCents = Number(b.payment_link_parts_cents) || 0;
      linkPartsBy = b.payment_link_parts_by === 'company' ? 'company' : 'tech';
      servicesList = Array.isArray(b.services) ? (b.services as string[]) : [];

      // Resolve the assigned tech's Connect account server-side.
      techStripeAccountId = null;
      if (b.mechanic_id) {
        const { data: mech } = await supabase
          .from('mechanic_details')
          .select('stripe_account_id')
          .eq('profile_id', b.mechanic_id)
          .maybeSingle();
        techStripeAccountId =
          typeof mech?.stripe_account_id === 'string' ? mech.stripe_account_id : null;
      }
    }

    const base = Number(baseAmountDollars);
    const tip = Number(tipAmountDollars);
    if (!Number.isFinite(base) || base <= 0) {
      return jsonResponse({ error: 'Invalid baseAmountDollars' }, 400);
    }

    const baseCents = Math.round(base * 100);
    const tipCents = Math.round(Math.max(0, tip) * 100);
    const totalCents = baseCents + tipCents;
    const laborSplit = isPaymentLink
      ? splitJobTotalCents(baseCents, linkTaxCents, linkPartsCents, linkPartsBy)
      : splitJobTotalCents(baseCents);
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
        type: isPaymentLink ? 'booking_payment_link' : 'checkout',
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
      baseAmount: baseCents / 100,
      techShareAmount: techTransferCents / 100,
      platformShareAmount: platformFeeCents / 100,
      // Display info for the payment-link checkout page (customer is not logged in).
      ...(isPaymentLink
        ? { customerName: name, services: servicesList, bookingReference }
        : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Payment intent failed';
    return jsonResponse({ error: message }, 500);
  }
});
