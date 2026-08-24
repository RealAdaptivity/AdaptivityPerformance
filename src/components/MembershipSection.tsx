import React from 'react';
import { ShieldCheck, Check, Sparkles, ArrowRight } from 'lucide-react';

interface MembershipSectionProps {
  onOpenMembership: (planId?: 'basic' | 'vip' | 'fleet') => void;
}

export const MembershipSection: React.FC<MembershipSectionProps> = ({ onOpenMembership }) => {
  return (
    <section id="membership" className="py-20 bg-[#0d0e14] border-t border-white/10 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="container mx-auto px-4 relative z-10 space-y-12">
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-2 bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 rounded-full text-xs font-bold text-amber-400">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>ADAPTIVITY SHIELD VIP MEMBERSHIP</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-heading font-black text-white">
            Never Pay a Mobile Travel Fee Again. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500">
              Save Up to $450/Year on Maintenance.
            </span>
          </h2>

          <p className="text-sm text-slate-300">
            Join the **Adaptivity Shield** care plan for zero dispatch fees, free synthetic oil changes, 15% labor discounts, and priority mobile response across Justin & Northlake.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          
          {/* Basic Care */}
          <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 flex flex-col justify-between space-y-6 hover:border-amber-500/50 transition-all shadow-xl">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 bg-white/5 px-2.5 py-1 rounded-md">Essential</span>
                <span className="text-sm text-slate-400">$199 / yr</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Basic Care</h3>
                <div className="text-3xl font-black text-amber-400 font-mono mt-1">$19<span className="text-xs text-slate-400 font-sans"> / mo</span></div>
              </div>
              <p className="text-xs text-slate-300">Ideal for single-vehicle drivers seeking guaranteed $0 travel charges.</p>
              <ul className="space-y-2.5 text-xs text-slate-300 pt-2 border-t border-white/5">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> <strong>$0 Travel & Dispatch Fees</strong> ($45 value/visit)</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> <strong>10% Off</strong> All Labor & Diagnostics</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> 1 Free Annual Digital Inspection (DVI)</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Priority Hotline · 8AM–10PM Daily</li>
              </ul>
            </div>
            <button
              onClick={() => onOpenMembership('basic')}
              className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs border border-white/10 transition-all"
            >
              Choose Basic Care
            </button>
          </div>

          {/* Performance VIP (Highlighted) */}
          <div className="bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-900 border-2 border-amber-500 rounded-3xl p-6 flex flex-col justify-between space-y-6 shadow-2xl shadow-amber-500/20 relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-extrabold uppercase px-4 py-1 rounded-full shadow-lg flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 fill-white" />
              <span>Most Popular</span>
            </div>

            <div className="space-y-4 pt-1">
              <div className="flex justify-between items-center">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2.5 py-1 rounded-md border border-amber-500/30">VIP Protection</span>
                <span className="text-sm text-amber-300 font-mono">$399 / yr</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  Performance VIP
                </h3>
                <div className="text-3xl font-black text-amber-400 font-mono mt-1">$39<span className="text-xs text-slate-400 font-sans"> / mo</span></div>
              </div>
              <p className="text-xs text-slate-300">Complete vehicle protection with 2 free synthetic oil services & towing allowance.</p>
              <ul className="space-y-2.5 text-xs text-slate-300 pt-2 border-t border-white/5">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> <strong>$0 Travel & Dispatch Fees</strong> ($45 value/visit)</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> <strong>15% Off</strong> All Repair Labor & Upgrades</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-400 font-bold" /> <strong>2 Free Synthetic Oil Changes/Yr</strong> ($190 value)</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Unlimited Free Digital Inspections (DVI)</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> 25-Mile Roadside Towing Allowance</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Guaranteed &lt;30 Min Priority Dispatch</li>
              </ul>
            </div>
            <button
              onClick={() => onOpenMembership('vip')}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs shadow-lg shadow-orange-500/25 flex items-center justify-center space-x-2 transition-all"
            >
              <span>Enroll in Performance VIP</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Fleet Master Care */}
          <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 flex flex-col justify-between space-y-6 hover:border-amber-500/50 transition-all shadow-xl">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 bg-white/5 px-2.5 py-1 rounded-md">B2B Commercial</span>
                <span className="text-sm text-slate-400">$899 / yr</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Fleet Master Care</h3>
                <div className="text-3xl font-black text-amber-400 font-mono mt-1">$89<span className="text-xs text-slate-400 font-sans"> / mo</span></div>
              </div>
              <p className="text-xs text-slate-300">Commercial fleet care for local business work vans & trucks up to 5 vehicles.</p>
              <ul className="space-y-2.5 text-xs text-slate-300 pt-2 border-t border-white/5">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> <strong>Up to 5 Fleet Vehicles Covered</strong></li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> <strong>20% Off</strong> All Repairs & Service Labor</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> 4 Free Synthetic Oil Changes/Yr</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Quarterly Multi-Point Fleet Inspections</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Dedicated Account Manager</li>
              </ul>
            </div>
            <button
              onClick={() => onOpenMembership('fleet')}
              className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs border border-white/10 transition-all"
            >
              Choose Fleet Master
            </button>
          </div>

        </div>
      </div>
    </section>
  );
};
