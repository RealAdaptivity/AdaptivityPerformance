import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse } from './_shared/stripe.ts';

type LineItemIn = {
  title?: string;
  laborDollars?: number;
  partsDollars?: number;
  notes?: string;
};

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

    const { bookingReference, lineItems, techNotes, diagnosticFeeDollars } = await req.json();
    if (!bookingReference?.trim()) {
      return jsonResponse({ error: 'bookingReference is required' }, 400);
    }

    const itemsIn: LineItemIn[] = Array.isArray(lineItems) ? lineItems : [];
    const normalized = itemsIn
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
      return jsonResponse({ error: 'Add at least one recommended repair with a price.' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(
        'id, reference_code, mechanic_id, payment_status, status, quote_status, hold_amount_cents'
      )
      .eq('reference_code', bookingReference.trim())
      .maybeSingle();

    if (bookingError || !booking) {
      return jsonResponse({ error: 'Booking not found' }, 404);
    }
    if (booking.mechanic_id !== user.id) {
      return jsonResponse({ error: 'Only the assigned technician can submit a quote' }, 403);
    }
    if (booking.payment_status !== 'authorized' && booking.payment_status !== 'awaiting_card') {
      return jsonResponse(
        { error: `Cannot quote when payment status is ${booking.payment_status}` },
        400
      );
    }
    if (booking.status === 'COMPLETED' || booking.status === 'CANCELED') {
      return jsonResponse({ error: 'Job is already closed' }, 400);
    }
    if (booking.quote_status === 'quote_pending') {
      return jsonResponse({ error: 'A quote is already waiting for customer approval' }, 400);
    }
    if (booking.quote_status !== 'awaiting_diagnostic' && booking.quote_status !== 'quote_declined') {
      return jsonResponse(
        {
          error:
            booking.quote_status === 'none'
              ? 'This job is a fixed-price direct book — use Complete & capture instead of a quote.'
              : `Cannot submit a quote when status is ${booking.quote_status}`,
        },
        400
      );
    }

    const diagnosticFeeCents =
      diagnosticFeeDollars != null
        ? Math.round(Number(diagnosticFeeDollars) * 100)
        : booking.hold_amount_cents ?? 10000;
    const repairsCents = normalized.reduce((sum, i) => sum + i.labor_cents + i.parts_cents, 0);
    const totalCents = diagnosticFeeCents + repairsCents;

    // Supersede any prior open quotes
    await supabase
      .from('booking_quotes')
      .update({ status: 'superseded', updated_at: new Date().toISOString() })
      .eq('booking_id', booking.id)
      .in('status', ['draft', 'pending']);

    const { data: quote, error: quoteError } = await supabase
      .from('booking_quotes')
      .insert({
        booking_id: booking.id,
        submitted_by: user.id,
        status: 'pending',
        line_items: normalized,
        diagnostic_fee_cents: diagnosticFeeCents,
        repairs_cents: repairsCents,
        total_cents: totalCents,
        tech_notes: typeof techNotes === 'string' ? techNotes.trim() : null,
      })
      .select('id, total_cents, repairs_cents, diagnostic_fee_cents')
      .single();

    if (quoteError || !quote) {
      return jsonResponse({ error: quoteError?.message || 'Could not save quote' }, 500);
    }

    await supabase
      .from('bookings')
      .update({
        quote_status: 'quote_pending',
        active_quote_id: quote.id,
        recommended_total_cents: totalCents,
        status: booking.status === 'UNASSIGNED' || booking.status === 'EN_ROUTE' ? 'ON_SITE' : booking.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking.id);

    return jsonResponse({
      ok: true,
      quoteId: quote.id,
      bookingReference: booking.reference_code,
      diagnosticFeeDollars: diagnosticFeeCents / 100,
      repairsDollars: repairsCents / 100,
      totalDollars: totalCents / 100,
      message: 'Quote sent to the customer for approval. Payment captures after they approve.',
    });
  } catch (err) {
    console.error('[submit-booking-quote]', err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Submit quote failed' },
      500
    );
  }
});
