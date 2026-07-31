import React from 'react';
import { Check, X, Shield, Clock, Wrench, Car, ArrowRight } from 'lucide-react';

interface ComparisonTableProps {
  onOpenBooking: () => void;
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ onOpenBooking }) => {
  return (
    <section className="py-16 bg-[#090a0e] border-t border-white/10 relative overflow-hidden">
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-orange-600/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-12">
          <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-orange-500/10 border border-orange-500/30 text-orange-400 uppercase tracking-widest">
            Why Driveway Mobile Service Wins
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white">
            Adaptivity vs. Traditional Dealerships
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Why spend half your day sitting in a crowded dealer waiting room or paying expensive tow trucks?
          </p>
        </div>

        <div className="max-w-4xl mx-auto overflow-hidden rounded-2xl border border-white/10 bg-[#12141c] shadow-2xl">
          <div className="grid grid-cols-3 bg-[#181b26] p-4 border-b border-white/10 text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-300">
            <div className="flex items-center gap-2">Feature / Service</div>
            <div className="text-center text-slate-400">Traditional Dealership</div>
            <div className="text-center text-orange-400 flex items-center justify-center gap-1">
              <Wrench className="w-4 h-4" /> Adaptivity Mobile
            </div>
          </div>

          <div className="divide-y divide-white/5 text-xs sm:text-sm">
            {/* Row 1 */}
            <div className="grid grid-cols-3 p-4 items-center hover:bg-white/[0.02] transition-colors">
              <div className="font-semibold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-400 flex-shrink-0" />
                <span>Service Location</span>
              </div>
              <div className="text-center text-slate-400 flex items-center justify-center gap-1">
                <X className="w-4 h-4 text-rose-500" /> You drive & wait 3+ hours
              </div>
              <div className="text-center font-bold text-orange-300 flex items-center justify-center gap-1">
                <Check className="w-4 h-4 text-emerald-400" /> We come to your driveway
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-3 p-4 items-center hover:bg-white/[0.02] transition-colors">
              <div className="font-semibold text-white flex items-center gap-2">
                <Car className="w-4 h-4 text-orange-400 flex-shrink-0" />
                <span>Towing Fee (Dead Battery / Brakes)</span>
              </div>
              <div className="text-center text-slate-400 flex items-center justify-center gap-1">
                <X className="w-4 h-4 text-rose-500" /> $150 - $250 Tow truck fee
              </div>
              <div className="text-center font-bold text-emerald-400 flex items-center justify-center gap-1">
                <Check className="w-4 h-4 text-emerald-400" /> $0 Towing (Mobile dispatch)
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-3 p-4 items-center hover:bg-white/[0.02] transition-colors">
              <div className="font-semibold text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-orange-400 flex-shrink-0" />
                <span>Hourly Labor Rate</span>
              </div>
              <div className="text-center text-slate-400 flex items-center justify-center gap-1">
                <X className="w-4 h-4 text-rose-500" /> $185 - $240 / hr + shop supplies
              </div>
              <div className="text-center font-bold text-orange-300 flex items-center justify-center gap-1">
                <Check className="w-4 h-4 text-emerald-400" /> $125 / hr flat transparent
              </div>
            </div>

            {/* Row 4 */}
            <div className="grid grid-cols-3 p-4 items-center hover:bg-white/[0.02] transition-colors">
              <div className="font-semibold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-orange-400 flex-shrink-0" />
                <span>Nationwide Warranty</span>
              </div>
              <div className="text-center text-slate-400 flex items-center justify-center gap-1">
                90 Days / 3,000 Miles
              </div>
              <div className="text-center font-bold text-emerald-400 flex items-center justify-center gap-1">
                <Check className="w-4 h-4 text-emerald-400" /> 12-Month / 12,000-Mile
              </div>
            </div>
          </div>

          <div className="p-6 bg-gradient-to-r from-slate-900 to-[#12141c] text-center border-t border-white/10 space-y-3">
            <p className="text-xs text-slate-300 font-medium">
              Save time and money on your next brake service, oil change, or diagnostic scan.
            </p>
            <button
              onClick={onOpenBooking}
              className="inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg shadow-orange-500/20 hover:scale-105 transition-transform"
            >
              <span>Book Mobile Service Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
