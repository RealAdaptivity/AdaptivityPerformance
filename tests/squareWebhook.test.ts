import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  completedRefundCents,
  jobReferenceForPayment,
  jobReferenceIn,
  openSquareSales,
  paymentStatusAfterRefunds,
  squareSignature,
  verifySquareSignature,
} from '../supabase/functions/_shared/squareWebhook.ts';

const URL_ = 'https://qqyairzymqpkbfxobztx.supabase.co/functions/v1/square-webhook';
const BODY = '{"merchant_id":"M1","type":"refund.updated","event_id":"e1"}';

test('the signature is Square’s: base64 HMAC-SHA256 of URL + body', async () => {
  const want = createHmac('sha256', 'sig-key').update(URL_ + BODY).digest('base64');
  assert.equal(await squareSignature('sig-key', URL_, BODY), want);
  assert.ok(await verifySquareSignature('sig-key', URL_, BODY, want));
  assert.ok(await verifySquareSignature('sig-key', URL_, BODY, ` ${want} `), 'surrounding spaces');
});

test('a forged, altered or missing signature is refused', async () => {
  const good = await squareSignature('sig-key', URL_, BODY);
  assert.ok(!(await verifySquareSignature('other-key', URL_, BODY, good)));
  assert.ok(!(await verifySquareSignature('sig-key', URL_, BODY.replace('e1', 'e2'), good)));
  assert.ok(!(await verifySquareSignature('sig-key', URL_ + '/', BODY, good)), 'the URL is signed too');
  assert.ok(!(await verifySquareSignature('sig-key', URL_, BODY, null)));
  assert.ok(!(await verifySquareSignature('', URL_, BODY, good)), 'no key set');
});

test('the job is found from the reference or the Point of Sale note', () => {
  assert.equal(jobReferenceIn('Job AP-XBDZBD9X'), 'AP-XBDZBD9X');
  assert.equal(jobReferenceIn('job ap-3tk8hd86 brakes'), 'AP-3TK8HD86');
  assert.equal(jobReferenceIn('Oil change'), null);
  assert.equal(jobReferenceIn(undefined), null);
  assert.equal(jobReferenceForPayment({ id: 'p', reference_id: 'AP-M2MTSS60', note: 'Job AP-OTHER123' }), 'AP-M2MTSS60');
  assert.equal(jobReferenceForPayment({ id: 'p', note: 'Job AP-OTHER123' }), 'AP-OTHER123');
});

test('refunds: only completed ones, each once', () => {
  assert.equal(
    completedRefundCents([
      { id: 'r1', status: 'COMPLETED', amount_cents: 2000 },
      { id: 'r1', status: 'COMPLETED', amount_cents: 2000 },
      { id: 'r2', status: 'PENDING', amount_cents: 5000 },
      { id: 'r3', status: 'FAILED', amount_cents: 700 },
      { id: 'r4', status: 'COMPLETED', amount_cents: 1000 },
    ]),
    3000
  );
  assert.equal(paymentStatusAfterRefunds(12000, 0), 'paid_in_person');
  assert.equal(paymentStatusAfterRefunds(12000, 3000), 'partially_refunded');
  assert.equal(paymentStatusAfterRefunds(12000, 12000), 'refunded');
});

test('open sales: completed, ours, recent, unused, newest first', () => {
  const now = Date.parse('2026-10-08T18:00:00Z');
  const sale = (id: string, over: Record<string, unknown> = {}) => ({
    id,
    status: 'COMPLETED',
    location_id: 'L1',
    created_at: '2026-10-08T17:00:00Z',
    amount_money: { amount: 12990, currency: 'USD' },
    card_details: { card: { card_brand: 'VISA', last_4: '4242' } },
    ...over,
  });
  const out = openSquareSales(
    [
      sale('old', { created_at: '2026-10-08T03:00:00Z' }),
      sale('pending', { status: 'APPROVED' }),
      sale('elsewhere', { location_id: 'L2' }),
      sale('used'),
      sale('newer', { created_at: '2026-10-08T17:30:00Z', note: ' Brakes ' }),
      sale('ok'),
    ],
    { locationId: 'L1', attachedIds: new Set(['used']), now }
  );
  assert.deepEqual(out.map((s) => s.id), ['newer', 'ok']);
  assert.deepEqual(out[0], {
    id: 'newer',
    amountCents: 12990,
    createdAt: '2026-10-08T17:30:00Z',
    cardBrand: 'VISA',
    cardLast4: '4242',
    note: 'Brakes',
  });
});
