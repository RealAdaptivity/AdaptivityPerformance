import type { DispatchBooking } from '../../services/techDispatch';

/** Shared look and small helpers for the tech portal screens. */

export const cardClass = 'rounded-[18px] border border-white/[0.08] bg-[#12141c]';
export const capClass = 'text-xs font-semibold uppercase tracking-[0.06em] text-slate-400';

export function directionsUrl(address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

export function primaryService(job: DispatchBooking): string {
  return job.services[0] || 'Service call';
}
