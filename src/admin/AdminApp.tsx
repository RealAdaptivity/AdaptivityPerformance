import React, { useCallback, useEffect, useState } from 'react';
import { Building2, Loader2, LogOut, Radio, Shield } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import {
  bootstrapFirstAdmin,
  fetchAdminProfile,
  fetchHasAdminUser,
  isAdminProfile,
  signInAdmin,
  signOutAdmin,
  type AdminProfile,
} from '../services/adminAuth';
import { AdminLogin } from './AdminLogin';
import { DispatchConsole } from './DispatchConsole';
import { PartnersAdmin } from './PartnersAdmin';

export const AdminApp: React.FC = () => {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [needsBootstrap, setNeedsBootstrap] = useState<boolean | null>(null);
  const [adminTab, setAdminTab] = useState<'dispatch' | 'partners'>('dispatch');

  const refreshProfile = useCallback(async () => {
    const next = await fetchAdminProfile();
    setProfile(next);
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [has] = await Promise.all([fetchHasAdminUser(), refreshProfile()]);
      if (cancelled) return;
      setNeedsBootstrap(!has);
      setLoading(false);
    })();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshProfile();
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const handleBootstrap = async (params: {
    email: string;
    password: string;
    fullName: string;
    bootstrapCode: string;
  }) => {
    setAuthError(null);
    try {
      await bootstrapFirstAdmin(params);
      setNeedsBootstrap(false);
      setAuthError(null);
      const { error } = await signInAdmin(params.email, params.password);
      if (error) {
        setAuthError(`Account created. Sign in failed: ${error.message}`);
        return;
      }
      await refreshProfile();
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Could not create admin account');
    }
  };

  const handleLogin = async (email: string, password: string) => {
    setAuthError(null);
    const { error } = await signInAdmin(email, password);
    if (error) {
      setAuthError(error.message);
      return;
    }
    const next = await refreshProfile();
    if (!isAdminProfile(next)) {
      await signOutAdmin();
      setAuthError('This account is not authorized for dispatch admin.');
    }
  };

  const handleSignOut = async () => {
    await signOutAdmin();
    setProfile(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090a0f] flex items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!isAdminProfile(profile)) {
    return (
      <AdminLogin
        error={authError}
        onSubmit={handleLogin}
        onBootstrap={handleBootstrap}
        needsBootstrap={needsBootstrap}
        onBackToSite={() => {
          window.location.href = '/';
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col font-sans">
      <header className="border-b border-white/10 bg-[#0b0c10]/95 backdrop-blur sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shrink-0">
              <Radio className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-extrabold tracking-tight truncate">
                ADAPTIVITY <span className="text-orange-500">DISPATCH</span>
              </p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                Service director console
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex rounded-lg border border-white/10 p-0.5 bg-[#12141c]">
              <button
                type="button"
                onClick={() => setAdminTab('dispatch')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md ${
                  adminTab === 'dispatch' ? 'bg-orange-500 text-white' : 'text-slate-400'
                }`}
              >
                Dispatch
              </button>
              <button
                type="button"
                onClick={() => setAdminTab('partners')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md inline-flex items-center gap-1 ${
                  adminTab === 'partners' ? 'bg-sky-600 text-white' : 'text-slate-400'
                }`}
              >
                <Building2 className="w-3 h-3" />
                Partners
              </button>
            </div>
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              {profile.fullName || profile.email}
            </span>
            <button
              type="button"
              onClick={() => {
                window.location.href = '/';
              }}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Public site
            </button>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white border border-white/10 rounded-lg px-3 py-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </header>
      {adminTab === 'dispatch' ? (
        <DispatchConsole />
      ) : (
        <div className="max-w-3xl mx-auto w-full px-4 py-6">
          <h1 className="text-lg font-extrabold text-white mb-4">Shop & garage partners</h1>
          <PartnersAdmin />
        </div>
      )}
    </div>
  );
};
