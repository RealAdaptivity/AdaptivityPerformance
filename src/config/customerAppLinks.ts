/** Store listing URLs — swap `#` for live links when apps are published. */
export const customerAppLinks = {
  appStore: '#',
  playStore: '#',
} as const;

/** True once either app is published. Until then the site shows no app
 *  badges at all — "Coming soon" badges read as unfinished. */
export const CUSTOMER_APP_LIVE = [customerAppLinks.appStore, customerAppLinks.playStore].some(
  (url) => Boolean(url && url !== '#')
);
