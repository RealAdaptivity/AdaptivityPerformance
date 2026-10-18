import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config/supabasePublic';

const supabaseUrl = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_SUPABASE_URL || SUPABASE_URL;
const supabaseAnonKey = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
