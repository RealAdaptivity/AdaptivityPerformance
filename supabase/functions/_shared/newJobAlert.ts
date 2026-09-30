/** Who gets a "new job" text when a booking comes in, and what it says.
 *
 *  Kept free of imports so it can be unit-tested without Deno, a database or
 *  Twilio. create-booking-request does the reading and sending.
 *
 *  The text goes to every active tech whose specialties can take the job,
 *  not only the ones clocked in: most bookings are for a later day, and a
 *  tech who is off shift today still wants to see Thursday's job. Claiming it
 *  still requires being on shift (claim_booking_for_current_tech enforces that).
 *
 *  It deliberately leaves out the customer's name, phone and street address.
 *  Those are in the portal once someone claims the job, and a text can sit on
 *  a lock screen or be forwarded.
 */

/** Which specialty each catalog kind needs. Mirrors specialtyForServiceKind in
 *  src/services/serviceCatalog.ts; tests/newJobAlert.test.ts fails if they drift. */
const SPECIALTY_BY_KIND: Record<string, string> = {
  car_audio: 'audio',
  window_tint: 'tint',
  vehicle_wrap: 'wrap',
  ppf: 'wrap',
  body_work: 'bodywork',
  interior_lighting: 'modification',
  interior_color: 'modification',
  accessories: 'modification',
  mobile_detailing: 'detailing',
  ceramic_coating: 'detailing',
  paint_correction: 'detailing',
  headlight_restore: 'detailing',
  tires: 'tires',
  wheel_service: 'tires',
  auto_glass: 'glass',
  performance_tune: 'performance',
  intake_exhaust_upgrade: 'performance',
};

export function specialtyForKind(kind: string): string {
  return SPECIALTY_BY_KIND[kind] ?? 'mechanical';
}

export type AlertCandidate = {
  id: string;
  phone: string | null;
  specialties: string[] | null;
  terminatedAt: string | null;
};

/** Active techs who hold every specialty the job needs. A tech with no
 *  specialties recorded counts as mechanical, as the portal does. */
export function eligibleTechs(candidates: AlertCandidate[], serviceKinds: string[]): AlertCandidate[] {
  const needed = new Set((serviceKinds.length ? serviceKinds : ['diagnostic']).map(specialtyForKind));
  return candidates.filter((t) => {
    if (t.terminatedAt) return false;
    const has = new Set(t.specialties && t.specialties.length ? t.specialties : ['mechanical']);
    for (const s of needed) if (!has.has(s)) return false;
    return true;
  });
}

/** The eligible techs to text: those with a usable phone, each number once. */
export function techsToAlert(candidates: AlertCandidate[], serviceKinds: string[]): AlertCandidate[] {
  const seenPhones = new Set<string>();
  return eligibleTechs(candidates, serviceKinds).filter((t) => {
    const digits = (t.phone ?? '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
    if (digits.length !== 10 || seenPhones.has(digits)) return false;
    seenPhones.add(digits);
    return true;
  });
}

/** 'Northlake' from '1234 Canyon Falls Dr, Northlake, TX 76226'. */
export function townFromAddress(address: string): string | null {
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  const stateAt = parts.findIndex((p) => /^TX\b/i.test(p));
  const town = stateAt > 0 ? parts[stateAt - 1] : parts.length >= 3 ? parts[parts.length - 2] : null;
  return town && !/\d/.test(town) ? town : null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dayLabel(iso: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso ?? '').trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (d.getMonth() !== Number(m[2]) - 1) return null;
  return `${DAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** The same alert as a push notification to the Adaptivity app: a short
 *  title and the job in one line. Tapping it opens the app. */
export function buildNewJobPush(input: {
  service: string;
  town: string | null;
  shopDropOff: boolean;
  preferredDate?: string | null;
  preferredTimeWindow?: string | null;
}): { title: string; body: string } {
  const sms = buildNewJobAlertSms({ ...input, portalUrl: '' });
  const line = sms.replace(/^Adaptivity: new job available — /, '').replace(/\. First to claim it gets it: $/, '');
  return { title: 'New job available', body: `${line} — first to claim it gets it.` };
}

export function buildNewJobAlertSms(input: {
  service: string;
  town: string | null;
  shopDropOff: boolean;
  preferredDate?: string | null;
  preferredTimeWindow?: string | null;
  portalUrl: string;
}): string {
  const where = input.shopDropOff ? 'shop drop-off' : input.town || 'in the service area';
  const windowName = (input.preferredTimeWindow ?? '').replace(/\s*\(.*\)\s*$/, '').trim();
  const when = /asap/i.test(windowName)
    ? 'ASAP'
    : [dayLabel(input.preferredDate), windowName].filter(Boolean).join(' ');
  const head = [input.service.trim() || 'Service call', where, when].filter(Boolean).join(', ');
  return `Adaptivity: new job available — ${head}. First to claim it gets it: ${input.portalUrl}`;
}
