import React from 'react';
import { ShieldCheck, CheckCircle2, Lock, FileText, Award, HelpCircle } from 'lucide-react';

interface FactoryWarrantySectionProps {
  onOpenBooking: () => void;
}

export const FactoryWarrantySection: React.FC<FactoryWarrantySectionProps> = ({ onOpenBooking }) => {
  return (
    <section className="py-16 bg-[#090a0f] border-t border-white/10 relative overflow-hidden">
      {/* Background Subtle Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-orange-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto bg-gradient-to-b from-[#131520] to-[#0c0d14] rounded-3xl border border-orange-500/30 p-8 sm:p-12 shadow-2xl space-y-8">
          
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-white/10 pb-8">
            <div className="flex items-start space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/40 flex items-center justify-center text-orange-400 flex-shrink-0 shadow-lg shadow-orange-500/10">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-black uppercase tracking-widest bg-orange-500/10 text-orange-400 border border-orange-500/30 px-3 py-1 rounded-full inline-block">
                  Federal Law Protected
                </span>
                <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-white">
                  100% Factory Warranty Preserved
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  Magnuson-Moss Warranty Act of 1975 (15 U.S.C. § 2301) Guarantee
                </p>
              </div>
            </div>

            <div className="flex-shrink-0 bg-[#0b0c10] p-4 rounded-2xl border border-emerald-500/30 text-center sm:text-right space-y-1">
              <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 tracking-wider">
                Legally Guaranteed
              </span>
              <div className="text-xs font-extrabold text-white flex items-center justify-center sm:justify-end gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero Warranty Void Risk</span>
              </div>
            </div>
          </div>

          {/* Explanation Text */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-300">
            <div className="space-y-3 bg-[#0b0c10]/60 p-5 rounded-2xl border border-white/5">
              <div className="flex items-center space-x-2 text-orange-400 font-extrabold text-xs uppercase tracking-wider">
                <Award className="w-4 h-4" />
                <span>You are never tied to the dealer</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Federal law strictly prohibits vehicle manufacturers and dealerships from voiding your new vehicle warranty simply because service was performed by an independent mobile mechanic or non-dealer shop.
              </p>
            </div>

            <div className="space-y-3 bg-[#0b0c10]/60 p-5 rounded-2xl border border-white/5">
              <div className="flex items-center space-x-2 text-emerald-400 font-extrabold text-xs uppercase tracking-wider">
                <FileText className="w-4 h-4" />
                <span>OEM Parts & Digital Service Logs</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                We use OEM-specified fluids, factory-grade replacement parts, and record every oil change, brake job, and maintenance event directly into your digital vehicle history log for complete documentation.
              </p>
            </div>
          </div>

          {/* 4 Guarantee Bullets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            <div className="flex items-center space-x-3 bg-[#181b26] p-3.5 rounded-xl border border-white/5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span className="text-xs font-semibold text-slate-200">100% Magnuson-Moss Act Warranty Compliance</span>
            </div>
            <div className="flex items-center space-x-3 bg-[#181b26] p-3.5 rounded-xl border border-white/5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span className="text-xs font-semibold text-slate-200">Factory OEM Fluids & High-Grade Parts Used</span>
            </div>
            <div className="flex items-center space-x-3 bg-[#181b26] p-3.5 rounded-xl border border-white/5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span className="text-xs font-semibold text-slate-200">Digital Service History Documentation Provided</span>
            </div>
            <div className="flex items-center space-x-3 bg-[#181b26] p-3.5 rounded-xl border border-white/5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span className="text-xs font-semibold text-slate-200">Back by 12-Month / 12,000-Mile Adaptivity Guarantee</span>
            </div>
          </div>

          {/* Action Callout */}
          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <HelpCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />
              <span>Servicing new Ford, Chevy, GMC, RAM, Toyota, BMW, Audi & Benz models daily.</span>
            </div>
            <button
              onClick={onOpenBooking}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-orange-500/20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center space-x-2"
            >
              <ShieldCheck className="w-4 h-4 text-white" />
              <span>Schedule Warranty-Compliant Service</span>
            </button>
          </div>

        </div>
      </div>
    </section>
  );
};
