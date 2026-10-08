import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  BUSINESS,
  buildReceiptEmailHtml,
  buildReceiptEmailText,
  buildReceiptSms,
  money,
  receiptDate,
  paymentMethodText,
  receiptChargeRows,
  receiptRows,
  receiptSubtotalCents,
  warrantyLine,
  warrantyUntil,
  type ReceiptInput,
} from '../supabase/functions/_shared/receiptMessage.ts';

const base: ReceiptInput = {
  referenceCode: 'AP-7Q2K',
  customerName: 'Jordan Reyes',
  vehicle: '2016 Ford F-150 Lariat',
  kind: 'charge',
  lineItems: [{ title: 'Front pads & rotors', labor_cents: 18000, parts_cents: 14550 }],
  diagnosticCents: 10000,
  travelCents: 2000,
  weatherCents: 0,
  taxCents: 1200,
  taxMode: 'parts',
  totalCents: 45750,
  signerName: 'Jordan Reyes',
  // 11:30 PM in Texas on Sep 30 is already Oct 1 in UTC.
  paidAt: '2026-10-01T04:30:00Z',
  businessPhone: '(940) 304-0620',
  siteUrl: 'https://adaptivityperformance.com',
};

test('money', () => {
  assert.equal(money(45750), '$457.50');
  assert.equal(money(123456), '$1,234.56');
});

test('the date is the day in Texas, not in UTC', () => {
  assert.equal(receiptDate(base.paidAt), 'Sep 30, 2026');
});

test('rows add up to the total and skip zeros', () => {
  const rows = receiptRows(base);
  assert.deepEqual(rows.map((r) => r.label), ['Diagnostic', 'Front pads & rotors', 'Travel', 'Sales tax 8.25% on parts']);
  assert.equal(rows.reduce((s, r) => s + r.cents, 0), base.totalCents);
  assert.deepEqual(receiptRows({ ...base, diagnosticCents: 0, travelCents: 0 }).map((r) => r.label), [
    'Front pads & rotors',
    'Sales tax 8.25% on parts',
  ]);
});

test('the text receipt names the total, the lines and the warranty', () => {
  const sms = buildReceiptSms(base);
  assert.match(sms, /receipt AP-7Q2K/);
  assert.match(sms, /Hi Jordan, thanks — \$457\.50 paid in person Sep 30, 2026\./);
  assert.match(sms, /Front pads & rotors \$325\.50/);
  assert.match(sms, /Travel \$20\.00/);
  assert.match(sms, /12-month \/ 12,000-mile warranty/);
  assert.ok(sms.length <= 153 * 3, `too long for three segments: ${sms.length}`);
});

test('a diagnostic-only receipt makes no warranty claim', () => {
  const r = { ...base, kind: 'diagnostic_only' as const, lineItems: [], taxCents: 0, totalCents: 12000 };
  assert.doesNotMatch(buildReceiptSms(r), /warranty/);
  assert.doesNotMatch(buildReceiptEmailText(r), /warranty/);
});

test('the email itemizes and escapes what people typed', () => {
  const r = { ...base, lineItems: [{ title: '<b>Pads</b> & rotors', labor_cents: 18000, parts_cents: 14550 }], techNotes: 'Use "OEM" pads' };
  const html = buildReceiptEmailHtml(r);
  assert.match(html, /&lt;b&gt;Pads&lt;\/b&gt; &amp; rotors/);
  assert.match(html, /Labor \$180\.00 · Parts \$145\.50/);
  assert.match(html, /Use &quot;OEM&quot; pads/);
  assert.match(html, /\$457\.50/);
  assert.match(html, /Approved and signed by Jordan Reyes/);
  const text = buildReceiptEmailText(r);
  assert.match(text, /Total: \$457\.50/);
  assert.match(text, /Paid: In person/);
});

test('a weather fee gets its own receipt line after travel', () => {
  const labels = receiptRows({ ...base, weatherCents: 3000 }).map((r) => r.label);
  assert.deepEqual(labels.slice(-3), ['Travel', 'Severe weather fee', 'Sales tax 8.25% on parts']);
});

test('a first responder discount is a negative line after the repairs', () => {
  const rows = receiptRows({ ...base, discountCents: 900 });
  const i = rows.findIndex((r) => r.label === 'First responder discount (5% off labor)');
  assert.ok(i > 0, 'discount row present');
  assert.equal(rows[i].cents, -900);
  assert.equal(money(rows[i].cents), '-$9.00');
  assert.match(buildReceiptSms({ ...base, discountCents: 900 }), /First responder discount \(5% off labor\) -\$9\.00/);
});

test('the website invoice uses the same receipt code as the text and email', () => {
  assert.equal(
    readFileSync('src/services/receiptMessage.ts', 'utf8'),
    readFileSync('supabase/functions/_shared/receiptMessage.ts', 'utf8')
  );
});

test('payment method reads like a person would say it', () => {
  assert.equal(paymentMethodText({ method: 'card', cardBrand: 'VISA', cardLast4: '4242' }), 'Visa ending 4242');
  assert.equal(paymentMethodText({ method: 'card', cardBrand: 'AMERICAN_EXPRESS', cardLast4: '0005' }), 'American Express ending 0005');
  assert.equal(paymentMethodText({ method: 'card', cardBrand: 'NEW_BRAND', cardLast4: null }), 'New brand');
  assert.equal(paymentMethodText({ method: 'card' }), 'Card');
  assert.equal(paymentMethodText({ method: 'zelle' }), 'Zelle');
  assert.equal(paymentMethodText({ method: 'cash' }), 'Cash');
  assert.equal(paymentMethodText(null), 'In person');
});

test('the invoice table is everything before tax, and subtotal + tax is the total', () => {
  const rows = receiptChargeRows(base);
  assert.deepEqual(rows.map((r) => r.label), ['Diagnostic', 'Front pads & rotors', 'Travel']);
  assert.equal(rows[1].laborCents, 18000);
  assert.equal(rows[1].partsCents, 14550);
  assert.equal(rows.reduce((s, r) => s + r.cents, 0), receiptSubtotalCents(base));
  assert.equal(receiptSubtotalCents(base) + base.taxCents, base.totalCents);
  const withDiscount = { ...base, discountCents: 900, totalCents: base.totalCents - 900 };
  assert.equal(receiptChargeRows(withDiscount).reduce((s, r) => s + r.cents, 0), receiptSubtotalCents(withDiscount));
});

test('the warranty runs a year from the Texas pay date and names its end', () => {
  assert.equal(warrantyUntil(base.paidAt), 'Sep 30, 2027');
  assert.equal(warrantyUntil('2028-02-29T18:00:00Z'), 'Feb 28, 2029');
  assert.match(warrantyLine(base), /through Sep 30, 2027/);
  assert.match(warrantyLine(base), /Customer-supplied parts are not covered/);
  assert.equal(warrantyLine({ ...base, kind: 'diagnostic_only' }), '');
});

test('card payments say how they were paid, everywhere', () => {
  const r = { ...base, payment: { method: 'card' as const, cardBrand: 'VISA', cardLast4: '4242' }, vin: '1FTEW1EG5GFA12345', techName: 'Sam' };
  assert.match(buildReceiptSms(r), /\$457\.50 paid by Visa ending 4242 Sep 30, 2026\./);
  const text = buildReceiptEmailText(r);
  assert.match(text, /Paid: Visa ending 4242/);
  assert.match(text, /VIN: 1FTEW1EG5GFA12345/);
  assert.match(text, /Technician: Sam/);
  const html = buildReceiptEmailHtml(r);
  assert.match(html, /Visa ending 4242/);
  assert.match(html, /logo-128\.png/);
  assert.match(html, />PAID</);
  assert.ok(html.includes(BUSINESS.legalName));
});

test('a refund shows on the email', () => {
  const r = { ...base, refundedCents: 2000 };
  assert.match(buildReceiptEmailText(r), /Refunded: -\$20\.00/);
  assert.match(buildReceiptEmailHtml(r), /-\$20\.00/);
});

test('a fully refunded job is not stamped PAID', () => {
  const html = buildReceiptEmailHtml({ ...base, refundedCents: base.totalCents });
  assert.match(html, />REFUNDED</);
  assert.doesNotMatch(html, />PAID</);
});

test('the invoice names the registered entity and address', async () => {
  const identity = await import('../src/content/businessIdentity.ts');
  assert.equal(BUSINESS.legalName, identity.LEGAL_ENTITY_NAME);
  assert.equal(BUSINESS.address, identity.LEGAL_ENTITY_ADDRESS);
});
