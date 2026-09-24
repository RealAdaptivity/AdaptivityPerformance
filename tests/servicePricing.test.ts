import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DIAGNOSTIC_FEE_DOLLARS,
  computeQuoteFromServices,
} from '../supabase/functions/_shared/servicePricing.ts';

test('the diagnostic fee is $100', () => {
  // The number the whole business runs on. verify-production-ops.mjs guards the
  // copies of it scattered through the site copy; this guards the source.
  assert.equal(DIAGNOSTIC_FEE_DOLLARS, 100);
});

test('an empty or junk service list still quotes a diagnostic visit', () => {
  for (const input of [[], null, undefined, 'brakes', 42, [''], ['   ']]) {
    const quote = computeQuoteFromServices(input);
    assert.equal(quote.quotedDollars, 100, `input ${JSON.stringify(input)}`);
    assert.equal(quote.mode, 'diagnostic');
    assert.ok(quote.serviceTitles.length > 0, 'a booking always names something');
  }
});

test('an unrecognised service is carried through, not dropped', () => {
  // The customer typed something the catalog does not know. Losing it would
  // leave the tech arriving with no idea what was asked for.
  const quote = computeQuoteFromServices(['Rebuild the flux capacitor']);
  assert.deepEqual(quote.serviceTitles, ['Rebuild the flux capacitor']);
  assert.equal(quote.quotedDollars, 100);
  assert.equal(quote.mode, 'diagnostic');
});

test('every booking currently routes through the diagnostic', () => {
  // DIRECT_BOOK_KINDS is [], so the 'direct' branch of computeQuoteFromServices
  // is unreachable and no service can be booked at a fixed price. That matches
  // the diagnose-first model — the tech quotes the repair on site — but it does
  // mean the branch is dead code. If this test starts failing, that policy
  // changed, and the confirmation SMS wording should be revisited with it.
  const samples = [
    ['Brake pads & rotors'],
    ['Oil change'],
    ['Alternator replacement'],
    ['Oil change', 'Brake pads & rotors'],
  ];
  for (const services of samples) {
    const quote = computeQuoteFromServices(services);
    assert.equal(quote.mode, 'diagnostic', services.join(' + '));
    assert.equal(quote.quotedDollars, 100, services.join(' + '));
  }
});

test('a quote never comes back negative or fractional', () => {
  for (const services of [[], ['Oil change'], ['nonsense'], ['a', 'b', 'c']]) {
    const { quotedDollars } = computeQuoteFromServices(services);
    assert.ok(quotedDollars > 0, 'a visit is never free');
    assert.equal(Number.isInteger(quotedDollars), true, 'dollars stay whole');
  }
});
