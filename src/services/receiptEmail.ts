import type { ReceiptData } from './receiptPdf';
import { SITE_PHONE_DISPLAY } from '../site/seo';

/** Open device mail client with a plain-text receipt (server email deferred). */
export function openReceiptEmail(data: ReceiptData & { toEmail?: string }) {
  const itemLines =
    data.lineItems && data.lineItems.length > 0
      ? data.lineItems.map((l) => {
          const labor = l.laborDollars ?? 0;
          const parts = l.partsDollars ?? 0;
          const amount = l.amountDollars ?? labor + parts;
          const detail =
            labor > 0 || parts > 0
              ? ` (labor $${labor.toFixed(2)}${parts > 0 ? ` + parts $${parts.toFixed(2)}` : ''})`
              : '';
          return `• ${l.title}${amount > 0 ? `: $${amount.toFixed(2)}` : ''}${detail}`;
        })
      : data.services.map((s) => `• ${s}`);

  const lines = [
    'ADAPTIVITY PERFORMANCE — Service receipt',
    `Booking: ${data.referenceCode}`,
    `Date: ${data.dateLabel}`,
    `Customer: ${data.customerName}`,
    `Vehicle: ${data.vehicle}`,
    data.address ? `Address: ${data.address}` : '',
    `Payment: ${data.paymentStatus}`,
    '',
    'Charges:',
    ...itemLines,
    '',
    data.diagnosticDollars != null ? `Diagnostic: $${data.diagnosticDollars.toFixed(2)}` : '',
    data.repairsDollars != null && data.repairsDollars > 0
      ? `Repairs: $${data.repairsDollars.toFixed(2)}`
      : '',
    `Total: $${data.totalDollars.toFixed(2)}`,
    data.techNotes?.trim() ? `\nTechnician notes: ${data.techNotes.trim()}` : '',
    '',
    '12-Month / 12,000-Mile warranty on Adaptivity parts & labor.',
    'Thank you for choosing Adaptivity Performance.',
    `Questions: ${SITE_PHONE_DISPLAY} · adaptivityperformance.com`,
  ].filter(Boolean);

  const subject = encodeURIComponent(`Receipt ${data.referenceCode} — Adaptivity Performance`);
  const body = encodeURIComponent(lines.join('\n'));
  const to = data.toEmail ? encodeURIComponent(data.toEmail) : '';
  window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
}
