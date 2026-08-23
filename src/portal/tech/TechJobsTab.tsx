import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Phone, MessageSquare, Navigation } from 'lucide-react';
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
import { sendOnTheWaySmsAuto, sendChargeReceiptSmsAuto } from '../../services/sendSms';
import { uploadJobPhoto } from '../../services/jobPhotos';
import { specialtyMatchHint } from '../../services/jobSpecialtyMatch';
import {
  fetchMyPartsExpenseClaims,
  submitPartsExpenseClaim,
  uploadExpenseReceiptFile,
  type PartsExpenseClaim,
} from '../../services/partsExpenses';
import { todayISODate } from '../../services/scheduleWindows';
import { JobChatPanel } from '../../components/JobChatPanel';

type LineDraft = { title: string; laborDollars: string; partsDollars: string };
type JobsFilter = 'today' | 'available' | 'active';

function googleMapsDirectionsUrl(address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

function isTodaysJob(j: DispatchBooking, today: string): boolean {
  return j.preferredDate === today || j.status === 'EN_ROUTE' || j.status === 'ON_SITE';
}

export const TechJobsTab: React.FC = () => {
  const [filter, setFilter] = useState<JobsFilter>('available');
  const [jobs, setJobs] = useState<DispatchBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeJob, setActiveJob] = useState<DispatchBooking | null>(null);
  const [jobPhase, setJobPhase] = useState<'en_route' | 'on_site' | 'complete'>('en_route');
  const [mechanicId, setMechanicId] = useState<string | null>(null);
  const [mySpecialties, setMySpecialties] = useState<string[]>(['mechanical']);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [techNotes, setTechNotes] = useState('');
  const [customerAgreed, setCustomerAgreed] = useState(false);
  const [lines, setLines] = useState<LineDraft[]>([
    { title: '', laborDollars: '', partsDollars: '' },
  ]);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseBusy, setExpenseBusy] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [claims, setClaims] = useState<PartsExpenseClaim[]>([]);

  const loadClaims = useCallback(async () => {
    try {
      setClaims(await fetchMyPartsExpenseClaims());
    } catch {
      /* ignore if table missing */
    }
  }, []);

  const loadJobs = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const rows = await fetchDispatchBookings();
      setJobs(rows.filter((j) => j.status !== 'COMPLETED' && j.status !== 'CANCELED'));
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setMechanicId(data.session?.user?.id ?? null));
    void fetchMyTechSpecialties().then(setMySpecialties);
    loadJobs();
    void loadClaims();
    const ch = subscribeDispatchBookings(() => loadJobs());
    return () => {
      void ch.unsubscribe();
    };
  }, [loadJobs, loadClaims]);

  useEffect(() => {
    if (!activeJob) return;
    const fresh = jobs.find((j) => j.referenceCode === activeJob.referenceCode);
    if (!fresh) return;
    if (fresh.status !== activeJob.status || fresh.paymentStatus !== activeJob.paymentStatus) {
      setActiveJob(fresh);
      if (fresh.status === 'COMPLETED') setJobPhase('complete');
    }
  }, [jobs, activeJob]);

  const today = todayISODate();
  const available = jobs.filter(
    (j) =>
      (j.status === 'UNASSIGNED' || j.status === 'REQUESTED' || j.status === 'CONFIRMED' || !j.mechanicId) &&
      j.status !== 'COMPLETED' &&
      j.status !== 'CANCELED'
  );
  const todayJobs = jobs.filter((j) => isTodaysJob(j, today));

  const openNavigate = (address: string) => {
    if (!address?.trim()) {
      setMessage('This job has no customer address on file.');
      return;
    }
    window.open(googleMapsDirectionsUrl(address.trim()), '_blank', 'noopener,noreferrer');
  };

  const textCustomerOnTheWay = async (job: DispatchBooking) => {
    const result = await sendOnTheWaySmsAuto({
      phone: job.phone,
      customerName: job.customer,
      referenceCode: job.referenceCode,
      etaMinutes: job.etaMinutes || 20,
    });
    if (!result.sent) {
      setMessage('This booking has no customer phone on file.');
      return;
    }
    if (result.via === 'twilio') {
      setMessage('On-the-way text sent automatically.');
      return;
    }
    setMessage('Opened your SMS app — send the “on the way” text, then head to the job.');
  };

  const handleClaim = async (job: DispatchBooking) => {
    let effectiveMechId = mechanicId;
    if (!effectiveMechId) {
      const { data } = await supabase.auth.getSession();
      effectiveMechId = data.session?.user?.id ?? null;
      if (effectiveMechId) setMechanicId(effectiveMechId);
    }
    if (!effectiveMechId) {
      setMessage('Please log in again to claim this job.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await claimBookingRow(job.referenceCode, effectiveMechId);
      setActiveJob({ ...job, status: 'EN_ROUTE', etaMinutes: job.etaMinutes || 20, mechanicId: effectiveMechId });
      setFilter('active');
      setJobPhase('en_route');
      setLines([{ title: '', laborDollars: '', partsDollars: '' }]);
      setTechNotes('');
      setCustomerAgreed(false);
      await loadJobs();
      setMessage('Job claimed! Tap “Text customer — on the way” or start navigation.');
    } catch (e: unknown) {
      const errText = e instanceof Error ? e.message : 'Claim failed';
      setMessage(`Unable to claim job: ${errText}`);
    } finally {
      setBusy(false);
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

  const laborSubtotal = lines.reduce((s, l) => s + (Number(l.laborDollars) || 0), 0);
  const partsSubtotal = lines.reduce((s, l) => s + (Number(l.partsDollars) || 0), 0);
  const repairsSubtotal = laborSubtotal + partsSubtotal;
  const holdDollars = (activeJob?.holdAmountCents ?? 8500) / 100;
  const salesTaxDollars = Math.round(partsSubtotal * 0.0825 * 100) / 100;
  const chargeTotal = holdDollars + repairsSubtotal + salesTaxDollars;

  const finishJob = () => {
    setBusy(false);
    setTimeout(() => {
      setActiveJob(null);
      setFilter('available');
      setJobPhase('en_route');
      void loadJobs();
    }, 2500);
  };

  const sendReceiptSms = async (
    job: DispatchBooking,
    amountDollars: number,
    kind: 'charge' | 'diagnostic_only' | 'no_show',
    extras?: {
      lines?: { title: string; laborDollars: number; partsDollars: number }[];
      diagnosticDollars?: number;
      salesTaxDollars?: number;
    }
  ) => {
    if (!job.phone) return;
    const result = await sendChargeReceiptSmsAuto({
      phone: job.phone,
      customerName: job.customer,
      referenceCode: job.referenceCode,
      amountDollars,
      kind,
      lines: extras?.lines,
      diagnosticDollars: extras?.diagnosticDollars,
      salesTaxDollars: extras?.salesTaxDollars,
    });
    if (result.via === 'twilio') {
      setMessage((prev) => `${prev || 'Done'} · Receipt SMS sent.`);
    } else if (result.via === 'device') {
      setMessage((prev) => `${prev || 'Done'} · Opened SMS composer for receipt.`);
    }
  };

  const handleAddJobPhoto = async () => {
    if (!activeJob) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      void (async () => {
        try {
          await uploadJobPhoto({ bookingId: activeJob.id, file, kind: 'dvi' });
          setMessage('Job photo uploaded.');
        } catch (e: unknown) {
          setMessage(e instanceof Error ? e.message : 'Photo upload failed');
        }
      })();
    };
    input.click();
  };

  const handleSubmitExpense = async () => {
    if (!activeJob) return;
    setExpenseBusy(true);
    setMessage(null);
    try {
      await submitPartsExpenseClaim({
        bookingId: activeJob.id,
        amountDollars: Number(expenseAmount),
        description: expenseDesc,
        receiptPath: null,
      });
      setExpenseAmount('');
      setExpenseDesc('');
      setMessage('Parts reimbursement claim submitted.');
      await loadClaims();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Claim failed');
    } finally {
      setExpenseBusy(false);
    }
  };

  const handleAttachReceiptAndSubmit = async () => {
    if (!activeJob) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      void (async () => {
        setExpenseBusy(true);
        setMessage(null);
        try {
          let receiptPath: string | null = null;
          if (file) {
            receiptPath = await uploadExpenseReceiptFile({ bookingId: activeJob.id, file });
          }
          await submitPartsExpenseClaim({
            bookingId: activeJob.id,
            amountDollars: Number(expenseAmount),
            description: expenseDesc,
            receiptPath,
          });
          setExpenseAmount('');
          setExpenseDesc('');
          setMessage(file ? 'Claim submitted with receipt.' : 'Claim submitted.');
          await loadClaims();
        } catch (e: unknown) {
          setMessage(e instanceof Error ? e.message : 'Claim failed');
        } finally {
          setExpenseBusy(false);
        }
      })();
    };
    input.click();
  };

  const handleCharge = async () => {
    if (!activeJob) return;
    if (!customerAgreed) {
      setMessage('Confirm the customer agreed to this on-site price before charging.');
      return;
    }
    const lineItems = lines
      .map((l) => ({
        title: l.title.trim(),
        laborDollars: Number(l.laborDollars) || 0,
        partsDollars: Number(l.partsDollars) || 0,
      }))
      .filter((l) => l.title && l.laborDollars + l.partsDollars > 0);

    if (!lineItems.length) {
      setMessage('Add labor/parts lines for the agreed repair price, or tap Diagnostic only / No-show.');
      return;
    }

    if (salesTaxDollars > 0) {
      lineItems.push({
        title: 'Texas Sales Tax (8.25% on parts)',
        laborDollars: 0,
        partsDollars: salesTaxDollars,
      });
    }

    setBusy(true);
    setMessage(null);
    try {
      const result = await captureBookingPayment(activeJob.referenceCode, {
        mode: 'charge',
        lineItems,
        techNotes,
        customerAgreedOnSite: true,
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
      await sendReceiptSms(activeJob, result.capturedAmountDollars ?? chargeTotal, 'charge', {
        lines: lineItems,
        diagnosticDollars: holdDollars,
        salesTaxDollars,
      });
      finishJob();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Charge failed');
      setBusy(false);
    }
  };

  const handleDiagnosticOnly = async () => {
    if (!activeJob) return;
    if (!confirm('Charge the $85 diagnostic only and close the job?')) return;
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
      await sendReceiptSms(activeJob, result.capturedAmountDollars ?? 100, 'diagnostic_only');
      finishJob();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Diagnostic charge failed');
      setBusy(false);
    }
  };

  const handleNoShow = async () => {
    if (!activeJob) return;
    if (!confirm('Customer no-show? Capture the $85 diagnostic hold and close the job.')) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await captureBookingPayment(activeJob.referenceCode, {
        mode: 'no_show',
      });
      setJobPhase('complete');
      setMessage(
        `No-show $${result.capturedAmountDollars?.toFixed(2)} charged — 70% share $${result.techPayoutDollars?.toFixed(2)}`
      );
      await sendReceiptSms(activeJob, result.capturedAmountDollars ?? 100, 'no_show');
      finishJob();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'No-show charge failed');
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

  const renderAvailableCard = (job: DispatchBooking) => {
    const match = specialtyMatchHint(mySpecialties, job.services);
    return (
      <div key={job.id} className="rounded-xl border border-white/10 bg-[#12141c] p-3 space-y-2">
        <div className="flex justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-white">{job.customer}</p>
              {job.phone && (
                <a
                  href={`tel:${job.phone}`}
                  className="text-[11px] font-semibold text-orange-400 hover:underline flex items-center gap-1"
                >
                  <Phone className="w-3 h-3" />
                  {job.phone}
                </a>
              )}
            </div>
            <p className="text-[11px] text-slate-400">{job.vehicle}</p>
            {job.preferredDate && (
              <p className="text-[10px] text-slate-500">Preferred: {job.preferredDate}</p>
            )}
            <p className="text-[10px] uppercase font-bold text-slate-500 mt-1">Customer address</p>
            <p className="text-[11px] text-slate-300">{job.address}</p>
            <p className="text-[11px] text-slate-500">{job.services.join(' · ')}</p>
            {match.chips.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {match.chips.map((c) => (
                  <span
                    key={c}
                    className="text-[10px] font-bold text-orange-300 bg-orange-500/15 px-2 py-0.5 rounded"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
            {match.hint && <p className="text-[10px] text-emerald-400/90 mt-1">{match.hint}</p>}
          </div>
          <span className="text-[10px] text-amber-400 font-bold shrink-0">$85 hold</span>
        </div>
        <div className="flex gap-2">
          {job.phone && (
            <a
              href={`tel:${job.phone}`}
              className="px-3 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              title="Call Customer"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call</span>
            </a>
          )}
          {job.phone && (
            <a
              href={`sms:${job.phone}?body=${encodeURIComponent(
                `Hi ${job.customer || 'there'}, this is your Adaptivity technician regarding your service request.`
              )}`}
              className="px-3 py-2.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              title="Text Customer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Text</span>
            </a>
          )}
          <button
            type="button"
            onClick={() => openNavigate(job.address)}
            className="flex-1 py-2.5 bg-blue-700 hover:bg-blue-600 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-colors"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Navigate</span>
          </button>
          {(!job.mechanicId || job.status === 'UNASSIGNED') && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleClaim(job)}
              className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-xl text-xs font-bold text-white transition-colors"
            >
              {busy ? 'Claiming…' : 'Claim job'}
            </button>
          )}
        </div>
        {job.status !== 'UNASSIGNED' && job.mechanicId && (
          <p className="text-[10px] text-orange-400 font-bold uppercase">{job.status.replace('_', ' ')}</p>
        )}
      </div>
    );
  };

  if (loading) return <p className="text-xs text-slate-500">Loading dispatch board…</p>;

  return (
    <div className="space-y-4">
      {message && (
        <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
          {message}
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          {(
            [
              ['today', `Today (${todayJobs.length})`],
              ['available', `Available (${available.length})`],
              ['active', 'Active'],
            ] as const
          ).map(([f, label]) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors ${
                filter === f ? 'bg-orange-500 text-white' : 'bg-white/5 text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void loadJobs()}
          disabled={isRefreshing}
          className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold flex items-center gap-1.5 border border-white/10 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-400' : 'text-slate-400'}`} />
          <span>Refresh</span>
        </button>
      </div>

      {filter === 'today' && (
        <div className="space-y-2">
          <p className="text-[11px] text-slate-400 font-bold uppercase">
            Today’s route — preferred today or in progress
          </p>
          {todayJobs.length === 0 && (
            <p className="text-xs text-slate-500">No jobs scheduled for today.</p>
          )}
          {todayJobs.map((job) => renderAvailableCard(job))}
        </div>
      )}

      {filter === 'available' && (
        <div className="space-y-2">
          {available.length === 0 && (
            <p className="text-xs text-slate-500">No open jobs matching your specialties.</p>
          )}
          {available.map((job) => renderAvailableCard(job))}
        </div>
      )}

      {filter === 'active' && activeJob && (
        <div className="rounded-xl border border-orange-500/30 bg-[#12141c] p-4 space-y-3">
          <div className="space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-base font-extrabold text-white">{activeJob.customer}</p>
                {activeJob.phone ? (
                  <a
                    href={`tel:${activeJob.phone}`}
                    className="text-xs font-bold text-orange-400 hover:underline flex items-center gap-1.5 mt-0.5"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{activeJob.phone}</span>
                  </a>
                ) : (
                  <p className="text-xs text-slate-500 italic mt-0.5">No phone on file</p>
                )}
              </div>
              <span className="text-[10px] text-amber-400 font-bold px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg shrink-0">
                $85 hold on file
              </span>
            </div>

            <div className="pt-1">
              <p className="text-[10px] uppercase font-bold text-slate-500">Customer address</p>
              <p className="text-xs text-slate-300 font-medium">{activeJob.address}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{activeJob.services.join(' · ')}</p>
              <p className="text-[10px] text-amber-400/90 mt-1">
                $85 diagnostic hold on file — you set labor + parts after diagnosis.
              </p>
            </div>
          </div>

          {/* Direct 1-Tap Quick Action Buttons: Call, Text SMS, Navigate */}
          <div className="grid grid-cols-3 gap-2">
            {activeJob.phone ? (
              <a
                href={`tel:${activeJob.phone}`}
                className="py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-md transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call</span>
              </a>
            ) : (
              <button disabled className="py-2.5 bg-white/5 opacity-40 rounded-xl text-xs font-bold text-slate-400">
                No Phone
              </button>
            )}

            {activeJob.phone ? (
              <a
                href={`sms:${activeJob.phone}?body=${encodeURIComponent(
                  `Hi ${activeJob.customer || 'there'}, this is Keshawn with Adaptivity Performance. I am on my way to your location!`
                )}`}
                className="py-2.5 bg-purple-600 hover:bg-purple-500 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-md transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Text SMS</span>
              </a>
            ) : (
              <button disabled className="py-2.5 bg-white/5 opacity-40 rounded-xl text-xs font-bold text-slate-400">
                No SMS
              </button>
            )}

            <button
              type="button"
              onClick={() => openNavigate(activeJob.address)}
              className="py-2.5 bg-blue-700 hover:bg-blue-600 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-md transition-colors"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Navigate</span>
            </button>
          </div>

          <JobChatPanel bookingId={activeJob.id} selfId={null} title="Customer chat" />

          {jobPhase === 'en_route' && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => void textCustomerOnTheWay(activeJob)}
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

          {jobPhase !== 'complete' && (
            <button
              type="button"
              onClick={() => void handleAddJobPhoto()}
              className="w-full py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-slate-200"
            >
              Add job photo
            </button>
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

              {/* Itemized charge preview — show customer before charging */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
                <p className="text-[11px] font-bold text-emerald-300 uppercase tracking-wide">
                  Itemized charge (show customer)
                </p>
                <div className="flex justify-between gap-2 text-[11px] text-slate-300">
                  <span>Mobile diagnostic visit</span>
                  <span className="font-mono text-white shrink-0">${holdDollars.toFixed(2)}</span>
                </div>
                {lines
                  .map((l) => {
                    const labor = Number(l.laborDollars) || 0;
                    const parts = Number(l.partsDollars) || 0;
                    const title = l.title.trim();
                    if (!title || labor + parts <= 0) return null;
                    return { title, labor, parts, total: labor + parts };
                  })
                  .filter(Boolean)
                  .map((row, i) =>
                    row ? (
                      <div key={i} className="space-y-0.5">
                        <div className="flex justify-between gap-2 text-[11px] text-slate-300">
                          <span>{row.title}</span>
                          <span className="font-mono text-white shrink-0">${row.total.toFixed(2)}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 pl-1">
                          Labor ${row.labor.toFixed(2)}
                          {row.parts > 0 ? ` · Parts $${row.parts.toFixed(2)}` : ''}
                        </p>
                      </div>
                    ) : null
                  )}
                {salesTaxDollars > 0 && (
                  <div className="flex justify-between gap-2 text-[11px] text-slate-300">
                    <span>Texas Sales Tax (8.25% on parts)</span>
                    <span className="font-mono text-white shrink-0">${salesTaxDollars.toFixed(2)}</span>
                  </div>
                )}
                {repairsSubtotal <= 0 && (
                  <p className="text-[10px] text-amber-300/90">
                    Add repair lines above, or use Diagnostic only / No-show below.
                  </p>
                )}
                <div className="flex justify-between gap-2 text-xs font-bold text-white pt-1.5 border-t border-white/10">
                  <span>Total to charge</span>
                  <span className="font-mono">${chargeTotal.toFixed(2)}</span>
                </div>
                <p className="text-[10px] text-slate-500">
                  Includes ${holdDollars.toFixed(0)} diagnostic
                  {repairsSubtotal > 0 ? ` + $${repairsSubtotal.toFixed(2)} repairs` : ''}
                </p>
              </div>

              <label className="flex items-start gap-2 text-[11px] text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={customerAgreed}
                  onChange={(e) => setCustomerAgreed(e.target.checked)}
                  className="mt-0.5 rounded border-white/20"
                />
                <span>
                  Customer agreed on site to <strong className="text-white">${chargeTotal.toFixed(2)}</strong>{' '}
                  before I charge their card
                </span>
              </label>
              <button
                type="button"
                disabled={busy || !customerAgreed}
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
                Diagnostic only ($85) — no repairs
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleNoShow()}
                className="w-full py-2.5 bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs font-bold text-amber-200 disabled:opacity-60"
              >
                No-show — capture $85 hold
              </button>
            </div>
          )}

          {(jobPhase === 'on_site' || jobPhase === 'complete') && (
            <div className="space-y-2 border border-white/10 rounded-xl p-3 bg-[#0b0c10]">
              <p className="text-[11px] font-bold text-slate-300 uppercase">Parts reimbursement</p>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Amount $"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                className="w-full bg-[#12141c] border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
              />
              <input
                placeholder="Description (e.g. brake pads)"
                value={expenseDesc}
                onChange={(e) => setExpenseDesc(e.target.value)}
                className="w-full bg-[#12141c] border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={expenseBusy}
                  onClick={() => void handleSubmitExpense()}
                  className="flex-1 py-2.5 bg-white/10 rounded-xl text-xs font-bold text-white disabled:opacity-60"
                >
                  {expenseBusy ? '…' : 'Submit claim'}
                </button>
                <button
                  type="button"
                  disabled={expenseBusy}
                  onClick={() => void handleAttachReceiptAndSubmit()}
                  className="flex-1 py-2.5 bg-sky-700 rounded-xl text-xs font-bold text-white disabled:opacity-60"
                >
                  + Receipt
                </button>
              </div>
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

      {claims.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-white/10">
          <p className="text-[11px] font-bold text-slate-300 uppercase">My parts claims</p>
          {claims.slice(0, 10).map((c) => (
            <div
              key={c.id}
              className="flex justify-between gap-2 text-[11px] text-slate-400 bg-[#12141c] border border-white/5 rounded-lg px-3 py-2"
            >
              <span>
                ${(c.amountCents / 100).toFixed(2)} · {c.description}
              </span>
              <span className="font-bold text-slate-300 uppercase shrink-0">{c.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
