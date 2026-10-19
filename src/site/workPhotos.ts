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

export type WorkJob = {
  slug: string;
  /** The job, as a short heading. */
  title: string;
  /** One sentence about it. */
  summary: string;
  photos: WorkPhoto[];
  /** Always one of the homepage covers, however many newer jobs there are. */
  pinnedToHomepage?: boolean;
};

/** Most recently added first. A customer's license plate is blurred before a
 *  photo goes in. */
export const WORK_JOBS: WorkJob[] = [
  {
    slug: 'pentastar-oil-pump-diagnostic',
    title: 'Oil pump diagnostics on a Pentastar V6',
    summary: 'Oil pan off and the pickup checked, right where the car sits.',
    photos: [
      {
        slug: 'pentastar-oil-pickup',
        alt: 'A technician’s hands under a Pentastar V6 with the oil pan removed, holding the oil pickup tube and its screen',
        caption: 'Pan off: checking the oil pickup tube and its screen.',
      },
      {
        slug: 'pentastar-oil-pump',
        alt: 'A technician reaching up into the open bottom of the Pentastar engine, past the oil pickup tube, toward the oil pump',
        caption: 'Reaching in past the pickup to check the oil pump.',
      },
    ],
  },
  {
    slug: 'honda-crv-suspension-diagnostic',
    title: 'Suspension diagnostics on a Honda CR-V',
    summary: 'Checked in a business parking lot, on a rainy day.',
    photos: [
      {
        slug: 'crv-hood-up',
        alt: 'A blue Honda CR-V with the hood up in a business parking lot on a wet, overcast day, a technician kneeling at the front wheel. The license plate is blurred.',
        caption: 'Hood up in the parking lot, rain and all.',
      },
      {
        slug: 'crv-wheel-well',
        alt: 'An Adaptivity technician crouched in the front wheel well of the CR-V, with the car up on a jack stand',
        caption: 'Checking the front suspension from the wheel well.',
      },
      {
        slug: 'crv-bushing',
        alt: 'Close-up of a rubber suspension bushing in its mount under the CR-V',
        caption: 'A suspension bushing, up close.',
      },
      {
        slug: 'crv-steering-linkage',
        alt: 'Close-up under the CR-V of the steering linkage, with its rubber boot and tie rod end',
        caption: 'Inspecting the steering linkage and its boot.',
      },
    ],
  },
  {
    slug: 'semi-fuel-leak-diagnostic',
    // A non-breaking hyphen keeps "18-wheeler" on one line on a phone.
    title: 'Fuel leak diagnostic on a diesel 18\u2011wheeler',
    summary: 'We work on diesels, semis included. This leak was traced on site.',
    photos: [
      {
        slug: 'semi-fuel-leak',
        alt: 'The fuel system on a diesel semi truck, with a red push-lock primer pump and a yellow arrow drawn on the photo pointing at the leak beside it',
        caption: 'The arrow marks the leak, next to the fuel primer pump.',
      },
    ],
  },
  {
    slug: 'thunderbird-bond-battery-test',
    title: 'Battery test on a 2003 Thunderbird James Bond Edition',
    summary: 'Battery tested and charged where the car was parked.',
    photos: [
      {
        slug: 'thunderbird-battery-test',
        alt: 'A Viking battery tester reading 12.77 volts, clipped to a Super Start Platinum AGM battery',
        caption: 'The tester reads 12.77 V on the AGM battery.',
      },
      {
        slug: 'thunderbird-battery-charger',
        alt: 'A battery charger connected to the battery in the trunk of the Thunderbird, beside the spare wheel well',
        caption: 'Charging the battery, which sits in the trunk on this car.',
      },
      {
        slug: 'thunderbird-engine-bay',
        alt: 'Engine bay of the 2003 Ford Thunderbird with the hood up, showing the V8, intake and throttle body',
        caption: 'Under the hood of the Bond Edition Thunderbird.',
      },
    ],
  },
  {
    slug: 'range-rover-overfinch-air-struts',
    title: 'Air strut job on a one-of-one Range Rover Overfinch',
    summary: 'A new front air strut, fitted in the customer’s driveway.',
    photos: [
      {
        slug: 'range-rover-overfinch',
        alt: 'A supercharged Range Rover with an Overfinch carbon grille, hood up in a driveway, an Adaptivity technician working at the front wheel. The license plate is blurred.',
        caption: 'The Overfinch Range Rover, hood up in the driveway.',
      },
      {
        slug: 'range-rover-air-strut',
        alt: 'Close-up of a new black front air strut installed in the wheel well, between the upper control arm and the steering knuckle',
        caption: 'The new front air strut, installed.',
      },
    ],
  },
  {
    slug: 'engine-front-teardown',
    // The photo of two of our techs at work: kept on the homepage.
    pinnedToHomepage: true,
    title: 'Engine front teardown in the driveway',
    summary: 'The front of the engine came apart and went back together without the car leaving the driveway.',
    photos: [
      {
        slug: 'techs-cleaning-covers',
        alt: 'Two Adaptivity technicians in a customer’s driveway, one wiping down an engine timing cover on a spare tire and one cleaning a valve cover, with the SUV on jack stands beside them',
        caption: 'Cleaning the timing cover and valve cover before they go back on.',
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
    ],
  },
];

/** How many jobs the homepage shows: one row on desktop. */
export const HOMEPAGE_JOBS_SHOWN = 5;

/** The homepage covers: the newest jobs, plus any pinned one, in list order,
 *  never more than `max`. */
export function homepageJobs(jobs: WorkJob[] = WORK_JOBS, max = HOMEPAGE_JOBS_SHOWN): WorkJob[] {
  const pinned = jobs.filter((j) => j.pinnedToHomepage).slice(0, max);
  const newest = jobs.filter((j) => !j.pinnedToHomepage).slice(0, max - pinned.length);
  const keep = new Set([...newest, ...pinned]);
  return jobs.filter((j) => keep.has(j));
}

/** Every photo, across all jobs. */
export const WORK_PHOTOS: WorkPhoto[] = WORK_JOBS.flatMap((j) => j.photos);

/** '/work/timing-chains-480.webp', under the site's base path. */
export function workPhotoSrc(slug: string, width: number, base = '/'): string {
  return `${base.replace(/\/?$/, '/')}work/${slug}-${width}.webp`;
}

/** The srcset for one photo, every stored width. */
export function workPhotoSrcSet(slug: string, base = '/'): string {
  return WORK_PHOTO_WIDTHS.map((w) => `${workPhotoSrc(slug, w, base)} ${w}w`).join(', ');
}
