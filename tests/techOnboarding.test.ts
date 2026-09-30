import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  TECH_SPECIALTIES,
  normalizeUsPhone,
  planOnboarding,
  specialtyLabels,
  validateOnboarding,
} from '../src/services/techOnboarding.ts';

const good = {
  fullName: '  Devon   Marsh ',
  email: '  Devon.Marsh@Example.com ',
  phone: '940.555.0123',
  specialties: ['mechanical'],
};

test('a good form comes back cleaned', () => {
  const r = validateOnboarding(good);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.deepEqual(r.value, {
    fullName: 'Devon Marsh',
    email: 'devon.marsh@example.com',
    phone: '(940) 555-0123',
    specialties: ['mechanical'],
  });
});

test('the email is lower-cased so first sign-in always finds the application', () => {
  const r = validateOnboarding({ ...good, email: 'TECH@SHOP.COM' });
  assert.equal(r.ok && r.value.email, 'tech@shop.com');
});

test('every problem is reported at once', () => {
  const r = validateOnboarding({ fullName: ' ', email: 'nope', phone: '555-01', specialties: [] });
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.deepEqual(Object.keys(r.errors).sort(), ['email', 'fullName', 'phone', 'specialties']);
});

test('unknown specialties are dropped, duplicates collapsed', () => {
  const r = validateOnboarding({ ...good, specialties: ['mechanical', 'mechanical', 'rocket_science'] });
  assert.deepEqual(r.ok && r.value.specialties, ['mechanical']);
  const none = validateOnboarding({ ...good, specialties: ['rocket_science'] });
  assert.equal(none.ok, false);
});

test('phone numbers normalise from the ways people type them', () => {
  for (const input of ['9405550123', '(940) 555-0123', '940-555-0123', '+1 940 555 0123', '1-940-555-0123']) {
    assert.equal(normalizeUsPhone(input), '(940) 555-0123', input);
  }
  for (const input of ['555-0123', '94055501234', '2-940-555-0123', '']) {
    assert.equal(normalizeUsPhone(input), null, input);
  }
});

test('no applications on file: create one', () => {
  assert.deepEqual(planOnboarding([]), { kind: 'create' });
});

test('already approved: resend the invite, never a second application', () => {
  const plan = planOnboarding([
    { id: 'old', status: 'submitted', createdAt: '2026-08-01T00:00:00Z' },
    { id: 'ok', status: 'approved', createdAt: '2026-07-01T00:00:00Z' },
  ]);
  assert.deepEqual(plan, { kind: 'resend', applicationId: 'ok' });
});

test('applied on the website and waiting: approve that application', () => {
  const plan = planOnboarding([
    { id: 'older', status: 'submitted', createdAt: '2026-08-01T00:00:00Z' },
    { id: 'newer', status: 'submitted', createdAt: '2026-09-01T00:00:00Z' },
  ]);
  assert.deepEqual(plan, { kind: 'approve', applicationId: 'newer' });
});

test('only rejected before: start fresh, since a rejected row cannot be approved', () => {
  const plan = planOnboarding([{ id: 'no', status: 'rejected', createdAt: '2026-08-01T00:00:00Z' }]);
  assert.deepEqual(plan, { kind: 'create' });
});

test('specialty labels follow the form order', () => {
  assert.deepEqual(specialtyLabels(['tires', 'mechanical']), ['Mechanical / ASE', 'Tires & wheels']);
  assert.deepEqual(specialtyLabels([]), []);
});

test('the specialty ids are exactly the set techApplications.ts allows', () => {
  // Read from the source rather than copied here, so a specialty added to or
  // dropped from the application logic fails this test until the admin form
  // matches it. (That module imports Supabase, so the test cannot load it.)
  const src = readFileSync('src/services/techApplications.ts', 'utf8');
  const block = src.match(/const allowed = new Set\(\[([\s\S]*?)\]\)/);
  assert.ok(block, 'allowed specialty set not found in techApplications.ts');
  const allowed = [...block[1].matchAll(/'([a-z]+)'/g)].map((m) => m[1]).sort();
  assert.deepEqual(TECH_SPECIALTIES.map((s) => s.id).sort(), allowed);
});
