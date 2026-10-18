import React, { useState, useEffect } from 'react';

const CONSENT_KEY = 'adaptivity_cookie_consent';

export const CookieConsentBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) {
      // Small delay so it doesn't flash immediately on page load
      const timer = setTimeout(() => setVisible(true), 1800);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  /* A slim bar, not a card: on a phone the old card covered half the first
     screen, booking form included. It sits above the phone's Call / Text /
     Book bar so that stays usable. */
  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-0 z-[60] px-3 pb-2 md:p-4 animate-[slideUpFade_0.4s_ease-out]"
    >
      <div className="max-w-3xl mx-auto bg-[#12141c]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/60 px-3 py-2.5 md:px-4 md:py-3 flex items-center gap-3">
        <p className="flex-1 min-w-0 text-[11px] md:text-xs text-slate-300 leading-snug">
          We use cookies to see how the site is used.{' '}
          <a href="/privacy" className="text-orange-400 hover:underline font-medium whitespace-nowrap">
            Privacy Policy
          </a>
        </p>
        <button
          id="cookie-decline-btn"
          type="button"
          onClick={decline}
          className="shrink-0 px-3 py-1.5 text-[11px] md:text-xs font-bold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
        >
          Decline
        </button>
        <button
          id="cookie-accept-btn"
          type="button"
          onClick={accept}
          className="shrink-0 px-3 py-1.5 text-[11px] md:text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 rounded-lg transition-colors"
        >
          Accept
        </button>
      </div>
    </div>
  );
};
