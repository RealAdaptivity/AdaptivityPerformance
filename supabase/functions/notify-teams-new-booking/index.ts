import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * notify-teams-new-booking
 *
 * Posts a rich Adaptive Card notification to a Microsoft Teams channel
 * via an Incoming Webhook when a new booking is created.
 *
 * Environment secrets required:
 *   TEAMS_WEBHOOK_URL  — Teams Incoming Webhook URL from channel connector
 *   SUPABASE_URL       — auto-provided by Supabase
 *   SUPABASE_SERVICE_ROLE_KEY — auto-provided by Supabase
 *
 * Payload (from database webhook or direct call):
 *   { bookingId: string }       — fetch full record from DB
 *   OR { record: BookingRow }   — raw record from Supabase DB webhook trigger
 */

type BookingRecord = {
  id: string;
  reference_code: string;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string;
  vehicle_description: string | null;
  services: string | null;
  preferred_date: string | null;
  preferred_time_window: string | null;
  customer_notes: string | null;
  location_type: string | null;
  total_estimate: number | null;
  created_at: string;
};

function formatTimeWindow(window: string | null): string {
  if (!window) return 'Flexible';
  const map: Record<string, string> = {
    morning: 'Morning (8am–12pm)',
    afternoon: 'Afternoon (12pm–5pm)',
    evening: 'Evening (5pm–8pm)',
    anytime: 'Anytime',
  };
  return map[window.toLowerCase()] ?? window;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'TBD';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function buildTeamsCard(booking: BookingRecord): object {
  const refCode = booking.reference_code || 'N/A';
  const name = booking.customer_name || 'Unknown Customer';
  const phone = booking.customer_phone || 'No phone';
  const address = booking.customer_address || 'No address';
  const vehicle = booking.vehicle_description || 'Vehicle not specified';
  const services = booking.services || 'Services not specified';
  const date = formatDate(booking.preferred_date);
  const window = formatTimeWindow(booking.preferred_time_window);
  const notes = booking.customer_notes || '';
  const locType = booking.location_type === 'residential' ? '🏠 Residential' : booking.location_type === 'commercial' ? '🏢 Commercial' : '📍 Roadside';
  const estimate = booking.total_estimate ? `$${booking.total_estimate.toFixed(2)}` : null;

  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type: 'Container',
              style: 'emphasis',
              items: [
                {
                  type: 'ColumnSet',
                  columns: [
                    {
                      type: 'Column',
                      width: 'auto',
                      items: [
                        {
                          type: 'TextBlock',
                          text: '📅',
                          size: 'ExtraLarge',
                        },
                      ],
                    },
                    {
                      type: 'Column',
                      width: 'stretch',
                      items: [
                        {
                          type: 'TextBlock',
                          text: `New Booking — ${refCode}`,
                          weight: 'Bolder',
                          size: 'Large',
                          color: 'Accent',
                        },
                        {
                          type: 'TextBlock',
                          text: `Received ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`,
                          isSubtle: true,
                          size: 'Small',
                          spacing: 'None',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              type: 'FactSet',
              facts: [
                { title: '👤 Customer', value: name },
                { title: '📞 Phone', value: phone },
                { title: '🚗 Vehicle', value: vehicle },
                { title: '🔧 Service', value: services },
                { title: '📍 Address', value: `${address} ${locType}` },
                { title: '📆 Date', value: `${date} · ${window}` },
                ...(estimate ? [{ title: '💰 Estimate', value: estimate }] : []),
                ...(notes ? [{ title: '📝 Notes', value: notes }] : []),
              ],
            },
          ],
          actions: [
            {
              type: 'Action.OpenUrl',
              title: '🖥️ Open Admin Dispatch',
              url: 'https://realadaptivity.github.io/AdaptivityPerformance/admin',
            },
          ],
          msteams: {
            width: 'Full',
          },
        },
      },
    ],
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const webhookUrl = Deno.env.get('TEAMS_WEBHOOK_URL');
  if (!webhookUrl) {
    console.error('TEAMS_WEBHOOK_URL secret is not set');
    return new Response(JSON.stringify({ error: 'Teams webhook not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = (await req.json()) as {
      bookingId?: string;
      record?: BookingRecord; // Supabase DB webhook sends { type, table, record, ... }
    };

    let booking: BookingRecord | null = null;

    // If called from a Supabase DB webhook, the record is in body.record
    if (body.record && body.record.id) {
      booking = body.record;
    } else if (body.bookingId) {
      // Otherwise fetch by bookingId
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      const { data, error } = await supabase
        .from('bookings')
        .select('id, reference_code, customer_name, customer_phone, customer_address, vehicle_description, services, preferred_date, preferred_time_window, customer_notes, location_type, total_estimate, created_at')
        .eq('id', body.bookingId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      booking = data as BookingRecord | null;
    }

    if (!booking) {
      return new Response(JSON.stringify({ error: 'No booking data found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const card = buildTeamsCard(booking);

    const teamsRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    });

    if (!teamsRes.ok) {
      const text = await teamsRes.text();
      throw new Error(`Teams webhook responded with ${teamsRes.status}: ${text}`);
    }

    return new Response(JSON.stringify({ ok: true, message: `Teams notified for booking ${booking.reference_code}` }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    console.error('Teams notification error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
