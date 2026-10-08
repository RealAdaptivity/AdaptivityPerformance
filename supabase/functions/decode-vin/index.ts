import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { handleCors, jsonResponse } from '../_shared/http.ts';
import { isVinShaped, normalizeVin, summarizeVpic } from '../_shared/vinDecode.ts';

/**
 * decode-vin — year, make, model, trim and engine for a VIN, from NHTSA's free
 * vPIC service. Used by the booking form (customers are not signed in) and
 * the admin dashboard.
 *
 * Body: { vin }. vPIC needs no key but sends no CORS headers, which is why the
 * browser asks here instead of calling it directly. Read-only, public data.
 */

const VPIC = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues';

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const vin = normalizeVin(typeof body.vin === 'string' ? body.vin : '');
    if (!isVinShaped(vin)) {
      return jsonResponse(
        { error: 'Enter all 17 characters of the VIN. VINs never use the letters I, O or Q.' },
        400
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    let res: Response;
    try {
      res = await fetch(`${VPIC}/${vin}?format=json`, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      return jsonResponse({ error: 'The VIN lookup service is not answering right now. Enter the vehicle by hand.' }, 502);
    }
    const data = await res.json().catch(() => null);
    const summary = summarizeVpic(data?.Results?.[0] ?? null, vin);
    if (!summary) {
      return jsonResponse({ error: 'We could not find that VIN. Check it against the windshield or door sticker.' }, 404);
    }
    return jsonResponse({ summary });
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === 'AbortError';
    return jsonResponse(
      { error: aborted ? 'The VIN lookup took too long. Try again, or enter the vehicle by hand.' : 'Could not look up that VIN.' },
      aborted ? 504 : 500
    );
  }
});
