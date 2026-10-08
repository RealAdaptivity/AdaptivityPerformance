import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  engineLabel,
  isVinShaped,
  normalizeVin,
  summarizeVpic,
  titleCaseMake,
  vehicleLine,
  vinCheckDigitOk,
} from '../src/services/vinDecode.ts';

const fx = JSON.parse(readFileSync('tests/fixtures/vpic-decode.json', 'utf8'));

test('a VIN typed with spaces, dashes or lower case still reads', () => {
  assert.equal(normalizeVin(' 1hgcm-826 33a004352 '), '1HGCM82633A004352');
  assert.ok(isVinShaped('1HGCM82633A004352'));
  assert.ok(!isVinShaped('1HGCM82633A00435'), '16 characters');
  assert.ok(!isVinShaped('1HGCM82633A00435O'), 'O is never used');
});

test('the check digit matches real VINs and catches a typo', () => {
  assert.ok(vinCheckDigitOk('1HGCM82633A004352'));
  assert.ok(vinCheckDigitOk('1FTEW1EG5GFA12345'));
  assert.ok(!vinCheckDigitOk('1HGCM82633A004353'));
});

test('make names read like brands, not shouting', () => {
  assert.equal(titleCaseMake('FORD'), 'Ford');
  assert.equal(titleCaseMake('MERCEDES-BENZ'), 'Mercedes-Benz');
  assert.equal(titleCaseMake('LAND ROVER'), 'Land Rover');
  assert.equal(titleCaseMake('BMW'), 'BMW');
  assert.equal(titleCaseMake('GMC'), 'GMC');
});

test('engine labels match the booking form style', () => {
  assert.equal(engineLabel(fx.honda), '3.0L V6');
  assert.equal(engineLabel(fx.ford), '3.5L V6');
  assert.equal(engineLabel({ DisplacementL: '2.0', EngineCylinders: '4', EngineConfiguration: 'In-Line', Turbo: 'Yes' }), '2.0L I4 Turbo');
  assert.equal(engineLabel({ DisplacementL: '6.7', EngineCylinders: '8', EngineConfiguration: 'V-Shaped', FuelTypePrimary: 'Diesel' }), '6.7L V8 Diesel');
  assert.equal(engineLabel({ ElectrificationLevel: 'BEV (Battery Electric Vehicle)', FuelTypePrimary: 'Electric' }), 'Electric');
  assert.equal(engineLabel({ DisplacementL: '2.5', EngineCylinders: '4', EngineConfiguration: 'In-Line', ElectrificationLevel: 'Strong HEV (Hybrid Electric Vehicle)' }), '2.5L I4 Hybrid');
});

test('a real Honda decodes to the fields the booking form fills', () => {
  const s = summarizeVpic(fx.honda, '1HGCM82633A004352');
  assert.ok(s);
  assert.deepEqual(
    { year: s.year, make: s.make, model: s.model, trim: s.trim, engine: s.engine },
    { year: '2003', make: 'Honda', model: 'Accord', trim: 'EX-V6', engine: '3.0L V6' }
  );
  assert.equal(s.description, '2003 Honda Accord · 3.0L V6');
  assert.deepEqual(s.warnings, []);
  assert.ok(s.checkDigitOk);
  const detail = Object.fromEntries(s.details.map((d) => [d.label, d.value]));
  assert.equal(detail.Transmission, '5-speed Automatic');
  assert.equal(detail['Built in'], 'Marysville, Ohio, United States');
  assert.ok(!('Drive' in detail), 'blank values are left out');
});

test('NHTSA caveats come through as warnings; "Not Applicable" never shows', () => {
  const s = summarizeVpic(fx.ford, '1FTEW1EG5GFA12345');
  assert.ok(s);
  assert.equal(s.trim, '');
  assert.match(s.warnings.join(' '), /Model Year decoded for this VIN may be incorrect/);
  assert.ok(s.details.every((d) => !/Not Applicable/.test(d.value)));
  const bad = summarizeVpic({ ...fx.honda, ErrorCode: '1', ErrorText: '1 - Check Digit (9th position) does not calculate properly' }, '1HGCM82633A004353');
  assert.deepEqual(bad?.warnings, ['Check Digit (9th position) does not calculate properly']);
});

test('nothing decoded means null, not a blank vehicle', () => {
  assert.equal(summarizeVpic({ ErrorCode: '8', ErrorText: '8 - No detailed data available currently' }, 'X'.repeat(17)), null);
  assert.equal(summarizeVpic(null, '1HGCM82633A004352'), null);
});

test('the edge function decodes with the same code as the site', () => {
  assert.equal(
    readFileSync('supabase/functions/_shared/vinDecode.ts', 'utf8'),
    readFileSync('src/services/vinDecode.ts', 'utf8')
  );
});

test('a decoded vehicle becomes one quote line', () => {
  const s = summarizeVpic(fx.honda, '1HGCM82633A004352');
  assert.ok(s);
  assert.equal(vehicleLine(s), '2003 Honda Accord EX-V6 3.0L V6');
});
