import React, { useEffect, useState } from 'react';
import { ArrowRight, Loader2, Newspaper } from 'lucide-react';
import { blogPath, fetchPublishedPosts, type BlogPost } from '../services/blog';

export const BlogIndexPage: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await fetchPublishedPosts();
      if (!cancelled) {
        setPosts(next);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openPost = (slug: string) => {
    window.history.pushState({}, '', blogPath(slug));
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="py-16 bg-[#0b0c10] border-t border-white/10">
      <div className="container mx-auto px-4 max-w-3xl space-y-10">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 border border-orange-500/30 px-3 py-1.5 rounded-full">
            <Newspaper className="w-3.5 h-3.5" />
            Guides & local tips
          </span>
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-white leading-tight">
            Adaptivity <span className="text-orange-500">Blog</span>
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
            Mobile repair pricing, Justin hub tips, and growth notes for DFW drivers.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
            Loading posts…
          </div>
        ) : (
          <ul className="space-y-4">
            {posts.map((post) => (
              <li key={post.slug}>
                <button
                  type="button"
                  onClick={() => openPost(post.slug)}
                  className="w-full text-left rounded-2xl border border-white/10 bg-[#12141c] p-5 hover:border-orange-500/40 transition-colors group space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-heading text-lg font-bold text-white group-hover:text-orange-300 transition-colors">
                      {post.title}
                    </h2>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-orange-400 shrink-0 mt-1" />
                  </div>
                  {post.excerpt ? (
                    <p className="text-sm text-slate-400 leading-relaxed">{post.excerpt}</p>
                  ) : null}
                  {post.published_at ? (
                    <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                      {new Date(post.published_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      {post.city_slug ? ` · ${post.city_slug}` : ''}
                    </p>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
