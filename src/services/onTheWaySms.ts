/** Digits-only phone for sms:/tel: links (keeps leading + if present). */
export function normalizePhoneForSms(phone: string): string {
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
}

export function buildOnTheWayMessage(opts: {
  customerName?: string;
  referenceCode: string;
  etaMinutes?: number;
}): string {
  const first = (opts.customerName || '').trim().split(/\s+/)[0] || 'there';
  const eta =
    opts.etaMinutes != null && opts.etaMinutes > 0
      ? ` I'm about ${opts.etaMinutes} minutes out.`
      : '';
  return (
    `Hi ${first}, this is your Adaptivity Performance technician. ` +
    `I'm on the way for job ${opts.referenceCode}.${eta} ` +
    `Reply here if you need anything — see you soon!`
  );
}

/** Opens the device SMS composer (works on mobile browsers / Capacitor). */
export function openOnTheWaySms(opts: {
  phone: string;
  customerName?: string;
  referenceCode: string;
  etaMinutes?: number;
}): boolean {
  const to = normalizePhoneForSms(opts.phone);
  if (!to) return false;
  const body = encodeURIComponent(buildOnTheWayMessage(opts));
  const url = `sms:${to}?body=${body}`;
  window.location.href = url;
  return true;
}
