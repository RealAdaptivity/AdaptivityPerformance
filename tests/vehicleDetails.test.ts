import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY_VEHICLE,
  composeVehicleDescription,
  isValidModelYear,
  isValidVin,
  normalizeVin,
  validateVehicle,
  type VehicleDetails,
} from '../src/services/vehicleDetails.ts';

const full: VehicleDetails = {
  year: '2021',
  make: 'Ford',
  model: 'F-150',
  trim: 'Lariat',
  engine: '3.5L EcoBoost V6',
  vin: '1FTFW1E52MFA12345',
};

test('the composed description reads the way a tech would write it', () => {
  assert.equal(composeVehicleDescription(full), '2021 Ford F-150 Lariat · 3.5L EcoBoost V6');
});

test('missing parts are dropped, never printed as undefined', () => {
  assert.equal(
    composeVehicleDescription({ year: '2019', make: 'Chevrolet', model: 'Tahoe' }),
    '2019 Chevrolet Tahoe'
  );
  assert.equal(composeVehicleDescription({ make: 'Honda', model: 'Civic' }), 'Honda Civic');
  assert.equal(composeVehicleDescription({}), '');
  // bookings.vehicle_description is NOT NULL, so the caller must handle the
  // empty case rather than this silently inventing a vehicle.
  assert.doesNotMatch(composeVehicleDescription({ year: '2021' }), /undefined|null/);
});

test('engine alone still produces something rather than a stray separator', () => {
  assert.equal(composeVehicleDescription({ engine: '5.7L HEMI' }), '5.7L HEMI');
});

test('VIN normalization strips the formatting people actually type', () => {
  assert.equal(normalizeVin('  1ftfw1e52mfa12345 '), '1FTFW1E52MFA12345');
  assert.equal(normalizeVin('1FTFW1E52-MFA12345'), '1FTFW1E52MFA12345');
});

test('VIN rejects the letters a VIN never contains', () => {
  // I, O and Q were excluded from the VIN alphabet precisely because they
  // look like 1 and 0, so a VIN carrying one is a transcription error.
  assert.ok(isValidVin('1FTFW1E52MFA12345'));
  assert.ok(!isValidVin('1FTFW1E52MFA1234I'));
  assert.ok(!isValidVin('1FTFW1E52MFA1234O'));
  assert.ok(!isValidVin('1FTFW1E52MFA1234Q'));
});

test('VIN must be exactly 17 characters', () => {
  assert.ok(!isValidVin('1FTFW1E52MFA1234'));
  assert.ok(!isValidVin('1FTFW1E52MFA123456'));
  assert.ok(!isValidVin(''));
});

test('model years may run ahead of the calendar but not far', () => {
  const now = new Date('2026-09-28T00:00:00Z');
  assert.ok(isValidModelYear('2026', now));
  assert.ok(isValidModelYear('2027', now), 'next year sells before the year turns');
  assert.ok(isValidModelYear('2028', now));
  assert.ok(!isValidModelYear('2029', now));
  assert.ok(isValidModelYear('1955', now), 'a classic is a real mobile job');
  assert.ok(!isValidModelYear('1899', now));
  assert.ok(!isValidModelYear('21', now));
  assert.ok(!isValidModelYear('two thousand', now));
});

test('a complete vehicle validates clean', () => {
  assert.deepEqual(validateVehicle(full), []);
});

test('an empty vehicle reports every missing field at once', () => {
  // Reporting only the first would make the customer resubmit six times to
  // discover all of them.
  const errors = validateVehicle(EMPTY_VEHICLE);
  assert.deepEqual(
    errors.map((e) => e.field).sort(),
    ['engine', 'make', 'model', 'trim', 'vin', 'year']
  );
});

test('a bad VIN is reported as bad, not as missing', () => {
  const errors = validateVehicle({ ...full, vin: 'NOTAVIN' });
  assert.equal(errors.length, 1);
  assert.equal(errors[0].field, 'vin');
  assert.match(errors[0].message, /17 characters/);
});

test('whitespace is not a value', () => {
  const errors = validateVehicle({ ...full, make: '   ', trim: '\t' });
  assert.deepEqual(errors.map((e) => e.field).sort(), ['make', 'trim']);
});
