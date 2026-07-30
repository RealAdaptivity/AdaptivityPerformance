import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import {
  blogPath,
  fetchPostBySlug,
  splitMarkdownBlocks,
  type BlogPost,
} from '../services/blog';
import { applyDocumentSeo, SITE_ORIGIN } from '../site/seo';
import { navigateSite } from '../site/siteRoute';

type Props = {
  slug: string;
};

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="text-white font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export const BlogPostPage: React.FC<Props> = ({ slug }) => {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const next = await fetchPostBySlug(slug);
      if (cancelled) return;
      setPost(next);
      setLoading(false);
      if (next) {
        applyDocumentSeo({
          title: `${next.title} | Adaptivity Performance`,
          description: next.excerpt || next.title,
          path: blogPath(next.slug),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <section className="py-24 flex items-center justify-center text-slate-500 text-sm gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
        Loading article…
      </section>
    );
  }

  if (!post) {
    return (
      <section className="py-16 bg-[#0b0c10] border-t border-white/10">
        <div className="container mx-auto px-4 max-w-3xl space-y-4 text-center">
          <h1 className="font-heading text-2xl font-bold text-white">Post not found</h1>
          <button
            type="button"
            onClick={() => navigateSite('blog')}
            className="text-sm font-bold text-orange-400 hover:text-orange-300"
          >
            Back to blog
          </button>
        </div>
      </section>
    );
  }

  const blocks = splitMarkdownBlocks(post.body_md);

  return (
    <article className="py-16 bg-[#0b0c10] border-t border-white/10">
      <div className="container mx-auto px-4 max-w-3xl space-y-8">
        <button
          type="button"
          onClick={() => navigateSite('blog')}
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-orange-300"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          All posts
        </button>

        <header className="space-y-3">
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-white leading-tight">
            {post.title}
          </h1>
          {post.excerpt ? (
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">{post.excerpt}</p>
          ) : null}
          {post.published_at ? (
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
              {new Date(post.published_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
              {post.city_slug ? ` · ${post.city_slug}` : ''}
            </p>
          ) : null}
        </header>

        <div className="space-y-4 text-slate-300 text-sm sm:text-base leading-relaxed">
          {blocks.map((block, i) => {
            if (block.type === 'h1') {
              return (
                <h2 key={i} className="font-heading text-2xl font-bold text-white pt-2">
                  {renderInline(block.text)}
                </h2>
              );
            }
            if (block.type === 'h2') {
              return (
                <h3 key={i} className="font-heading text-lg font-bold text-white pt-1">
                  {renderInline(block.text)}
                </h3>
              );
            }
            return (
              <p key={i} className="text-slate-300">
                {renderInline(block.text)}
              </p>
            );
          })}
        </div>

        <p className="text-[11px] text-slate-600 pt-4 border-t border-white/5">
          {SITE_ORIGIN}
          {blogPath(post.slug)}
        </p>
      </div>
    </article>
  );
};
