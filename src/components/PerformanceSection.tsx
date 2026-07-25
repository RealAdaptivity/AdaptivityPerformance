import React from 'react';
import { Flame, ArrowRight, CheckCircle2 } from 'lucide-react';

interface PerformanceSectionProps {
  onOpenBooking: () => void;
}

const PERFORMANCE_SERVICES = [
  {
    title: 'Truck Lifts & Leveling Kits',
    tag: 'Suspension',
    description: 'Precision 2"-6" lift kits, coilover upgrades, and leveling kits engineered for North Texas trucks.',
    specs: ['Rough Country & Icon Certified', 'Includes camber/caster alignment', 'Driveway or Shop install'],
    highlightPrice: 'From $450',
  },
  {
    title: 'High-Flow Exhaust & Intakes',
    tag: 'Performance Bolt-Ons',
    description: 'Cat-back exhaust systems, headers, and cold air intakes for aggressive tone and added horsepower.',
    specs: ['Magnaflow, Borla & MBRP', 'Improved gas mileage & throttle', 'Clean custom fitment'],
    highlightPrice: 'From $320',
  },
  {
    title: 'Heavy Duty Towing & Brake Upgrades',
    tag: 'Brakes & Towing',
    description: 'Slotted/drilled heavy rotors, high-friction pads, and trailer brake controller setups for heavy loads.',
    specs: ['Zero brake fade under load', 'Braided stainless brake lines', 'Ideal for horse & RV trailers'],
    highlightPrice: 'From $390',
  },
  {
    title: 'ECU Tuning & Diagnostics',
    tag: 'Electronics',
    description: 'Custom engine tuning, speedometer recalibration for larger tires, and full computer re-flashing.',
    specs: ['Superchips & HP Tuners', 'Tire size gear ratio fixes', 'Live telemetry monitoring'],
    highlightPrice: 'From $250',
  },
];

export const PerformanceSection: React.FC<PerformanceSectionProps> = ({ onOpenBooking }) => {
  return (
    <section id="performance" className="py-20 bg-[#0b0c10] relative">
      <div className="container mx-auto px-4 relative z-10">

        {/* Header */}
        <div className="max-w-3xl mx-auto text-center space-y-3 mb-12">
          <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
            <Flame className="w-3.5 h-3.5" />
            <span>Adaptivity Performance Division</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white">
            High Performance & <span className="text-orange-500">Custom Upgrades</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            From leveling kits on daily drivers to custom exhaust bolt-ons and heavy towing upgrades, our shop delivers precision installation backed by warranty.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {PERFORMANCE_SERVICES.map((item, index) => (
            <div
              key={index}
              className="bg-gradient-to-b from-[#12141c] to-[#0d0e14] p-6 rounded-2xl border border-white/10 hover:border-orange-500/40 transition-all group shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  {item.tag}
                </span>
                <span className="font-extrabold text-sm text-amber-400 font-heading">
                  {item.highlightPrice}
                </span>
              </div>

              <h3 className="font-heading text-xl font-bold text-white group-hover:text-orange-400 transition-colors">
                {item.title}
              </h3>

              <p className="text-xs text-slate-400 leading-relaxed">
                {item.description}
              </p>

              <div className="space-y-2 pt-2 border-t border-white/5">
                {item.specs.map((spec, sIdx) => (
                  <div key={sIdx} className="flex items-center space-x-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                    <span>{spec}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={onOpenBooking}
                className="w-full mt-2 py-2.5 bg-slate-800 hover:bg-orange-500 text-slate-200 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center space-x-1.5"
              >
                <span>Request Custom Quote</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
