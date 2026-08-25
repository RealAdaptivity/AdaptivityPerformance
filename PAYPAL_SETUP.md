# PayPal cutover — setup steps

Everything here has to run on your machine or in a dashboard. None of it can be
done from the Claude session: `api-m.paypal.com` is blocked by that environment's
network policy, and the Supabase connection there points at a different account.

Work top to bottom. Step 1 gates everything after it.

---

## 1. Verify the API contract

Nothing below matters until this passes. The client was written against PayPal's
published Orders v2 / Payments v2 contract and has never made a call to a real
account.

```powershell
cd "path\to\AdaptivityPerformance"
$env:PAYPAL_CLIENT_ID="<client id>"
$env:PAYPAL_CLIENT_SECRET="<secret>"
$env:PAYPAL_MODE="sandbox"      # must match which credential pair you used
node scripts/verify-paypal.mjs
```

Live credentials require `PAYPAL_MODE=live`; sandbox credentials require
`sandbox`. Mixing them reads as a credential rejection and sends you debugging
the wrong thing.

Four checks run. **Checks 1 and 3 (authentication and CAPTURE orders) are the
ones that matter** — those are what the deposit and payment-link flows use.

Checks 2 and 4 (AUTHORIZE orders and card vaulting) are no longer used by any
code path. The deposit is charged rather than held, so nothing depends on
authorizations or a stored card. They can fail without blocking anything.

---

## 2. Enable Advanced Card Payments

In the PayPal dashboard, confirm Advanced Credit and Debit Card Payments is
active. Without it, customers see a "call us" fallback instead of a card form —
the code handles that case deliberately, but it is not a working checkout.

---

## 3. Supabase Edge Function secrets

Project Settings → Edge Functions → Secrets, on project `qqyairzymqpkbfxobztx`:

| Secret | Value |
|---|---|
| `PAYPAL_CLIENT_ID` | from developer.paypal.com |
| `PAYPAL_CLIENT_SECRET` | from developer.paypal.com |
| `PAYPAL_MODE` | `sandbox`, then `live` after testing |
| `PAYPAL_WEBHOOK_ID` | only needed once a webhook receiver exists |

---

## 4. GitHub repo secrets

Settings → Secrets and variables → Actions. **The deploy workflow builds the
live site on every push to `main`, and the build fails to produce a working
booking flow without these** — `config/paypalEnvironment.ts` throws when the
client id for the active mode is missing.

| Secret | Value |
|---|---|
| `VITE_PAYPAL_MODE` | `sandbox` until a real booking is tested |
| `VITE_PAYPAL_SANDBOX_CLIENT_ID` | sandbox client id (public value) |
| `VITE_PAYPAL_LIVE_CLIENT_ID` | live client id (public value) |

Only the client id goes here. The secret never leaves Supabase.

---

## 5. Apply the migrations

Two files, in order:

- `supabase/migrations/20260825130000_tech_payout_ledger.sql`
- `supabase/migrations/20260825131000_paypal_processor_columns.sql`

Both are additive — no existing column is dropped or rewritten. Every `stripe_*`
column stays, because historical rows are the audit trail for jobs already paid
through Stripe.

Without these, every payment write fails on missing columns.

---

## 6. Deploy the edge functions

```powershell
node scripts/package-edge-functions.mjs
$env:SUPABASE_ACCESS_TOKEN="<token>"
node scripts/deploy-all-edge-functions.mjs
```

---

## 7. Test one booking end to end, in sandbox

Book → hold → complete the job → capture. Use PayPal's sandbox test cards.

Do not let a real customer be the first transaction through this code.

---

## What changes for the business

**The $85 diagnostic is charged at booking, not held.** It is credited against
the repair total, and refunded in full if the appointment cannot be made. A job
that comes in under $85 refunds the difference automatically; a job over $85
leaves a balance the technician collects with a payment link.

This is stronger protection than the old hold — the money is actually collected
rather than reserved and released — and it removes the authorization window and
the stored-card dependency entirely.

**Two new payment states.** `deposit_paid` means the deposit is collected and the
job has not been settled. `balance_due` means the job is finished and the
customer still owes money. Neither is `captured`, which is reserved for a fully
settled job.

**Technicians lose instant cash-out.** Stripe Connect let them pull their balance
on demand. Earnings are now recorded in the `tech_payouts` ledger and paid in a
batch by you. Tell your techs before they find the button missing.

**Refunds on pre-cutover jobs must be manual.** Those were captured on the closed
Stripe account and cannot be refunded through the API. The admin refund screen
refuses them with an explanation rather than failing obscurely.

---

## Known gaps

- **No webhook backstop.** If a customer's browser dies between approving and
  confirming, the deposit is not recorded automatically — reconcile from the
  PayPal dashboard.
- **Balance payment links are sent manually.** When a job ends with a balance
  due, the technician taps "send payment link". Nothing goes out automatically.
- **The tech portal still shows Stripe Connect onboarding**, which is dead.
  Customer-facing flows are unaffected; technicians will see a broken payout
  setup screen until it is removed.
- **Eight edge functions still call Stripe**, all Connect-only. They are inert
  rather than harmful, and are deleted rather than ported.
