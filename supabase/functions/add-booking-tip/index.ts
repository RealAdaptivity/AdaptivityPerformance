import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  handleCors,
  jsonResponse,
  chargeWithCardToken,
  isHelcimApproved,
  centsToAmount,
} from './_shared/helcim.ts';

/** Post-capture tip — 100% to tech via Connect transfer. */
Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401);

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user },
    } = await supabaseUser.auth.getUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const { bookingReference, tipAmountDollars } = await req.json();
    const tipCents = Math.round(Number(tipAmountDollars) * 100);
    if (!bookingReference?.trim() || !Number.isFinite(tipCents) || tipCents < 100) {
      return jsonResponse({ error: 'bookingReference and tipAmountDollars (>= $1) required' }, 400);
    }
    if (tipCents > 50000) {
      return jsonResponse({ error: 'Tip max is $500' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: booking, error } = await supabase
      .from('bookings')
      .select(
        'id, reference_code, customer_id, mechanic_id, helcim_card_token, payment_status, captured_amount_cents'
      )
      .eq('reference_code', bookingReference.trim())
      .maybeSingle();

    if (error || !booking) return jsonResponse({ error: 'Booking not found' }, 404);
    if (booking.payment_status !== 'captured') {
      return jsonResponse({ error: 'Tips are available after the job is charged' }, 400);
    }

    const { data: profile } = await supabaseUser
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    const isAdmin = profile?.role === 'admin';
    if (!isAdmin && booking.customer_id !== user.id) {
      return jsonResponse({ error: 'Only the customer can tip this job' }, 403);
    }

    const { data: payment } = await supabase
      .from('payments')
      .select('id, tip_cents, helcim_card_token')
      .eq('booking_id', booking.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if ((payment?.tip_cents ?? 0) > 0) {
      return jsonResponse({ error: 'A tip was already added for this job' }, 400);
    }

    // Tips are charged against the card vaulted when the hold was taken, the same
    // token the repair remainder uses. Stripe could re-confirm off_session
    // against a saved payment method; Helcim's equivalent is a fresh purchase.
    const cardToken = booking.helcim_card_token || payment?.helcim_card_token;
    if (!cardToken) {
      return jsonResponse(
        { error: 'No saved card on file for this job, so a tip cannot be charged.' },
        400
      );
    }

    const tipCharge = await chargeWithCardToken({
      cardToken: cardToken as string,
      amount: centsToAmount(tipCents),
      invoiceNumber: booking.reference_code,
      idempotencySeed: `tip_${booking.id}_${tipCents}`,
    });
    if (!isHelcimApproved(tipCharge.status)) {
      return jsonResponse({ error: `Tip charge failed (${tipCharge.status})` }, 402);
    }

    // A tip goes 100% to the tech, unlike the 70% job share, so it is recorded as
    // its own ledger line rather than folded into the job's row. That also keeps
    // it clear of the unique-per-booking_id index, which a second row for the
    // same booking would otherwise collide with.
    let payoutWarning: string | null = null;
    if (booking.mechanic_id) {
      const { error: payoutError } = await supabase.from('tech_payouts').insert({
        booking_id: null,
        booking_reference: booking.reference_code,
        mechanic_id: booking.mechanic_id,
        amount_cents: tipCents,
        status: 'accrued',
        notes: `Tip on ${booking.reference_code} (100% to tech)`,
      });
      if (payoutError) {
        // The customer has already been charged; never fail the tip over the ledger.
        payoutWarning = payoutError.message;
        console.error('[add-booking-tip] tech_payouts insert failed', payoutError.message);
      }
    } else {
      payoutWarning = 'No technician assigned; tip not accrued.';
    }

    if (payment?.id) {
      const prevTip = Number(payment.tip_cents) || 0;
      await supabase
        .from('payments')
        .update({
          tip_cents: prevTip + tipCents,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id);
    }

    return jsonResponse({
      ok: true,
      tipAmountDollars: tipCents / 100,
      tipTransactionId: tipCharge.transactionId,
      payoutWarning,
    });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : 'Tip failed' }, 500);
  }
});
