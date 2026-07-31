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
  if (typeof sessionStorage === 'undefined') return;
  try {
    if (!status?.accountId?.startsWith('acct_')) {
      sessionStorage.removeItem(CACHE_KEY);
      return;
    }
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(status));
  } catch {
    /* quota / private mode */
  }
}

export function clearCachedTechConnectStatus() {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    /* */
  }
}

/**
 * Prefer the last successful edge sync. Do not resurface a local/cached test-mode
 * acct_ after Live sync returned null — that falsely enables Express Dashboard.
 */
export function linkedAccountId(
  status: TechConnectStatus | null | undefined,
  localStripeId: string | null | undefined,
  opts?: { allowLocalFallback?: boolean }
): string | null {
  const a = status?.accountId;
  if (a?.startsWith('acct_')) return a;
  // Explicit null from sync means "not linked on Live" — ignore stale local/cache.
  if (status && (status.accountId === null || status.accountId === '')) {
    return null;
  }
  if (opts?.allowLocalFallback === false) return null;
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
