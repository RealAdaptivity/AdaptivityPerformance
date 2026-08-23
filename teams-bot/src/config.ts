import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

export interface BotSettings {
  microsoftAppId: string;
  microsoftAppPassword: string;
  microsoftAppTenantId: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  port: number;
}

export function loadSettings(): BotSettings {
  return {
    microsoftAppId: process.env.MicrosoftAppId || process.env.MICROSOFT_APP_ID || '',
    microsoftAppPassword: process.env.MicrosoftAppPassword || process.env.MICROSOFT_APP_PASSWORD || '',
    microsoftAppTenantId: process.env.MicrosoftAppTenantId || process.env.MICROSOFT_APP_TENANT_ID || '',
    supabaseUrl: process.env.SUPABASE_URL || 'https://qqyairzymqpkbfxobztx.supabase.co',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    port: parseInt(process.env.PORT || '3978', 10),
  };
}
