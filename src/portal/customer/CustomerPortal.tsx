import React, { useState } from 'react';
import { PortalLayout } from '../PortalLayout';
import type { PortalProfile } from '../portalAuth';
import { CustomerGarageTab } from './CustomerGarageTab';
import { CustomerBookTab } from './CustomerBookTab';
import { CustomerTrackTab } from './CustomerTrackTab';
import { CustomerHistoryTab, type RebookPrefill } from './CustomerHistoryTab';
import { CustomerSettingsTab } from './CustomerSettingsTab';

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
  const [bookVehicleId, setBookVehicleId] = useState<string | undefined>();
  const [bookPrefill, setBookPrefill] = useState<RebookPrefill | undefined>();

  const goBook = (vehicleId?: string, prefill?: RebookPrefill) => {
    setBookVehicleId(vehicleId);
    setBookPrefill(prefill);
    setTab('book');
  };

  return (
    <PortalLayout
      title="ADAPTIVITY CLIENT PORTAL"
      subtitle={`Welcome, ${profile.fullName || profile.email}`}
      badge="Customer"
      tabs={TABS}
      activeTab={tab}
      onTabChange={(id) => {
        if (id !== 'book') {
          setBookPrefill(undefined);
          setBookVehicleId(undefined);
        }
        setTab(id);
      }}
      onSignOut={onSignOut}
      adminViewAs={adminViewAs}
      onSwitchAdminView={onSwitchAdminView}
    >
      {tab === 'garage' && (
        <CustomerGarageTab customerId={profile.id} onBookVehicle={(id) => goBook(id)} />
      )}
      {tab === 'book' && (
        <CustomerBookTab
          profile={profile}
          preselectedVehicleId={bookVehicleId}
          prefill={bookPrefill}
          onGoTrack={() => setTab('track')}
        />
      )}
      {tab === 'track' && <CustomerTrackTab />}
      {tab === 'history' && (
        <CustomerHistoryTab
          customerId={profile.id}
          onBookService={(prefill) => goBook(undefined, prefill)}
        />
      )}
      {tab === 'settings' && <CustomerSettingsTab profile={profile} onSignOut={onSignOut} />}
    </PortalLayout>
  );
};
