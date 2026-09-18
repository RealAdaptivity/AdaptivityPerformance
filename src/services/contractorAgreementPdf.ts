/** Independent contractor agreement — printable HTML (browser print → PDF). */

import { CONTRACTOR_AGREEMENT_SECTIONS } from '../content/contractorAgreementText';
import { openPrintableHtmlWindow } from './openPrintableHtml';
import { CONTRACTOR_AGREEMENT_VERSION } from './contractorAgreement';

export function buildContractorAgreementHtml(opts?: {
  signerName?: string;
  signedAt?: string | null;
  signatureImageUrl?: string | null;
  agreementVersion?: string | null;
}): string {
  const name = escapeHtml(opts?.signerName?.trim() || '________________________');
  const signed = opts?.signedAt
    ? escapeHtml(new Date(opts.signedAt).toLocaleString())
    : '________________________';
  const version = escapeHtml(opts?.agreementVersion || CONTRACTOR_AGREEMENT_VERSION);
  const sigImg = opts?.signatureImageUrl
    ? `<img src="${escapeHtml(opts.signatureImageUrl)}" alt="Signature" style="max-width:280px;max-height:90px;display:block;margin:8px 0;border-bottom:1px solid #111"/>`
    : `<div style="height:72px;border-bottom:1px solid #111;margin:8px 0 4px"></div>`;

  const sections = CONTRACTOR_AGREEMENT_SECTIONS.map((section, i) => {
    const blocks = section.blocks
      .map((b) => {
        if (b.kind === 'p') return `<p>${escapeHtml(b.text)}</p>`;
        const tag = b.kind === 'ol' ? 'ol' : 'ul';
        const items = b.items.map((it) => `<li>${escapeHtml(it)}</li>`).join('');
        return `<${tag}>${items}</${tag}>`;
      })
      .join('');
    return `<h2${i === 0 ? ' class="first"' : ''}>${escapeHtml(section.heading)}</h2>${blocks}`;
  }).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Adaptivity Independent Contractor Agreement</title>
<style>
  body{font-family:Georgia,serif;max-width:720px;margin:40px auto;color:#111;background:#fff;padding:0 20px;line-height:1.45;font-size:14px}
  h1{font-size:22px;margin:0 0 8px;color:#111}
  h2{font-size:15px;margin:22px 0 8px;color:#111}
  h2.first{margin-top:16px}
  .sub{color:#555;font-size:12px;margin:0 0 24px}
  p{margin:0 0 10px;color:#111}
  ul,ol{margin:0 0 10px;padding-left:22px}
  li{margin:0 0 6px}
  .sign{margin-top:36px;border-top:1px solid #ddd;padding-top:16px}
  .esign{font-size:11px;color:#555;margin-top:12px}
  @media print{button{display:none}body{margin:12px}h2{page-break-after:avoid}}
</style></head><body>
  <h1>Independent Contractor Agreement</h1>
  <p class="sub">Adaptivity Performance LLC \u00b7 1099 contractor terms \u00b7 Version ${version}</p>

  ${sections}

  <div class="sign">
    <p><strong>Electronic signature</strong></p>
    ${sigImg}
    <p><strong>Contractor legal name:</strong> ${name}</p>
    <p><strong>Date signed:</strong> ${signed}</p>
    <p class="esign">By signing, you agree this electronic signature is the legal equivalent of your handwritten signature under the federal E-SIGN Act (15 U.S.C. \u00a7 7001) and applicable Texas law. Record retained by Adaptivity Performance LLC.</p>
  </div>
  <p style="text-align:center;margin:18px 0 28px"><button type="button" onclick="window.print()" style="appearance:none;border:0;cursor:pointer;font:inherit;background:#ea580c;color:#fff;font-weight:700;font-size:13px;padding:11px 22px;border-radius:10px">Print / Save as PDF</button><br/><span style="color:#94a3b8;font-size:11px">If the print dialog did not open automatically, tap the button above.</span></p>
</body></html>`;
}

export function openContractorAgreementPrintWindow(opts?: {
  signerName?: string;
  signedAt?: string | null;
  signatureImageUrl?: string | null;
  agreementVersion?: string | null;
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
