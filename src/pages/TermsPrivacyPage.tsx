import React from 'react';
import { ShieldCheck, FileText, CheckCircle2, AlertTriangle, CloudRain, Wrench, KeyRound, Leaf, Scale, Clock, ShieldAlert, MapPin, Camera, Disc, Warehouse, ShieldX, Car, AlertOctagon, Fuel, ShieldOff } from 'lucide-react';
import { SITE_PHONE_DISPLAY, SITE_PHONE_TEL } from '../site/seo';

export const TermsPrivacyPage: React.FC = () => {
  return (
    <div className="py-16 bg-[#08090d] text-slate-300 min-h-screen">
      <div className="container mx-auto px-4 max-w-4xl space-y-12">
        
        {/* Page Header */}
        <div className="text-center space-y-3 border-b border-white/10 pb-8">
          <div className="inline-flex items-center space-x-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Texas Consumer Protection & Comprehensive Legal Exclusions</span>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-white">
            Terms of Service & Non-Liability Disclosures
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto">
            Adaptivity Performance LLC • Complete breakdown of service authorizations, liability limitations, non-covered items, pre-existing vehicle conditions, and Texas operational disclosures.
          </p>
        </div>

        {/* SPECIAL SECTION: WHAT WE ARE NOT RESPONSIBLE FOR */}
        <section className="bg-gradient-to-b from-rose-950/40 via-[#161824] to-[#12141c] p-6 sm:p-8 rounded-3xl border border-rose-500/40 shadow-2xl space-y-6">
          <div className="flex items-center space-x-3 text-rose-400 border-b border-rose-500/20 pb-4">
            <ShieldX className="w-7 h-7 text-rose-500" />
            <div>
              <h2 className="font-heading text-xl font-extrabold text-white">Comprehensive Non-Liability & Disclaimer Schedule</h2>
              <p className="text-xs text-rose-300">Explicit list of items, conditions, and damages Adaptivity Performance is NOT legally or financially responsible for:</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            
            {/* 1. Pre-existing vehicle defects */}
            <div className="bg-[#0b0c10] p-4 rounded-2xl border border-rose-500/20 space-y-2">
              <div className="font-extrabold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <AlertTriangle className="w-4 h-4" /> Pre-Existing Mechanical & Electrical Defects
              </div>
              <p className="text-slate-300 leading-relaxed">
                We are <strong>NOT responsible</strong> for pre-existing fluid leaks, blown head gaskets, seized engines, cracked exhaust manifolds, corroded wiring harnesses, faulty ECUs/modules, or pre-existing engine transmission slip present prior to service.
              </p>
            </div>

            {/* 2. Rusted hardware & brittle plastic */}
            <div className="bg-[#0b0c10] p-4 rounded-2xl border border-rose-500/20 space-y-2">
              <div className="font-extrabold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <Wrench className="w-4 h-4" /> Rusted Bolts, Seized Pins & Brittle Plastic
              </div>
              <p className="text-slate-300 leading-relaxed">
                We are <strong>NOT responsible</strong> for pre-existing rusted exhaust studs, seized caliper slider pins, stripped factory wheel locks, or brittle plastic engine covers/vacuum lines that shatter during standard factory disassembly of aged or high-mileage vehicles.
              </p>
            </div>

            {/* 3. Customer-supplied parts failure */}
            <div className="bg-[#0b0c10] p-4 rounded-2xl border border-rose-500/20 space-y-2">
              <div className="font-extrabold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <ShieldOff className="w-4 h-4" /> Customer-Supplied & Aftermarket Parts
              </div>
              <p className="text-slate-300 leading-relaxed">
                We are <strong>NOT responsible</strong> for premature failure, defect, fitment issues, noise, or secondary damage caused by customer-supplied parts, eBay/Amazon knockoff components, or unbranded aftermarket items. Labor is for installation only.
              </p>
            </div>

            {/* 4. Driveway surface condition */}
            <div className="bg-[#0b0c10] p-4 rounded-2xl border border-rose-500/20 space-y-2">
              <div className="font-extrabold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <Car className="w-4 h-4" /> Pre-Existing Driveway Oil Stains & Asphalt
              </div>
              <p className="text-slate-300 leading-relaxed">
                We use protective catch pans and heavy canvas ground covers, but are <strong>NOT responsible</strong> for pre-existing oil/coolant stains on concrete driveways, cracked asphalt, or soft gravel surfaces at customer premises.
              </p>
            </div>

            {/* 5. Loss of contents & valuables */}
            <div className="bg-[#0b0c10] p-4 rounded-2xl border border-rose-500/20 space-y-2">
              <div className="font-extrabold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <ShieldCheck className="w-4 h-4" /> Personal Property Left Inside Vehicles
              </div>
              <p className="text-slate-300 leading-relaxed">
                We are <strong>NOT responsible</strong> for loss, theft, or damage to personal items, valuables, tools, cash, electronics, or firearms left inside customer vehicles during driveway service or shop stay. Customers must remove valuables prior to service.
              </p>
            </div>

            {/* 6. Indirect & Consequential damages */}
            <div className="bg-[#0b0c10] p-4 rounded-2xl border border-rose-500/20 space-y-2">
              <div className="font-extrabold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <AlertOctagon className="w-4 h-4" /> Rental Cars, Towing & Missed Work
              </div>
              <p className="text-slate-300 leading-relaxed">
                We are <strong>NOT responsible</strong> for indirect, incidental, or consequential expenses including rental car fees, towing expenses, hotel stays, lost business income, or missed work shifts while a vehicle is undergoing service or awaiting parts.
              </p>
            </div>

            {/* 7. Misfueling & Bad Gas */}
            <div className="bg-[#0b0c10] p-4 rounded-2xl border border-rose-500/20 space-y-2">
              <div className="font-extrabold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <Fuel className="w-4 h-4" /> Contaminated Fuel & Customer Mis-Fueling
              </div>
              <p className="text-slate-300 leading-relaxed">
                We are <strong>NOT responsible</strong> for fuel system contamination, water in gas tanks, DEF fluid put into diesel fuel tanks, or gasoline put into diesel engines by vehicle owners prior to or after service.
              </p>
            </div>

            {/* 8. Acts of God & Severe Weather */}
            <div className="bg-[#0b0c10] p-4 rounded-2xl border border-rose-500/20 space-y-2">
              <div className="font-extrabold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <CloudRain className="w-4 h-4" /> Acts of God, Hail, Rodents & Vandalism
              </div>
              <p className="text-slate-300 leading-relaxed">
                We are <strong>NOT responsible</strong> for vehicle damage caused by acts of God, North Texas hail storms, tornado/high wind debris, rodent wire chewing, or third-party vandalism while parked at customer residences or shop lots.
              </p>
            </div>

          </div>
        </section>

        {/* Section 1: Core Terms & Supplemental Estimates */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-6">
          <div className="flex items-center space-x-3 text-orange-400 border-b border-white/5 pb-4">
            <FileText className="w-6 h-6" />
            <h2 className="font-heading text-xl font-bold text-white">1. Service Authorization & Teardown Rule</h2>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
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

        {/* Section 5: Worksite Documentation & Photo Authorization */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-6">
          <div className="flex items-center space-x-3 text-emerald-400 border-b border-white/5 pb-4">
            <Camera className="w-6 h-6" />
            <h2 className="font-heading text-xl font-bold text-white">5. Photo/Video Inspection & TCEQ Compliance</h2>
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

        {/* Section 6: Limitation of Liability & Jurisdiction */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-6">
          <div className="flex items-center space-x-3 text-sky-400 border-b border-white/5 pb-4">
            <Scale className="w-6 h-6" />
            <h2 className="font-heading text-xl font-bold text-white">6. Limitation of Liability & Denton County Jurisdiction</h2>
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
