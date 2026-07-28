import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse, stripeRequest } from './_shared/stripe.ts';
import { splitJobTotalCents } from './_shared/revenueSplit.ts';
import { assertServiceArea, resolveServiceZip } from './_shared/serviceArea.ts';
import { computeHoldFromServices } from './_shared/holdPricing.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (!Deno.env.get('STRIPE_SECRET_KEY')?.trim()) {
      return jsonResponse(
        { error: 'STRIPE_SECRET_KEY is not configured on Supabase Edge Functions.' },
        503
      );
    }

    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader) {
      const supabaseUser = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const {
        data: { user },
      } = await supabaseUser.auth.getUser();
      userId = user?.id ?? null;
    }

    const body = await req.json();
    const {
      customerName,
      customerPhone,
      customerAddress,
      zipCode,
      vehicleDescription,
      vin,
      services,
      customerEmail,
      locationType,
      partnerLocationId,
    } = body;

    if (!customerName?.trim() || !customerAddress?.trim() || !Array.isArray(services) || services.length === 0) {
      return jsonResponse({ error: 'Missing required booking fields' }, 400);
    }

    // Server computes hold: $100 diagnostic unless only direct-book services
    // (brakes / oil / transmission oil / differential).
    const quote = computeHoldFromServices(services);
    const hold = quote.holdDollars;
    const normalizedServices = quote.serviceTitles;
    if (!Number.isFinite(hold) || hold <= 0) {
      return jsonResponse({ error: 'Invalid diagnostic hold amount' }, 400);
    }

    const email = customerEmail?.trim() || undefined;
    if (!userId && !email) {
      return jsonResponse({ error: 'Email is required to save your card on file.' }, 400);
    }
    if (!customerPhone?.trim()) {
      return jsonResponse({ error: 'Phone number is required.' }, 400);
    }

    const locType = locationType === 'shop' ? 'shop' : 'mobile';
    const resolvedZip = resolveServiceZip(zipCode, customerAddress);
    try {
      assertServiceArea(resolvedZip ?? zipCode, locType);
    } catch (areaErr) {
      return jsonResponse(
        { error: areaErr instanceof Error ? areaErr.message : 'Outside service area' },
        400
      );
    }

    const holdCents = Math.round(hold * 100);
    if (holdCents < 50) {
      return jsonResponse({ error: 'Hold amount must be at least $0.50' }, 400);
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (userId) {
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
      if (!profileRow) userId = null;
    }

    let resolvedPartnerId: string | null = null;
    if (locationType === 'shop' && typeof partnerLocationId === 'string' && partnerLocationId.trim()) {
      const { data: partner } = await supabase
        .from('partner_locations')
        .select('id')
        .eq('id', partnerLocationId.trim())
        .eq('status', 'approved')
        .eq('host_jobs', true)
        .maybeSingle();
      resolvedPartnerId = partner?.id ?? null;
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        customer_id: userId,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_address: customerAddress.trim(),
        zip_code: (resolvedZip ?? zipCode?.trim()) || null,
        vehicle_description: vehicleDescription?.trim() || 'Customer vehicle',
        vin: vin?.trim() || null,
        services: normalizedServices,
        total_estimate: hold,
        location_type: locationType === 'shop' ? 'shop' : 'mobile',
        partner_location_id: resolvedPartnerId,
        reference_code: '',
        payment_status: 'awaiting_card',
        hold_amount_cents: holdCents,
        quote_status: quote.mode === 'diagnostic' ? 'awaiting_diagnostic' : 'none',
      })
      .select('id, reference_code')
      .single();

    if (bookingError || !booking) {
      console.error('[create-booking-with-hold] booking insert:', bookingError?.message, bookingError?.code);
      return jsonResponse({ error: bookingError?.message || 'Could not create booking' }, 500);
    }

    const receiptEmail = email;

    const piParams: Record<string, unknown> = {
      amount: holdCents,
      currency: 'usd',
      capture_method: 'manual',
      automatic_payment_methods: { enabled: true },
      // Card hold for later capture — BNPL is for final checkout only.
      setup_future_usage: 'off_session',
      excluded_payment_method_types: [
        'affirm',
        'klarna',
        'afterpay_clearpay',
        'zip',
        'sunbit',
      ],
      metadata: {
        type: 'booking_hold',
        booking_reference: booking.reference_code,
        booking_id: String(booking.id),
        platform: 'adaptivity_performance',
      },
    };

    const holdPmc =
      Deno.env.get('STRIPE_PAYMENT_METHOD_CONFIGURATION_HOLDS')?.trim() ||
      Deno.env.get('STRIPE_PMC_HOLDS')?.trim();
    if (holdPmc?.startsWith('pmc_')) {
      // Prefer a card-only holds PMC in Dashboard; exclusions remain as a safety net.
      piParams.payment_method_configuration = holdPmc;
    }
    if (receiptEmail) {
      piParams.receipt_email = receiptEmail;
    }

    let paymentIntent;
    try {
      paymentIntent = await stripeRequest('/payment_intents', 'POST', piParams);
    } catch (stripeErr) {
      await supabase.from('bookings').delete().eq('id', booking.id);
      throw stripeErr;
    }

    await supabase
      .from('bookings')
      .update({
        payment_intent_id: paymentIntent.id,
        payment_status: 'awaiting_card',
      })
      .eq('id', booking.id);

    const { platformFeeCents, techTransferCents } = splitJobTotalCents(holdCents);

    const { error: paymentRowError } = await supabase.from('payments').upsert(
      {
        booking_reference: booking.reference_code,
        booking_id: booking.id,
        payment_intent_id: paymentIntent.id,
        customer_email: receiptEmail ?? null,
        amount_cents: holdCents,
        tip_cents: 0,
        platform_fee_cents: platformFeeCents,
        tech_transfer_cents: techTransferCents,
        tech_stripe_account_id: null,
        status: 'pending',
        payout_status: 'none',
      },
      { onConflict: 'payment_intent_id' }
    );

    if (paymentRowError) {
      console.error('[create-booking-with-hold] payments upsert:', paymentRowError.message);
    }

    return jsonResponse({
      bookingReference: booking.reference_code,
      bookingId: booking.id,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      holdAmountDollars: hold,
      holdMode: quote.mode,
      message:
        quote.mode === 'direct'
          ? 'Confirm your card to authorize this service. You are charged when the job is completed.'
          : 'Confirm your card for the $100 diagnostic hold. After inspection we recommend repairs before any additional charge.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Booking authorization failed';
    console.error('[create-booking-with-hold]', message);
    return jsonResponse({ error: message }, 500);
  }
});
