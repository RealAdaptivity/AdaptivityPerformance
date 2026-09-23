import React from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  Truck,
  Wrench,
} from 'lucide-react';
import {
  LOCAL_HUB,
  cityPathOf,
  priceRangeLabel,
  sameServiceNearby,
  serviceCityFaqs,
  serviceCityPath,
  siblingServices,
  travelLabel,
  type LocalCity,
  type LocalService,
} from '../site/localSeo';
import { SITE_PHONE_DISPLAY, SITE_PHONE_TEL } from '../site/seo';
import { CONVERSION_EVENTS, trackEvent } from '../site/analytics';
import { LocalLink } from '../site/LocalLink';

type Props = {
  service: LocalService;
  city: LocalCity;
  onOpenBooking: (opts?: { source?: string; service?: string; city?: string }) => void;
};

export const ServiceCityPage: React.FC<Props> = ({ service, city, onOpenBooking }) => {
  const faqs = serviceCityFaqs(service, city);
  const nearby = sameServiceNearby(city);
  const siblings = siblingServices(service);

  React.useEffect(() => {
    trackEvent(CONVERSION_EVENTS.serviceCityView, { service: service.slug, city: city.slug });
  }, [service.slug, city.slug]);

  const book = (source = 'service_city') =>
    onOpenBooking({ source, service: service.slug, city: city.slug });

  return (
    <section className="bg-[#0b0c10] border-t border-white/10">
      <div className="container mx-auto px-4 max-w-4xl py-14 space-y-12">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
          <LocalLink href="/" className="hover:text-orange-400">
            Home
          </LocalLink>
          <span aria-hidden>/</span>
          <LocalLink href={cityPathOf(city.slug)} className="hover:text-orange-400">
            {city.city}
          </LocalLink>
          <span aria-hidden>/</span>
          <span className="text-slate-300">{service.shortName}</span>
        </nav>

        {/* Hero */}
        <header className="space-y-5">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 border border-orange-500/30 px-3 py-1.5 rounded-full">
            <MapPin className="w-3.5 h-3.5" />
            {city.city}, TX · {city.distanceMiles} mi from the Justin hub
          </span>
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-white leading-tight">
            {service.name} in <span className="text-orange-500">{city.city}, TX</span>
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">{service.blurb}</p>

          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="rounded-2xl border border-white/10 bg-[#12141c] p-4">
              <dt className="text-slate-400">Typical price</dt>
              <dd className="font-heading text-lg font-bold text-white mt-0.5">
                {priceRangeLabel(service)}
              </dd>
              <dd className="text-slate-500 mt-0.5">{service.priceUnit}</dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#12141c] p-4">
              <dt className="text-slate-400">Time on site</dt>
              <dd className="font-heading text-lg font-bold text-white mt-0.5 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-orange-400" />
                {service.durationLabel}
              </dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#12141c] p-4 col-span-2 sm:col-span-1">
              <dt className="text-slate-400">Drive time to you</dt>
              <dd className="font-heading text-lg font-bold text-white mt-0.5 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-orange-400" />~{city.driveMinutes} min
              </dd>
            </div>
          </dl>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => book()}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold shadow-lg shadow-orange-500/20 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Book {service.shortName.toLowerCase()} in {city.city}
            </button>
            <a
              href={SITE_PHONE_TEL}
              onClick={() =>
                trackEvent(CONVERSION_EVENTS.callClicked, {
                  source: 'service_city',
                  service: service.slug,
                  city: city.slug,
                })
              }
              className="inline-flex items-center justify-center gap-2 px-5 py-4 rounded-xl border border-white/15 text-sm font-bold text-slate-200 hover:border-white/30 transition-colors"
            >
              <Phone className="w-4 h-4" />
              {SITE_PHONE_DISPLAY}
            </a>
          </div>
          <p className="text-xs text-slate-500">{travelLabel(city)}</p>
        </header>

        {/* Trust row */}
        <div className="grid sm:grid-cols-3 gap-3 text-xs">
          {[
            [ShieldCheck, '12 mo / 12k warranty', 'Parts and labor, in writing'],
            [Wrench, 'Priced before we start', 'You approve the number first'],
            [Truck, 'We come to you', `${city.neighborhoods.split(',')[0].trim()} included`],
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

        {/* Symptoms */}
        <div className="space-y-4">
          <h2 className="font-heading text-xl font-bold text-white">
            Book this if you&rsquo;re seeing any of these
          </h2>
          <ul className="grid sm:grid-cols-2 gap-2.5">
            {service.symptoms.map((symptom) => (
              <li
                key={symptom}
                className="flex items-start gap-2.5 text-sm text-slate-300 rounded-xl border border-white/10 bg-[#12141c] px-4 py-3"
              >
                <CheckCircle2 className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                {symptom}
              </li>
            ))}
          </ul>
        </div>

        {/* What's included */}
        <div className="space-y-4">
          <h2 className="font-heading text-xl font-bold text-white">
            What a {service.keyword} visit in {city.city} includes
          </h2>
          <ul className="space-y-2.5">
            {service.included.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <div className="rounded-2xl border border-orange-500/25 bg-orange-500/5 p-5 text-sm text-slate-300 leading-relaxed">
            {city.blurb} We work {city.neighborhoods}, and every {city.zips.length > 1 ? 'zip' : 'address'} in{' '}
            {city.zips.join(', ')} is inside the {LOCAL_HUB.radiusMiles}-mile dispatch ring.
          </div>
        </div>

        {/* FAQ */}
        <div className="space-y-4">
          <h2 className="font-heading text-xl font-bold text-white">
            {service.shortName} in {city.city} — common questions
          </h2>
          <div className="space-y-2.5">
            {faqs.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-2xl border border-white/10 bg-[#12141c] px-5 py-4"
              >
                <summary className="cursor-pointer list-none font-bold text-sm text-white flex items-center justify-between gap-3">
                  {faq.q}
                  <span className="text-orange-400 text-lg leading-none group-open:rotate-45 transition-transform">
                    +
                  </span>
                </summary>
                <p className="text-sm text-slate-400 leading-relaxed mt-3">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Closing CTA */}
        <div className="rounded-3xl border border-orange-500/30 bg-gradient-to-b from-orange-500/10 to-transparent p-6 sm:p-8 text-center space-y-4">
          <h2 className="font-heading text-2xl font-black text-white">
            Ready for {service.shortName.toLowerCase()} in {city.city}?
          </h2>
          <p className="text-sm text-slate-300 max-w-lg mx-auto">
            Book the $100 diagnostic visit and we&rsquo;ll be in your driveway in about {city.driveMinutes} minutes
            of drive time. The hold comes straight off the repair.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => book('service_city_footer')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold shadow-lg shadow-orange-500/20 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Book now
            </button>
            <a
              href={SITE_PHONE_TEL}
              onClick={() =>
                trackEvent(CONVERSION_EVENTS.callClicked, { source: 'service_city_footer' })
              }
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-white/15 text-sm font-bold text-slate-200 hover:border-white/30 transition-colors"
            >
              <Phone className="w-4 h-4" />
              Call {SITE_PHONE_DISPLAY}
            </a>
          </div>
        </div>

        {/* Internal links */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-[#12141c] p-5 space-y-3">
            <h2 className="font-heading text-base font-bold text-white">
              Other work we do in {city.city}
            </h2>
            <div className="flex flex-wrap gap-2">
              {siblings.map((s) => (
                <LocalLink
                  key={s.slug}
                  href={serviceCityPath(s.slug, city.slug)}
                  className="text-xs font-bold px-3 py-1.5 rounded-full border border-white/10 text-slate-300 hover:border-orange-500/40 hover:text-orange-300 transition-colors"
                >
                  {s.shortName}
                </LocalLink>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#12141c] p-5 space-y-3">
            <h2 className="font-heading text-base font-bold text-white">
              {service.shortName} in nearby towns
            </h2>
            <div className="flex flex-wrap gap-2">
              {nearby.map((c) => (
                <LocalLink
                  key={c.slug}
                  href={serviceCityPath(service.slug, c.slug)}
                  className="text-xs font-bold px-3 py-1.5 rounded-full border border-white/10 text-slate-300 hover:border-orange-500/40 hover:text-orange-300 transition-colors"
                >
                  {c.city}
                </LocalLink>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
