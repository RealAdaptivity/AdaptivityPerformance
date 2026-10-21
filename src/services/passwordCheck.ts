/** Checks for a new password, run before any account is created or a
 *  password is changed.
 *
 *  The leaked-password check is the same one Supabase offers only on its paid
 *  plans: the Have I Been Pwned list of passwords seen in data breaches. Only
 *  the first 5 characters of the password's SHA-1 hash are sent; the
 *  password itself never leaves the browser. If the service can't be reached,
 *  the password is allowed rather than blocking someone from signing up.
 *
 *  No imports, so tests/passwordCheck.test.ts can load it with node. */

export const MIN_PASSWORD_LENGTH = 8;

export const LEAKED_PASSWORD_MESSAGE =
  'That password has shown up in a data breach, so it’s easy to guess. Please pick a different one.';

const RANGE_URL = 'https://api.pwnedpasswords.com/range/';

async function sha1Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Whether a range response (lines of "SUFFIX:COUNT") lists this suffix. */
export function suffixInRange(body: string, suffix: string): boolean {
  const want = suffix.toUpperCase();
  for (const line of body.split('\n')) {
    const [s, count] = line.trim().split(':');
    if (s?.toUpperCase() === want && Number(count) > 0) return true;
  }
  return false;
}

export async function isLeakedPassword(
  password: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 4000
): Promise<boolean> {
  try {
    const hash = await sha1Hex(password);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetchImpl(RANGE_URL + hash.slice(0, 5), { signal: ctrl.signal });
      if (!res.ok) return false;
      return suffixInRange(await res.text(), hash.slice(5));
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return false;
  }
}

/** Throws an Error with a message to show the person, or returns quietly. */
export async function assertUsablePassword(password: string, fetchImpl: typeof fetch = fetch): Promise<void> {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (await isLeakedPassword(password, fetchImpl)) {
    throw new Error(LEAKED_PASSWORD_MESSAGE);
  }
}
