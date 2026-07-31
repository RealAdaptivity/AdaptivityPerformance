import React from 'react';
import { ShieldCheck, FileText, CheckCircle2, AlertTriangle, Wrench, KeyRound, Leaf, Scale, Clock, ShieldAlert, MapPin, Camera, Disc, Warehouse, ShieldX, Car, AlertOctagon, Fuel, ShieldOff, Cpu, CreditCard, UserX, FileCheck, Radio, PenTool, Flame, RefreshCw, Key, Zap, BatteryCharging, Truck } from 'lucide-react';
import { SITE_PHONE_DISPLAY, SITE_PHONE_TEL } from '../site/seo';

export const TermsPrivacyPage: React.FC = () => {
  return (
    <div className="py-16 bg-[#08090d] text-slate-300 min-h-screen">
      <div className="container mx-auto px-4 max-w-4xl space-y-12">

        {/* Page Header */}
        <div className="text-center space-y-3 border-b border-white/10 pb-8">
          <div className="inline-flex items-center space-x-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Texas Consumer Protection & Master Legal Agreement</span>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-white">
            Terms of Service & Complete Non-Liability Disclosures
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto">
            Adaptivity Performance LLC • Complete master agreement governing mobile vehicle dispatch, core parts, EV high-voltage systems, towing, mechanics' liens, and Denton County jurisdiction.
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

            {/* 3. Pre-existing EV / Hybrid Battery Systems */}
            <div className="bg-[#0b0c10] p-4 rounded-2xl border border-rose-500/20 space-y-2">
              <div className="font-extrabold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <BatteryCharging className="w-4 h-4" /> Pre-Existing EV & Hybrid Battery Cell Degradation
              </div>
              <p className="text-slate-300 leading-relaxed">
                We are <strong>NOT responsible</strong> for pre-existing high-voltage battery cell degradation, internal thermal runaway, inverter degradation, or pre-existing charging port faults on Electric (EV) or Hybrid vehicles (Tesla, Prius, RAV4 Prime) during routine maintenance.
              </p>
            </div>

            {/* 4. Tampering & 3rd Party Interventions */}
            <div className="bg-[#0b0c10] p-4 rounded-2xl border border-rose-500/20 space-y-2">
              <div className="font-extrabold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <RefreshCw className="w-4 h-4" /> 3rd Party Tampering & Self-Repair Alterations
              </div>
              <p className="text-slate-300 leading-relaxed">
                We are <strong>NOT responsible</strong> for service failures or part damage resulting from third-party shop tampering, customer self-repairs, or un-authorized disassembly following our repair visit. Any unauthorized tampering immediately voids all warranty coverage.
              </p>
            </div>

            {/* 5. Contactless Key Drop Risk */}
            <div className="bg-[#0b0c10] p-4 rounded-2xl border border-rose-500/20 space-y-2">
              <div className="font-extrabold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <Key className="w-4 h-4" /> Contactless Key Drop & Unattended Keys
              </div>
              <p className="text-slate-300 leading-relaxed">
                We are <strong>NOT responsible</strong> for lost, stolen, or misplaced keys left outside under doormats, tires, or lockboxes prior to technician arrival for contactless mobile dispatch appointments.
              </p>
            </div>

            {/* 6. Pre-existing ECU & Module Reflashing Risk */}
            <div className="bg-[#0b0c10] p-4 rounded-2xl border border-rose-500/20 space-y-2">
              <div className="font-extrabold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <Zap className="w-4 h-4" /> Pre-Existing Corrupted ECU Module Coding
              </div>
              <p className="text-slate-300 leading-relaxed">
                We are <strong>NOT responsible</strong> for pre-existing internal module failure or software bricking on aged factory electronic control units (ECUs/BCMs) caused by pre-existing voltage spikes or factory software corruptions during diagnostic programming.
              </p>
            </div>

            {/* 7. Test Drive Road Hazards */}
            <div className="bg-[#0b0c10] p-4 rounded-2xl border border-rose-500/20 space-y-2">
              <div className="font-extrabold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <Car className="w-4 h-4" /> Test Drive Road Hazards (Flying Debris & Nails)
              </div>
              <p className="text-slate-300 leading-relaxed">
                We are <strong>NOT responsible</strong> for sudden highway road hazards (flying gravel/rock windshield chips, road debris, or nail tire punctures) occurring during authorized diagnostic or safety test drives on DFW public roads.
              </p>
            </div>

            {/* 8. Customer-supplied parts failure */}
            <div className="bg-[#0b0c10] p-4 rounded-2xl border border-rose-500/20 space-y-2">
              <div className="font-extrabold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <ShieldOff className="w-4 h-4" /> Customer-Supplied & Aftermarket Parts
              </div>
              <p className="text-slate-300 leading-relaxed">
                We are <strong>NOT responsible</strong> for premature failure, defect, fitment issues, noise, or secondary damage caused by customer-supplied parts, eBay/Amazon knockoff components, or unbranded aftermarket items. Labor is for installation only.
              </p>
            </div>

            {/* 9. Pre-existing TPMS & Key Fobs */}
            <div className="bg-[#0b0c10] p-4 rounded-2xl border border-rose-500/20 space-y-2">
              <div className="font-extrabold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <Radio className="w-4 h-4" /> TPMS Sensors, Dry-Rot & Aged Key Fobs
              </div>
              <p className="text-slate-300 leading-relaxed">
                We are <strong>NOT responsible</strong> for pre-existing battery-dead TPMS sensors, cracked valve stems, dry-rotted tires, cracked plastic key fobs, or worn ignition lock cylinders present prior to service.
              </p>
            </div>

            {/* 10. Driveway surface condition */}
            <div className="bg-[#0b0c10] p-4 rounded-2xl border border-rose-500/20 space-y-2">
              <div className="font-extrabold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <Car className="w-4 h-4" /> Pre-Existing Driveway Oil Stains & Asphalt
              </div>
              <p className="text-slate-300 leading-relaxed">
                We use protective catch pans and heavy canvas ground covers, but are <strong>NOT responsible</strong> for pre-existing oil/coolant stains on concrete driveways, cracked asphalt, or soft gravel surfaces at customer premises.
              </p>
            </div>

            {/* 11. Loss of contents & valuables */}
            <div className="bg-[#0b0c10] p-4 rounded-2xl border border-rose-500/20 space-y-2">
              <div className="font-extrabold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <ShieldCheck className="w-4 h-4" /> Personal Property Left Inside Vehicles
              </div>
              <p className="text-slate-300 leading-relaxed">
                We are <strong>NOT responsible</strong> for loss, theft, or damage to personal items, valuables, tools, cash, electronics, or firearms left inside customer vehicles during driveway service or shop stay. Customers must remove valuables prior to service.
              </p>
            </div>

            {/* 12. Contaminated Fuel & Mis-Fueling */}
            <div className="bg-[#0b0c10] p-4 rounded-2xl border border-rose-500/20 space-y-2">
              <div className="font-extrabold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <Fuel className="w-4 h-4" /> Contaminated Fuel & Customer Mis-Fueling
              </div>
              <p className="text-slate-300 leading-relaxed">
                We are <strong>NOT responsible</strong> for fuel system contamination, water in gas tanks, DEF fluid put into diesel fuel tanks, or gasoline put into diesel engines by vehicle owners prior to or after service.
              </p>
            </div>

            {/* 13. Indirect & Consequential damages */}
            <div className="bg-[#0b0c10] p-4 rounded-2xl border border-rose-500/20 space-y-2">
              <div className="font-extrabold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <AlertOctagon className="w-4 h-4" /> Rental Cars, Towing & Missed Work
              </div>
              <p className="text-slate-300 leading-relaxed">
                We are <strong>NOT responsible</strong> for indirect, incidental, or consequential expenses including rental car fees, towing expenses, hotel stays, lost business income, or missed work shifts while a vehicle is undergoing service or awaiting parts.
              </p>
            </div>

            {/* 14. Thermal & Track Exclusions */}
            <div className="bg-[#0b0c10] p-4 rounded-2xl border border-rose-500/20 space-y-2">
              <div className="font-extrabold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <Flame className="w-4 h-4" /> Extreme Track Use & Overheating Abuse
              </div>
              <p className="text-slate-300 leading-relaxed">
                We are <strong>NOT responsible</strong> for engine or transmission thermal failure resulting from customer racing, competition track use, extreme off-road mudding abuse, or driving a vehicle while engine temperature gauges indicate severe overheating.
              </p>
            </div>

          </div>
        </section>

        {/* Section 1: Core Terms & E-SIGN Act Acceptance */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-6">
          <div className="flex items-center space-x-3 text-orange-400 border-b border-white/5 pb-4">
            <PenTool className="w-6 h-6" />
            <h2 className="font-heading text-xl font-bold text-white">1. Service Authorization & E-SIGN Act Acceptance</h2>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <div className="space-y-3 bg-[#0b0c10] p-4 rounded-2xl border border-white/5 text-xs">
              <div className="flex items-start space-x-2">
                <PenTool className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                <span><strong>E-SIGN Act Binding Electronic Acceptance (15 U.S.C. § 7001):</strong> Clicking "Book Service", approving SMS text quote estimates, or providing digital signature on technician mobile tablets constitutes a legally binding electronic signature under federal law.</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span><strong>Service Authorization & Test Driving:</strong> You grant certified Adaptivity Performance technicians permission to operate, test-drive on DFW public roads, and perform authorized diagnostic scans and mechanical repairs on your vehicle.</span>
              </div>
              <div className="flex items-start space-x-2">
                <FileText className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                <span><strong>Supplemental Repair Authorization (Texas Teardown Rule):</strong> If hidden damage or additional required worn parts are discovered during teardown, no additional labor or parts will be billed without your explicit prior authorization via phone, SMS, or digital consent.</span>
              </div>
              <div className="flex items-start space-x-2">
                <Wrench className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span><strong>Old Parts & Core Charge Credit Rule:</strong> Replaced worn parts requiring a manufacturer core credit (alternators, starters, brake calipers) or hazardous fluid filters are disposed/returned for core credit unless customer explicitly requests old parts prior to teardown.</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Property Access, Safety & Performance Upgrades */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-6">
          <div className="flex items-center space-x-3 text-amber-400 border-b border-white/5 pb-4">
            <KeyRound className="w-6 h-6" />
            <h2 className="font-heading text-xl font-bold text-white">2. Driveway Property Access, Safety & Towing Transport</h2>
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
                <div className="font-bold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider text-amber-400">
                  <Truck className="w-4 h-4" /> Towing & Shop Transport Authorization
                </div>
                <p className="text-slate-300 leading-relaxed">
                  You grant authorization to utilize certified flatbed towing partners to transport non-driveable vehicles to our Justin garage hub if driveway repair cannot be safely completed on-site.
                </p>
              </div>

              <div className="bg-[#0b0c10] p-4 rounded-2xl border border-white/5 space-y-2">
                <div className="font-bold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider text-rose-400">
                  <UserX className="w-4 h-4" /> Zero Tolerance for Tech Safety Hazards
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Technicians reserve the right to immediately terminate dispatch or suspend service if subjected to physical threats, verbal abuse, weapon displays, or un-secured aggressive pets at customer premises.
                </p>
              </div>

              <div className="bg-[#0b0c10] p-4 rounded-2xl border border-white/5 space-y-2">
                <div className="font-bold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider text-orange-400">
                  <Cpu className="w-4 h-4" /> Performance Upgrades & ECU Tuning Disclaimer
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Custom aftermarket modifications (lift kits, performance exhausts, ECU remapping, turbo upgrades) are performed for off-road/track application. Customer acknowledges aftermarket modifications may affect factory warranty coverage or emissions compliance.
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

        {/* Section 4: Cancellation Policy, Chargebacks & Mechanics' Lien */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-6">
          <div className="flex items-center space-x-3 text-orange-400 border-b border-white/5 pb-4">
            <Clock className="w-6 h-6" />
            <h2 className="font-heading text-xl font-bold text-white">4. Cancellation, Chargeback Indemnity & Texas Mechanics' Lien</h2>
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

              <div className="bg-[#0b0c10] p-4 rounded-2xl border border-white/5 space-y-2 md:col-span-2">
                <div className="font-bold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider text-rose-400">
                  <CreditCard className="w-4 h-4" /> Credit Card Chargeback & Dispute Indemnity
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Customer agrees that initiating an unauthorized or fraudulent credit card chargeback following completed repair services constitutes a breach of contract. Customer shall be liable for all bank chargeback fees ($75 administrative fee), collection expenses, and legal attorney fees incurred to recover valid funds.
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

        {/* Section 6: Limitation of Liability, Severability & Jurisdiction */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-6">
          <div className="flex items-center space-x-3 text-sky-400 border-b border-white/5 pb-4">
            <Scale className="w-6 h-6" />
            <h2 className="font-heading text-xl font-bold text-white">6. Limitation of Liability, Severability & Denton County Jurisdiction</h2>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-[#0b0c10] p-4 rounded-2xl border border-white/5 space-y-2">
                <div className="font-bold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider text-sky-400">
                  <Scale className="w-4 h-4" /> Liability Cap & Consequential Damages
                </div>
                <p className="text-slate-[#slate-300] leading-relaxed">
                  Adaptivity Performance's total aggregate liability for any claim arising from service shall not exceed the total dollar amount paid for the specific repair order. We are not liable for indirect, incidental, or consequential damages (such as lost wages or rental vehicle expenses).
                </p>
              </div>

              <div className="bg-[#0b0c10] p-4 rounded-2xl border border-white/5 space-y-2">
                <div className="font-bold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider text-sky-400">
                  <FileCheck className="w-4 h-4" /> Severability & Master Agreement
                </div>
                <p className="text-slate-300 leading-relaxed">
                  If any provision of these terms is declared invalid or unenforceable by a court of competent jurisdiction in Denton County, Texas, all remaining provisions shall remain in 100% full force and effect.
                </p>
              </div>

              <div className="bg-[#0b0c10] p-4 rounded-2xl border border-white/5 space-y-2 md:col-span-2">
                <div className="font-bold text-white flex items-center gap-1.5 text-xs uppercase tracking-wider text-sky-400">
                  <MapPin className="w-4 h-4" /> Governing Law: Denton County, TX Jurisdiction
                </div>
                <p className="text-slate-300 leading-relaxed">
                  These terms are governed strictly by the laws of the State of Texas. Any legal action, dispute, or binding arbitration shall be brought exclusively in state or federal courts located in Denton County, Texas.
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
