import { Truck, ArrowRight, Calendar, MapPin, Phone, ShieldCheck, Wrench } from 'lucide-react';
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
    <section className="relative pt-4 pb-14 overflow-hidden bg-[#07080b]">
      {/* Top ambient warm orange backlighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[340px] bg-gradient-to-b from-orange-500/18 via-amber-600/10 to-transparent blur-[140px] pointer-events-none -z-10"></div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-7xl">
        
        {/* Full-Bleed Main Hero Container with Smooth Fade Stretching Background */}
        <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-[#07080b] shadow-[0_20px_70px_rgba(0,0,0,0.9)] min-h-[580px] sm:min-h-[640px] flex flex-col justify-between">
          
          {/* Full-Bleed Real Mechanic Background Image */}
          <div className="absolute inset-0 z-0">
            <img
              src="/images/hero-full-bg.jpg"
              alt="Adaptivity Performance certified technician diagnosing vehicle in residential driveway"
              className="w-full h-full object-cover object-right md:object-[75%_center]"
            />
            {/* Smooth Linear Gradient Fade Overlay: Dark Obsidian on Left fading to Image on Right */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#07080b] via-[#07080b]/95 via-45% sm:via-50% to-[#07080b]/30"></div>
            {/* Top and Bottom Vignette Fades */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#07080b] via-transparent to-[#07080b]/60"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-[#07080b]/70 via-transparent to-transparent"></div>
          </div>

          {/* Foreground Hero Content (Positioned over Left Gradient Fade) */}
          <div className="relative z-10 p-6 sm:p-10 lg:p-14 max-w-2xl lg:max-w-3xl space-y-6 text-left">
            
            {/* Live Arrival Ticker Pill */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-[#07080b]/90 border border-orange-500/40 shadow-[0_0_20px_rgba(249,115,22,0.15)] backdrop-blur-md">
              <div className="w-6 h-6 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs sm:text-sm font-black text-white tracking-wide uppercase">
                📍 25 Min Arrival in DFW
              </span>
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
            </div>

            {/* Headline */}
            <div className="space-y-3">
              <h1 className="font-heading text-4xl sm:text-5xl xl:text-6xl font-black tracking-tight text-white leading-[1.08] uppercase">
                Your Reliable <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500">
                  Mobile Auto Repair
                </span> <br />
                Partner
              </h1>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl font-medium drop-shadow-sm">
                Expert certified mechanics come directly to your home or office across DFW. 
                On-site diagnostics, precision brake repairs, battery swaps, starters, and maintenance with <strong className="text-white">zero towing needed</strong>.
              </p>
            </div>

            {/* CTAs Row */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onOpenBooking}
                className="w-full sm:w-auto flex-1 flex items-center justify-center space-x-3 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black text-sm sm:text-base uppercase tracking-wider px-8 py-4 rounded-2xl shadow-2xl shadow-orange-500/30 transition-all transform hover:-translate-y-0.5 active:scale-95"
              >
                <Calendar className="w-4 h-4" />
                <span>Request Service Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href={SITE_PHONE_TEL}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-[#07080b]/90 hover:bg-slate-800/90 text-slate-200 font-bold text-xs sm:text-sm px-5 py-4 rounded-2xl border border-white/15 hover:border-orange-500/40 backdrop-blur-md transition-colors"
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
                  className="p-3.5 rounded-2xl bg-[#07080b]/85 border border-white/15 hover:border-orange-500/50 cursor-pointer transition-all hover:-translate-y-0.5 shadow-lg space-y-1 text-left backdrop-blur-md group"
                >
                  <div className="text-[11px] font-bold text-slate-400 group-hover:text-orange-400 transition-colors">
                    {card.title}
                  </div>
                  <div className="text-xl font-black text-white">
                    {card.price}
                  </div>
                  <div className="text-[10px] text-slate-400 line-clamp-1">
                    {card.desc}
                  </div>
                </div>
              ))}
            </div>

            {/* Trust Guarantee Badges */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1 font-medium">
              <span className="flex items-center gap-1.5 bg-[#07080b]/80 px-3 py-1 rounded-xl border border-white/10 backdrop-blur-sm">
                <ShieldCheck className="w-4 h-4 text-orange-400" />
                <span>12-Mo / 12,000-Mi Warranty</span>
              </span>
              <span className="flex items-center gap-1.5 bg-[#07080b]/80 px-3 py-1 rounded-xl border border-white/10 backdrop-blur-sm">
                <Truck className="w-4 h-4 text-emerald-400" />
                <span>Zero Towing Required</span>
              </span>
              <span className="flex items-center gap-1.5 bg-[#07080b]/80 px-3 py-1 rounded-xl border border-white/10 backdrop-blur-sm">
                <Wrench className="w-4 h-4 text-orange-400" />
                <span>ASE Certified Techs</span>
              </span>
            </div>

          </div>

          {/* Bottom Live Dispatch Status Bar */}
          <div className="relative z-10 p-4 sm:p-5 bg-[#07080b]/90 border-t border-white/10 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs sm:text-sm font-bold text-white">100% Mobile Service Dispatched across DFW</div>
                <div className="text-[11px] text-slate-400">Justin · Northlake · Denton · Fort Worth · Dallas</div>
              </div>
            </div>

            <span className="px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Active Driveway Dispatch</span>
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
