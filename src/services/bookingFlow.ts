/**
 * The booking form's rules, kept free of imports so the node test runner can
 * load them. The form asks one thing per screen: what you need, the vehicle,
 * when, where, and how to reach you, then a review before anything is sent.
 * Prices are passed in rather than imported for the same reason; the form
 * hands over DIAGNOSTIC_FEE_DOLLARS and TRAVEL_FEE_DOLLARS from the catalog.
 */

export type BookingStepId = 'need' | 'vehicle' | 'when' | 'where' | 'contact' | 'review';

export const BOOKING_STEPS: { id: BookingStepId; label: string; title: string }[] = [
  { id: 'need', label: 'What you need', title: 'What do you need?' },
  { id: 'vehicle', label: 'Vehicle', title: 'Your vehicle' },
  { id: 'when', label: 'When', title: 'When works?' },
  { id: 'where', label: 'Where', title: 'Where’s the car?' },
  { id: 'contact', label: 'Contact', title: 'How do we reach you?' },
  { id: 'review', label: 'Review', title: 'Look right?' },
];

/** Steps that count toward "Step N of 5"; review is the check at the end. */
export const COUNTED_STEPS = BOOKING_STEPS.length - 1;

/** The quick picks on the first screen, by catalog id. Everything else bookable
 *  is one tap further, in the full list. The ids are checked against the
 *  catalog by verify-production-ops. */
export const SERVICE_CHOICES: { id: string; label: string }[] = [
  { id: 'diagnostic', label: 'Diagnose a problem' },
  { id: 'brakes', label: 'Brakes' },
  { id: 'battery', label: 'Battery / won’t start' },
  { id: 'oil_change', label: 'Oil change' },
  { id: 'ac_service', label: 'A/C' },
  { id: 'cooling_system', label: 'Overheating' },
  { id: 'tires', label: 'Tires' },
  { id: 'suspension', label: 'Suspension' },
];

export type DayOption = {
  /** 'YYYY-MM-DD', as bookings.preferred_date stores it. */
  iso: string;
  /** 'Today', 'Tmrw', or a weekday: what fits on a small button. */
  short: string;
  dayOfMonth: number;
  /** 'Thu, Oct 1' */
  long: string;
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The next `count` days starting today, in the viewer's own calendar. Built
 *  from local date parts: `new Date('2026-10-01')` is UTC midnight, which is
 *  the day before everywhere in Texas. */
export function upcomingDays(now: Date, count = 7): DayOption[] {
  const out: DayOption[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    out.push({
      iso: isoOf(d),
      short: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : DAYS[d.getDay()],
      dayOfMonth: d.getDate(),
      long: `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`,
    });
  }
  return out;
}

/** 'Thu, Oct 1' from '2026-10-01', or null for anything that is not a real date. */
export function formatDayLong(iso: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const [y, mo, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(y, mo - 1, day);
  if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== day) return null;
  return `${DAYS[d.getDay()]}, ${MONTHS[mo - 1]} ${day}`;
}

/** 'Morning (8 AM - 12 PM)' → { name: 'Morning', hours: '8 AM – 12 PM' }. The
 *  stored value stays the full string; this only splits it for display. */
export function splitTimeWindow(window: string): { name: string; hours: string } {
  const m = /^(.*?)\s*\((.*)\)\s*$/.exec(window);
  if (!m) return { name: window, hours: /asap/i.test(window) ? 'Next available tech' : '' };
  return { name: m[1], hours: m[2].replace(/\s-\s/, ' – ') };
}

export type VisitCharges = {
  diagnostic: number;
  travel: number;
  /** What the customer pays at the visit. Nothing is taken online. */
  dueAtVisit: number;
};

/** A mobile visit pays the diagnostic plus the flat travel fee; a drop-off at a
 *  partner shop has no travel. */
export function visitCharges(
  locationType: 'mobile' | 'shop',
  fees: { diagnostic: number; travel: number }
): VisitCharges {
  const travel = locationType === 'shop' ? 0 : fees.travel;
  return { diagnostic: fees.diagnostic, travel, dueAtVisit: fees.diagnostic + travel };
}

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export function validateNeed(input: { issue: string }): FieldErrors<'issue'> {
  return input.issue.trim() ? {} : { issue: 'Tell us what it’s doing — a sentence is plenty.' };
}

export function validateWhen(input: { date: string; window: string }, today: string): FieldErrors<'date' | 'window'> {
  const errors: FieldErrors<'date' | 'window'> = {};
  if (!formatDayLong(input.date)) errors.date = 'Pick a day.';
  else if (input.date < today) errors.date = 'Pick today or a later day.';
  if (!input.window.trim()) errors.window = 'Pick a time window.';
  return errors;
}

export function validateWhere(input: { street: string; city: string; zip: string }): FieldErrors<'street' | 'city' | 'zip'> {
  const errors: FieldErrors<'street' | 'city' | 'zip'> = {};
  if (!input.street.trim()) errors.street = 'Enter the street address.';
  if (!input.city.trim()) errors.city = 'Enter the city.';
  if (!/^\d{5}$/.test(input.zip.trim())) errors.zip = 'Enter a 5-digit ZIP.';
  return errors;
}

export function validateContact(input: {
  fullName: string;
  phone: string;
  email: string;
  agreed: boolean;
  /** Phone bookings: a caller may not have an email to give. */
  emailOptional?: boolean;
}): FieldErrors<'fullName' | 'phone' | 'email' | 'agreed'> {
  const errors: FieldErrors<'fullName' | 'phone' | 'email' | 'agreed'> = {};
  if (input.fullName.trim().replace(/\s+/g, ' ').length < 2) errors.fullName = 'Enter your name.';
  let digits = input.phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  if (digits.length !== 10) errors.phone = 'Enter a 10-digit mobile number.';
  const email = input.email.trim();
  if (!(input.emailOptional && !email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email.';
  if (!input.agreed) errors.agreed = 'Check the box to continue.';
  return errors;
}

/** '(940) 555-0123' for ten digits (a leading 1 allowed); otherwise as typed. */
export function displayPhone(input: string): string {
  let digits = input.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  if (digits.length !== 10) return input.trim();
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** The last four of a VIN, for the review screen. */
export function vinTail(vin: string): string {
  const v = vin.replace(/[\s-]/g, '').toUpperCase();
  return v.length >= 4 ? v.slice(-4) : v;
}
