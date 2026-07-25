import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Check, Sparkles, Sliders, Zap } from 'lucide-react';

interface MembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlanId?: 'basic' | 'vip' | 'fleet';
}

export const MembershipModal: React.FC<MembershipModalProps> = ({
  isOpen,
  onClose,
  initialPlanId = 'vip',
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'vip' | 'fleet'>(initialPlanId);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [annualVisits, setAnnualVisits] = useState<number>(3);
  
  // Member Form State
  const [memberName, setMemberName] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [vehicleInfo, setVehicleInfo] = useState('2021 Ford F-150 SuperCrew');
  const [isActivated, setIsActivated] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedPlan(initialPlanId || 'vip');
      setIsActivated(false);
    }
  }, [isOpen, initialPlanId]);

  if (!isOpen) return null;

  // Pricing definitions
  const pricing = {
    basic: { monthly: 19, annual: 199, laborDiscount: 0.10, travelSaved: 45, oilChangesIncluded: 0 },
    vip: { monthly: 39, annual: 399, laborDiscount: 0.15, travelSaved: 45, oilChangesIncluded: 2 },
    fleet: { monthly: 89, annual: 899, laborDiscount: 0.20, travelSaved: 45, oilChangesIncluded: 4 },
  };

  const currentPriceObj = pricing[selectedPlan];
  const priceDisplay = billingCycle === 'annual' ? currentPriceObj.annual : currentPriceObj.monthly;

  // Calculate annual savings
  const avgRepairBill = 350; // average repair labor & service
  const laborSavingsPerVisit = avgRepairBill * currentPriceObj.laborDiscount;
  const travelSavingsTotal = annualVisits * currentPriceObj.travelSaved;
  const oilSavingsTotal = currentPriceObj.oilChangesIncluded * 95;
  const totalGrossSavings = (annualVisits * laborSavingsPerVisit) + travelSavingsTotal + oilSavingsTotal;
  const planAnnualCost = currentPriceObj.annual;
  const netAnnualSavings = Math.max(50, Math.round(totalGrossSavings - planAnnualCost));

  const handleEnrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsActivated(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="bg-[#12141c] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#1a1d28] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-heading font-extrabold text-lg text-white">Adaptivity Shield VIP Membership</h2>
                <span className="text-[11px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-bold uppercase">
                  VIP Protection
                </span>
              </div>
              <p className="text-xs text-slate-400">Zero travel fees, free oil services, labor discounts & priority mobile dispatch.</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          {isActivated ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 bg-amber-500/20 border border-amber-500/40 rounded-full flex items-center justify-center mx-auto text-amber-400 animate-bounce">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-heading font-black text-white">Welcome to Adaptivity Shield VIP!</h3>
              <p className="text-sm text-slate-300 max-w-md mx-auto">
                Member Badge Activated for <strong>{memberName}</strong> ({vehicleInfo}). Your <strong>{selectedPlan.toUpperCase()} Plan</strong> benefits (including $0 travel fees & labor discounts) are now linked to your phone number: <strong>{memberPhone}</strong>.
              </p>
              <div className="pt-4">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold text-xs shadow-lg shadow-orange-500/20"
                >
                  Return to Site & Use Member Perks
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Billing Cycle Toggle Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950/80 border border-white/10 p-4 rounded-2xl">
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-semibold text-slate-300">Billing Cycle:</span>
                  <div className="bg-slate-900 p-1 rounded-xl border border-white/10 flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setBillingCycle('monthly')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        billingCycle === 'monthly' ? 'bg-orange-500 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Monthly Billing
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingCycle('annual')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        billingCycle === 'annual' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>Annual Billing</span>
                      <span className="text-[9px] bg-emerald-400 text-slate-950 px-1.5 py-0.2 rounded font-extrabold uppercase">Save 2 Months</span>
                    </button>
                  </div>
                </div>

                <div className="text-right text-xs">
                  <span className="text-slate-400 block">Selected Plan Rate</span>
                  <span className="text-xl font-black text-amber-400 font-mono">
                    ${priceDisplay} <span className="text-xs text-slate-400 font-sans">/ {billingCycle === 'annual' ? 'year' : 'month'}</span>
                  </span>
                </div>
              </div>

              {/* Plan Selection Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Basic Care */}
                <div
                  onClick={() => setSelectedPlan('basic')}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all relative flex flex-col justify-between ${
                    selectedPlan === 'basic'
                      ? 'bg-slate-900 border-amber-500 shadow-lg shadow-amber-500/10'
                      : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-base text-white">Basic Care</h4>
                      <span className="text-xs text-slate-400 font-mono">${pricing.basic.annual}/yr</span>
                    </div>
                    <p className="text-xs text-slate-300">Essential protection for single vehicle owners needing zero travel fees.</p>
                    <ul className="space-y-2 text-xs text-slate-300 pt-2">
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> $0 Travel/Dispatch Fees</li>
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> 10% Off All Repairs & Labor</li>
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> 1 Free Annual Digital Inspection</li>
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> 24/7 Priority Phone Support</li>
                    </ul>
                  </div>
                  <div className="pt-4">
                    <span className={`w-full block text-center text-xs font-bold py-2 rounded-xl border ${
                      selectedPlan === 'basic' ? 'bg-amber-500 text-white border-amber-500' : 'border-white/10 text-slate-400'
                    }`}>
                      {selectedPlan === 'basic' ? '✓ Selected Plan' : 'Choose Basic'}
                    </span>
                  </div>
                </div>

                {/* Performance VIP (Recommended) */}
                <div
                  onClick={() => setSelectedPlan('vip')}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all relative flex flex-col justify-between ${
                    selectedPlan === 'vip'
                      ? 'bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-900 border-amber-500 shadow-xl shadow-amber-500/20'
                      : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-extrabold uppercase px-3 py-0.5 rounded-full shadow">
                    Most Popular
                  </div>

                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-base text-amber-400 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        Performance VIP
                      </h4>
                      <span className="text-xs text-amber-300 font-mono">${pricing.vip.annual}/yr</span>
                    </div>
                    <p className="text-xs text-slate-300">Complete peace of mind with 2 free oil changes, 15% discounts & towing.</p>
                    <ul className="space-y-2 text-xs text-slate-300 pt-2">
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> $0 Travel/Dispatch Fees</li>
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> 15% Off All Repairs & Upgrades</li>
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-400 font-bold" /> 2 Free Synthetic Oil Changes/Yr</li>
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Unlimited Free Digital Inspections</li>
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> 25-Mile Free Towing Allowance</li>
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> &lt;30 Min Priority Dispatch</li>
                    </ul>
                  </div>
                  <div className="pt-4">
                    <span className={`w-full block text-center text-xs font-bold py-2 rounded-xl ${
                      selectedPlan === 'vip' ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg' : 'border border-white/10 text-slate-400'
                    }`}>
                      {selectedPlan === 'vip' ? '✓ Selected VIP Plan' : 'Choose Performance VIP'}
                    </span>
                  </div>
                </div>

                {/* Fleet Master Care */}
                <div
                  onClick={() => setSelectedPlan('fleet')}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all relative flex flex-col justify-between ${
                    selectedPlan === 'fleet'
                      ? 'bg-slate-900 border-amber-500 shadow-lg shadow-amber-500/10'
                      : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-base text-white">Fleet Master Care</h4>
                      <span className="text-xs text-slate-400 font-mono">${pricing.fleet.annual}/yr</span>
                    </div>
                    <p className="text-xs text-slate-300">Commercial & multi-vehicle coverage for local businesses up to 5 vehicles.</p>
                    <ul className="space-y-2 text-xs text-slate-300 pt-2">
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Covers Up to 5 Vehicles</li>
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> 20% Off All Labor Costs</li>
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> 4 Free Synthetic Oil Services</li>
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Quarterly Fleet Inspections</li>
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400" /> Dedicated Account Manager</li>
                    </ul>
                  </div>
                  <div className="pt-4">
                    <span className={`w-full block text-center text-xs font-bold py-2 rounded-xl border ${
                      selectedPlan === 'fleet' ? 'bg-amber-500 text-white border-amber-500' : 'border-white/10 text-slate-400'
                    }`}>
                      {selectedPlan === 'fleet' ? '✓ Selected Fleet' : 'Choose Fleet Master'}
                    </span>
                  </div>
                </div>

              </div>

              {/* Interactive Annual Savings Calculator */}
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-white/10 rounded-2xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-heading font-extrabold text-sm text-white flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-orange-400" />
                      Interactive Member Savings Calculator
                    </h4>
                    <p className="text-xs text-slate-400">Estimate how much Adaptivity Shield saves you each year based on your service frequency.</p>
                  </div>

                  <div className="text-right bg-emerald-950/40 border border-emerald-500/30 px-4 py-2 rounded-xl">
                    <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider block">Estimated Net Savings</span>
                    <span className="text-2xl font-black text-emerald-400 font-mono">+${netAnnualSavings}.00 / yr</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Estimated Annual Service Visits / Oil Changes: <strong>{annualVisits} visits per year</strong></span>
                    <span className="font-mono text-slate-400">{(annualVisits * 5000).toLocaleString()} miles driven/yr</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={6}
                    value={annualVisits}
                    onChange={e => setAnnualVisits(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>1 visit (Minimal)</span>
                    <span>3 visits (Average Driver)</span>
                    <span>6 visits (High Mileage / Fleet)</span>
                  </div>
                </div>
              </div>

              {/* Member Enrollment Form */}
              <form onSubmit={handleEnrollSubmit} className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 space-y-4">
                <h4 className="font-heading font-extrabold text-sm text-white">Enrollment Member Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Primary Member Full Name</label>
                    <input
                      type="text"
                      required
                      value={memberName}
                      onChange={e => setMemberName(e.target.value)}
                      placeholder="e.g. Robert Davis"
                      className="w-full bg-slate-900/80 border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Phone Number (Linked to Dispatch)</label>
                    <input
                      type="tel"
                      required
                      value={memberPhone}
                      onChange={e => setMemberPhone(e.target.value)}
                      placeholder="(214) 555-9012"
                      className="w-full bg-slate-900/80 border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Email Address for Receipts</label>
                    <input
                      type="email"
                      required
                      value={memberEmail}
                      onChange={e => setMemberEmail(e.target.value)}
                      placeholder="robert@gmail.com"
                      className="w-full bg-slate-900/80 border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Primary Covered Vehicle</label>
                    <input
                      type="text"
                      required
                      value={vehicleInfo}
                      onChange={e => setVehicleInfo(e.target.value)}
                      placeholder="e.g. 2021 Ford F-150"
                      className="w-full bg-slate-900/80 border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-white/10">
                  <div className="text-xs">
                    <span className="text-slate-400 block">Total Billed Today</span>
                    <span className="text-lg font-bold text-white font-mono">${priceDisplay}</span>
                  </div>

                  <button
                    type="submit"
                    className="px-7 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs shadow-lg shadow-amber-500/25 flex items-center space-x-2"
                  >
                    <Zap className="w-4 h-4 fill-white" />
                    <span>Activate Adaptivity Shield Badge</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
