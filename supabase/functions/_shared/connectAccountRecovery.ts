import { getStripe } from './stripe.ts';

export type ListedConnectAccount = {
  id: string;
  email?: string | null;
  created?: number;
  details_submitted?: boolean;
  metadata?: { adaptivity_profile_id?: string };
  capabilities?: {
    transfers?: string | { status?: string };
    card_payments?: string | { status?: string };
  };
};

function capabilityIsActive(cap: string | { status?: string } | undefined): boolean {
  if (!cap) return false;
  if (typeof cap === 'string') return cap === 'active';
  return cap.status === 'active';
}

function scoreConnectAccount(
  acct: ListedConnectAccount,
  profileId: string,
  targetEmail: string
): number {
  let score = 0;
  if (acct.metadata?.adaptivity_profile_id === profileId) score += 10_000;
  if (capabilityIsActive(acct.capabilities?.transfers)) score += 1_000;
  if (acct.details_submitted) score += 100;
  if (acct.email?.toLowerCase() === targetEmail) score += 10;
  score += (acct.created ?? 0) / 1_000_000;
  return score;
}

/** All Express accounts matching profile metadata and/or email (test cleanup / canonical pick). */
export async function listConnectAccountsForTech(
  profileId: string,
  email: string
): Promise<ListedConnectAccount[]> {
  const key = getStripe();
  const targetEmail = email.trim().toLowerCase();
  const matches: ListedConnectAccount[] = [];
  let startingAfter: string | undefined;

  for (let page = 0; page < 25; page++) {
    let path = '/accounts?limit=100';
    if (startingAfter) path += `&starting_after=${encodeURIComponent(startingAfter)}`;

    const res = await fetch(`https://api.stripe.com/v1${path}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Could not list Stripe Connect accounts');
    }

    for (const acct of (json.data || []) as ListedConnectAccount[]) {
      if (!acct.id?.startsWith('acct_')) continue;
      const profileMatch = acct.metadata?.adaptivity_profile_id === profileId;
      const emailMatch = acct.email?.toLowerCase() === targetEmail;
      if (profileMatch || emailMatch) matches.push(acct);
    }

    if (!json.has_more || !json.data?.length) break;
    startingAfter = json.data[json.data.length - 1].id;
  }

  return matches;
}

/** Pick one Connect account for this tech — never prefer "newest" if an older one has transfers active. */
export async function recoverConnectAccountForProfile(
  profileId: string,
  email: string
): Promise<string | undefined> {
  const matches = await listConnectAccountsForTech(profileId, email);
  if (matches.length === 0) return undefined;
  matches.sort(
    (a, b) => scoreConnectAccount(b, profileId, email.trim().toLowerCase()) - scoreConnectAccount(a, profileId, email.trim().toLowerCase())
  );
  return matches[0].id;
}

export async function countConnectAccountsForEmail(email: string): Promise<number> {
  const target = email.trim().toLowerCase();
  if (!target) return 0;
  const key = getStripe();
  let count = 0;
  let startingAfter: string | undefined;

  for (let page = 0; page < 25; page++) {
    let path = '/accounts?limit=100';
    if (startingAfter) path += `&starting_after=${encodeURIComponent(startingAfter)}`;

    const res = await fetch(`https://api.stripe.com/v1${path}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || 'Could not list accounts');

    for (const acct of (json.data || []) as ListedConnectAccount[]) {
      if (acct.email?.toLowerCase() === target && acct.id?.startsWith('acct_')) count++;
    }

    if (!json.has_more || !json.data?.length) break;
    startingAfter = json.data[json.data.length - 1].id;
  }

  return count;
}

/** Stamp profile id on the canonical account so future recovery is exact. */
export async function tagConnectAccountProfile(
  accountId: string,
  profileId: string,
  techName: string
): Promise<void> {
  const key = getStripe();
  const body = new URLSearchParams({
    'metadata[adaptivity_profile_id]': profileId,
    'metadata[tech_name]': techName,
  });
  const res = await fetch(`https://api.stripe.com/v1/accounts/${accountId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || 'Could not update Connect account metadata');
  }
}
