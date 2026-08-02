import React from 'react';
import { Phone, MessageSquare, Calendar } from 'lucide-react';
import { SITE_PHONE_E164 } from '../site/seo';

interface StickyMobileActionBarProps {
  onOpenBooking: () => void;
}

export const StickyMobileActionBar: React.FC<StickyMobileActionBarProps> = ({ onOpenBooking }) => {
  return (
    <aside
      aria-label="Quick action bar"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0c0d12]/95 backdrop-blur-xl border-t border-white/15 px-3 py-2.5 shadow-[0_-8px_30px_rgba(0,0,0,0.8)] animate-fade-in"
    >
      <div className="flex items-center justify-between gap-2 max-w-md mx-auto">
        {/* Call Button */}
        <a
          href={`tel:${SITE_PHONE_E164}`}
          className="flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-800/90 border border-slate-700/60 text-slate-200 hover:bg-slate-700 active:scale-95 transition-all"
        >
          <Phone className="w-4 h-4 text-orange-400 mb-0.5" />
          <span className="text-[10px] font-bold tracking-tight">Call Tech</span>
        </a>

        {/* Text SMS Button */}
        <a
          href={`sms:${SITE_PHONE_E164}?body=Hi%20Adaptivity%20-%20I%20need%20a%20quote%20for%20a%20mobile%20mechanic%20service%20in%20Justin/Northlake.`}
          className="flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-800/90 border border-slate-700/60 text-slate-200 hover:bg-slate-700 active:scale-95 transition-all"
        >
          <MessageSquare className="w-4 h-4 text-emerald-400 mb-0.5" />
          <span className="text-[10px] font-bold tracking-tight">Text Photo</span>
        </a>

        {/* Primary Book Mobile Service CTA Button */}
        <button
          onClick={onOpenBooking}
          className="flex-[2] flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 text-white font-extrabold text-xs shadow-lg shadow-orange-500/30 active:scale-95 transition-all"
        >
          <Calendar className="w-4 h-4 text-white" />
          <span>Book Repair</span>
        </button>
      </div>
    </aside>
  );
};
