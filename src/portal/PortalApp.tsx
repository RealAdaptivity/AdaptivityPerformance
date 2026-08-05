import React, { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import {
  clearPortalViewMode,
  fetchPortalProfile,
  getPortalViewMode,
  setPortalViewMode,
  signOutPortal,
  type PortalProfile,
  type PortalRole,
} from './portalAuth';
import { PortalLogin } from './PortalLogin';
import { AdminPortalChooser } from './AdminPortalChooser';
import { CustomerPortal } from './customer/CustomerPortal';
import { TechPortal } from './tech/TechPortal';
import { TechSetPassword } from './TechSetPassword';
import { linkApprovedTechApplication } from '../services/techApplications';
import { claimPendingGuestBooking } from '../services/linkGuestBooking';

function readTechInviteFlag(): boolean {
  if (typeof window === 'undefined') return false;
  if (new URLSearchParams(window.location.search).get('techInvite') === '1') return true;
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  const type = new URLSearchParams(hash).get('type')?.toLowerCase();
  return type === 'invite' || type === 'recovery' || type === 'signup';
}

function clearTechInviteFlag() {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  if (!params.has('techInvite')) return;
  params.delete('techInvite');
  const qs = params.toString();
  const path = window.location.pathname;
  window.history.replaceState({}, '', qs ? `${path}?${qs}` : path);
}

export const PortalApp: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminView, setAdminView] = useState<PortalRole | null>(() => getPortalViewMode());
  const [stripeNotice, setStripeNotice] = useState<string | null>(null);
  const [techInitialTab, setTechInitialTab] = useState('jobs');
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(() => readTechInviteFlag());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const setup = params.get('stripeSetup');
    if (setup === 'complete') {
      setStripeNotice('Stripe Express setup saved. Your payout status is updating below.');
      setTechInitialTab('settings');
    } else if (setup === 'refresh') {
      setStripeNotice('Stripe link expired — open Connect Stripe again from Settings.');
      setTechInitialTab('settings');
    }
    if (params.get('techInvite') === '1') {
      setNeedsPasswordSetup(true);
    }
    if (setup) {
      params.delete('stripeSetup');
      const qs = params.toString();
      const path = window.location.pathname;
      window.history.replaceState({}, '', qs ? `${path}?${qs}` : path);
    }
  }, []);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        if (readTechInviteFlag() || event === 'PASSWORD_RECOVERY') {
          setNeedsPasswordSetup(true);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setAdminView(null);
      return;
    }
    void (async () => {
      try {
        await linkApprovedTechApplication();
      } catch {
        /* optional */
      }
      const next = await fetchPortalProfile(user.id);
      setProfile(next);
      if (next?.role === 'customer') {
        void claimPendingGuestBooking();
      }
    })();
  }, [user]);

  useEffect(() => {
    if (profile?.role === 'admin') {
      setAdminView(getPortalViewMode());
    }
  }, [profile]);

  const handleSignOut = async () => {
    clearPortalViewMode();
    clearTechInviteFlag();
    setNeedsPasswordSetup(false);
    await signOutPortal();
    setUser(null);
    setProfile(null);
    setAdminView(null);
  };

  const pickAdminView = (mode: PortalRole) => {
    setPortalViewMode(mode);
    setAdminView(mode);
  };

  const finishPasswordSetup = async () => {
    clearTechInviteFlag();
    setNeedsPasswordSetup(false);
    if (user) {
      try {
        await linkApprovedTechApplication();
      } catch {
        /* */
      }
      setProfile(await fetchPortalProfile(user.id));
    }
    setPortalViewMode('tech');
    setAdminView('tech');
    setTechInitialTab('settings');
    setStripeNotice('Password saved. Connect Stripe Express next to get paid.');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090a0f] flex items-center justify-center text-slate-400 text-sm">
        Loading portal…
      </div>
    );
  }

  if (user && needsPasswordSetup) {
    return (
      <TechSetPassword
        email={user.email}
        onDone={() => {
          void finishPasswordSetup();
        }}
      />
    );
  }

  if (!user || !profile) {
    return <PortalLogin />;
  }

  if (profile.role === 'admin') {
    if (!adminView) {
      return <AdminPortalChooser onContinue={pickAdminView} />;
    }
    if (adminView === 'tech') {
      return (
        <TechPortal
          profile={profile}
          onSignOut={handleSignOut}
          adminViewAs="tech"
          onSwitchAdminView={() => pickAdminView('customer')}
          initialTab={techInitialTab}
          stripeSetupNotice={stripeNotice}
        />
      );
    }
    return (
      <CustomerPortal
        profile={profile}
        onSignOut={handleSignOut}
        adminViewAs="customer"
        onSwitchAdminView={() => pickAdminView('tech')}
      />
    );
  }

  if (profile.role === 'tech') {
    return (
      <TechPortal
        profile={profile}
        onSignOut={handleSignOut}
        initialTab={techInitialTab}
        stripeSetupNotice={stripeNotice}
      />
    );
  }

  if (profile.role === 'customer') {
    return <CustomerPortal profile={profile} onSignOut={handleSignOut} />;
  }

  return (
    <div className="min-h-screen bg-[#090a0f] flex items-center justify-center text-rose-300 text-sm p-6 text-center">
      Unknown account role. Contact support.
    </div>
  );
};
