import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { jsonResponse, stripeRequest } from '../_shared/stripe.ts';

type StripeAccount = { individual?: { id_number_provided?: boolean } | null; company?: { tax_id_provided?: boolean } | null; requirements?: { currently_due?: string[]; past_due?: string[] } };
function verifiedTaxId(account: StripeAccount) {
  const due = [...(account.requirements?.currently_due ?? []), ...(account.requirements?.past_due ?? [])];
  return Boolean(account.individual?.id_number_provided || account.company?.tax_id_provided) && !due.some((field) => /id_number|ssn|tax_id|individual\.verification\.document/.test(field));
}
Deno.serve(async (req) => {
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);
  const expected = Deno.env.get('CLEANUP_CRON_SECRET')?.trim();
  if (!expected || req.headers.get('x-cron-secret')?.trim() !== expected) return jsonResponse({ error: 'Unauthorized' }, 401);
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: rows, error } = await supabase.from('mechanic_details').select('profile_id, stripe_account_id, w9_completed_at').not('stripe_account_id', 'is', null);
  if (error) return jsonResponse({ error: error.message }, 500);
  const results: Array<{ profileId: string; verified: boolean; error?: string }> = [];
  for (const row of rows ?? []) {
    try {
      const account = await stripeRequest(`/accounts/${row.stripe_account_id}`, 'GET') as StripeAccount;
      const verified = verifiedTaxId(account);
      await supabase.from('mechanic_details').update({ tax_id_provided: verified, w9_completed_at: verified ? (row.w9_completed_at ?? new Date().toISOString()) : null }).eq('profile_id', row.profile_id);
      results.push({ profileId: row.profile_id, verified });
    } catch (cause) {
      results.push({ profileId: row.profile_id, verified: false, error: cause instanceof Error ? cause.message : 'Stripe lookup failed' });
    }
  }
  return jsonResponse({ ok: results.every((row) => !row.error), results });
});
