import React from 'react';
import { Truck, Wrench, ShieldCheck, ArrowRight, Calendar } from 'lucide-react';
import { StoreBadgeLinks } from './StoreBadgeLinks';
import { SiteLink } from '../site/SiteLink';

interface HeroProps {
  onOpenBooking: () => void;
  onSelectServiceMode?: (mode: 'mobile' | 'shop') => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenBooking }) => {
  return (
    <section className="relative pt-6 pb-12 overflow-hidden bg-[#07080b]">
      {/* Top warm ambient orange backlighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[320px] bg-gradient-to-b from-orange-500/20 via-amber-600/10 to-transparent blur-[120px] pointer-events-none -z-10"></div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-7xl">
        
        {/* Main Hero Container matching Concept 3 */}
        <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-[#0c0e14] shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
          
          {/* Background Right Van Image with Left Fade Overlay */}
          <div className="absolute inset-0 z-0 hidden md:block">
            <img
              src="/images/hero-van.jpg"
              alt="Adaptivity Performance Mobile Repair Van"
              className="w-full h-full object-cover object-right"
            />
            {/* Linear and radial gradients to smoothly blend background into text */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0c0e14] via-[#0c0e14]/95 via-50% to-[#0c0e14]/30"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c0e14] via-transparent to-[#0c0e14]/60"></div>
          </div>

          <div className="relative z-10 p-6 sm:p-10 lg:p-14 max-w-2xl space-y-6 text-left">
            {/* Category tag */}
            <div className="space-y-1">
              <span className="text-xs font-black tracking-widest text-orange-400 uppercase">
                ADAPTIVITY PERFORMANCE.
              </span>
              <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.15]">
                Professional Mobile Auto Repair.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 block">
                  Expert Service, Delivered.
                </span>
              </h1>
            </div>

            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Bringing complete automotive repair, diagnostics, and precision maintenance directly to your home or office across DFW. Zero towing needed.
            </p>

            {/* Concept 3: Booking-Step Timeline Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#07080b]/90 border border-orange-500/30 shadow-[0_0_25px_rgba(249,115,22,0.12)] space-y-3">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Booking-Step Timeline
              </div>

              <div className="flex items-center justify-between gap-1 sm:gap-2">
                <div className="text-left space-y-0.5">
                  <div className="text-base font-black text-orange-400">1.</div>
                  <div className="text-xs font-bold text-white">Book Online</div>
                  <div className="text-[10px] text-slate-400">Instant Quote</div>
                </div>

                <div className="text-slate-600 font-bold text-lg">→</div>

                <div className="text-left space-y-0.5">
                  <div className="text-base font-black text-orange-400">2.</div>
                  <div className="text-xs font-bold text-white">Tech Dispatched</div>
                  <div className="text-[10px] text-slate-400">Mobile Van En Route</div>
                </div>

                <div className="text-slate-600 font-bold text-lg">→</div>

                <div className="text-left space-y-0.5">
                  <div className="text-base font-black text-orange-400">3.</div>
                  <div className="text-xs font-bold text-white">Repaired On-Site</div>
                  <div className="text-[10px] text-slate-400">Fixed In Driveway</div>
                </div>
              </div>
            </div>

            {/* Concept 3: Side-by-Side Trust Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#07080b]/90 border border-white/10 hover:border-orange-500/30 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">12-Month / 12,000-Mile</div>
                  <div className="text-[11px] text-slate-400">Warranty on parts & labor</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#07080b]/90 border border-white/10 hover:border-orange-500/30 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">ASE Certified Techs</div>
                  <div className="text-[11px] text-slate-400">Fully insured & background checked</div>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={onOpenBooking}
                className="w-full sm:w-auto flex-1 flex items-center justify-center space-x-2.5 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm sm:text-base px-7 py-3.5 rounded-xl shadow-xl shadow-orange-500/25 transition-all transform hover:-translate-y-0.5"
              >
                <Calendar className="w-4 h-4" />
                <span>Book Service Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <SiteLink
                to="services"
                className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-slate-900/90 hover:bg-slate-800 text-slate-200 font-semibold text-sm sm:text-base px-6 py-3.5 rounded-xl border border-white/10 transition-colors"
              >
                <span>Browse Services</span>
              </SiteLink>
            </div>
          </div>

          {/* Mobile Image Fallback for smaller screens */}
          <div className="block md:hidden border-t border-white/10 relative">
            <img
              src="/images/hero-van.jpg"
              alt="Adaptivity Performance Mobile Repair Van"
              className="w-full h-56 object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c0e14] via-transparent to-transparent"></div>
          </div>

          {/* Bottom Full-Width Dispatch Banner (Matching Concept 3 screenshot) */}
          <div className="relative z-10 p-4 sm:p-5 bg-[#07080b]/95 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-white">Mobile Van Units Dispatched</div>
                <div className="text-xs text-slate-400">DFW · Justin · Northlake · Denton · Fort Worth</div>
              </div>
            </div>

            <span className="px-3.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>On-Site Active</span>
            </span>
          </div>

        </div>

        {/* Customer App Download Badges */}
        <div className="pt-8 flex flex-col items-center gap-2 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Download the Adaptivity customer app
          </p>
          <StoreBadgeLinks className="justify-center" />
        </div>

      </div>
    </section>
  );
};
