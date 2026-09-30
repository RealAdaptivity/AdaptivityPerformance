/** The receipt a customer gets after paying in person, as a text and as an
 *  email. Built from the stored job_payments row, never from numbers the
 *  browser sends, so the receipt always matches what was recorded.
 *
 *  No imports, so tests/receiptMessage.test.ts can load it with node.
 */

export type ReceiptLine = { title: string; labor_cents: number; parts_cents: number };

export type ReceiptInput = {
  referenceCode: string;
  customerName: string;
  vehicle: string;
  kind: 'charge' | 'diagnostic_only' | 'no_show';
  lineItems: ReceiptLine[];
  diagnosticCents: number;
  travelCents: number;
  taxCents: number;
  taxMode: 'parts' | 'total' | 'none';
  totalCents: number;
  signerName: string | null;
  /** When the job was closed: ISO timestamp. */
  paidAt: string;
  techNotes?: string | null;
  businessPhone: string;
  siteUrl: string;
};

export function money(cents: number): string {
  const abs = Math.abs(Math.round(cents));
  return `$${Math.floor(abs / 100).toLocaleString('en-US')}.${String(abs % 100).padStart(2, '0')}`;
}

/** 'Sep 30, 2026' in Texas time, whatever zone the server runs in. */
export function receiptDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric' });
}

type Row = { label: string; detail?: string; cents: number };

/** Every charge on the receipt in the order a customer reads it. Zero rows drop out. */
export function receiptRows(r: ReceiptInput): Row[] {
  const rows: Row[] = [];
  if (r.diagnosticCents > 0) rows.push({ label: 'Diagnostic', cents: r.diagnosticCents });
  for (const l of r.lineItems) {
    const parts = [
      l.labor_cents > 0 ? `Labor ${money(l.labor_cents)}` : '',
      l.parts_cents > 0 ? `Parts ${money(l.parts_cents)}` : '',
    ].filter(Boolean);
    rows.push({ label: l.title, detail: parts.length > 1 ? parts.join(' · ') : undefined, cents: l.labor_cents + l.parts_cents });
  }
  if (r.travelCents > 0) rows.push({ label: 'Travel', cents: r.travelCents });
  if (r.taxCents > 0) rows.push({ label: `Sales tax 8.25%${r.taxMode === 'parts' ? ' on parts' : ''}`, cents: r.taxCents });
  return rows;
}

/** Short enough for three SMS segments on a typical job; the full itemization
 *  is in the email. */
export function buildReceiptSms(r: ReceiptInput): string {
  const first = r.customerName.trim().split(/\s+/)[0] || 'there';
  const date = receiptDate(r.paidAt);
  const rows = receiptRows(r).map((x) => `${x.label} ${money(x.cents)}`);
  return [
    `Adaptivity Performance receipt ${r.referenceCode}`,
    `Hi ${first}, thanks — ${money(r.totalCents)} paid in person${date ? ` ${date}` : ''}.`,
    rows.join(' · '),
    r.kind === 'charge' ? 'Repairs carry our 12-month / 12,000-mile warranty.' : '',
    `Questions: ${r.businessPhone}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function receiptSubject(r: ReceiptInput): string {
  return `Your receipt ${r.referenceCode} — Adaptivity Performance`;
}

export function buildReceiptEmailText(r: ReceiptInput): string {
  const rows = receiptRows(r).map((x) => `  ${x.label}${x.detail ? ` (${x.detail})` : ''}: ${money(x.cents)}`);
  return [
    'ADAPTIVITY PERFORMANCE — Receipt',
    `Receipt ${r.referenceCode} · ${receiptDate(r.paidAt)}`,
    `Customer: ${r.customerName}`,
    `Vehicle: ${r.vehicle}`,
    '',
    ...rows,
    `  Total paid in person: ${money(r.totalCents)}`,
    '',
    r.signerName ? `Approved and signed by ${r.signerName}.` : '',
    r.techNotes?.trim() ? `Technician notes: ${r.techNotes.trim()}` : '',
    r.kind === 'charge' ? 'Parts and labor carry our 12-month / 12,000-mile warranty.' : '',
    '',
    `Questions? Call ${r.businessPhone} · ${r.siteUrl}`,
  ]
    .filter((l, i, all) => l !== '' || (all[i - 1] ?? '') !== '')
    .join('\n');
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function buildReceiptEmailHtml(r: ReceiptInput): string {
  const rows = receiptRows(r)
    .map(
      (x) => `<tr><td style="padding:10px 0;border-bottom:1px dashed #d4d4d8">
<div style="font-weight:600">${esc(x.label)}</div>${x.detail ? `<div style="font-size:12px;color:#71717a">${esc(x.detail)}</div>` : ''}</td>
<td style="padding:10px 0;border-bottom:1px dashed #d4d4d8;text-align:right;font-weight:600;white-space:nowrap">${money(x.cents)}</td></tr>`
    )
    .join('');
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
<div style="max-width:520px;margin:0 auto;padding:24px 16px">
<div style="background:#ffffff;border-radius:16px;padding:24px">
<div style="font-size:18px;font-weight:700">Adaptivity Performance</div>
<div style="font-size:13px;color:#52525b;margin-top:4px">Receipt ${esc(r.referenceCode)} · ${esc(receiptDate(r.paidAt))}</div>
<div style="font-size:14px;margin-top:16px">${esc(r.customerName)}<br><span style="color:#52525b">${esc(r.vehicle)}</span></div>
<table role="presentation" style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px">${rows}
<tr><td style="padding:14px 0 0;font-size:16px;font-weight:700">Total paid in person</td>
<td style="padding:14px 0 0;text-align:right;font-size:22px;font-weight:700">${money(r.totalCents)}</td></tr></table>
${r.signerName ? `<p style="font-size:13px;color:#52525b;margin:16px 0 0">Approved and signed by ${esc(r.signerName)}.</p>` : ''}
${r.techNotes?.trim() ? `<p style="font-size:13px;color:#52525b;margin:8px 0 0">Technician notes: ${esc(r.techNotes.trim())}</p>` : ''}
${r.kind === 'charge' ? '<p style="font-size:13px;margin:16px 0 0">Parts and labor carry our 12-month / 12,000-mile warranty.</p>' : ''}
</div>
<p style="font-size:12px;color:#71717a;text-align:center;margin-top:16px">Questions? Call ${esc(r.businessPhone)} · <a href="${esc(r.siteUrl)}" style="color:#c2410c">${esc(r.siteUrl.replace(/^https?:\/\//, ''))}</a></p>
</div></body></html>`;
}
