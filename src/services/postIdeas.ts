/** Google Business post ideas from recent closed jobs, for the Growth tab.
 *  Built here rather than stored: the drafts the old card system wrote had
 *  an out-of-date price, and nothing writes drafts any more.
 *
 *  No customer names or street addresses, only the town. No imports, so
 *  tests/postIdeas.test.ts can load it with node. */

export type RecentJob = {
  address: string | null;
  service: string | null;
  vehicle: string | null;
};

/** 'Northlake' from '1234 Canyon Falls Dr, Northlake, TX 76226'. */
export function townFromAddress(address: string | null | undefined): string | null {
  const parts = (address ?? '').split(',').map((p) => p.trim()).filter(Boolean);
  const stateAt = parts.findIndex((p) => /^TX\b/i.test(p));
  const town = stateAt > 0 ? parts[stateAt - 1] : parts.length >= 3 ? parts[parts.length - 2] : null;
  return town && !/\d/.test(town) ? town : null;
}

/** '2015 Ford Explorer Sport' from '2015 Ford Explorer Sport · 3.5L V6'. */
function shortVehicle(vehicle: string | null | undefined): string | null {
  const v = (vehicle ?? '').split('·')[0].trim();
  return v && !/^customer vehicle$/i.test(v) ? v : null;
}

export function buildPostIdea(job: RecentJob, diagnosticDollars: number): string {
  const town = townFromAddress(job.address);
  const service = (job.service ?? '').trim().toLowerCase() || 'mobile repair';
  const vehicle = shortVehicle(job.vehicle);
  const where = town ? ` in ${town}, TX` : '';
  const what = vehicle ? `${service} on a ${vehicle}` : service;
  const tags = ['#MobileMechanic', town ? `#${town.replace(/[^A-Za-z]/g, '')}TX` : '#DFW'].join(' ');
  return `Another driveway job done${where}: ${what}. We come to you. Book a $${diagnosticDollars} mobile diagnostic at adaptivityperformance.com. ${tags}`;
}
