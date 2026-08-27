import React, { useEffect, useMemo, useState } from 'react';
import { navigateSite } from '../site/siteRoute';
import { applyDocumentSeo, SITE_PHONE_DISPLAY } from '../site/seo';
import { supabase } from '../services/supabaseClient';

function codeFromPath(pathname: string): string | null {
  const m = pathname.match(/\/r\/([A-Za-z0-9_-]{4,16})\/?$/);
  return m ? m[1].toUpperCase() : null;
}

type Props = {
  onOpenBooking: (opts?: { referralCode?: string }) => void;
};

export const ReferralLandingPage: React.FC<Props> = ({ onOpenBooking }) => {
  const code = useMemo(
    () => (typeof window !== 'undefined' ? codeFromPath(window.location.pathname) : null),
    []
  );
  const [valid, setValid] = useState<boolean | null>(null);

  useEffect(() => {
    applyDocumentSeo({
      title: code
        ? `Referral ${code} | Adaptivity Performance`
        : 'Referral | Adaptivity Performance',
      description:
        'Get $25 credit when you book with a friend’s Adaptivity referral code — mobile mechanic service across DFW.',
      path: code ? `/r/${code}` : '/r',
    });
  }, [code]);

  useEffect(() => {
    if (!code) {
      setValid(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from('referral_codes')
        .select('code')
        .eq('code', code)
        .eq('active', true)
        .maybeSingle();
      if (!cancelled) setValid(Boolean(data?.code));
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <main className="min-h-[70vh] bg-[#090a0f] text-slate-100">
      <div className="max-w-xl mx-auto px-4 py-16 space-y-6">
        <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-orange-400">
          Friend referral
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          {code ? `Code ${code}` : 'Missing referral code'}
        </h1>
        <p className="text-slate-400 text-sm leading-relaxed">
          Book a mobile visit with this code and you both earn <strong className="text-white">$25 credit</strong>{' '}
          after the job is completed. Zero due today · labor + parts priced on site.
        </p>
        {valid === false && code && (
          <p className="text-xs text-amber-300">
            We could not verify this code — you can still book and enter it at checkout.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onOpenBooking({ referralCode: code || undefined })}
            className="px-5 py-3 rounded-xl bg-orange-500 text-white text-sm font-bold"
          >
            Book with this code
          </button>
          <button
            type="button"
            onClick={() => navigateSite('home')}
            className="px-5 py-3 rounded-xl border border-white/15 text-sm font-bold text-slate-300"
          >
            Back home
          </button>
        </div>
        <p className="text-xs text-slate-500">Questions? Call {SITE_PHONE_DISPLAY}.</p>
      </div>
    </main>
  );
};

export function referralCodeFromPath(pathname: string): string | null {
  return codeFromPath(pathname);
}
