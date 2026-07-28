import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  cancelJobWithHold,
  captureBookingPayment,
  claimBookingRow,
  fetchDispatchBookings,
  fetchMyTechSpecialties,
  submitBookingQuote,
  subscribeDispatchBookings,
  updateBookingRow,
  type DispatchBooking,
} from '../../services/techDispatch';
import { openOnTheWaySms } from '../../services/onTheWaySms';
import { techCanClaimServices } from '../../services/serviceCatalog';

type LineDraft = { title: string; laborDollars: string; partsDollars: string };

export const TechJobsTab: React.FC = () => {
  const [filter, setFilter] = useState<'available' | 'active'>('available');
  const [jobs, setJobs] = useState<DispatchBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeJob, setActiveJob] = useState<DispatchBooking | null>(null);
  const [jobPhase, setJobPhase] = useState<'en_route' | 'on_site' | 'quote_sent' | 'complete'>('en_route');
  const [mechanicId, setMechanicId] = useState<string | null>(null);
  const [mySpecialties, setMySpecialties] = useState<string[]>(['mechanical']);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [techNotes, setTechNotes] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([
    { title: '', laborDollars: '', partsDollars: '' },
  ]);

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
    void fetchMyTechSpecialties().then(setMySpecialties);
    loadJobs();
    const ch = subscribeDispatchBookings(() => loadJobs());
    return () => {
      void ch.unsubscribe();
    };
  }, [loadJobs]);

  useEffect(() => {
    if (!activeJob) return;
    const fresh = jobs.find((j) => j.referenceCode === activeJob.referenceCode);
    if (!fresh) return;
    if (fresh.quoteStatus !== activeJob.quoteStatus || fresh.status !== activeJob.status) {
      setActiveJob(fresh);
      if (fresh.quoteStatus === 'quote_pending') setJobPhase('quote_sent');
      if (fresh.status === 'COMPLETED') setJobPhase('complete');
    }
  }, [jobs, activeJob]);

  const available = jobs.filter(
    (j) => j.status === 'UNASSIGNED' && techCanClaimServices(mySpecialties, j.services)
  );

  const isDiagnosticJob = (job: DispatchBooking) =>
    job.quoteStatus === 'awaiting_diagnostic' || job.quoteStatus === 'quote_pending';

  const textCustomerOnTheWay = (job: DispatchBooking) => {
    const ok = openOnTheWaySms({
      phone: job.phone,
      customerName: job.customer,
      referenceCode: job.referenceCode,
      etaMinutes: job.etaMinutes || 12,
    });
    if (!ok) {
      setMessage('This booking has no customer phone on file.');
      return;
    }
    setMessage('Opened your SMS app — send the “on the way” text, then head to the job.');
  };

  const handleClaim = async (job: DispatchBooking) => {
    if (!mechanicId) {
      setMessage('Sign in required.');
      return;
    }
    try {
      await claimBookingRow(job.referenceCode, mechanicId);
      const claimed = { ...job, status: 'EN_ROUTE', etaMinutes: job.etaMinutes || 12 };
      setActiveJob(claimed);
      setFilter('active');
      setJobPhase('en_route');
      setLines([{ title: '', laborDollars: '', partsDollars: '' }]);
      setTechNotes('');
      await loadJobs();
      setMessage('Job claimed — tap “Text customer — on the way” to open Messages.');
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Claim failed');
    }
  };

  const handleArrived = async () => {
    if (!activeJob) return;
    setJobPhase('on_site');
    await updateBookingRow(activeJob.referenceCode, { status: 'ON_SITE', distance_miles: 0, eta_minutes: 0 });
    setActiveJob({ ...activeJob, status: 'ON_SITE' });
    await loadJobs();
  };

  const handleSubmitQuote = async () => {
    if (!activeJob) return;
    const lineItems = lines
      .map((l) => ({
        title: l.title.trim(),
        laborDollars: Number(l.laborDollars) || 0,
        partsDollars: Number(l.partsDollars) || 0,
      }))
      .filter((l) => l.title && l.laborDollars + l.partsDollars > 0);

    if (!lineItems.length) {
      setMessage('Add at least one recommended repair with a dollar amount.');
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const result = await submitBookingQuote(activeJob.referenceCode, lineItems, techNotes);
      setActiveJob({ ...activeJob, quoteStatus: 'quote_pending' });
      setJobPhase('quote_sent');
      setMessage(
        `Quote sent ($${result.totalDollars.toFixed(2)}). Waiting for customer approval — then payment captures automatically.`
      );
      await loadJobs();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Could not submit quote');
    } finally {
      setBusy(false);
    }
  };

  const handleCompleteDirect = async () => {
    if (!activeJob) return;
    setBusy(true);
    setJobPhase('complete');
    try {
      const result = await captureBookingPayment(activeJob.referenceCode);
      await updateBookingRow(activeJob.referenceCode, { status: 'COMPLETED' });
      if (result.transferWarning) {
        setMessage(
          `Captured, but Connect transfer failed: ${result.transferWarning} Open Earnings and tap Retry transfer.`
        );
      } else {
        setMessage(
          `Charged $${result.capturedAmountDollars?.toFixed(2) ?? '0'} — $${result.techPayoutDollars?.toFixed(2) ?? '0'} to Connect`
        );
      }
    } catch (e: unknown) {
      setMessage(
        e instanceof Error
          ? `${e.message} — job stays open until capture succeeds.`
          : 'Capture failed.'
      );
      setJobPhase('on_site');
      setBusy(false);
      return;
    }
    setBusy(false);
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
        <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
          {message}
        </p>
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
            <div className="flex justify-between gap-2">
              <p className="font-bold text-white">{job.customer}</p>
              <span className="text-[11px] text-slate-500">{job.distanceMiles.toFixed(1)} mi</span>
            </div>
            <p className="font-mono text-orange-400 text-xs font-bold">{job.referenceCode}</p>
            {job.quoteStatus === 'awaiting_diagnostic' && (
              <p className="text-[10px] font-bold text-sky-300">DIAGNOSTIC — quote after inspection</p>
            )}
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
        <p className="text-xs text-slate-500 text-center py-8">
          No unassigned jobs — new web bookings appear here in realtime.
        </p>
      )}

      {filter === 'active' && activeJob && (
        <div className="bg-[#12141c] border border-orange-500/30 rounded-2xl p-4 space-y-3">
          <p className="text-orange-400 font-bold">{activeJob.referenceCode}</p>
          <p className="text-white font-semibold">{activeJob.customer}</p>
          <p className="text-xs text-slate-400">{activeJob.address}</p>
          {isDiagnosticJob(activeJob) && (
            <p className="text-[11px] text-sky-300/95 leading-relaxed">
              Diagnostic visit: inspect, then submit recommended repairs. Customer approves before any repair
              charge (diagnostic hold stays on file).
            </p>
          )}

          {jobPhase === 'en_route' && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => textCustomerOnTheWay(activeJob)}
                className="w-full py-3 bg-sky-600 rounded-xl text-xs font-bold text-white"
              >
                Text customer — on the way
              </button>
              <button
                type="button"
                onClick={() => void handleArrived()}
                className="w-full py-3 bg-orange-500 rounded-xl text-xs font-bold text-white"
              >
                Mark arrived on-site
              </button>
            </div>
          )}

          {jobPhase === 'on_site' && activeJob.quoteStatus === 'awaiting_diagnostic' && (
            <div className="space-y-3 border border-white/10 rounded-xl p-3 bg-[#0b0c10]">
              <p className="text-[11px] font-bold text-slate-300 uppercase">Recommended repairs</p>
              {lines.map((line, idx) => (
                <div key={idx} className="space-y-1.5 border-b border-white/5 pb-2">
                  <input
                    placeholder="Repair title (e.g. Front brake pads)"
                    value={line.title}
                    onChange={(e) => {
                      const next = [...lines];
                      next[idx] = { ...next[idx], title: e.target.value };
                      setLines(next);
                    }}
                    className="w-full bg-[#12141c] border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Labor $"
                      value={line.laborDollars}
                      onChange={(e) => {
                        const next = [...lines];
                        next[idx] = { ...next[idx], laborDollars: e.target.value };
                        setLines(next);
                      }}
                      className="bg-[#12141c] border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Parts $"
                      value={line.partsDollars}
                      onChange={(e) => {
                        const next = [...lines];
                        next[idx] = { ...next[idx], partsDollars: e.target.value };
                        setLines(next);
                      }}
                      className="bg-[#12141c] border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setLines([...lines, { title: '', laborDollars: '', partsDollars: '' }])}
                className="text-[11px] text-orange-400 font-bold"
              >
                + Add line
              </button>
              <textarea
                placeholder="Notes for customer (optional)"
                value={techNotes}
                onChange={(e) => setTechNotes(e.target.value)}
                rows={2}
                className="w-full bg-[#12141c] border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
              />
              <p className="text-[10px] text-slate-500">
                Total charged on approval = $
                {(
                  (activeJob.holdAmountCents ?? 10000) / 100 +
                  lines.reduce(
                    (s, l) => s + (Number(l.laborDollars) || 0) + (Number(l.partsDollars) || 0),
                    0
                  )
                ).toFixed(2)}{' '}
                (includes ${(activeJob.holdAmountCents ?? 10000) / 100} diagnostic)
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSubmitQuote()}
                className="w-full py-3 bg-emerald-600 rounded-xl text-xs font-bold text-white disabled:opacity-60"
              >
                {busy ? 'Sending…' : 'Send quote to customer →'}
              </button>
            </div>
          )}

          {jobPhase === 'on_site' && !isDiagnosticJob(activeJob) && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleCompleteDirect()}
              className="w-full py-3 bg-emerald-600 rounded-xl text-xs font-bold text-white disabled:opacity-60"
            >
              Complete job & capture payment
            </button>
          )}

          {(jobPhase === 'quote_sent' || activeJob.quoteStatus === 'quote_pending') && (
            <p className="text-xs text-emerald-400 leading-relaxed">
              Quote pending customer approval. You’ll see Connect earnings after they approve and payment
              captures.
            </p>
          )}

          {jobPhase !== 'complete' && activeJob.quoteStatus !== 'quote_pending' && (
            <button
              type="button"
              onClick={() => void handleCancel()}
              className="w-full py-2 text-xs text-rose-300 border border-rose-500/40 rounded-xl"
            >
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
