/**
 * Pure path matchers for the dynamic routes.
 *
 * These live apart from the modules that render those routes on purpose: the
 * router needs to recognise a blog or referral URL, and importing the matcher
 * from `services/blog.ts` dragged the whole Supabase client — 200 KB — into
 * the first request on every page, including pages that never touch a database.
 */

export function blogSlugFromPath(pathname: string): string | null {
  const m = pathname.match(/\/blog\/([a-z0-9-]+)\/?$/i);
  return m ? m[1].toLowerCase() : null;
}

export function blogPath(slug?: string | null): string {
  return slug ? `/blog/${slug}` : '/blog';
}

export function referralCodeFromPath(pathname: string): string | null {
  const m = pathname.match(/\/r\/([A-Za-z0-9_-]{4,16})\/?$/);
  return m ? m[1].toUpperCase() : null;
}

/** Extract the booking reference from a `/pay/<ref>` path. */
export function payReferenceFromPath(pathname: string): string | null {
  const match = pathname.replace(/\/+$/, '').match(/^\/pay\/([A-Za-z0-9_-]{3,40})$/);
  return match ? decodeURIComponent(match[1]) : null;
}
