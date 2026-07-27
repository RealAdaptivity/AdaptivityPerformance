import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  cancelJobWithHold,
  captureBookingPayment,
  claimBookingRow,
  fetchDispatchBookings,
  subscribeDispatchBookings,
  updateBookingRow,
  type DispatchBooking,
} from '../../services/techDispatch';

export const TechJobsTab: React.FC = () => {
  const [filter, setFilter] = useState<'available' | 'active'>('available');
  const [jobs, setJobs] = useState<DispatchBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeJob, setActiveJob] = useState<DispatchBooking | null>(null);
  const [jobPhase, setJobPhase] = useState<'en_route' | 'on_site' | 'complete'>('en_route');
  const [mechanicId, setMechanicId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    try {
      const rows = await fetchDispatchBookings();
      setJobs(rows.filter((j) => j.status !== 'COMPLETED' && j.status !== 'CANCELED'));
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setMechanicId(data.session?.user?.id ?? null));
    loadJobs();
    const ch = subscribeDispatchBookings(() => loadJobs());
    return () => {
      void ch.unsubscribe();
    };
  }, [loadJobs]);

  const available = jobs.filter((j) => j.status === 'UNASSIGNED');

  const handleClaim = async (job: DispatchBooking) => {
    if (!mechanicId) {
      setMessage('Sign in required.');
      return;
    }
    try {
      await claimBookingRow(job.referenceCode, mechanicId);
      setActiveJob(job);
      setFilter('active');
      setJobPhase('en_route');
      await loadJobs();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Claim failed');
    }
  };

  const handleArrived = async () => {
    if (!activeJob) return;
    setJobPhase('on_site');
    await updateBookingRow(activeJob.referenceCode, { status: 'ON_SITE', distance_miles: 0, eta_minutes: 0 });
    await loadJobs();
  };

  const handleComplete = async () => {
    if (!activeJob) return;
    setJobPhase('complete');
    try {
      const result = await captureBookingPayment(activeJob.referenceCode);
      await updateBookingRow(activeJob.referenceCode, { status: 'COMPLETED' });
      if (result.transferWarning) {
        setMessage(
          `Captured, but Connect transfer failed: ${result.transferWarning} Open Earnings and tap Retry transfer.`
        );
      } else if (result.alreadyCaptured && result.transferId) {
        setMessage(`Connect transfer completed — your share $${result.techPayoutDollars?.toFixed(2) ?? '0'}. Check Earnings.`);
      } else {
        setMessage(
          result.alreadyCaptured
            ? 'Payment already captured.'
            : `Charged $${result.capturedAmountDollars?.toFixed(2) ?? '0'} — $${result.techPayoutDollars?.toFixed(2) ?? '0'} sent to Connect (${result.connectAccountId ?? 'link Stripe in Settings'})`
        );
      }
    } catch (e: unknown) {
      setMessage(
        e instanceof Error
          ? `${e.message} — job stays open until capture succeeds.`
          : 'Capture failed — finish the job again to charge the card hold.'
      );
      setJobPhase('on_site');
      return;
    }
    setTimeout(() => {
      setActiveJob(null);
      setFilter('available');
      setJobPhase('en_route');
      loadJobs();
    }, 2500);
  };

  const handleCancel = async () => {
    if (!activeJob || !confirm('Cancel job and release customer card hold?')) return;
    try {
      await cancelJobWithHold(activeJob.referenceCode);
      setActiveJob(null);
      setFilter('available');
      await loadJobs();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Cancel failed');
    }
  };

  if (loading) return <p className="text-xs text-slate-500">Loading dispatch board…</p>;

  return (
    <div className="space-y-4">
      {message && (
        <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">{message}</p>
      )}
      <div className="flex gap-2">
        {(['available', 'active'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`flex-1 py-2 text-xs font-bold rounded-xl border ${
              filter === f ? 'border-orange-500 text-orange-400 bg-orange-500/10' : 'border-white/10 text-slate-500'
            }`}
          >
            {f === 'available' ? `Available (${available.length})` : 'My active job'}
          </button>
        ))}
      </div>

      {filter === 'available' &&
        available.map((job) => (
          <div key={job.id} className="bg-[#12141c] border border-white/10 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between">
              <p className="font-bold text-white">{job.customer}</p>
              <span className="text-[11px] text-slate-500">{job.distanceMiles.toFixed(1)} mi</span>
            </div>
            <p className="font-mono text-orange-400 text-xs font-bold">{job.referenceCode}</p>
            <p className="text-xs text-slate-400">{job.vehicle}</p>
            <p className="text-[11px] text-slate-500">{job.address}</p>
            <ul className="text-[11px] text-slate-400">
              {job.services.map((s) => (
                <li key={s}>• {s}</li>
              ))}
            </ul>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm font-bold">${job.total}</span>
              <button
                type="button"
                onClick={() => void handleClaim(job)}
                className="px-4 py-2 bg-orange-500 rounded-lg text-xs font-bold text-white"
              >
                Claim dispatch →
              </button>
            </div>
          </div>
        ))}

      {filter === 'available' && available.length === 0 && (
        <p className="text-xs text-slate-500 text-center py-8">No unassigned jobs — new web bookings appear here in realtime.</p>
      )}

      {filter === 'active' && activeJob && (
        <div className="bg-[#12141c] border border-orange-500/30 rounded-2xl p-4 space-y-3">
          <p className="text-orange-400 font-bold">{activeJob.referenceCode}</p>
          <p className="text-white font-semibold">{activeJob.customer}</p>
          <p className="text-xs text-slate-400">{activeJob.address}</p>
          {jobPhase === 'en_route' && (
            <button type="button" onClick={() => void handleArrived()} className="w-full py-3 bg-orange-500 rounded-xl text-xs font-bold text-white">
              Mark arrived on-site
            </button>
          )}
          {jobPhase === 'on_site' && (
            <button type="button" onClick={() => void handleComplete()} className="w-full py-3 bg-emerald-600 rounded-xl text-xs font-bold text-white">
              Complete job & capture payment
            </button>
          )}
          {jobPhase !== 'complete' && (
            <button type="button" onClick={() => void handleCancel()} className="w-full py-2 text-xs text-rose-300 border border-rose-500/40 rounded-xl">
              Cancel job & release hold
            </button>
          )}
        </div>
      )}

      {filter === 'active' && !activeJob && (
        <p className="text-xs text-slate-500 text-center py-8">Claim a job from Available to start dispatch.</p>
      )}
    </div>
  );
};
