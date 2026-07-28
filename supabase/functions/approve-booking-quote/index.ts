import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { handleCors, jsonResponse } from './_shared/stripe.ts';

/** Deprecated: customer quote approval removed. Tech charges on site via capture-booking-payment. */
Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  return jsonResponse(
    {
      error:
        'Quote approval is no longer used. Your technician sets labor + parts on site and charges through Adaptivity.',
    },
    410
  );
});
