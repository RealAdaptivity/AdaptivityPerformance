import type { ReceiptData } from './receiptPdf';
import { SITE_PHONE_DISPLAY } from '../site/seo';

/** Open device mail client with a plain-text receipt (server email deferred). */
export function openReceiptEmail(data: ReceiptData & { toEmail?: string }) {
  const hasLines = Boolean(data.lineItems?.some((l) => l.title.trim()));
  const itemLines = hasLines
    ? (data.lineItems || []).map((l) => {
        const labor = Number(l.laborDollars) || 0;
        const parts = Number(l.partsDollars) || 0;
        const amount = Number(l.amountDollars ?? labor + parts) || 0;
        return `• ${l.title}\n    Labor $${labor.toFixed(2)}  |  Parts $${parts.toFixed(2)}  |  Amount $${amount.toFixed(2)}`;
      })
    : [
        ...data.services.map((s) => `• ${s}`),
        `• Total charged: $${data.totalDollars.toFixed(2)} (itemized labor/parts not stored on this job)`,
      ];

  let laborTotal = 0;
  let partsTotal = 0;
  for (const l of data.lineItems || []) {
    laborTotal += Number(l.laborDollars) || 0;
    partsTotal += Number(l.partsDollars) || 0;
  }

  const lines = [
    'ADAPTIVITY PERFORMANCE — Service receipt',
    `Booking: ${data.referenceCode}`,
    `Date: ${data.dateLabel}`,
    `Customer: ${data.customerName}`,
    `Vehicle: ${data.vehicle}`,
    data.address ? `Address: ${data.address}` : '',
    `Payment: ${data.paymentStatus}`,
    '',
    'Itemized charges:',
    ...itemLines,
    '',
    hasLines ? `Labor total: $${laborTotal.toFixed(2)}` : '',
    hasLines ? `Parts total: $${partsTotal.toFixed(2)}` : '',
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
