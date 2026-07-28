import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  cancelJobWithHold,
  captureBookingPayment,
  claimBookingRow,
  fetchDispatchBookings,
  fetchMyTechSpecialties,
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
  const [jobPhase, setJobPhase] = useState<'en_route' | 'on_site' | 'complete'>('en_route');
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
    if (fresh.status !== activeJob.status || fresh.paymentStatus !== activeJob.paymentStatus) {
      setActiveJob(fresh);
      if (fresh.status === 'COMPLETED') setJobPhase('complete');
    }
  }, [jobs, activeJob]);

  const available = jobs.filter(
    (j) => j.status === 'UNASSIGNED' && techCanClaimServices(mySpecialties, j.services)
  );

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
      setActiveJob({ ...job, status: 'EN_ROUTE', etaMinutes: job.etaMinutes || 12 });
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
    await updateBookingRow(activeJob.referenceCode, {
      status: 'ON_SITE',
      distance_miles: 0,
      eta_minutes: 0,
    });
    setActiveJob({ ...activeJob, status: 'ON_SITE' });
    await loadJobs();
  };

  const repairsSubtotal = lines.reduce(
    (s, l) => s + (Number(l.laborDollars) || 0) + (Number(l.partsDollars) || 0),
    0
  );
  const holdDollars = (activeJob?.holdAmountCents ?? 10000) / 100;
  const chargeTotal = holdDollars + repairsSubtotal;

  const finishJob = () => {
    setBusy(false);
    setTimeout(() => {
      setActiveJob(null);
      setFilter('available');
      setJobPhase('en_route');
      void loadJobs();
    }, 2500);
  };

  const handleCharge = async () => {
    if (!activeJob) return;
    const lineItems = lines
      .map((l) => ({
        title: l.title.trim(),
        laborDollars: Number(l.laborDollars) || 0,
        partsDollars: Number(l.partsDollars) || 0,
      }))
      .filter((l) => l.title && l.laborDollars + l.partsDollars > 0);

    if (!lineItems.length) {
      setMessage('Add labor/parts lines for the agreed repair price, or tap Diagnostic only.');
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const result = await captureBookingPayment(activeJob.referenceCode, {
        mode: 'charge',
        lineItems,
        techNotes,
      });
      setJobPhase('complete');
      if (result.transferWarning) {
        setMessage(
          `Charged $${result.capturedAmountDollars?.toFixed(2)}, but Connect transfer failed: ${result.transferWarning}`
        );
      } else {
        setMessage(
          `Charged $${result.capturedAmountDollars?.toFixed(2)} — your 70% share $${result.techPayoutDollars?.toFixed(2)} to Connect`
        );
      }
      finishJob();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Charge failed');
      setBusy(false);
    }
  };

  const handleDiagnosticOnly = async () => {
    if (!activeJob) return;
    if (!confirm('Charge the $100 diagnostic only and close the job?')) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await captureBookingPayment(activeJob.referenceCode, {
        mode: 'diagnostic_only',
      });
      setJobPhase('complete');
      setMessage(
        `Diagnostic $${result.capturedAmountDollars?.toFixed(2)} charged — 70% share $${result.techPayoutDollars?.toFixed(2)}`
      );
      finishJob();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Diagnostic charge failed');
      setBusy(false);
    }
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
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase ${
              filter === f ? 'bg-orange-500 text-white' : 'bg-white/5 text-slate-400'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {filter === 'available' && (
        <div className="space-y-2">
          {available.length === 0 && (
            <p className="text-xs text-slate-500">No open jobs matching your specialties.</p>
          )}
          {available.map((job) => (
            <div
              key={job.id}
              className="rounded-xl border border-white/10 bg-[#12141c] p-3 space-y-2"
            >
              <div className="flex justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-white">{job.customer}</p>
                  <p className="text-[11px] text-slate-400">{job.vehicle}</p>
                  <p className="text-[11px] text-slate-500">{job.services.join(' · ')}</p>
                </div>
                <span className="text-[10px] text-amber-400 font-bold">$100 hold</span>
              </div>
              <button
                type="button"
                onClick={() => void handleClaim(job)}
                className="w-full py-2.5 bg-orange-500 rounded-xl text-xs font-bold text-white"
              >
                Claim job
              </button>
            </div>
          ))}
        </div>
      )}

      {filter === 'active' && activeJob && (
        <div className="rounded-xl border border-orange-500/30 bg-[#12141c] p-4 space-y-3">
          <div>
            <p className="text-sm font-bold text-white">{activeJob.customer}</p>
            <p className="text-[11px] text-slate-400">{activeJob.address}</p>
            <p className="text-[11px] text-slate-500">{activeJob.services.join(' · ')}</p>
            <p className="text-[10px] text-amber-400/90 mt-1">
              $100 diagnostic hold on file — you set labor + parts after diagnosis.
            </p>
          </div>

          {jobPhase === 'en_route' && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => textCustomerOnTheWay(activeJob)}
                className="w-full py-2.5 bg-white/10 rounded-xl text-xs font-bold text-white"
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

          {jobPhase === 'on_site' && (
            <div className="space-y-3 border border-white/10 rounded-xl p-3 bg-[#0b0c10]">
              <p className="text-[11px] font-bold text-slate-300 uppercase">Set price (labor + parts)</p>
              <p className="text-[10px] text-slate-500">
                Agree the price with the customer on site, then charge. Adaptivity takes 30%; you keep 70% +
                tips.
              </p>
              {lines.map((line, idx) => (
                <div key={idx} className="space-y-1.5 border-b border-white/5 pb-2">
                  <input
                    placeholder="Line title (e.g. Front brake pads)"
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
                placeholder="Notes (optional)"
                value={techNotes}
                onChange={(e) => setTechNotes(e.target.value)}
                rows={2}
                className="w-full bg-[#12141c] border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
              />
              <p className="text-[10px] text-slate-500">
                Total charge = ${chargeTotal.toFixed(2)} (${holdDollars.toFixed(0)} diagnostic + $
                {repairsSubtotal.toFixed(2)} repairs)
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleCharge()}
                className="w-full py-3 bg-emerald-600 rounded-xl text-xs font-bold text-white disabled:opacity-60"
              >
                {busy ? 'Charging…' : `Charge customer $${chargeTotal.toFixed(2)}`}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleDiagnosticOnly()}
                className="w-full py-2.5 bg-white/10 rounded-xl text-xs font-bold text-slate-200 disabled:opacity-60"
              >
                Diagnostic only ($100) — no repairs
              </button>
            </div>
          )}

          {jobPhase === 'complete' && (
            <p className="text-xs text-emerald-400">Job complete. Returning to board…</p>
          )}

          {jobPhase !== 'complete' && (
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
        <p className="text-xs text-slate-500 text-center py-8">
          Claim a job from Available to start dispatch.
        </p>
      )}
    </div>
  );
};
