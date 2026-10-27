/**
 * AP Data — the shop's repair-information app (RealAdaptivity/APData):
 * confirmed fixes, trouble-code library, procedures, specs and the shop labor
 * guide. It signs in with the same staff accounts and reads the AP Data tables
 * in this Supabase project (migration 20261023204924_ap_data_repair_information).
 *
 * Served by GitHub Pages from the APData repo on its own domain.
 *
 * No imports, so the node test runner loads it directly (tests/apData.test.ts).
 */
export const AP_DATA_URL = 'https://apdatagroup.com/';

export type ApDataJob = {
  referenceCode: string;
  vin?: string | null;
  /** "2015 Ford Explorer 3.5L" as the booking stores it. */
  vehicle?: string | null;
  issueDescription?: string | null;
};

const TWO_WORD_MAKES = ['alfa romeo', 'aston martin', 'land rover', 'rolls royce', 'mercedes benz'];

/** "2015 Land Rover Range Rover Sport" → year, make, model, as far as the text says. */
export function splitVehicle(text: string | null | undefined): { year?: string; make?: string; model?: string } {
  const m = /\b((?:19|20)\d{2})\s+(.+)$/.exec(String(text ?? '').trim());
  if (!m) return {};
  const words = m[2].split(/\s+/);
  const two = words.slice(0, 2).join(' ').toLowerCase().replace(/-/g, ' ');
  const makeWords = TWO_WORD_MAKES.includes(two) ? 2 : 1;
  const make = words.slice(0, makeWords).join(' ');
  const model = words.slice(makeWords).join(' ');
  return { year: m[1], ...(make ? { make } : {}), ...(model ? { model } : {}) };
}

/** The AP Data link that opens a job: the vehicle (by VIN when there is one), the complaint, and the job reference. */
export function apDataJobUrl(job: ApDataJob): string {
  const q = new URLSearchParams({ job: job.referenceCode });
  const vin = (job.vin ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (vin.length === 17) q.set('vin', vin);
  const { year, make, model } = splitVehicle(job.vehicle);
  if (year && make && model) {
    q.set('year', year);
    q.set('make', make);
    q.set('model', model);
  }
  const issue = (job.issueDescription ?? '').trim();
  if (issue) q.set('issue', issue.slice(0, 500));
  const codes = [...new Set((issue.toUpperCase().match(/\b[PBCU][0-3][0-9A-F]{3}\b/g) ?? []))].slice(0, 20);
  if (codes.length) q.set('codes', codes.join(','));
  return `${AP_DATA_URL}#/go?${q.toString()}`;
}
