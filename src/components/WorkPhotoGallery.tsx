import React from 'react';
import { WORK_JOBS, WORK_PHOTO_ASPECT, workPhotoSrc, workPhotoSrcSet, type WorkJob } from '../site/workPhotos';

const BASE = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
const WIDTH = 480;
const HEIGHT = (WIDTH * WORK_PHOTO_ASPECT.height) / WORK_PHOTO_ASPECT.width;

/** One job's photos: a row you swipe through on a phone, a grid from tablet
 *  width up. */
const JobPhotos: React.FC<{ job: WorkJob; wideWidthPx: number }> = ({ job, wideWidthPx }) => (
  <ul
    className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:scroll-px-0 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-5"
    aria-label={`Photos: ${job.title}`}
  >
    {job.photos.map((p) => (
      <li key={p.slug} className="w-[72%] shrink-0 snap-start sm:w-auto">
        <figure>
          <div className="aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-[#12141c]">
            <img
              src={workPhotoSrc(p.slug, WIDTH, BASE)}
              srcSet={workPhotoSrcSet(p.slug, BASE)}
              sizes={`(min-width: 1024px) ${wideWidthPx}px, (min-width: 640px) 31vw, 72vw`}
              width={WIDTH}
              height={HEIGHT}
              alt={p.alt}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          </div>
          <figcaption className="mt-2 text-[13px] leading-snug text-slate-400">{p.caption}</figcaption>
        </figure>
      </li>
    ))}
  </ul>
);

/**
 * Photos from real jobs, grouped by job, newest first. They sit below the
 * fold, so they load lazily and never slow down the first screen.
 */
export const WorkPhotoGallery: React.FC<{
  /** Rendered size of one photo on wide screens, for the browser's srcset pick. */
  wideWidthPx?: number;
}> = ({ wideWidthPx = 240 }) => (
  <div className="space-y-8">
    {WORK_JOBS.map((job) => (
      <article key={job.slug} aria-labelledby={`job-${job.slug}`} className="space-y-3">
        <div>
          <h3 id={`job-${job.slug}`} className="text-lg font-bold text-white">
            {job.title}
          </h3>
          <p className="mt-0.5 text-sm text-slate-400">{job.summary}</p>
        </div>
        <JobPhotos job={job} wideWidthPx={wideWidthPx} />
      </article>
    ))}
  </div>
);
