import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LEAKED_PASSWORD_MESSAGE,
  assertUsablePassword,
  isLeakedPassword,
  suffixInRange,
} from '../src/services/passwordCheck.ts';

// SHA-1("password") = 5BAA6 1E4C9B93F3F0682250B6CF8331B7EE68FD8
const PASSWORD_SUFFIX = '1E4C9B93F3F0682250B6CF8331B7EE68FD8';

const fakeRange = (body: string, status = 200) => {
  const calls: string[] = [];
  const impl = (async (url: string | URL | Request) => {
    calls.push(String(url));
    return new Response(body, { status });
  }) as typeof fetch;
  return { impl, calls };
};

test('a range response is matched on the hash suffix, ignoring padding rows', () => {
  const body = `0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n${PASSWORD_SUFFIX}:52372427\r\n00D4F6E8FA6EECAD2A3AA415EEC418D38EC:0`;
  assert.equal(suffixInRange(body, PASSWORD_SUFFIX), true);
  assert.equal(suffixInRange(body, PASSWORD_SUFFIX.toLowerCase()), true);
  assert.equal(suffixInRange(body, '00D4F6E8FA6EECAD2A3AA415EEC418D38EC'), false, 'count 0 is padding');
  assert.equal(suffixInRange(body, 'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'), false);
});

test('only the first 5 characters of the hash are sent', async () => {
  const { impl, calls } = fakeRange(`${PASSWORD_SUFFIX}:10`);
  assert.equal(await isLeakedPassword('password', impl), true);
  assert.deepEqual(calls, ['https://api.pwnedpasswords.com/range/5BAA6']);
  assert.equal(new URL(calls[0]).pathname, '/range/5BAA6', 'nothing but the hash prefix is sent');
});

test('a password not in the list is fine', async () => {
  const { impl } = fakeRange('0018A45C4D1DEF81644B54AB7F969B88D65:3');
  assert.equal(await isLeakedPassword('password', impl), false);
});

test('if the service is down or slow, the password is allowed', async () => {
  assert.equal(await isLeakedPassword('password', fakeRange('', 503).impl), false);
  const throws = (async () => {
    throw new TypeError('Failed to fetch');
  }) as typeof fetch;
  assert.equal(await isLeakedPassword('password', throws), false);
  const hangs = ((_u: unknown, init?: RequestInit) =>
    new Promise((_, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))))) as typeof fetch;
  assert.equal(await isLeakedPassword('password', hangs, 20), false);
});

test('assertUsablePassword: too short, leaked, then fine', async () => {
  await assert.rejects(assertUsablePassword('short', fakeRange('').impl), /at least 8 characters/);
  await assert.rejects(assertUsablePassword('password', fakeRange(`${PASSWORD_SUFFIX}:10`).impl), {
    message: LEAKED_PASSWORD_MESSAGE,
  });
  await assertUsablePassword('password', fakeRange('').impl);
});
