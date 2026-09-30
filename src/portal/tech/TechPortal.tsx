import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CircleUser, Clock, LayoutList, X } from 'lucide-react';
import type { PortalProfile } from '../portalAuth';
import { TechSettingsTab } from './TechSettingsTab';
import { ContractorAgreementGate } from './ContractorAgreementGate';
import { VehicleInsuranceDisclosureGate } from './VehicleInsuranceDisclosureGate';
import { BrandLogo } from '../../components/BrandLogo';
import { supabase } from '../../services/supabaseClient';
import { openOnTheWaySms } from '../../services/onTheWaySms';
import { shiftElapsedLabel } from '../../services/techShifts';
import { myDoneJobs, openJobs } from '../../services/techBoard';
import { computeCloseOut } from '../../services/closeOut';
import { recordJobPayment } from '../../services/jobPayments';
import type { DispatchBooking } from '../../services/techDispatch';
import { useTechJobs } from './useTechJobs';
import { DoneScreen, OpenScreen, TodayScreen, type PaymentSummary } from './TechBoard';
import { TechJobScreen } from './TechJobScreen';
import { ReceiptSender, TechPayScreen } from './TechPayScreen';
import { SquareSaleReturn } from './SquareSaleReturn';
import { clearSquareReturnFromUrl, readSquareReturn, type SquareReturn } from '../../services/squarePointOfSale';

type Tab = 'today' | 'open' | 'done' | 'me';
type View = { kind: 'job' | 'pay' | 'receipt'; id: string } | null;

type TechPortalProps = {
  profile: PortalProfile;
  onSignOut: () => void;
  adminViewAs?: 'tech';
  onSwitchAdminView?: () => void;
  /** 'settings' opens on Me; anything else on Today. */
  initialTab?: string;
};

export const TechPortal: React.FC<TechPortalProps> = ({
  profile,
  onSignOut,
  adminViewAs,
  onSwitchAdminView,
  initialTab = 'jobs',
}) => {
  const api = useTechJobs();
  const [tab, setTab] = useState<Tab>(initialTab === 'settings' ? 'me' : 'today');
  const [view, setView] = useState<View>(null);
  // Bumped when the gate captures a signature, so Me refetches its status.
  const [agreementSignedAt, setAgreementSignedAt] = useState(0);
  const [payments, setPayments] = useState<Record<string, PaymentSummary>>({});
  // Back from Square Point of Sale with a card payment (or a cancel).
  const [squareReturn, setSquareReturn] = useState<SquareReturn | null>(() => {
    const r = readSquareReturn(window.location.search);
    if (r) clearSquareReturnFromUrl();
    return r;
  });

  const jobById = useMemo(() => new Map(api.jobs.map((j) => [j.id, j])), [api.jobs]);
  const viewJob = view ? jobById.get(view.id) : undefined;
  const openCount = openJobs(api.jobs).length;
  const doneIds = useMemo(() => myDoneJobs(api.jobs, api.me).map((j) => j.id), [api.jobs, api.me]);

  useEffect(() => {
    if (!doneIds.length) return;
    void supabase
      .from('job_payments')
      .select('booking_id, total_cents, receipt_texted_at, receipt_emailed_at')
      .in('booking_id', doneIds)
      .then(({ data }) => {
        const next: Record<string, PaymentSummary> = {};
        for (const r of data ?? []) {
          next[r.booking_id as string] = {
            totalCents: r.total_cents as number,
            textedAt: (r.receipt_texted_at as string | null) ?? null,
            emailedAt: (r.receipt_emailed_at as string | null) ?? null,
          };
        }
        setPayments(next);
      });
  }, [doneIds]);

  // Each screen starts at its top: a job opened from halfway down Today
  // should not open halfway down itself.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [view?.kind, view?.id]);

  const textOnTheWay = (job: DispatchBooking) => {
    if (!job.phone) return;
    openOnTheWaySms({
      phone: job.phone,
      customerName: job.customer,
      referenceCode: job.referenceCode,
      etaMinutes: job.status === 'EN_ROUTE' ? job.etaMinutes || undefined : undefined,
      techName: profile.fullName || undefined,
    });
  };

  const noShow = async (job: DispatchBooking) => {
    if (!confirm('Customer didn’t show? This closes the job with nothing collected.')) return;
    try {
      const c = computeCloseOut({ kind: 'no_show', lines: [], diagnosticCents: 0, travelCents: 0, taxMode: 'none', partsBy: 'tech' });
      await recordJobPayment(job.id, c, { taxMode: 'none', partsBy: 'tech' });
      api.setNotice({ tone: 'ok', text: 'No-show recorded. The job is closed.' });
      setView(null);
      setTab('today');
      await api.load();
    } catch (e) {
      api.setNotice({ tone: 'warn', text: e instanceof Error ? e.message : 'Could not close the job' });
    }
  };

  const goTab = (t: Tab) => {
    setView(null);
    setTab(t);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const adminHref = `${import.meta.env.BASE_URL || '/'}admin`.replace(/\/+/g, '/');
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  let body: React.ReactNode;
  if (squareReturn) {
    body = (
      <SquareSaleReturn
        result={squareReturn}
        jobFor={(id) => jobById.get(id)}
        onClosed={() => void api.load()}
        onDone={(bookingId) => {
          setSquareReturn(null);
          if (bookingId && jobById.get(bookingId)) setView({ kind: 'pay', id: bookingId });
          else goTab('today');
        }}
      />
    );
  } else if (api.loading) {
    body = <p className="py-10 text-center text-sm text-slate-400">Loading your jobs…</p>;
  } else if (view && viewJob && view.kind === 'job') {
    body = (
      <TechJobScreen
        job={viewJob}
        api={api}
        onBack={() => setView(null)}
        onGetPaid={() => setView({ kind: 'pay', id: viewJob.id })}
        onNoShow={() => void noShow(viewJob)}
        onTextOnTheWay={() => textOnTheWay(viewJob)}
      />
    );
  } else if (view && viewJob && view.kind === 'pay') {
    body = (
      <TechPayScreen
        job={viewJob}
        onBack={() => setView({ kind: 'job', id: viewJob.id })}
        onClosed={() => void api.load()}
        onDone={() => goTab('today')}
      />
    );
  } else if (view && viewJob && view.kind === 'receipt') {
    body = (
      <div className="space-y-4 py-2">
        <h2 className="font-heading text-xl font-bold">Receipt · {viewJob.customer}</h2>
        <ReceiptSender job={viewJob} onDone={() => goTab('done')} />
      </div>
    );
  } else if (tab === 'open') {
    body = <OpenScreen api={api} onOpenJob={(id) => setView({ kind: 'job', id })} />;
  } else if (tab === 'done') {
    body = <DoneScreen api={api} payments={payments} onReceipt={(id) => setView({ kind: 'receipt', id })} />;
  } else if (tab === 'me') {
    body = null; // Me stays mounted below so its forms keep their state.
  } else {
    body = (
      <TodayScreen
        api={api}
        onOpenJob={(id) => setView({ kind: 'job', id })}
        onTextOnTheWay={textOnTheWay}
        onSeeOpen={() => goTab('open')}
      />
    );
  }

  const inFlow = Boolean(view && viewJob);
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'today', label: 'Today', icon: <Clock className="h-[22px] w-[22px]" aria-hidden="true" /> },
    { id: 'open', label: openCount ? `Open (${openCount})` : 'Open', icon: <LayoutList className="h-[22px] w-[22px]" aria-hidden="true" /> },
    { id: 'done', label: 'Done', icon: <CheckCircle2 className="h-[22px] w-[22px]" aria-hidden="true" /> },
    { id: 'me', label: 'Me', icon: <CircleUser className="h-[22px] w-[22px]" aria-hidden="true" /> },
  ];

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#0b0c10] text-slate-100">
      {adminViewAs && (
        <div className="border-b border-amber-500/30 bg-amber-950/40 px-4 py-2 text-center text-xs text-amber-100">
          Admin account — viewing as a technician
          {onSwitchAdminView && (
            <>
              {' · '}
              <button type="button" onClick={onSwitchAdminView} className="font-semibold text-orange-300 underline">
                Continue as customer instead
              </button>
            </>
          )}
          {' · '}
          <a href={adminHref} className="font-semibold text-orange-300 underline">
            Dispatch console
          </a>
        </div>
      )}

      {!inFlow && (
        <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0b0c10]/95 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <BrandLogo size={34} />
              <div className="min-w-0">
                <p className="font-heading text-[17px] font-bold leading-tight">
                  {tab === 'today' ? 'Today' : tab === 'open' ? 'Open jobs' : tab === 'done' ? 'Done' : 'Me'}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {today} · {profile.fullName || profile.email}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void api.toggleShift()}
              disabled={api.shiftBusy}
              aria-label={api.shift.onShift ? 'On shift. Tap to clock out.' : 'Off shift. Tap to clock in.'}
              className={`flex min-h-[40px] shrink-0 items-center gap-2 rounded-full border px-3 text-[13px] font-semibold disabled:opacity-60 ${
                api.shift.onShift
                  ? 'border-emerald-400/35 bg-emerald-400/10 text-emerald-200'
                  : 'border-white/15 bg-white/[0.04] text-slate-300'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${api.shift.onShift ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
              {api.shiftBusy ? 'Saving…' : api.shift.onShift ? `On shift · ${shiftElapsedLabel(api.shift.since)}` : 'Clock in'}
            </button>
          </div>
        </header>
      )}

      <main className={`mx-auto w-full max-w-2xl flex-1 px-4 ${inFlow ? '' : 'pb-28 pt-4'}`}>
        {!inFlow && (
          <div className="mb-4 space-y-3 empty:hidden">
            <ContractorAgreementGate disabled={adminViewAs === 'tech'} onSigned={() => setAgreementSignedAt(Date.now())} />
            {/* Second required document: personal vehicle insurance. It expires on
                its own schedule, when the disclosed policy runs out. */}
            <VehicleInsuranceDisclosureGate disabled={adminViewAs === 'tech'} />
          </div>
        )}
        {api.notice && (
          <div
            role="status"
            className={`mb-4 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
              api.notice.tone === 'ok' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-amber-500/30 bg-amber-500/10 text-amber-100'
            }`}
          >
            <span>{api.notice.text}</span>
            <button type="button" onClick={() => api.setNotice(null)} aria-label="Dismiss" className="-m-1 p-1 opacity-70 hover:opacity-100">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
        {body}
        <div className={tab === 'me' && !inFlow ? '' : 'hidden'} aria-hidden={tab !== 'me' || inFlow}>
          <TechSettingsTab key={agreementSignedAt} onSignOut={onSignOut} />
        </div>
      </main>

      {!inFlow && (
        <nav aria-label="Tech portal" className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.08] bg-[#0e1016] pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto flex max-w-2xl px-1.5">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => goTab(t.id)}
                aria-current={tab === t.id ? 'page' : undefined}
                className={`flex min-h-[58px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                  tab === t.id ? 'text-brand-soft' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
};
