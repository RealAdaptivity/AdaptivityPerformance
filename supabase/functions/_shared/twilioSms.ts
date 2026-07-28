/** Twilio SMS helper — no-op gracefully when TWILIO_* secrets are missing. */

export type SendSmsResult = {
  sent: boolean;
  sid?: string;
  skipped?: string;
  error?: string;
};

function normalizeE164(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (phone.trim().startsWith('+') && digits.length >= 10) return `+${digits}`;
  return null;
}

export async function sendTwilioSms(toRaw: string, body: string): Promise<SendSmsResult> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')?.trim();
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')?.trim();
  const from = Deno.env.get('TWILIO_FROM_NUMBER')?.trim();

  if (!accountSid || !authToken || !from) {
    return { sent: false, skipped: 'Twilio not configured (set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER)' };
  }

  const to = normalizeE164(toRaw);
  if (!to) return { sent: false, error: 'Invalid phone number' };

  const auth = btoa(`${accountSid}:${authToken}`);
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    return { sent: false, error: data.message || `Twilio error (${res.status})` };
  }
  return { sent: true, sid: data.sid as string };
}
