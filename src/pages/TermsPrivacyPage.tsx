import React from 'react';
import { ShieldCheck, FileText, Lock, CheckCircle2, AlertTriangle, CloudRain, Wrench, KeyRound, Leaf } from 'lucide-react';
import { SITE_PHONE_DISPLAY, SITE_PHONE_TEL } from '../site/seo';

export const TermsPrivacyPage: React.FC = () => {
  return (
    <div className="py-16 bg-[#08090d] text-slate-300 min-h-screen">
      <div className="container mx-auto px-4 max-w-4xl space-y-12">
        
        {/* Page Header */}
        <div className="text-center space-y-3 border-b border-white/10 pb-8">
          <div className="inline-flex items-center space-x-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Texas Consumer Protection & Operational Terms</span>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-white">
            Terms of Service & Legal Disclosures
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto">
            Adaptivity Performance LLC • Official terms governing mobile vehicle dispatch, driveway work authorization, parts warranties, pre-existing conditions, and environmental safety.
          </p>
        </div>

        {/* Section 1: Core Terms & Service Authorization */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-6">
          <div className="flex items-center space-x-3 text-orange-400 border-b border-white/5 pb-4">
            <FileText className="w-6 h-6" />
            <h2 className="font-heading text-xl font-bold text-white">1. Service Authorization & Diagnostic Terms</h2>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <p>
              By requesting mobile mechanic dispatch, booking garage hub repairs, or providing a VIN for estimates, you agree to the following operational authorizations:
            </p>

            <div className="space-y-3 bg-[#0b0c10] p-4 rounded-2xl border border-white/5 text-xs">
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span><strong>Service Authorization & Test Driving:</strong> You grant certified Adaptivity Performance technicians permission to operate, test-drive on DFW public roads, and perform authorized diagnostic scans and mechanical repairs on your vehicle.</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span><strong>Diagnostic Fee Credit Policy:</strong> The $100 diagnostic fee is 100% credited toward completed repairs approved on-site during the dispatch visit.</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span><strong>CARFAX & AutoCheck Vehicle History Sync:</strong> Completed repair orders (Date, VIN, Mileage, and Services) are transmitted to CARFAX & Experian AutoCheck to maintain your vehicle's resale value and service records.</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Property Access & Weather Rescheduling */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-6">
          <div className="flex items-center space-x-3 text-amber-400 border-b border-white/5 pb-4">
            <KeyRound className="w-6 h-6" />
            <h2 className="font-heading text-xl font-bold text-white">2. Driveway Property Access & Weather Safety</h2>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-[#0b0c10] p-4 rounded-2xl border border-white/5 space-y-2">
                <div className="font-bold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider text-amber-400">
                  <KeyRound className="w-4 h-4" /> Driveway & Property Access
                </div>
                <p className="text-slate-300 leading-relaxed">
                  You authorize technicians to enter your designated driveway, parking space, or residential location. Customers are responsible for providing clear 4-foot clearance around vehicle work zones and ensuring pets are secured.
                </p>
              </div>

              <div className="bg-[#0b0c10] p-4 rounded-2xl border border-white/5 space-y-2">
                <div className="font-bold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider text-sky-400">
                  <CloudRain className="w-4 h-4" /> Texas Weather Safety Clause
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Mobile outdoor repairs may be rescheduled without penalty in the event of severe North Texas weather (severe lightning, hail, flash flooding, sub-zero freezes, or dangerous wind conditions).
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Pre-Existing Conditions & Customer-Supplied Parts */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-6">
          <div className="flex items-center space-x-3 text-rose-400 border-b border-white/5 pb-4">
            <Wrench className="w-6 h-6" />
            <h2 className="font-heading text-xl font-bold text-white">3. Pre-Existing Damage & Customer Parts Disclaimer</h2>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <div className="space-y-3 bg-[#0b0c10] p-4 rounded-2xl border border-white/5 text-xs">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span><strong>Pre-Existing Rust & Aged Hardware:</strong> Technicians exercise maximum care, but Adaptivity Performance is not responsible for pre-existing rusted exhaust bolts, seized factory hardware, or brittle plastic engine covers broken during standard disassembly of aged high-mileage vehicles.</span>
              </div>

              <div className="flex items-start space-x-2">
                <Wrench className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                <span><strong>Customer-Supplied Parts Policy:</strong> If a customer provides their own aftermarket parts, technician labor is covered for initial installation only. The 12-Month / 12,000-Mile Warranty applies exclusively to shop-supplied OEM & premium-grade parts.</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Privacy & TCEQ Environmental Compliance */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-6">
          <div className="flex items-center space-x-3 text-emerald-400 border-b border-white/5 pb-4">
            <Leaf className="w-6 h-6" />
            <h2 className="font-heading text-xl font-bold text-white">4. TCEQ Environmental Compliance & Data Privacy</h2>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-[#0b0c10] p-4 rounded-2xl border border-white/5 space-y-2">
                <div className="font-bold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider text-emerald-400">
                  <Leaf className="w-4 h-4" /> Eco-Friendly Fluid Recycling
                </div>
                <p className="text-slate-300 leading-relaxed">
                  We strictly comply with Texas Commission on Environmental Quality (TCEQ) standards. All extracted motor oil, coolant, brake fluid, and old lead-acid batteries are contained and transported to certified eco-recycling centers.
                </p>
              </div>

              <div className="bg-[#0b0c10] p-4 rounded-2xl border border-white/5 space-y-2">
                <div className="font-bold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider text-emerald-400">
                  <Lock className="w-4 h-4" /> Consumer Privacy & PCI Compliance
                </div>
                <p className="text-slate-300 leading-relaxed">
                  We never sell customer phone numbers or addresses to third parties. All online payments and hold authorizations are encrypted via PCI-DSS compliant Stripe Connect.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Support */}
        <div className="bg-[#0b0c10] p-6 rounded-2xl border border-white/10 text-center space-y-2">
          <h3 className="font-bold text-white text-sm">Questions Regarding Terms or Disclosures?</h3>
          <p className="text-xs text-slate-400">
            Contact Adaptivity Support Dispatch: <a href={SITE_PHONE_TEL} className="text-orange-400 font-bold hover:underline">{SITE_PHONE_DISPLAY}</a>
          </p>
        </div>

      </div>
    </div>
  );
};
