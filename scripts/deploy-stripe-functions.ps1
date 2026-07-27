# Deploy Stripe / payout edge functions (requires `npx supabase login` once)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..
$ref = "qqyairzymqpkbfxobztx"
$names = @(
  "stripe-webhook",
  "create-payment-intent",
  "create-connect-account",
  "create-booking-with-hold",
  "capture-booking-payment",
  "trigger-instant-payout",
  "create-stripe-account-link",
  "attach-tech-debit-card",
  "create-account-session",
  "admin-cancel-booking-hold",
  "admin-adjust-capture",
  "admin-refund-booking",
  "admin-retry-transfer",
  "cancel-booking-hold",
  "bootstrap-admin"
)
foreach ($fn in $names) {
  Write-Host "Deploying $fn..."
  if ($fn -eq "stripe-webhook" -or $fn -eq "bootstrap-admin") {
    npx supabase functions deploy $fn --project-ref $ref --no-verify-jwt
  } else {
    npx supabase functions deploy $fn --project-ref $ref
  }
}
Write-Host "Done."
