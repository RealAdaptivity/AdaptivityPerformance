import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  jsonResponse,
  getHelcimMode,
  getHelcimTransaction,
  isHelcimApproved,
  amountToCents,
} from '../_shared/helcim.ts';

/**
 * Helcim webhook receiver — a backstop for payments the browser never confirmed.
 *
 * The happy path is confirm-booking-hold / confirm-checkout-payment, called by
 * the browser once the HelcimPay.js modal closes. But the customer's card is
 * charged before that call happens, so a closed tab or a dropped connection
 * leaves money taken with no record of it. This closes that window.
 *
 * Helcim webhooks are deliberately thin: they carry a transaction id and a type,
 * not the transaction itself. That suits us -- the amount is fetched from the
 * API rather than read out of a request body, so a forged payload cannot invent
 * a payment even if signature verification were somehow bypassed.
 */

const SIGNATURE_TOLERANCE_SECONDS = 300;

/** Length-independent, constant-time comparison to avoid timing leaks. */
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  let mismatch = aBytes.length ^ bBytes.length;
  const len = Math.max(aBytes.length, bBytes.length);
  for (let i = 0; i < len; i++) {
    mismatch |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return mismatch === 0;
}

/**
 * Verify a Helcim webhook signature.
 *
 * Helcim signs in the Svix scheme: HMAC-SHA256 over `{id}.{timestamp}.{body}`,
 * keyed by the base64-decoded verifier token, with the result base64-encoded and
 * carried as one or more space-separated `v1,<sig>` entries.
 *
 * NOTE: this was written against Helcim's published webhook format without
 * being exercised against a live delivery, as api.helcim.com is unreachable from
 * the build environment. If real webhooks fail verification, this function is
 * the one place to correct -- and it fails closed, so a mismatch drops the event
 * rather than trusting it.
 */
async function verifyHelcimSignature(
  body: string,
  webhookId: string,
  webhookTimestamp: string,
  signatureHeader: string,
  verifierToken: string
): Promise<boolean> {
  const timestampSeconds = Number(webhookTimestamp);
  if (!Number.isFinite(timestampSeconds)) return false;
  const age = Math.abs(Date.now() / 1000 - timestampSeconds);
  if (age > SIGNATURE_TOLERANCE_SECONDS) return false;

  let keyBytes: Uint8Array;
  try {
    const raw = verifierToken.startsWith('whsec_') ? verifierToken.slice(6) : verifierToken;
    keyBytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  } catch {
    // Not base64 — treat the token as raw bytes.
    keyBytes = new TextEncoder().encode(verifierToken);
  }

  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signedPayload = `${webhookId}.${webhookTimestamp}.${body}`;
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));

  // The header may carry several versioned signatures during key rotation.
  for (const entry of signatureHeader.split(' ')) {
    const [version, signature] = entry.split(',');
    if (version === 'v1' && signature && timingSafeEqual(expected, signature)) return true;
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const rawBody = await req.text();
  const verifierToken = Deno.env.get('HELCIM_WEBHOOK_VERIFIER_TOKEN')?.trim();
  const live = getHelcimMode() === 'live';

  if (live && !verifierToken) {
    // Fail closed: an unverified webhook must never move money in live mode.
    console.error('[helcim-webhook] HELCIM_WEBHOOK_VERIFIER_TOKEN required in live mode');
    return jsonResponse({ error: 'Webhook verification not configured' }, 500);
  }

  if (verifierToken) {
    const id = req.headers.get('webhook-id') ?? '';
    const timestamp = req.headers.get('webhook-timestamp') ?? '';
    const signature = req.headers.get('webhook-signature') ?? '';
    if (!id || !timestamp || !signature) {
      return jsonResponse({ error: 'Missing webhook signature headers' }, 400);
    }
    const valid = await verifyHelcimSignature(rawBody, id, timestamp, signature, verifierToken);
    if (!valid) {
      console.error('[helcim-webhook] signature verification failed');
      return jsonResponse({ error: 'Invalid signature' }, 400);
    }
  }

  let event: { id?: string | number; type?: string };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const transactionId = event.id != null ? String(event.id) : '';
  if (!transactionId) return jsonResponse({ ok: true, ignored: 'no transaction id' });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Claim the event before doing any work. A duplicate delivery must not accrue
  // a second payout for the same job.
  const eventKey = `${req.headers.get('webhook-id') ?? transactionId}`;
  const { error: claimError } = await supabase
    .from('helcim_webhook_events')
    .insert({ event_id: eventKey, event_type: event.type ?? null });

  if (claimError) {
    if (claimError.code === '23505') {
      return jsonResponse({ ok: true, duplicate: true });
    }
    // Fail open on unexpected ledger errors (e.g. migration not yet applied) so a
    // real event is never dropped; duplicate protection is best-effort.
    console.error('[helcim-webhook] event dedupe insert failed', claimError);
  }

  // The payload is only a pointer. Everything that matters is fetched.
  let txn;
  try {
    txn = await getHelcimTransaction(transactionId);
  } catch (e) {
    console.error('[helcim-webhook] could not fetch transaction', transactionId, e);
    return jsonResponse({ ok: false, error: 'Could not fetch transaction' }, 502);
  }

  if (!isHelcimApproved(txn.status)) {
    return jsonResponse({ ok: true, ignored: `status ${txn.status}` });
  }

  // Find the payment this belongs to. Already-confirmed rows are left alone --
  // the browser got there first, which is the normal case.
  const { data: payment } = await supabase
    .from('payments')
    .select('id, booking_id, booking_reference, amount_cents, status, helcim_transaction_id')
    .eq('helcim_transaction_id', txn.transactionId)
    .maybeSingle();

  if (payment) {
    return jsonResponse({ ok: true, alreadyRecorded: true, paymentId: payment.id });
  }

  // No row carries this transaction id yet, which is the case this receiver
  // exists for: the customer paid but the browser never called confirm. The
  // pending payments row is keyed by checkout token, and the webhook does not
  // carry one -- but the transaction does carry the invoiceNumber we set when
  // opening the session, which is the booking reference.
  const invoiceNumber =
    typeof txn.raw.invoiceNumber === 'string'
      ? txn.raw.invoiceNumber
      : txn.raw.invoiceNumber != null
        ? String(txn.raw.invoiceNumber)
        : null;

  if (!invoiceNumber) {
    // Nothing safe to attribute this to. Never invent a payment row: doing so
    // could accrue a payout for a job that was never captured.
    console.warn('[helcim-webhook] approved transaction with no invoiceNumber', txn.transactionId);
    return jsonResponse({ ok: true, unmatched: true, transactionId: txn.transactionId });
  }

  const { data: pending } = await supabase
    .from('payments')
    .select('id, booking_id, booking_reference, amount_cents, tech_transfer_cents, status')
    .eq('booking_reference', invoiceNumber)
    .is('helcim_transaction_id', null)
    // A booking can carry more than one payments row -- a hold plus a later
    // payment link, say -- so take the newest unconfirmed one rather than
    // letting maybeSingle() error on multiple matches.
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pending) {
    return jsonResponse({ ok: true, unmatched: true, bookingReference: invoiceNumber });
  }

  const paidCents = amountToCents(txn.amount);
  const expectedCents = Number(pending.amount_cents ?? 0);
  if (expectedCents > 0 && paidCents < expectedCents) {
    // Under-payment is an exception for a human, not something to auto-complete.
    console.warn(
      `[helcim-webhook] ${invoiceNumber}: transaction ${txn.transactionId} is ${paidCents} of expected ${expectedCents}`
    );
    return jsonResponse({ ok: true, underpaid: true, bookingReference: invoiceNumber });
  }

  // A preauth is a hold awaiting capture; a purchase or capture is money taken.
  const rawType = typeof txn.raw.type === 'string' ? txn.raw.type.toLowerCase() : '';
  const isHold = rawType.includes('preauth');
  const now = new Date().toISOString();

  let payoutWarning: string | null = null;
  if (!isHold) {
    let mechanicId: string | null = null;
    if (pending.booking_id) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('mechanic_id')
        .eq('id', pending.booking_id)
        .maybeSingle();
      mechanicId = (booking?.mechanic_id as string) ?? null;
    }
    const techCents = Number(pending.tech_transfer_cents ?? 0);
    if (mechanicId && techCents > 0) {
      const { error } = await supabase.from('tech_payouts').upsert(
        {
          booking_id: pending.booking_id,
          booking_reference: pending.booking_reference ?? invoiceNumber,
          mechanic_id: mechanicId,
          amount_cents: techCents,
          status: 'accrued',
          notes: 'Recovered by webhook (browser never confirmed)',
        },
        { onConflict: 'booking_id' }
      );
      if (error) payoutWarning = error.message;
    }
  }

  await supabase
    .from('payments')
    .update({
      processor: 'helcim',
      helcim_transaction_id: txn.transactionId,
      helcim_card_token: txn.cardToken,
      helcim_customer_code: txn.customerCode,
      status: isHold ? 'authorized' : 'succeeded',
      payout_status: isHold ? 'awaiting_capture' : payoutWarning ? 'none' : 'accrued',
      payout_error: payoutWarning,
      updated_at: now,
    })
    .eq('id', pending.id);

  if (pending.booking_id) {
    await supabase
      .from('bookings')
      .update({
        processor: 'helcim',
        helcim_transaction_id: txn.transactionId,
        ...(isHold
          ? { helcim_card_token: txn.cardToken, payment_status: 'authorized' }
          : { payment_status: 'captured', captured_amount_cents: paidCents }),
        updated_at: now,
      })
      .eq('id', pending.booking_id);
  }

  console.log(
    `[helcim-webhook] recovered ${isHold ? 'hold' : 'payment'} for ${invoiceNumber} from transaction ${txn.transactionId}`
  );

  return jsonResponse({
    ok: true,
    recovered: true,
    bookingReference: invoiceNumber,
    transactionId: txn.transactionId,
    payoutWarning,
  });
});
