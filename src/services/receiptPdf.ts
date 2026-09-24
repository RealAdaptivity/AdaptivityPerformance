/** Professional printable service receipt (browser print → Save as PDF). */

import { openPrintableHtmlWindow } from './openPrintableHtml';
import { PRINT_DOCUMENT_STYLES } from './printDocumentStyles';
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
  if (s === 'captured' || s === 'completed' || s === 'paid_in_person') return 'Paid in person';
  if (s === 'pay_in_person') return 'Due in person';
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
${PRINT_DOCUMENT_STYLES}
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
            <p class="brand-tag">Mobile ASE service · Justin &amp; Northlake, TX</p>
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
  <p class="print-hint"><button type="button" class="print-btn" onclick="window.print()">Print / Save as PDF</button><br/><span>If the print dialog did not open automatically, tap the button above.</span></p>
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
