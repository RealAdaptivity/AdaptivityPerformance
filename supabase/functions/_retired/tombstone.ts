import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

/**
 * Retired endpoint.
 *
 * Adaptivity Performance takes payment in person with Square; the website
 * integrates no payment processor. The original implementation of this
 * function was removed with the rest of the online-payment code.
 *
 * The slug stays deployed only because Supabase edge functions cannot be
 * deleted through the tooling available to this project. This body holds no
 * credentials, calls no third-party API and touches no data. Every request
 * is refused.
 */
Deno.serve(
  () =>
    new Response(
      JSON.stringify({
        error: 'gone',
        message: 'This endpoint has been retired and performs no action.',
      }),
      { status: 410, headers: { 'Content-Type': 'application/json' } }
    )
);
