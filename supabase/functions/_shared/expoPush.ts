/** Expo Push API — send to registered device tokens. */

export type PushResult = {
  sent: number;
  skipped?: string;
  errors: string[];
};

export async function sendExpoPush(
  tokens: string[],
  message: { title: string; body: string; data?: Record<string, unknown> }
): Promise<PushResult> {
  const unique = [...new Set(tokens.map((t) => t.trim()).filter(Boolean))];
  if (unique.length === 0) return { sent: 0, skipped: 'No push tokens', errors: [] };

  const payload = unique.map((to) => ({
    to,
    sound: 'default',
    title: message.title,
    body: message.body,
    data: message.data ?? {},
  }));

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    return { sent: 0, errors: [data?.errors?.[0]?.message || `Expo push failed (${res.status})`] };
  }

  const tickets = Array.isArray(data?.data) ? data.data : [data?.data].filter(Boolean);
  const errors: string[] = [];
  let sent = 0;
  for (const t of tickets) {
    if (t?.status === 'ok') sent += 1;
    else if (t?.message) errors.push(String(t.message));
  }
  return { sent, errors };
}
