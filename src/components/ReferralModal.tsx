import React, { useState } from 'react';
import { X, Gift, Share2, Copy, Check } from 'lucide-react';
import { shareAdaptivity } from '../site/seo';

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReferralModal: React.FC<ReferralModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [referralLink] = useState('https://adaptivityperformance.com/r/DFW25');

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      /* fallback */
    }
  };

  const handleNativeShare = async () => {
    await shareAdaptivity({
      title: 'Adaptivity Performance - $25 Off Mobile Repair',
      text: 'Get $25 off your first mobile mechanic driveway repair with Adaptivity Performance!',
      url: referralLink,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#12141c] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="flex flex-col items-center text-center space-y-3 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 flex items-center justify-center text-white shadow-xl shadow-amber-500/25">
            <Gift className="w-8 h-8" />
          </div>
          <div>
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-amber-500/10 border border-amber-500/30 text-amber-400">
              Give $25, Get $25
            </span>
            <h3 className="font-heading text-2xl sm:text-3xl font-extrabold text-white mt-2">
              Share Adaptivity & Earn Credits
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Give your friends & neighbors $25 off their first mobile mechanic service. When they book, you get $25 in repair credit!
            </p>
          </div>
        </div>

        {/* Link Share Box */}
        <div className="bg-[#181b26] rounded-2xl border border-white/10 p-4 space-y-3 text-xs">
          <label className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">
            Your Shareable Referral Link
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={referralLink}
              className="flex-1 bg-[#0b0c10] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-amber-300 font-mono focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className="px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold hover:bg-amber-500/25 flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={handleNativeShare}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:scale-105 transition-transform"
            >
              <Share2 className="w-4 h-4" />
              <span>Share via Message / Nextdoor / Social</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center">
          <p className="text-[11px] text-slate-400">
            Referral credits are automatically applied to your account balance after your neighbor's service is completed.
          </p>
        </div>
      </div>
    </div>
  );
};
