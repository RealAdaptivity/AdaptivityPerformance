import React from 'react';
import { Wrench, Sparkles, Volume2, Flame, ArrowRight, CheckCircle2 } from 'lucide-react';

interface ServiceShowcaseGridProps {
  onBookService: (serviceName: string) => void;
}

export const ServiceShowcaseGrid: React.FC<ServiceShowcaseGridProps> = ({ onBookService }) => {
  const categories = [
    {
      id: 'mobile-repair',
      title: 'Mobile Repair & Diagnostics',
      subtitle: 'Driveway & Workplace Dispatch',
      description: 'We bring full shop diagnostics, brake replacement, oil changes, starters, and batteries directly to your home or office.',
      icon: <Wrench className="w-6 h-6 text-orange-400" />,
      accent: 'hover:border-orange-500/50 hover:shadow-[0_0_30px_rgba(249,115,22,0.12)]',
      badge: 'Free 15-Mi Dispatch',
      badgeColor: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
      items: ['Brake Pad & Rotor Swaps', 'Check Engine OBD-II Scans', 'Synthetic Oil Services', 'Starter & Battery Swaps'],
      primaryService: 'Mobile Mechanic & Diagnostic Visit',
    },
    {
      id: 'detailing',
      title: 'Mobile Detailing & Protection',
      subtitle: 'Showroom Care at Your Driveway',
      description: 'Complete interior deep cleaning, exterior ceramic coating, paint correction, and headlight restoration on-location.',
      icon: <Sparkles className="w-6 h-6 text-amber-400" />,
      accent: 'hover:border-amber-500/50 hover:shadow-[0_0_30px_rgba(245,158,11,0.12)]',
      badge: 'Water & Power Equipped',
      badgeColor: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      items: ['Full Ceramic Protection', 'Interior Steam & Leather Care', 'Paint Correction & Polish', 'Headlight Restoration'],
      primaryService: 'Mobile Detailing & Ceramic Protection',
    },
    {
      id: 'audio-tint',
      title: 'Custom Audio, Tint & Wraps',
      subtitle: 'Electronics & Styling Upgrades',
      description: 'Custom window tinting, dash cam installs, premium audio speaker upgrades, subwoofers, and vinyl color accents.',
      icon: <Volume2 className="w-6 h-6 text-orange-400" />,
      accent: 'hover:border-orange-500/50 hover:shadow-[0_0_30px_rgba(249,115,22,0.12)]',
      badge: 'Lifetime Tint Warranty',
      badgeColor: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
      items: ['Ceramic Window Tinting', 'Custom Audio & Subwoofers', 'Dash Cam & Radar Hardwire', 'Vinyl Accents & Wrap Work'],
      primaryService: 'Custom Audio & Window Tinting',
    },
    {
      id: 'performance',
      title: 'Shop Performance & Builds',
      subtitle: 'Garage Facility · Coming Soon',
      description: 'Upcoming dedicated garage facility for heavy suspension lifts, custom exhaust systems, cold air intakes, and engine overhauls.',
      icon: <Flame className="w-6 h-6 text-amber-400" />,
      accent: 'hover:border-amber-500/50 hover:shadow-[0_0_30px_rgba(245,158,11,0.12)]',
      badge: 'Facility Under Buildout',
      badgeColor: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      items: ['Truck Suspension Lifts & Leveling', 'Custom Exhaust & Headers', 'Cold Air Intakes & Tuning', 'Engine & Transmission Swaps'],
      primaryService: 'Performance Upgrade & Garage Build',
    },
  ];

  return (
    <section className="py-20 bg-[#07080b] border-t border-white/10 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center space-y-3 mb-12">
          <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-orange-500/10 border border-orange-500/30 text-orange-400">
            Full Automotive Capabilities
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-black text-white">
            Everything Automotive — Directly to Your Driveway
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            From routine doorstep maintenance to high-end mobile detailing, custom electronics, and performance upgrades.
          </p>
        </div>

        {/* 4 Category Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`rounded-3xl border border-white/10 bg-[#0c0e14]/95 p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 shadow-xl text-left ${cat.accent}`}
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
                    {cat.icon}
                  </div>
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border whitespace-nowrap uppercase tracking-wide ${cat.badgeColor}`}>
                    {cat.badge}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="font-heading font-black text-lg text-white">{cat.title}</h3>
                  <span className="text-[11px] font-semibold text-slate-400 block">{cat.subtitle}</span>
                  <p className="text-xs text-slate-400 leading-relaxed pt-1">{cat.description}</p>
                </div>

                <div className="pt-2 border-t border-white/5 space-y-2">
                  {cat.items.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-2 text-xs text-slate-300 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="button"
                  onClick={() => onBookService(cat.primaryService)}
                  className="w-full py-3 px-4 rounded-xl bg-white/[0.04] hover:bg-gradient-to-r hover:from-orange-500 hover:to-amber-600 hover:text-white border border-white/10 hover:border-transparent font-bold text-xs text-slate-200 transition-all flex items-center justify-center space-x-2 group shadow-md"
                >
                  <span>Book {cat.title.split(' ')[0]} Service</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
