import React from 'react';
import { Calendar, CheckCircle2, Phone, ShieldCheck, Star, Truck } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { LOCAL_HUB } from '../site/localSeo';
import { SITE_PHONE_DISPLAY, SITE_PHONE_TEL } from '../site/seo';
import { CONVERSION_EVENTS, trackEvent } from '../site/analytics';
import { campaignParams, type AdLanding } from '../site/adLandings';

type Props = {
  landing: AdLanding;
  onOpenBooking: (opts?: Record<string, string>) => void;
};

/**
 * Paid-click landing page. No nav, no footer links, no cross-sell — one offer
 * and two ways to act on it, because every other link is a way to leave.
 */
export const AdLandingPage: React.FC<Props> = ({ landing, onOpenBooking }) => {
  const campaign = React.useMemo(() => campaignParams(), []);

  React.useEffect(() => {
    trackEvent(CONVERSION_EVENTS.adLandingView, { landing: landing.slug, ...campaign });
  }, [landing.slug, campaign]);

  const book = (source: string) => onOpenBooking({ source, landing: landing.slug, ...campaign });
  const call = (source: string) =>
    trackEvent(CONVERSION_EVENTS.callClicked, { source, landing: landing.slug, ...campaign });

  return (
    <main className="min-h-screen bg-[#0b0c10] text-slate-100">
      {/* Minimal header — logo and a tap-to-call, nothing to click away with */}
      <header className="border-b border-white/10">
        <div className="container mx-auto px-4 max-w-3xl py-4 flex items-center justify-between gap-3">
          <BrandLogo size={32} withWordmark />
          <a
            href={SITE_PHONE_TEL}
            onClick={() => call('ad_header')}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-orange-300 hover:text-orange-200"
          >
            <Phone className="w-4 h-4" />
            {SITE_PHONE_DISPLAY}
          </a>
        </div>
      </header>

      <div className="container mx-auto px-4 max-w-3xl py-12 space-y-10">
        <section className="space-y-5">
          <h1 className="font-heading text-3xl sm:text-4xl font-black leading-tight">{landing.headline}</h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">{landing.subhead}</p>

          <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 px-5 py-4">
            <p className="text-xs uppercase tracking-wider font-bold text-orange-400">Your price</p>
            <p className="font-heading text-xl font-black text-white mt-1">{landing.offer}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => book('ad_hero')}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold shadow-lg shadow-orange-500/25 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              {landing.ctaLabel}
            </button>
            <a
              href={SITE_PHONE_TEL}
              onClick={() => call('ad_hero')}
              className="inline-flex items-center justify-center gap-2 px-5 py-4 rounded-xl border border-white/20 text-sm font-bold text-slate-100 hover:border-white/40 transition-colors"
            >
              <Phone className="w-4 h-4" />
              Call {SITE_PHONE_DISPLAY}
            </a>
          </div>

          <div className="flex flex-wrap gap-2">
            {landing.proof.map((p) => (
              <span
                key={p}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 border border-white/10 rounded-full px-3 py-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                {p}
              </span>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <ul className="space-y-2.5">
            {landing.bullets.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                {b}
              </li>
            ))}
          </ul>
        </section>

        <section className="grid sm:grid-cols-3 gap-3 text-xs">
          {[
            [ShieldCheck, '12 mo / 12k warranty', 'Parts and labor, in writing'],
            [Truck, 'We come to you', `Anywhere within ${LOCAL_HUB.radiusMiles} mi of Justin`],
            [Star, 'Priced up front', 'You approve before we start'],
          ].map(([Icon, title, sub]) => {
            const I = Icon as typeof ShieldCheck;
            return (
              <div key={title as string} className="rounded-2xl border border-white/10 bg-[#12141c] p-4 space-y-1">
                <I className="w-4 h-4 text-orange-400" />
                <p className="font-bold text-white">{title as string}</p>
                <p className="text-slate-400">{sub as string}</p>
              </div>
            );
          })}
        </section>

        <section className="rounded-3xl border border-orange-500/30 bg-gradient-to-b from-orange-500/10 to-transparent p-6 sm:p-8 text-center space-y-4">
          <h2 className="font-heading text-2xl font-black text-white">{landing.ctaLabel}</h2>
          <p className="text-sm text-slate-300">{landing.offer}.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => book('ad_footer')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold shadow-lg shadow-orange-500/25 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Book now
            </button>
            <a
              href={SITE_PHONE_TEL}
              onClick={() => call('ad_footer')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-white/20 text-sm font-bold text-slate-100 hover:border-white/40 transition-colors"
            >
              <Phone className="w-4 h-4" />
              {SITE_PHONE_DISPLAY}
            </a>
          </div>
        </section>

        <footer className="text-center text-[11px] text-slate-600 space-y-1 pb-8">
          <p>Adaptivity Performance LLC · {LOCAL_HUB.city}, {LOCAL_HUB.state} {LOCAL_HUB.zip}</p>
          <p>
            <a href="/terms" className="hover:text-slate-400">Terms</a> ·{' '}
            <a href="/privacy" className="hover:text-slate-400">Privacy</a> ·{' '}
            <a href="/refund-policy" className="hover:text-slate-400">Refunds</a>
          </p>
        </footer>
      </div>
    </main>
  );
};
