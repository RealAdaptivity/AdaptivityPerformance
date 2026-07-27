import { supabase } from './supabaseClient';

export type UserRole = 'customer' | 'tech' | 'admin';

export type AdminProfile = {
  id: string;
  role: UserRole;
  fullName: string | null;
  email: string | null;
};

export async function signInAdmin(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOutAdmin() {
  return supabase.auth.signOut();
}

export async function fetchAdminProfile(): Promise<AdminProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, email')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    role: data.role as UserRole,
    fullName: data.full_name,
    email: data.email ?? user.email ?? null,
  };
}

export function isAdminProfile(profile: AdminProfile | null): profile is AdminProfile {
  return profile?.role === 'admin';
}

export async function fetchHasAdminUser(): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_admin_user');
  if (error) {
    console.warn('[admin] has_admin_user:', error.message);
    return true;
  }
  return Boolean(data);
}

export async function bootstrapFirstAdmin(params: {
  email: string;
  password: string;
  fullName: string;
  bootstrapCode: string;
}) {
  const { data, error } = await supabase.functions.invoke('bootstrap-admin', {
    body: params,
  });
  if (error) throw new Error(error.message || 'Bootstrap request failed');
  if (data?.error) throw new Error(String(data.error));
  return data as { ok: boolean; email: string; message: string };
}
