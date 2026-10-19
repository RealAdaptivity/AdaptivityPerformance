/** Spotting a booking the customer already made.
 *
 *  Customers who get no confirmation tend to book again: one booked the same
 *  Explorer three times in four minutes, another the same truck twice in six.
 *  Each repeat put another job on the board for a tech to claim or cancel.
 *
 *  A repeat is the same name, phone number and vehicle, still open, made
 *  within the last hour. A second vehicle on the same phone is a new booking.
 *  The name is part of the match because a repeat hands back the earlier
 *  confirmation number: knowing someone's phone and car is not enough to get it.
 *
 *  No imports, so tests/repeatBooking.test.ts can load it with node.
 */

/** How far back an earlier booking counts as the same request. */
export const REPEAT_BOOKING_WINDOW_MINUTES = 60;

/** The last 10 digits, so "(940) 555-0123", "940.555.0123" and
 *  "+1 940 555 0123" all match. Null when it is not a full US number. */
export function phoneKey(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : null;
}

/** Case, spacing and punctuation dropped: "2015 Ford explorer" and
 *  "2015 Ford Explorer" are the same car, "thomas ham" and "Thomas Ham" the
 *  same person. */
export function textKey(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export type EarlierBooking = {
  id: string;
  reference_code: string;
  customer_name: string | null;
  customer_phone: string | null;
  vehicle_description: string | null;
  status: string;
  created_at: string;
};

/** The earlier booking this one repeats, newest first, or null. */
export function findRepeatBooking(
  incoming: { name: string; phone: string; vehicle: string },
  earlier: EarlierBooking[],
  now: Date = new Date()
): EarlierBooking | null {
  const name = textKey(incoming.name);
  const phone = phoneKey(incoming.phone);
  const vehicle = textKey(incoming.vehicle);
  if (!name || !phone || !vehicle) return null;
  const since = now.getTime() - REPEAT_BOOKING_WINDOW_MINUTES * 60_000;
  return (
    earlier
      .filter(
        (b) =>
          b.status !== 'CANCELED' &&
          b.status !== 'COMPLETED' &&
          new Date(b.created_at).getTime() >= since &&
          phoneKey(b.customer_phone) === phone &&
          textKey(b.customer_name) === name &&
          textKey(b.vehicle_description) === vehicle
      )
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0] ?? null
  );
}
