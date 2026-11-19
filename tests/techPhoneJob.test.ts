import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePlate, normalizeVinInput, validatePhoneJob, type PhoneJobFields } from '../src/services/techPhoneJob.ts';

const filled: PhoneJobFields = {
  firstName: 'Dana',
  lastName: 'Reyes',
  phone: '(940) 555-0123',
  email: '',
  street: '1234 Canyon Falls Dr',
  city: 'Northlake',
  zip: '76226',
  vin: '',
  year: '2016',
  make: 'Ford',
  model: 'F-150',
  plate: '',
  agreed: true,
};

test('a phone job needs the customer, the address and year, make and model', () => {
  assert.deepEqual(validatePhoneJob(filled, 2026), {});
  const e = validatePhoneJob({ ...filled, firstName: ' ', lastName: '', phone: '555-0123', zip: '762', year: '16', make: '', model: '', agreed: false }, 2026);
  assert.deepEqual(Object.keys(e).sort(), ['agreed', 'firstName', 'lastName', 'make', 'model', 'phone', 'year', 'zip']);
});

test('VIN, plate and email are optional, but checked when given', () => {
  assert.deepEqual(validatePhoneJob({ ...filled, vin: '1FTEW1EG5GFA12345', plate: 'abc-1234', email: 'dana@example.com' }, 2026), {});
  const e = validatePhoneJob({ ...filled, vin: '1FTEW1EG5GFA1234O', email: 'dana@' }, 2026);
  assert.ok(e.vin);
  assert.ok(e.email);
  assert.ok(validatePhoneJob({ ...filled, year: '2028' }, 2026).year);
});

test('plates and VINs are cleaned the way they are saved', () => {
  assert.equal(normalizePlate(' abc  1234! '), 'ABC 1234');
  assert.equal(normalizePlate('ABCDEFGHIJKL'), 'ABCDEFGHIJ');
  assert.equal(normalizeVinInput('1ftew 1eg5-gfa12345'), '1FTEW1EG5GFA12345');
});
