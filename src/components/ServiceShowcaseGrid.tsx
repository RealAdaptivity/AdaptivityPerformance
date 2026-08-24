import React from 'react';
import { Wrench, Bike, Flame, ArrowRight, CheckCircle2 } from 'lucide-react';

interface ServiceShowcaseGridProps {
  onBookService: (serviceName: string) => void;
}

export const ServiceShowcaseGrid: React.FC<ServiceShowcaseGridProps> = ({ onBookService }) => {
  const categories = [
    {
      id: 'mobile-repair',
      title: 'Mobile Auto Repair & Diagnostics',
      subtitle: 'Driveway & Workplace Dispatch',
      description: 'We bring full shop diagnostics, brake replacement, oil changes, starters, and batteries directly to your home or office.',
      icon: <Wrench className="w-6 h-6 text-orange-400" />,
      accent: 'hover:border-orange-500/50 hover:shadow-[0_0_30px_rgba(249,115,22,0.12)]',
      badge: 'Active Service',
      badgeColor: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      items: ['Brake Pad & Rotor Swaps', 'Check Engine OBD-II Scans', 'Synthetic Oil Services', 'Starter & Battery Swaps'],
      primaryService: 'Mobile Mechanic & Diagnostic Visit',
      isComingSoon: false,
    },
    {
      id: 'motorcycle',
      title: 'Motorcycle Repair & Service',
      subtitle: 'Two-Wheel Mechanical',
      description: 'Diagnostics, maintenance, and mechanical repair for motorcycles — same upfront $85 diagnostic visit and on-site pricing.',
      icon: <Bike className="w-6 h-6 text-orange-400" />,
      accent: 'hover:border-orange-500/50 hover:shadow-[0_0_30px_rgba(249,115,22,0.12)]',
      badge: 'Active Service',
      badgeColor: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      items: ['Diagnostics & Tune-Ups', 'Brake & Fluid Service', 'Battery & Electrical', 'Maintenance & Repair'],
      primaryService: 'Motorcycle Repair & Diagnostic Visit',
      isComingSoon: false,
    },
    {
      id: 'performance',
      title: 'Performance & Builds',
      subtitle: 'Upgrades & Modifications',
      description: 'Suspension lifts and leveling, custom exhaust systems, cold air intakes, and performance tuning.',
      icon: <Flame className="w-6 h-6 text-orange-400" />,
      accent: 'hover:border-orange-500/50 hover:shadow-[0_0_30px_rgba(249,115,22,0.12)]',
      badge: 'Active Service',
      badgeColor: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      items: ['Suspension Lifts & Leveling', 'Custom Exhaust & Headers', 'Cold Air Intakes & Tuning', 'Performance Upgrades'],
      primaryService: 'Performance Upgrade & Build',
      isComingSoon: false,
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
            Everything Automotive — Built for North Texas
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Doorstep auto and motorcycle repair, diagnostics, and performance builds across North Texas.
          </p>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
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
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center space-x-2 group hover:scale-[1.02] active:scale-95"
                >
                  <span>Book Service</span>
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
