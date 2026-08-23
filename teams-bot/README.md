# Adaptivity Performance — Microsoft Teams Bot

This Edge Function sends a Microsoft Teams channel notification whenever a new customer booking is created.

## How It Works

1. The `notify-teams-new-booking` Supabase Edge Function is called from the `create-booking-with-hold` flow (or via a Supabase Database Webhook).
2. It posts a rich Adaptive Card message to your Teams channel via an **Incoming Webhook URL**.

## Setup

### 1. Create a Teams Incoming Webhook
1. Open Microsoft Teams → Go to the channel you want notifications in
2. Click `···` (More options) → **Connectors**
3. Find **Incoming Webhook** → Configure → Give it a name like `Adaptivity Bookings`
4. Copy the **Webhook URL**

### 2. Add the Webhook URL to Supabase Secrets
```bash
npx supabase secrets set TEAMS_WEBHOOK_URL=https://your-org.webhook.office.com/webhookb2/...
```

### 3. Deploy the Function
```bash
npx supabase functions deploy notify-teams-new-booking
```

### 4. Trigger Options
**Option A — Call from create-booking-with-hold** (automatic on every booking)  
Add to `supabase/functions/create-booking-with-hold/index.ts` after a booking is created:
```ts
// Fire-and-forget Teams notification
fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notify-teams-new-booking`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
  body: JSON.stringify({ bookingId }),
});
```

**Option B — Supabase Database Webhook** (no code changes needed)  
In Supabase Dashboard → Database → Webhooks → Create:
- Table: `bookings`
- Events: `INSERT`
- URL: `https://qqyairzymqpkbfxobztx.supabase.co/functions/v1/notify-teams-new-booking`

## Notification Preview

```
📅 New Booking — AP-1234
Customer: John Smith
Vehicle: 2019 Ford F-150
Service: Oil Change, Brake Inspection
Address: 123 Main St, Dallas TX
Time: Today · Morning (8am–12pm)
```
