/** Charge / receipt SMS helpers (device SMS composer — same pattern as on-the-way). */

import { normalizePhoneForSms } from './onTheWaySms';

export function buildChargeReceiptMessage(opts: {
  customerName?: string;
  referenceCode: string;
  amountDollars: number;
  kind: 'charge' | 'diagnostic_only' | 'no_show';
}): string {
  const first = (opts.customerName || '').trim().split(/\s+/)[0] || 'there';
  const amt = opts.amountDollars.toFixed(2);
  if (opts.kind === 'no_show') {
    return (
      `Hi ${first}, Adaptivity Performance charged $${amt} for a no-show / missed appointment ` +
      `(job ${opts.referenceCode}). Questions? Reply here or contact support.`
    );
  }
  if (opts.kind === 'diagnostic_only') {
    return (
      `Hi ${first}, your Adaptivity diagnostic visit is complete. We charged $${amt} for job ` +
      `${opts.referenceCode} (diagnostic only — no additional repairs). Thank you!`
    );
  }
  return (
    `Hi ${first}, your Adaptivity service is complete. We charged $${amt} for job ` +
    `${opts.referenceCode} as agreed on site. Thank you for choosing Adaptivity Performance!`
  );
}

export function openChargeReceiptSms(opts: {
  phone: string;
  customerName?: string;
  referenceCode: string;
  amountDollars: number;
  kind: 'charge' | 'diagnostic_only' | 'no_show';
}): boolean {
  const to = normalizePhoneForSms(opts.phone);
  if (!to) return false;
  const body = encodeURIComponent(buildChargeReceiptMessage(opts));
  window.location.href = `sms:${to}?body=${body}`;
  return true;
}
