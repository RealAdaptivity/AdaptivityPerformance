import { supabase } from './supabaseClient';

export type PartnerLocation = {
  id: string;
  businessName: string;
  contactName: string | null;
  contactPhone: string | null;
  address: string;
  city: string | null;
  zipCode: string | null;
  hasLift: boolean;
  bayCount: number | null;
  hoursNote: string | null;
  isAdaptivityOwned: boolean;
};

export type PartnerApplicationInput = {
  businessName: string;
  contactName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  hasLift?: boolean;
  bayCount?: number;
  hoursNote?: string;
  notes?: string;
};

function mapPartner(row: Record<string, unknown>): PartnerLocation {
  return {
    id: row.id as string,
    businessName: row.business_name as string,
    contactName: (row.contact_name as string | null) ?? null,
    contactPhone: (row.contact_phone as string | null) ?? null,
    address: row.address as string,
    city: (row.city as string | null) ?? null,
    zipCode: (row.zip_code as string | null) ?? null,
    hasLift: Boolean(row.has_lift),
    bayCount: (row.bay_count as number | null) ?? null,
    hoursNote: (row.hours_note as string | null) ?? null,
    isAdaptivityOwned: Boolean(row.is_adaptivity_owned),
  };
}

/** Public: approved partner shops / garages that can host jobs. */
export async function fetchApprovedPartners(): Promise<PartnerLocation[]> {
  const { data, error } = await supabase
    .from('partner_locations')
    .select(
      'id, business_name, contact_name, contact_phone, address, city, zip_code, has_lift, bay_count, hours_note, is_adaptivity_owned'
    )
    .eq('status', 'approved')
    .eq('host_jobs', true)
    .order('is_adaptivity_owned', { ascending: false })
    .order('business_name', { ascending: true });

  if (error) throw error;
  return (data || []).map((row) => mapPartner(row as Record<string, unknown>));
}

/** Public apply form — stores a partner application for admin review. */
export async function submitPartnerApplication(input: PartnerApplicationInput) {
  // Insert only — no .select(). Anon can INSERT but only admins can SELECT,
  // so RETURNING via .select() fails RLS.
  const { error } = await supabase.from('partner_applications').insert({
    business_name: input.businessName.trim(),
    contact_name: input.contactName.trim(),
    email: input.email.trim(),
    phone: input.phone?.trim() || null,
    address: input.address?.trim() || null,
    city: input.city?.trim() || null,
    zip_code: input.zipCode?.trim() || null,
    has_lift: Boolean(input.hasLift),
    bay_count: input.bayCount ?? null,
    hours_note: input.hoursNote?.trim() || null,
    notes: input.notes?.trim() || null,
    status: 'submitted',
    payload: {
      source: 'website_partner_form',
      submittedAt: new Date().toISOString(),
    },
  });

  if (error) throw new Error(error.message || 'Could not submit application');
}

export type PartnerApplicationRow = {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  zipCode: string | null;
  hasLift: boolean;
  bayCount: number | null;
  hoursNote: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
};

export async function fetchPartnerApplications(): Promise<PartnerApplicationRow[]> {
  const { data, error } = await supabase
    .from('partner_applications')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id as string,
    businessName: row.business_name as string,
    contactName: row.contact_name as string,
    email: row.email as string,
    phone: (row.phone as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    zipCode: (row.zip_code as string | null) ?? null,
    hasLift: Boolean(row.has_lift),
    bayCount: (row.bay_count as number | null) ?? null,
    hoursNote: (row.hours_note as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    status: row.status as string,
    createdAt: row.created_at as string,
  }));
}

/** Admin: approve application → create partner_locations row. */
export async function approvePartnerApplication(applicationId: string) {
  const { data: app, error: fetchErr } = await supabase
    .from('partner_applications')
    .select('*')
    .eq('id', applicationId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!app) throw new Error('Application not found');

  const { data: location, error: locErr } = await supabase
    .from('partner_locations')
    .insert({
      business_name: app.business_name,
      contact_name: app.contact_name,
      contact_email: app.email,
      contact_phone: app.phone,
      address: app.address || `${app.city || ''} ${app.zip_code || ''}`.trim() || 'Address TBD',
      city: app.city,
      zip_code: app.zip_code,
      has_lift: Boolean(app.has_lift),
      bay_count: app.bay_count ?? 1,
      hours_note: app.hours_note,
      notes: app.notes,
      status: 'approved',
      host_jobs: true,
      is_adaptivity_owned: false,
    })
    .select('id')
    .single();
  if (locErr) throw locErr;

  const { error: updErr } = await supabase
    .from('partner_applications')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      partner_location_id: location.id,
    })
    .eq('id', applicationId);
  if (updErr) throw updErr;
  return location.id as string;
}

export async function rejectPartnerApplication(applicationId: string) {
  const { error } = await supabase
    .from('partner_applications')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
    .eq('id', applicationId);
  if (error) throw error;
}
