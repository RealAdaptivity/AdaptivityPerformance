import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse } from '../_shared/http.ts';
import { assertServiceArea, resolveServiceZip } from '../_shared/serviceArea.ts';
import { computeQuoteFromServices } from '../_shared/servicePricing.ts';

/** Replaces create-booking-with-hold. No card is taken online any more: the
 *  booking is a request for a visit, and the customer pays the technician in
 *  person on Square. Nothing here authorizes, captures or stores card data. */
Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
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
    if (!customerPhone?.trim()) {
      return jsonResponse({ error: 'Phone number is required.' }, 400);
    }

    /* The quote is what the customer is told the visit costs, not an amount we
       collect. It still comes from the one catalog so the site, the dispatch
       console and this row cannot disagree. */
    const quote = computeQuoteFromServices(services);
    const quotedDollars = quote.quotedDollars;
    const normalizedServices = quote.serviceTitles;

    const email = customerEmail?.trim() || undefined;

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
    const referralRaw = typeof referralCode === 'string' ? referralCode.trim().toUpperCase() : '';
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

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        customer_id: userId,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: email ?? null,
        customer_address: customerAddress.trim(),
        zip_code: (resolvedZip ?? zipCode?.trim()) || null,
        vehicle_description: vehicleDescription?.trim() || 'Customer vehicle',
        vin: vin?.trim() || null,
        services: normalizedServices,
        total_estimate: quotedDollars,
        location_type: locType,
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
        reference_code: '',
        /* Nothing is authorized, so hold_amount_cents stays null: a null here
           means "no card was ever held", which is now true of every booking. */
        payment_status: 'pay_in_person',
        quote_status: quote.mode === 'diagnostic' ? 'awaiting_diagnostic' : 'none',
      })
      .select('id, reference_code')
      .single();

    if (bookingError || !booking) {
      console.error('[create-booking-request] booking insert:', bookingError?.message, bookingError?.code);
      return jsonResponse({ error: bookingError?.message || 'Could not create booking' }, 500);
    }

    if (referralCodeId && userId) {
      await supabase.from('referral_redemptions').insert({
        referral_code_id: referralCodeId,
        referred_profile_id: userId,
        booking_id: booking.id,
        status: 'pending',
      });
    }

    // Fire-and-forget: notify the Teams channel of the new request.
    const teamsWebhookUrl = Deno.env.get('TEAMS_WEBHOOK_URL');
    if (teamsWebhookUrl) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      fetch(`${supabaseUrl}/functions/v1/notify-teams-new-booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({ bookingId: booking.id }),
      }).catch((e) => console.error('[Teams notify] failed:', e));
    }

    return jsonResponse({
      bookingReference: booking.reference_code,
      bookingId: booking.id,
      quotedAmountDollars: quotedDollars,
      quoteMode: quote.mode,
      message:
        `Request received. Nothing is charged online — your technician takes payment in person by card, tap or chip when the work is done.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Booking request failed';
    console.error('[create-booking-request]', message);
    return jsonResponse({ error: message }, 500);
  }
});
