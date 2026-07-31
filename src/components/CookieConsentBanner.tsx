import React, { useState, useEffect } from 'react';
import { ShieldCheck, X, Cookie } from 'lucide-react';

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

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-[9999] p-4 sm:p-6 animate-[slideUpFade_0.4s_ease-out]"
    >
      <div className="max-w-3xl mx-auto bg-[#12141c]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/60 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
          <Cookie className="w-5 h-5 text-orange-400" />
        </div>

        {/* Text */}
        <div className="flex-1 space-y-1">
          <p className="text-sm font-bold text-white flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> We value your privacy
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            We use cookies and similar technologies for analytics and to improve your experience. By clicking <strong className="text-white">Accept</strong>, you consent to our use of cookies per our{' '}
            <a href="/privacy" className="text-orange-400 hover:underline font-medium">Privacy Policy</a>{' '}
            and{' '}
            <a href="/terms" className="text-orange-400 hover:underline font-medium">Terms of Service</a>.
            Declining disables non-essential analytics cookies only.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
          <button
            id="cookie-decline-btn"
            onClick={decline}
            className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold text-slate-400 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
          >
            Decline
          </button>
          <button
            id="cookie-accept-btn"
            onClick={accept}
            className="flex-1 sm:flex-none px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 rounded-xl shadow-lg shadow-orange-500/25 transition-all"
          >
            Accept All
          </button>
          <button
            onClick={decline}
            aria-label="Close cookie banner"
            className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-white/5 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
