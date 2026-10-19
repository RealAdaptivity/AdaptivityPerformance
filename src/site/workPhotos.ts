/** Photos from real jobs, taken by our technicians. No stock photos: every
 *  picture on the site is our own work.
 *
 *  Files live in public/work as `<slug>-480.webp` and `<slug>-960.webp`, 3:4
 *  portrait, location and camera data stripped. tests/workPhotos.test.ts
 *  checks both sizes exist for every entry.
 *
 *  No imports, so the test can load it with node. */

export type WorkPhoto = {
  slug: string;
  /** What the picture shows, for screen readers. */
  alt: string;
  /** One line under the picture. */
  caption: string;
};

export const WORK_PHOTO_WIDTHS = [480, 960] as const;

/** Stored at 3:4, so width and height can be set and nothing shifts while
 *  they load. */
export const WORK_PHOTO_ASPECT = { width: 3, height: 4 } as const;

export const WORK_PHOTOS: WorkPhoto[] = [
  {
    slug: 'techs-cleaning-covers',
    alt: 'Two Adaptivity technicians in a customer’s driveway, one wiping down an engine timing cover on a spare tire and one cleaning a valve cover, with the SUV on jack stands beside them',
    caption: 'Cleaning the timing cover and valve cover before they go back on, in the customer’s driveway.',
  },
  {
    slug: 'timing-chains',
    alt: 'Close-up of an engine with the front cover off, showing the timing chains, cam phasers and guides',
    caption: 'Front cover off: timing chains, guides and cam phasers.',
  },
  {
    slug: 'camshafts-exposed',
    alt: 'Engine bay with both valve covers removed and the intake ports packed with shop towels, a technician’s hand holding a spray bottle',
    caption: 'Valve covers off, intake ports packed with towels so nothing falls in.',
  },
  {
    slug: 'front-reassembled',
    alt: 'Front of the engine reassembled, with the alternator, belt pulleys and throttle body back in place',
    caption: 'Back together: alternator, pulleys and throttle body.',
  },
  {
    slug: 'new-pulley',
    alt: 'Close-up of a clean black ribbed pulley installed on the engine',
    caption: 'A new pulley, bolted in.',
  },
];

/** '/work/timing-chains-480.webp', under the site's base path. */
export function workPhotoSrc(slug: string, width: number, base = '/'): string {
  return `${base.replace(/\/?$/, '/')}work/${slug}-${width}.webp`;
}

/** The srcset for one photo, every stored width. */
export function workPhotoSrcSet(slug: string, base = '/'): string {
  return WORK_PHOTO_WIDTHS.map((w) => `${workPhotoSrc(slug, w, base)} ${w}w`).join(', ');
}
