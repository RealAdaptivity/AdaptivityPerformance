import React from 'react';
import { X, CheckCircle2, Award } from 'lucide-react';

interface WarrantyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBooking: () => void;
}

export const WarrantyModal: React.FC<WarrantyModalProps> = ({ isOpen, onClose, onOpenBooking }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-[#12141c] border border-orange-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="flex flex-col items-center text-center space-y-3 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-xl shadow-orange-500/25">
            <Award className="w-8 h-8" />
          </div>
          <div>
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-orange-500/10 border border-orange-500/30 text-orange-400">
              Official Quality Certificate
            </span>
            <h3 className="font-heading text-2xl sm:text-3xl font-extrabold text-white mt-2">
              12-Month / 12,000-Mile Guarantee
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Complete peace of mind backed by Adaptivity Performance across DFW & North Texas.
            </p>
          </div>
        </div>

        {/* Certificate Card Body */}
        <div className="bg-[#181b26] rounded-2xl border border-white/10 p-5 space-y-4 text-xs text-slate-300">
          <div className="flex items-start space-x-3 pb-3 border-b border-white/5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-white text-sm block">100% Parts & Labor Coverage</strong>
              <p className="text-slate-400 mt-0.5">
                If any installed part or technician labor fails within 12 months or 12,000 miles, we dispatch back to your driveway to fix it at <span className="text-emerald-400 font-bold">$0 cost</span>.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 pb-3 border-b border-white/5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-white text-sm block">OEM & Premium Grade Parts Only</strong>
              <p className="text-slate-400 mt-0.5">
                We strictly install OEM or tier-1 premium ceramic brake pads, synthetic fluids, and heavy-duty components.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-white text-sm block">Digital Record & Easy Warranty Claims</strong>
              <p className="text-slate-400 mt-0.5">
                Your repair receipt is stored digitally in your Adaptivity App account. Zero paper receipt hassle.
              </p>
            </div>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              onClose();
              onOpenBooking();
            }}
            className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-orange-500/25 hover:scale-105 active:scale-95 transition-all text-center"
          >
            Book Warrantied Repair Now
          </button>
          <button
            onClick={onClose}
            className="py-3.5 px-6 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs sm:text-sm hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
