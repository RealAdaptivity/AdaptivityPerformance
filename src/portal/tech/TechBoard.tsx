import React from 'react';
import { MapPin, MessageSquare, Navigation, Phone, RefreshCw } from 'lucide-react';
import type { DispatchBooking } from '../../services/techDispatch';
import { specialtyMatchHint } from '../../services/jobSpecialtyMatch';
import { todayISODate } from '../../services/scheduleWindows';
import { isAsap, myActiveJobs, myDoneJobs, openJobs, townOf, whenLabel } from '../../services/techBoard';
import { formatCents } from '../../services/closeOut';
import type { TechJobsApi } from './useTechJobs';
import { capClass, cardClass, directionsUrl, primaryService } from './techUi';

const chip = 'inline-flex min-h-[24px] items-center rounded-full px-2.5 text-xs font-semibold';

export const ShiftBanner: React.FC<{ api: TechJobsApi }> = ({ api }) =>
  api.shift.onShift ? null : (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <p className="text-sm leading-snug text-amber-100">
        <strong className="block text-amber-200">You’re off shift</strong>
        Clock in to claim jobs.
      </p>
      <button
        type="button"
        onClick={() => void api.toggleShift()}
        disabled={api.shiftBusy}
        className="min-h-[44px] shrink-0 rounded-xl bg-emerald-500 px-4 text-sm font-bold text-[#0b0c10] disabled:opacity-60"
      >
        {api.shiftBusy ? 'Saving…' : 'Clock in'}
      </button>
    </div>
  );

/** The big card for the job the tech is on right now. */
export const NowCard: React.FC<{
  job: DispatchBooking;
  api: TechJobsApi;
  onOpen: () => void;
  onText: () => void;
}> = ({ job, api, onOpen, onText }) => {
  const onSite = job.status === 'ON_SITE';
  const busy = api.busyJobId === job.id;
  return (
    <div className="space-y-3.5 rounded-[20px] border border-brand/45 bg-[#12141c] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className={`${chip} ${onSite ? 'bg-violet-500/20 text-violet-200' : 'bg-brand/15 text-orange-200'}`}>
            {onSite ? 'On site' : 'On the way'} · {whenLabel(job.preferredDate, job.preferredTimeWindow, todayISODate())}
          </span>
          <h3 className="mt-2 font-heading text-[22px] font-bold leading-tight">{primaryService(job)}</h3>
          <p className="text-[15px] text-slate-300">{job.vehicle}</p>
        </div>
        <span className="shrink-0 font-heading text-xs text-slate-400">{job.referenceCode}</span>
      </div>
      <p className="flex items-start gap-2.5 text-[15px] leading-snug">
        <MapPin className="mt-0.5 h-[18px] w-[18px] shrink-0 text-brand-soft" aria-hidden="true" />
        <span>
          {job.address}
          <span className="block text-[13px] text-slate-400">{job.customer}</span>
        </span>
      </p>
      <div className="grid grid-cols-3 gap-2">
        <a
          href={directionsUrl(job.address)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-[14px] bg-brand text-[15px] font-bold text-[#0b0c10]"
        >
          <Navigation className="h-[18px] w-[18px]" aria-hidden="true" /> Navigate
        </a>
        {job.phone ? (
          <a
            href={`tel:${job.phone}`}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-[14px] border border-white/[0.14] text-[15px] font-semibold"
          >
            <Phone className="h-[18px] w-[18px]" aria-hidden="true" /> Call
          </a>
        ) : (
          <span className="flex min-h-[48px] items-center justify-center rounded-[14px] border border-white/[0.08] text-sm text-slate-500">No phone</span>
        )}
        <button
          type="button"
          onClick={onText}
          disabled={!job.phone}
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-[14px] border border-white/[0.14] text-[15px] font-semibold disabled:opacity-40"
        >
          <MessageSquare className="h-[18px] w-[18px]" aria-hidden="true" /> Text
        </button>
      </div>
      {onSite ? (
        <button
          type="button"
          onClick={onOpen}
          className="flex min-h-[56px] w-full items-center justify-center rounded-2xl bg-slate-100 font-heading text-[17px] font-bold text-[#0b0c10]"
        >
          Open job &amp; get paid
        </button>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void api.markArrived(job).then(onOpen)}
            className="flex min-h-[56px] items-center justify-center rounded-2xl bg-slate-100 font-heading text-[17px] font-bold text-[#0b0c10] disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'I’ve arrived'}
          </button>
          <button
            type="button"
            onClick={onOpen}
            className="min-h-[56px] rounded-2xl border border-white/[0.14] px-4 text-[15px] font-semibold"
          >
            Details
          </button>
        </div>
      )}
    </div>
  );
};

export const OpenJobCard: React.FC<{
  job: DispatchBooking;
  api: TechJobsApi;
  onClaimed: (job: DispatchBooking) => void;
}> = ({ job, api, onClaimed }) => {
  const match = specialtyMatchHint(api.specialties, job.services);
  const mine = match.matchedLabels.length === match.chips.length;
  const busy = api.busyJobId === job.id;
  const town = townOf(job.address);
  return (
    <div className={`${cardClass} flex items-center gap-3 p-3.5 ${mine ? '' : 'opacity-80'}`}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap gap-1.5">
          <span className={`${chip} ${isAsap(job) ? 'bg-red-500/15 text-red-200' : 'bg-white/[0.06] text-slate-300'}`}>
            {whenLabel(job.preferredDate, job.preferredTimeWindow, todayISODate())}
          </span>
          {mine ? (
            <span className={`${chip} bg-emerald-500/12 text-emerald-200`}>Your specialty</span>
          ) : (
            <span className={`${chip} bg-amber-500/15 text-amber-200`}>Needs {match.chips.join(', ')}</span>
          )}
        </div>
        <p className="mt-1.5 truncate text-base font-semibold">{primaryService(job)}</p>
        <p className="truncate text-[13px] text-slate-400">
          {job.vehicle}
          {town ? ` · ${town}` : ''}
          {job.locationType === 'shop' ? ' · shop drop-off' : ''}
        </p>
      </div>
      <button
        type="button"
        disabled={busy || !api.shift.onShift}
        onClick={() => void api.claim(job).then((ok) => ok && onClaimed(job))}
        className={`min-h-[48px] min-w-[84px] shrink-0 rounded-[14px] text-[15px] font-bold disabled:opacity-40 ${
          mine ? 'bg-brand text-[#0b0c10]' : 'border border-white/[0.14] text-slate-100'
        }`}
      >
        {busy ? '…' : 'Claim'}
      </button>
    </div>
  );
};

export const TodayScreen: React.FC<{
  api: TechJobsApi;
  onOpenJob: (id: string) => void;
  onTextOnTheWay: (job: DispatchBooking) => void;
  onSeeOpen: () => void;
}> = ({ api, onOpenJob, onTextOnTheWay, onSeeOpen }) => {
  const active = myActiveJobs(api.jobs, api.me);
  const open = openJobs(api.jobs);
  const [now, ...later] = active;
  return (
    <div className="space-y-5">
      <ShiftBanner api={api} />
      <section className="space-y-2.5" aria-labelledby="now-heading">
        <h2 id="now-heading" className={capClass}>
          Now
        </h2>
        {now ? (
          <NowCard job={now} api={api} onOpen={() => onOpenJob(now.id)} onText={() => onTextOnTheWay(now)} />
        ) : (
          <div className={`${cardClass} p-5 text-[15px] text-slate-300`}>
            No job in progress. {open.length ? 'Claim one below.' : 'New jobs show up here and by text.'}
          </div>
        )}
      </section>

      {later.length > 0 && (
        <section className="space-y-2.5" aria-labelledby="next-heading">
          <h2 id="next-heading" className={capClass}>
            Also yours · {later.length}
          </h2>
          {later.map((j) => (
            <button
              key={j.id}
              type="button"
              onClick={() => onOpenJob(j.id)}
              className={`${cardClass} flex w-full items-center justify-between gap-3 p-3.5 text-left`}
            >
              <span className="min-w-0">
                <span className="block truncate text-base font-semibold">{primaryService(j)}</span>
                <span className="block truncate text-[13px] text-slate-400">
                  {whenLabel(j.preferredDate, j.preferredTimeWindow, todayISODate())} · {townOf(j.address) || j.address}
                </span>
              </span>
              <span className="text-sm font-semibold text-brand-soft">Open</span>
            </button>
          ))}
        </section>
      )}

      <section className="space-y-2.5" aria-labelledby="open-heading">
        <div className="flex items-baseline justify-between">
          <h2 id="open-heading" className={capClass}>
            Open jobs · {open.length}
          </h2>
          {open.length > 3 && (
            <button type="button" onClick={onSeeOpen} className="min-h-[36px] text-sm font-semibold text-brand-soft">
              See all
            </button>
          )}
        </div>
        {open.length === 0 && <p className="text-sm text-slate-400">Nothing open right now.</p>}
        {open.slice(0, 3).map((j) => (
          <OpenJobCard key={j.id} job={j} api={api} onClaimed={(job) => onOpenJob(job.id)} />
        ))}
      </section>
    </div>
  );
};

export const OpenScreen: React.FC<{ api: TechJobsApi; onOpenJob: (id: string) => void }> = ({ api, onOpenJob }) => {
  const open = openJobs(api.jobs);
  return (
    <div className="space-y-3">
      <ShiftBanner api={api} />
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-bold">Open jobs · {open.length}</h2>
        <button
          type="button"
          onClick={() => void api.load()}
          aria-label="Refresh"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-300 hover:bg-white/5"
        >
          <RefreshCw className={`h-5 w-5 ${api.refreshing ? 'animate-spin text-brand-soft' : ''}`} aria-hidden="true" />
        </button>
      </div>
      {open.length === 0 && <p className="text-sm text-slate-400">Nothing open right now. You’ll get a text when a job comes in.</p>}
      {open.map((j) => (
        <OpenJobCard key={j.id} job={j} api={api} onClaimed={(job) => onOpenJob(job.id)} />
      ))}
    </div>
  );
};

export type PaymentSummary = { totalCents: number; textedAt: string | null; emailedAt: string | null };

export const DoneScreen: React.FC<{
  api: TechJobsApi;
  payments: Record<string, PaymentSummary>;
  onReceipt: (id: string) => void;
}> = ({ api, payments, onReceipt }) => {
  const done = myDoneJobs(api.jobs, api.me);
  return (
    <div className="space-y-3">
      <h2 className="font-heading text-xl font-bold">Done · {done.length}</h2>
      {done.length === 0 && <p className="text-sm text-slate-400">Jobs you close show up here.</p>}
      {done.map((j) => {
        const p = payments[j.id];
        const sent = p && (p.textedAt || p.emailedAt);
        return (
          <div key={j.id} className={`${cardClass} flex items-center gap-3 p-3.5`}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold">{primaryService(j)}</p>
              <p className="truncate text-[13px] text-slate-400">
                {j.customer} · {whenLabel(j.preferredDate, null, todayISODate())}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {p ? (sent ? `Receipt sent${p.textedAt ? ' by text' : ''}${p.textedAt && p.emailedAt ? ' and' : ''}${p.emailedAt ? ' by email' : ''}` : 'Receipt not sent yet') : ''}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-heading text-lg font-bold">{p ? formatCents(p.totalCents) : `$${j.total.toFixed(2)}`}</p>
              {p && p.totalCents > 0 && (
                <button type="button" onClick={() => onReceipt(j.id)} className="min-h-[36px] text-sm font-semibold text-brand-soft">
                  {sent ? 'Resend receipt' : 'Send receipt'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
