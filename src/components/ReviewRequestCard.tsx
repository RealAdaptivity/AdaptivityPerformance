import React from 'react';
import { Star, X, Share2 } from 'lucide-react';
import { GOOGLE_REVIEW_URL, shareAdaptivity } from '../site/seo';
import { CONVERSION_EVENTS, trackEvent } from '../site/analytics';

type Props = {
  /** The completed job we're asking about — also the dismissal key. */
  bookingId: string;
  vehicleDescription?: string;
  techName?: string | null;
};

const DISMISS_PREFIX = 'adaptivity.reviewAsk.dismissed.';

function isDismissed(bookingId: string): boolean {
  try {
    return window.localStorage.getItem(`${DISMISS_PREFIX}${bookingId}`) === '1';
  } catch {
    return false;
  }
}

/**
 * Post-job review ask. Google reviews are the single biggest local-pack ranking
 * input we can influence, and the moment right after a completed job is the only
 * time a customer is inclined to leave one.
 */
export const ReviewRequestCard: React.FC<Props> = ({ bookingId, vehicleDescription, techName }) => {
  const [hidden, setHidden] = React.useState(() => isDismissed(bookingId));

  if (hidden) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(`${DISMISS_PREFIX}${bookingId}`, '1');
    } catch {
      /* dismissal is a convenience, not state we depend on */
    }
    setHidden(true);
  };

  return (
    <div className="relative bg-gradient-to-b from-amber-500/10 to-transparent border border-amber-500/30 rounded-2xl p-5 space-y-3">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss review request"
        className="absolute top-3 right-3 p-1.5 text-slate-500 hover:text-white rounded-full hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-1 text-amber-400">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} className="w-4 h-4 fill-current" />
        ))}
      </div>

      <div className="space-y-1 pr-6">
        <p className="text-sm font-bold text-white">
          How did we do{vehicleDescription ? ` on the ${vehicleDescription}` : ''}?
        </p>
        <p className="text-xs text-slate-400 leading-relaxed">
          {techName ? `${techName} and the` : 'The'} team would appreciate 30 seconds of your time. Reviews
          are how neighbors in your zip find us — it is the whole marketing budget.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <a
          href={GOOGLE_REVIEW_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            trackEvent(CONVERSION_EVENTS.reviewClicked, { source: 'portal_post_job' });
            dismiss();
          }}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors"
        >
          <Star className="w-3.5 h-3.5" />
          Leave a Google review
        </a>
        <button
          type="button"
          onClick={() => {
            trackEvent(CONVERSION_EVENTS.referralShared, { source: 'portal_post_job', method: 'native' });
            void shareAdaptivity();
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 text-xs font-bold text-slate-200 hover:border-white/30 transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
          Tell a neighbor
        </button>
      </div>
    </div>
  );
};
