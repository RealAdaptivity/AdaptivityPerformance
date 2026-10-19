import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBookingConfirmationEmail,
  buildBookingConfirmationSms,
  formatPreferredDate,
} from '../supabase/functions/_shared/bookingConfirmation.ts';

test('formatPreferredDate does not shift the day backwards', () => {
  // new Date('2026-10-02') is UTC midnight, which is Oct 1 in Texas. Every
  // confirmation would have named the wrong day.
  assert.equal(formatPreferredDate('2026-10-02'), 'Fri Oct 2');
  assert.equal(formatPreferredDate('2026-01-01'), 'Thu Jan 1');
  assert.equal(formatPreferredDate('2026-12-31'), 'Thu Dec 31');
});

test('formatPreferredDate rejects junk rather than inventing a date', () => {
  assert.equal(formatPreferredDate(null), null);
  assert.equal(formatPreferredDate(undefined), null);
  assert.equal(formatPreferredDate(''), null);
  assert.equal(formatPreferredDate('next tuesday'), null);
  assert.equal(formatPreferredDate('10-02-2026'), null);
  // Date rolls this into March 3 instead of failing.
  assert.equal(formatPreferredDate('2026-02-31'), null);
  assert.equal(formatPreferredDate('2026-13-01'), null);
});

test('diagnostic confirmation states the fee and that nothing is charged online', () => {
  const sms = buildBookingConfirmationSms({
    referenceCode: 'AP-6Z2XDPTF',
    services: ['Mobile Diagnostic Visit'],
    quotedDollars: 100,
    quoteMode: 'diagnostic',
    vehicleDescription: '2015 Honda Civic',
    preferredDate: '2026-10-02',
    preferredTimeWindow: '8am-12pm',
    siteUrl: 'https://adaptivityperformance.com',
  });

  assert.match(sms, /AP-6Z2XDPTF/);
  assert.match(sms, /2015 Honda Civic/);
  assert.match(sms, /Fri Oct 2, 8am-12pm/);
  assert.match(sms, /\$100 diagnostic/);
  assert.match(sms, /nothing is charged online/);
  assert.match(sms, /adaptivityperformance\.com/);
});

test('direct confirmation gives an estimate, not a diagnostic fee', () => {
  const sms = buildBookingConfirmationSms({
    referenceCode: 'AP-ABCD1234',
    services: ['Brake pads & rotors'],
    quotedDollars: 340,
    quoteMode: 'direct',
    vehicleDescription: '2018 F-150',
    preferredDate: '2026-10-02',
    preferredTimeWindow: null,
    siteUrl: 'https://adaptivityperformance.com',
  });

  assert.match(sms, /Estimate \$340\./);
  assert.doesNotMatch(sms, /diagnostic/i);
});

test('missing schedule and vehicle degrade to a still-sensible message', () => {
  const sms = buildBookingConfirmationSms({
    referenceCode: 'AP-NOVEHICLE',
    services: [],
    quotedDollars: 100,
    quoteMode: 'diagnostic',
    vehicleDescription: null,
    preferredDate: null,
    preferredTimeWindow: null,
    siteUrl: null,
  });

  assert.match(sms, /^Adaptivity Performance: request AP-NOVEHICLE received\./);
  // No dangling separators where the optional parts were left out.
  assert.doesNotMatch(sms, /\.\s*\./);
  assert.doesNotMatch(sms, /,\s*\./);
  assert.doesNotMatch(sms, /Track it at\s*$/);
});

test('falls back to the service name when no vehicle was given', () => {
  const sms = buildBookingConfirmationSms({
    referenceCode: 'AP-SERVICE1',
    services: ['Alternator replacement'],
    quotedDollars: 100,
    quoteMode: 'diagnostic',
    vehicleDescription: '   ',
    preferredDate: null,
    preferredTimeWindow: null,
    siteUrl: null,
  });

  assert.match(sms, /received for Alternator replacement\./);
});

test('message stays within two SMS segments', () => {
  // Each segment is billed separately. A realistic worst case must not sprawl.
  const sms = buildBookingConfirmationSms({
    referenceCode: 'AP-6Z2XDPTF',
    services: ['Mobile Diagnostic Visit'],
    quotedDollars: 100,
    quoteMode: 'diagnostic',
    vehicleDescription: '2015 Honda Civic EX-L Sedan',
    preferredDate: '2026-10-02',
    preferredTimeWindow: '8am-12pm',
    siteUrl: 'https://adaptivityperformance.com',
  });

  assert.ok(
    sms.length <= 306,
    `confirmation grew to ${sms.length} chars, which bills as 3+ segments:\n${sms}`
  );
});

test('trailing slash on the site URL is not doubled', () => {
  const sms = buildBookingConfirmationSms({
    referenceCode: 'AP-SLASH001',
    services: ['Mobile Diagnostic Visit'],
    quotedDollars: 100,
    quoteMode: 'diagnostic',
    preferredDate: null,
    preferredTimeWindow: null,
    siteUrl: 'https://adaptivityperformance.com/',
  });

  assert.match(sms, /Track it at https:\/\/adaptivityperformance\.com$/);
});

test('a mobile visit names the travel fee next to the diagnostic; a drop-off does not', () => {
  const base = {
    referenceCode: 'AP-6Z2XDPTF',
    services: ['Mobile Diagnostic Visit'],
    quotedDollars: 100,
    quoteMode: 'diagnostic' as const,
  };
  assert.match(buildBookingConfirmationSms({ ...base, travelDollars: 20 }), /\$100 diagnostic \+ \$20 travel;/);
  assert.doesNotMatch(buildBookingConfirmationSms({ ...base, travelDollars: 0 }), /travel/);
  assert.doesNotMatch(buildBookingConfirmationSms(base), /travel/);
});

const emailBase = {
  referenceCode: 'AP-6Z2XDPTF',
  services: ['Mobile Diagnostic Visit', 'Battery / Charging System'],
  quotedDollars: 100,
  quoteMode: 'diagnostic' as const,
  travelDollars: 20,
  vehicleDescription: '2015 Ford Explorer',
  preferredDate: '2026-10-02',
  preferredTimeWindow: 'Morning (8–11am)',
  siteUrl: 'https://adaptivityperformance.com/',
  customerName: 'Arsenio Washington',
  businessPhone: '(940) 304-0620',
  businessFooter: 'RealAdaptivity LLC DBA AdaptivityPerformance · 410 FM 156, Justin, TX 76247',
};

test('the confirmation email states the booking, the cost and that nothing is charged online', () => {
  const { subject, text, html } = buildBookingConfirmationEmail(emailBase);
  assert.equal(subject, 'Booking received — AP-6Z2XDPTF');
  for (const body of [text, html]) {
    assert.match(body, /AP-6Z2XDPTF/);
    assert.match(body, /2015 Ford Explorer/);
    assert.match(body, /Mobile Diagnostic Visit, Battery \/ Charging System/);
    assert.match(body, /Fri Oct 2, Morning \(8–11am\)/, 'the day the customer picked, not the day before');
    assert.match(body, /\$100 diagnostic \+ \$20 travel/);
    assert.match(body, /Nothing is charged online/);
    assert.match(body, /\(940\) 304-0620/);
  }
  assert.match(text, /^Hi Arsenio,/);
  assert.match(html, /href="tel:9403040620"/);
  assert.doesNotMatch(html, /adaptivityperformance\.com\/\//, 'trailing slash not doubled');
});

test('the confirmation email asks to set a time when none was picked', () => {
  const { text } = buildBookingConfirmationEmail({ ...emailBase, preferredDate: null, preferredTimeWindow: null });
  assert.match(text, /When: We’ll call or text you to set a time/);
});

test('the confirmation email escapes what the customer typed', () => {
  const { html } = buildBookingConfirmationEmail({
    ...emailBase,
    customerName: '<script>x</script> Ham',
    vehicleDescription: '2003 "Bond" <b>Thunderbird</b>',
  });
  assert.doesNotMatch(html, /<script>|<b>Thunderbird/);
  assert.match(html, /&lt;b&gt;Thunderbird&lt;\/b&gt;/);
  assert.match(html, /&quot;Bond&quot;/);
});
