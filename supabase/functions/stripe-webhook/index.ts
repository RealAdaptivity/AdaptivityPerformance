import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { attemptTechInstantPayout } from './_shared/instantPayout.ts';

const crypto = globalThis.crypto;

async function verifyStripeSignature(
  payload: string,
  signatureHeader: string,
  secret: string
): Promise<boolean> {
  const parts = signatureHeader.split(',').reduce<Record<string, string>>((acc, part) => {
    const [k, v] = part.split('=');
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {});

  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return expected === signature;
}

function instantPayoutsEnabled(): boolean {
  const flag = Deno.env.get('STRIPE_INSTANT_PAYOUTS_ENABLED');
  return flag !== 'false' && flag !== '0';
}

async function releaseTechPayoutForPaymentIntent(
  supabase: ReturnType<typeof createClient>,
  paymentIntentId: string,
  connectedAccountId?: string | null
) {
  if (!instantPayoutsEnabled()) return;

  const { data: payment } = await supabase
    .from('payments')
    .select('id, tech_transfer_cents, tech_stripe_account_id, payout_status, stripe_payout_id')
    .eq('payment_intent_id', paymentIntentId)
    .maybeSingle();

  if (
    !payment ||
    payment.stripe_payout_id ||
    payment.payout_status === 'paid' ||
    payment.payout_status === 'instant_paid'
  ) {
    return;
  }

  const accountId = connectedAccountId || payment.tech_stripe_account_id;
  const amountCents = payment.tech_transfer_cents;
  if (!accountId?.startsWith('acct_') || !amountCents || amountCents <= 0) {
    await supabase
      .from('payments')
      .update({
        payout_status: 'skipped',
        payout_error: 'No connected Stripe account or tech transfer amount',
        updated_at: new Date().toISOString(),
      })
      .eq('payment_intent_id', paymentIntentId);
    return;
  }

  await supabase
    .from('payments')
    .update({ payout_status: 'pending', updated_at: new Date().toISOString() })
    .eq('payment_intent_id', paymentIntentId);

  const result = await attemptTechInstantPayout(accountId, amountCents, {
    payment_intent_id: paymentIntentId,
    trigger: 'payment_succeeded',
  });

  if (result.ok && result.payoutId) {
    await supabase
      .from('payments')
      .update({
        stripe_payout_id: result.payoutId,
        payout_method: result.method ?? null,
        payout_status: result.method === 'instant' ? 'instant_pending' : 'standard_pending',
        payout_amount_cents: result.amountCents ?? null,
        payout_error: result.error ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('payment_intent_id', paymentIntentId);
    return;
  }

  await supabase
    .from('payments')
    .update({
      payout_status: result.retryable ? 'retry_pending' : 'failed',
      payout_error: result.error ?? 'Payout failed',
      updated_at: new Date().toISOString(),
    })
    .eq('payment_intent_id', paymentIntentId);
}

async function retryPendingPayouts(
  supabase: ReturnType<typeof createClient>,
  connectedAccountId: string
) {
  const { data: rows } = await supabase
    .from('payments')
    .select('payment_intent_id, tech_transfer_cents')
    .eq('tech_stripe_account_id', connectedAccountId)
    .eq('payout_status', 'retry_pending')
    .order('created_at', { ascending: true })
    .limit(5);

  for (const row of rows ?? []) {
    if (row.tech_transfer_cents && row.payment_intent_id) {
      await releaseTechPayoutForPaymentIntent(supabase, row.payment_intent_id, connectedAccountId);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature');
  const secretKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
  const isLive = secretKey.startsWith('sk_live_');

  // Live: always verify. Test: verify when secret is configured (recommended).
  if (isLive && !webhookSecret?.trim()) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET required for live mode');
    return new Response('Webhook secret not configured', { status: 500 });
  }

  if (webhookSecret) {
    if (!signature || !(await verifyStripeSignature(rawBody, signature, webhookSecret))) {
      return new Response('Invalid signature', { status: 400 });
    }
  } else {
    console.warn('[stripe-webhook] STRIPE_WEBHOOK_SECRET unset — skipping signature check (test only)');
  }

  const event = JSON.parse(rawBody);
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  if (event.type === 'payment_intent.amount_capturable_updated') {
    const pi = event.data.object;
    if (pi.metadata?.type === 'booking_hold' && pi.status === 'requires_capture') {
      await supabase
        .from('bookings')
        .update({
          payment_status: 'authorized',
          updated_at: new Date().toISOString(),
        })
        .eq('payment_intent_id', pi.id);
      await supabase
        .from('payments')
        .update({
          status: 'authorized',
          payout_status: 'awaiting_capture',
          updated_at: new Date().toISOString(),
        })
        .eq('payment_intent_id', pi.id);
    }
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    await supabase
      .from('payments')
      .update({ status: 'succeeded', updated_at: new Date().toISOString() })
      .eq('payment_intent_id', pi.id);

    if (pi.metadata?.type === 'booking_hold') {
      await supabase
        .from('bookings')
        .update({
          payment_status: 'captured',
          captured_amount_cents: pi.amount_received ?? pi.amount,
          updated_at: new Date().toISOString(),
        })
        .eq('payment_intent_id', pi.id);
    }

    const destination = pi.transfer_data?.destination as string | undefined;
    if (pi.metadata?.type !== 'booking_hold') {
      await releaseTechPayoutForPaymentIntent(supabase, pi.id, destination);
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object;
    await supabase
      .from('payments')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('payment_intent_id', pi.id);
  }

  if (event.type === 'account.updated') {
    const account = event.data.object as {
      id?: string;
      metadata?: { adaptivity_profile_id?: string };
    };
    const profileId = account.metadata?.adaptivity_profile_id?.trim();
    if (account.id?.startsWith('acct_') && profileId) {
      await supabase.from('mechanic_details').upsert(
        {
          profile_id: profileId,
          stripe_account_id: account.id,
        },
        { onConflict: 'profile_id' }
      );
    } else if (account.id && account.charges_enabled) {
      await supabase
        .from('mechanic_details')
        .update({ stripe_account_id: account.id })
        .eq('stripe_account_id', account.id);
    }
  }

  if (event.type === 'balance.available') {
    const accountId = event.account as string | undefined;
    if (accountId?.startsWith('acct_')) {
      await retryPendingPayouts(supabase, accountId);
    }
  }

  if (event.type === 'payout.paid') {
    const payout = event.data.object;
    await supabase
      .from('payments')
      .update({
        payout_status: payout.method === 'instant' ? 'instant_paid' : 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_payout_id', payout.id);
  }

  if (event.type === 'payout.failed') {
    const payout = event.data.object;
    await supabase
      .from('payments')
      .update({
        payout_status: 'failed',
        payout_error: payout.failure_message || payout.failure_code || 'Payout failed',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_payout_id', payout.id);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
