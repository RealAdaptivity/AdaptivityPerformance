import { supabase } from './supabaseClient';

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string | null;
  body_md: string;
  city_slug: string | null;
  published_at: string | null;
};

/** Seed articles from 20260728_ops_growth_pack.sql — used when table is empty/unavailable. */
export const FALLBACK_BLOG_POSTS: BlogPost[] = [
  {
    slug: 'how-much-do-brakes-cost-northlake-tx',
    title: 'How much do brakes cost in Northlake, TX?',
    excerpt:
      'Ballpark mobile brake pricing for Canyon Falls, Harvest, and Pecan Square — plus how our $100 diagnostic hold works.',
    body_md:
      '# How much do brakes cost in Northlake, TX?\n\nMost driveway brake jobs in Northlake (pads + rotors, one axle) land in a transparent labor + parts range after we inspect on site.\n\n## How Adaptivity prices\n\n1. Book a **$100 diagnostic hold**\n2. Tech inspects at your driveway\n3. You agree on labor + parts before we charge\n\nTravel inside our free radius (Justin hub) is $0.\n\n## Book mobile brakes\n\nCall (940) 304-0620 or book online for Northlake / Canyon Falls / Harvest.',
    city_slug: 'northlake',
    published_at: '2026-07-28T00:00:00.000Z',
  },
  {
    slug: 'mobile-mechanic-vs-dealership-justin-tx',
    title: 'Mobile mechanic vs dealership in Justin, TX',
    excerpt:
      'When driveway service saves you a day — and when the Justin shop hub is the better call.',
    body_md:
      '# Mobile mechanic vs dealership in Justin, TX\n\nDealerships are great for warranty coding and major powertrain work. For brakes, batteries, oil, and diagnostics, a mobile tech at your Justin driveway is usually faster.\n\n## When to choose mobile\n\n- You need brakes / oil / battery today\n- You do not want to sit in a waiting room\n- You want on-site pricing with a $100 hold\n\n## When to choose the Justin shop\n\n- Lifts, exhaust, major engine / transmission\n- Multi-day builds\n\nBook at adaptivityperformance.com or call (940) 304-0620.',
    city_slug: 'justin',
    published_at: '2026-07-28T00:00:00.000Z',
  },
  {
    slug: 'google-business-review-playbook',
    title: 'Google Business review playbook for Adaptivity',
    excerpt: 'Internal growth checklist: ask for reviews, reply fast, post weekly.',
    body_md:
      '# Google Business review playbook\n\n1. After every completed job, send the review link\n2. Reply to every review within 48 hours\n3. Post a weekly Google Business update (photo from a job + city keyword)\n4. Keep NAP consistent: 410 FM 156, Justin TX 76247 · (940) 304-0620\n\nReview URL: set VITE_GOOGLE_REVIEW_URL in production.',
    city_slug: null,
    published_at: '2026-07-28T00:00:00.000Z',
  },
];

function mapRow(row: Record<string, unknown>): BlogPost {
  return {
    slug: String(row.slug ?? ''),
    title: String(row.title ?? ''),
    excerpt: row.excerpt != null ? String(row.excerpt) : null,
    body_md: String(row.body_md ?? ''),
    city_slug: row.city_slug != null ? String(row.city_slug) : null,
    published_at: row.published_at != null ? String(row.published_at) : null,
  };
}

export async function fetchPublishedPosts(): Promise<BlogPost[]> {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('slug, title, excerpt, body_md, city_slug, published_at')
      .eq('published', true)
      .order('published_at', { ascending: false });

    if (error || !data?.length) return FALLBACK_BLOG_POSTS;
    return data.map((row) => mapRow(row as Record<string, unknown>));
  } catch {
    return FALLBACK_BLOG_POSTS;
  }
}

export async function fetchPostBySlug(slug: string): Promise<BlogPost | null> {
  const normalized = slug.trim().toLowerCase();
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('slug, title, excerpt, body_md, city_slug, published_at')
      .eq('published', true)
      .eq('slug', normalized)
      .maybeSingle();

    if (!error && data) return mapRow(data as Record<string, unknown>);
  } catch {
    /* fall through */
  }
  return FALLBACK_BLOG_POSTS.find((p) => p.slug === normalized) ?? null;
}

export function blogPath(slug?: string): string {
  return slug ? `/blog/${slug}` : '/blog';
}

export function blogSlugFromPath(pathname: string): string | null {
  const m = pathname.match(/\/blog\/([a-z0-9-]+)\/?$/i);
  return m ? m[1].toLowerCase() : null;
}

/** Lightweight markdown → React-friendly blocks (headers + paragraphs). */
export function splitMarkdownBlocks(md: string): Array<{ type: 'h1' | 'h2' | 'p'; text: string }> {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const blocks: Array<{ type: 'h1' | 'h2' | 'p'; text: string }> = [];
  let para: string[] = [];

  const flush = () => {
    const text = para.join(' ').trim();
    if (text) blocks.push({ type: 'p', text });
    para = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^#\s+/.test(line)) {
      flush();
      blocks.push({ type: 'h1', text: line.replace(/^#\s+/, '').trim() });
      continue;
    }
    if (/^##\s+/.test(line)) {
      flush();
      blocks.push({ type: 'h2', text: line.replace(/^##\s+/, '').trim() });
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    para.push(line.trim());
  }
  flush();
  return blocks;
}
