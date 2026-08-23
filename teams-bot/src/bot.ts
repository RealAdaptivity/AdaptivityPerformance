import {
  TeamsActivityHandler,
  TurnContext,
  CardFactory,
  MessageFactory,
  ChannelInfo,
} from 'botbuilder';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BotSettings } from './config';

export class AdaptivityBot extends TeamsActivityHandler {
  private supabase: SupabaseClient;

  constructor(settings: BotSettings) {
    super();

    this.supabase = createClient(settings.supabaseUrl, settings.supabaseServiceRoleKey || 'placeholder');

    // Handle messages sent directly to the bot or mentioned in a channel
    this.onMessage(async (context: TurnContext, next: () => Promise<void>) => {
      TurnContext.removeRecipientMention(context.activity);
      const text = (context.activity.text || '').trim().toLowerCase();

      if (text.includes('booking') || text.includes('jobs') || text.includes('status')) {
        await this.handleListActiveJobs(context);
      } else if (text.includes('tech') || text.includes('mechanic')) {
        await this.handleListTechs(context);
      } else if (text === 'help' || text.includes('hi') || text.includes('hello')) {
        await this.handleHelp(context);
      } else {
        await context.sendActivity(
          MessageFactory.text(`🤖 **Adaptivity Dispatch Bot**\n\nI received: "${context.activity.text}"\n\nTry typing **"jobs"**, **"techs"**, or **"help"**.`)
        );
      }

      await next();
    });

    // Welcome message when added to team/channel
    this.onMembersAdded(async (context: TurnContext, next: () => Promise<void>) => {
      const membersAdded = context.activity.membersAdded || [];
      for (const member of membersAdded) {
        if (member.id !== context.activity.recipient.id) {
          await context.sendActivity(
            MessageFactory.text('👋 Hello! I am the **Adaptivity Performance Dispatch Bot**. I will post real-time notifications here whenever new customer bookings are created.')
          );
        }
      }
      await next();
    });
  }

  private async handleHelp(context: TurnContext): Promise<void> {
    const card = CardFactory.heroCard(
      '🤖 Adaptivity Teams Bot Commands',
      'Here is what I can do:',
      undefined,
      [
        { type: 'imBack', title: '📋 Active Jobs', value: 'jobs' },
        { type: 'imBack', title: '🔧 Technicians', value: 'techs' },
        { type: 'openUrl', title: '🖥️ Admin Dashboard', value: 'https://realadaptivity.github.io/AdaptivityPerformance/admin' },
      ]
    );
    await context.sendActivity({ attachments: [card] });
  }

  private async handleListActiveJobs(context: TurnContext): Promise<void> {
    try {
      const { data: bookings, error } = await this.supabase
        .from('bookings')
        .select('reference_code, customer_name, vehicle_description, services, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error || !bookings || bookings.length === 0) {
        await context.sendActivity('No recent bookings found.');
        return;
      }

      const listText = bookings
        .map(
          (b) =>
            `• **${b.reference_code || 'N/A'}** — ${b.customer_name || 'Customer'} (${b.vehicle_description || 'Vehicle'}) — *${b.status}*`
        )
        .join('\n');

      await context.sendActivity(MessageFactory.text(`📋 **Recent Bookings:**\n\n${listText}`));
    } catch {
      await context.sendActivity('Unable to fetch bookings right now.');
    }
  }

  private async handleListTechs(context: TurnContext): Promise<void> {
    try {
      const { data: techs, error } = await this.supabase
        .from('profiles')
        .select('full_name, email, role')
        .eq('role', 'tech');

      if (error || !techs || techs.length === 0) {
        await context.sendActivity('No technicians registered.');
        return;
      }

      const listText = techs.map((t) => `• **${t.full_name || 'Tech'}** (${t.email || 'No email'})`).join('\n');

      await context.sendActivity(MessageFactory.text(`🔧 **Active Technicians:**\n\n${listText}`));
    } catch {
      await context.sendActivity('Unable to fetch technicians right now.');
    }
  }
}
