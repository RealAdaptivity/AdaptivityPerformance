import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse, stripeRequest } from './_shared/stripe.ts';
import { captureHoldAndRemainder } from './_shared/captureHold.ts';
import {
  resolveTechStripeAccountId,
  transferTechShareToConnect,
} from './_shared/connectTransfer.ts';
import { sendExpoPush } from './_shared/expoPush.ts';
type LineItemIn = {
  title?: string;
  laborDollars?: number;
  partsDollars?: number;
  notes?: string;
};

/**
 * Tech-set pricing:
 * - mode "charge": tech enters labor+parts; total = diagnostic hold + repairs; capture hold + remainder
 * - mode "diagnostic_only": customer declined repairs; capture hold only
 * No customer quote-approval gate.
 */
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
    if (!authHeader) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user },
    } = await supabaseUser.auth.getUser();
    if (!user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json();
    const {
      bookingReference,
      mode: modeRaw,
      lineItems,
      techNotes,
      diagnosticOnly,
      customerAgreedOnSite,
    } = body;

    if (!bookingReference?.trim()) {
      return jsonResponse({ error: 'bookingReference is required' }, 400);
    }

    const mode: 'charge' | 'diagnostic_only' | 'no_show' =
      modeRaw === 'no_show'
        ? 'no_show'
        : diagnosticOnly === true || modeRaw === 'diagnostic_only'
          ? 'diagnostic_only'
          : 'charge';

    if (mode === 'charge' && customerAgreedOnSite !== true) {
      return jsonResponse(
        {
          error:
            'Confirm the customer agreed to the on-site price before charging (customerAgreedOnSite).',
        },
        400
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(
        'id, reference_code, mechanic_id, customer_id, customer_phone, customer_name, customer_address, vehicle_description, services, payment_intent_id, payment_status, hold_amount_cents, total_estimate, quote_status, status, referral_code_used, credit_applied_cents'
      )
      .eq('reference_code', bookingReference.trim())
      .maybeSingle();

    if (bookingError || !booking) {
      return jsonResponse({ error: 'Booking not found' }, 404);
    }

    if (booking.mechanic_id !== user.id) {
      return jsonResponse({ error: 'Only the assigned technician can complete payment capture' }, 403);
    }

    if (booking.status === 'CANCELED') {
      return jsonResponse({ error: 'Job is canceled' }, 400);
    }

    if (booking.payment_status === 'captured' && booking.status === 'COMPLETED') {
      // Retry Connect transfer only (no re-charge)
      const paymentIntentId = booking.payment_intent_id;
      if (!paymentIntentId) {
        return jsonResponse({ error: 'No payment intent on completed booking' }, 400);
      }
      const pi = await stripeRequest(`/payment_intents/${paymentIntentId}`, 'GET');
      const capturedCents =
        (pi.amount_received as number) ??
        booking.hold_amount_cents ??
        Math.round(Number(booking.total_estimate) * 100);
      const chargeId =
        typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id ?? null;
      const techStripeAccountId = await resolveTechStripeAccountId(supabase, booking.mechanic_id);
      const transferResult = await transferTechShareToConnect({
        paymentIntentId,
        bookingReference: booking.reference_code,
        capturedCents,
        techStripeAccountId,
        chargeId,
        source: 'job_capture_retry',
        existingTransferId: null,
      });
      await supabase
        .from('payments')
        .update({
          platform_fee_cents: transferResult.platformFeeCents,
          tech_transfer_cents: transferResult.techTransferCents,
          tech_stripe_account_id: transferResult.techStripeAccountId,
          stripe_transfer_id: transferResult.transferId,
          payout_status: transferResult.payoutStatus,
          payout_error: transferResult.transferError,
          updated_at: new Date().toISOString(),
        })
        .eq('payment_intent_id', paymentIntentId);

      return jsonResponse({
        ok: true,
        alreadyCaptured: true,
        bookingReference: booking.reference_code,
        capturedAmountDollars: capturedCents / 100,
        techPayoutDollars: transferResult.techTransferCents / 100,
        platformFeeDollars: transferResult.platformFeeCents / 100,
        transferId: transferResult.transferId,
        transferWarning: transferResult.transferError,
        connectAccountId: transferResult.techStripeAccountId,
        message: 'Job already captured — transfer retry attempted.',
      });
    }

    const paymentIntentId = booking.payment_intent_id;
    if (!paymentIntentId) {
      return jsonResponse({ error: 'No card hold on this booking' }, 400);
    }

    const holdCents = booking.hold_amount_cents ?? 10000;
    if (holdCents < 50) {
      return jsonResponse({ error: 'Invalid hold amount' }, 400);
    }

    let normalized: Array<{
      title: string;
      labor_cents: number;
      parts_cents: number;
      notes: string;
    }> = [];
    let repairsCents = 0;
    let totalChargeCents = holdCents;
    let quoteStatus: string = 'quote_approved';

    if (mode === 'diagnostic_only' || mode === 'no_show') {
      totalChargeCents = holdCents;
      quoteStatus = 'quote_declined';
      normalized = [
        {
          title: mode === 'no_show' ? 'No-show / missed appointment' : 'Mobile diagnostic visit',
          labor_cents: holdCents,
          parts_cents: 0,
          notes:
            mode === 'no_show'
              ? 'Customer no-show — diagnostic hold captured'
              : 'Customer declined additional repairs',
        },
      ];
    } else {
      const itemsIn: LineItemIn[] = Array.isArray(lineItems) ? lineItems : [];
      normalized = itemsIn
        .map((item) => {
          const title = String(item.title || '').trim();
          const laborCents = Math.round(Number(item.laborDollars || 0) * 100);
          const partsCents = Math.round(Number(item.partsDollars || 0) * 100);
          if (!title || laborCents + partsCents <= 0) return null;
          return {
            title,
            labor_cents: Math.max(0, laborCents),
            parts_cents: Math.max(0, partsCents),
            notes: String(item.notes || '').trim(),
          };
        })
        .filter(Boolean) as Array<{
        title: string;
        labor_cents: number;
        parts_cents: number;
        notes: string;
      }>;

      if (normalized.length === 0) {
        return jsonResponse(
          {
            error:
              'Add labor/parts line items to charge the customer, or use diagnostic_only to charge the $100 visit only.',
          },
          400
        );
      }

      repairsCents = normalized.reduce((sum, i) => sum + i.labor_cents + i.parts_cents, 0);
      totalChargeCents = holdCents + repairsCents;
    }

    // Apply available account credit (ledger sum) up to this charge
    let creditAppliedCents = 0;
    if (booking.customer_id && Number(booking.credit_applied_cents || 0) <= 0) {
      const { data: creditRows } = await supabase
        .from('customer_credits')
        .select('amount_cents')
        .eq('profile_id', booking.customer_id);
      const balance = (creditRows || []).reduce(
        (sum, r) => sum + (Number(r.amount_cents) || 0),
        0
      );
      creditAppliedCents = Math.max(0, Math.min(balance, totalChargeCents));
    }

    // Invoice/audit row (not a customer-approval gate)
    await supabase
      .from('booking_quotes')
      .update({ status: 'superseded', updated_at: new Date().toISOString() })
      .eq('booking_id', booking.id)
      .in('status', ['draft', 'pending']);

    const { data: quote } = await supabase
      .from('booking_quotes')
      .insert({
        booking_id: booking.id,
        submitted_by: user.id,
        status: mode === 'charge' ? 'approved' : 'declined',
        line_items: normalized,
        diagnostic_fee_cents: holdCents,
        repairs_cents: repairsCents,
        total_cents: totalChargeCents,
        tech_notes: [
          typeof techNotes === 'string' ? techNotes.trim() : '',
          mode === 'charge' && customerAgreedOnSite === true
            ? 'Customer agreed to on-site price before charge.'
            : '',
          creditAppliedCents > 0
            ? `Account credit applied: $${(creditAppliedCents / 100).toFixed(2)}`
            : '',
        ]
          .filter(Boolean)
          .join(' '),
        approved_at: mode === 'charge' ? new Date().toISOString() : null,
        declined_at: mode === 'charge' ? null : new Date().toISOString(),
        capture_amount_cents: totalChargeCents,
      })
      .select('id')
      .single();

    const result = await captureHoldAndRemainder({
      supabase,
      bookingId: booking.id,
      bookingReference: booking.reference_code,
      mechanicId: booking.mechanic_id,
      paymentIntentId,
      holdCents,
      totalChargeCents,
      creditAppliedCents,
      source:
        mode === 'no_show'
          ? 'tech_no_show'
          : mode === 'diagnostic_only'
            ? 'tech_diagnostic_only'
            : 'tech_set_price',
    });

    if (creditAppliedCents > 0 && booking.customer_id) {
      await supabase.from('customer_credits').insert({
        profile_id: booking.customer_id,
        amount_cents: -creditAppliedCents,
        reason: `Applied to job ${booking.reference_code}`,
        booking_id: booking.id,
      });
    }

    // Earn referral credits when a referred job completes
    if (booking.referral_code_used && booking.customer_id) {
      const { data: pending } = await supabase
        .from('referral_redemptions')
        .select('id, referral_code_id, referrer_credit_cents, referred_credit_cents')
        .eq('booking_id', booking.id)
        .eq('status', 'pending')
        .maybeSingle();

      let redemption = pending;
      if (!redemption) {
        const { data: codeRow } = await supabase
          .from('referral_codes')
          .select('id, profile_id, credit_cents')
          .eq('code', booking.referral_code_used)
          .eq('active', true)
          .maybeSingle();
        if (codeRow?.id && codeRow.profile_id !== booking.customer_id) {
          const { data: created } = await supabase
            .from('referral_redemptions')
            .insert({
              referral_code_id: codeRow.id,
              referred_profile_id: booking.customer_id,
              booking_id: booking.id,
              referrer_credit_cents: codeRow.credit_cents ?? 2500,
              referred_credit_cents: codeRow.credit_cents ?? 2500,
              status: 'pending',
            })
            .select('id, referral_code_id, referrer_credit_cents, referred_credit_cents')
            .single();
          redemption = created;
        }
      }

      if (redemption?.id) {
        const { data: codeMeta } = await supabase
          .from('referral_codes')
          .select('profile_id')
          .eq('id', redemption.referral_code_id)
          .maybeSingle();
        const referrerId = codeMeta?.profile_id as string | undefined;
        const referrerCredit = Number(redemption.referrer_credit_cents) || 2500;
        const referredCredit = Number(redemption.referred_credit_cents) || 2500;

        await supabase
          .from('referral_redemptions')
          .update({ status: 'earned', earned_at: new Date().toISOString() })
          .eq('id', redemption.id);

        if (referrerId) {
          await supabase.from('customer_credits').insert({
            profile_id: referrerId,
            amount_cents: referrerCredit,
            reason: `Referral reward — friend completed ${booking.reference_code}`,
            booking_id: booking.id,
            referral_redemption_id: redemption.id,
          });
        }
        await supabase.from('customer_credits').insert({
          profile_id: booking.customer_id,
          amount_cents: referredCredit,
          reason: `Welcome credit — completed referred job ${booking.reference_code}`,
          booking_id: booking.id,
          referral_redemption_id: redemption.id,
        });
      }
    }

    const reviewAskDueAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    await supabase
      .from('bookings')
      .update({
        quote_status: quoteStatus,
        active_quote_id: quote?.id ?? null,
        recommended_total_cents: totalChargeCents,
        payment_status: 'captured',
        captured_amount_cents: result.capturedCents,
        credit_applied_cents: result.creditAppliedCents || creditAppliedCents,
        total_estimate: result.capturedCents / 100,
        status: 'COMPLETED',
        review_ask_due_at: reviewAskDueAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking.id);

    if (quote?.id) {
      await supabase
        .from('booking_quotes')
        .update({
          capture_amount_cents: result.capturedCents,
          updated_at: new Date().toISOString(),
        })
        .eq('id', quote.id);
    }

    // Draft a Google Business post from this completed job city (best-effort)
    try {
      const zip = String(
        (await supabase.from('bookings').select('zip_code').eq('id', booking.id).maybeSingle())
          .data?.zip_code || ''
      );
      const cityHint =
        zip.startsWith('76247') || /justin/i.test(String(booking.customer_address || ''))
          ? 'justin'
          : zip.startsWith('76226') || zip.startsWith('76262')
            ? 'northlake'
            : null;
      const cityLabel = cityHint === 'justin' ? 'Justin' : cityHint === 'northlake' ? 'Northlake' : 'DFW';
      await supabase.from('gbp_post_drafts').insert({
        city_slug: cityHint,
        booking_id: booking.id,
        caption: `Another driveway job wrapped in ${cityLabel}, TX — mobile brakes, diagnostics, and more. Book a $100 diagnostic hold at adaptivityperformance.com. #MobileMechanic #${cityLabel}TX`,
        status: 'draft',
      });
    } catch (e) {
      console.warn('[capture-booking-payment] gbp draft failed', e);
    }

    // Push when customer has Expo token. Receipt SMS is tech device composer (Twilio deferred).
    const capturedDollars = (result.capturedCents / 100).toFixed(2);
    const creditNote =
      result.creditAppliedCents > 0
        ? ` Credit applied: $${(result.creditAppliedCents / 100).toFixed(2)}.`
        : '';
    if (booking.customer_id) {
      try {
        const { data: tokens } = await supabase
          .from('device_push_tokens')
          .select('expo_push_token')
          .eq('profile_id', booking.customer_id);
        const pushTokens = (tokens || [])
          .map((t) => t.expo_push_token as string)
          .filter(Boolean);
        if (pushTokens.length) {
          await sendExpoPush(pushTokens, {
            title: 'Payment complete',
            body: `$${capturedDollars} charged for job ${booking.reference_code}.${creditNote}`,
            data: { bookingReference: booking.reference_code, type: 'capture' },
          });
        }
      } catch (e) {
        console.warn('[capture-booking-payment] push failed', e);
      }
    }

    return jsonResponse({
      ok: true,
      alreadyCaptured: false,
      mode,
      bookingReference: booking.reference_code,
      quoteId: quote?.id ?? null,
      capturedAmountDollars: result.capturedCents / 100,
      creditAppliedDollars: (result.creditAppliedCents || 0) / 100,
      remainderDollars: result.remainderCents / 100,
      diagnosticFeeDollars: holdCents / 100,
      repairsDollars: repairsCents / 100,
      techPayoutDollars: result.techTransferCents / 100,
      platformFeeDollars: result.platformFeeCents / 100,
      transferId: result.transferId,
      transferWarning: result.transferError,
      connectAccountId: result.techStripeAccountId,
      reviewAskDueAt,
      message:
        mode === 'no_show'
          ? 'No-show hold charged. Job complete.'
          : mode === 'diagnostic_only'
            ? 'Diagnostic visit charged. Job complete.'
            : result.remainderCents > 0
              ? 'Hold captured and repair remainder charged to card on file.'
              : 'Charged from card hold.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Capture failed';
    console.error('[capture-booking-payment]', message);
    return jsonResponse({ error: message }, 500);
  }
});
