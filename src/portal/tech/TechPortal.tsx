import React, { useState } from 'react';
import { PortalLayout } from '../PortalLayout';
import type { PortalProfile } from '../portalAuth';
import { TechJobsTab } from './TechJobsTab';
import { TechSettingsTab } from './TechSettingsTab';
import { ContractorAgreementGate } from './ContractorAgreementGate';

const TABS = [
  { id: 'jobs', label: 'Jobs', icon: '📋' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

type TechPortalProps = {
  profile: PortalProfile;
  onSignOut: () => void;
  adminViewAs?: 'tech';
  onSwitchAdminView?: () => void;
  initialTab?: string;
};

export const TechPortal: React.FC<TechPortalProps> = ({
  profile,
  onSignOut,
  adminViewAs,
  onSwitchAdminView,
  initialTab = 'jobs',
}) => {
  const [tab, setTab] = useState(initialTab);
  // Bumped when the gate captures a signature, so Settings refetches its status
  // instead of showing "not signed" next to a banner that has just disappeared.
  const [agreementSignedAt, setAgreementSignedAt] = useState(0);

  return (
    <PortalLayout
      title="ADAPTIVITY TECH DISPATCH"
      subtitle={`${profile.fullName || profile.email} · live dispatch`}
      badge="Technician"
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
      onSignOut={onSignOut}
      adminViewAs={adminViewAs}
      onSwitchAdminView={onSwitchAdminView}
    >
      <ContractorAgreementGate
        disabled={adminViewAs === 'tech'}
        onSigned={() => setAgreementSignedAt(Date.now())}
      />
      {tab === 'jobs' && <TechJobsTab />}
      <div className={tab === 'settings' ? '' : 'hidden'} aria-hidden={tab !== 'settings'}>
        <TechSettingsTab
          key={agreementSignedAt}
          onSignOut={onSignOut}
        />
      </div>
    </PortalLayout>
  );
};
