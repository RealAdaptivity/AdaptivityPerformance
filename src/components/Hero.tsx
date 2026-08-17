import React, { useState } from 'react';
import { Truck, Home, Wrench, ShieldCheck, Zap, Star, MapPin, ArrowRight, CheckCircle2 } from 'lucide-react';
import { StoreBadgeLinks } from './StoreBadgeLinks';
import { SiteLink } from '../site/SiteLink';

interface HeroProps {
  onOpenBooking: () => void;
  onSelectServiceMode: (mode: 'mobile' | 'shop') => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenBooking, onSelectServiceMode }) => {
  const [activeTab, setActiveTab] = useState<'mobile' | 'shop'>('mobile');

  const handleTabChange = (mode: 'mobile' | 'shop') => {
    setActiveTab(mode);
    onSelectServiceMode(mode);
  };

  return (
    <section className="relative pt-12 pb-20 overflow-hidden bg-[#0b0c10]">
      {/* Background ambient glows with smooth pulsing */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-orange-600/10 blur-[130px] rounded-full pointer-events-none animate-pulse-glow"></div>
      <div className="absolute top-10 right-10 w-72 h-72 bg-amber-500/5 blur-[90px] rounded-full pointer-events-none animate-float"></div>

      <div className="container mx-auto px-4 relative z-10 animate-fade-in">
        {/* Top Pills */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          <span className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-orange-500/10 border border-orange-500/30 text-orange-400 shadow-sm hover:scale-105 transition-transform">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
            <span>Serving DFW & Fort Worth Areas</span>
          </span>
          <span className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-800/80 border border-slate-700/60 text-slate-300 shadow-sm hover:scale-105 transition-transform">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-spin-slow" />
            <span>4.9 Star Local Mechanic Rating</span>
          </span>
        </div>

        {/* Main Heading */}
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
            Complete Automotive Care <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500">& Performance</span>
            <br />
            <span className="text-slate-300 font-bold text-3xl sm:text-4xl lg:text-5xl mt-2 block">
              Directly at Your Doorstep Across DFW.
            </span>
          </h1>

          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Adaptivity Performance is <strong className="text-white">100% mobile</strong> — bringing professional on-site diagnostics, brakes, batteries, starters, alternators, oil services, and repairs directly to your driveway or workplace.
          </p>

          {/* Interactive Mode Switcher Container */}
          <div className="max-w-2xl mx-auto mt-10 p-2 bg-slate-900/90 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-lg">
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#0b0c10] rounded-xl border border-white/5">
              <button
                onClick={() => handleTabChange('mobile')}
                className={`flex items-center justify-center space-x-3 py-3 px-4 rounded-lg font-bold text-sm transition-all duration-300 ${
                  activeTab === 'mobile'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                }`}
              >
                <Truck className="w-5 h-5 text-orange-400" />
                <div className="text-left">
                  <div className="leading-tight flex items-center gap-1.5">
                    <span>We Come To You</span>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-bold uppercase">Active</span>
                  </div>
                  <div className="text-[10px] opacity-80 font-normal">Driveway & On-Site Repairs</div>
                </div>
              </button>

              <button
                onClick={() => handleTabChange('shop')}
                className={`flex items-center justify-center space-x-3 py-3 px-4 rounded-lg font-bold text-sm transition-all duration-300 ${
                  activeTab === 'shop'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                }`}
              >
                <Home className="w-5 h-5 text-amber-400" />
                <div className="text-left">
                  <div className="leading-tight flex items-center gap-1.5">
                    <span>Garage Hub</span>
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-bold uppercase">Soon</span>
                  </div>
                  <div className="text-[10px] opacity-80 font-normal">In-Shop Facility Buildout</div>
                </div>
              </button>
            </div>

            {/* Mode Dynamic Content */}
            <div className="p-5 text-left bg-gradient-to-b from-slate-900/50 to-[#0b0c10] rounded-xl mt-2 border border-white/5">
              {activeTab === 'mobile' ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                      <Truck className="w-4 h-4" /> 100% Mobile Mechanic Van Service
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs bg-orange-500/10 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded font-bold whitespace-nowrap">
                        $2.00 / mi Travel Rate
                      </span>
                      <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-medium whitespace-nowrap">
                        Zero Towing Fees
                      </span>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white">We bring the full shop equipment directly to your home or office.</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-300">
                    <div className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-orange-400 flex-shrink-0" /> <span>Brake Replacements & Fluid Flushes</span></div>
                    <div className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-orange-400 flex-shrink-0" /> <span>Check Engine Light Computer Diagnostics</span></div>
                    <div className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-orange-400 flex-shrink-0" /> <span>Starter, Alternator & Battery Replacement</span></div>
                    <div className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-orange-400 flex-shrink-0" /> <span>Oil Changes & Maintenance Services</span></div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Wrench className="w-4 h-4" /> Dedicated Performance Garage Hub
                    </span>
                    <span className="text-xs bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded font-bold whitespace-nowrap">
                      Facility Under Buildout · Coming Soon
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">Our brick-and-mortar garage hub is currently under construction!</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    We are currently setting up our dedicated shop facility for heavy-duty lifts, custom exhausts, and engine overhauls. In the meantime, <strong className="text-slate-200">100% of our active bookings are completed on-site</strong> with our fully-equipped mobile units.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleTabChange('mobile')}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-400 hover:text-orange-300 pt-1"
                  >
                    <span>Book mobile doorstep service today →</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={onOpenBooking}
              className="w-full sm:w-auto flex items-center justify-center space-x-3 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-base px-8 py-4 rounded-xl shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 transition-all transform hover:-translate-y-0.5 active:scale-95"
            >
              <span>Schedule / Call for Quote</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <SiteLink
              to="about"
              className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-semibold text-base px-6 py-4 rounded-xl border border-slate-700/60 hover:border-slate-500 transition-colors"
            >
              About Us
            </SiteLink>

            <SiteLink
              to="services"
              className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-semibold text-base px-6 py-4 rounded-xl border border-slate-700/60 hover:border-slate-500 transition-colors"
            >
              Browse Services
            </SiteLink>
          </div>

          <div className="pt-2 flex flex-col items-center gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              Install the Adaptivity customer app
            </p>
            <StoreBadgeLinks className="justify-center" />
          </div>

          {/* Trust Guarantees */}
          <div className="pt-8 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4 text-left max-w-4xl mx-auto">
            <div className="flex items-start space-x-3 p-3 rounded-lg bg-white/[0.02] border border-white/5 hover-lift">
              <ShieldCheck className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white uppercase">12-Mo / 12k Warranty</h4>
                <p className="text-[11px] text-slate-400">All parts & labor backed</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 rounded-lg bg-white/[0.02] border border-white/5 hover-lift">
              <Zap className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white uppercase">Same-Day Service</h4>
                <p className="text-[11px] text-slate-400">Fast response across DFW / Fort Worth</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 rounded-lg bg-white/[0.02] border border-white/5 hover-lift">
              <MapPin className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white uppercase">No Travel Fee local</h4>
                <p className="text-[11px] text-slate-400">Free first 15 mi from Justin hub</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 rounded-lg bg-white/[0.02] border border-white/5 hover-lift">
              <Wrench className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white uppercase">Upfront Pricing</h4>
                <p className="text-[11px] text-slate-400">No surprise hidden fees</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
