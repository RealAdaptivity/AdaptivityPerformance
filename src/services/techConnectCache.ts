import type { TechConnectStatus } from './techDispatch';

const CACHE_KEY = 'adaptivity_tech_stripe_connect_v1';

export function readCachedTechConnectStatus(): TechConnectStatus | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TechConnectStatus;
    if (!parsed?.accountId?.startsWith('acct_')) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCachedTechConnectStatus(status: TechConnectStatus | null) {
  if (typeof sessionStorage === 'undefined' || !status?.accountId?.startsWith('acct_')) return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(status));
  } catch {
    /* quota / private mode */
  }
}

export function linkedAccountId(
  status: TechConnectStatus | null | undefined,
  localStripeId: string | null | undefined
): string | null {
  const a = status?.accountId;
  if (a?.startsWith('acct_')) return a;
  if (localStripeId?.startsWith('acct_')) return localStripeId;
  return readCachedTechConnectStatus()?.accountId ?? null;
}

export function stripeStatusLabel(
  status: TechConnectStatus | null,
  linkedId: string | null,
  loading: boolean
): string {
  if (loading && !linkedId) return 'Loading…';
  if (!status && linkedId) return 'Stripe linked — refreshing status…';
  if (!status) return 'Loading…';
  if (status.readyForPayouts) return 'Ready for payouts & instant cash out';
  if (status.accountId && status.transfersEnabled === false) {
    return 'Finish Stripe onboarding — Transfers not enabled yet (required for job payouts)';
  }
  if (status.detailsSubmitted) return 'Stripe reviewing your account';
  if (status.chargesEnabled || status.payoutsEnabled) return 'Almost ready — finish any Stripe prompts';
  if (linkedId) return 'Finish Express onboarding (account saved)';
  return 'Not linked';
}
