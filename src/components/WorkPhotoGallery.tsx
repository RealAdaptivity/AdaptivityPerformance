import React from 'react';
import {
  WORK_JOBS,
  WORK_PHOTO_ASPECT,
  workPhotoSrc,
  workPhotoSrcSet,
  type WorkJob,
  type WorkPhoto,
} from '../site/workPhotos';

const BASE = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
const WIDTH = 480;
const HEIGHT = (WIDTH * WORK_PHOTO_ASPECT.height) / WORK_PHOTO_ASPECT.width;

/* They sit below the fold, so they load lazily and never slow down the first
   screen. */
const PhotoTile: React.FC<{ photo: WorkPhoto; wideWidthPx: number; children: React.ReactNode }> = ({
  photo,
  wideWidthPx,
  children,
}) => (
  <li className="w-[72%] shrink-0 snap-start sm:w-auto">
    <figure>
      <div className="aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-[#12141c]">
        <img
          src={workPhotoSrc(photo.slug, WIDTH, BASE)}
          srcSet={workPhotoSrcSet(photo.slug, BASE)}
          sizes={`(min-width: 1024px) ${wideWidthPx}px, (min-width: 640px) 31vw, 72vw`}
          width={WIDTH}
          height={HEIGHT}
          alt={photo.alt}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      </div>
      <figcaption className="mt-2">{children}</figcaption>
    </figure>
  </li>
);

/** A row you swipe through on a phone; a grid from tablet width up. */
const PhotoRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <ul
    className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:scroll-px-0 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-5"
    aria-label={label}
  >
    {children}
  </ul>
);

const captionClass = 'block text-[13px] leading-snug text-slate-400';

const JobPhotos: React.FC<{ job: WorkJob; wideWidthPx: number }> = ({ job, wideWidthPx }) => (
  <PhotoRow label={`Photos: ${job.title}`}>
    {job.photos.map((p) => (
      <PhotoTile key={p.slug} photo={p} wideWidthPx={wideWidthPx}>
        <span className={captionClass}>{p.caption}</span>
      </PhotoTile>
    ))}
  </PhotoRow>
);

/** Every photo, grouped by job, for the About page. */
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

/** How many jobs the homepage shows: one row on desktop. */
const COVERS_SHOWN = 5;

/** One photo per job, newest first, in a single row, for the homepage: enough
 *  to show the range of work without pushing the booking button further down. */
export const WorkJobCovers: React.FC = () => (
  <PhotoRow label="Recent jobs">
    {WORK_JOBS.slice(0, COVERS_SHOWN).map((job) => (
      <PhotoTile key={job.slug} photo={job.photos[0]} wideWidthPx={240}>
        <span className="block text-[14px] font-semibold leading-snug text-white">{job.title}</span>
        <span className={`${captionClass} mt-0.5`}>{job.summary}</span>
      </PhotoTile>
    ))}
  </PhotoRow>
);
