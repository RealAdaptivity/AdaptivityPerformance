# Retired edge functions

These slugs still exist in the Supabase project but have been overwritten with
an inert body that returns `410 Gone`, holds no credentials, calls no
third-party API and touches no data. All of them now also require a JWT
(`verify_jwt: true`), where several previously did not.

They are **not deleted** because Supabase edge functions cannot be deleted
through the tooling this project has: the MCP server exposes no delete method,
and the environment's network policy blocks the Management API. Deleting them
is a one-click job in the Supabase dashboard
(Edge Functions → the function → Settings → Delete) whenever someone is there.

`tombstone.ts` in this directory is the exact body that was deployed to each.

## Online payments (retired — payment is taken in person with Square)

    add-booking-tip                  admin-adjust-capture
    admin-cancel-booking-hold        admin-refund-booking
    admin-retry-transfer             attach-tech-debit-card
    cancel-booking-hold              capture-booking-payment
    cleanup-expired-holds            configure-stripe-webhook-events
    create-account-session           create-booking-with-hold
    create-connect-account           create-payment-intent
    create-stripe-account-link       stripe-webhook
    sync-tech-tax-status             trigger-instant-payout

`create-booking-with-hold` is replaced by `create-booking-request`. It was
still deployed with `verify_jwt: false`, so until it was retired anyone could
call it to create a booking outside the current flow.

`square-webhook` belonged to an abandoned attempt to process cards on the
website through Square. It has nothing to do with the in-person Square
terminal, which needs no integration here.

## Quote flow (superseded)

    approve-booking-quote            decline-booking-quote
    submit-booking-quote

These already returned `410` before being retired, but still bundled a full
Stripe client that read `STRIPE_SECRET_KEY`.

## One-off operator scripts

    cleanup-test-jobs                cleanup-test-techs
    delete-duplicate-keshon          diag-tech-emails

All four were deployed with `verify_jwt: false`, so anyone who knew the URL
could delete jobs and technicians or read technician emails without
authenticating.
