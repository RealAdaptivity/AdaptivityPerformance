import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Shield, UserMinus } from 'lucide-react';
import { fetchAdminAccounts, grantAdmin, revokeAdmin, type AdminAccount } from '../services/adminAccounts';

/**
 * Add or remove dashboard admins. The person signs up at /portal first (a
 * normal customer account); adding their email here makes it an admin, and
 * they sign in at /admin with the password they already chose.
 */
export const AdminsAdmin: React.FC<{ currentAdminId: string }> = ({ currentAdminId }) => {
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setAdmins(await fetchAdminAccounts());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load admins');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setBusy('add');
    setError(null);
    setNotice(null);
    try {
      const r = await grantAdmin(email);
      setNotice(
        r.alreadyAdmin
          ? `${r.email} is already an admin.`
          : `${r.email} is now an admin. They sign in at adaptivityperformance.com/admin with their existing password.`
      );
      setEmail('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add that admin');
    } finally {
      setBusy(null);
    }
  };

  const remove = async (a: AdminAccount) => {
    if (busy) return;
    if (!window.confirm(`Remove admin access for ${a.email ?? a.fullName ?? 'this account'}?`)) return;
    setBusy(a.id);
    setError(null);
    setNotice(null);
    try {
      const role = await revokeAdmin(a.id);
      setNotice(`${a.email ?? 'That account'} is no longer an admin (now a ${role}).`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove that admin');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-[#12141c] p-5">
        <h2 className="text-sm font-bold text-white">Add an admin</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-slate-400">
          <li>
            Have them create an account at <span className="text-slate-200">adaptivityperformance.com/portal</span>{' '}
            (Sign up) and confirm their email.
          </li>
          <li>Enter that email below.</li>
          <li>
            They sign in at <span className="text-slate-200">adaptivityperformance.com/admin</span> with the same
            password.
          </li>
        </ol>
        <form onSubmit={(e) => void add(e)} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="new-admin-email" className="sr-only">
            Email of the account to make an admin
          </label>
          <input
            id="new-admin-email"
            type="email"
            inputMode="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="their@email.com"
            className="min-h-[44px] flex-1 rounded-xl border border-white/10 bg-[#0b0c10] px-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          />
          <button
            type="submit"
            disabled={!email.trim() || busy !== null}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {busy === 'add' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Shield className="h-4 w-4" aria-hidden="true" />}
            Make admin
          </button>
        </form>
        {notice && (
          <p role="status" className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-100">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
            {error}
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Current admins{admins.length ? ` · ${admins.length}` : ''}
        </h2>
        {loading ? (
          <p className="text-xs text-slate-500">Loading…</p>
        ) : (
          <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/10 bg-[#12141c]">
            {admins.map((a) => {
              const you = a.id === currentAdminId;
              return (
                <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {a.fullName || a.email}
                      {you && <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">You</span>}
                    </p>
                    <p className="truncate text-xs text-slate-400">{a.email}</p>
                  </div>
                  {!you && (
                    <button
                      type="button"
                      onClick={() => void remove(a)}
                      disabled={busy !== null}
                      aria-label={`Remove admin access for ${a.email ?? a.fullName ?? 'this account'}`}
                      className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs font-semibold text-slate-300 hover:border-rose-500/40 hover:text-rose-200 disabled:opacity-50"
                    >
                      {busy === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <UserMinus className="h-3.5 w-3.5" aria-hidden="true" />}
                      Remove
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-2 text-xs text-slate-500">
          Removing an admin turns them back into a technician if they still have an active tech record, otherwise a
          customer. You can’t remove yourself.
        </p>
      </section>
    </div>
  );
};
