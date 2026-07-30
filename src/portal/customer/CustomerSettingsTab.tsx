import React, { useEffect, useState } from 'react';
import type { PortalProfile } from '../portalAuth';
import { supabase } from '../../services/supabaseClient';
import { ensureReferralCode, getCreditBalance } from '../../services/referrals';
import { SITE_ORIGIN, shareAdaptivity } from '../../site/seo';

type Props = {
  profile: PortalProfile;
  onSignOut: () => void;
};

export const CustomerSettingsTab: React.FC<Props> = ({ profile, onSignOut }) => {
  const [name, setName] = useState(profile.fullName);
  const [phone, setPhone] = useState('');
  const [saved, setSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [creditCents, setCreditCents] = useState(0);
  const [referralMsg, setReferralMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [code, balance] = await Promise.all([ensureReferralCode(), getCreditBalance()]);
        if (cancelled) return;
        setReferralCode(code);
        setCreditCents(balance);
      } catch {
        if (!cancelled) setReferralCode(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveProfile = async () => {
    setProfileError(null);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: name.trim(), phone: phone.trim() || null })
      .eq('id', profile.id);
    if (error) {
      setProfileError(error.message);
      return;
    }
    await supabase.auth.updateUser({ data: { full_name: name.trim(), phone: phone.trim() } });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const changePassword = async () => {
    setPwError(null);
    setPwMsg(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwError('Fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('New password and confirmation do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }
    setPwBusy(true);
    try {
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: currentPassword,
      });
      if (reauthError) throw new Error('Current password is incorrect.');
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwMsg('Password updated.');
    } catch (e) {
      setPwError(e instanceof Error ? e.message : 'Password update failed');
    } finally {
      setPwBusy(false);
    }
  };

  const shareReferral = async () => {
    if (!referralCode) return;
    setReferralMsg(null);
    const result = await shareAdaptivity({
      title: 'Adaptivity Performance',
      text: `Use my Adaptivity referral link ${SITE_ORIGIN}/r/${referralCode} — we both get $25 credit after your first completed job.`,
      url: `${SITE_ORIGIN}/r/${referralCode}`,
    });
    setReferralMsg(
      result === 'shared' ? 'Shared!' : result === 'copied' ? 'Copied to clipboard.' : 'Could not share.'
    );
  };

  const copyReferral = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(`${SITE_ORIGIN}/r/${referralCode}`);
      setReferralMsg('Referral link copied.');
    } catch {
      setReferralMsg('Could not copy.');
    }
  };

  return (
    <div className="space-y-6 max-w-md">
      <div className="space-y-3">
        <p className="text-xs text-slate-400">Account profile (saved to Supabase).</p>
        <label className="block text-xs font-semibold text-slate-300">Display name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm"
        />
        <label className="block text-xs font-semibold text-slate-300">Email</label>
        <input
          value={profile.email}
          disabled
          className="w-full bg-[#0b0c10]/50 border border-white/10 rounded-xl px-3 py-2.5 text-slate-500 text-sm"
        />
        <label className="block text-xs font-semibold text-slate-300">Phone</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm"
        />
        {profileError && <p className="text-xs text-red-400">{profileError}</p>}
        <button
          type="button"
          onClick={() => void saveProfile()}
          className="w-full py-3 bg-orange-500 rounded-xl text-xs font-bold text-white"
        >
          {saved ? 'Saved ✓' : 'Save profile'}
        </button>
      </div>

      <div className="space-y-3 border-t border-white/10 pt-4">
        <p className="text-xs font-bold text-slate-300">Refer a friend — $25 / $25</p>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Share your code. When a friend books with it, you both earn $25 credit after their completed job.
        </p>
        {referralCode ? (
          <>
            <p className="font-mono text-lg text-orange-400 font-bold tracking-wider">{referralCode}</p>
            <p className="text-xs text-emerald-400">
              Credit balance: ${(creditCents / 100).toFixed(2)}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void copyReferral()}
                className="flex-1 py-2.5 border border-white/15 text-slate-200 rounded-xl text-xs font-bold"
              >
                Copy code
              </button>
              <button
                type="button"
                onClick={() => void shareReferral()}
                className="flex-1 py-2.5 bg-orange-500/20 border border-orange-500/40 text-orange-300 rounded-xl text-xs font-bold"
              >
                Share
              </button>
            </div>
            {referralMsg && <p className="text-xs text-slate-400">{referralMsg}</p>}
          </>
        ) : (
          <p className="text-xs text-slate-500">Sign in to load your referral code.</p>
        )}
      </div>

      <div className="space-y-3 border-t border-white/10 pt-4">
        <p className="text-xs font-bold text-slate-300">Change password</p>
        <input
          type="password"
          placeholder="Current password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm"
          autoComplete="current-password"
        />
        <input
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm"
          autoComplete="new-password"
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm"
          autoComplete="new-password"
        />
        {pwError && <p className="text-xs text-red-400">{pwError}</p>}
        {pwMsg && <p className="text-xs text-emerald-400">{pwMsg}</p>}
        <button
          type="button"
          disabled={pwBusy}
          onClick={() => void changePassword()}
          className="w-full py-3 border border-orange-500/40 text-orange-300 rounded-xl text-xs font-bold disabled:opacity-60"
        >
          {pwBusy ? 'Updating…' : 'Update password'}
        </button>
      </div>

      <button
        type="button"
        onClick={onSignOut}
        className="w-full py-3 text-xs text-rose-300 border border-rose-500/30 rounded-xl"
      >
        Sign out
      </button>
    </div>
  );
};
