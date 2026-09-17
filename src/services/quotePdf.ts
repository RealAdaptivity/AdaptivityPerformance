/** Printable customer quote (browser print → Save as PDF). */

import { openPrintableHtmlWindow } from './openPrintableHtml';
import { PRINT_DOCUMENT_STYLES } from './printDocumentStyles';
import { SALES_TAX_LABEL, type TaxMode } from './salesTax';
import { SITE_ORIGIN, SITE_PHONE_DISPLAY } from '../site/seo';
import type { Quote } from './quotes';

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function taxRowLabel(mode: TaxMode) {
  if (mode === 'parts') return `Texas sales tax (parts, ${SALES_TAX_LABEL})`;
  if (mode === 'total') return `Texas sales tax (${SALES_TAX_LABEL})`;
  return 'Sales tax';
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return null;
  try {
    return new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function buildQuoteHtml(quote: Quote): string {
  const lines = quote.lineItems.filter((l) => l.title?.trim());

  const rows = lines
    .map((l) => {
      const labor = Math.round((Number(l.laborDollars) || 0) * 100);
      const parts = Math.round((Number(l.partsDollars) || 0) * 100);
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
        <td class="num amt">${money(labor + parts)}</td>
      </tr>`;
    })
    .join('');

  const created = formatDate(quote.createdAt);
  const validUntil = formatDate(quote.validUntil);

  const contactBits = [
    quote.customerPhone ? `<p><span class="label">Phone</span>${escapeHtml(quote.customerPhone)}</p>` : '',
    quote.customerEmail ? `<p><span class="label">Email</span>${escapeHtml(quote.customerEmail)}</p>` : '',
    quote.customerAddress
      ? `<p><span class="label">Service address</span>${escapeHtml(quote.customerAddress)}</p>`
      : '',
  ].join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Quote ${escapeHtml(quote.quoteNumber)} — Adaptivity Performance</title>
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
            <p class="brand-tag">Mobile auto repair · Justin, TX · ${escapeHtml(SITE_PHONE_DISPLAY)}</p>
          </div>
        </div>
        <div class="doc-meta">
          <span class="doc-badge">Estimate</span>
          <p class="doc-id">${escapeHtml(quote.quoteNumber)}</p>
          ${created ? `<p class="doc-date">${escapeHtml(created)}</p>` : ''}
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <h3>Prepared for</h3>
          <p><strong>${escapeHtml(quote.customerName)}</strong></p>
          ${contactBits}
        </div>
        <div class="card">
          <h3>Vehicle</h3>
          <p>${escapeHtml(quote.vehicle?.trim() || 'Not specified')}</p>
          ${validUntil ? `<p><span class="label">Valid until</span>${escapeHtml(validUntil)}</p>` : ''}
        </div>
      </div>

      <p class="section-title">Estimated work</p>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th class="num">Labor</th>
            <th class="num">Parts</th>
            <th class="num amt">Amount</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="totals">
        <div class="totals-box">
          <div class="totals-row"><span>Labor</span><strong>${money(quote.laborCents)}</strong></div>
          <div class="totals-row"><span>Parts</span><strong>${money(quote.partsCents)}</strong></div>
          ${
            quote.taxCents > 0
              ? `<div class="totals-row"><span>${escapeHtml(taxRowLabel(quote.taxMode))}</span><strong>${money(quote.taxCents)}</strong></div>`
              : ''
          }
          <div class="totals-row grand"><span>Estimate total</span><strong>${money(quote.totalCents)}</strong></div>
        </div>
      </div>

      <div class="warn">
        This is an estimate, not a final invoice. Parts pricing and availability can move, and
        additional faults are sometimes only visible once work begins. Anything beyond what is
        listed above will be priced and approved by you before it is carried out.
      </div>

      ${
        quote.notes?.trim()
          ? `<div class="notes"><strong>Notes</strong><br/>${escapeHtml(quote.notes.trim())}</div>`
          : ''
      }

      <div class="footer">
        <div>
          <strong>12-Month / 12,000-Mile warranty</strong>
          Parts and labor supplied by Adaptivity Performance are covered for 12 months or 12,000 miles, whichever comes first.
        </div>
        <div>
          <strong>Questions or ready to book?</strong>
          ${escapeHtml(SITE_PHONE_DISPLAY)}<br/>
          ${escapeHtml(SITE_ORIGIN.replace(/^https?:\/\//, ''))}<br/>
          hello@adaptivityperformance.com
        </div>
      </div>

      <p class="thanks">Thank you for considering Adaptivity Performance.</p>
    </div>
  </div>
  <p class="print-hint">Use Print → Save as PDF if the dialog does not open automatically.</p>
  <script>window.addEventListener('load',function(){setTimeout(function(){window.print()},350)});</script>
</body>
</html>`;
}

export function openQuotePrintWindow(quote: Quote) {
  openPrintableHtmlWindow(buildQuoteHtml(quote), { width: 860, height: 1080 });
}
