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

test('the worked example: $457.50, $361.50 to the tech', () => {
  const c = computeCloseOut({
    kind: 'charge',
    lines: [{ title: 'Front pads & rotors', labor: '180', parts: '145.50' }],
    diagnosticCents: 10000,
    travelCents: 2000,
    weatherCents: 0,
    taxMode: 'parts',
    partsBy: 'tech',
  });
  assert.equal(c.laborCents, 18000);
  assert.equal(c.partsCents, 14550);
  assert.equal(c.taxCents, 1200);
  assert.equal(c.totalCents, 45750);
  // 70% of diagnostic + labor ($280 → $196), plus the $20 travel fee and the
  // $145.50 of parts in full.
  assert.equal(c.techPayoutCents, 36150);
});

test('the diagnostic and travel count once, and tax is never counted twice', () => {
  // The old close-out left the diagnostic out of the saved total and added tax
  // both as a line and as tax. Every part is counted exactly once here.
  const c = computeCloseOut({
    kind: 'charge',
    lines: [{ title: 'Battery', labor: '40', parts: '200' }],
    diagnosticCents: 10000,
    travelCents: 2000,
    weatherCents: 0,
    taxMode: 'parts',
    partsBy: 'company',
  });
  assert.equal(c.totalCents, 10000 + 2000 + 4000 + 20000 + 1650);
  assert.equal(c.techPayoutCents, Math.floor((14000 * 70 + 50) / 100) + 2000);
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
    weatherCents: 0,
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
    weatherCents: 0,
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
    weatherCents: 0,
    taxMode: 'total',
    partsBy: 'tech',
  });
  assert.equal(c.totalCents, 0);
  assert.equal(closeOutProblem(c, false), null);
});

test('a paid job cannot close unsigned or at $0', () => {
  const base = { lines: [], diagnosticCents: 10000, travelCents: 2000,
    weatherCents: 0, taxMode: 'parts' as const, partsBy: 'tech' as const };
  assert.match(closeOutProblem(computeCloseOut({ ...base, kind: 'diagnostic_only' }), false) ?? '', /sign/);
  assert.equal(closeOutProblem(computeCloseOut({ ...base, kind: 'diagnostic_only' }), true), null);
  assert.match(
    closeOutProblem(computeCloseOut({ ...base, kind: 'charge', diagnosticCents: 0, travelCents: 0 }), true) ?? '',
    /Enter/
  );
});

test('the database close-out uses the same tax rate and tech share', () => {
  // The newest migration that defines record_job_payment is the one in force.
  const file = readdirSync('supabase/migrations')
    .sort()
    .filter((f) => readFileSync(`supabase/migrations/${f}`, 'utf8').includes('function public.record_job_payment'))
    .pop();
  assert.ok(file, 'record_job_payment migration missing');
  const sql = readFileSync(`supabase/migrations/${file}`, 'utf8');
  assert.match(sql, new RegExp(`\\* ${SALES_TAX_BASIS_POINTS} \\+ 5000\\) / 10000`));
  assert.match(sql, new RegExp(`\\* ${TECH_LABOR_SHARE_PERCENT} \\+ 50\\) / 100`));
});

test('the weather fee is added, taxed with the ticket and shared like labor', () => {
  const base = {
    kind: 'charge' as const,
    lines: [{ title: 'Battery', labor: '40', parts: '200' }],
    diagnosticCents: 0,
    travelCents: 2000,
    partsBy: 'tech' as const,
  };
  const dry = computeCloseOut({ ...base, weatherCents: 0, taxMode: 'parts' });
  const wet = computeCloseOut({ ...base, weatherCents: 3000, taxMode: 'parts' });
  assert.equal(wet.weatherCents, 3000);
  assert.equal(wet.taxCents, dry.taxCents, 'tax on parts ignores the weather fee');
  assert.equal(wet.totalCents, dry.totalCents + 3000);
  assert.equal(wet.techPayoutCents, Math.floor(((3000 + 4000) * 70 + 50) / 100) + 2000 + 20000);
  const wetTotal = computeCloseOut({ ...base, weatherCents: 3000, taxMode: 'total' });
  assert.equal(wetTotal.taxCents, taxOn(2000 + 3000 + 4000 + 20000));
});

test('the travel (service) fee goes to the tech in full', () => {
  const base = {
    kind: 'diagnostic_only' as const, lines: [], diagnosticCents: 10000, weatherCents: 0, taxMode: 'none' as const, partsBy: 'tech' as const,
  };
  const shop = computeCloseOut({ ...base, travelCents: 0 });
  const mobile = computeCloseOut({ ...base, travelCents: 2000 });
  assert.equal(mobile.techPayoutCents - shop.techPayoutCents, 2000);
});

test('a no-show never carries the weather fee', () => {
  const c = computeCloseOut({
    kind: 'no_show', lines: [], diagnosticCents: 10000, travelCents: 2000, weatherCents: 3000, taxMode: 'none', partsBy: 'tech',
  });
  assert.equal(c.weatherCents, 0);
  assert.equal(c.totalCents, 0);
});

test('the database stores and sums the weather fee the same way', () => {
  const file = readdirSync('supabase/migrations')
    .sort()
    .filter((f) => readFileSync(`supabase/migrations/${f}`, 'utf8').includes('function public.record_job_payment'))
    .pop();
  const sql = readFileSync(`supabase/migrations/${file}`, 'utf8');
  assert.match(sql, /v_before_tax := v_diag \+ v_travel \+ v_weather \+ v_labor_total \+ v_parts_total;/);
  assert.match(sql, /\(\(v_diag \+ v_weather \+ v_labor_total\) \* 70 \+ 50\) \/ 100\s*\+ v_travel/);
  // The table check that the total adds up lives in whichever migration last set it.
  const allSql = readdirSync('supabase/migrations')
    .map((f) => readFileSync(`supabase/migrations/${f}`, 'utf8'))
    .join('\n');
  assert.match(allSql, /total_cents = diagnostic_cents \+ travel_cents \+ weather_cents \+ labor_cents \+ parts_cents \+ tax_cents/);
});

test('the close-out tax rate is the site-wide sales tax rate', async () => {
  const salesTax = await import('../src/services/salesTax.ts');
  assert.equal(SALES_TAX_BASIS_POINTS, salesTax.SALES_TAX_BASIS_POINTS);
});

test('the edge functions sum a close-out with the same code as the site', () => {
  // record-square-payment checks a card charge against this total before it
  // closes the job, so its copy must never drift from src/services/closeOut.ts.
  assert.equal(
    readFileSync('supabase/functions/_shared/closeOut.ts', 'utf8'),
    readFileSync('src/services/closeOut.ts', 'utf8')
  );
});
