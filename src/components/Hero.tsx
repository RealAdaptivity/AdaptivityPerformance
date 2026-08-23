import React from 'react';
import { Truck, Wrench, ShieldCheck, Zap, Star, ArrowRight, Calendar } from 'lucide-react';
import { StoreBadgeLinks } from './StoreBadgeLinks';
import { SiteLink } from '../site/SiteLink';

interface HeroProps {
  onOpenBooking: () => void;
  onSelectServiceMode?: (mode: 'mobile' | 'shop') => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenBooking }) => {
  return (
    <section className="relative pt-12 pb-20 overflow-hidden bg-[#0b0c10]">
      {/* Background warm orange & amber ambient radial glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[340px] bg-orange-600/15 blur-[140px] rounded-full pointer-events-none animate-pulse-glow"></div>
      <div className="absolute top-10 right-10 w-80 h-80 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none animate-float"></div>

      <div className="container mx-auto px-4 relative z-10 animate-fade-in">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          <span className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-orange-500/10 border border-orange-500/30 text-orange-400 shadow-sm hover:scale-105 transition-transform">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
            <span>Serving DFW, Northlake, Justin & Fort Worth</span>
          </span>
          <span className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-800/80 border border-slate-700/60 text-slate-300 shadow-sm hover:scale-105 transition-transform">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>4.9 Star Rated Mobile Mechanic</span>
          </span>
        </div>

        {/* Main Heading */}
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
            Professional Mobile Auto Repair.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 block sm:inline mt-1 sm:mt-0">
              Brought Directly to Your Driveway.
            </span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            We bring the complete repair shop to your home or workplace across DFW — expert computer diagnostics, brake services, batteries, starters, alternators, and tune-ups with <strong className="text-white">zero towing required</strong>.
          </p>

          {/* Concept 3: 3-Step Dispatch Timeline Card */}
          <div className="relative mt-8 p-4 sm:p-6 rounded-2xl bg-[#12141c]/95 border border-white/10 shadow-2xl backdrop-blur-xl max-w-3xl mx-auto text-left space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">How Our Mobile Service Works</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Mobile Units Active Today</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5 hover:border-orange-500/40 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-orange-500 text-white font-black text-xs flex items-center justify-center shrink-0">1</span>
                  <h4 className="text-xs font-bold text-white">Book Online in 60s</h4>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Enter your vehicle & address to receive an instant upfront estimate.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5 hover:border-orange-500/40 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-orange-500 text-white font-black text-xs flex items-center justify-center shrink-0">2</span>
                  <h4 className="text-xs font-bold text-white">Tech Dispatched</h4>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Our certified technician arrives at your location in a fully-equipped mobile van.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5 hover:border-orange-500/40 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-orange-500 text-white font-black text-xs flex items-center justify-center shrink-0">3</span>
                  <h4 className="text-xs font-bold text-white">Repaired On-Site</h4>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Work completed in your driveway, backed by our 12-month warranty.
                </p>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-xl mx-auto">
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
              className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-semibold text-base px-6 py-4 rounded-xl border border-slate-700/60 hover:border-slate-500 transition-colors"
            >
              <span>View All Services</span>
            </SiteLink>
          </div>

          {/* Trust Guarantees */}
          <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto text-left">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#12141c]/90 border border-white/10 shadow-lg">
              <div className="w-9 h-9 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wide">12-Mo / 12k Warranty</h4>
                <p className="text-[11px] text-slate-400">All parts & labor backed</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#12141c]/90 border border-white/10 shadow-lg">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wide">ASE Certified Techs</h4>
                <p className="text-[11px] text-slate-400">Background-checked & insured</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#12141c]/90 border border-white/10 shadow-lg">
              <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wide">Zero Towing Fees</h4>
                <p className="text-[11px] text-slate-400">Fixed right at your doorstep</p>
              </div>
            </div>
          </div>

          <div className="pt-4 flex flex-col items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Download the Adaptivity customer app
            </p>
            <StoreBadgeLinks className="justify-center" />
          </div>
        </div>
      </div>
    </section>
  );
};
