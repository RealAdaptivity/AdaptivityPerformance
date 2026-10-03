import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, MessageSquare, Navigation, Phone } from 'lucide-react';
import type { DispatchBooking } from '../../services/techDispatch';
import { fetchJobPhotos, uploadJobPhoto, type JobPhoto } from '../../services/jobPhotos';
import { signedMediaUrls } from '../../services/bookingMediaApi';
import { JOB_STAGES, jobStage, whenLabel } from '../../services/techBoard';
import { todayISODate } from '../../services/scheduleWindows';
import { DIAGNOSTIC_FEE_DOLLARS, TRAVEL_FEE_DOLLARS } from '../../services/serviceCatalog';
import { JobChatPanel } from '../../components/JobChatPanel';
import { capClass, cardClass, directionsUrl, primaryService } from './techUi';
import type { TechJobsApi } from './useTechJobs';

type Media = { key: string; url: string; isVideo: boolean; label: string };

export const TechJobScreen: React.FC<{
  job: DispatchBooking;
  api: TechJobsApi;
  onBack: () => void;
  onGetPaid: () => void;
  onNoShow: () => void;
  onTextOnTheWay: () => void;
}> = ({ job, api, onBack, onGetPaid, onNoShow, onTextOnTheWay }) => {
  const [media, setMedia] = useState<Media[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const stage = jobStage(job.status);
  const busy = api.busyJobId === job.id;
  const diagnostic = (job.holdAmountCents ?? DIAGNOSTIC_FEE_DOLLARS * 100) / 100;
  const travel = job.locationType === 'shop' ? 0 : TRAVEL_FEE_DOLLARS;

  const loadMedia = React.useCallback(async () => {
    const [fromCustomer, photos] = await Promise.all([
      signedMediaUrls(job.mediaPaths).catch(() => []),
      fetchJobPhotos(job.id).catch((): JobPhoto[] => []),
    ]);
    setMedia([
      ...fromCustomer.map((m) => ({ key: m.path, url: m.url, isVideo: m.isVideo, label: 'From customer' })),
      ...photos.map((p) => ({ key: p.id, url: p.publicUrl, isVideo: false, label: 'Yours' })),
    ]);
  }, [job.id, job.mediaPaths]);

  useEffect(() => {
    void loadMedia();
  }, [loadMedia]);

  const addPhoto = async (file: File) => {
    setPhotoBusy(true);
    try {
      await uploadJobPhoto({ bookingId: job.id, file, kind: 'dvi' });
      await loadMedia();
    } catch (e) {
      api.setNotice({ tone: 'warn', text: e instanceof Error ? e.message : 'Photo upload failed' });
    } finally {
      setPhotoBusy(false);
    }
  };

  const release = async () => {
    if (!confirm('Release this job back to the open list for another tech?')) return;
    if (await api.release(job)) onBack();
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky top-0 z-10 -mx-4 flex items-center gap-1 border-b border-white/[0.06] bg-[#0b0c10]/95 px-2 py-1.5 backdrop-blur">
        <button type="button" onClick={onBack} aria-label="Back" className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-200 hover:bg-white/5">
          <ArrowLeft className="h-[22px] w-[22px]" aria-hidden="true" />
        </button>
        <div className="min-w-0">
          <h2 className="truncate font-heading text-base font-bold">{job.customer}</h2>
          <p className="truncate text-xs text-slate-400">
            {job.referenceCode} · {primaryService(job)}
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-4 py-4">
        <ol className="grid grid-cols-4 gap-1.5" aria-label="Job progress">
          {JOB_STAGES.map((label, i) => (
            <li key={label} className="space-y-1.5" aria-current={i === stage ? 'step' : undefined}>
              <div className={`h-1 rounded-full ${i <= stage ? 'bg-brand' : 'bg-zinc-800'}`} />
              <p className={`text-xs ${i === stage ? 'font-bold text-white' : i < stage ? 'text-slate-400' : 'text-zinc-500'}`}>{label}</p>
            </li>
          ))}
        </ol>

        <div className={`${cardClass} space-y-3 p-4`}>
          <div>
            <p className="font-heading text-xl font-bold leading-tight">{job.vehicle}</p>
            {job.vin && <p className="font-heading text-sm tracking-[0.06em] text-slate-400">VIN {job.vin}</p>}
          </div>
          {job.issueDescription && (
            <div className="rounded-xl bg-[#0b0c10] px-3.5 py-3">
              <p className={`${capClass} mb-1`}>Customer says</p>
              <p className="text-[15px] leading-relaxed">“{job.issueDescription}”</p>
            </div>
          )}
          <div>
            <p className={`${capClass} mb-1`}>{job.locationType === 'shop' ? 'Drop-off' : 'Where'}</p>
            <p className="text-[15px]">{job.address}</p>
            <p className="text-sm text-slate-400">{whenLabel(job.preferredDate, job.preferredTimeWindow, todayISODate())}</p>
            {job.customerNotes && <p className="mt-1 text-sm text-slate-300">Notes: {job.customerNotes}</p>}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {job.phone ? (
              <a href={`tel:${job.phone}`} className="flex min-h-[48px] items-center justify-center gap-2 rounded-[14px] border border-white/[0.14] font-semibold">
                <Phone className="h-[18px] w-[18px]" aria-hidden="true" /> Call
              </a>
            ) : (
              <span className="flex min-h-[48px] items-center justify-center rounded-[14px] border border-white/[0.08] text-sm text-slate-500">No phone</span>
            )}
            <button
              type="button"
              onClick={onTextOnTheWay}
              disabled={!job.phone}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-[14px] border border-white/[0.14] font-semibold disabled:opacity-40"
            >
              <MessageSquare className="h-[18px] w-[18px]" aria-hidden="true" /> Text
            </button>
            <a
              href={directionsUrl(job.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-[14px] border border-white/[0.14] font-semibold"
            >
              <Navigation className="h-[18px] w-[18px]" aria-hidden="true" /> Map
            </a>
          </div>
        </div>

        <div className={`${cardClass} space-y-3 p-4`}>
          <div className="flex items-center justify-between">
            <p className={capClass}>Photos · {media.length}</p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={photoBusy}
              className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-white/[0.14] px-3 text-sm font-semibold disabled:opacity-50"
            >
              <Camera className="h-4 w-4" aria-hidden="true" /> {photoBusy ? 'Uploading…' : 'Add'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              aria-hidden="true"
              tabIndex={-1}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void addPhoto(f);
              }}
            />
          </div>
          {media.length === 0 ? (
            <p className="text-sm text-slate-400">No photos yet.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {media.map((m) => (
                <a key={m.key} href={m.url} target="_blank" rel="noopener noreferrer" className="relative block aspect-square overflow-hidden rounded-[10px] bg-[#1f2230]">
                  {m.isVideo ? (
                    <span className="flex h-full items-center justify-center text-xs text-slate-300">Video</span>
                  ) : (
                    <img src={m.url} alt={`${m.label} photo`} className="h-full w-full object-cover" loading="lazy" />
                  )}
                </a>
              ))}
            </div>
          )}
        </div>

        <JobChatPanel bookingId={job.id} selfId={api.me} title="Customer chat" />

        <div className={`${cardClass} flex items-center justify-between gap-3 p-4`}>
          <div>
            <p className={capClass}>Due at the visit</p>
            <p className="mt-1 text-sm text-slate-300">
              ${diagnostic.toFixed(0)} diagnostic{travel ? ` + $${travel} service fee` : ''}, before any repair
            </p>
          </div>
          <p className="font-heading text-xl font-bold">${(diagnostic + travel).toFixed(0)}</p>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 space-y-2 border-t border-white/[0.06] bg-[#0b0c10] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {stage === 2 ? (
          <button type="button" onClick={onGetPaid} className="flex min-h-[56px] w-full items-center justify-center rounded-2xl bg-brand font-heading text-[17px] font-bold text-[#0b0c10]">
            Get paid &amp; close job
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void api.markArrived(job)}
            className="flex min-h-[56px] w-full items-center justify-center rounded-2xl bg-brand font-heading text-[17px] font-bold text-[#0b0c10] disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'I’ve arrived'}
          </button>
        )}
        <div className="flex justify-center gap-5 text-sm">
          <button type="button" onClick={() => void release()} className="min-h-[40px] text-slate-400 hover:text-white">
            Release job
          </button>
          {stage === 2 && (
            <button type="button" onClick={onNoShow} className="min-h-[40px] text-slate-400 hover:text-white">
              Customer no-show
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
