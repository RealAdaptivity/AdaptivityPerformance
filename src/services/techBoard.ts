/**
 * How the tech portal sorts and labels jobs. No imports, so the node test
 * runner can load it; callers pass plain job objects.
 */

export type BoardJob = {
  id: string;
  status: string;
  mechanicId: string | null;
  preferredDate: string | null;
  preferredTimeWindow: string | null;
  createdAt: string;
};

const IN_PROGRESS = new Set(['EN_ROUTE', 'ON_SITE']);

export function isOpenJob(j: BoardJob): boolean {
  return j.status === 'UNASSIGNED' && !j.mechanicId;
}

export function isAsap(j: Pick<BoardJob, 'preferredTimeWindow'>): boolean {
  return /asap/i.test(j.preferredTimeWindow ?? '');
}

/** The tech's jobs in progress: the one they are standing at first, then by day. */
export function myActiveJobs<T extends BoardJob>(jobs: T[], me: string | null): T[] {
  if (!me) return [];
  return jobs
    .filter((j) => j.mechanicId === me && IN_PROGRESS.has(j.status))
    .sort((a, b) => {
      if ((a.status === 'ON_SITE') !== (b.status === 'ON_SITE')) return a.status === 'ON_SITE' ? -1 : 1;
      return byWhen(a, b);
    });
}

/** Open jobs: ASAP first, then soonest day, then oldest request. */
export function openJobs<T extends BoardJob>(jobs: T[]): T[] {
  return jobs.filter(isOpenJob).sort(byWhen);
}

export function myDoneJobs<T extends BoardJob>(jobs: T[], me: string | null): T[] {
  if (!me) return [];
  return jobs
    .filter((j) => j.mechanicId === me && j.status === 'COMPLETED')
    .sort((a, b) => (b.preferredDate ?? '').localeCompare(a.preferredDate ?? '') || b.createdAt.localeCompare(a.createdAt));
}

function byWhen(a: BoardJob, b: BoardJob): number {
  if (isAsap(a) !== isAsap(b)) return isAsap(a) ? -1 : 1;
  const da = a.preferredDate ?? '9999-12-31';
  const db = b.preferredDate ?? '9999-12-31';
  return da.localeCompare(db) || windowRank(a.preferredTimeWindow) - windowRank(b.preferredTimeWindow) || a.createdAt.localeCompare(b.createdAt);
}

function windowRank(w: string | null): number {
  const t = (w ?? '').toLowerCase();
  if (t.startsWith('morning')) return 0;
  if (t.startsWith('afternoon')) return 1;
  if (t.startsWith('evening')) return 2;
  return 3;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

/** 'Today · Morning', 'Tomorrow · Afternoon', 'Thu, Oct 1 · Evening', 'ASAP', 'Past due · Mon, Sep 28'. */
export function whenLabel(date: string | null, window: string | null, today: string): string {
  const name = (window ?? '').replace(/\s*\(.*\)\s*$/, '').trim();
  if (/asap/i.test(name)) return 'ASAP';
  let day = '';
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const long = `${DAYS[dt.getDay()]}, ${MONTHS[m - 1]} ${d}`;
    if (date === today) day = 'Today';
    else if (date === addDays(today, 1)) day = 'Tomorrow';
    else if (date < today) day = `Past due · ${long}`;
    else day = long;
  }
  return [day, name].filter(Boolean).join(' · ') || 'No time given';
}

/** 'Northlake' from '1234 Canyon Falls Dr, Northlake, TX 76226'. */
export function townOf(address: string): string {
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  const stateAt = parts.findIndex((p) => /^TX\b/i.test(p));
  const town = stateAt > 0 ? parts[stateAt - 1] : parts.length >= 3 ? parts[parts.length - 2] : '';
  return town && !/\d/.test(town) ? town : '';
}

export type JobStage = 0 | 1 | 2 | 3;
export const JOB_STAGES = ['Claimed', 'On the way', 'On site', 'Paid'] as const;

export function jobStage(status: string): JobStage {
  if (status === 'COMPLETED') return 3;
  if (status === 'ON_SITE') return 2;
  if (status === 'EN_ROUTE') return 1;
  return 0;
}
