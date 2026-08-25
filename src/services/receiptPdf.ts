/** Professional printable service receipt (browser print → Save as PDF). */

import { openPrintableHtmlWindow } from './openPrintableHtml';
import { SITE_ORIGIN, SITE_PHONE_DISPLAY } from '../site/seo';

export type ReceiptLineItem = {
  title: string;
  /** Optional amount for this line (dollars). */
  amountDollars?: number;
  laborDollars?: number;
  partsDollars?: number;
  note?: string;
};

export type ReceiptData = {
  referenceCode: string;
  customerName: string;
  vehicle: string;
  /** Legacy service tags when itemized lines are unavailable. */
  services: string[];
  totalDollars: number;
  paymentStatus: string;
  dateLabel: string;
  address?: string;
  /** Preferred: charged invoice lines (diagnostic + repairs). */
  lineItems?: ReceiptLineItem[];
  diagnosticDollars?: number;
  repairsDollars?: number;
  techNotes?: string;
};

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

function paymentLabel(status: string) {
  const s = status.trim().toLowerCase();
  if (s === 'captured' || s === 'completed') return 'Paid';
  // The deposit is charged, not reserved. Calling it a hold on a receipt for
  // money already taken is how disputes start.
  if (s === 'deposit_paid') return 'Deposit paid';
  if (s === 'balance_due') return 'Deposit paid — balance due';
  if (s === 'authorized' || s === 'held') return 'Authorized hold';
  if (s === 'refunded') return 'Refunded';
  if (s === 'canceled' || s === 'cancelled') return 'Canceled';
  return status || '—';
}

export function buildReceiptHtml(data: ReceiptData): string {
  const rawLines =
    Array.isArray(data.lineItems) && data.lineItems.some((l) => Boolean(l.title?.trim()))
      ? data.lineItems.filter((l) => l.title.trim())
      : [];

  const hasItemizedAmounts = rawLines.some((l) => {
    const labor = l.laborDollars ?? 0;
    const parts = l.partsDollars ?? 0;
    const amount = l.amountDollars ?? labor + parts;
    return amount > 0;
  });

  // Legacy bookings: service tags only, no labor/parts split stored.
  const displayLines: ReceiptLineItem[] = hasItemizedAmounts
    ? rawLines
    : data.services.filter(Boolean).length > 0
      ? [
          ...data.services.filter(Boolean).map((s) => ({
            title: s,
            laborDollars: 0,
            partsDollars: 0,
            amountDollars: 0,
          })),
          {
            title: 'Total charged (itemized labor/parts not stored on this job)',
            laborDollars: data.totalDollars,
            partsDollars: 0,
            amountDollars: data.totalDollars,
          },
        ]
      : [
          {
            title: 'Mobile service',
            laborDollars: data.totalDollars,
            partsDollars: 0,
            amountDollars: data.totalDollars,
          },
        ];

  let laborTotal = 0;
  let partsTotal = 0;
  const itemizedRows = displayLines
    .map((l) => {
      const labor = Number(l.laborDollars) || 0;
      const parts = Number(l.partsDollars) || 0;
      const amount = Number(l.amountDollars ?? labor + parts) || 0;
      laborTotal += labor;
      partsTotal += parts;
      const note = l.note?.trim()
        ? `<div class="line-detail">${escapeHtml(l.note.trim())}</div>`
        : '';
      return `<tr>
        <td>
          <div class="line-title">${escapeHtml(l.title.trim())}</div>
          ${note}
        </td>
        <td class="num">${money(labor)}</td>
        <td class="num">${money(parts)}</td>
        <td class="num amt">${money(amount)}</td>
      </tr>`;
    })
    .join('');

  if (!hasItemizedAmounts && data.diagnosticDollars == null) {
    // Keep totals box honest for legacy jobs
  }

  const diagnosticDollars = data.diagnosticDollars;
  const repairsDollars =
    data.repairsDollars != null
      ? data.repairsDollars
      : hasItemizedAmounts
        ? Math.max(0, partsTotal + laborTotal - (diagnosticDollars ?? 0))
        : undefined;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Receipt ${escapeHtml(data.referenceCode)} — Adaptivity Performance</title>
<style>
  :root {
    --ink: #0f1218;
    --muted: #5b6575;
    --line: #e6e9ef;
    --soft: #f6f7f9;
    --brand: #ea580c;
    --brand-dark: #c2410c;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: #eef1f5;
    color: var(--ink);
    font-family: "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    width: 100%;
    max-width: 780px;
    margin: 28px auto;
    background: #fff;
    border: 1px solid #d8dde6;
    box-shadow: 0 12px 40px rgba(15, 18, 24, 0.08);
  }
  .accent { height: 6px; background: linear-gradient(90deg, var(--brand), #f59e0b 55%, var(--brand-dark)); }
  .pad { padding: 36px 40px 32px; }
  .top {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    align-items: flex-start;
    padding-bottom: 22px;
    border-bottom: 1px solid var(--line);
  }
  .brand-mark {
    width: 44px; height: 44px; border-radius: 12px;
    background: linear-gradient(145deg, #f97316, #c2410c);
    color: #fff; font-weight: 800; font-size: 15px; letter-spacing: 0.04em;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .brand-wrap { display: flex; gap: 14px; align-items: center; }
  .brand-name { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.02em; line-height: 1.15; }
  .brand-tag { margin: 4px 0 0; color: var(--muted); font-size: 12px; font-weight: 500; }
  .doc-meta { text-align: right; }
  .doc-badge {
    display: inline-block; background: #fff7ed; color: var(--brand-dark);
    border: 1px solid #fed7aa; border-radius: 999px; padding: 4px 10px;
    font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
  }
  .doc-id { margin: 10px 0 0; font-size: 18px; font-weight: 800; font-variant-numeric: tabular-nums; }
  .doc-date { margin: 4px 0 0; color: var(--muted); font-size: 12px; }

  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0 8px; }
  .card {
    background: var(--soft); border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px;
  }
  .card h3 {
    margin: 0 0 10px; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;
    color: var(--muted); font-weight: 700;
  }
  .card p { margin: 0 0 6px; font-size: 13px; line-height: 1.4; }
  .card p:last-child { margin-bottom: 0; }
  .label { color: var(--muted); font-size: 11px; display: block; margin-bottom: 1px; }

  .section-title {
    margin: 26px 0 10px; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;
    color: var(--muted); font-weight: 700;
  }
  table { width: 100%; border-collapse: collapse; }
  thead th {
    text-align: left; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase;
    color: var(--muted); font-weight: 700; padding: 0 0 10px; border-bottom: 1px solid var(--line);
  }
  thead th.num, td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  thead th.amt, td.amt { font-weight: 700; }
  tbody td {
    padding: 12px 8px 12px 0; border-bottom: 1px solid var(--line); vertical-align: top; font-size: 13px;
  }
  tbody td.num { padding-right: 0; padding-left: 8px; }
  .line-title { font-weight: 650; color: var(--ink); }
  .line-detail { margin-top: 4px; color: var(--muted); font-size: 11px; }

  .warn {
    margin: 10px 0 0; padding: 10px 12px; background: #fffbeb; border: 1px solid #fde68a;
    border-radius: 10px; color: #92400e; font-size: 11px; line-height: 1.4;
  }

  .totals { margin-top: 12px; display: flex; justify-content: flex-end; }
  .totals-box { width: 300px; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
  .totals-row {
    display: flex; justify-content: space-between; gap: 16px; padding: 10px 14px;
    font-size: 13px; color: var(--muted); background: #fff;
  }
  .totals-row strong { color: var(--ink); font-variant-numeric: tabular-nums; }
  .totals-row.grand {
    background: #0f1218; color: #fff; font-size: 15px; font-weight: 800; padding: 14px;
  }
  .totals-row.grand strong { color: #fff; font-size: 18px; }
  .paid {
    display: inline-block; margin-top: 8px; font-size: 11px; font-weight: 700; color: #047857;
    background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 999px; padding: 4px 10px;
  }

  .notes {
    margin-top: 22px; padding: 12px 14px; background: var(--soft); border-left: 3px solid var(--brand);
    border-radius: 0 10px 10px 0; font-size: 12px; color: var(--muted); line-height: 1.45;
  }
  .notes strong { color: var(--ink); }

  .footer {
    margin-top: 28px; padding-top: 18px; border-top: 1px solid var(--line);
    display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; font-size: 11px;
    color: var(--muted); line-height: 1.45;
  }
  .footer strong { color: var(--ink); display: block; margin-bottom: 4px; font-size: 12px; }
  .thanks { margin-top: 20px; text-align: center; font-size: 13px; color: var(--ink); font-weight: 600; }
  .print-hint { text-align: center; color: #94a3b8; font-size: 11px; margin: 12px 0 28px; }

  @media print {
    body { background: #fff; }
    .page { margin: 0; max-width: none; border: none; box-shadow: none; }
    .print-hint { display: none; }
    .pad { padding: 0; }
  }
  @media (max-width: 640px) {
    .pad { padding: 22px 18px; }
    .top, .grid, .footer { grid-template-columns: 1fr; display: grid; }
    .doc-meta { text-align: left; }
    .totals-box { width: 100%; }
  }
</style>
</head>
<body>
  <div class="page">
    <div class="accent"></div>
    <div class="pad">
      <div class="top">
        <div class="brand-wrap">
          <div class="brand-mark">AP</div>
          <div>
            <h1 class="brand-name">Adaptivity Performance</h1>
            <p class="brand-tag">Mobile ASE service · Justin &amp; Northlake · DFW</p>
          </div>
        </div>
        <div class="doc-meta">
          <span class="doc-badge">Service receipt</span>
          <p class="doc-id">${escapeHtml(data.referenceCode)}</p>
          <p class="doc-date">${escapeHtml(data.dateLabel)}</p>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <h3>Billed to</h3>
          <p><strong>${escapeHtml(data.customerName)}</strong></p>
          ${
            data.address
              ? `<p><span class="label">Service address</span>${escapeHtml(data.address)}</p>`
              : ''
          }
        </div>
        <div class="card">
          <h3>Job details</h3>
          <p><span class="label">Vehicle</span>${escapeHtml(data.vehicle || '—')}</p>
          <p><span class="label">Payment status</span>${escapeHtml(paymentLabel(data.paymentStatus))}</p>
        </div>
      </div>

      <p class="section-title">Itemized charges</p>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th class="num">Labor</th>
            <th class="num">Parts</th>
            <th class="num amt">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemizedRows}
        </tbody>
      </table>
      ${
        !hasItemizedAmounts
          ? `<p class="warn">This older job did not store a labor/parts breakdown. New charges from tech dispatch save full itemized lines (diagnostic, labor, and parts) on the receipt.</p>`
          : ''
      }

      <div class="totals">
        <div>
          <div class="totals-box">
            <div class="totals-row"><span>Labor</span><strong>${money(laborTotal)}</strong></div>
            <div class="totals-row"><span>Parts</span><strong>${money(partsTotal)}</strong></div>
            ${
              diagnosticDollars != null && diagnosticDollars > 0
                ? `<div class="totals-row"><span>Diagnostic (included above)</span><strong>${money(
                    diagnosticDollars
                  )}</strong></div>`
                : ''
            }
            ${
              repairsDollars != null && repairsDollars > 0 && hasItemizedAmounts
                ? `<div class="totals-row"><span>Repairs (included above)</span><strong>${money(
                    repairsDollars
                  )}</strong></div>`
                : ''
            }
            <div class="totals-row grand"><span>Total</span><strong>${money(
              data.totalDollars
            )}</strong></div>
          </div>
          ${
            /captured|paid|completed/i.test(data.paymentStatus)
              ? `<span class="paid">Payment received</span>`
              : ''
          }
        </div>
      </div>

      ${
        data.techNotes?.trim()
          ? `<div class="notes"><strong>Technician notes</strong>${escapeHtml(
              data.techNotes.trim()
            )}</div>`
          : ''
      }

      <div class="footer">
        <div>
          <strong>12-Month / 12,000-Mile warranty</strong>
          Parts and labor supplied by Adaptivity Performance are covered for 12 months or 12,000 miles, whichever comes first. Keep this receipt with your vehicle records.
        </div>
        <div>
          <strong>Questions?</strong>
          ${SITE_PHONE_DISPLAY}<br/>
          ${SITE_ORIGIN.replace(/^https?:\/\//, '')}<br/>
          hello@adaptivityperformance.com
        </div>
      </div>

      <p class="thanks">Thank you for choosing Adaptivity Performance.</p>
    </div>
  </div>
  <p class="print-hint">Use Print → Save as PDF if the dialog does not open automatically.</p>
  <script>window.addEventListener('load',function(){setTimeout(function(){window.print()},350)});</script>
</body>
</html>`;
}

export function openReceiptPrintWindow(data: ReceiptData) {
  openPrintableHtmlWindow(buildReceiptHtml(data), { width: 860, height: 1080 });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
