import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, MapPin, Phone, ShieldCheck, Wrench } from 'lucide-react';
import { LOCAL_CITIES, LOCAL_HUB } from '../site/localSeo';
import { SITE_PHONE_DISPLAY, SITE_PHONE_TEL } from '../site/seo';
import { lookupServiceZip, travelFeeForMiles } from '../services/serviceArea';
import { DIAGNOSTIC_FEE_DOLLARS } from '../services/serviceCatalog';
import {
  checkHeroCoverage,
  heroPrefill,
  type BookingPrefill,
  type HeroCoverage,
} from '../site/homeContent';

interface HeroProps {
  onBook: (prefill: BookingPrefill, source: string) => void;
}

/**
 * The top of the homepage. The right half is the first step of booking rather
 * than a button that leads to it: the one thing this page is for is getting a
 * driver from "my truck is making a noise" to a booked visit.
 *
 * There is deliberately no photo here any more. The old hero's background image
 * was the page's LCP element; the headline is now, and it paints without waiting
 * on a download. index.html no longer preloads the image for the same reason.
 */
export const Hero: React.FC<HeroProps> = ({ onBook }) => {
  const [zip, setZip] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [issue, setIssue] = useState('');
  /* null until they press the button; changing the ZIP clears it, so an answer
     on screen always belongs to the ZIP in the box. */
  const [result, setResult] = useState<HeroCoverage | null>(null);

  const radius = LOCAL_HUB.radiusMiles;
  const townCount = LOCAL_CITIES.length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (result?.kind === 'covered') {
      onBook(heroPrefill({ zip: result.zip, vehicle, issue }), 'home_hero');
      return;
    }
    setResult(checkHeroCoverage(zip, (z) => lookupServiceZip(z)));
  };

  const zipError =
    result?.kind === 'empty'
      ? 'Enter your ZIP code and we’ll check it.'
      : result?.kind === 'invalid'
        ? `That doesn’t look like a ZIP — five digits, like ${LOCAL_HUB.zip}.`
        : null;

  return (
    <section className="bg-[#0b0c10] border-b border-white/[0.06]">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 pt-10 pb-14 lg:pt-16 lg:pb-20">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_442px] lg:gap-x-14 lg:gap-y-8">
          <div className="lg:col-start-1 lg:row-start-1 self-end">
            <span className="inline-block text-[11px] sm:text-xs font-bold uppercase tracking-[0.14em] text-brand border border-brand/40 bg-brand/[0.08] rounded-full px-3.5 py-1.5">
              Mobile auto repair · {LOCAL_HUB.city}, {LOCAL_HUB.state}
            </span>
            <h1 className="mt-5 sm:mt-6 font-heading font-bold text-white text-[40px] leading-[1.04] tracking-[-0.035em] sm:text-6xl lg:text-[66px]">
              We bring the shop
              <br className="hidden sm:block" /> to your driveway.
            </h1>
            <p className="mt-4 sm:mt-5 max-w-xl text-[15px] sm:text-lg leading-relaxed text-slate-300">
              ASE-certified techs and the full toolset, anywhere within {radius} miles of{' '}
              {LOCAL_HUB.city}. Diagnostics, brakes, fluids and maintenance — fixed where the
              vehicle already sits, with <strong className="font-semibold text-white">no towing</strong>.
            </p>
          </div>

          <div id="book" className="lg:col-start-2 lg:row-start-1 lg:row-span-2 scroll-mt-24">
            <form
              onSubmit={handleSubmit}
              noValidate
              className="rounded-[22px] border border-white/[0.11] bg-[#12141c] p-5 sm:p-7"
            >
              <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-white">
                Check your address, get a time
              </h2>
              <p className="mt-1.5 text-sm text-slate-400">Takes about a minute. No account needed.</p>

              <div className="mt-5 space-y-4">
                <div>
                  <label htmlFor="hero-zip" className="block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400 mb-2">
                    Your ZIP code
                  </label>
                  <input
                    id="hero-zip"
                    type="text"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    maxLength={10}
                    placeholder={LOCAL_HUB.zip}
                    value={zip}
                    onChange={(e) => {
                      setZip(e.target.value);
                      setResult(null);
                    }}
                    aria-invalid={zipError ? true : undefined}
                    aria-describedby={zipError ? 'hero-zip-error' : undefined}
                    className={`w-full min-h-[52px] rounded-xl bg-[#0b0c10] px-4 text-base font-medium text-white placeholder:text-slate-500 border focus:outline-none focus:ring-2 focus:ring-brand/60 ${
                      zipError ? 'border-amber-400/70' : 'border-white/[0.14]'
                    }`}
                  />
                  {zipError && (
                    <p id="hero-zip-error" className="mt-2 text-xs font-medium text-amber-300">
                      {zipError}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="hero-vehicle" className="block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400 mb-2">
                    Year, make &amp; model
                  </label>
                  <input
                    id="hero-vehicle"
                    type="text"
                    autoComplete="off"
                    placeholder="2018 Ram 1500 Big Horn"
                    value={vehicle}
                    onChange={(e) => setVehicle(e.target.value)}
                    className="w-full min-h-[52px] rounded-xl bg-[#0b0c10] px-4 text-base font-medium text-white placeholder:text-slate-500 border border-white/[0.14] focus:outline-none focus:ring-2 focus:ring-brand/60"
                  />
                </div>

                <div>
                  <label htmlFor="hero-issue" className="block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400 mb-2">
                    What’s it doing?
                  </label>
                  <input
                    id="hero-issue"
                    type="text"
                    autoComplete="off"
                    placeholder="Grinding when I brake"
                    value={issue}
                    onChange={(e) => setIssue(e.target.value)}
                    className="w-full min-h-[52px] rounded-xl bg-[#0b0c10] px-4 text-base font-medium text-white placeholder:text-slate-500 border border-white/[0.14] focus:outline-none focus:ring-2 focus:ring-brand/60"
                  />
                </div>
              </div>

              <div aria-live="polite" className="empty:hidden mt-4">
                {result?.kind === 'covered' && (
                  <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3">
                    <p className="flex items-center gap-2 text-sm font-bold text-emerald-200">
                      <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                      Yes — we cover {result.city}.
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-emerald-100/80">
                      {result.distanceMiles === 0
                        ? 'That’s our home town'
                        : `${result.distanceMiles} mi from our shop in ${LOCAL_HUB.city}`}
                      {travelFeeForMiles(result.distanceMiles) === 0
                        ? ' — travel is included.'
                        : ` — travel is $${travelFeeForMiles(result.distanceMiles)}.`}
                    </p>
                  </div>
                )}
                {result?.kind === 'outside' && (
                  <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3">
                    <p className="text-sm font-bold text-amber-200">We don’t reach {result.zip} yet.</p>
                    <p className="mt-1 text-xs leading-relaxed text-amber-100/80">
                      We dispatch within {radius} miles of {LOCAL_HUB.city}. If you’re just past the
                      edge, call us — we may still be able to help.
                    </p>
                    <a
                      href={SITE_PHONE_TEL}
                      className="mt-2 inline-flex min-h-[44px] items-center gap-2 text-sm font-bold text-amber-200 hover:text-white"
                    >
                      <Phone className="w-4 h-4" aria-hidden="true" /> Call {SITE_PHONE_DISPLAY}
                    </a>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="mt-5 w-full min-h-[56px] rounded-2xl bg-brand text-[#0b0c10] text-base font-extrabold inline-flex items-center justify-center gap-2 hover:brightness-110 active:brightness-95 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#12141c]"
              >
                {result?.kind === 'covered' ? 'Pick a time' : 'See if we cover you'}
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </button>

              <p className="mt-4 text-center text-[13px] leading-relaxed text-slate-400">
                <strong className="font-bold text-brand-soft">${DIAGNOSTIC_FEE_DOLLARS}</strong> brings a tech
                out and tells you exactly what’s wrong. The repair price is agreed with you before any
                work starts.
              </p>
            </form>
          </div>

          <ul className="lg:col-start-1 lg:row-start-2 self-start flex flex-wrap gap-2.5" aria-label="Why Adaptivity">
            <li className="inline-flex items-center gap-2 rounded-full border border-white/[0.09] bg-[#171a21] px-4 py-2 text-[13px] font-semibold text-slate-200">
              <ShieldCheck className="w-4 h-4 text-brand-soft" aria-hidden="true" />
              12-month / 12,000-mile warranty
            </li>
            <li className="inline-flex items-center gap-2 rounded-full border border-white/[0.09] bg-[#171a21] px-4 py-2 text-[13px] font-semibold text-slate-200">
              <Wrench className="w-4 h-4 text-brand-soft" aria-hidden="true" />
              ASE-certified technicians
            </li>
            <li className="inline-flex items-center gap-2 rounded-full border border-white/[0.09] bg-[#171a21] px-4 py-2 text-[13px] font-semibold text-slate-200">
              <MapPin className="w-4 h-4 text-brand-soft" aria-hidden="true" />
              {townCount} towns, {radius}-mile radius
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
};
