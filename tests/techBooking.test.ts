import { test } from 'node:test';
import assert from 'node:assert/strict';
import { techBookingBlocker } from '../supabase/functions/_shared/techBooking.ts';

const ready = {
  terminated_at: null,
  w9_completed_at: '2026-09-01T00:00:00Z',
  tax_id_provided: true,
  contractor_agreement_signed_at: '2026-09-01T00:00:00Z',
  contractor_agreement_signature_path: 'sig/me.png',
  contractor_agreement_version: '2026-09',
};

test('a tech with their paperwork done can book', () => {
  assert.equal(techBookingBlocker(ready, '2026-09'), null);
  assert.equal(techBookingBlocker(ready, null), null);
});

test('a tech without a profile, or let go, cannot book', () => {
  assert.match(techBookingBlocker(null, null) ?? '', /not set up/);
  assert.match(techBookingBlocker({ ...ready, terminated_at: '2026-10-01T00:00:00Z' }, null) ?? '', /no longer active/);
});

test('booking takes the same paperwork as a claim', () => {
  assert.match(techBookingBlocker({ ...ready, w9_completed_at: null }, null) ?? '', /W-9/);
  assert.match(techBookingBlocker({ ...ready, tax_id_provided: false }, null) ?? '', /W-9/);
  assert.match(techBookingBlocker({ ...ready, contractor_agreement_signature_path: null }, null) ?? '', /Sign the/);
  assert.match(techBookingBlocker({ ...ready, contractor_agreement_version: '2026-08' }, '2026-09') ?? '', /updated/);
});
