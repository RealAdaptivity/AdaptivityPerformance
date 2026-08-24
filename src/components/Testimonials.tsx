import React from 'react';
import { Star, ExternalLink, Share2, ShieldCheck } from 'lucide-react';
import { GOOGLE_REVIEW_URL, shareAdaptivity } from '../site/seo';

/**
 * Real reviews only. We link customers to our Google Business Profile to read
 * and leave verified reviews rather than displaying any on-site testimonials,
 * so nothing here is fabricated.
 */
export const Testimonials: React.FC = () => {
  return (
    <section className="py-20 bg-[#0e1017] border-t border-white/5">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            <span>Google Reviews — Justin & Northlake DFW</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white">
            Trusted By Your <span className="text-orange-500">Neighbors.</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            We let our work speak for itself. Read verified reviews from vehicle owners across Justin,
            Northlake, Denton, and the DFW area on our Google Business Profile — and if we've earned it,
            we'd be grateful if you left one too.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              href={GOOGLE_REVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-sm font-bold shadow-lg shadow-orange-500/25 transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff"/>
              </svg>
              Read & write Google reviews
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>
            <button
              type="button"
              onClick={() => void shareAdaptivity()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-slate-300 text-sm font-bold hover:border-orange-500/40 hover:text-orange-300 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share Adaptivity
            </button>
          </div>

          <p className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 pt-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Insured · Licensed &amp; Bonded · ASE-Certified
          </p>
        </div>
      </div>
    </section>
  );
};
