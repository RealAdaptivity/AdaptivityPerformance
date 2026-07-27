/** Build a printable HTML receipt (browser print → Save as PDF). */

export type ReceiptData = {
  referenceCode: string;
  customerName: string;
  vehicle: string;
  services: string[];
  totalDollars: number;
  paymentStatus: string;
  dateLabel: string;
  address?: string;
};

export function buildReceiptHtml(data: ReceiptData): string {
  const lines = data.services.map((s) => `<li>${escapeHtml(s)}</li>`).join('');
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Receipt ${escapeHtml(data.referenceCode)}</title>
<style>
  body{font-family:Georgia,serif;max-width:640px;margin:40px auto;color:#111;padding:0 16px}
  h1{font-size:22px;letter-spacing:.04em;margin:0}
  .sub{color:#555;font-size:13px;margin:4px 0 24px}
  .row{display:flex;justify-content:space-between;margin:8px 0;font-size:14px}
  .total{font-size:18px;font-weight:700;border-top:1px solid #ddd;padding-top:12px;margin-top:16px}
  ul{padding-left:18px;margin:8px 0}
  @media print{body{margin:0}}
</style></head><body>
  <h1>ADAPTIVITY PERFORMANCE</h1>
  <p class="sub">Mobile service receipt · ${escapeHtml(data.dateLabel)}</p>
  <div class="row"><span>Booking</span><strong>${escapeHtml(data.referenceCode)}</strong></div>
  <div class="row"><span>Customer</span><span>${escapeHtml(data.customerName)}</span></div>
  <div class="row"><span>Vehicle</span><span>${escapeHtml(data.vehicle)}</span></div>
  ${data.address ? `<div class="row"><span>Address</span><span>${escapeHtml(data.address)}</span></div>` : ''}
  <div class="row"><span>Payment</span><span>${escapeHtml(data.paymentStatus)}</span></div>
  <p style="margin:16px 0 4px;font-size:13px;color:#555">Services</p>
  <ul>${lines || '<li>—</li>'}</ul>
  <div class="row total"><span>Total</span><span>$${data.totalDollars.toFixed(2)}</span></div>
  <p class="sub" style="margin-top:32px">Thank you for choosing Adaptivity Performance.</p>
  <script>window.onload=()=>window.print()</script>
</body></html>`;
}

export function openReceiptPrintWindow(data: ReceiptData) {
  const html = buildReceiptHtml(data);
  const w = window.open('', '_blank', 'noopener,noreferrer,width=720,height=900');
  if (!w) throw new Error('Pop-up blocked — allow pop-ups to download/print the receipt.');
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
