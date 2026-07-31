import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { linkApprovedTechApplication } from '../services/techApplications';
import { ensureTechProfile } from './portalAuth';

type Props = {
  email?: string | null;
  onDone: () => void;
};

/** After invite / recovery email — tech chooses a login password. */
export const TechSetPassword: React.FC<Props> = ({ email, onDone }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      try {
        await linkApprovedTechApplication();
      } catch {
        /* may already be linked by invite edge function */
      }
      try {
        await ensureTechProfile();
      } catch {
        /* role/profile may already be tech */
      }
      onDone();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#12141c] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5 text-orange-400" />
          </div>
          <h1 className="font-heading text-xl font-extrabold text-white">Create your tech password</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            You&apos;re approved. Set a password for{' '}
            <span className="text-slate-200">{email || 'your account'}</span> to sign in to the
            technician portal and Adaptivity Tech app.
          </p>
        </div>

        {error && (
          <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <form onSubmit={(e) => void submit(e)} className="space-y-3 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <input
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white focus:border-orange-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm password</label>
            <input
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white focus:border-orange-500 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-extrabold text-xs rounded-xl disabled:opacity-60"
          >
            {loading ? 'Saving…' : 'Save password & continue'}
          </button>
        </form>
      </div>
    </div>
  );
};
