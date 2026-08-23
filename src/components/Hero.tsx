import React from 'react';
import { Truck, Wrench, ShieldCheck, Star, ArrowRight, Calendar } from 'lucide-react';
import { StoreBadgeLinks } from './StoreBadgeLinks';
import { SiteLink } from '../site/SiteLink';

interface HeroProps {
  onOpenBooking: () => void;
  onSelectServiceMode?: (mode: 'mobile' | 'shop') => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenBooking }) => {
  return (
    <section className="relative pt-8 pb-20 overflow-hidden bg-[#07080b]">
      {/* Warm ambient orange backdrop glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[850px] h-[450px] bg-orange-600/12 blur-[160px] rounded-full pointer-events-none"></div>
      <div className="absolute top-20 right-0 w-96 h-96 bg-amber-500/10 blur-[130px] rounded-full pointer-events-none"></div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Main Grid: Left Content + Right Visual Frame (Concept 3) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center max-w-7xl mx-auto">
          
          {/* Left Column: Heading, Timeline, and CTAs */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Category tag */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[11px] font-black tracking-widest text-orange-400 uppercase bg-orange-500/10 border border-orange-500/30 px-3 py-1 rounded-full">
                ADAPTIVITY PERFORMANCE
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>4.9 Star Rated Mobile Mechanic in DFW</span>
              </span>
            </div>

            {/* Headline */}
            <div className="space-y-2">
              <h1 className="font-heading text-4xl sm:text-5xl xl:text-6xl font-black tracking-tight text-white leading-[1.1]">
                Professional Mobile Auto Repair.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 block sm:inline mt-1">
                  Expert Service, Delivered.
                </span>
              </h1>
              <p className="text-slate-400 text-base sm:text-lg leading-relaxed pt-2">
                We bring the complete repair shop directly to your home or office across DFW — expert diagnostics, brake service, batteries, starters, and maintenance with <strong className="text-white">zero towing needed</strong>.
              </p>
            </div>

            {/* Concept 3: Booking-Step Timeline Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0f1118]/90 border border-orange-500/30 shadow-[0_0_30px_rgba(249,115,22,0.08)] space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Booking-Step Timeline</span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Active DFW Dispatch</span>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center sm:text-left">
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <div className="text-[11px] font-black text-orange-400">1.</div>
                  <div className="text-xs font-bold text-white">Book Online</div>
                  <div className="text-[10px] text-slate-400 leading-snug hidden sm:block">Instant quote & date selection</div>
                </div>
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <div className="text-[11px] font-black text-orange-400">2.</div>
                  <div className="text-xs font-bold text-white">Tech Dispatched</div>
                  <div className="text-[10px] text-slate-400 leading-snug hidden sm:block">Mobile unit arrives on-site</div>
                </div>
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <div className="text-[11px] font-black text-orange-400">3.</div>
                  <div className="text-xs font-bold text-white">Repaired On-Site</div>
                  <div className="text-[10px] text-slate-400 leading-snug hidden sm:block">Fixed in your driveway</div>
                </div>
              </div>
            </div>

            {/* Concept 3: Side-by-Side Trust Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-[#0f1118] border border-orange-500/25 shadow-md">
                <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white uppercase tracking-wide">12-Month / 12,000-Mile</div>
                  <div className="text-[11px] text-slate-400">Warranty on parts & labor</div>
                </div>
              </div>

              <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-[#0f1118] border border-orange-500/25 shadow-md">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white uppercase tracking-wide">ASE Certified Techs</div>
                  <div className="text-[11px] text-slate-400">Fully insured & background checked</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3.5">
              <button
                onClick={onOpenBooking}
                className="w-full sm:w-auto flex-1 flex items-center justify-center space-x-3 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-base px-8 py-4 rounded-xl shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 transition-all transform hover:-translate-y-0.5 active:scale-95"
              >
                <Calendar className="w-5 h-5" />
                <span>Schedule Service / Get Quote</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <SiteLink
                to="services"
                className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-slate-900/90 hover:bg-slate-800 text-slate-200 font-semibold text-base px-6 py-4 rounded-xl border border-white/10 hover:border-orange-500/30 transition-colors"
              >
                <span>Browse Services</span>
              </SiteLink>
            </div>
          </div>

          {/* Right Column: Visual Frame (Concept 3 Image with Glowing Ambient Border) */}
          <div className="lg:col-span-5 relative">
            {/* Ambient orange glow ring behind image */}
            <div className="absolute inset-0 bg-gradient-to-tr from-orange-600/30 via-amber-500/20 to-transparent blur-2xl rounded-3xl -z-10 scale-105"></div>
            
            <div className="relative rounded-3xl overflow-hidden border border-orange-500/30 shadow-[0_0_50px_rgba(249,115,22,0.2)] bg-[#0b0c10]">
              <img
                src="/images/hero-van.jpg"
                alt="Adaptivity Performance Mobile Mechanic Van arriving on-site"
                className="w-full h-[360px] sm:h-[440px] object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#07080b] via-transparent to-transparent opacity-80"></div>
              
              {/* Overlay Badges */}
              <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Mobile Van Units Dispatched</div>
                    <div className="text-[10px] text-slate-400">DFW · Justin · Northlake · Denton</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                  On-Site
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Mobile App Badges Footer */}
        <div className="pt-10 flex flex-col items-center gap-2 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Download the Adaptivity customer app
          </p>
          <StoreBadgeLinks className="justify-center" />
        </div>
      </div>
    </section>
  );
};
