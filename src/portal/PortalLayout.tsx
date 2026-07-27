import React from 'react';
import { LogOut } from 'lucide-react';
import { navigateToMarketingSite } from './portalRoute';

export type PortalTab = { id: string; label: string; icon: string };

type PortalLayoutProps = {
  title: string;
  subtitle: string;
  badge?: string;
  tabs: PortalTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onSignOut: () => void;
  children: React.ReactNode;
  adminViewAs?: 'customer' | 'tech';
  onSwitchAdminView?: () => void;
};

export const PortalLayout: React.FC<PortalLayoutProps> = ({
  title,
  subtitle,
  badge,
  tabs,
  activeTab,
  onTabChange,
  onSignOut,
  children,
  adminViewAs,
  onSwitchAdminView,
}) => {
  const adminHref = `${import.meta.env.BASE_URL || '/'}admin`.replace(/\/+/g, '/');
  const switchLabel =
    adminViewAs === 'customer' ? 'Continue as tech instead' : 'Continue as customer instead';

  return (
  <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col">
    {adminViewAs && (
      <div className="bg-amber-950/40 border-b border-amber-500/30 px-4 py-2 text-center text-[11px] text-amber-100">
        Admin account — continuing as{' '}
        <strong className="text-white">{adminViewAs === 'customer' ? 'customer' : 'technician'}</strong>
        {onSwitchAdminView && (
          <>
            {' · '}
            <button type="button" onClick={onSwitchAdminView} className="text-orange-300 font-semibold underline">
              {switchLabel}
            </button>
          </>
        )}
        {' · '}
        <a href={adminHref} className="text-orange-300 font-semibold underline">
          Dispatch console
        </a>
      </div>
    )}
    <header className="bg-[#12141c] border-b border-white/10 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading font-extrabold text-sm sm:text-base tracking-tight">{title}</h1>
            {badge && (
              <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
                {badge}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={navigateToMarketingSite}
            className="hidden sm:block text-[11px] text-slate-400 hover:text-white"
          >
            Public site
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="flex items-center gap-1 text-[11px] font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1.5 rounded-lg"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </header>

    <nav className="border-b border-white/10 bg-[#0b0c10]/80 sticky top-0 z-40">
      <div className="max-w-4xl mx-auto flex overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 min-w-[88px] py-3 text-[11px] font-bold border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <span className="block text-base mb-0.5">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </nav>

    <main className="flex-1 max-w-4xl w-full mx-auto p-4 pb-24">{children}</main>
  </div>
  );
};
