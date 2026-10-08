/** Square API access for edge functions.
 *
 * Secrets:
 *   SQUARE_ACCESS_TOKEN        server token, used to look payments up
 *   SQUARE_MOBILE_ACCESS_TOKEN token handed to the tech app to authorize the
 *                              Mobile Payments SDK (falls back to
 *                              SQUARE_ACCESS_TOKEN). Prefer an OAuth token
 *                              limited to MERCHANT_PROFILE_READ,
 *                              PAYMENTS_WRITE and PAYMENTS_WRITE_IN_PERSON.
 *   SQUARE_LOCATION_ID         the location card payments are taken at
 *   SQUARE_ENVIRONMENT         'production' (default) or 'sandbox'
 */

export type SquareConfig = {
  accessToken: string;
  mobileAccessToken: string;
  locationId: string;
  environment: 'production' | 'sandbox';
};

export function squareConfig(): SquareConfig | null {
  const accessToken = Deno.env.get('SQUARE_ACCESS_TOKEN')?.trim() ?? '';
  const locationId = Deno.env.get('SQUARE_LOCATION_ID')?.trim() ?? '';
  if (!accessToken || !locationId) return null;
  return {
    accessToken,
    mobileAccessToken: Deno.env.get('SQUARE_MOBILE_ACCESS_TOKEN')?.trim() || accessToken,
    locationId,
    environment: Deno.env.get('SQUARE_ENVIRONMENT')?.trim() === 'sandbox' ? 'sandbox' : 'production',
  };
}

function baseUrl(cfg: SquareConfig): string {
  return cfg.environment === 'sandbox'
    ? 'https://connect.squareupsandbox.com'
    : 'https://connect.squareup.com';
}

export type SquarePayment = {
  id: string;
  status: string;
  location_id: string;
  reference_id?: string;
  note?: string;
  created_at?: string;
  amount_money?: { amount: number; currency: string };
  total_money?: { amount: number; currency: string };
  card_details?: { card?: { card_brand?: string; last_4?: string } };
};

export async function getSquarePayment(cfg: SquareConfig, paymentId: string): Promise<SquarePayment> {
  const res = await fetch(`${baseUrl(cfg)}/v2/payments/${encodeURIComponent(paymentId)}`, {
    headers: {
      Authorization: `Bearer ${cfg.accessToken}`,
      'Square-Version': '2024-10-17',
      Accept: 'application/json',
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.payment) {
    const detail = body?.errors?.[0]?.detail || `Square returned ${res.status}`;
    throw new Error(`Could not look up the card payment: ${detail}`);
  }
  return body.payment as SquarePayment;
}

/** The payment behind a Square Point of Sale checkout. Square Point of Sale
 *  returns a transaction id, which is the Orders API order id; its card
 *  tender carries the payment id. */
export async function paymentIdForSquareOrder(cfg: SquareConfig, orderId: string): Promise<string> {
  const res = await fetch(`${baseUrl(cfg)}/v2/orders/${encodeURIComponent(orderId)}`, {
    headers: {
      Authorization: `Bearer ${cfg.accessToken}`,
      'Square-Version': '2024-10-17',
      Accept: 'application/json',
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.order) {
    const detail = body?.errors?.[0]?.detail || `Square returned ${res.status}`;
    throw new Error(`Could not look up the Square sale: ${detail}`);
  }
  const tenders: { id?: string; type?: string; payment_id?: string }[] = body.order.tenders ?? [];
  const card = tenders.find((t) => t.type === 'CARD') ?? tenders[0];
  const paymentId = card?.payment_id || card?.id;
  if (!paymentId) throw new Error('The Square sale has no card payment on it.');
  return paymentId;
}

/** Card payments at our location since `beginTime` (ISO), newest first, up to
 *  100. Used to let a tech attach a sale rung up straight in Square. */
export async function listSquarePayments(cfg: SquareConfig, beginTime: string): Promise<SquarePayment[]> {
  const q = new URLSearchParams({
    begin_time: beginTime,
    location_id: cfg.locationId,
    sort_order: 'DESC',
    limit: '100',
  });
  const res = await fetch(`${baseUrl(cfg)}/v2/payments?${q}`, {
    headers: {
      Authorization: `Bearer ${cfg.accessToken}`,
      'Square-Version': '2024-10-17',
      Accept: 'application/json',
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = body?.errors?.[0]?.detail || `Square returned ${res.status}`;
    throw new Error(`Could not list Square sales: ${detail}`);
  }
  return (body.payments ?? []) as SquarePayment[];
}
