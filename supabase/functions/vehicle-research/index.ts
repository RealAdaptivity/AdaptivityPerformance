import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleCors, jsonResponse } from '../_shared/http.ts';
import { isVinShaped, normalizeVin, summarizeVpic, type VinSummary } from '../_shared/vinDecode.ts';
import { researchLinks, summarizeComplaints, summarizeRecalls } from '../_shared/vehicleResearch.ts';

/**
 * vehicle-research — NHTSA safety recalls and owner complaints for a vehicle,
 * for the admin dashboard's Research tab.
 *
 * Body: { vin } (decoded first, through vPIC) or { year, make, model }.
 * Staff only: unlike decode-vin, which the public booking form uses, this is
 * a dashboard tool, so the caller must be a signed-in admin or tech. The data
 * itself is public and read-only; NHTSA sends no CORS headers, which is why
 * the browser asks here.
 */

const VPIC = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues';
const NHTSA = 'https://api.nhtsa.gov';

async function getJson(url: string, ms = 10000): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

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
    if (!user) return jsonResponse({ error: 'Sign in to use vehicle research.' }, 401);
    const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: profile } = await service.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (profile?.role !== 'admin' && profile?.role !== 'tech') {
      return jsonResponse({ error: 'Vehicle research is for Adaptivity staff.' }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const rawVin = typeof body.vin === 'string' ? normalizeVin(body.vin) : '';
    let decoded: VinSummary | null = null;
    let year = typeof body.year === 'string' ? body.year.trim() : String(body.year ?? '').trim();
    let make = typeof body.make === 'string' ? body.make.trim() : '';
    let model = typeof body.model === 'string' ? body.model.trim() : '';

    if (rawVin) {
      if (!isVinShaped(rawVin)) {
        return jsonResponse({ error: 'Enter all 17 characters of the VIN. VINs never use the letters I, O or Q.' }, 400);
      }
      const vpic = (await getJson(`${VPIC}/${rawVin}?format=json`, 8000)) as { Results?: Record<string, unknown>[] } | null;
      decoded = summarizeVpic(vpic?.Results?.[0] ?? null, rawVin);
      if (!decoded) {
        return jsonResponse({ error: 'We could not decode that VIN. Check it, or search by year, make and model.' }, 404);
      }
      year = decoded.year || year;
      make = decoded.make || make;
      model = decoded.model || model;
    }

    if (!/^\d{4}$/.test(year) || !make || !model) {
      return jsonResponse({ error: 'Enter a VIN, or the year, make and model.' }, 400);
    }

    const q = `make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${encodeURIComponent(year)}`;
    const [recallsJson, complaintsJson] = await Promise.all([
      getJson(`${NHTSA}/recalls/recallsByVehicle?${q}`),
      getJson(`${NHTSA}/complaints/complaintsByVehicle?${q}`),
    ]);

    return jsonResponse({
      vehicle: { vin: rawVin || null, year, make, model, decoded },
      recalls: recallsJson ? summarizeRecalls(recallsJson) : null,
      complaints: complaintsJson ? summarizeComplaints(complaintsJson) : null,
      links: researchLinks({ vin: rawVin || null, year, make, model }),
    });
  } catch (e) {
    console.error('[vehicle-research]', e instanceof Error ? e.message : e);
    return jsonResponse({ error: 'Vehicle research failed. Try again.' }, 500);
  }
});
