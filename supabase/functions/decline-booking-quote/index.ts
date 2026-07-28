import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { handleCors, jsonResponse } from './_shared/stripe.ts';

/** Deprecated: use capture-booking-payment with mode diagnostic_only from the assigned tech. */
Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  return jsonResponse(
    {
      error:
        'Decline-quote is no longer used. Ask your technician to charge diagnostic only if you skip repairs.',
    },
    410
  );
});
