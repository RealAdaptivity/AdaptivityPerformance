import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { jsonResponse, stripeRequest } from '../_shared/stripe.ts';

const REQUIRED_EVENTS = ['payment_intent.amount_capturable_updated', 'payment_intent.canceled', 'payment_intent.payment_failed', 'payment_intent.succeeded', 'charge.refunded', 'charge.dispute.created', 'charge.dispute.updated', 'charge.dispute.closed', 'account.updated', 'balance.available', 'payout.paid', 'payout.failed'];

Deno.serve(async (req) => {
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);
  const expected = Deno.env.get('CLEANUP_CRON_SECRET')?.trim();
  if (!expected || req.headers.get('x-cron-secret')?.trim() !== expected) return jsonResponse({ error: 'Unauthorized' }, 401);
  try {
    const list = await stripeRequest('/webhook_endpoints?limit=100', 'GET');
    const targetUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/stripe-webhook`;
    const endpoints = (list.data ?? []).filter((endpoint: { url?: string }) => endpoint.url === targetUrl);
    const updated: Array<{ id: string; added: string[] }> = [];
    for (const endpoint of endpoints) {
      const current = Array.isArray(endpoint.enabled_events) ? endpoint.enabled_events : [];
      if (current.includes('*')) { updated.push({ id: endpoint.id, added: [] }); continue; }
      const missing = REQUIRED_EVENTS.filter((event) => !current.includes(event));
      if (missing.length > 0) await stripeRequest(`/webhook_endpoints/${endpoint.id}`, 'POST', { enabled_events: [...new Set([...current, ...REQUIRED_EVENTS])] });
      updated.push({ id: endpoint.id, added: missing });
    }
    return jsonResponse({ ok: endpoints.length > 0, targetUrl, endpoints: updated });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Webhook sync failed' }, 500);
  }
});
