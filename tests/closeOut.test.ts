import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  SALES_TAX_BASIS_POINTS,
  TECH_LABOR_SHARE_PERCENT,
  closeOutProblem,
  computeCloseOut,
  dollarsToCents,
  formatCents,
  taxOn,
} from '../src/services/closeOut.ts';

test('dollar input becomes exact cents', () => {
  assert.equal(dollarsToCents('145.50'), 14550);
  assert.equal(dollarsToCents('$1,200'), 120000);
  assert.equal(dollarsToCents('0.1'), 10);
  assert.equal(dollarsToCents('.5'), 50);
  assert.equal(dollarsToCents(''), 0);
  assert.equal(dollarsToCents('-5'), 0);
  assert.equal(dollarsToCents('12.345'), 0);
  assert.equal(dollarsToCents('abc'), 0);
});

test('formatting', () => {
  assert.equal(formatCents(45750), '$457.50');
  assert.equal(formatCents(123456789), '$1,234,567.89');
  assert.equal(formatCents(5), '$0.05');
});

test('tax rounds half up to the cent', () => {
  assert.equal(taxOn(14550), 1200); // 1200.375
  assert.equal(taxOn(200), 17); // 16.5 → 17
  assert.equal(taxOn(0), 0);
});

test('the worked example from the design: $457.50, $355.50 to the tech', () => {
  const c = computeCloseOut({
    kind: 'charge',
    lines: [{ title: 'Front pads & rotors', labor: '180', parts: '145.50' }],
    diagnosticCents: 10000,
    travelCents: 2000,
    taxMode: 'parts',
    partsBy: 'tech',
  });
  assert.equal(c.laborCents, 18000);
  assert.equal(c.partsCents, 14550);
  assert.equal(c.taxCents, 1200);
  assert.equal(c.totalCents, 45750);
  assert.equal(c.techPayoutCents, 35550);
});

test('the diagnostic and travel count once, and tax is never counted twice', () => {
  // The old close-out left the diagnostic out of the saved total and added tax
  // both as a line and as tax. Every part is counted exactly once here.
  const c = computeCloseOut({
    kind: 'charge',
    lines: [{ title: 'Battery', labor: '40', parts: '200' }],
    diagnosticCents: 10000,
    travelCents: 2000,
    taxMode: 'parts',
    partsBy: 'company',
  });
  assert.equal(c.totalCents, 10000 + 2000 + 4000 + 20000 + 1650);
  assert.equal(c.techPayoutCents, Math.floor((16000 * 70 + 50) / 100));
});

test('blank lines drop out and untitled ones get a title', () => {
  const c = computeCloseOut({
    kind: 'charge',
    lines: [
      { title: '', labor: '', parts: '' },
      { title: '  ', labor: '50', parts: '' },
      { title: '', labor: '10', parts: '5' },
    ],
    diagnosticCents: 0,
    travelCents: 0,
    taxMode: 'none',
    partsBy: 'tech',
  });
  assert.deepEqual(
    c.lines.map((l) => l.title),
    ['Labor', 'Labor & parts']
  );
});

test('diagnostic only ignores repair lines but keeps travel', () => {
  const c = computeCloseOut({
    kind: 'diagnostic_only',
    lines: [{ title: 'x', labor: '999', parts: '999' }],
    diagnosticCents: 10000,
    travelCents: 2000,
    taxMode: 'parts',
    partsBy: 'tech',
  });
  assert.equal(c.totalCents, 12000);
  assert.equal(c.lines.length, 0);
});

test('a no-show collects nothing and needs no signature', () => {
  const c = computeCloseOut({
    kind: 'no_show',
    lines: [{ title: 'x', labor: '10', parts: '' }],
    diagnosticCents: 10000,
    travelCents: 2000,
    taxMode: 'total',
    partsBy: 'tech',
  });
  assert.equal(c.totalCents, 0);
  assert.equal(closeOutProblem(c, false), null);
});

test('a paid job cannot close unsigned or at $0', () => {
  const base = { lines: [], diagnosticCents: 10000, travelCents: 2000, taxMode: 'parts' as const, partsBy: 'tech' as const };
  assert.match(closeOutProblem(computeCloseOut({ ...base, kind: 'diagnostic_only' }), false) ?? '', /sign/);
  assert.equal(closeOutProblem(computeCloseOut({ ...base, kind: 'diagnostic_only' }), true), null);
  assert.match(
    closeOutProblem(computeCloseOut({ ...base, kind: 'charge', diagnosticCents: 0, travelCents: 0 }), true) ?? '',
    /Enter/
  );
});

test('the database close-out uses the same tax rate and tech share', () => {
  const file = readdirSync('supabase/migrations').find((f) => f.endsWith('_job_payments.sql'));
  assert.ok(file, 'job_payments migration missing');
  const sql = readFileSync(`supabase/migrations/${file}`, 'utf8');
  assert.match(sql, new RegExp(`\\* ${SALES_TAX_BASIS_POINTS} \\+ 5000\\) / 10000`));
  assert.match(sql, new RegExp(`\\* ${TECH_LABOR_SHARE_PERCENT} \\+ 50\\) / 100`));
});

test('the close-out tax rate is the site-wide sales tax rate', async () => {
  const salesTax = await import('../src/services/salesTax.ts');
  assert.equal(SALES_TAX_BASIS_POINTS, salesTax.SALES_TAX_BASIS_POINTS);
});
