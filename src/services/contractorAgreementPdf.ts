/** Independent contractor agreement — printable HTML (browser print → PDF). */

import {
  TECH_INSURANCE_RECOMMENDATION,
  TECH_LIABILITY_SUMMARY,
  TECH_WORKERS_COMP_NOTICE,
} from '../content/contractorLiability';
import { FORM_1099_NEC_NOTICE } from '../content/taxForms';
import { openPrintableHtmlWindow } from './openPrintableHtml';

export function buildContractorAgreementHtml(opts?: {
  signerName?: string;
  signedAt?: string | null;
}): string {
  const name = escapeHtml(opts?.signerName?.trim() || '________________________');
  const signed = opts?.signedAt
    ? escapeHtml(new Date(opts.signedAt).toLocaleString())
    : '________________________';
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Adaptivity Independent Contractor Agreement</title>
<style>
  body{font-family:Georgia,serif;max-width:720px;margin:40px auto;color:#111;background:#fff;padding:0 20px;line-height:1.45;font-size:14px}
  h1{font-size:22px;margin:0 0 8px;color:#111}
  h2{font-size:15px;margin:22px 0 8px;color:#111}
  .sub{color:#555;font-size:12px;margin:0 0 24px}
  p{margin:0 0 10px;color:#111}
  .sign{margin-top:36px;border-top:1px solid #ddd;padding-top:16px}
  @media print{body{margin:12px}}
</style></head><body>
  <h1>Independent Contractor Agreement</h1>
  <p class="sub">Adaptivity Performance LLC · 1099 contractor terms</p>

  <h2>1. Relationship</h2>
  <p>You are an independent contractor (1099), not an employee. You control your tools, methods, and schedule within platform dispatch rules.</p>

  <h2>2. Liability for customer vehicles</h2>
  <p>${escapeHtml(TECH_LIABILITY_SUMMARY)}</p>
  <p>${escapeHtml(TECH_INSURANCE_RECOMMENDATION)}</p>

  <h2>3. Texas workers' compensation / injury insurance</h2>
  <p>${escapeHtml(TECH_WORKERS_COMP_NOTICE)}</p>

  <h2>4. Tax forms</h2>
  <p>You must provide a tax ID (SSN or EIN) via Stripe Express (Form W-9 purpose) before claiming your first job.</p>
  <p>${escapeHtml(FORM_1099_NEC_NOTICE)}</p>

  <h2>5. Payments</h2>
  <p>Customer payments are processed through Adaptivity. Revenue-share techs keep 70% of labor billed (30% platform) plus 100% of tips, subject to Stripe Connect payouts. Side cash / Zelle for Adaptivity jobs is prohibited.</p>

  <div class="sign">
    <p><strong>Contractor name:</strong> ${name}</p>
    <p><strong>Date accepted:</strong> ${signed}</p>
    <p style="margin-top:16px;font-size:12px;color:#555">Accepted electronically in the Adaptivity tech portal / application.</p>
  </div>
  <script>window.addEventListener('load',function(){setTimeout(function(){window.print()},250)});</script>
</body></html>`;
}

export function openContractorAgreementPrintWindow(opts?: {
  signerName?: string;
  signedAt?: string | null;
}) {
  openPrintableHtmlWindow(buildContractorAgreementHtml(opts));
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
