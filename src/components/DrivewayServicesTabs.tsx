import React, { useState } from 'react';
import {
  Wrench,
  Zap,
  Activity,
  Droplets,
  Wind,
  CheckCircle2,
  ArrowRight,
  MapPin,
  Clock,
  ShieldCheck,
  Phone
} from 'lucide-react';

interface DrivewayServicesTabsProps {
  onOpenBooking: () => void;
  onBookService?: (serviceId: string) => void;
}

const CATEGORIES = [
  {
    id: 'brakes',
    label: 'Brakes & Rotors',
    icon: <Wrench className="w-4 h-4" />,
    headline: 'Mobile Brake Pad & Rotor Replacement',
    startingPrice: '$199',
    avgTime: '1.5 - 2 Hours',
    description:
      'We replace worn ceramic pads, warped rotors, flush contaminated brake fluid, and perform caliper service right in your driveway.',
    items: [
      'Premium Ceramic Brake Pads & Slotted/Smooth Rotors',
      'DOT 3 / DOT 4 Complete Brake Fluid Flush',
      'Hardware Lubrication & Pin Servicing',
      'Electronic Parking Brake (EPB) Service Mode Reset',
      'Digital Rotor & Pad Thickness Measurement Report',
    ],
  },
  {
    id: 'nostart',
    label: 'No-Start & Battery',
    icon: <Zap className="w-4 h-4" />,
    headline: 'Roadside Battery, Starter & Alternator Swaps',
    startingPrice: '$175',
    avgTime: '45 Min - 1.5 Hours',
    description:
      'Car won’t crank or start? Avoid paying $150 for a tow truck. We bring brand-new AGM batteries, starters, and alternators directly to your vehicle.',
    items: [
      '12V AGM & Lead-Acid Battery Replacement & Registration',
      'Starter Motor Replacement & Solenoid Wiring Test',
      'Alternator Voltage Output & Charging System Load Test',
      'Ignition Coils & Iridium Spark Plug Replacements',
      'Zero Towing Needed — Fixed in Driveway or Parking Lot',
    ],
  },
  {
    id: 'diagnostics',
    label: 'Check Engine Scans',
    icon: <Activity className="w-4 h-4" />,
    headline: 'Comprehensive OBD-II Computer Diagnostics',
    startingPrice: '$99',
    avgTime: '45 - 60 Minutes',
    description:
      'Check engine light flashing? Misfires, ABS lights, or rough idling diagnosed on-site using professional Snap-on & Autel diagnostic computers.',
    items: [
      'Full Multi-Module OBD-II Fault Code Scan',
      'Live Sensor Data Stream & Fuel Trim Analysis',
      'Cylinder Misfire & Fuel Injector Testing',
      'Oxygen & Mass Airflow (MAF) Sensor Diagnostics',
      '100% of Diagnostic Fee Credited Toward Approved Repairs',
    ],
  },
  {
    id: 'maintenance',
    label: 'Maintenance & Fluids',
    icon: <Droplets className="w-4 h-4" />,
    headline: 'Driveway Oil Changes & Fluid Flushes',
    startingPrice: '$95',
    avgTime: '30 - 45 Minutes',
    description:
      'Scheduled factory maintenance completed without leaving your desk or couch. We use manufacturer-spec full synthetic oil and OE filters.',
    items: [
      'Full Synthetic Mobil 1 / Castrol Oil & OEM Filter',
      'Transmission Fluid Drain & Fill',
      'Engine Coolant Radiator Flush',
      'Serpentine Belt & Tensioner Replacement',
      'Complimentary 25-Point Multi-Point Visual Inspection',
    ],
  },
  {
    id: 'ac',
    label: 'AC & Climate Care',
    icon: <Wind className="w-4 h-4" />,
    headline: 'Mobile Automotive AC Recharge & Repair',
    startingPrice: '$149',
    avgTime: '45 - 75 Minutes',
    description:
      'Blowing warm air during Texas heat? We pressure test your AC system, recharge R134a or R1234yf refrigerant, and replace faulty blend doors.',
    items: [
      'R134a & R1234yf AC Freon Vacuum & Recharge',
      'UV Dye Leak Detection & Pressure Testing',
      'AC Blower Motor & Resistor Replacement',
      'Thermostat & Cabin Air Filter Installation',
      'Vent Temperature Output Verification',
    ],
  },
];

export const DrivewayServicesTabs: React.FC<DrivewayServicesTabsProps> = ({ onOpenBooking }) => {
  const [activeTab, setActiveTab] = useState(CATEGORIES[0]);
  const [zipInput, setZipInput] = useState('');
  const [zipResult, setZipResult] = useState<string | null>(null);

  const checkZip = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = zipInput.trim();
    if (!clean) return;
    if (/^(75|76)\d{3}$/.test(clean)) {
      setZipResult(`✅ Great news! We provide 100% mobile doorstep service to ${clean} with zero towing fees.`);
    } else {
      setZipResult(`📍 We service the entire DFW Metroplex (zips 750–762). Contact us for emergency dispatch to ${clean}.`);
    }
  };

  return (
    <section className="py-20 bg-[#07080b] border-t border-white/10 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-7xl">
        
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center space-y-3 mb-10">
          <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-orange-500/10 border border-orange-500/30 text-orange-400">
            What We Fix in Your Driveway
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-black text-white">
            100% On-Site Automotive Repairs
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Select a service category below to see exact capabilities, transparent starting pricing, and estimated on-site repair times.
          </p>
        </div>

        {/* Tab Buttons Row */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveTab(cat)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                activeTab.id === cat.id
                  ? 'bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 text-white shadow-lg shadow-orange-500/30 scale-105'
                  : 'bg-[#0c0e14] text-slate-400 hover:text-white border border-white/10 hover:border-orange-500/30'
              }`}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Active Tab Showcase Card */}
        <div className="p-6 sm:p-10 rounded-3xl bg-[#0c0e14]/95 border border-orange-500/30 shadow-[0_0_50px_rgba(0,0,0,0.8)] max-w-5xl mx-auto text-left backdrop-blur-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[11px] font-black uppercase text-orange-400 tracking-wider bg-orange-500/10 px-2.5 py-1 rounded-lg border border-orange-500/20">
                  On-Site Driveway Service
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1 font-semibold">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  {activeTab.avgTime}
                </span>
              </div>

              <h3 className="font-heading text-2xl sm:text-3xl font-black text-white">
                {activeTab.headline}
              </h3>

              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                {activeTab.description}
              </p>

              <div className="space-y-2 pt-2 border-t border-white/10">
                {activeTab.items.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col justify-between p-6 rounded-2xl bg-black/60 border border-white/10 space-y-5">
              <div className="space-y-1">
                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Direct Phone Quote</div>
                <div className="text-2xl sm:text-3xl font-black text-orange-400 flex items-center gap-2">
                  <Phone className="w-6 h-6 animate-pulse" />
                  <span>Call for Quote</span>
                </div>
                <p className="text-[11px] text-slate-400">Get an instant exact price based on your vehicle's year, make & model.</p>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5 text-xs text-slate-400">
                <div className="flex items-center gap-1.5 font-bold text-white">
                  <ShieldCheck className="w-4 h-4 text-orange-400" />
                  <span>12-Month / 12,000-Mile Warranty</span>
                </div>
                <p className="text-[11px] leading-relaxed">All replacement parts and on-site labor are 100% backed nationwide.</p>
              </div>

              <div className="space-y-2">
                <a
                  href="tel:9403040620"
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call (940) 304-0620</span>
                </a>

                <button
                  type="button"
                  onClick={onOpenBooking}
                  className="w-full py-3 px-6 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 font-bold text-xs uppercase tracking-wider border border-white/10 transition-colors flex items-center justify-center gap-2"
                >
                  <span>Or Schedule Online</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Zip Code Instant Coverage Checker Box */}
        <div className="max-w-2xl mx-auto mt-12 p-6 rounded-3xl bg-[#0c0e14]/90 border border-white/10 shadow-xl text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-400">
            <MapPin className="w-4 h-4" />
            <span>Check Doorstep Availability in Your Area</span>
          </div>

          <h4 className="font-heading text-lg font-black text-white">
            Enter your zip code to verify immediate mobile dispatch
          </h4>

          <form onSubmit={checkZip} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
            <input
              type="text"
              maxLength={5}
              placeholder="e.g. 76247, 76226, 75028"
              value={zipInput}
              onChange={(e) => setZipInput(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl bg-black/60 border border-white/10 text-white placeholder-slate-500 text-sm focus:border-orange-500 focus:outline-none"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm uppercase tracking-wider transition-colors shrink-0 shadow-md shadow-orange-500/20"
            >
              Check Zip
            </button>
          </form>

          {zipResult && (
            <p className="text-xs sm:text-sm text-emerald-400 font-bold animate-fade-in pt-1">
              {zipResult}
            </p>
          )}
        </div>

      </div>
    </section>
  );
};
