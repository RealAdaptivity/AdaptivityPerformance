import { supabase } from './supabaseClient';

const TRADE_TO_SPECIALTY: Record<string, string> = {
  'Mechanical / ASE': 'mechanical',
  'Tire & Wheel': 'tires',
  'Tires & wheels': 'tires',
  'Auto Glass': 'glass',
  'Auto glass': 'glass',
  'Body Work': 'bodywork',
  'Body work': 'bodywork',
  'Mobile Detailing': 'detailing',
  'Mobile detailing': 'detailing',
  'Modification / Accessories': 'modification',
  'Mods / accessories': 'modification',
  Audio: 'audio',
  'Car audio': 'audio',
  Tint: 'tint',
  'Window tint': 'tint',
  'Wrap / PPF': 'wrap',
  Performance: 'performance',
};

export function tradesToSpecialties(trades: string[]): string[] {
  const mapped = trades
    .map((t) => TRADE_TO_SPECIALTY[t] || t.toLowerCase().replace(/[^a-z]/g, ''))
    .filter(Boolean);
  const allowed = new Set([
    'mechanical',
    'audio',
    'tint',
    'wrap',
    'bodywork',
    'modification',
    'detailing',
    'tires',
    'glass',
    'performance',
  ]);
  const cleaned = [...new Set(mapped.filter((s) => allowed.has(s)))];
  return cleaned.length ? cleaned : ['mechanical'];
}

export type TechApplicationInput = {
  fullName: string;
  email: string;
  phone: string;
  zipCode?: string;
  yearsExperience?: string;
  trades: string[];
  aseCerts?: string[];
  tools: Record<string, boolean>;
  hasVehicle: boolean;
  payPreference?: 'revshare' | 'hourly';
  jobCapacity?: 'multi' | 'standalone';
  liabilityAccepted: boolean;
  notes?: string;
};

export type TechApplicationRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  zipCode: string | null;
  yearsExperience: string | null;
  trades: string[];
  specialties: string[];
  aseCerts: string[];
  tools: Record<string, boolean>;
  hasVehicle: boolean;
  payPreference: string;
  jobCapacity: string;
  liabilityAccepted: boolean;
  notes: string | null;
  status: string;
  adminNotes: string | null;
  profileId: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

function mapRow(row: Record<string, unknown>): TechApplicationRow {
  return {
    id: row.id as string,
    fullName: row.full_name as string,
    email: row.email as string,
    phone: row.phone as string,
    zipCode: (row.zip_code as string | null) ?? null,
    yearsExperience: (row.years_experience as string | null) ?? null,
    trades: (row.trades as string[]) || [],
    specialties: (row.specialties as string[]) || [],
    aseCerts: (row.ase_certs as string[]) || [],
    tools: (row.tools as Record<string, boolean>) || {},
    hasVehicle: Boolean(row.has_vehicle),
    payPreference: (row.pay_preference as string) || 'revshare',
    jobCapacity: (row.job_capacity as string) || 'multi',
    liabilityAccepted: Boolean(row.liability_accepted),
    notes: (row.notes as string | null) ?? null,
    status: row.status as string,
    adminNotes: (row.admin_notes as string | null) ?? null,
    profileId: (row.profile_id as string | null) ?? null,
    createdAt: row.created_at as string,
    reviewedAt: (row.reviewed_at as string | null) ?? null,
  };
}

/** Public Join-as-Tech form — stores application for admin review. */
export async function submitTechApplication(input: TechApplicationInput) {
  if (!input.liabilityAccepted) {
    throw new Error('Liability acknowledgment is required.');
  }
  const specialties = tradesToSpecialties(input.trades);
  // Insert only — no .select(). Anon can INSERT but only admins can SELECT,
  // so RETURNING via .select() fails RLS ("new row violates row-level security policy").
  const { error } = await supabase.from('tech_applications').insert({
    full_name: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    zip_code: input.zipCode?.trim() || null,
    years_experience: input.yearsExperience?.trim() || null,
    trades: input.trades.length ? input.trades : ['Mechanical / ASE'],
    specialties,
    ase_certs: input.aseCerts || [],
    tools: input.tools || {},
    has_vehicle: Boolean(input.hasVehicle),
    pay_preference: input.payPreference === 'hourly' ? 'revshare' : 'revshare',
    job_capacity: input.jobCapacity === 'standalone' ? 'standalone' : 'multi',
    liability_accepted: true,
    notes: input.notes?.trim() || null,
    status: 'submitted',
    payload: {
      source: 'website_tech_form',
      submittedAt: new Date().toISOString(),
    },
  });

  if (error) throw new Error(error.message || 'Could not submit application. Try again.');
}

export async function fetchTechApplications(): Promise<TechApplicationRow[]> {
  const { data, error } = await supabase
    .from('tech_applications')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => mapRow(row as Record<string, unknown>));
}

export type ApproveTechResult = {
  ok: boolean;
  alreadyApproved?: boolean;
  profileLinked?: boolean;
  profileId?: string | null;
  email?: string;
  nextStep?: string;
};

export async function approveTechApplication(
  applicationId: string,
  opts?: { markToolsVerified?: boolean; adminNotes?: string }
): Promise<ApproveTechResult> {
  const { data, error } = await supabase.rpc('approve_tech_application', {
    p_application_id: applicationId,
    p_mark_tools_verified: Boolean(opts?.markToolsVerified),
    p_admin_notes: opts?.adminNotes?.trim() || null,
  });
  if (error) throw error;
  return (data || { ok: true }) as ApproveTechResult;
}

export async function rejectTechApplication(applicationId: string, adminNotes?: string) {
  const { error } = await supabase.rpc('reject_tech_application', {
    p_application_id: applicationId,
    p_admin_notes: adminNotes?.trim() || null,
  });
  if (error) throw error;
}

/** After tech signs in/up — attach approved application matching email. */
export async function linkApprovedTechApplication() {
  const { data, error } = await supabase.rpc('link_approved_tech_application');
  if (error) throw error;
  return data as { ok: boolean; reason?: string; applicationId?: string };
}
