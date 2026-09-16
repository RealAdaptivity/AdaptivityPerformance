import React, { useState } from 'react';
import { PortalLayout } from '../PortalLayout';
import type { PortalProfile } from '../portalAuth';
import { TechJobsTab } from './TechJobsTab';
import { TechEarningsTab } from './TechEarningsTab';
import { TechSettingsTab } from './TechSettingsTab';
import { ContractorAgreementGate } from './ContractorAgreementGate';

const TABS = [
  { id: 'jobs', label: 'Jobs', icon: '📋' },
  { id: 'earnings', label: 'Earnings', icon: '💰' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

type TechPortalProps = {
  profile: PortalProfile;
  onSignOut: () => void;
  adminViewAs?: 'tech';
  onSwitchAdminView?: () => void;
  initialTab?: string;
  stripeSetupNotice?: string | null;
};

export const TechPortal: React.FC<TechPortalProps> = ({
  profile,
  onSignOut,
  adminViewAs,
  onSwitchAdminView,
  initialTab = 'jobs',
  stripeSetupNotice,
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
      {stripeSetupNotice && (
        <p className="mb-4 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2">
          {stripeSetupNotice}
        </p>
      )}
      <ContractorAgreementGate
        disabled={adminViewAs === 'tech'}
        onSigned={() => setAgreementSignedAt(Date.now())}
      />
      {tab === 'jobs' && <TechJobsTab />}
      {tab === 'earnings' && <TechEarningsTab />}
      <div className={tab === 'settings' ? '' : 'hidden'} aria-hidden={tab !== 'settings'}>
        <TechSettingsTab
          key={agreementSignedAt}
          onSignOut={onSignOut}
          stripeReturnSync={Boolean(stripeSetupNotice?.includes('Stripe Express setup saved'))}
          adminPreview={adminViewAs === 'tech'}
        />
      </div>
    </PortalLayout>
  );
};
