/** Printable invoices and receipts (browser print → Save as PDF).
 *
 *  buildInvoiceHtml is the invoice for a job closed in the tech app, built
 *  from the stored payment with the same rows as the text and email receipts.
 *  buildReceiptHtml stays for older jobs closed before that, which only have
 *  a quote to go on. */

import { openPrintableHtmlWindow } from './openPrintableHtml';
import { PRINT_DOCUMENT_STYLES } from './printDocumentStyles';
import { SITE_ORIGIN, SITE_PHONE_DISPLAY } from '../site/seo';
import {
  BUSINESS,
  money as centsMoney,
  paymentMethodText,
  receiptChargeRows,
  receiptDate,
  receiptSubtotalCents,
  taxLabel,
  warrantyLine,
} from './receiptMessage';
import type { InvoiceDoc } from './invoiceData';

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
  return `${n < 0 ? '-' : ''}$${Math.abs(n).toFixed(2)}`;
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

const INVOICE_STYLES = `
  .logo { width: 48px; height: 48px; border-radius: 12px; display: block; flex-shrink: 0; }
  .biz { margin: 6px 0 0; color: var(--muted); font-size: 11px; line-height: 1.5; }
  .stamp {
    display: inline-block; margin-top: 10px; padding: 5px 14px; border-radius: 8px;
    border: 2px solid #059669; color: #047857; font-weight: 800; font-size: 13px; letter-spacing: 0.14em;
  }
  .stamp.refund { border-color: #b45309; color: #b45309; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: 0.04em; }
  td.dash { color: #b6bdc8; }
  .totals-row.paid-by { background: #f0fdf4; color: #047857; }
  .totals-row.paid-by strong { color: #047857; }
  .totals-row.refund { background: #fffbeb; color: #92400e; }
  .totals-row.refund strong { color: #92400e; }
  .approval { margin-top: 18px; font-size: 12px; color: var(--muted); }
  .approval strong { color: var(--ink); }
`;

function shortIsoDate(iso: string | null): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });
}

/** '9405550123' → '(940) 555-0123'; anything else as typed. */
function prettyPhone(raw: string | null): string {
  const d = (raw ?? '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : (raw ?? '').trim();
}

/** The invoice for a job closed in the tech app. */
export function buildInvoiceHtml(doc: InvoiceDoc, opts: { logoUrl: string }): string {
  const r = doc.receipt;
  const rows = receiptChargeRows(r)
    .map((x) => {
      const split = x.laborCents != null;
      return `<tr>
        <td><div class="line-title">${escapeHtml(x.label)}</div></td>
        <td class="num${split ? '' : ' dash'}">${split ? centsMoney(x.laborCents ?? 0) : '—'}</td>
        <td class="num${split ? '' : ' dash'}">${split ? centsMoney(x.partsCents ?? 0) : '—'}</td>
        <td class="num amt">${centsMoney(x.cents)}</td>
      </tr>`;
    })
    .join('');
  const refunded = Math.max(0, r.refundedCents ?? 0);
  const fullyRefunded = refunded > 0 && refunded >= r.totalCents;
  const paidOn = receiptDate(r.paidAt);
  const serviceOn = shortIsoDate(doc.serviceDate);
  const warranty = warrantyLine(r);
  const contact = [prettyPhone(doc.customerPhone), doc.customerEmail].filter(Boolean).map((x) => escapeHtml(String(x))).join('<br/>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Invoice ${escapeHtml(r.referenceCode)} — ${escapeHtml(BUSINESS.legalName)}</title>
<style>
${PRINT_DOCUMENT_STYLES}
${INVOICE_STYLES}
</style>
</head>
<body>
  <div class="page">
    <div class="accent"></div>
    <div class="pad">
      <div class="top">
        <div>
          <div class="brand-wrap">
            <img class="logo" src="${escapeHtml(opts.logoUrl)}" alt=""/>
            <div>
              <h1 class="brand-name">Adaptivity Performance</h1>
              <p class="brand-tag">Mobile auto repair · Justin, TX</p>
            </div>
          </div>
          <p class="biz">${escapeHtml(BUSINESS.legalName)}<br/>${escapeHtml(BUSINESS.address)}<br/>${escapeHtml(SITE_PHONE_DISPLAY)} · ${escapeHtml(BUSINESS.email)}</p>
        </div>
        <div class="doc-meta">
          <span class="doc-badge">Invoice</span>
          <p class="doc-id">${escapeHtml(r.referenceCode)}</p>
          ${paidOn ? `<p class="doc-date">Paid ${escapeHtml(paidOn)}</p>` : ''}
          ${serviceOn ? `<p class="doc-date">Service date ${escapeHtml(serviceOn)}</p>` : ''}
          <span class="stamp${refunded > 0 ? ' refund' : ''}">${fullyRefunded ? 'REFUNDED' : refunded > 0 ? 'PARTLY REFUNDED' : 'PAID'}</span>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <h3>Billed to</h3>
          <p><strong>${escapeHtml(r.customerName)}</strong></p>
          ${doc.address ? `<p>${escapeHtml(doc.address)}</p>` : ''}
          ${contact ? `<p>${contact}</p>` : ''}
        </div>
        <div class="card">
          <h3>Vehicle</h3>
          <p><strong>${escapeHtml(r.vehicle || '—')}</strong></p>
          ${r.vin ? `<p><span class="label">VIN</span><span class="mono">${escapeHtml(r.vin)}</span></p>` : ''}
          ${r.techName ? `<p><span class="label">Technician</span>${escapeHtml(r.techName)}</p>` : ''}
        </div>
      </div>

      <p class="section-title">Charges</p>
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
          ${rows}
        </tbody>
      </table>

      <div class="totals">
        <div class="totals-box">
          <div class="totals-row"><span>Subtotal</span><strong>${centsMoney(receiptSubtotalCents(r))}</strong></div>
          ${r.taxCents > 0 ? `<div class="totals-row"><span>${escapeHtml(taxLabel(r))}</span><strong>${centsMoney(r.taxCents)}</strong></div>` : ''}
          <div class="totals-row grand"><span>Total</span><strong>${centsMoney(r.totalCents)}</strong></div>
          <div class="totals-row paid-by"><span>Paid · ${escapeHtml(paymentMethodText(r.payment))}</span><strong>${centsMoney(r.totalCents)}</strong></div>
          ${refunded > 0 ? `<div class="totals-row refund"><span>Refunded</span><strong>-${centsMoney(refunded)}</strong></div>` : ''}
          <div class="totals-row"><span>Balance due</span><strong>$0.00</strong></div>
        </div>
      </div>
      ${doc.squarePaymentId ? `<p class="doc-date" style="text-align:right;margin-top:6px">Square payment ${escapeHtml(doc.squarePaymentId)}</p>` : ''}

      ${
        r.signerName
          ? `<p class="approval">Work and total approved and signed by <strong>${escapeHtml(r.signerName)}</strong>${paidOn ? ` on ${escapeHtml(paidOn)}` : ''}.</p>`
          : ''
      }
      ${r.techNotes?.trim() ? `<div class="notes"><strong>Technician notes</strong><br/>${escapeHtml(r.techNotes.trim())}</div>` : ''}

      <div class="footer">
        <div>
          <strong>${r.kind === 'charge' ? 'Warranty' : 'About this visit'}</strong>
          ${escapeHtml(
            warranty ||
              'This visit was a diagnostic. The diagnostic is its own charge and is not applied toward a repair; any repair is quoted before work starts.'
          )}
        </div>
        <div>
          <strong>Questions?</strong>
          ${escapeHtml(SITE_PHONE_DISPLAY)}<br/>
          ${escapeHtml(BUSINESS.email)}<br/>
          ${escapeHtml(SITE_ORIGIN.replace(/^https?:\/\//, ''))}
        </div>
      </div>

      <p class="thanks">Thank you for choosing Adaptivity Performance.</p>
    </div>
  </div>
  <p class="print-hint"><button type="button" class="print-btn" onclick="window.print()">Print / Save as PDF</button><br/><span>If the print dialog did not open automatically, tap the button above.</span></p>
</body>
</html>`;
}

export function openInvoicePrintWindow(doc: InvoiceDoc) {
  const origin = typeof window !== 'undefined' ? window.location.origin : SITE_ORIGIN;
  openPrintableHtmlWindow(buildInvoiceHtml(doc, { logoUrl: `${origin}/logo-256.png` }), { width: 860, height: 1080 });
}
