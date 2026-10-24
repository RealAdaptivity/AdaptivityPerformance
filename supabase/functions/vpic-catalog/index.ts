import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse } from '../_shared/http.ts';

/**
 * vpic-catalog — the models NHTSA lists for a make and model year, for AP
 * Data's vehicle picker (motorcycles and motorhomes, which its keyless
 * catalog lacks).
 *
 * Body: { make, year, type? } where type is "motorcycle" or absent.
 * Answers { models: [{ make, model }] }. NHTSA matches the make loosely
 * ("thor" also finds "Thorp Equipment"), so the caller keeps only the make
 * names it expects.
 *
 * Staff only, like vehicle-research. The data is public and read-only; NHTSA
 * sends no CORS headers, which is why the browser asks here.
 */

const VPIC = 'https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear';
const TYPES = new Set(['motorcycle']);

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const asUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await asUser.auth.getUser();
    if (!user) return jsonResponse({ error: 'Sign in to use the vehicle catalog.' }, 401);
    const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: profile } = await service.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (profile?.role !== 'admin' && profile?.role !== 'tech') {
      return jsonResponse({ error: 'The vehicle catalog is for Adaptivity staff.' }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const make = typeof body.make === 'string' ? body.make.trim().toLowerCase() : '';
    const year = String(body.year ?? '').trim();
    const type = typeof body.type === 'string' ? body.type.trim().toLowerCase() : '';
    if (!/^[a-z0-9][a-z0-9 .&'-]{0,39}$/.test(make)) return jsonResponse({ error: 'Unknown make.' }, 400);
    if (!/^(19[89]\d|20\d\d)$/.test(year)) return jsonResponse({ error: 'Unknown model year.' }, 400);
    if (type && !TYPES.has(type)) return jsonResponse({ error: 'Unknown vehicle type.' }, 400);

    const url = `${VPIC}/make/${encodeURIComponent(make)}/modelyear/${year}${type ? `/vehicletype/${type}` : ''}?format=json`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    let res: Response;
    try {
      res = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) return jsonResponse({ error: 'NHTSA did not answer. Try again.' }, 502);
    const json = (await res.json().catch(() => null)) as { Results?: Record<string, unknown>[] } | null;
    const models = (json?.Results ?? [])
      .map((r) => ({ make: String(r.Make_Name ?? '').trim(), model: String(r.Model_Name ?? '').trim() }))
      .filter((m) => m.make && m.model);
    return new Response(JSON.stringify({ models }), {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch (e) {
    console.error('vpic-catalog', e);
    return jsonResponse({ error: 'The vehicle catalog failed. Try again.' }, 500);
  }
});
