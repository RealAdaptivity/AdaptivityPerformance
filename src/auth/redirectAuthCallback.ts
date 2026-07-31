/**
 * Supabase invite/recovery emails often land on Site URL (/) with tokens in the hash.
 * Send them to the portal password-setup screen, preserving hash/query for session exchange.
 */
export function redirectAuthCallbackToPortal(): boolean {
  if (typeof window === 'undefined') return false;

  const { pathname, search, hash } = window.location;
  const path = pathname.replace(/\/$/, '') || '/';
  const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
  const portalSuffix = 'portal';
  const alreadyPortal =
    path === '/portal' ||
    path.endsWith('/portal') ||
    path === `${base.replace(/\/$/, '')}/portal`;

  const query = new URLSearchParams(search);
  const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);

  const type = (query.get('type') || hashParams.get('type') || '').toLowerCase();
  const hasAuthPayload =
    hashParams.has('access_token') ||
    hashParams.has('refresh_token') ||
    query.has('code') ||
    query.get('techInvite') === '1';

  const isPasswordFlow =
    type === 'invite' ||
    type === 'recovery' ||
    type === 'signup' ||
    type === 'magiclink' ||
    query.get('techInvite') === '1';

  if (!hasAuthPayload && !isPasswordFlow) return false;
  if (alreadyPortal && query.get('techInvite') === '1') return false;

  if (!alreadyPortal && (hasAuthPayload || isPasswordFlow)) {
    const next = new URLSearchParams(search);
    next.set('techInvite', '1');
    const target = `${window.location.origin}${base}${portalSuffix}?${next.toString()}${hash || ''}`;
    window.location.replace(target);
    return true;
  }

  if (alreadyPortal && hasAuthPayload && query.get('techInvite') !== '1') {
    const next = new URLSearchParams(search);
    next.set('techInvite', '1');
    window.history.replaceState({}, '', `${pathname}?${next.toString()}${hash || ''}`);
  }

  return false;
}
