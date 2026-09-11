/**
 * True when the site is running inside a native web-view shell rather than a
 * browser tab. Native shells inject a `Capacitor` global, so this needs no
 * dependency — the store apps ship from the Expo repos, not from here.
 */
type CapacitorGlobal = { isNativePlatform?: () => boolean };

export function isNativeShell(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}
