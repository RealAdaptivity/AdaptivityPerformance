import React from 'react';
import { Car, Wrench, LayoutDashboard } from 'lucide-react';
import type { PortalRole } from './portalAuth';
import { navigateToMarketingSite } from './portalRoute';

type Props = {
  onContinue: (mode: PortalRole) => void;
};

export const AdminPortalChooser: React.FC<Props> = ({ onContinue }) => {
  const adminHref = `${import.meta.env.BASE_URL || '/'}admin`.replace(/\/+/g, '/');

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#12141c] border border-white/10 rounded-3xl p-8 space-y-6 text-center">
        <p className="text-xs uppercase tracking-widest text-orange-400 font-bold">Admin account</p>
        <h1 className="font-heading text-xl font-extrabold text-white">How do you want to continue?</h1>
        <p className="text-xs text-slate-400">
          Use the customer or tech portal like the mobile apps, or open the dispatch console.
        </p>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => onContinue('customer')}
            className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
          >
            <Car className="w-4 h-4" />
            Continue as customer
          </button>
          <button
            type="button"
            onClick={() => onContinue('tech')}
            className="w-full py-3.5 bg-[#0b0c10] border border-orange-500/40 text-orange-400 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
          >
            <Wrench className="w-4 h-4" />
            Continue as tech
          </button>
          <a
            href={adminHref}
            className="w-full py-3.5 bg-slate-800 border border-white/10 rounded-xl text-sm font-bold text-slate-200 flex items-center justify-center gap-2"
          >
            <LayoutDashboard className="w-4 h-4" />
            Open dispatch console (/admin)
          </a>
        </div>
        <button type="button" onClick={navigateToMarketingSite} className="text-xs text-slate-500 hover:text-white">
          ← Public site
        </button>
      </div>
    </div>
  );
};
