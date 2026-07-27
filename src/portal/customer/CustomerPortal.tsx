import React, { useState } from 'react';
import { PortalLayout } from '../PortalLayout';
import type { PortalProfile } from '../portalAuth';
import { CustomerGarageTab } from './CustomerGarageTab';
import { CustomerBookTab } from './CustomerBookTab';
import { CustomerTrackTab } from './CustomerTrackTab';
import { CustomerHistoryTab } from './CustomerHistoryTab';
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

  const goBook = (vehicleId?: string) => {
    setBookVehicleId(vehicleId);
    setTab('book');
  };

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
      {tab === 'book' && (
        <CustomerBookTab
          profile={profile}
          preselectedVehicleId={bookVehicleId}
          onGoTrack={() => setTab('track')}
        />
      )}
      {tab === 'track' && <CustomerTrackTab />}
      {tab === 'history' && (
        <CustomerHistoryTab customerId={profile.id} onBookService={goBook} />
      )}
      {tab === 'settings' && <CustomerSettingsTab profile={profile} onSignOut={onSignOut} />}
    </PortalLayout>
  );
};
