import React, { useCallback, useEffect, useState } from 'react';
import { X, Gift, Share2, Copy, Check, MessageSquare, Mail, LogIn, Loader2 } from 'lucide-react';
import { SITE_ORIGIN, shareAdaptivity } from '../site/seo';
import { ensureReferralCode, getCreditBalance } from '../services/referrals';
import { supabase } from '../services/supabaseClient';
import { CONVERSION_EVENTS, trackEvent } from '../site/analytics';

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHARE_TEXT =
  'Adaptivity Performance fixed my car in my own driveway — no shop, no drop-off. Use my link and we both get $25 credit:';

export const ReferralModal: React.FC<ReferralModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [creditCents, setCreditCents] = useState(0);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'signedOut' | 'error'>('idle');

  /**
   * The code has to come from `ensure_referral_code()` — a shared static code
   * cannot be attributed to anyone, so neither side ever earns the credit.
   */
  const loadCode = useCallback(async () => {
    setState('loading');
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setState('signedOut');
      return;
    }
    try {
      const [issued, balance] = await Promise.all([ensureReferralCode(), getCreditBalance()]);
      setCode(issued);
      setCreditCents(balance);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    if (isOpen) void loadCode();
  }, [isOpen, loadCode]);

  if (!isOpen) return null;

  const referralLink = code ? `${SITE_ORIGIN}/r/${code}` : SITE_ORIGIN;
  const shareBody = `${SHARE_TEXT} ${referralLink}`;

  const share = (method: string, fn: () => void | Promise<unknown>) => {
    trackEvent(CONVERSION_EVENTS.referralShared, { method, attributed: Boolean(code) });
    void fn();
  };

  const handleCopy = () =>
    share('copy', async () => {
      try {
        await navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } catch {
        /* clipboard blocked — the input is selectable as a fallback */
      }
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#12141c] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center space-y-3 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 flex items-center justify-center text-white shadow-xl shadow-amber-500/25">
            <Gift className="w-8 h-8" />
          </div>
          <div>
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-amber-500/10 border border-amber-500/30 text-amber-400">
              Give $25, Get $25
            </span>
            <h3 className="font-heading text-2xl sm:text-3xl font-extrabold text-white mt-2">
              Share Adaptivity &amp; earn credit
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Your neighbor gets $25 off their first driveway visit. When their job completes, $25 lands on
              your account.
            </p>
          </div>
          {state === 'ready' && creditCents > 0 && (
            <p className="text-xs font-bold text-emerald-400">
              ${(creditCents / 100).toFixed(2)} credit available on your account
            </p>
          )}
        </div>

        {state === 'loading' && (
          <div className="flex items-center justify-center gap-2 py-8 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating your code…
          </div>
        )}

        {state === 'signedOut' && (
          <div className="bg-[#181b26] rounded-2xl border border-white/10 p-5 space-y-3 text-center">
            <LogIn className="w-6 h-6 text-amber-400 mx-auto" />
            <p className="text-sm font-bold text-white">Sign in to get your code</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Referral credit has to be tied to an account — that is the only way we can put the $25 on
              your balance when your neighbor&rsquo;s job completes.
            </p>
            <a
              href="/login"
              className="inline-block px-5 py-2.5 rounded-xl bg-amber-500 text-white text-xs font-bold"
            >
              Sign in or create an account
            </a>
          </div>
        )}

        {state === 'error' && (
          <div className="bg-[#181b26] rounded-2xl border border-amber-500/30 p-5 text-center space-y-3">
            <p className="text-sm text-slate-300">We couldn&rsquo;t reach your account just now.</p>
            <button
              type="button"
              onClick={() => void loadCode()}
              className="px-5 py-2.5 rounded-xl border border-white/15 text-xs font-bold text-slate-200"
            >
              Try again
            </button>
          </div>
        )}

        {state === 'ready' && (
          <div className="bg-[#181b26] rounded-2xl border border-white/10 p-4 space-y-3 text-xs">
            <label htmlFor="referral-link" className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">
              Your shareable referral link
            </label>
            <div className="flex items-center gap-2">
              <input
                id="referral-link"
                type="text"
                readOnly
                value={referralLink}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 min-w-0 bg-[#0b0c10] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-amber-300 font-mono focus:outline-none"
              />
              <button
                onClick={handleCopy}
                className="px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold hover:bg-amber-500/25 flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={`sms:?&body=${encodeURIComponent(shareBody)}`}
                onClick={() => share('sms', () => {})}
                className="py-2.5 rounded-xl border border-white/10 text-slate-200 font-bold flex items-center justify-center gap-1.5 hover:border-white/25 transition-colors"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                Text it
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent(
                  'A mobile mechanic that actually comes to you'
                )}&body=${encodeURIComponent(shareBody)}`}
                onClick={() => share('email', () => {})}
                className="py-2.5 rounded-xl border border-white/10 text-slate-200 font-bold flex items-center justify-center gap-1.5 hover:border-white/25 transition-colors"
              >
                <Mail className="w-4 h-4 text-sky-400" />
                Email it
              </a>
            </div>

            <button
              onClick={() =>
                share('native', () =>
                  shareAdaptivity({
                    title: 'Adaptivity Performance — $25 off mobile repair',
                    text: SHARE_TEXT,
                    url: referralLink,
                  })
                )
              }
              className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-transform hover:scale-[1.02]"
            >
              <Share2 className="w-4 h-4" />
              <span>Share to Nextdoor, Facebook, or a group chat</span>
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-[11px] text-slate-400">
            Credit posts to your balance automatically once your neighbor&rsquo;s service is completed.
          </p>
        </div>
      </div>
    </div>
  );
};
