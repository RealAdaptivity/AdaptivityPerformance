/** Weekly tech earnings summary — printable HTML (browser print → PDF). */

export type WeeklyPayoutLine = {
  bookingReference: string | null;
  techTransferCents: number | null;
  payoutStatus: string;
  createdAt: string;
};

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function filterLast7DaysPayouts<T extends { createdAt: string }>(rows: T[]): T[] {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return rows.filter((r) => new Date(r.createdAt).getTime() >= cutoff);
}

export function buildWeeklyEarningsSummaryText(rows: WeeklyPayoutLine[]): string {
  const week = filterLast7DaysPayouts(rows);
  const total =
    week.reduce((s, r) => s + (r.techTransferCents ?? 0), 0) / 100;
  const lines = week.map((r) => {
    const dollars = ((r.techTransferCents ?? 0) / 100).toFixed(2);
    const when = new Date(r.createdAt).toLocaleDateString();
    return `• ${when} ${r.bookingReference ?? 'Job'} — $${dollars} (${r.payoutStatus})`;
  });
  return [
    'Adaptivity — Weekly earnings summary (last 7 days)',
    `Generated: ${new Date().toLocaleString()}`,
    `Total tech share: $${total.toFixed(2)}`,
    '',
    ...(lines.length ? lines : ['No payouts in the last 7 days.']),
  ].join('\n');
}

export function buildWeeklyEarningsHtml(rows: WeeklyPayoutLine[]): string {
  const week = filterLast7DaysPayouts(rows);
  const total =
    week.reduce((s, r) => s + (r.techTransferCents ?? 0), 0) / 100;
  const bodyRows =
    week.length === 0
      ? '<tr><td colspan="4">No payouts in the last 7 days.</td></tr>'
      : week
          .map((r) => {
            const dollars = ((r.techTransferCents ?? 0) / 100).toFixed(2);
            return `<tr>
              <td>${escapeHtml(new Date(r.createdAt).toLocaleDateString())}</td>
              <td>${escapeHtml(r.bookingReference ?? 'Job')}</td>
              <td>$${dollars}</td>
              <td>${escapeHtml(r.payoutStatus)}</td>
            </tr>`;
          })
          .join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Weekly earnings summary</title>
<style>
  body{font-family:Georgia,serif;max-width:720px;margin:40px auto;color:#111;padding:0 20px;line-height:1.45;font-size:14px}
  h1{font-size:22px;margin:0 0 8px}
  .sub{color:#555;font-size:12px;margin:0 0 24px}
  table{width:100%;border-collapse:collapse;margin-top:16px}
  th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:13px}
  th{background:#f5f5f5}
  .total{margin-top:20px;font-size:16px;font-weight:700}
  @media print{body{margin:12px}}
</style></head><body>
  <h1>Weekly earnings summary</h1>
  <p class="sub">Adaptivity Performance · last 7 days · ${escapeHtml(new Date().toLocaleString())}</p>
  <table>
    <thead><tr><th>Date</th><th>Job</th><th>Tech share</th><th>Status</th></tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
  <p class="total">Total tech share: $${total.toFixed(2)}</p>
  <script>window.onload=()=>window.print()</script>
</body></html>`;
}

export function openWeeklyEarningsPrintWindow(rows: WeeklyPayoutLine[]) {
  const html = buildWeeklyEarningsHtml(rows);
  const w = window.open('', '_blank', 'noopener,noreferrer,width=780,height=960');
  if (!w) throw new Error('Pop-up blocked — allow pop-ups to print/save the weekly PDF.');
  w.document.open();
  w.document.write(html);
  w.document.close();
}
