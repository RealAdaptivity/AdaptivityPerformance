/** How a receipt made in the admin Receipts tab was paid, and the line items
 *  it stores. No imports, so tests/receiptPayment.test.ts can load it with
 *  node. */

export type ReceiptMethod = 'cash' | 'card' | 'zelle' | 'check' | 'other';

export const RECEIPT_METHODS: { id: ReceiptMethod; label: string; reference: string | null; placeholder: string }[] = [
  { id: 'cash', label: 'Cash', reference: null, placeholder: '' },
  { id: 'card', label: 'Card', reference: 'Last 4 of the card', placeholder: '4242' },
  { id: 'zelle', label: 'Zelle', reference: 'Zelle confirmation #', placeholder: 'From the bank app' },
  { id: 'check', label: 'Check', reference: 'Check #', placeholder: '1042' },
  { id: 'other', label: 'Other', reference: 'How they paid', placeholder: 'Venmo @name' },
];

/** The reference as stored: trimmed, at most 80 characters, and for a card
 *  only its last 4 digits. Empty means none. */
export function normalizeReference(method: ReceiptMethod, raw: string | null | undefined): string {
  const s = (raw ?? '').trim();
  if (method === 'cash') return '';
  if (method === 'card') return s.replace(/\D/g, '').slice(-4);
  return s.slice(0, 80);
}

/** Why the payment cannot be saved yet, or null. Zelle needs its
 *  confirmation (as when a job is marked paid by Zelle) and Other needs to
 *  say what it was; a card's last 4 is optional but must be 4 digits. */
export function receiptReferenceError(method: ReceiptMethod, raw: string | null | undefined): string | null {
  const ref = normalizeReference(method, raw);
  if (method === 'zelle' && !ref) return 'Enter the Zelle confirmation number.';
  if (method === 'other' && !ref) return 'Say how they paid (Venmo, Cash App…).';
  if (method === 'card' && (raw ?? '').trim() && ref.length !== 4) return 'Enter the last 4 digits of the card.';
  return null;
}

/** "Cash", "Card ending 4242", "Zelle · conf. ABC123", "Check #1042", "Venmo @name". */
export function paidViaText(method: ReceiptMethod, reference: string | null | undefined): string {
  const ref = normalizeReference(method, reference);
  switch (method) {
    case 'cash':
      return 'Cash';
    case 'card':
      return ref ? `Card ending ${ref}` : 'Card';
    case 'zelle':
      return ref ? `Zelle · conf. ${ref}` : 'Zelle';
    case 'check':
      return ref ? `Check #${ref.replace(/^#/, '')}` : 'Check';
    default:
      return ref || 'Other';
  }
}

export type StoredReceiptLine = {
  title: string;
  labor_cents: number;
  parts_cents: number;
  hours?: number;
  note?: string;
  /** Set on the parts pickup fee, which is stored with the parts. */
  fee?: 'parts_pickup';
};

export const PARTS_PICKUP_LINE_TITLE = 'Parts pickup (10% of parts)';

/** The receipts table adds up labor + parts + tax, so the 10% parts pickup
 *  fee is stored with the parts (it is taxed with them too) and kept apart
 *  in line_items as its own tagged line. */
export function withPickupLine(lines: StoredReceiptLine[], partsPickupCents: number): StoredReceiptLine[] {
  const work = lines.filter((l) => l.fee !== 'parts_pickup');
  return partsPickupCents > 0
    ? [...work, { title: PARTS_PICKUP_LINE_TITLE, labor_cents: 0, parts_cents: partsPickupCents, fee: 'parts_pickup' }]
    : work;
}

/** Back from line_items: the work lines, and the pickup fee on its own. */
export function splitPickupLine(raw: unknown): { lines: StoredReceiptLine[]; partsPickupCents: number } {
  const items = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
  const lines: StoredReceiptLine[] = [];
  let partsPickupCents = 0;
  for (const l of items) {
    const parts = Math.max(0, Math.round(Number(l?.parts_cents) || 0));
    if (l?.fee === 'parts_pickup') {
      partsPickupCents += parts;
      continue;
    }
    lines.push({
      title: String(l?.title ?? ''),
      labor_cents: Math.max(0, Math.round(Number(l?.labor_cents) || 0)),
      parts_cents: parts,
      ...(Number(l?.hours) > 0 ? { hours: Number(l.hours) } : {}),
      ...(typeof l?.note === 'string' && l.note.trim() ? { note: l.note.trim() } : {}),
    });
  }
  return { lines, partsPickupCents };
}

/** 'YYYY-MM-DD' to an instant on that day in Texas (noon), for the invoice's
 *  "Paid" date and warranty, which read dates in America/Chicago. */
export function paidOnInstant(paidOn: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(paidOn) ? `${paidOn}T17:00:00.000Z` : paidOn;
}

/** Today in Texas, 'YYYY-MM-DD'. */
export function texasToday(now = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
}
