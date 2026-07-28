import React, { useCallback, useEffect, useState } from 'react';
import {
  approvePartnerApplication,
  fetchPartnerApplications,
  rejectPartnerApplication,
  type PartnerApplicationRow,
} from '../services/partners';

export const PartnersAdmin: React.FC = () => {
  const [rows, setRows] = useState<PartnerApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchPartnerApplications());
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const approve = async (id: string) => {
    setBusyId(id);
    setMessage(null);
    try {
      await approvePartnerApplication(id);
      setMessage('Partner approved and listed for shop bookings.');
      await load();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Approve failed');
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string) => {
    setBusyId(id);
    setMessage(null);
    try {
      await rejectPartnerApplication(id);
      setMessage('Application rejected.');
      await load();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Reject failed');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <p className="text-xs text-slate-500">Loading partner applications…</p>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        Shop / garage partnership applications. Approving creates a host location customers can book.
      </p>
      {message && (
        <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
          {message}
        </p>
      )}
      {rows.length === 0 && <p className="text-xs text-slate-500 py-6 text-center">No applications yet.</p>}
      {rows.map((row) => (
        <div
          key={row.id}
          className="rounded-2xl border border-white/10 bg-[#12141c] p-4 space-y-2 text-sm"
        >
          <div className="flex justify-between gap-2">
            <p className="font-bold text-white">{row.businessName}</p>
            <span className="text-[10px] font-bold uppercase text-slate-400">{row.status}</span>
          </div>
          <p className="text-xs text-slate-400">
            {row.contactName} · {row.email}
            {row.phone ? ` · ${row.phone}` : ''}
          </p>
          <p className="text-xs text-slate-500">
            {[row.address, row.city, row.zipCode].filter(Boolean).join(', ') || 'Address TBD'}
          </p>
          <p className="text-[11px] text-slate-500">
            Lift: {row.hasLift ? 'Yes' : 'No'}
            {row.bayCount != null ? ` · ${row.bayCount} bays` : ''}
            {row.hoursNote ? ` · ${row.hoursNote}` : ''}
          </p>
          {row.notes && <p className="text-xs text-slate-400">{row.notes}</p>}
          {row.status === 'submitted' && (
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={busyId === row.id}
                onClick={() => void approve(row.id)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold disabled:opacity-50"
              >
                Approve & list
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
        </div>
      ))}
    </div>
  );
};
