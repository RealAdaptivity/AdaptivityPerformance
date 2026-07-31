import React, { useState } from 'react';
import { AlertTriangle, Lock, UserPlus } from 'lucide-react';
import {
  fetchPortalProfile,
  resetPortalPassword,
  roleMatchesPortal,
  setPortalViewMode,
  signInPortal,
  signUpPortal,
  ensureTechProfile,
  type PortalRole,
} from './portalAuth';
import { navigateToMarketingSite } from './portalRoute';
import { sitePath } from '../site/siteRoute';

export const PortalLogin: React.FC = () => {
  const [portalRole, setPortalRole] = useState<PortalRole>('customer');
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState('');
  const [showReset, setShowReset] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Technician portal is login-only — accounts come from approved Join as Tech.
      if (isSignUp && portalRole === 'tech') {
        throw new Error('Technician accounts are invite/approval only. Apply via Join as Tech, then sign in here.');
      }

      if (isSignUp) {
        if (!fullName.trim()) throw new Error('Full name is required.');
        const { error: signUpError } = await signUpPortal('customer', email, password, fullName, {
          phone,
        });
        if (signUpError) throw signUpError;
        setError(null);
        alert('Account created. Confirm your email if required, then sign in.');
        setIsSignUp(false);
        return;
      }

      const { data, error: signInError } = await signInPortal(email, password);
      if (signInError) throw signInError;
      const userId = data.user?.id;
      if (!userId) throw new Error('Sign-in failed.');

      let profile = await fetchPortalProfile(userId);
      if (!profile) throw new Error('Profile not found. Contact support.');

      if (profile.role === 'admin') {
        setPortalViewMode(portalRole);
        return;
      }

      if (portalRole === 'tech') {
        try {
          const { linkApprovedTechApplication } = await import('../services/techApplications');
          await linkApprovedTechApplication();
          profile = (await fetchPortalProfile(userId)) ?? profile;
        } catch {
          /* no approved application */
        }
      }

      if (!roleMatchesPortal(profile.role, portalRole)) {
        await import('../services/supabaseClient').then(({ supabase }) => supabase.auth.signOut());
        throw new Error(
          portalRole === 'customer'
            ? 'This account is registered as a technician. Switch to the Tech tab to sign in.'
            : 'No technician account for this login. Apply via Join as Tech and wait for approval, then sign in here.'
        );
      }
      if (portalRole === 'tech') {
        await ensureTechProfile();
      }
      setPortalViewMode(portalRole);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!resetEmail.trim()) return;
    const { error: resetError } = await resetPortalPassword(resetEmail);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    alert(`Password reset link sent to ${resetEmail}`);
    setShowReset(false);
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col">
      <header className="border-b border-white/10 px-4 py-4 flex items-center justify-between max-w-lg mx-auto w-full">
        <button type="button" onClick={navigateToMarketingSite} className="text-xs text-slate-400 hover:text-white">
          ← Public site
        </button>
        <span className="text-[10px] uppercase tracking-widest text-orange-400 font-bold">Client & Tech Portal</span>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#12141c] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <img
              src={`${(import.meta.env.BASE_URL || '/').replace(/\/?$/, '/')}logo-ui.png`}
              alt="Adaptivity Performance"
              className="w-14 h-14 rounded-2xl mx-auto object-cover bg-[#0b0c10] shadow-lg shadow-orange-500/20"
            />
            <h1 className="font-heading text-xl font-extrabold text-white">
              {portalRole === 'customer' ? 'Customer portal' : 'Technician portal'}
            </h1>
            <p className="text-xs text-slate-400">
              {portalRole === 'tech'
                ? 'Approved techs: use the password from your invite email (or Forgot password).'
                : 'Same experience as the mobile apps — garage, booking, dispatch & payouts.'}
            </p>
          </div>

          <div className="flex rounded-xl bg-[#0b0c10] p-1 border border-white/10">
            <button
              type="button"
              onClick={() => {
                setPortalRole('customer');
                setError(null);
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
                portalRole === 'customer' ? 'bg-orange-500 text-white' : 'text-slate-400'
              }`}
            >
              Customer
            </button>
            <button
              type="button"
              onClick={() => {
                setPortalRole('tech');
                setIsSignUp(false);
                setError(null);
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
                portalRole === 'tech' ? 'bg-orange-500 text-white' : 'text-slate-400'
              }`}
            >
              Technician
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!showReset ? (
            <form onSubmit={handleSubmit} className="space-y-3 text-sm">
              {isSignUp && portalRole === 'customer' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Full name</label>
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white focus:border-orange-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Phone (optional)</label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white focus:border-orange-500 outline-none"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white focus:border-orange-500 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-extrabold text-xs rounded-xl shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                {loading ? 'Please wait…' : isSignUp && portalRole === 'customer' ? 'Create account' : 'Sign in'}
              </button>
            </form>
          ) : (
            <div className="space-y-3">
              <input
                type="email"
                placeholder="Email for reset link"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white"
              />
              <button
                type="button"
                onClick={handleReset}
                className="w-full py-3 bg-orange-500 rounded-xl text-xs font-bold text-white"
              >
                Send reset link
              </button>
              <button type="button" onClick={() => setShowReset(false)} className="text-xs text-slate-400 w-full">
                Back to sign in
              </button>
            </div>
          )}

          {!showReset && (
            <div className="flex flex-col gap-2 text-xs text-center">
              {portalRole === 'customer' && (
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-orange-400 font-semibold hover:underline"
                >
                  {isSignUp ? 'Already have an account? Sign in' : 'New here? Create an account'}
                </button>
              )}
              {!isSignUp && (
                <button type="button" onClick={() => setShowReset(true)} className="text-slate-500 hover:text-slate-300">
                  Forgot password
                </button>
              )}
            </div>
          )}

          {portalRole === 'tech' && (
            <p className="text-[10px] text-slate-500 flex items-start gap-1">
              <UserPlus className="w-3 h-3 mt-0.5 shrink-0" />
              <span>
                Login only. New techs apply via{' '}
                <a href={sitePath('join')} className="text-orange-400 hover:underline">
                  Join as Tech
                </a>
                , get approved, then sign in with the same credentials as the Adaptivity Tech app.
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
