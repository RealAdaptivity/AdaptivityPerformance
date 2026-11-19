import React, { useState } from 'react';
import { MessageSquare, Phone } from 'lucide-react';
import { PortalLayout } from '../PortalLayout';
import type { PortalProfile } from '../portalAuth';
import { CustomerGarageTab } from './CustomerGarageTab';
import { CustomerTrackTab } from './CustomerTrackTab';
import { CustomerHistoryTab } from './CustomerHistoryTab';
import { CustomerSettingsTab } from './CustomerSettingsTab';
import { BUSINESS_HOURS, SITE_PHONE_DISPLAY, SITE_PHONE_E164, SITE_PHONE_TEL } from '../../site/seo';

/** Booking is by phone: a person books the visit on the call. */
const CallToBookCard: React.FC = () => (
  <div className="space-y-4 rounded-2xl border border-white/10 bg-[#12141c] p-5">
    <h2 className="text-lg font-bold text-white">Call to book</h2>
    <p className="text-sm leading-relaxed text-slate-300">
      Call and a real person books your visit and gives you a time. Use the phone number on your account so it
      shows up here under Track and History.
    </p>
    <a
      href={SITE_PHONE_TEL}
      className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl bg-orange-500 text-base font-bold text-white hover:bg-orange-600"
    >
      <Phone className="h-5 w-5" aria-hidden="true" /> Call {SITE_PHONE_DISPLAY}
    </a>
    <a
      href={`sms:${SITE_PHONE_E164}`}
      className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-white/15 text-sm font-bold text-slate-100 hover:border-white/30"
    >
      <MessageSquare className="h-4 w-4" aria-hidden="true" /> Or text us
    </a>
    <p className="text-center text-xs text-slate-500">Open {BUSINESS_HOURS.label}</p>
  </div>
);

const TABS = [
  { id: 'garage', label: 'Garage', icon: '🏎️' },
  { id: 'book', label: 'Book', icon: '📅' },
  { id: 'track', label: 'Track', icon: '📍' },
  { id: 'history', label: 'History', icon: '📋' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

type CustomerPortalProps = {
  profile: PortalProfile;
  onSignOut: () => void;
  adminViewAs?: 'customer';
  onSwitchAdminView?: () => void;
};

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  profile,
  onSignOut,
  adminViewAs,
  onSwitchAdminView,
}) => {
  const [tab, setTab] = useState('garage');
  const goBook = () => setTab('book');

  return (
    <PortalLayout
      title="ADAPTIVITY CLIENT PORTAL"
      subtitle={`Welcome, ${profile.fullName || profile.email}`}
      badge="Customer"
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
      onSignOut={onSignOut}
      adminViewAs={adminViewAs}
      onSwitchAdminView={onSwitchAdminView}
    >
      {tab === 'garage' && (
        <CustomerGarageTab customerId={profile.id} onBookVehicle={goBook} />
      )}
      {tab === 'book' && <CallToBookCard />}
      {tab === 'track' && <CustomerTrackTab />}
      {tab === 'history' && (
        <CustomerHistoryTab
          customerId={profile.id}
          onBookService={goBook}
        />
      )}
      {tab === 'settings' && <CustomerSettingsTab profile={profile} onSignOut={onSignOut} />}
    </PortalLayout>
  );
};
