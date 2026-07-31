import React from 'react';
import { ShieldCheck, FileText, CheckCircle2, AlertTriangle, CloudRain, Wrench, KeyRound, Leaf, Scale, Clock, ShieldAlert, MapPin, Camera, Disc, Warehouse } from 'lucide-react';
import { SITE_PHONE_DISPLAY, SITE_PHONE_TEL } from '../site/seo';

export const TermsPrivacyPage: React.FC = () => {
  return (
    <div className="py-16 bg-[#08090d] text-slate-300 min-h-screen">
      <div className="container mx-auto px-4 max-w-4xl space-y-12">
        
        {/* Page Header */}
        <div className="text-center space-y-3 border-b border-white/10 pb-8">
          <div className="inline-flex items-center space-x-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Texas Consumer Protection & Legal Disclosures</span>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-white">
            Terms of Service & Legal Policy
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto">
            Adaptivity Performance LLC • Official terms governing mobile vehicle dispatch, driveway work authorization, supplemental estimates, mechanics' liens, wheel re-torque warnings, and Denton County jurisdiction.
          </p>
        </div>

        {/* Section 1: Core Terms & Supplemental Estimates */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-6">
          <div className="flex items-center space-x-3 text-orange-400 border-b border-white/5 pb-4">
            <FileText className="w-6 h-6" />
            <h2 className="font-heading text-xl font-bold text-white">1. Service Authorization & Supplemental Estimate Rule</h2>
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
                <FileText className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                <span><strong>Supplemental Repair Authorization (Texas Teardown Rule):</strong> If hidden damage or additional required worn parts are discovered during teardown, no additional labor or parts will be billed without your explicit prior authorization via phone, SMS, or digital consent.</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span><strong>Diagnostic Fee Credit Policy:</strong> The $100 diagnostic fee is 100% credited toward completed repairs approved on-site during the dispatch visit.</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span><strong>CARFAX & AutoCheck Vehicle History Sync:</strong> Completed repair orders (Date, VIN, Mileage, and Services) are transmitted to CARFAX & Experian AutoCheck to maintain your vehicle's resale value.</span>
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

        {/* Section 3: Wheel Re-Torque Warning & Abandoned Vehicle Storage */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-6">
          <div className="flex items-center space-x-3 text-amber-400 border-b border-white/5 pb-4">
            <Disc className="w-6 h-6" />
            <h2 className="font-heading text-xl font-bold text-white">3. Wheel Re-Torque Safety Warning & Garage Storage</h2>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-[#0b0c10] p-4 rounded-2xl border border-white/5 space-y-2">
                <div className="font-bold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider text-amber-400">
                  <Disc className="w-4 h-4" /> 50-Mile Wheel Lug Re-Torque Duty
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Following any service involving wheel removal (brakes, tire service, suspension), alloy wheel lug nuts must be re-checked and re-torqued after 50 miles of driving to ensure proper wheel seating.
                </p>
              </div>

              <div className="bg-[#0b0c10] p-4 rounded-2xl border border-white/5 space-y-2">
                <div className="font-bold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider text-orange-400">
                  <Warehouse className="w-4 h-4" /> Unclaimed Vehicle Storage Fees
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Vehicles dropped off at our Justin garage hub that remain unclaimed 5 business days after repair completion notification incur a daily storage fee of $45/day pursuant to Texas Property Code § 70.003.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Cancellation Policy & Mechanics' Lien */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-6">
          <div className="flex items-center space-x-3 text-orange-400 border-b border-white/5 pb-4">
            <Clock className="w-6 h-6" />
            <h2 className="font-heading text-xl font-bold text-white">4. Dispatch Cancellation & Texas Mechanics' Lien</h2>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-[#0b0c10] p-4 rounded-2xl border border-white/5 space-y-2">
                <div className="font-bold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider text-orange-400">
                  <Clock className="w-4 h-4" /> Late Cancellation & No-Show Policy
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Mobile dispatch appointments canceled with less than 2 hours notice or customer no-shows upon mobile van arrival at customer address are subject to a $50 late dispatch fee to cover technician drive time and fuel.
                </p>
              </div>

              <div className="bg-[#0b0c10] p-4 rounded-2xl border border-white/5 space-y-2">
                <div className="font-bold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider text-amber-400">
                  <ShieldAlert className="w-4 h-4" /> Texas Mechanics' Lien Notice
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Pursuant to Texas Property Code Chapter 70 (§ 70.001), Adaptivity Performance retains a statutory mechanic's possessory lien on all vehicles for authorized labor, materials, and parts provided until invoice amounts are satisfied in full.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Pre-Existing Conditions & Customer-Supplied Parts */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-6">
          <div className="flex items-center space-x-3 text-rose-400 border-b border-white/5 pb-4">
            <Wrench className="w-6 h-6" />
            <h2 className="font-heading text-xl font-bold text-white">5. Pre-Existing Damage & Customer Parts Disclaimer</h2>
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

        {/* Section 6: Worksite Documentation & Photo Authorization */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-6">
          <div className="flex items-center space-x-3 text-emerald-400 border-b border-white/5 pb-4">
            <Camera className="w-6 h-6" />
            <h2 className="font-heading text-xl font-bold text-white">6. Photo/Video Inspection & TCEQ Compliance</h2>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-[#0b0c10] p-4 rounded-2xl border border-white/5 space-y-2">
                <div className="font-bold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider text-emerald-400">
                  <Camera className="w-4 h-4" /> Digital Photo Inspection Authorization
                </div>
                <p className="text-slate-300 leading-relaxed">
                  You authorize technicians to photograph vehicle condition, VIN plate, odometer readings, trouble codes, and replaced parts for quality control, digital inspection reports, and warranty verification.
                </p>
              </div>

              <div className="bg-[#0b0c10] p-4 rounded-2xl border border-white/5 space-y-2">
                <div className="font-bold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider text-emerald-400">
                  <Leaf className="w-4 h-4" /> TCEQ Eco-Friendly Fluid Recycling
                </div>
                <p className="text-slate-300 leading-relaxed">
                  We strictly comply with Texas Commission on Environmental Quality (TCEQ) standards. All extracted motor oil, coolant, brake fluid, and old lead-acid batteries are contained and transported to certified eco-recycling centers.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 7: Limitation of Liability & Jurisdiction */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-6">
          <div className="flex items-center space-x-3 text-sky-400 border-b border-white/5 pb-4">
            <Scale className="w-6 h-6" />
            <h2 className="font-heading text-xl font-bold text-white">7. Limitation of Liability & Denton County Jurisdiction</h2>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-[#0b0c10] p-4 rounded-2xl border border-white/5 space-y-2">
                <div className="font-bold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider text-sky-400">
                  <Scale className="w-4 h-4" /> Liability Cap & Consequential Damages
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Adaptivity Performance's total aggregate liability for any claim arising from service shall not exceed the total dollar amount paid for the specific repair order. We are not liable for indirect, incidental, or consequential damages (such as lost wages or rental vehicle expenses).
                </p>
              </div>

              <div className="bg-[#0b0c10] p-4 rounded-2xl border border-white/5 space-y-2">
                <div className="font-bold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider text-sky-400">
                  <MapPin className="w-4 h-4" /> Governing Law: Denton County, TX
                </div>
                <p className="text-slate-300 leading-relaxed">
                  These terms are governed strictly by the laws of the State of Texas. Any legal action, dispute, or arbitration shall be brought exclusively in state or federal courts located in Denton County, Texas.
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
