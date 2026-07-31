import React, { useState, useEffect } from 'react';
import { Sparkles, Clock, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface DiagnosticCreditBannerProps {
  onOpenBooking: () => void;
}

export const DiagnosticCreditBanner: React.FC<DiagnosticCreditBannerProps> = ({ onOpenBooking }) => {
  // 24-Hour Countdown Timer Logic
  const [timeLeft, setTimeLeft] = useState({ hours: 23, minutes: 59, seconds: 59 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 23, minutes: 59, seconds: 59 }; // Reset loop for continuous urgency
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatNumber = (num: number) => String(num).padStart(2, '0');

  return (
    <section className="py-10 bg-gradient-to-r from-orange-950/80 via-[#16131c] to-amber-950/80 border-y border-orange-500/30 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-orange-500/5 blur-3xl pointer-events-none"></div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto rounded-3xl bg-[#12141c]/90 border border-orange-500/30 p-6 sm:p-8 shadow-2xl backdrop-blur-xl flex flex-col lg:flex-row items-center justify-between gap-8">
          
          {/* Left Content */}
          <div className="space-y-4 text-left flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-orange-500 text-white shadow-lg shadow-orange-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                <span>24-Hour Flash Promotion</span>
              </span>
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full">
                100% Credit Back
              </span>
            </div>

            <h3 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500">$100 Diagnostic Fee WAIVED</span> When You Approve The Repair!
            </h3>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Book your mobile diagnostic visit within <strong className="text-orange-400">24 hours</strong>. When you approve your repair on-site, your entire $100 diagnostic fee is 100% WAIVED & credited toward your total repair bill!
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold text-slate-300 pt-1">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>$100 Diagnostic Fee 100% WAIVED on repair</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>On-site mobile inspection in DFW</span>
              </div>
            </div>
          </div>

          {/* Right Countdown & Action */}
          <div className="flex flex-col items-center justify-center space-y-4 bg-[#181b26] p-6 rounded-2xl border border-white/10 w-full lg:w-auto flex-shrink-0 shadow-inner">
            <div className="text-center space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5 text-orange-400 animate-pulse" /> Offer Expires In
              </span>

              {/* Countdown Digits */}
              <div className="flex items-center justify-center gap-2 pt-1">
                <div className="flex flex-col items-center">
                  <div className="bg-[#0b0c10] border border-orange-500/40 text-orange-400 font-mono font-black text-2xl sm:text-3xl px-3 py-1.5 rounded-xl shadow-md">
                    {formatNumber(timeLeft.hours)}
                  </div>
                  <span className="text-[9px] font-bold uppercase text-slate-400 mt-1">Hours</span>
                </div>
                <span className="text-orange-500 font-bold text-xl mb-4">:</span>
                <div className="flex flex-col items-center">
                  <div className="bg-[#0b0c10] border border-orange-500/40 text-orange-400 font-mono font-black text-2xl sm:text-3xl px-3 py-1.5 rounded-xl shadow-md">
                    {formatNumber(timeLeft.minutes)}
                  </div>
                  <span className="text-[9px] font-bold uppercase text-slate-400 mt-1">Mins</span>
                </div>
                <span className="text-orange-500 font-bold text-xl mb-4">:</span>
                <div className="flex flex-col items-center">
                  <div className="bg-[#0b0c10] border border-orange-500/40 text-orange-400 font-mono font-black text-2xl sm:text-3xl px-3 py-1.5 rounded-xl shadow-md">
                    {formatNumber(timeLeft.seconds)}
                  </div>
                  <span className="text-[9px] font-bold uppercase text-slate-400 mt-1">Secs</span>
                </div>
              </div>
            </div>

            <button
              onClick={onOpenBooking}
              className="w-full inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-extrabold text-sm py-4 px-8 rounded-xl shadow-xl shadow-orange-500/30 hover:scale-105 active:scale-95 transition-all"
            >
              <span>Waive $100 Fee & Book Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Card hold reserved • No charge until technician arrives
            </span>
          </div>

        </div>
      </div>
    </section>
  );
};
