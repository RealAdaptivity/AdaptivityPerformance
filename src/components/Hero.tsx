import React from 'react';
import { Truck, ArrowRight, Calendar, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { StoreBadgeLinks } from './StoreBadgeLinks';
import { SITE_PHONE_DISPLAY, SITE_PHONE_TEL } from '../site/seo';

interface HeroProps {
  onOpenBooking: () => void;
  onSelectServiceMode?: (mode: 'mobile' | 'shop') => void;
}

const UPFRONT_CARDS = [
  { title: 'Brakes', price: '$199', desc: 'Pads & rotors on-site' },
  { title: 'Battery', price: '$175', desc: 'Swap & load test' },
  { title: 'Starter', price: '$250', desc: 'Roadside & driveway' },
  { title: 'Diagnostics', price: '$99', desc: '100% credited if repaired' },
];

export const Hero: React.FC<HeroProps> = ({ onOpenBooking }) => {
  return (
    <section className="relative pt-8 pb-16 overflow-hidden bg-[#07080b]">
      {/* Ambient warm orange radial glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[360px] bg-gradient-to-b from-orange-500/18 via-amber-600/10 to-transparent blur-[140px] pointer-events-none -z-10"></div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-7xl">
        
        {/* Main Grid: Left Content + Right Van Visual Frame */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          
          {/* Left Column: Heading, Live Arrival Pill, CTAs, and Upfront Price Cards */}
          <div className="lg:col-span-6 space-y-6 text-left">
            
            {/* Main Headline */}
            <div className="space-y-3">
              <h1 className="font-heading text-4xl sm:text-5xl xl:text-6xl font-black tracking-tight text-white leading-[1.08] uppercase">
                Your Reliable <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500">
                  Mobile Auto Repair
                </span> <br />
                Partner
              </h1>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl">
                Expert certified mechanics come directly to your home or office across DFW. 
                Emergency roadside dispatch, brakes, batteries, starters, and scheduled maintenance.
              </p>
            </div>

            {/* Live Arrival Ticker Pill */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-[#0f1118] border border-orange-500/40 shadow-[0_0_20px_rgba(249,115,22,0.15)]">
              <div className="w-6 h-6 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs sm:text-sm font-black text-white tracking-wide uppercase">
                📍 25 Min Arrival in DFW
              </span>
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
            </div>

            {/* CTAs Row */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onOpenBooking}
                className="w-full sm:w-auto flex-1 flex items-center justify-center space-x-3 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black text-sm sm:text-base uppercase tracking-wider px-8 py-4 rounded-2xl shadow-xl shadow-orange-500/25 transition-all transform hover:-translate-y-0.5 active:scale-95"
              >
                <Calendar className="w-4 h-4" />
                <span>Request Service Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href={SITE_PHONE_TEL}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-[#12141c] hover:bg-slate-800 text-slate-200 font-bold text-xs sm:text-sm px-5 py-4 rounded-2xl border border-white/10 hover:border-orange-500/30 transition-colors"
              >
                <Phone className="w-4 h-4 text-orange-400" />
                <span>Call {SITE_PHONE_DISPLAY}</span>
              </a>
            </div>

            {/* 4 Upfront Price Cards Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
              {UPFRONT_CARDS.map((card, idx) => (
                <div
                  key={idx}
                  onClick={onOpenBooking}
                  className="p-3.5 rounded-2xl bg-[#0c0e14]/90 border border-white/10 hover:border-orange-500/50 cursor-pointer transition-all hover:-translate-y-0.5 shadow-md space-y-1 text-left group"
                >
                  <div className="text-[11px] font-bold text-slate-400 group-hover:text-orange-400 transition-colors">
                    {card.title}
                  </div>
                  <div className="text-xl font-black text-white">
                    {card.price}
                  </div>
                  <div className="text-[10px] text-slate-500 line-clamp-1">
                    {card.desc}
                  </div>
                </div>
              ))}
            </div>

            {/* Trust Guarantee Badges */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-orange-400" />
                <span>12-Mo / 12,000-Mi Warranty</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Truck className="w-4 h-4 text-emerald-400" />
                <span>Zero Towing Required</span>
              </span>
            </div>

          </div>

          {/* Right Column: Correct Driveway Van Image in Rounded Frame */}
          <div className="lg:col-span-6 relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-orange-600/25 via-amber-500/15 to-transparent blur-3xl rounded-3xl -z-10 scale-105"></div>
            
            <div className="relative rounded-3xl overflow-hidden border border-orange-500/30 shadow-[0_0_60px_rgba(0,0,0,0.8)] bg-[#0c0e14]">
              <img
                src="/images/hero-van.jpg"
                alt="Adaptivity Performance Mobile Mechanic Van parked in driveway with tool setup"
                className="w-full h-[380px] sm:h-[480px] object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#07080b]/80 via-transparent to-transparent"></div>
              
              {/* Bottom Badge Bar on Image */}
              <div className="absolute bottom-4 left-4 right-4 p-3.5 rounded-2xl bg-black/80 backdrop-blur-md border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white">Full On-Site Mobile Workshop</div>
                    <div className="text-[10px] text-slate-400">Snap-on Diagnostic Gear & OE Parts</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Active</span>
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Customer App Download Badges */}
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
