import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildReceiptEmailHtml,
  buildReceiptEmailText,
  buildReceiptSms,
  money,
  receiptDate,
  receiptRows,
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
  assert.match(text, /Total paid in person: \$457\.50/);
});
