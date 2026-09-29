/**
 * Shape the dispatch board: which column a job belongs in, and what each tech
 * is actually doing right now.
 *
 * Deliberately free of any Supabase import so the node test runner can load it
 * directly. Everything here is a pure function over plain data, and the types
 * are structural rather than the real `Booking` / `DispatchTech` — those carry
 * a React and a Supabase import respectively, and neither belongs in a rules
 * module. The console passes its real objects in and gets its real objects
 * back, because every function is generic over the caller's type.
 */

/** The fields the board reads off a booking. `Booking` satisfies this. */
export type BoardBooking = {
  id: string;
  status: string;
  claimedBy?: { id: string; name: string } | null;
  /** ISO timestamp. Preferred — `dateCreated` is a localised display string. */
  createdAtIso?: string;
  dateCreated?: string;
};

/** The fields the board reads off a tech. `DispatchTech` satisfies this. */
export type BoardTech = {
  id: string;
  name: string;
  /** Open shift start, or null when clocked out. */
  onShiftSince: string | null;
};

export type BoardColumnId = 'needs_tech' | 'on_the_way' | 'on_site' | 'done' | 'canceled';

export type BoardColumn = {
  id: BoardColumnId;
  /** What the column is called on the board. */
  label: string;
  /** Shorter, for the phone's status switcher. */
  shortLabel: string;
  /** The single job status that lands in this column. */
  status: string;
  /** Newest first (finished work) rather than oldest first (work to do). */
  newestFirst: boolean;
};

/**
 * One column per status, in the order a job travels through them. Canceled is
 * last and off by default: a cancelled job is not dispatch work, and with a
 * third of this shop's bookings cancelled it would crowd out the live columns.
 */
export const BOARD_COLUMNS: BoardColumn[] = [
  { id: 'needs_tech', label: 'Needs a tech', shortLabel: 'Needs a tech', status: 'UNASSIGNED', newestFirst: false },
  { id: 'on_the_way', label: 'On the way', shortLabel: 'On the way', status: 'EN_ROUTE', newestFirst: false },
  { id: 'on_site', label: 'On site', shortLabel: 'On site', status: 'ON_SITE', newestFirst: false },
  { id: 'done', label: 'Done', shortLabel: 'Done', status: 'COMPLETED', newestFirst: true },
  { id: 'canceled', label: 'Canceled', shortLabel: 'Canceled', status: 'CANCELED', newestFirst: true },
];

/** The columns that are always on the board. */
export const LIVE_COLUMN_IDS: BoardColumnId[] = ['needs_tech', 'on_the_way', 'on_site', 'done'];

/**
 * Finished columns grow without bound as the business runs, and a column you
 * have to scroll past is a column you stop reading. Show the most recent and
 * say how many are behind them.
 */
export const FINISHED_COLUMN_LIMIT = 15;

/** Statuses that take a job off the board's live columns. */
const TERMINAL_STATUSES = new Set(['COMPLETED', 'CANCELED']);

/**
 * Sort key for a booking. `createdAtIso` is a real ISO timestamp; `dateCreated`
 * is a `toLocaleString('en-US')` display string, which Date.parse handles on
 * every engine we run but which we only reach for when the ISO field is absent.
 * Anything unparseable sorts as 0 rather than NaN, which would make the
 * comparator inconsistent and leave the column in arbitrary order.
 */
export function bookingSortTime(booking: BoardBooking): number {
  const raw = booking.createdAtIso || booking.dateCreated;
  if (!raw) return 0;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

export type BoardGroup<T extends BoardBooking> = {
  column: BoardColumn;
  /** The jobs to draw, already sorted and capped. */
  jobs: T[];
  /** Every job in this column, before the cap. */
  total: number;
  /** How many the cap hid. 0 when nothing was hidden. */
  hidden: number;
};

/**
 * Split bookings into board columns.
 *
 * A status we do not have a column for (a new one added later, or a row that
 * arrives with something unexpected) is not silently dropped — it lands in
 * `unplaced` so the console can say so rather than quietly losing a job.
 */
export function groupBookingsForBoard<T extends BoardBooking>(
  bookings: T[],
  options: { columns?: BoardColumnId[]; limit?: number } = {}
): { groups: BoardGroup<T>[]; unplaced: T[] } {
  const wanted = options.columns ?? LIVE_COLUMN_IDS;
  const limit = options.limit ?? FINISHED_COLUMN_LIMIT;
  const columns = BOARD_COLUMNS.filter((c) => wanted.includes(c.id));

  const byStatus = new Map<string, T[]>();
  for (const booking of bookings) {
    const bucket = byStatus.get(booking.status);
    if (bucket) bucket.push(booking);
    else byStatus.set(booking.status, [booking]);
  }

  const groups = columns.map((column) => {
    const all = (byStatus.get(column.status) ?? []).slice();
    all.sort((a, b) =>
      column.newestFirst
        ? bookingSortTime(b) - bookingSortTime(a)
        : bookingSortTime(a) - bookingSortTime(b)
    );
    // Only finished columns are capped; work still to do is never hidden.
    const capped = column.newestFirst ? all.slice(0, limit) : all;
    return { column, jobs: capped, total: all.length, hidden: all.length - capped.length };
  });

  const placed = new Set(columns.map((c) => c.status));
  const unplaced = bookings.filter((b) => !placed.has(b.status));

  return { groups, unplaced };
}

/**
 * The column a narrow screen should show.
 *
 * The chosen column can stop existing under the user: switching the canceled
 * column off while it is the one on screen would otherwise leave every column
 * hidden and the phone showing an empty board. Fall back to the first column
 * rather than to nothing.
 */
export function resolveActiveColumn(
  groups: { column: BoardColumn }[],
  wanted: BoardColumnId
): BoardColumnId {
  if (groups.some((g) => g.column.id === wanted)) return wanted;
  return groups[0]?.column.id ?? 'needs_tech';
}

export type TechBoardState<T extends BoardBooking> = {
  tech: BoardTech;
  /**
   * `on_job` — has a live job right now.
   * `free` — clocked in with nothing live.
   * `off_shift` — clocked out, so cannot claim.
   */
  kind: 'on_job' | 'free' | 'off_shift';
  /** The job they are on, when there is one. */
  activeJob: T | null;
  /** Assigned jobs that have not finished, including the active one. */
  openJobs: number;
};

/**
 * What a tech is doing, from the jobs themselves rather than a status field
 * somebody has to remember to update.
 *
 * A live job outranks the shift clock on purpose: a tech who forgot to clock in
 * but is standing on a driveway is on a job, and showing them as off shift
 * while their job sits in "On site" would just be the board contradicting
 * itself. Off shift still means "cannot claim", which is what it is for.
 */
export function techBoardState<T extends BoardBooking>(
  tech: BoardTech,
  bookings: T[]
): TechBoardState<T> {
  const mine = bookings.filter(
    (b) => b.claimedBy?.id === tech.id && !TERMINAL_STATUSES.has(b.status)
  );
  // On site beats en route: it is the one they are physically at.
  const activeJob =
    mine.find((b) => b.status === 'ON_SITE') ?? mine.find((b) => b.status === 'EN_ROUTE') ?? null;

  const kind: TechBoardState<T>['kind'] = activeJob
    ? 'on_job'
    : tech.onShiftSince
      ? 'free'
      : 'off_shift';

  return { tech, kind, activeJob, openJobs: mine.length };
}

/** Every tech's state, in the order the caller supplied them. */
export function techBoardStates<T extends BoardBooking>(
  techs: BoardTech[],
  bookings: T[]
): TechBoardState<T>[] {
  return techs.map((tech) => techBoardState(tech, bookings));
}
