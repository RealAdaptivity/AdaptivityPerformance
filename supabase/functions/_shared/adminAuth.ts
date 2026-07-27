import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { jsonResponse } from './stripe.ts';

export async function requireAdminUser(req: Request): Promise<
  | { ok: true; userId: string; supabaseUser: SupabaseClient }
  | { ok: false; response: Response }
> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { ok: false, response: jsonResponse({ error: 'Unauthorized' }, 401) };
  }

  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const {
    data: { user },
  } = await supabaseUser.auth.getUser();
  if (!user) {
    return { ok: false, response: jsonResponse({ error: 'Unauthorized' }, 401) };
  }

  const { data: profile } = await supabaseUser
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'admin') {
    return { ok: false, response: jsonResponse({ error: 'Admin access required' }, 403) };
  }

  return { ok: true, userId: user.id, supabaseUser };
}
