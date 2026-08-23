import React from 'react';
import { Calendar, Truck, ShieldCheck, ArrowRight } from 'lucide-react';

interface HowItWorksSectionProps {
  onOpenBooking: () => void;
}

export const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({ onOpenBooking }) => {
  const steps = [
    {
      number: '01',
      title: 'Book in 60 Seconds',
      description:
        'Tell us your vehicle make, model, and the issue. Get an instant upfront estimate with transparent pricing and pick a time window that fits your day.',
      icon: <Calendar className="w-6 h-6 text-orange-400" />,
      badge: 'Zero Phone Tag',
    },
    {
      number: '02',
      title: 'Master Tech Dispatched',
      description:
        'A background-checked, ASE-certified technician arrives at your driveway or workplace in a fully-equipped mobile van with all professional tools and OE-grade parts.',
      icon: <Truck className="w-6 h-6 text-orange-400" />,
      badge: 'We Bring The Shop',
    },
    {
      number: '03',
      title: 'Fixed Right Where It Sits',
      description:
        'Relax inside your home while your car is repaired. You receive a digital inspection report with photos, and all work is backed by a 12-Month / 12,000-Mile Warranty.',
      icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />,
      badge: '12-Month Warranty',
    },
  ];

  return (
    <section className="py-16 bg-[#07080b] border-t border-white/10 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-7xl">
        <div className="max-w-3xl mx-auto text-center space-y-3 mb-12">
          <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-orange-500/10 border border-orange-500/30 text-orange-400">
            Effortless Auto Care
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-black text-white">
            How Doorstep Service Works
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            No towing fees. No crowded dealer waiting rooms. We make auto repair completely hassle-free.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="p-6 sm:p-7 rounded-3xl bg-[#0c0e14]/95 border border-white/10 hover:border-orange-500/40 transition-all hover:-translate-y-1 shadow-xl text-left space-y-4 relative group"
            >
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
                  {step.icon}
                </div>
                <span className="text-2xl font-black text-white/20 font-mono">{step.number}</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-white">{step.title}</h3>
                </div>
                <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 inline-block">
                  {step.badge}
                </span>
                <p className="text-xs text-slate-400 leading-relaxed pt-1">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-10 text-center">
          <button
            type="button"
            onClick={onOpenBooking}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-xl shadow-orange-500/25 transition-all transform hover:-translate-y-0.5 active:scale-95"
          >
            <span>Schedule Doorstep Repair Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
