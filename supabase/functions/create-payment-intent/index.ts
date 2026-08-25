import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse, createOrder } from '../_shared/paypal.ts';
import { splitJobTotalCents } from '../_shared/revenueSplit.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body = await req.json();
    let {
      baseAmountDollars,
      customerEmail,
      customerName,
      bookingReference,
    } = body;
    const { tipAmountDollars = 0 } = body;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Payment-link mode: a customer paying a tech-finalized total from a link.
    // The amount and the destination tech account come from the stored booking —
    // never from the client — so the customer cannot alter what they are charged.
    const paymentLinkReference =
      typeof body.paymentLinkReference === 'string' ? body.paymentLinkReference.trim() : '';
    let isPaymentLink = false;
    let linkTaxCents = 0;
    let linkPartsCents = 0;
    let linkPartsBy: 'tech' | 'company' = 'tech';
    let servicesList: string[] = [];

    if (paymentLinkReference) {
      const { data: b } = await supabase
        .from('bookings')
        .select(
          'reference_code, mechanic_id, customer_name, customer_email, customer_address, services, payment_link_status, payment_link_total_cents, payment_link_tax_cents, payment_link_parts_cents, payment_link_parts_by'
        )
        .ilike('reference_code', paymentLinkReference)
        .maybeSingle();

      if (
        !b ||
        b.payment_link_status !== 'sent' ||
        !b.payment_link_total_cents ||
        Number(b.payment_link_total_cents) <= 0
      ) {
        return jsonResponse({ error: 'This payment link is not available or has already been paid.' }, 404);
      }

      isPaymentLink = true;
      baseAmountDollars = Number(b.payment_link_total_cents) / 100;
      bookingReference = b.reference_code;
      customerEmail = customerEmail || b.customer_email || undefined;
      customerName = b.customer_name || customerName;
      linkTaxCents = Number(b.payment_link_tax_cents) || 0;
      linkPartsCents = Number(b.payment_link_parts_cents) || 0;
      linkPartsBy = b.payment_link_parts_by === 'company' ? 'company' : 'tech';
      servicesList = Array.isArray(b.services) ? (b.services as string[]) : [];

    }

    const base = Number(baseAmountDollars);
    const tip = Number(tipAmountDollars);
    if (!Number.isFinite(base) || base <= 0) {
      return jsonResponse({ error: 'Invalid baseAmountDollars' }, 400);
    }

    const baseCents = Math.round(base * 100);
    const tipCents = Math.round(Math.max(0, tip) * 100);
    const totalCents = baseCents + tipCents;
    const laborSplit = isPaymentLink
      ? splitJobTotalCents(baseCents, linkTaxCents, linkPartsCents, linkPartsBy)
      : splitJobTotalCents(baseCents);
    const platformFeeCents = laborSplit.platformFeeCents;
    const techTransferCents = laborSplit.techTransferCents + tipCents;

    // Card-only. The Stripe version leaned on automatic_payment_methods to
    // surface Affirm / Afterpay / Zip / Sunbit / Klarna, and synthesised a
    // shipping address purely to improve BNPL eligibility. PayPal's card
    // processing has no BNPL equivalent here, so that machinery is gone rather
    // than left in place advertising something checkout cannot do.
    //
    // transfer_data / application_fee_amount are gone with the rest of Connect;
    // the tech's share is accrued to tech_payouts when the payment is confirmed.
    const name =
      typeof customerName === 'string' && customerName.trim() ? customerName.trim() : 'Customer';

    const order = await createOrder({
      intent: 'CAPTURE',
      amountCents: totalCents,
      currency: 'USD',
      invoiceId: bookingReference || undefined,
      description: bookingReference
        ? `Adaptivity Performance — ${bookingReference}`
        : 'Adaptivity Performance service',
      idempotencyKey: `chk-${bookingReference || 'adhoc'}-${totalCents}`,
    });

    let bookingId: string | null = null;
    if (bookingReference) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('id')
        .eq('reference_code', bookingReference)
        .maybeSingle();
      bookingId = booking?.id ?? null;
    }

    // Keyed on the order id: unlike a Stripe PaymentIntent there is no capture
    // until the buyer approves, and confirm-checkout-payment fills the rest in.
    await supabase.from('payments').upsert(
      {
        booking_reference: bookingReference || null,
        booking_id: bookingId,
        processor: 'paypal',
        paypal_order_id: order.orderId,
        customer_email: customerEmail || null,
        amount_cents: totalCents,
        tip_cents: tipCents,
        platform_fee_cents: platformFeeCents,
        tech_transfer_cents: techTransferCents,
        status: 'pending',
        payout_status: 'awaiting_payment',
      },
      { onConflict: 'paypal_order_id' }
    );

    return jsonResponse({
      orderId: order.orderId,
      totalCharged: totalCents / 100,
      baseAmount: baseCents / 100,
      techShareAmount: techTransferCents / 100,
      platformShareAmount: platformFeeCents / 100,
      // Display info for the payment-link checkout page (customer is not logged in).
      ...(isPaymentLink
        ? { customerName: name, services: servicesList, bookingReference }
        : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Payment intent failed';
    return jsonResponse({ error: message }, 500);
  }
});
