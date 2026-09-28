import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY_DISCLOSURE,
  isPolicyExpired,
  validateDisclosure,
  type DisclosureValues,
} from '../src/services/vehicleInsuranceRules.ts';

const TODAY = new Date(2026, 8, 28); // 28 Sep 2026, local — not UTC-parsed.
const SIG = 'data:image/png;base64,iVBORw0KGgo=';

const good: DisclosureValues = {
  vehicleDescription: '2019 Chevrolet Silverado 1500',
  licensePlate: 'ABC1234',
  licensePlateState: 'TX',
  insuranceCarrier: 'State Farm',
  policyNumber: 'TX-99-1234567',
  policyExpiresOn: '2027-03-01',
};

test('a policy expiring in the future is not expired', () => {
  assert.equal(isPolicyExpired('2027-03-01', TODAY), false);
});

test('a policy expiring today still counts as covered', () => {
  // Cover lapses the day after the expiry date, not on it.
  assert.equal(isPolicyExpired('2026-09-28', TODAY), false);
});

test('a policy that expired yesterday is expired', () => {
  assert.equal(isPolicyExpired('2026-09-27', TODAY), true);
});

test('expiry is compared as a local date, not UTC midnight', () => {
  // new Date('2026-09-28') is UTC midnight, which is 27 Sep in Texas. Parsing
  // that way would expire a policy a day early for every technician.
  assert.equal(isPolicyExpired('2026-09-28', TODAY), false);
});

test('a missing or malformed expiry counts as expired, not as valid', () => {
  assert.equal(isPolicyExpired(null, TODAY), true);
  assert.equal(isPolicyExpired('', TODAY), true);
  assert.equal(isPolicyExpired('soon', TODAY), true);
  assert.equal(isPolicyExpired('03/01/2027', TODAY), true);
});

test('a complete disclosure validates clean', () => {
  assert.deepEqual(validateDisclosure(good, 'Jordan Reyes', SIG, TODAY), []);
});

test('an empty form reports every field at once', () => {
  const fields = validateDisclosure(EMPTY_DISCLOSURE, '', '', TODAY).map((e) => e.field).sort();
  assert.deepEqual(fields, [
    'insuranceCarrier',
    'licensePlate',
    'licensePlateState',
    'policyExpiresOn',
    'policyNumber',
    'signature',
    'signerName',
    'vehicleDescription',
  ]);
});

test('an already-expired policy is refused at the form', () => {
  // Storing it would leave a disclosure on file that looks like proof of
  // insurance and is not.
  const errors = validateDisclosure({ ...good, policyExpiresOn: '2026-01-01' }, 'Jordan Reyes', SIG, TODAY);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].field, 'policyExpiresOn');
  assert.match(errors[0].message, /already expired/);
});

test('plate state must be two letters', () => {
  const bad = validateDisclosure({ ...good, licensePlateState: 'Texas' }, 'Jordan Reyes', SIG, TODAY);
  assert.equal(bad.length, 1);
  assert.equal(bad[0].field, 'licensePlateState');
});

test('a drawn signature is required, and a non-image is not one', () => {
  const errors = validateDisclosure(good, 'Jordan Reyes', '', TODAY);
  assert.deepEqual(errors.map((e) => e.field), ['signature']);
  const notAnImage = validateDisclosure(good, 'Jordan Reyes', 'data:text/plain;base64,aGk=', TODAY);
  assert.deepEqual(notAnImage.map((e) => e.field), ['signature']);
});

test('initials are not a legal name', () => {
  const errors = validateDisclosure(good, 'J', SIG, TODAY);
  assert.deepEqual(errors.map((e) => e.field), ['signerName']);
});

test('whitespace is not a value', () => {
  const errors = validateDisclosure(
    { ...good, insuranceCarrier: '   ', policyNumber: '\t' },
    'Jordan Reyes',
    SIG,
    TODAY
  );
  assert.deepEqual(errors.map((e) => e.field).sort(), ['insuranceCarrier', 'policyNumber']);
});
