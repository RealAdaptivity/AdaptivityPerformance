import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apDataJobUrl, splitVehicle } from '../src/config/apData.ts';

test('splits the booking vehicle text', () => {
  assert.deepEqual(splitVehicle('2015 Ford Explorer'), { year: '2015', make: 'Ford', model: 'Explorer' });
  assert.deepEqual(splitVehicle('2019 Land Rover Range Rover Sport'), { year: '2019', make: 'Land Rover', model: 'Range Rover Sport' });
  assert.deepEqual(splitVehicle('Ford truck'), {});
  assert.deepEqual(splitVehicle(null), {});
});

test('the AP Data link carries the job, VIN, vehicle, complaint and codes', () => {
  const url = apDataJobUrl({ referenceCode: 'AP-ZA4DHQ7B', vin: '1fm5k8d84fga12345', vehicle: '2015 Ford Explorer', issueDescription: 'Check engine light, P0301 and p0171' });
  assert.ok(url.startsWith('https://apdatagroup.com/#/go?'));
  const q = new URLSearchParams(url.split('?')[1]);
  assert.equal(q.get('job'), 'AP-ZA4DHQ7B');
  assert.equal(q.get('vin'), '1FM5K8D84FGA12345');
  assert.equal(q.get('make'), 'Ford');
  assert.equal(q.get('codes'), 'P0301,P0171');
  assert.equal(q.get('issue'), 'Check engine light, P0301 and p0171');
  const bare = new URLSearchParams(apDataJobUrl({ referenceCode: 'AP-1618' }).split('?')[1]);
  assert.deepEqual([...bare.keys()], ['job']);
});
