/**
 * A tech's work order: what the vehicle needs, written up on the phone call
 * before the visit, so dispatch can see the parts, labor and the tech's
 * payout ahead of time.
 *
 * Each line is a part or job, the part price the customer pays (the tech's
 * upcharge already in it) and the labor. The parts pickup fee (10% of parts)
 * is on or off for the whole order.
 *
 * No imports, so the node test runner can load it, and the same file is
 * copied to supabase/functions/_shared/workOrder.ts for the booking edge
 * function (tests/workOrder.test.ts checks the two match). The money itself
 * is worked out by computeCloseOut, using workOrderCloseOutInput below, so
 * the estimate is the same sum the tech charges at close-out.
 */

export type WorkOrderLine = { title: string; partsCents: number; laborCents: number };
export type WorkOrder = { lines: WorkOrderLine[]; partsPickup: boolean };

export const WORK_ORDER_MAX_LINES = 20;
/** $100,000 per amount: far above any real job, low enough that nothing overflows. */
const MAX_CENTS = 10_000_000;

/** '$145.50', '145.5', 145.5 → cents. Anything else, or a negative, is 0. */
function toCents(input: unknown): number {
  if (typeof input === 'number') {
    return Number.isFinite(input) && input > 0 ? Math.min(Math.round(input * 100), MAX_CENTS) : 0;
  }
  const s = String(input ?? '').replace(/[$,\s]/g, '');
  if (!/^\d+(\.\d{0,2})?$|^\.\d{1,2}$/.test(s)) return 0;
  const [whole, frac = ''] = s.split('.');
  return Math.min(Number(whole || '0') * 100 + Number((frac + '00').slice(0, 2)), MAX_CENTS);
}

/**
 * A work order from what a form or a request sent: lines as
 * { title, parts, labor } in dollars. Lines with no title and no amount are
 * dropped. Null when nothing is left, so "no work order" has one shape.
 */
export function parseWorkOrder(raw: unknown): WorkOrder | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as { lines?: unknown; partsPickup?: unknown };
  const lines: WorkOrderLine[] = (Array.isArray(r.lines) ? r.lines : [])
    .map((l) => {
      const o = (l && typeof l === 'object' ? l : {}) as Record<string, unknown>;
      const title = String(o.title ?? '').trim().replace(/\s+/g, ' ').slice(0, 120);
      const partsCents = 'partsCents' in o ? toCents(Number(o.partsCents) / 100) : toCents(o.parts);
      const laborCents = 'laborCents' in o ? toCents(Number(o.laborCents) / 100) : toCents(o.labor);
      return { title, partsCents, laborCents };
    })
    .filter((l) => l.title || l.partsCents > 0 || l.laborCents > 0)
    .map((l) => ({ ...l, title: l.title || (l.partsCents > 0 ? 'Parts' : 'Labor') }))
    .slice(0, WORK_ORDER_MAX_LINES);
  if (!lines.length) return null;
  return { lines, partsPickup: r.partsPickup === true };
}

const dollars = (cents: number) => (cents / 100).toFixed(2);

/**
 * The computeCloseOut input for a work order, charged the way the pay screen
 * charges it: the diagnostic always, travel on a mobile visit, tax on parts,
 * parts bought by the tech.
 */
export function workOrderCloseOutInput(
  order: WorkOrder,
  fees: { diagnosticCents: number; travelCents: number }
) {
  return {
    kind: 'charge' as const,
    lines: order.lines.map((l) => ({ title: l.title, labor: dollars(l.laborCents), parts: dollars(l.partsCents) })),
    diagnosticCents: fees.diagnosticCents,
    travelCents: fees.travelCents,
    weatherCents: 0,
    taxMode: 'parts' as const,
    partsBy: 'tech' as const,
    partsPickup: order.partsPickup,
  };
}
