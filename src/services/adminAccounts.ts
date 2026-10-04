import { supabase } from './supabaseClient';

/** Who can sign in to the admin dashboard, and the two actions on that list.
 *  grant_admin / revoke_admin (migration 20261004005559) check that the
 *  caller is an admin themselves. */

export type AdminAccount = {
  id: string;
  email: string | null;
  fullName: string | null;
  createdAt: string;
};

export async function fetchAdminAccounts(): Promise<AdminAccount[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, created_at')
    .eq('role', 'admin')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    email: (r.email as string | null) ?? null,
    fullName: (r.full_name as string | null) ?? null,
    createdAt: r.created_at as string,
  }));
}

export async function grantAdmin(email: string): Promise<{ email: string; alreadyAdmin: boolean }> {
  const { data, error } = await supabase.rpc('grant_admin', { p_email: email.trim() });
  if (error) throw new Error(error.message);
  const r = data as { email: string; already_admin: boolean };
  return { email: r.email, alreadyAdmin: Boolean(r.already_admin) };
}

/** Back to tech if they still have an active technician record, otherwise customer. */
export async function revokeAdmin(profileId: string): Promise<'tech' | 'customer'> {
  const { data, error } = await supabase.rpc('revoke_admin', { p_profile_id: profileId });
  if (error) throw new Error(error.message);
  return (data as { role: 'tech' | 'customer' }).role;
}
