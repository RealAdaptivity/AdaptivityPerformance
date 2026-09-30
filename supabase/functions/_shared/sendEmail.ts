/** Email through Resend (resend.com). No-ops, like twilioSms, until its
 *  secrets are set:
 *    RESEND_API_KEY      — from the Resend dashboard
 *    RECEIPT_FROM_EMAIL  — a sender on a domain verified in Resend, e.g.
 *                          "Adaptivity Performance <receipts@adaptivityperformance.com>"
 */

export type SendEmailResult = { sent: boolean; id?: string; skipped?: string; error?: string };

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<SendEmailResult> {
  const apiKey = Deno.env.get('RESEND_API_KEY')?.trim();
  const from = Deno.env.get('RECEIPT_FROM_EMAIL')?.trim();
  if (!apiKey || !from) {
    return { sent: false, skipped: 'Email not configured (set RESEND_API_KEY and RECEIPT_FROM_EMAIL)' };
  }
  const to = opts.to.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { sent: false, error: 'Invalid email address' };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { sent: false, error: (data as { message?: string }).message || `Email error (${res.status})` };
  return { sent: true, id: (data as { id?: string }).id };
}
