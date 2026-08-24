import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse } from '../_shared/stripe.ts';
import { sendTwilioSms } from '../_shared/twilioSms.ts';

type LineItemIn = {
  title?: string;
  laborDollars?: number;
  partsDollars?: number;
  notes?: string;
};

/**
 * Finalize a job total and send the customer a link to pay it themselves
 * (card or Buy-Now-Pay-Later). Unlike capture-booking-payment — which charges
 * the card on file off-session, where BNPL is impossible — this stores the total
 * server-side and lets the customer complete a customer-present checkout.
 * The stored total is authoritative: the public checkout can never change it.
 */
Deno.serve(async (req: Request) => {
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

    const { data: profile } = await supabaseUser
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    const role = profile?.role;
    if (role !== 'tech' && role !== 'admin') {
      return jsonResponse({ error: 'Only technicians or admins can send payment links' }, 403);
    }

    const body = await req.json();
    const bookingReference = String(body.bookingReference || '').trim();
    if (!bookingReference) {
      return jsonResponse({ error: 'bookingReference is required' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('id, reference_code, status, mechanic_id, customer_phone, hold_amount_cents, payment_status')
      .ilike('reference_code', bookingReference)
      .maybeSingle();

    if (bookingErr || !booking) {
      return jsonResponse({ error: 'Booking not found' }, 404);
    }

    // Only the assigned technician (or an admin) may bill this booking.
    if (role !== 'admin' && booking.mechanic_id && booking.mechanic_id !== user.id) {
      return jsonResponse({ error: 'This job is assigned to another technician' }, 403);
    }
    if (booking.payment_status === 'captured') {
      return jsonResponse({ error: 'This booking is already paid' }, 400);
    }

    const holdCents = booking.hold_amount_cents ?? 8500;

    // Normalize labor/parts line items (same shape as capture-booking-payment).
    const itemsIn: LineItemIn[] = Array.isArray(body.lineItems) ? body.lineItems : [];
    const normalized = itemsIn
      .map((item) => {
        const title = String(item.title || '').trim();
        const laborCents = Math.max(0, Math.round(Number(item.laborDollars || 0) * 100));
        const partsCents = Math.max(0, Math.round(Number(item.partsDollars || 0) * 100));
        if (!title || laborCents + partsCents <= 0) return null;
        return { title, labor_cents: laborCents, parts_cents: partsCents, notes: String(item.notes || '').trim() };
      })
      .filter(Boolean) as Array<{ title: string; labor_cents: number; parts_cents: number; notes: string }>;

    if (normalized.length === 0) {
      return jsonResponse({ error: 'Add at least one labor/parts line item before sending a payment link' }, 400);
    }

    const shouldApplyDiagHold = body.includeDiagnosticFee !== false && body.waiveDiagnosticFee !== true;
    const repairsCents = normalized.reduce((sum, i) => sum + i.labor_cents + i.parts_cents, 0);

    // Sales tax and parts totals mirror capture-booking-payment so the tech share
    // is split correctly at charge time.
    let salesTaxCents = Math.max(0, Math.round(Number(body.salesTaxDollars || 0) * 100));
    const partsPurchasedBy: 'tech' | 'company' = body.partsPurchasedBy === 'company' ? 'company' : 'tech';
    const partsCents = normalized.reduce((sum, i) => sum + i.parts_cents, 0);

    const totalChargeCents = (shouldApplyDiagHold ? holdCents : 0) + repairsCents;
    if (totalChargeCents < 50) {
      return jsonResponse({ error: 'Total must be at least $0.50 to send a payment link' }, 400);
    }
    if (salesTaxCents > totalChargeCents) salesTaxCents = totalChargeCents;

    const lineItemsForStore = shouldApplyDiagHold
      ? [
          { title: 'Mobile diagnostic visit', labor_cents: holdCents, parts_cents: 0, notes: 'Diagnostic hold applied toward this visit' },
          ...normalized,
        ]
      : normalized;

    const { error: updateErr } = await supabase
      .from('bookings')
      .update({
        payment_link_status: 'sent',
        payment_link_total_cents: totalChargeCents,
        payment_link_tax_cents: salesTaxCents,
        payment_link_parts_cents: partsCents,
        payment_link_parts_by: partsPurchasedBy,
        payment_link_line_items: lineItemsForStore,
        payment_link_created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking.id);

    if (updateErr) {
      return jsonResponse({ error: updateErr.message || 'Could not save payment link' }, 500);
    }

    const appBase = (
      Deno.env.get('PUBLIC_APP_URL') ||
      Deno.env.get('APP_URL') ||
      'https://adaptivityperformance.com'
    ).replace(/\/$/, '');
    const url = `${appBase}/pay/${encodeURIComponent(booking.reference_code)}`;

    // Text the customer their pay link. SMS is best-effort — the link is still
    // returned so the tech can share it another way if texting is unavailable.
    let smsSent = false;
    let smsError: string | null = null;
    if (booking.customer_phone) {
      const totalDollars = (totalChargeCents / 100).toFixed(2);
      const sms = await sendTwilioSms(
        String(booking.customer_phone),
        `Adaptivity Performance: your service total is $${totalDollars}. Pay securely (card or financing): ${url}`
      );
      smsSent = sms.sent === true;
      smsError = sms.error ?? sms.skipped ?? null;
    } else {
      smsError = 'No customer phone on file';
    }

    return jsonResponse({
      ok: true,
      url,
      totalDollars: totalChargeCents / 100,
      smsSent,
      smsError,
    });
  } catch (err) {
    console.error('[create-booking-payment-link]', err);
    return jsonResponse({ error: err instanceof Error ? err.message : 'Could not create payment link' }, 500);
  }
});
