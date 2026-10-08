/** The receipt a customer gets after paying in person, as a text, an email
 *  and the printable invoice. Built from the stored job_payments row, never
 *  from numbers the browser sends, so all three always match what was
 *  recorded.
 *
 *  No imports, so tests/receiptMessage.test.ts can load it with node. The
 *  website's invoice uses an identical copy (src/services/receiptMessage.ts;
 *  the test keeps them the same).
 */

/** Who issues the invoice. Must match src/content/businessIdentity.ts (the
 *  test checks); this file stays import-free so the edge functions can load it. */
export const BUSINESS = {
  legalName: 'RealAdaptivity LLC DBA AdaptivityPerformance',
  address: '410 FM 156, Justin, TX 76247',
  email: 'hello@adaptivityperformance.com',
} as const;

export type PaymentMethod = 'card' | 'cash' | 'zelle' | 'in_person';

export type PaymentDetails = {
  method: PaymentMethod;
  cardBrand?: string | null;
  cardLast4?: string | null;
};

export type ReceiptLine = { title: string; labor_cents: number; parts_cents: number };

export type ReceiptInput = {
  referenceCode: string;
  customerName: string;
  vehicle: string;
  kind: 'charge' | 'diagnostic_only' | 'no_show';
  lineItems: ReceiptLine[];
  diagnosticCents: number;
  travelCents: number;
  weatherCents: number;
  /** First responder discount off labor; shown as a negative line. */
  discountCents?: number;
  /** Parts pickup fee (10% of parts), when the tech went to get them. */
  partsPickupCents?: number;
  taxCents: number;
  taxMode: 'parts' | 'total' | 'none';
  totalCents: number;
  signerName: string | null;
  /** When the job was closed: ISO timestamp. */
  paidAt: string;
  techNotes?: string | null;
  businessPhone: string;
  siteUrl: string;
  vin?: string | null;
  techName?: string | null;
  /** How it was paid; omitted on receipts made before this was recorded. */
  payment?: PaymentDetails | null;
  /** Refunded through Square since, in cents. */
  refundedCents?: number;
};

const CARD_BRANDS: Record<string, string> = {
  VISA: 'Visa',
  MASTERCARD: 'Mastercard',
  AMERICAN_EXPRESS: 'American Express',
  DISCOVER: 'Discover',
  DISCOVER_DINERS: 'Diners Club',
  JCB: 'JCB',
  CHINA_UNIONPAY: 'UnionPay',
  INTERAC: 'Interac',
  EFTPOS: 'EFTPOS',
  FELICA: 'FeliCa',
  SQUARE_GIFT_CARD: 'Square gift card',
};

/** "Visa ending 4242", "Card", "Zelle", "Cash" or "In person". */
export function paymentMethodText(p: PaymentDetails | null | undefined): string {
  if (!p) return 'In person';
  if (p.method === 'card') {
    const raw = (p.cardBrand ?? '').trim().toUpperCase();
    const brand = raw ? CARD_BRANDS[raw] ?? raw.charAt(0) + raw.slice(1).toLowerCase().replace(/_/g, ' ') : 'Card';
    const last4 = (p.cardLast4 ?? '').replace(/\D/g, '').slice(-4);
    return last4 ? `${brand} ending ${last4}` : brand;
  }
  if (p.method === 'zelle') return 'Zelle';
  if (p.method === 'cash') return 'Cash';
  return 'In person';
}

/** Parts and labor we supply are covered 12 months from the day it was paid:
 *  'Sep 30, 2027' (Texas date). */
export function warrantyUntil(paidAt: string): string {
  const d = new Date(paidAt);
  if (Number.isNaN(d.getTime())) return '';
  const [y, m, day] = d
    .toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    .split('-')
    .map(Number);
  // Feb 29 has no twin next year; the warranty runs to Feb 28.
  const end = new Date(Date.UTC(y + 1, m - 1, Math.min(day, m === 2 ? 28 : day)));
  return end.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });
}

export function money(cents: number): string {
  const abs = Math.abs(Math.round(cents));
  const sign = Math.round(cents) < 0 ? '-' : '';
  return `${sign}$${Math.floor(abs / 100).toLocaleString('en-US')}.${String(abs % 100).padStart(2, '0')}`;
}

/** 'Sep 30, 2026' in Texas time, whatever zone the server runs in. */
export function receiptDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric' });
}

type Row = { label: string; detail?: string; cents: number; laborCents?: number; partsCents?: number; isTax?: boolean };

/** Everything before tax, in the order a customer reads it: the invoice's
 *  table. Zero rows drop out. */
export function receiptChargeRows(r: ReceiptInput): Row[] {
  return receiptRows(r).filter((x) => !x.isTax);
}

/** Before tax; with the tax row this is the total. */
export function receiptSubtotalCents(r: ReceiptInput): number {
  return r.totalCents - Math.max(0, r.taxCents);
}

export function taxLabel(r: Pick<ReceiptInput, 'taxMode' | 'partsPickupCents'>): string {
  if (r.taxMode !== 'parts') return 'Sales tax 8.25%';
  return `Sales tax 8.25% on parts${(r.partsPickupCents ?? 0) > 0 ? ' & pickup' : ''}`;
}

/** Every charge on the receipt in the order a customer reads it. Zero rows drop out. */
export function receiptRows(r: ReceiptInput): Row[] {
  const rows: Row[] = [];
  if (r.diagnosticCents > 0) rows.push({ label: 'Diagnostic', cents: r.diagnosticCents });
  for (const l of r.lineItems) {
    const parts = [
      l.labor_cents > 0 ? `Labor ${money(l.labor_cents)}` : '',
      l.parts_cents > 0 ? `Parts ${money(l.parts_cents)}` : '',
    ].filter(Boolean);
    rows.push({
      label: l.title,
      detail: parts.length > 1 ? parts.join(' · ') : undefined,
      cents: l.labor_cents + l.parts_cents,
      laborCents: l.labor_cents,
      partsCents: l.parts_cents,
    });
  }
  if (r.travelCents > 0) rows.push({ label: 'Travel', cents: r.travelCents });
  if ((r.partsPickupCents ?? 0) > 0) rows.push({ label: 'Parts pickup (10% of parts)', cents: r.partsPickupCents ?? 0 });
  if (r.weatherCents > 0) rows.push({ label: 'Severe weather fee', cents: r.weatherCents });
  if ((r.discountCents ?? 0) > 0) rows.push({ label: 'First responder discount (5% off labor)', cents: -(r.discountCents ?? 0) });
  if (r.taxCents > 0) rows.push({ label: taxLabel(r), cents: r.taxCents, isTax: true });
  return rows;
}

/** "paid by Visa ending 4242", or "paid in person" when the method is not known. */
function paidHow(r: ReceiptInput): string {
  const how = paymentMethodText(r.payment);
  return how === 'In person' ? 'paid in person' : `paid by ${how}`;
}

/** The warranty in one sentence, with its end date. Only repairs carry one. */
export function warrantyLine(r: ReceiptInput): string {
  if (r.kind !== 'charge') return '';
  const until = warrantyUntil(r.paidAt);
  return `Parts and labor we supply are under warranty for 12 months or 12,000 miles${until ? ` (through ${until})` : ''}, whichever comes first. Customer-supplied parts are not covered.`;
}

/** Short enough for three SMS segments on a typical job; the full itemization
 *  is in the email. */
export function buildReceiptSms(r: ReceiptInput): string {
  const first = r.customerName.trim().split(/\s+/)[0] || 'there';
  const date = receiptDate(r.paidAt);
  const rows = receiptRows(r).map((x) => `${x.label} ${money(x.cents)}`);
  return [
    `Adaptivity Performance receipt ${r.referenceCode}`,
    `Hi ${first}, thanks — ${money(r.totalCents)} ${paidHow(r)}${date ? ` ${date}` : ''}.`,
    rows.join(' · '),
    r.kind === 'charge' ? 'Repairs carry our 12-month / 12,000-mile warranty.' : '',
    `Questions: ${r.businessPhone}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function receiptSubject(r: ReceiptInput): string {
  return `Your invoice ${r.referenceCode} — Adaptivity Performance`;
}

export function buildReceiptEmailText(r: ReceiptInput): string {
  const rows = receiptChargeRows(r).map((x) => `  ${x.label}${x.detail ? ` (${x.detail})` : ''}: ${money(x.cents)}`);
  const refunded = Math.max(0, r.refundedCents ?? 0);
  return [
    'ADAPTIVITY PERFORMANCE — Invoice',
    `Invoice ${r.referenceCode} · Paid ${receiptDate(r.paidAt)}`,
    `Customer: ${r.customerName}`,
    `Vehicle: ${r.vehicle}`,
    r.vin ? `VIN: ${r.vin}` : '',
    r.techName ? `Technician: ${r.techName}` : '',
    '',
    ...rows,
    r.taxCents > 0 ? `  Subtotal: ${money(receiptSubtotalCents(r))}` : '',
    r.taxCents > 0 ? `  ${taxLabel(r)}: ${money(r.taxCents)}` : '',
    `  Total: ${money(r.totalCents)}`,
    `  Paid: ${paymentMethodText(r.payment)}`,
    refunded > 0 ? `  Refunded: -${money(refunded)}` : '',
    '',
    r.signerName ? `Approved and signed by ${r.signerName}.` : '',
    r.techNotes?.trim() ? `Technician notes: ${r.techNotes.trim()}` : '',
    warrantyLine(r),
    '',
    `Questions? Call ${r.businessPhone} · ${r.siteUrl}`,
    `${BUSINESS.legalName} · ${BUSINESS.address}`,
  ]
    .filter((l, i, all) => l !== '' || (all[i - 1] ?? '') !== '')
    .join('\n');
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function buildReceiptEmailHtml(r: ReceiptInput): string {
  const cell = 'padding:10px 0;border-bottom:1px dashed #d4d4d8';
  const rows = receiptChargeRows(r)
    .map(
      (x) => `<tr><td style="${cell}">
<div style="font-weight:600">${esc(x.label)}</div>${x.detail ? `<div style="font-size:12px;color:#71717a">${esc(x.detail)}</div>` : ''}</td>
<td style="${cell};text-align:right;font-weight:600;white-space:nowrap">${money(x.cents)}</td></tr>`
    )
    .join('');
  const small = (label: string, value: string) =>
    `<tr><td style="padding:8px 0 0;color:#52525b">${esc(label)}</td><td style="padding:8px 0 0;text-align:right;white-space:nowrap">${esc(value)}</td></tr>`;
  const refunded = Math.max(0, r.refundedCents ?? 0);
  const site = r.siteUrl.replace(/\/$/, '');
  const warranty = warrantyLine(r);
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
<div style="max-width:520px;margin:0 auto;padding:24px 16px">
<div style="background:#ffffff;border-radius:16px;padding:24px">
<table role="presentation" style="width:100%;border-collapse:collapse"><tr>
<td style="vertical-align:middle"><img src="${esc(site)}/logo-128.png" width="44" height="44" alt="" style="display:block;border-radius:10px"></td>
<td style="vertical-align:middle;padding-left:12px"><div style="font-size:17px;font-weight:700">Adaptivity Performance</div>
<div style="font-size:12px;color:#71717a">Mobile auto repair · Justin, TX</div></td>
<td style="vertical-align:middle;text-align:right">${refunded > 0 && refunded >= r.totalCents ? '<span style="display:inline-block;background:#fef3c7;color:#92400e;font-weight:700;font-size:12px;letter-spacing:.06em;padding:4px 10px;border-radius:999px">REFUNDED</span>' : '<span style="display:inline-block;background:#dcfce7;color:#166534;font-weight:700;font-size:12px;letter-spacing:.06em;padding:4px 10px;border-radius:999px">PAID</span>'}</td>
</tr></table>
<div style="font-size:13px;color:#52525b;margin-top:16px">Invoice ${esc(r.referenceCode)} · Paid ${esc(receiptDate(r.paidAt))}</div>
<div style="font-size:14px;margin-top:12px">${esc(r.customerName)}<br><span style="color:#52525b">${esc(r.vehicle)}</span>${r.vin ? `<br><span style="font-size:12px;color:#71717a;font-family:monospace">VIN ${esc(r.vin)}</span>` : ''}${r.techName ? `<br><span style="font-size:12px;color:#71717a">Technician: ${esc(r.techName)}</span>` : ''}</div>
<table role="presentation" style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px">${rows}
${r.taxCents > 0 ? small('Subtotal', money(receiptSubtotalCents(r))) + small(taxLabel(r), money(r.taxCents)) : ''}
<tr><td style="padding:14px 0 0;font-size:16px;font-weight:700">Total</td>
<td style="padding:14px 0 0;text-align:right;font-size:22px;font-weight:700">${money(r.totalCents)}</td></tr>
${small('Paid', paymentMethodText(r.payment))}
${refunded > 0 ? small('Refunded', `-${money(refunded)}`) : ''}
</table>
${r.signerName ? `<p style="font-size:13px;color:#52525b;margin:16px 0 0">Approved and signed by ${esc(r.signerName)}.</p>` : ''}
${r.techNotes?.trim() ? `<p style="font-size:13px;color:#52525b;margin:8px 0 0">Technician notes: ${esc(r.techNotes.trim())}</p>` : ''}
${warranty ? `<p style="font-size:13px;margin:16px 0 0">${esc(warranty)}</p>` : ''}
<p style="margin:20px 0 0"><a href="${esc(site)}/portal" style="display:inline-block;background:#ea580c;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:10px 16px;border-radius:10px">View or print your invoice</a></p>
</div>
<p style="font-size:12px;color:#71717a;text-align:center;margin-top:16px">Questions? Call ${esc(r.businessPhone)} · <a href="${esc(site)}" style="color:#c2410c">${esc(site.replace(/^https?:\/\//, ''))}</a><br>${esc(BUSINESS.legalName)} · ${esc(BUSINESS.address)}</p>
</div></body></html>`;
}
