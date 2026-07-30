import { supabase } from './supabaseClient';

export async function listFavoriteTechs(): Promise<
  Array<{ techId: string; name: string; createdAt: string }>
> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('customer_favorite_techs')
    .select('tech_id, created_at, profiles!customer_favorite_techs_tech_id_fkey ( full_name )')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });
  if (error) {
    // Fallback without join if FK name differs
    const { data: rows, error: e2 } = await supabase
      .from('customer_favorite_techs')
      .select('tech_id, created_at')
      .eq('customer_id', user.id);
    if (e2) throw e2;
    return (rows || []).map((r) => ({
      techId: r.tech_id as string,
      name: 'Saved technician',
      createdAt: r.created_at as string,
    }));
  }
  return (data || []).map((r) => {
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return {
      techId: r.tech_id as string,
      name: (profile as { full_name?: string } | null)?.full_name || 'Saved technician',
      createdAt: r.created_at as string,
    };
  });
}

export async function addFavoriteTech(techId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in required');
  const { error } = await supabase.from('customer_favorite_techs').upsert({
    customer_id: user.id,
    tech_id: techId,
  });
  if (error) throw error;
}

export async function removeFavoriteTech(techId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in required');
  const { error } = await supabase
    .from('customer_favorite_techs')
    .delete()
    .eq('customer_id', user.id)
    .eq('tech_id', techId);
  if (error) throw error;
}

export async function submitWarrantyClaim(bookingId: string, description: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in required');
  const trimmed = description.trim().slice(0, 2000);
  if (!trimmed) throw new Error('Describe the issue');
  const { error } = await supabase.from('warranty_claims').insert({
    booking_id: bookingId,
    customer_id: user.id,
    description: trimmed,
    status: 'open',
  });
  if (error) throw error;
}
