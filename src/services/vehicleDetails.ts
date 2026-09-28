/** Structured vehicle details for a booking.
 *
 *  The booking form used to take the vehicle as one free-text box, pre-filled
 *  with "2020 Ford F-150". It was marked required, but a pre-filled field is
 *  already satisfied — so anyone who skipped it booked a truck they did not
 *  own, and a technician drove out with the wrong parts.
 *
 *  Year, make, model, trim, engine and VIN are captured separately now. The
 *  composed string still exists because bookings.vehicle_description is NOT
 *  NULL and the tech portal, receipts and the confirmation text all read it;
 *  it is built here from the parts rather than typed by the customer, so the
 *  two can never disagree.
 */

export type VehicleDetails = {
  year: string;
  make: string;
  model: string;
  trim: string;
  engine: string;
  vin: string;
};

export const EMPTY_VEHICLE: VehicleDetails = {
  year: '',
  make: '',
  model: '',
  trim: '',
  engine: '',
  vin: '',
};

/** A VIN is 17 characters and never uses I, O or Q — they were excluded to
 *  avoid confusion with 1 and 0. Checking that here turns a typo into a
 *  correction at the form rather than a wrong part at the driveway. */
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

export function normalizeVin(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s-]/g, '');
}

export function isValidVin(raw: string): boolean {
  return VIN_PATTERN.test(normalizeVin(raw));
}

/** Model years run ahead of the calendar — a 2027 model sells in 2026 — so
 *  next year is allowed. The lower bound is generous rather than clever: a
 *  1955 Chevrolet is a real mobile-mechanic job. */
export function isValidModelYear(raw: string, now = new Date()): boolean {
  if (!/^\d{4}$/.test(raw.trim())) return false;
  const year = Number(raw.trim());
  return year >= 1900 && year <= now.getFullYear() + 2;
}

/** "2021 Ford F-150 Lariat · 3.5L EcoBoost"
 *
 *  Only the parts that were filled in appear, so this degrades cleanly rather
 *  than printing "undefined" at a customer. */
export function composeVehicleDescription(v: Partial<VehicleDetails>): string {
  const head = [v.year, v.make, v.model, v.trim]
    .map((p) => (p ?? '').trim())
    .filter(Boolean)
    .join(' ');
  const engine = (v.engine ?? '').trim();
  if (head && engine) return `${head} · ${engine}`;
  return head || engine;
}

export type VehicleFieldError = { field: keyof VehicleDetails; message: string };

/** Returns every problem rather than the first, so the form can mark all the
 *  offending inputs at once instead of making the customer resubmit to find
 *  the next one. */
export function validateVehicle(v: VehicleDetails, now = new Date()): VehicleFieldError[] {
  const errors: VehicleFieldError[] = [];

  if (!v.year.trim()) errors.push({ field: 'year', message: 'Year is required' });
  else if (!isValidModelYear(v.year, now)) {
    errors.push({ field: 'year', message: 'Enter a 4-digit model year' });
  }

  if (!v.make.trim()) errors.push({ field: 'make', message: 'Make is required' });
  if (!v.model.trim()) errors.push({ field: 'model', message: 'Model is required' });
  if (!v.trim.trim()) errors.push({ field: 'trim', message: 'Trim is required' });
  if (!v.engine.trim()) errors.push({ field: 'engine', message: 'Engine is required' });

  if (!v.vin.trim()) errors.push({ field: 'vin', message: 'VIN is required' });
  else if (!isValidVin(v.vin)) {
    errors.push({ field: 'vin', message: 'A VIN is 17 characters and has no I, O or Q' });
  }

  return errors;
}
