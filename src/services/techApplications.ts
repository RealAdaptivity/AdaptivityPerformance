import { supabase } from './supabaseClient';
import { invokeEdgeFunction } from './edgeFunctionErrors';
import {
  planOnboarding,
  specialtyLabels,
  type ExistingApplication,
  type OnboardingInput,
} from './techOnboarding';

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

export async function updateTechApplicationEmail(applicationId: string, email: string) {
  return invokeEdgeFunction<{ ok: boolean; email: string; loginUpdated: boolean }>(
    'update-tech-application-email',
    { applicationId, email }
  );
}

export type ApproveTechResult = {
  ok: boolean;
  alreadyApproved?: boolean;
  profileLinked?: boolean;
  profileId?: string | null;
  email?: string;
  nextStep?: string;
  inviteSent?: boolean;
  inviteMode?: 'invite' | 'recovery';
};

export async function inviteApprovedTech(applicationId: string): Promise<{
  ok: boolean;
  email?: string;
  mode?: 'invite' | 'recovery';
  message?: string;
}> {
  return invokeEdgeFunction('invite-approved-tech', { applicationId });
}

export async function approveTechApplication(
  applicationId: string,
  opts?: { markToolsVerified?: boolean; adminNotes?: string; sendInvite?: boolean }
): Promise<ApproveTechResult> {
  const { data, error } = await supabase.rpc('approve_tech_application', {
    p_application_id: applicationId,
    p_mark_tools_verified: Boolean(opts?.markToolsVerified),
    p_admin_notes: opts?.adminNotes?.trim() || null,
  });
  if (error) throw error;
  const result = (data || { ok: true }) as ApproveTechResult;

  if (opts?.sendInvite === false) return result;

  try {
    const invite = await inviteApprovedTech(applicationId);
    return {
      ...result,
      inviteSent: true,
      inviteMode: invite.mode,
      nextStep:
        invite.message ||
        `Approved — password setup emailed to ${invite.email || result.email || 'the applicant'}.`,
    };
  } catch (inviteErr: unknown) {
    const msg = inviteErr instanceof Error ? inviteErr.message : 'Invite email failed';
    return {
      ...result,
      inviteSent: false,
      nextStep: `${result.nextStep || 'Approved.'} Password email failed: ${msg}. Use Resend invite.`,
    };
  }
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

export type OnboardTechResult = {
  /** created: a new application; approved: one they had already submitted;
   *  resent: they were already approved, so only the email went again. */
  outcome: 'created' | 'approved' | 'resent';
  email: string;
  inviteSent: boolean;
  message: string;
};

/**
 * Add a technician from the admin. Takes a form that has already been through
 * validateOnboarding.
 *
 * Runs the same steps as approving a website application, so the tech ends up
 * in exactly the same state: an approved application, a password-setup email,
 * and their account made a tech the first time they sign in.
 */
export async function onboardTechnician(
  input: OnboardingInput,
  opts: { toolsVerified: boolean; adminNotes?: string }
): Promise<OnboardTechResult> {
  // Escape LIKE wildcards: an underscore in an address must not match others.
  const pattern = input.email.replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data: rows, error: findError } = await supabase
    .from('tech_applications')
    .select('id, status, created_at')
    .ilike('email', pattern);
  if (findError) throw new Error(findError.message);

  const existing: ExistingApplication[] = (rows || []).map((r) => ({
    id: r.id as string,
    status: r.status as string,
    createdAt: r.created_at as string,
  }));
  const plan = planOnboarding(existing);

  if (plan.kind === 'resend') {
    const invite = await inviteApprovedTech(plan.applicationId);
    return {
      outcome: 'resent',
      email: input.email,
      inviteSent: true,
      message:
        invite.message ||
        `${input.email} was already approved, so nothing new was created — a fresh sign-in email is on its way.`,
    };
  }

  const fields = {
    full_name: input.fullName,
    phone: input.phone,
    trades: specialtyLabels(input.specialties),
    specialties: input.specialties,
  };

  let applicationId: string;
  if (plan.kind === 'approve') {
    // They applied on the website too. Use what the owner just entered.
    const { error } = await supabase.from('tech_applications').update(fields).eq('id', plan.applicationId);
    if (error) throw new Error(error.message);
    applicationId = plan.applicationId;
  } else {
    const { data, error } = await supabase
      .from('tech_applications')
      .insert({
        ...fields,
        email: input.email,
        status: 'submitted',
        // Left false: the tech accepts terms themselves, in the portal, through
        // the contractor agreement and insurance disclosure gates.
        liability_accepted: false,
        payload: { source: 'admin_onboarding', addedAt: new Date().toISOString() },
      })
      .select('id')
      .single();
    if (error || !data) throw new Error(error?.message || 'Could not create the technician record.');
    applicationId = data.id as string;
  }

  const approved = await approveTechApplication(applicationId, {
    markToolsVerified: opts.toolsVerified,
    adminNotes: opts.adminNotes,
    sendInvite: true,
  });

  return {
    outcome: plan.kind === 'approve' ? 'approved' : 'created',
    email: input.email,
    inviteSent: approved.inviteSent !== false,
    message: approved.inviteSent === false
      ? approved.nextStep || 'Added, but the sign-in email failed. Use Resend invite in the Techs tab.'
      : `${input.fullName} is added. A password-setup email is on its way to ${input.email}. They’ll show up in the Technicians list once they set a password and sign in.`,
  };
}
