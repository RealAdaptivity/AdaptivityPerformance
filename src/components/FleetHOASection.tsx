import React, { useState } from 'react';
import { Building2, Truck, ShieldCheck, CheckCircle2, ArrowRight, Mail } from 'lucide-react';

interface FleetHOASectionProps {
  onOpenBooking: () => void;
  onOpenPartnerApply: () => void;
}

export const FleetHOASection: React.FC<FleetHOASectionProps> = ({ onOpenBooking, onOpenPartnerApply }) => {
  const [activeTab, setActiveTab] = useState<'fleet' | 'hoa'>('fleet');

  return (
    <section className="py-16 bg-[#0c0d12] border-t border-white/10 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-10">
          <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-sky-500/10 border border-sky-500/30 text-sky-400 uppercase tracking-widest">
            Commercial & Neighborhood Partnerships
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white">
            Fleet Maintenance & HOA Community Perks
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Dedicated on-site maintenance packages for business fleets and exclusive residential neighborhood discounts across North Texas.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex justify-center mb-8">
          <div className="p-1.5 bg-[#12141c] rounded-xl border border-white/10 inline-flex gap-2">
            <button
              onClick={() => setActiveTab('fleet')}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'fleet'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Commercial Fleets</span>
            </button>

            <button
              onClick={() => setActiveTab('hoa')}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'hoa'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>HOA & Neighborhood Perks</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-4xl mx-auto p-8 rounded-2xl border border-white/10 bg-[#12141c] shadow-2xl">
          {activeTab === 'fleet' ? (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Truck className="w-5 h-5 text-orange-400" />
                    <span>Commercial Fleet On-Site Maintenance</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Keep your work trucks, HVAC vans, delivery vehicles, and landscaping fleets running without downtime.
                  </p>
                </div>
                <span className="px-3 py-1 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold rounded-lg self-start md:self-auto">
                  After-Hours On-Site Service
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
                <div className="flex items-start space-x-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block text-sm">After-Hours & Weekend Servicing</strong>
                    <p className="text-slate-400">We service your fleet when your drivers are off, preventing costly business downtime.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block text-sm">Priority Fleet Billing & 1099 Invoicing</strong>
                    <p className="text-slate-400">Streamlined business invoicing with automated digital inspection records per vehicle.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block text-sm">Routine Fluid & Brake Swaps</strong>
                    <p className="text-slate-400">Scheduled oil changes, brake pads, tire rotations, and battery testing directly at your lot.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block text-sm">Multi-Vehicle Discount Rates</strong>
                    <p className="text-slate-400">Volume labor discounts for local fleets with 3+ commercial vehicles in DFW.</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3 items-center justify-between border-t border-white/10">
                <p className="text-xs text-slate-400">
                  Ready to set up your fleet account? Talk to our commercial dispatch team.
                </p>
                <button
                  onClick={onOpenPartnerApply}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-lg hover:scale-105 transition-transform"
                >
                  <span>Apply for Fleet Account</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-sky-400" />
                    <span>HOA & Master-Planned Community Perks</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Special driveway repair rates for residents in Harvest, Canyon Falls, Pecan Square, and Sendera Ranch.
                  </p>
                </div>
                <span className="px-3 py-1 bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-bold rounded-lg self-start md:self-auto">
                  $20 Resident Discount Code
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
                <div className="flex items-start space-x-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <ShieldCheck className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block text-sm">Clean Driveway Guarantee</strong>
                    <p className="text-slate-400">We use spill mats and specialized fluid extractors to guarantee 0 oil drops on your driveway.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <ShieldCheck className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block text-sm">Community Service Days</strong>
                    <p className="text-slate-400">We host dedicated neighborhood mobile oil change & brake service days inside your community.</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3 items-center justify-between border-t border-white/10">
                <p className="text-xs text-slate-400">
                  Are you an HOA board member or neighborhood coordinator? Request a custom community promo code.
                </p>
                <button
                  onClick={onOpenBooking}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-lg hover:scale-105 transition-transform"
                >
                  <Mail className="w-4 h-4" />
                  <span>Request HOA Community Partnership</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
