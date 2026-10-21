/** What the business took in and kept, from the two places money is
 *  recorded: jobs closed in the tech app (job_payments) and receipts written
 *  in the admin console for walk-ins and quotes (receipts). No imports, so
 *  tests/moneyIn.test.ts can load it with node. */

export type ReceiptMethod = 'cash' | 'card' | 'zelle' | 'check' | 'other';

export type ReceiptRow = { payment_method: string | null; total_cents: number | null };

export type ReceiptsByMethod = {
  rows: { method: ReceiptMethod; count: number; cents: number }[];
  totalCents: number;
};

const RECEIPT_METHODS: ReceiptMethod[] = ['card', 'cash', 'zelle', 'check', 'other'];

export function groupReceiptsByMethod(rows: ReceiptRow[]): ReceiptsByMethod {
  const by = new Map<ReceiptMethod, { count: number; cents: number }>(
    RECEIPT_METHODS.map((m) => [m, { count: 0, cents: 0 }])
  );
  let totalCents = 0;
  for (const r of rows) {
    const m = RECEIPT_METHODS.includes(r.payment_method as ReceiptMethod) ? (r.payment_method as ReceiptMethod) : 'other';
    const cents = Math.max(0, Number(r.total_cents) || 0);
    const slot = by.get(m)!;
    slot.count += 1;
    slot.cents += cents;
    totalCents += cents;
  }
  return {
    rows: RECEIPT_METHODS.map((method) => ({ method, ...by.get(method)! })).filter((r) => r.count > 0),
    totalCents,
  };
}

export type MoneyIn = {
  jobsCents: number;
  receiptsCents: number;
  refundedCents: number;
  /** Jobs plus receipts, less refunds. */
  totalInCents: number;
  techPayoutCents: number;
  /** What the business kept before parts and other expenses. */
  keptCents: number;
};

export function summarizeMoneyIn(
  jobs: { totalCents: number; refundedCents: number; techPayoutCents: number } | null,
  receipts: { totalCents: number } | null
): MoneyIn {
  const jobsCents = jobs?.totalCents ?? 0;
  const receiptsCents = receipts?.totalCents ?? 0;
  const refundedCents = jobs?.refundedCents ?? 0;
  const techPayoutCents = jobs?.techPayoutCents ?? 0;
  const totalInCents = jobsCents + receiptsCents - refundedCents;
  return {
    jobsCents,
    receiptsCents,
    refundedCents,
    totalInCents,
    techPayoutCents,
    keptCents: totalInCents - techPayoutCents,
  };
}

/** 'YYYY-MM-DD' for `days` ago in Texas, to compare with receipts.paid_on. */
export function texasDateDaysAgo(days: number, now: Date = new Date()): string {
  return new Date(now.getTime() - days * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
}

/** The calendar year it is now in Texas. */
export function texasYear(now: Date = new Date()): number {
  return Number(now.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }).slice(0, 4));
}

/** Jan 1 to Jan 1, midnight in Texas, as ISO instants (Texas is UTC-6 in
 *  winter, so both ends fall in Central Standard Time). */
export function texasYearBounds(year: number): { startIso: string; endIso: string } {
  return {
    startIso: new Date(`${year}-01-01T00:00:00-06:00`).toISOString(),
    endIso: new Date(`${year + 1}-01-01T00:00:00-06:00`).toISOString(),
  };
}

/** Pay totals by tech; jobs with no tech on them are left out. */
export function sumPayByTech(rows: { techId: string | null; cents: number }[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of rows) {
    if (!r.techId || !(r.cents > 0)) continue;
    out.set(r.techId, (out.get(r.techId) ?? 0) + Math.round(r.cents));
  }
  return out;
}
