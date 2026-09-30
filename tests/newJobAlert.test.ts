import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNewJobAlertSms,
  specialtyForKind,
  techsToAlert,
  townFromAddress,
} from '../supabase/functions/_shared/newJobAlert.ts';
import { SERVICE_CATALOG, specialtyForServiceKind } from '../src/services/serviceCatalog.ts';

test('the specialty for every catalog kind matches what the portal checks at claim time', () => {
  for (const s of SERVICE_CATALOG) {
    assert.equal(specialtyForKind(s.kind), specialtyForServiceKind(s.kind), s.kind);
  }
  assert.equal(specialtyForKind('something_new'), specialtyForServiceKind('other'));
});

const techs = [
  { id: 'a', phone: '(940) 555-0101', specialties: ['mechanical'], terminatedAt: null },
  { id: 'b', phone: '9405550102', specialties: ['mechanical', 'tires'], terminatedAt: null },
  { id: 'c', phone: '9405550103', specialties: [], terminatedAt: null },
  { id: 'd', phone: null, specialties: ['mechanical'], terminatedAt: null },
  { id: 'e', phone: '9405550105', specialties: ['mechanical', 'tires'], terminatedAt: '2026-09-01T00:00:00Z' },
  { id: 'f', phone: '+1 940 555 0101', specialties: ['mechanical'], terminatedAt: null },
];

test('a mechanical job texts every active tech with a phone, once per number', () => {
  assert.deepEqual(techsToAlert(techs, ['brakes']).map((t) => t.id), ['a', 'b', 'c']);
});

test('a tire job only reaches techs who do tires', () => {
  assert.deepEqual(techsToAlert(techs, ['tires']).map((t) => t.id), ['b']);
});

test('a job needing two specialties needs a tech with both', () => {
  assert.deepEqual(techsToAlert(techs, ['brakes', 'tires']).map((t) => t.id), ['b']);
  assert.deepEqual(techsToAlert(techs, ['tires', 'car_audio']), []);
});

test('the town comes out of the address the booking form builds', () => {
  assert.equal(townFromAddress('1234 Canyon Falls Dr, Northlake, TX 76226'), 'Northlake');
  assert.equal(townFromAddress('55 Elm St, Argyle, TX'), 'Argyle');
  assert.equal(townFromAddress('Adaptivity Performance Garage • 410 FM 156, Justin, TX 76247'), 'Justin');
  assert.equal(townFromAddress('just a street'), null);
});

test('the text names the job, town and time, and never the customer', () => {
  const sms = buildNewJobAlertSms({
    service: 'Brake Service (Pads / Rotors)',
    town: 'Northlake',
    shopDropOff: false,
    preferredDate: '2026-10-01',
    preferredTimeWindow: 'Morning (8 AM - 12 PM)',
    portalUrl: 'https://adaptivityperformance.com/portal',
  });
  assert.equal(
    sms,
    'Adaptivity: new job available — Brake Service (Pads / Rotors), Northlake, Thu Oct 1 Morning. First to claim it gets it: https://adaptivityperformance.com/portal'
  );
  assert.ok(sms.length <= 160 * 2, 'fits in two SMS segments');
});

test('ASAP and shop drop-offs read naturally', () => {
  const sms = buildNewJobAlertSms({
    service: 'Battery / Charging System',
    town: null,
    shopDropOff: true,
    preferredDate: '2026-10-01',
    preferredTimeWindow: 'Emergency ASAP',
    portalUrl: 'https://x.test/portal',
  });
  assert.match(sms, /Battery \/ Charging System, shop drop-off, ASAP\./);
});

test('push goes to every eligible tech, phone or not', async () => {
  const { eligibleTechs } = await import('../supabase/functions/_shared/newJobAlert.ts');
  assert.deepEqual(eligibleTechs(techs, ['brakes']).map((t) => t.id), ['a', 'b', 'c', 'd', 'f']);
  assert.deepEqual(eligibleTechs(techs, ['tires']).map((t) => t.id), ['b']);
});

test('the push notification is the text without the link', async () => {
  const { buildNewJobPush } = await import('../supabase/functions/_shared/newJobAlert.ts');
  assert.deepEqual(
    buildNewJobPush({
      service: 'Brake Service (Pads / Rotors)',
      town: 'Northlake',
      shopDropOff: false,
      preferredDate: '2026-10-01',
      preferredTimeWindow: 'Morning (8 AM - 12 PM)',
    }),
    {
      title: 'New job available',
      body: 'Brake Service (Pads / Rotors), Northlake, Thu Oct 1 Morning — first to claim it gets it.',
    }
  );
});
