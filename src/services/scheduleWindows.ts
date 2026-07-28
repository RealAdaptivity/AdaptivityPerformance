/** Shared customer appointment windows (book + reschedule). */

export const PREFERRED_TIME_WINDOWS = [
  'Morning (8 AM - 12 PM)',
  'Afternoon (12 PM - 4 PM)',
  'Evening (4 PM - 7 PM)',
  'Emergency ASAP',
] as const;

export type PreferredTimeWindow = (typeof PREFERRED_TIME_WINDOWS)[number];

/** Clock-style slots (customer Expo app); still valid for reschedule edge. */
export const PREFERRED_TIME_SLOTS = [
  '08:00 AM',
  '10:30 AM',
  '01:00 PM',
  '03:30 PM',
  '05:30 PM',
] as const;

export function formatPreferredSchedule(
  date: string | null | undefined,
  window: string | null | undefined
): string | null {
  if (!date && !window) return null;
  if (date && window) return `${date} · ${window}`;
  return date || window || null;
}

export function todayISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
