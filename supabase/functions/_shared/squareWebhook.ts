/** Square webhooks and Square-sale matching: the parts with no I/O, so
 *  tests/squareWebhook.test.ts can run them under node.
 *
 *  Square signs each delivery: base64(HMAC-SHA256(signature key,
 *  notification URL + raw body)), sent as x-square-hmacsha256-signature.
 */

export type SquareMoney = { amount?: number; currency?: string };

export type SquarePaymentLike = {
  id: string;
  status?: string;
  location_id?: string;
  created_at?: string;
  reference_id?: string;
  note?: string;
  source_type?: string;
  amount_money?: SquareMoney;
  card_details?: { card?: { card_brand?: string; last_4?: string } };
};

export type SquareRefundLike = {
  id: string;
  payment_id?: string;
  status?: string;
  amount_money?: SquareMoney;
  reason?: string;
  created_at?: string;
};

function toBase64(bytes: ArrayBuffer): string {
  let bin = '';
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** Constant-time compare, so the check does not leak how much matched. */
function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function squareSignature(signatureKey: string, notificationUrl: string, rawBody: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(signatureKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toBase64(await crypto.subtle.sign('HMAC', key, enc.encode(notificationUrl + rawBody)));
}

export async function verifySquareSignature(
  signatureKey: string,
  notificationUrl: string,
  rawBody: string,
  header: string | null
): Promise<boolean> {
  if (!signatureKey || !header) return false;
  return sameString(await squareSignature(signatureKey, notificationUrl, rawBody), header.trim());
}

/** "AP-XBDZBD9X" from a Square note like "Job AP-XBDZBD9X", or null. */
export function jobReferenceIn(text: string | null | undefined): string | null {
  const m = /\bAP-[A-Z0-9]{4,12}\b/i.exec(text ?? '');
  return m ? m[0].toUpperCase() : null;
}

/** The job a Square payment belongs to: our reference on the payment
 *  (Tap to Pay sets reference_id), or in its note (Point of Sale sales
 *  started from the portal carry "Job AP-…"). */
export function jobReferenceForPayment(p: SquarePaymentLike): string | null {
  return jobReferenceIn(p.reference_id) ?? jobReferenceIn(p.note);
}

/** Refunded so far: the completed refunds, each counted once. */
export function completedRefundCents(refunds: { id: string; status?: string; amount_cents: number }[]): number {
  const seen = new Set<string>();
  let total = 0;
  for (const r of refunds) {
    if (seen.has(r.id) || r.status !== 'COMPLETED') continue;
    seen.add(r.id);
    total += Math.max(0, Math.round(r.amount_cents));
  }
  return total;
}

/** bookings.payment_status once refunds are in. */
export function paymentStatusAfterRefunds(totalCents: number, refundedCents: number): 'paid_in_person' | 'partially_refunded' | 'refunded' {
  if (refundedCents <= 0) return 'paid_in_person';
  return refundedCents >= totalCents ? 'refunded' : 'partially_refunded';
}

export type OpenSale = {
  id: string;
  amountCents: number;
  createdAt: string;
  cardBrand: string | null;
  cardLast4: string | null;
  note: string | null;
};

/** Square card sales a tech may attach to a job: completed, at our location,
 *  in US dollars, from the last `hours` hours, and not already closing a job.
 *  Newest first. */
export function openSquareSales(
  payments: SquarePaymentLike[],
  opts: { locationId: string; attachedIds: Set<string>; now: number; hours?: number }
): OpenSale[] {
  const since = opts.now - (opts.hours ?? 12) * 60 * 60 * 1000;
  return payments
    .filter(
      (p) =>
        p.status === 'COMPLETED' &&
        p.location_id === opts.locationId &&
        p.amount_money?.currency === 'USD' &&
        (p.amount_money.amount ?? 0) > 0 &&
        !opts.attachedIds.has(p.id) &&
        Date.parse(p.created_at ?? '') >= since
    )
    .map((p) => ({
      id: p.id,
      amountCents: p.amount_money?.amount ?? 0,
      createdAt: p.created_at ?? '',
      cardBrand: p.card_details?.card?.card_brand ?? null,
      cardLast4: p.card_details?.card?.last_4 ?? null,
      note: p.note?.trim() || null,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
