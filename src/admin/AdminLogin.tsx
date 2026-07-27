import React, { useEffect, useState } from 'react';
import { Loader2, Lock, Radio, UserPlus } from 'lucide-react';

type AdminLoginProps = {
  error: string | null;
  onSubmit: (email: string, password: string) => Promise<void>;
  onBootstrap: (params: {
    email: string;
    password: string;
    fullName: string;
    bootstrapCode: string;
  }) => Promise<void>;
  onBackToSite: () => void;
  needsBootstrap: boolean | null;
};

export const AdminLogin: React.FC<AdminLoginProps> = ({
  error,
  onSubmit,
  onBootstrap,
  onBackToSite,
  needsBootstrap,
}) => {
  const [mode, setMode] = useState<'signin' | 'bootstrap'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [bootstrapCode, setBootstrapCode] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (needsBootstrap === true) setMode('bootstrap');
  }, [needsBootstrap]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSubmit(email.trim(), password);
    } finally {
      setBusy(false);
    }
  };

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onBootstrap({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        bootstrapCode,
      });
      setMode('signin');
    } finally {
      setBusy(false);
    }
  };

  if (needsBootstrap === null) {
    return (
      <div className="min-h-screen bg-[#090a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const showBootstrap = needsBootstrap || mode === 'bootstrap';

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">
              Dispatch <span className="text-orange-500">Admin</span>
            </h1>
            <p className="text-xs text-slate-500">Adaptivity Performance operations</p>
          </div>
        </div>

        {needsBootstrap && (
          <div className="mb-4 text-xs text-amber-200/90 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3">
            No admin account exists yet. Create the first dispatch admin below using your{' '}
            <strong>ADMIN_BOOTSTRAP_SECRET</strong> from Supabase Edge secrets.
          </div>
        )}

        {!needsBootstrap && (
          <div className="flex gap-1 p-1 mb-4 bg-[#12141c] border border-white/10 rounded-xl">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`flex-1 text-xs font-bold py-2 rounded-lg ${
                mode === 'signin' ? 'bg-orange-500 text-white' : 'text-slate-400'
              }`}
            >
              Sign in
            </button>
          </div>
        )}

        {showBootstrap ? (
          <form
            onSubmit={handleBootstrap}
            className="bg-[#12141c] border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
              <UserPlus className="w-3.5 h-3.5" />
              Create first admin account (one-time)
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <label className="block space-y-1.5">
              <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                Bootstrap code
              </span>
              <input
                type="password"
                required
                autoComplete="off"
                value={bootstrapCode}
                onChange={(e) => setBootstrapCode(e.target.value)}
                placeholder="Same as ADMIN_BOOTSTRAP_SECRET in Supabase"
                className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Full name</span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Michael Smith"
                className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                Password (8+ characters)
              </span>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500"
              />
            </label>

            <button
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold text-sm rounded-xl py-3 transition-colors"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Create admin account
            </button>

            {!needsBootstrap && (
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="w-full text-xs text-slate-500 hover:text-slate-300"
              >
                Already have an account? Sign in
              </button>
            )}
          </form>
        ) : (
          <form
            onSubmit={handleSignIn}
            className="bg-[#12141c] border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
              <Lock className="w-3.5 h-3.5" />
              Sign in with your dispatch admin account
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <label className="block space-y-1.5">
              <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500"
              />
            </label>

            <button
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold text-sm rounded-xl py-3 transition-colors"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Sign in
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={onBackToSite}
          className="mt-6 w-full text-center text-xs text-slate-500 hover:text-slate-300"
        >
          ← Back to public website
        </button>
        {import.meta.env.DEV && (
          <p className="mt-3 text-[10px] text-slate-600 text-center">
            Use{' '}
            <code className="text-orange-400/90">http://localhost:5173/admin</code> (include port{' '}
            <span className="text-slate-400">5173</span>)
          </p>
        )}
      </div>
    </div>
  );
};
