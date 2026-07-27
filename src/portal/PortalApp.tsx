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

export const PortalApp: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminView, setAdminView] = useState<PortalRole | null>(() => getPortalViewMode());
  const [stripeNotice, setStripeNotice] = useState<string | null>(null);
  const [techInitialTab, setTechInitialTab] = useState('jobs');

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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setAdminView(null);
      return;
    }
    void fetchPortalProfile(user.id).then(setProfile);
  }, [user]);

  useEffect(() => {
    if (profile?.role === 'admin') {
      setAdminView(getPortalViewMode());
    }
  }, [profile]);

  const handleSignOut = async () => {
    clearPortalViewMode();
    await signOutPortal();
    setUser(null);
    setProfile(null);
    setAdminView(null);
  };

  const pickAdminView = (mode: PortalRole) => {
    setPortalViewMode(mode);
    setAdminView(mode);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090a0f] flex items-center justify-center text-slate-400 text-sm">
        Loading portal…
      </div>
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
