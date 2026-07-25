import React from 'react';
import { Wrench, ShieldCheck, DollarSign, Truck, ArrowRight, UserPlus, CheckCircle } from 'lucide-react';

interface TechRecruitmentSectionProps {
  onOpenRecruitment: () => void;
}

export const TechRecruitmentSection: React.FC<TechRecruitmentSectionProps> = ({ onOpenRecruitment }) => {
  return (
    <section className="py-16 bg-gradient-to-b from-[#0b0c10] via-[#12141d] to-[#0b0c10] border-t border-white/10 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-orange-500/30 rounded-3xl p-8 lg:p-12 shadow-2xl shadow-orange-500/10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center space-x-2 bg-orange-500/10 border border-orange-500/30 px-3.5 py-1.5 rounded-full text-xs font-bold text-orange-400">
                <UserPlus className="w-4 h-4 text-orange-400" />
                <span>NOW HIRING: Mobile Automotive Technicians</span>
              </div>

              <h2 className="text-3xl lg:text-4xl font-heading font-black text-white leading-tight">
                Got Your Own Tools & Rig? <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-amber-400 to-orange-500">
                  Mechanics Keep 80% of Labor Billed ($65–$95+/hr)
                </span>
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed">
                Adaptivity Performance is expanding mobile service units in <strong>Justin, Northlake, Haslet, Argyle, and Denton</strong>. We handle customer acquisition, dispatch software, parts delivery logistics, and invoicing—you keep 80% of the revenue!
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="flex items-start space-x-3 bg-white/[0.03] border border-white/5 p-3.5 rounded-xl">
                  <Wrench className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-bold mb-0.5">Bring Your Own Tools</strong>
                    <span className="text-slate-400">Hand tools, impact sets, & OBD-II scanner required.</span>
                  </div>
                </div>

                <div className="flex items-start space-x-3 bg-white/[0.03] border border-white/5 p-3.5 rounded-xl">
                  <DollarSign className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-bold mb-0.5">80% Revenue Split + 100% Tips</strong>
                    <span className="text-slate-400">80/20 split on labor billed or flat hourly base.</span>
                  </div>
                </div>

                <div className="flex items-start space-x-3 bg-white/[0.03] border border-white/5 p-3.5 rounded-xl">
                  <Truck className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-bold mb-0.5">Own Vehicle / Utility Rig</strong>
                    <span className="text-slate-400">Dispatch straight from your driveway to nearby jobs.</span>
                  </div>
                </div>

                <div className="flex items-start space-x-3 bg-white/[0.03] border border-white/5 p-3.5 rounded-xl">
                  <ShieldCheck className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-bold mb-0.5">Full Dispatch & Parts Support</strong>
                    <span className="text-slate-400">Parts delivered directly to job site or local pickup.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Card / CTA Callout */}
            <div className="lg:col-span-5">
              <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-6 space-y-6 text-center">
                <div className="space-y-1">
                  <span className="text-xs uppercase font-extrabold tracking-wider text-amber-400 block">Weekly Income Projection</span>
                  <div className="text-3xl font-black text-white font-mono">$1,800 – $2,500<span className="text-xs text-slate-400 font-sans"> / wk</span></div>
                  <p className="text-[11px] text-slate-400">Based on 30–40 billable mobile repair hours in Justin/Northlake.</p>
                </div>

                <div className="space-y-2 text-left text-xs text-slate-300 bg-white/[0.02] p-4 rounded-xl border border-white/5">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>ASE Master Tech mentoring available</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Weekly direct deposit payouts</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Tool replacement allowance</span>
                  </div>
                </div>

                <button
                  onClick={onOpenRecruitment}
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm shadow-xl shadow-orange-500/25 flex items-center justify-center space-x-2 transition-all active:scale-95"
                >
                  <span>Apply Now as a Mobile Mechanic</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};
