import React, { useCallback, useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import {
  approveTechApplication,
  fetchTechApplications,
  inviteApprovedTech,
  rejectTechApplication,
  type TechApplicationRow,
} from '../services/techApplications';

export const TechApplicationsAdmin: React.FC = () => {
  const [rows, setRows] = useState<TechApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'submitted' | 'all'>('submitted');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchTechApplications());
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Failed to load tech applications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const approve = async (id: string, markToolsVerified: boolean) => {
    setBusyId(id);
    setMessage(null);
    try {
      const result = await approveTechApplication(id, { markToolsVerified, sendInvite: true });
      setMessage(result.nextStep || 'Technician approved — password setup email sent.');
      await load();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Approve failed');
    } finally {
      setBusyId(null);
    }
  };

  const resendInvite = async (id: string) => {
    setBusyId(id);
    setMessage(null);
    try {
      const invite = await inviteApprovedTech(id);
      setMessage(invite.message || `Password setup emailed to ${invite.email}.`);
      await load();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Could not resend invite');
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string) => {
    setBusyId(id);
    setMessage(null);
    try {
      await rejectTechApplication(id);
      setMessage('Application rejected.');
      await load();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Reject failed');
    } finally {
      setBusyId(null);
    }
  };

  const visible = filter === 'all' ? rows : rows.filter((r) => r.status === 'submitted');
  const pendingCount = rows.filter((r) => r.status === 'submitted').length;

  if (loading) return <p className="text-xs text-slate-500">Loading tech applications…</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-400">
          Approve sends a <strong className="text-slate-300">password setup email</strong> (invite or
          reset). Techs set a password, then sign in on the Technician tab — no self-serve signup.
        </p>
        <div className="flex rounded-lg border border-white/10 p-0.5 bg-[#0b0c10] text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setFilter('submitted')}
            className={`px-2.5 py-1 rounded-md ${
              filter === 'submitted' ? 'bg-emerald-600 text-white' : 'text-slate-400'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-md ${filter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
          >
            All
          </button>
        </div>
      </div>

      {message && (
        <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
          {message}
        </p>
      )}

      {visible.length === 0 && (
        <p className="text-xs text-slate-500 py-6 text-center">
          {filter === 'submitted' ? 'No pending applications.' : 'No applications yet.'}
        </p>
      )}

      {visible.map((row) => {
        const toolsOn = Object.entries(row.tools).filter(([, v]) => v).map(([k]) => k);
        const canResend = row.status === 'approved';
        return (
          <div
            key={row.id}
            className="rounded-2xl border border-white/10 bg-[#12141c] p-4 space-y-2 text-sm"
          >
            <div className="flex justify-between gap-2">
              <p className="font-bold text-white">{row.fullName}</p>
              <span
                className={`text-[10px] font-bold uppercase ${
                  row.status === 'submitted'
                    ? 'text-amber-400'
                    : row.status === 'approved'
                      ? 'text-emerald-400'
                      : 'text-slate-500'
                }`}
              >
                {row.status}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {row.email} · {row.phone}
              {row.zipCode ? ` · ZIP ${row.zipCode}` : ''}
            </p>
            <p className="text-xs text-slate-500">
              Exp: {row.yearsExperience || '—'} · Capacity: {row.jobCapacity} · Pay: {row.payPreference}
              {row.hasVehicle ? ' · Has rig' : ' · No vehicle noted'}
            </p>
            <p className="text-[11px] text-slate-400">
              Trades: {(row.trades.length ? row.trades : row.specialties).join(', ')}
            </p>
            {row.aseCerts.length > 0 && (
              <p className="text-[11px] text-slate-500">ASE: {row.aseCerts.join(', ')}</p>
            )}
            {toolsOn.length > 0 && (
              <p className="text-[11px] text-slate-500">Tools checked: {toolsOn.join(', ')}</p>
            )}
            {row.profileId && (
              <p className="text-[11px] text-emerald-400/90">Linked profile: {row.profileId.slice(0, 8)}…</p>
            )}
            <p className="text-[10px] text-slate-600">
              Submitted {new Date(row.createdAt).toLocaleString()}
            </p>

            {row.status === 'submitted' && (
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  disabled={busyId === row.id}
                  onClick={() => void approve(row.id, false)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold disabled:opacity-50"
                >
                  Approve + email password setup
                </button>
                <button
                  type="button"
                  disabled={busyId === row.id}
                  onClick={() => void approve(row.id, true)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-800 text-emerald-100 text-xs font-bold disabled:opacity-50"
                >
                  Approve + tools verified
                </button>
                <button
                  type="button"
                  disabled={busyId === row.id}
                  onClick={() => void reject(row.id)}
                  className="px-3 py-1.5 rounded-lg border border-white/15 text-slate-300 text-xs font-bold disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            )}

            {canResend && (
              <div className="pt-1">
                <button
                  type="button"
                  disabled={busyId === row.id}
                  onClick={() => void resendInvite(row.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-500/40 text-orange-300 text-xs font-bold hover:bg-orange-500/10 disabled:opacity-50"
                >
                  <Mail className="w-3 h-3" />
                  Resend password setup email
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
