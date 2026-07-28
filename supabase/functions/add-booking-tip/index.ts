import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse, stripeRequest } from './_shared/stripe.ts';
import {
  resolveTechStripeAccountId,
} from './_shared/connectTransfer.ts';

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
        'id, reference_code, customer_id, mechanic_id, payment_intent_id, payment_status, captured_amount_cents'
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
      .select('id, tip_cents, payment_intent_id')
      .eq('booking_id', booking.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if ((payment?.tip_cents ?? 0) > 0) {
      return jsonResponse({ error: 'A tip was already added for this job' }, 400);
    }

    const piId = booking.payment_intent_id || payment?.payment_intent_id;
    if (!piId) return jsonResponse({ error: 'No payment on file for tip charge' }, 400);

    const pi = await stripeRequest(`/payment_intents/${piId}`, 'GET');
    const paymentMethod =
      typeof pi.payment_method === 'string' ? pi.payment_method : pi.payment_method?.id;
    if (!paymentMethod) {
      return jsonResponse({ error: 'No saved card for tip' }, 400);
    }

    const tipBody: Record<string, unknown> = {
      amount: tipCents,
      currency: 'usd',
      payment_method: paymentMethod,
      confirm: true,
      off_session: true,
      metadata: {
        type: 'job_tip',
        booking_reference: booking.reference_code,
        booking_id: booking.id,
      },
    };
    if (typeof pi.customer === 'string' && pi.customer) tipBody.customer = pi.customer;

    const tipPi = await stripeRequest('/payment_intents', 'POST', tipBody);
    if (tipPi.status !== 'succeeded') {
      return jsonResponse({ error: `Tip charge failed (${tipPi.status})` }, 402);
    }

    const chargeId =
      typeof tipPi.latest_charge === 'string' ? tipPi.latest_charge : tipPi.latest_charge?.id ?? null;
    const techStripeAccountId = await resolveTechStripeAccountId(supabase, booking.mechanic_id);

    let transferId: string | null = null;
    let transferError: string | null = null;
    if (techStripeAccountId?.startsWith('acct_')) {
      try {
        const transfer = await stripeRequest('/transfers', 'POST', {
          amount: tipCents,
          currency: 'usd',
          destination: techStripeAccountId,
          ...(chargeId ? { source_transaction: chargeId } : {}),
          metadata: {
            booking_reference: booking.reference_code,
            type: 'tip_100pct',
          },
        });
        transferId = transfer.id as string;
      } catch (e) {
        transferError = e instanceof Error ? e.message : 'Tip transfer failed';
      }
    } else {
      transferError = 'Tech has no Stripe Express account for tip transfer';
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
      tipPaymentIntentId: tipPi.id,
      transferId,
      transferWarning: transferError,
    });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : 'Tip failed' }, 500);
  }
});
