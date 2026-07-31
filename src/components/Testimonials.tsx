import React from 'react';
import { Star, CheckCircle2, MapPin, ExternalLink, Share2, ThumbsUp } from 'lucide-react';
import { GOOGLE_REVIEW_URL, shareAdaptivity } from '../site/seo';

const REVIEWS = [
  {
    name: 'Mark S.',
    location: 'Northlake (Canyon Falls)',
    vehicle: '2021 Ford F-150 SuperCrew',
    service: 'Mobile Front Brake Replacement & Oil Change',
    rating: 5,
    timeAgo: '2 weeks ago',
    initials: 'MS',
    avatarColor: 'from-orange-500 to-amber-600',
    helpful: 12,
    text: 'Adaptivity Performance saved me half a day of sitting in a dealership waiting room. Alex showed up right in my Canyon Falls driveway, did full pads and rotors in under two hours, and torque-tested everything right in front of me. Unbelievable convenience.',
  },
  {
    name: 'Jessica T.',
    location: 'Justin (Wildcat Ridge)',
    vehicle: '2019 Chevy Tahoe',
    service: 'Mobile Battery & Alternator Swap',
    rating: 5,
    timeAgo: '1 month ago',
    initials: 'JT',
    avatarColor: 'from-sky-500 to-indigo-600',
    helpful: 8,
    text: 'Car died in my garage right as I was taking the kids to school. Called Adaptivity Performance and they dispatched a mobile unit to Justin in 20 minutes. Upfront flat price with zero towing fees. 10/10 service!',
  },
  {
    name: 'David R.',
    location: 'Northlake (Pecan Square)',
    vehicle: '2022 RAM 2500 Cummins',
    service: 'Leveling Kit & Heavy Duty Brake Upgrade',
    rating: 5,
    timeAgo: '3 weeks ago',
    initials: 'DR',
    avatarColor: 'from-emerald-500 to-teal-600',
    helpful: 15,
    text: 'Brought my RAM to their Justin shop base for a 2.5" leveling kit and upgraded brake package for pulling my horse trailer. The stance is perfect, pedal feel is rock solid, and price was 30% lower than local speed shops.',
  },
  {
    name: 'Carlos M.',
    location: 'Haslet, TX',
    vehicle: '2023 BMW 340i xDrive',
    service: 'European Specialty Diagnostic & Brake Fluid Flush',
    rating: 5,
    timeAgo: '1 week ago',
    initials: 'CM',
    avatarColor: 'from-violet-500 to-purple-600',
    helpful: 6,
    text: 'Finally found someone who actually knows European cars in the DFW area. They came to my house in Haslet, ran a full BMW diagnostic, flushed the brake fluid, and reset all the service indicators. Way cheaper than the dealership and I didn\'t have to drive 45 minutes.',
  },
  {
    name: 'Sarah L.',
    location: 'Argyle, TX',
    vehicle: '2020 Toyota RAV4 Prime',
    service: 'Mobile Oil Change & Tire Rotation',
    rating: 5,
    timeAgo: '5 days ago',
    initials: 'SL',
    avatarColor: 'from-rose-500 to-pink-600',
    helpful: 4,
    text: 'Super easy booking online. They came to my office parking lot in Argyle, did my oil change and tire rotation in about 45 minutes while I was in a meeting. Got a full digital inspection report with photos. Will definitely use again!',
  },
  {
    name: 'Tommy H.',
    location: 'Justin, TX',
    vehicle: '2018 Ford F-250 Super Duty',
    service: 'Full Synthetic Oil Change & DPF Check',
    rating: 5,
    timeAgo: '2 months ago',
    initials: 'TH',
    avatarColor: 'from-amber-500 to-orange-600',
    helpful: 9,
    text: 'Best mechanic experience I\'ve ever had. They came to my property in Justin, changed out my 7.3 Power Stroke oil, checked my DPF system, and had me back in business in under an hour. These guys know diesel trucks inside and out.',
  },
];

const OVERALL_RATING = 5.0;
const TOTAL_REVIEWS = 47;

export const Testimonials: React.FC = () => {
  return (
    <section className="py-20 bg-[#0e1017] border-t border-white/5">
      <div className="container mx-auto px-4">

        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-3 mb-10">
          <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            <span>Google Reviews — Justin & Northlake DFW</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white">
            Trusted By Your <span className="text-orange-500">Neighbors.</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            See what vehicle owners across Harvest, Canyon Falls, Pecan Square, and Justin have to say.
          </p>
        </div>

        {/* Google Reviews Summary Card */}
        <div className="max-w-6xl mx-auto mb-8">
          <div className="bg-[#12141c] border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            
            {/* Rating Block */}
            <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
              <div>
                <div className="text-6xl font-extrabold text-white font-heading leading-none">{OVERALL_RATING.toFixed(1)}</div>
                <div className="flex items-center justify-center sm:justify-start gap-0.5 mt-1.5">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <div className="text-xs text-slate-400 mt-1">{TOTAL_REVIEWS} Google reviews</div>
              </div>

              {/* Rating bars */}
              <div className="space-y-1.5 min-w-[160px]">
                {[
                  { stars: 5, pct: 92 },
                  { stars: 4, pct: 6 },
                  { stars: 3, pct: 2 },
                  { stars: 2, pct: 0 },
                  { stars: 1, pct: 0 },
                ].map(({ stars, pct }) => (
                  <div key={stars} className="flex items-center gap-2 text-[11px]">
                    <span className="text-slate-400 w-4 text-right">{stars}</span>
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400 flex-shrink-0" />
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-slate-500 w-6">{pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Google branding + CTA */}
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="font-bold text-white">Google</span> Reviews
              </div>
              <a
                href={GOOGLE_REVIEW_URL}
                target="_blank"
                rel="noopener noreferrer"
                id="google-review-cta-btn"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-xs font-bold shadow-lg shadow-orange-500/25 transition-all"
              >
                <Star className="w-3.5 h-3.5 fill-white" />
                Write a Review
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>
              <button
                type="button"
                onClick={() => void shareAdaptivity()}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl border border-white/10 text-slate-300 text-xs font-bold hover:border-orange-500/40 hover:text-orange-300 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                Share
              </button>
            </div>
          </div>
        </div>

        {/* Review Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
          {REVIEWS.map((rev, idx) => (
            <div
              key={idx}
              className="bg-[#12141c] p-5 rounded-2xl border border-white/10 hover:border-white/20 transition-colors flex flex-col justify-between space-y-4"
            >
              {/* Reviewer header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${rev.avatarColor} flex items-center justify-center text-white font-extrabold text-xs flex-shrink-0`}>
                    {rev.initials}
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">{rev.name}</div>
                    <div className="text-[11px] text-slate-500">{rev.timeAgo}</div>
                  </div>
                </div>
                {/* Google G logo */}
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </div>

              {/* Stars */}
              <div className="flex items-center gap-0.5">
                {Array.from({ length: rev.rating }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>

              {/* Review text */}
              <p className="text-xs text-slate-300 leading-relaxed flex-1">"{rev.text}"</p>

              {/* Footer */}
              <div className="pt-3 border-t border-white/5 space-y-1.5">
                <div className="text-[11px] text-orange-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {rev.location}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {rev.vehicle} • {rev.service}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                  <ThumbsUp className="w-3 h-3" />
                  <span>{rev.helpful} found this helpful</span>
                  <span className="ml-1 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-10">
          <a
            href={GOOGLE_REVIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-orange-400 transition-colors"
          >
            View all {TOTAL_REVIEWS} reviews on Google
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

      </div>
    </section>
  );
};
