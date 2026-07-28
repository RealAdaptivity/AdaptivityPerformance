import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { handleCors, jsonResponse } from './_shared/stripe.ts';

/** Deprecated: tech charges immediately via capture-booking-payment (no pending quote). */
Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  return jsonResponse(
    {
      error:
        'Submit-quote is no longer used. Use capture-booking-payment with labor/parts line items to charge the customer.',
    },
    410
  );
});
