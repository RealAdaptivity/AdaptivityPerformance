import React from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  Share2,
  Star,
  Truck,
} from 'lucide-react';
import {
  LOCAL_HUB,
  cityPathOf,
  nearbyCities,
  priceRangeLabel,
  serviceCityPath,
  travelBand,
  travelLabel,
  LOCAL_SERVICES,
  SERVICE_PAGE_CITIES,
  type LocalCity,
} from '../site/localSeo';
import { GOOGLE_REVIEW_URL, SITE_PHONE_DISPLAY, SITE_PHONE_TEL, shareAdaptivity } from '../site/seo';
import { CONVERSION_EVENTS, trackEvent } from '../site/analytics';
import { navigateSite } from '../site/siteRoute';
import { LocalLink } from '../site/LocalLink';

type Props = {
  city: LocalCity;
  onOpenBooking: (opts?: { source?: string; city?: string }) => void;
};

export const CityLandingPage: React.FC<Props> = ({ city, onOpenBooking }) => {
  const nearby = nearbyCities(city);
  const hasServicePages = SERVICE_PAGE_CITIES.some((c) => c.slug === city.slug);
  const [shareState, setShareState] = React.useState<'idle' | 'shared' | 'copied'>('idle');

  const book = (source: string) => onOpenBooking({ source, city: city.slug });

  return (
    <section className="bg-[#0b0c10] border-t border-white/10">
      <div className="container mx-auto px-4 max-w-4xl py-14 space-y-12">
        {/* Hero — one primary CTA, one secondary */}
        <header className="space-y-5">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 border border-orange-500/30 px-3 py-1.5 rounded-full">
            <MapPin className="w-3.5 h-3.5" />
            Mobile mechanic · {city.city}, TX
          </span>
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-white leading-tight">
            Mobile Mechanic in <span className="text-orange-500">{city.city}, TX</span>
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">{city.blurb}</p>

          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-2xl border border-white/10 bg-[#12141c] p-4">
              <dt className="text-slate-400">Distance from hub</dt>
              <dd className="font-heading text-lg font-bold text-white mt-0.5">
                {city.distanceMiles} mi
              </dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#12141c] p-4">
              <dt className="text-slate-400">Typical drive</dt>
              <dd className="font-heading text-lg font-bold text-white mt-0.5 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-orange-400" />~{city.driveMinutes}m
              </dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#12141c] p-4">
              <dt className="text-slate-400">Travel fee</dt>
              <dd
                className={`font-heading text-lg font-bold mt-0.5 ${
                  travelBand(city) === 'free' ? 'text-emerald-400' : 'text-orange-400'
                }`}
              >
                {travelBand(city) === 'free' ? '$0' : '$2/mi'}
              </dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#12141c] p-4">
              <dt className="text-slate-400">Diagnostic</dt>
              <dd className="font-heading text-lg font-bold text-white mt-0.5">$85</dd>
            </div>
          </dl>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => book('city_hero')}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold shadow-lg shadow-orange-500/20 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Book {city.city} service — $85 hold
            </button>
            <a
              href={SITE_PHONE_TEL}
              onClick={() => trackEvent(CONVERSION_EVENTS.callClicked, { source: 'city_hero', city: city.slug })}
              className="inline-flex items-center justify-center gap-2 px-5 py-4 rounded-xl border border-white/15 text-sm font-bold text-slate-200 hover:border-white/30 transition-colors"
            >
              <Phone className="w-4 h-4" />
              {SITE_PHONE_DISPLAY}
            </a>
          </div>

          <p className="text-xs text-slate-500">
            {travelLabel(city)} Zips: {city.zips.join(', ')} · Neighborhoods: {city.neighborhoods}
          </p>
        </header>

        {/* Trust */}
        <div className="grid sm:grid-cols-3 gap-3 text-xs">
          {[
            [ShieldCheck, '12 mo / 12k warranty', 'Parts and labor, in writing'],
            [Truck, 'Driveway dispatch', `We come to ${city.city} — no drop-off`],
            [CheckCircle2, 'Priced before we start', 'The $85 hold comes off the repair'],
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
        </div>

        {/* Services — deep links into the service × city pages */}
        <div className="space-y-4">
          <h2 className="font-heading text-xl font-bold text-white">
            What we fix in {city.city}
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {LOCAL_SERVICES.map((service) => {
              const body = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-bold text-white text-sm">{service.name}</p>
                    <span className="text-xs font-bold text-orange-400 whitespace-nowrap">
                      {priceRangeLabel(service)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {service.blurb.split('. ')[0]}.
                  </p>
                  <p className="text-[11px] text-slate-500">{service.durationLabel} on site</p>
                </>
              );

              return hasServicePages ? (
                <LocalLink
                  key={service.slug}
                  href={serviceCityPath(service.slug, city.slug)}
                  className="block text-left rounded-2xl border border-white/10 bg-[#12141c] p-4 space-y-1.5 hover:border-orange-500/40 transition-colors"
                >
                  {body}
                </LocalLink>
              ) : (
                <div
                  key={service.slug}
                  className="rounded-2xl border border-white/10 bg-[#12141c] p-4 space-y-1.5"
                >
                  {body}
                </div>
              );
            })}
          </div>
        </div>

        {/* Closing CTA */}
        <div className="rounded-3xl border border-orange-500/30 bg-gradient-to-b from-orange-500/10 to-transparent p-6 sm:p-8 text-center space-y-4">
          <h2 className="font-heading text-2xl font-black text-white">
            Get a van to your {city.city} driveway
          </h2>
          <p className="text-sm text-slate-300 max-w-lg mx-auto">
            {city.city} is {city.distanceMiles} miles from the Justin hub — roughly {city.driveMinutes} minutes.
            Book the $85 diagnostic hold and it comes straight off the repair.
          </p>
          <button
            type="button"
            onClick={() => book('city_footer')}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold shadow-lg shadow-orange-500/20 transition-colors"
          >
            <Calendar className="w-4 h-4" />
            Book {city.city} service
          </button>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-1">
            <button
              type="button"
              onClick={() => {
                trackEvent(CONVERSION_EVENTS.referralShared, { source: 'city_page', city: city.slug });
                void shareAdaptivity({
                  title: `Mobile mechanic ${city.city} TX`,
                  text: `Adaptivity Performance — mobile mechanic in ${city.city}, TX. $85 diagnostic hold, and they come to your driveway.`,
                  url: `https://adaptivityperformance.com${cityPathOf(city.slug)}`,
                }).then((r) => setShareState(r === 'shared' ? 'shared' : r === 'copied' ? 'copied' : 'idle'));
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-orange-500/40 text-xs font-bold text-orange-300 hover:bg-orange-500/5 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              {shareState === 'copied' ? 'Link copied' : shareState === 'shared' ? 'Thanks!' : 'Share with a neighbor'}
            </button>
            <a
              href={GOOGLE_REVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent(CONVERSION_EVENTS.reviewClicked, { source: 'city_page' })}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-slate-300 hover:border-white/25 transition-colors"
            >
              <Star className="w-3.5 h-3.5" />
              Leave a Google review
            </a>
          </div>
        </div>

        {/* Nearby */}
        <div className="rounded-2xl border border-white/10 bg-[#12141c] p-5 space-y-3">
          <h2 className="font-heading text-base font-bold text-white">
            Also serving, inside the same {LOCAL_HUB.radiusMiles}-mile radius
          </h2>
          <div className="flex flex-wrap gap-2">
            {nearby.map((c) => (
              <LocalLink
                key={c.slug}
                href={cityPathOf(c.slug)}
                className="text-xs font-bold px-3 py-1.5 rounded-full border border-white/10 text-slate-300 hover:border-orange-500/40 hover:text-orange-300 transition-colors"
              >
                {c.city}
              </LocalLink>
            ))}
            <button
              type="button"
              onClick={() => navigateSite('coverage')}
              className="text-xs font-bold px-3 py-1.5 rounded-full border border-orange-500/30 text-orange-300"
            >
              Full coverage map
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
