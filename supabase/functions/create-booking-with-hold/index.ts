import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse, createOrder } from '../_shared/paypal.ts';
import { splitJobTotalCents } from '../_shared/revenueSplit.ts';
import { assertServiceArea, resolveServiceZip } from '../_shared/serviceArea.ts';
import { computeHoldFromServices } from '../_shared/holdPricing.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (!Deno.env.get('PAYPAL_CLIENT_ID')?.trim() || !Deno.env.get('PAYPAL_CLIENT_SECRET')?.trim()) {
      return jsonResponse(
        { error: 'PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are not configured on Supabase Edge Functions.' },
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
      preferredDate,
      preferredTimeWindow,
      customerNotes,
      referralCode,
      preferredMechanicId: preferredMechanicIdRaw,
    } = body;

    if (!customerName?.trim() || !customerAddress?.trim() || !Array.isArray(services) || services.length === 0) {
      return jsonResponse({ error: 'Missing required booking fields' }, 400);
    }

    // Server computes hold: $85 diagnostic unless only direct-book services
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

    const depositCents = Math.round(hold * 100);
    if (depositCents < 50) {
      return jsonResponse({ error: 'Deposit must be at least $0.50' }, 400);
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

    let referralCodeUsed: string | null = null;
    let referralCodeId: string | null = null;
    const referralRaw =
      typeof referralCode === 'string' ? referralCode.trim().toUpperCase() : '';
    if (referralRaw) {
      const { data: codeRow } = await supabase
        .from('referral_codes')
        .select('id, code, profile_id, active')
        .eq('code', referralRaw)
        .eq('active', true)
        .maybeSingle();
      if (codeRow?.code && codeRow.profile_id !== userId) {
        referralCodeUsed = codeRow.code as string;
        referralCodeId = codeRow.id as string;
      }
    }

    const preferredMechanicId =
      typeof preferredMechanicIdRaw === 'string' && preferredMechanicIdRaw.trim()
        ? preferredMechanicIdRaw.trim()
        : null;

    // Our own deadline for a booking to be claimed and scheduled. It no longer
    // tracks any processor state: the deposit is charged outright, so there is
    // no authorization sitting on the customer's card that can expire.
    const holdExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

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
        preferred_date:
          typeof preferredDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(preferredDate.trim())
            ? preferredDate.trim()
            : null,
        preferred_time_window:
          typeof preferredTimeWindow === 'string' && preferredTimeWindow.trim()
            ? preferredTimeWindow.trim().slice(0, 80)
            : null,
        customer_notes:
          typeof customerNotes === 'string' && customerNotes.trim()
            ? customerNotes.trim().slice(0, 1000)
            : null,
        referral_code_used: referralCodeUsed,
        preferred_mechanic_id: preferredMechanicId,
        hold_expires_at: holdExpiresAt,
        reference_code: '',
        payment_status: 'awaiting_card',
        hold_amount_cents: depositCents,
        quote_status: quote.mode === 'diagnostic' ? 'awaiting_diagnostic' : 'none',
      })
      .select('id, reference_code')
      .single();

    if (bookingError || !booking) {
      console.error('[create-booking-with-hold] booking insert:', bookingError?.message, bookingError?.code);
      return jsonResponse({ error: bookingError?.message || 'Could not create booking' }, 500);
    }

    const receiptEmail = email;

    // The diagnostic deposit is charged outright, not held.
    //
    // A hold was the more complicated option and bought nothing: it reserved
    // funds for a few days, needed a vaulted card to bill anything above it, and
    // expired on the processor's schedule rather than ours. A charge is
    // strictly stronger protection -- the money is actually collected -- and it
    // removes the vault, the authorization window and the capture step entirely.
    // Any balance above the deposit is collected afterwards by payment link,
    // and the deposit is refunded if we cannot make the appointment.
    let order;
    try {
      order = await createOrder({
        intent: 'CAPTURE',
        amountCents: depositCents,
        currency: 'USD',
        invoiceId: booking.reference_code,
        description: `Adaptivity Performance diagnostic deposit — ${booking.reference_code}`,
        idempotencyKey: `dep-${booking.id}`,
      });
    } catch (paypalErr) {
      await supabase.from('bookings').delete().eq('id', booking.id);
      throw paypalErr;
    }

    await supabase
      .from('bookings')
      .update({
        processor: 'paypal',
        paypal_order_id: order.orderId,
        payment_status: 'awaiting_card',
      })
      .eq('id', booking.id);

    const { platformFeeCents, techTransferCents } = splitJobTotalCents(depositCents);

    // Plain insert rather than the previous upsert-on-payment_intent_id: the
    // booking was created moments ago, so no payments row can exist for it yet.
    const { error: paymentRowError } = await supabase.from('payments').insert({
      booking_reference: booking.reference_code,
      booking_id: booking.id,
      processor: 'paypal',
      paypal_order_id: order.orderId,
      customer_email: receiptEmail ?? null,
      amount_cents: depositCents,
      tip_cents: 0,
      platform_fee_cents: platformFeeCents,
      tech_transfer_cents: techTransferCents,
      status: 'pending',
      payout_status: 'none',
    });

    if (paymentRowError) {
      console.error('[create-booking-with-hold] payments upsert:', paymentRowError.message);
    }

    if (referralCodeId && userId) {
      await supabase.from('referral_redemptions').insert({
        referral_code_id: referralCodeId,
        referred_profile_id: userId,
        booking_id: booking.id,
        status: 'pending',
      });
    }

    // Fire-and-forget: notify Teams channel of new booking
    const teamsWebhookUrl = Deno.env.get('TEAMS_WEBHOOK_URL');
    if (teamsWebhookUrl) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      fetch(`${supabaseUrl}/functions/v1/notify-teams-new-booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ bookingId: booking.id }),
      }).catch((e) => console.error('[Teams notify] failed:', e));
    }

    return jsonResponse({
      bookingReference: booking.reference_code,
      bookingId: booking.id,
      // Replaces clientSecret: the browser hands this to the PayPal JS SDK to
      // render card fields, then posts back to confirm-booking-hold.
      orderId: order.orderId,
      holdAmountDollars: hold,
      holdMode: quote.mode,
      holdExpiresAt,
      message:
        'Pay the $85 diagnostic deposit to confirm your booking. It is credited toward your repair, and refunded in full if we cannot make the appointment.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Booking authorization failed';
    console.error('[create-booking-with-hold]', message);
    return jsonResponse({ error: message }, 500);
  }
});
