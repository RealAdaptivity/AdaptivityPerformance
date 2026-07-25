import React, { useState } from 'react';
import { ChevronDown, MapPin, CheckCircle2 } from 'lucide-react';

const FAQS = [
  {
    q: 'How does mobile mechanic service work in Justin and Northlake, TX?',
    a: 'Our certified mobile technicians drive directly to your driveway, office parking lot, or roadside location in Justin (76247) and Northlake (76226 / 76262). We bring professional lift jacks, OEM parts, and diagnostic equipment to perform brakes, oil changes, batteries, starters, and diagnostics on-site.',
  },
  {
    q: 'Are there travel fees for mobile service in Justin or Northlake?',
    a: 'No! Mobile dispatch for any location within a 15-mile radius of our Justin hub (including Harvest, Canyon Falls, and Pecan Square) is 100% FREE ($0 travel fee). For locations past 15 miles (Argyle, Haslet, Denton, Keller), travel is billed at a transparent $2.00 per extra mile.',
  },
  {
    q: 'What is your hourly labor rate for auto repairs?',
    a: 'Adaptivity Performance operates on a flat, transparent labor rate of $125 per hour for both mobile and in-shop repairs. Specialty German/European vehicles (BMW, Mercedes, Audi) carry a 1.35x specialty multiplier due to European fluid standards and diagnostic coding requirements.',
  },
  {
    q: 'What warranty is included with mobile repairs?',
    a: 'All parts and labor provided by Adaptivity Performance come with a 12-Month / 12,000-Mile Nationwide Warranty. If any issue arises, we return to service your vehicle at zero additional cost.',
  },
  {
    q: 'What is the difference between your mobile service and shop garage location?',
    a: 'Our mobile unit handles on-site services like brake pad/rotor swaps, oil changes, battery replacements, starter/alternator swaps, and computer scans. For major engine overhauls, transmission swaps, truck lifts, and performance upgrades, we drop off your vehicle at our fully equipped Justin garage hub.',
  },
];

export const SEOContentBlock: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <section className="py-20 bg-[#0b0c10] border-t border-white/5 relative">
      <div className="container mx-auto px-4 max-w-5xl">
        
        {/* Local SEO Keyword Rich Content Block */}
        <div className="bg-[#12141c] p-8 rounded-3xl border border-white/10 mb-16 space-y-6">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20 w-fit">
            <MapPin className="w-3.5 h-3.5" />
            <span>#1 Rated Mobile Auto Repair in Justin & Northlake, TX</span>
          </div>

          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-white">
            Justin & Northlake’s Premier <span className="text-orange-500">Mobile Mechanic & Performance Hub</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300 leading-relaxed">
            <p>
              Looking for a dependable <strong className="text-white">mobile mechanic in Justin, TX (76247)</strong> or <strong className="text-white">Northlake, TX (76226 / 76262)</strong>? Adaptivity Performance brings dealership-grade auto repair directly to your home or workplace. Whether you need an urgent brake pad and rotor replacement in Canyon Falls, a full synthetic oil change in Harvest, or a starter replacement in Pecan Square, our ASE-certified mobile vans are fully equipped for rapid dispatch.
            </p>
            <p>
              In addition to our mobile units, Adaptivity Performance operates a state-of-the-art garage hub in Justin, TX for heavy-duty truck lifts, custom exhaust installations, suspension tuning, and in-depth engine diagnostics. We charge a flat <strong className="text-white">$125/hr labor rate</strong> with zero hidden fees and back every job with a 12-month warranty. Call <strong className="text-orange-400 font-bold">(214) 620-3244</strong> today.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/5 text-xs text-slate-300 font-semibold">
            <div className="flex items-center space-x-1.5"><CheckCircle2 className="w-4 h-4 text-orange-400" /> <span>Justin 76247</span></div>
            <div className="flex items-center space-x-1.5"><CheckCircle2 className="w-4 h-4 text-orange-400" /> <span>Northlake 76226</span></div>
            <div className="flex items-center space-x-1.5"><CheckCircle2 className="w-4 h-4 text-orange-400" /> <span>Argyle 76227</span></div>
            <div className="flex items-center space-x-1.5"><CheckCircle2 className="w-4 h-4 text-orange-400" /> <span>Haslet 76052</span></div>
          </div>
        </div>

        {/* SEO FAQ Accordion */}
        <div className="space-y-4">
          <div className="text-center space-y-2 mb-8">
            <h3 className="font-heading text-2xl font-bold text-white">Frequently Asked Questions</h3>
            <p className="text-xs text-slate-400">Everything you need to know about our mobile & shop mechanic services in Denton County.</p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-[#12141c] rounded-2xl border border-white/10 overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between font-bold text-sm text-white hover:text-orange-400 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-orange-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs text-slate-300 leading-relaxed border-t border-white/5 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
};
