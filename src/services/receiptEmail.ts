import type { ReceiptData } from './receiptPdf';

/** Open device mail client with a plain-text receipt (server email deferred). */
export function openReceiptEmail(data: ReceiptData & { toEmail?: string }) {
  const lines = [
    'ADAPTIVITY PERFORMANCE — Service receipt',
    `Booking: ${data.referenceCode}`,
    `Date: ${data.dateLabel}`,
    `Customer: ${data.customerName}`,
    `Vehicle: ${data.vehicle}`,
    data.address ? `Address: ${data.address}` : '',
    `Payment: ${data.paymentStatus}`,
    '',
    'Services:',
    ...data.services.map((s) => `• ${s}`),
    '',
    `Total: $${data.totalDollars.toFixed(2)}`,
    '',
    'Thank you for choosing Adaptivity Performance.',
    'Questions: (214) 620-3244',
  ].filter(Boolean);

  const subject = encodeURIComponent(`Receipt ${data.referenceCode} — Adaptivity Performance`);
  const body = encodeURIComponent(lines.join('\n'));
  const to = data.toEmail ? encodeURIComponent(data.toEmail) : '';
  window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
}
