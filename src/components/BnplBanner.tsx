import React from 'react';
import { CreditCard, Sparkles } from 'lucide-react';

interface BnplBannerProps {
  onOpenBooking: () => void;
}

export const BnplBanner: React.FC<BnplBannerProps> = ({ onOpenBooking }) => {
  return (
    <section className="py-8 bg-gradient-to-r from-amber-950/40 via-[#12141c] to-orange-950/40 border-y border-amber-500/20">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-4 text-left">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0 shadow-lg shadow-amber-500/10">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> 0% APR Financing Options
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                  Instant Approval
                </span>
              </div>
              <h3 className="font-heading text-lg sm:text-xl font-bold text-white mt-0.5">
                Repair Now, Pay Later with Affirm, Klarna, Afterpay, Zip & Sunbit
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Don't let unexpected auto repairs set you back. Split payments into 4 interest-free installments or flexible monthly plans.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={onOpenBooking}
              className="w-full md:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 hover:scale-105 transition-transform flex-shrink-0 text-center"
            >
              Get Estimated Payment
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
