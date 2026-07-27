import { supabase } from '../services/supabaseClient';

export type PortalRole = 'customer' | 'tech';

const PORTAL_VIEW_KEY = 'adaptivity_portal_view';

export function setPortalViewMode(mode: PortalRole) {
  if (typeof window !== 'undefined') sessionStorage.setItem(PORTAL_VIEW_KEY, mode);
}

export function getPortalViewMode(): PortalRole | null {
  if (typeof window === 'undefined') return null;
  const v = sessionStorage.getItem(PORTAL_VIEW_KEY);
  return v === 'tech' || v === 'customer' ? v : null;
}

export function clearPortalViewMode() {
  if (typeof window !== 'undefined') sessionStorage.removeItem(PORTAL_VIEW_KEY);
}

export type PortalProfile = {
  id: string;
  email: string;
  fullName: string;
  role: PortalRole | 'admin' | string;
};

export async function fetchPortalProfile(userId: string): Promise<PortalProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    email: data.email ?? '',
    fullName: data.full_name ?? '',
    role: data.role as string,
  };
}

export function roleMatchesPortal(profileRole: string, portal: PortalRole): boolean {
  if (portal === 'customer') return profileRole === 'customer';
  return profileRole === 'tech';
}

export async function signInPortal(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email: email.trim(), password });
}

export async function signUpPortal(
  portal: PortalRole,
  email: string,
  password: string,
  fullName: string,
  extras?: { phone?: string; vanNumber?: string }
) {
  const metadata =
    portal === 'tech'
      ? {
          role: 'tech',
          full_name: fullName.trim(),
          van_number: extras?.vanNumber?.trim() || 'Mobile Unit',
          role_title: 'ASE Technician',
        }
      : {
          role: 'customer',
          full_name: fullName.trim(),
          phone: extras?.phone?.trim() || '',
        };

  return supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: metadata },
  });
}

export async function signOutPortal() {
  return supabase.auth.signOut();
}

/** Creates mechanic_details + tech role for the signed-in user (dispatch / Stripe). */
export async function ensureTechProfile(vanNumber?: string) {
  const { error } = await supabase.rpc('ensure_tech_profile', {
    p_van_number: vanNumber?.trim() || 'Mobile Unit',
    p_role_title: 'ASE Technician',
  });
  if (error) throw error;
}

import { portalPath } from './portalRoute';

export async function resetPortalPassword(email: string) {
  const redirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}${portalPath()}` : undefined;
  return supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
}
