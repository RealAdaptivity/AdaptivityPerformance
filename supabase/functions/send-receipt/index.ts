import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse } from '../_shared/http.ts';
import { sendTwilioSms } from '../_shared/twilioSms.ts';
import { sendEmail } from '../_shared/sendEmail.ts';
import {
  buildReceiptEmailHtml,
  buildReceiptEmailText,
  buildReceiptSms,
  receiptSubject,
  type ReceiptInput,
} from '../_shared/receiptMessage.ts';

/**
 * send-receipt — texts and/or emails the customer their receipt for a closed
 * job, built from the stored job_payments row.
 *
 * Body: { bookingId, channels: ('sms' | 'email')[], phone?, email? }
 *   phone / email override what the booking has, for a customer who gives a
 *   different one at the car.
 *
 * Only the tech on the job or an admin may send. Each channel reports
 * 'sent', 'skipped' (that provider's secrets are not set) or 'failed', and the
 * receipt text comes back either way so the tech's phone can send it instead.
 */

type ChannelResult = { status: 'sent' | 'skipped' | 'failed'; detail?: string; to?: string };

const BUSINESS_PHONE = '(940) 304-0620';

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401);
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const bookingId = typeof body.bookingId === 'string' ? body.bookingId.trim() : '';
    const channels: string[] = Array.isArray(body.channels) ? body.channels : [];
    const wantSms = channels.includes('sms');
    const wantEmail = channels.includes('email');
    if (!bookingId || (!wantSms && !wantEmail)) {
      return jsonResponse({ error: 'bookingId and at least one channel are required' }, 400);
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const [{ data: profile }, { data: booking }, { data: payment }] = await Promise.all([
      admin.from('profiles').select('role').eq('id', user.id).maybeSingle(),
      admin
        .from('bookings')
        .select('id, reference_code, customer_name, customer_phone, customer_email, vehicle_description, mechanic_id')
        .eq('id', bookingId)
        .maybeSingle(),
      admin.from('job_payments').select('*').eq('booking_id', bookingId).maybeSingle(),
    ]);
    if (!booking) return jsonResponse({ error: 'Job not found' }, 404);
    if (!(profile?.role === 'admin' || booking.mechanic_id === user.id)) {
      return jsonResponse({ error: 'Only the tech on this job can send its receipt' }, 403);
    }
    if (!payment) return jsonResponse({ error: 'Close the job before sending a receipt' }, 409);
    if (payment.kind === 'no_show') return jsonResponse({ error: 'A no-show has no receipt' }, 409);

    const siteUrl = (Deno.env.get('ADAPTIVITY_SITE_URL')?.trim() || 'https://adaptivityperformance.com').replace(/\/$/, '');
    const receipt: ReceiptInput = {
      referenceCode: booking.reference_code,
      customerName: booking.customer_name || 'Customer',
      vehicle: booking.vehicle_description || '',
      kind: payment.kind,
      lineItems: Array.isArray(payment.line_items) ? payment.line_items : [],
      diagnosticCents: payment.diagnostic_cents,
      travelCents: payment.travel_cents,
      taxCents: payment.tax_cents,
      taxMode: payment.tax_mode,
      totalCents: payment.total_cents,
      signerName: payment.signer_name,
      paidAt: payment.created_at,
      techNotes: payment.tech_notes,
      businessPhone: BUSINESS_PHONE,
      siteUrl,
    };
    const smsBody = buildReceiptSms(receipt);
    const subject = receiptSubject(receipt);
    const emailText = buildReceiptEmailText(receipt);

    const phone = (typeof body.phone === 'string' && body.phone.trim()) || booking.customer_phone || '';
    const email = (typeof body.email === 'string' && body.email.trim()) || booking.customer_email || '';
    const now = new Date().toISOString();
    const result: { sms?: ChannelResult; email?: ChannelResult } = {};

    if (wantSms) {
      if (!phone) {
        result.sms = { status: 'failed', detail: 'No phone number for this customer' };
      } else {
        const r = await sendTwilioSms(phone, smsBody);
        result.sms = r.sent
          ? { status: 'sent', to: phone }
          : r.skipped
            ? { status: 'skipped', detail: r.skipped, to: phone }
            : { status: 'failed', detail: r.error, to: phone };
        if (r.sent) await admin.from('job_payments').update({ receipt_texted_at: now }).eq('booking_id', bookingId);
      }
    }

    if (wantEmail) {
      if (!email) {
        result.email = { status: 'failed', detail: 'No email address for this customer' };
      } else {
        const r = await sendEmail({ to: email, subject, html: buildReceiptEmailHtml(receipt), text: emailText });
        result.email = r.sent
          ? { status: 'sent', to: email }
          : r.skipped
            ? { status: 'skipped', detail: r.skipped, to: email }
            : { status: 'failed', detail: r.error, to: email };
        if (r.sent) {
          await Promise.all([
            admin.from('job_payments').update({ receipt_emailed_at: now }).eq('booking_id', bookingId),
            admin.from('bookings').update({ receipt_emailed_at: now }).eq('id', bookingId),
          ]);
          // Keep the address the customer gave at the car for next time.
          if (!booking.customer_email && typeof body.email === 'string' && body.email.trim()) {
            await admin.from('bookings').update({ customer_email: email }).eq('id', bookingId);
          }
        }
      }
    }

    return jsonResponse({ ...result, smsBody, subject, emailText });
  } catch (error) {
    console.error('[send-receipt]', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Could not send the receipt' }, 500);
  }
});
