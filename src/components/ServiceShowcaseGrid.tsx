import React from 'react';
import { Wrench, Sparkles, Volume2, Flame, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface ServiceShowcaseGridProps {
  onOpenBooking: () => void;
  onBookService: (serviceName: string) => void;
}

export const ServiceShowcaseGrid: React.FC<ServiceShowcaseGridProps> = ({ onOpenBooking, onBookService }) => {
  const categories = [
    {
      id: 'mobile-repair',
      title: 'Mobile Repair & Diagnostics',
      subtitle: 'Driveway & On-Site Service',
      description: 'We bring full shop diagnostics, brake replacement, oil changes, starters, and batteries directly to your home or office.',
      icon: <Wrench className="w-6 h-6 text-orange-400" />,
      accent: 'border-orange-500/30 hover:border-orange-500/60',
      badge: 'Free 15-Mi Dispatch',
      badgeColor: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
      items: ['Brake Pad & Rotor Swaps', 'Check Engine OBD Scans', 'Synthetic Oil Changes', 'Starter & Battery Swaps'],
      primaryService: 'Mobile Mechanic & Diagnostic Visit',
    },
    {
      id: 'detailing',
      title: 'Mobile Detailing & Protection',
      subtitle: 'Showroom Shine at Your Driveway',
      description: 'Complete interior deep cleaning, exterior ceramic coating, paint correction, and headlight restoration on-location.',
      icon: <Sparkles className="w-6 h-6 text-amber-400" />,
      accent: 'border-amber-500/30 hover:border-amber-500/60',
      badge: 'Mobile Water & Power Equipped',
      badgeColor: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      items: ['Full Synthetic Ceramic Coating', 'Interior Steam & Leather Detail', 'Paint Correction & Buffing', 'Headlight Restoration'],
      primaryService: 'Mobile Detailing & Ceramic Protection',
    },
    {
      id: 'audio-tint',
      title: 'Custom Audio, Tint & Wraps',
      subtitle: 'Style & Electronics Upgrade',
      description: 'Custom window tinting, dash cam installs, premium audio speaker upgrades, subwoofers, and vinyl color wraps.',
      icon: <Volume2 className="w-6 h-6 text-sky-400" />,
      accent: 'border-sky-500/30 hover:border-sky-500/60',
      badge: 'Lifetime Tint Warranty',
      badgeColor: 'bg-sky-500/10 border-sky-500/30 text-sky-400',
      items: ['Ceramic Window Tinting', 'Custom Audio & Subwoofer Rigs', 'Dash Cam & Radar Installs', 'Vinyl Accents & Full Wraps'],
      primaryService: 'Custom Audio & Window Tinting',
    },
    {
      id: 'performance',
      title: 'Shop Performance & Builds',
      subtitle: 'Justin Garage Hub Facility',
      description: 'Advanced garage facility for heavy suspension lifts, custom exhaust systems, cold air intakes, and engine overhauls.',
      icon: <Flame className="w-6 h-6 text-rose-400" />,
      accent: 'border-rose-500/30 hover:border-rose-500/60',
      badge: 'Heavy Lift Garage Facility',
      badgeColor: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
      items: ['Truck Suspension Lifts & Lowering', 'Custom Exhaust & Headers', 'Cold Air Intakes & Tuning', 'Engine & Transmission Swaps'],
      primaryService: 'Performance Upgrade & Garage Build',
    },
  ];

  return (
    <section className="py-16 bg-[#0b0c10] border-t border-white/10 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-12">
          <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-orange-500/10 border border-orange-500/30 text-orange-400">
            Full Automotive Capabilities
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white">
            Everything Auto — Under One Roof & At Your Door
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            From routine driveway maintenance to high-end detailing, custom audio/tint, and heavy shop performance builds.
          </p>
        </div>

        {/* 4 Category Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`rounded-3xl border bg-[#12141c] p-6 flex flex-col justify-between transition-all duration-300 hover-lift shadow-xl ${cat.accent}`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
                    {cat.icon}
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${cat.badgeColor}`}>
                    {cat.badge}
                  </span>
                </div>

                <div>
                  <h3 className="font-heading font-extrabold text-lg text-white">{cat.title}</h3>
                  <span className="text-[11px] font-semibold text-slate-400 block mt-0.5">{cat.subtitle}</span>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">{cat.description}</p>
                </div>

                <div className="pt-2 border-t border-white/5 space-y-2">
                  {cat.items.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-2 text-xs text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6">
                <button
                  onClick={() => onBookService(cat.primaryService)}
                  className="w-full py-3 px-4 rounded-xl bg-white/[0.05] hover:bg-orange-500 hover:text-white border border-white/10 hover:border-orange-500 font-bold text-xs text-slate-200 transition-all flex items-center justify-center space-x-2 group"
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
