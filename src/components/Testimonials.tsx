import React from 'react';
import { Star, CheckCircle2, MapPin, ExternalLink, Share2 } from 'lucide-react';
import { GOOGLE_REVIEW_URL, shareAdaptivity } from '../site/seo';

const REVIEWS = [
  {
    name: 'Mark S.',
    location: 'Northlake (Canyon Falls)',
    vehicle: '2021 Ford F-150 SuperCrew',
    service: 'Mobile Front Brake Replacement & Oil Change',
    rating: 5,
    text: 'Adaptivity Performance saved me half a day of sitting in a dealership waiting room. Alex showed up right in my Canyon Falls driveway, did full pads and rotors in under two hours, and torque-tested everything right in front of me. Unbelievable convenience.',
  },
  {
    name: 'Jessica T.',
    location: 'Justin (Wildcat Ridge)',
    vehicle: '2019 Chevy Tahoe',
    service: 'Mobile Battery & Alternator Swap',
    rating: 5,
    text: 'Car died in my garage right as I was taking the kids to school. Called Adaptivity Performance and they dispatched a mobile unit to Justin in 20 minutes. Upfront flat price with zero towing fees. 10/10 service!',
  },
  {
    name: 'David R.',
    location: 'Northlake (Pecan Square)',
    vehicle: '2022 RAM 2500 Cummins',
    service: 'Leveling Kit & Heavy Duty Towing Brake Upgrade',
    rating: 5,
    text: 'Brought my RAM to their Justin shop base for a 2.5" leveling kit and upgraded brake package for pulling my horse trailer. The stance is perfect, pedal feel is rock solid, and price was 30% lower than local speed shops.',
  },
];

export const Testimonials: React.FC = () => {
  return (
    <section className="py-20 bg-[#0e1017] border-t border-white/5">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center space-y-3 mb-12">
          <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
            <Star className="w-3.5 h-3.5 fill-orange-400" />
            <span>Justin & Northlake Verified Reviews</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white">
            Trusted By Your <span className="text-orange-500">Neighbors.</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            See what vehicle owners across Harvest, Canyon Falls, Pecan Square, and Justin have to say.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href={GOOGLE_REVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 text-white text-xs font-bold hover:bg-orange-400 transition-colors"
            >
              <Star className="w-3.5 h-3.5 fill-white" />
              Leave a Google review
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>
            <button
              type="button"
              onClick={() => {
                void shareAdaptivity();
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 text-slate-200 text-xs font-bold hover:border-orange-500/40 hover:text-orange-300 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share Adaptivity
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {REVIEWS.map((rev, idx) => (
            <div
              key={idx}
              className="bg-[#12141c] p-6 rounded-2xl border border-white/10 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex text-amber-400 space-x-1">
                    {Array.from({ length: rev.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Verified Client
                  </span>
                </div>

                <p className="text-xs text-slate-300 italic leading-relaxed">"{rev.text}"</p>
              </div>

              <div className="pt-4 border-t border-white/5">
                <div className="font-bold text-sm text-white">{rev.name}</div>
                <div className="text-xs text-orange-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" /> {rev.location}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-mono">
                  {rev.vehicle} • {rev.service}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
