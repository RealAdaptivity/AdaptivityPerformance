import React from 'react';
import { MapPin, Phone, Calendar, Share2 } from 'lucide-react';
import {
  CITY_LANDINGS,
  cityPath,
  shareAdaptivity,
  SITE_PHONE_DISPLAY,
  SITE_PHONE_TEL,
  type CityLanding,
} from '../site/seo';
import { navigateSite } from '../site/siteRoute';

type Props = {
  city: CityLanding;
  onOpenBooking: () => void;
};

export const CityLandingPage: React.FC<Props> = ({ city, onOpenBooking }) => {
  const others = CITY_LANDINGS.filter((c) => c.slug !== city.slug).slice(0, 6);

  return (
    <section className="py-16 bg-[#0b0c10] border-t border-white/10">
      <div className="container mx-auto px-4 max-w-4xl space-y-10">
        <div className="space-y-4">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 border border-orange-500/30 px-3 py-1.5 rounded-full">
            <MapPin className="w-3.5 h-3.5" />
            Mobile mechanic · {city.city}, TX
          </span>
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-white leading-tight">
            Mobile Mechanic in <span className="text-orange-500">{city.city}, TX</span>
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">{city.blurb}</p>
          <p className="text-xs text-slate-500">
            Zips: {city.zips.join(', ')} · Neighborhoods: {city.neighborhoods}
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 text-xs">
          {[
            ['$100 diagnostic hold', 'Tech sets labor + parts on site'],
            ['Driveway dispatch', 'We come to you across DFW'],
            ['12-mo / 12k warranty', 'Parts & labor backed'],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-white/10 bg-[#12141c] p-4 space-y-1">
              <p className="font-bold text-white">{t}</p>
              <p className="text-slate-400">{d}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onOpenBooking}
            className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-orange-500 text-white text-sm font-bold"
          >
            <Calendar className="w-4 h-4" />
            Book {city.city} service
          </button>
          <a
            href={`tel:${SITE_PHONE_TEL}`}
            className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-white/15 text-sm font-bold text-slate-200"
          >
            <Phone className="w-4 h-4" />
            Call {SITE_PHONE_DISPLAY}
          </a>
          <button
            type="button"
            onClick={() => {
              void shareAdaptivity({
                title: `Mobile mechanic ${city.city} TX`,
                text: `Adaptivity Performance — mobile mechanic in ${city.city}, TX. Book a $100 diagnostic hold.`,
                url: `https://adaptivityperformance.com${cityPath(city.slug)}`,
              });
            }}
            className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-orange-500/40 text-sm font-bold text-orange-300"
          >
            <Share2 className="w-4 h-4" />
            Share with a neighbor
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#12141c] p-5 space-y-3">
          <h2 className="font-heading text-lg font-bold text-white">Also serving nearby</h2>
          <div className="flex flex-wrap gap-2">
            {others.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => {
                  window.history.pushState({}, '', cityPath(c.slug));
                  window.dispatchEvent(new PopStateEvent('popstate'));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-xs font-bold px-3 py-1.5 rounded-full border border-white/10 text-slate-300 hover:border-orange-500/40 hover:text-orange-300"
              >
                {c.city}
              </button>
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
