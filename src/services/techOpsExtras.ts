import { supabase } from './supabaseClient';

export type UnavailableWindow = {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
};

export async function listUnavailableWindows(techId?: string): Promise<UnavailableWindow[]> {
  let uid = techId;
  if (!uid) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    uid = user?.id;
  }
  if (!uid) return [];
  const { data, error } = await supabase
    .from('tech_unavailable_windows')
    .select('id, starts_at, ends_at, reason')
    .eq('tech_id', uid)
    .gte('ends_at', new Date().toISOString())
    .order('starts_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((r) => ({
    id: r.id as string,
    startsAt: r.starts_at as string,
    endsAt: r.ends_at as string,
    reason: (r.reason as string | null) ?? null,
  }));
}

export async function addUnavailableWindow(params: {
  startsAt: string;
  endsAt: string;
  reason?: string;
}): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in required');
  const { error } = await supabase.from('tech_unavailable_windows').insert({
    tech_id: user.id,
    starts_at: params.startsAt,
    ends_at: params.endsAt,
    reason: params.reason?.trim() || null,
  });
  if (error) throw error;
}

export async function removeUnavailableWindow(id: string): Promise<void> {
  const { error } = await supabase.from('tech_unavailable_windows').delete().eq('id', id);
  if (error) throw error;
}

/** Specialty → suggested van inventory checklist. */
export const SPECIALTY_INVENTORY: Record<string, string[]> = {
  brakes: ['Pad assortment', 'Rotor gauge', 'Brake cleaner', 'Torque wrench', 'C-clamp / caliper tool'],
  oil: ['Oil drain pan', 'Filter wrenches', 'Funnel set', 'Gloves / rags', 'Common filter SKUs'],
  battery: ['Jump pack', 'Multimeter', 'Terminal cleaner', 'Common battery sizes'],
  diagnostics: ['OBD scanner', 'Test light', 'Multimeter', 'Smoke machine (optional)'],
  electrical: ['Multimeter', 'Wire strippers', 'Heat shrink', 'Fuse assortment'],
  suspension: ['Jack + stands', 'Ball joint separator', 'Torque wrench', 'Penetrating oil'],
  ac: ['Manifold gauges', 'Vacuum pump', 'UV dye', 'R134a / R1234yf (as licensed)'],
  transmission: ['Fluid pump', 'Correct ATF', 'Filter gasket kit', 'Scan tool'],
  bodywork: ['Body filler kit', 'Sanding blocks', 'Primer', 'Masking'],
  detailing: ['Wash mitt', 'Clay bar', 'Compound/polish', 'Microfiber set'],
  full_auto: ['Basic hand tools', 'Jack + stands', 'Scan tool', 'Multimeter'],
};

export async function loadInventoryChecks(
  specialty: string
): Promise<string[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('tech_inventory_checks')
    .select('checked_items')
    .eq('tech_id', user.id)
    .eq('specialty', specialty)
    .maybeSingle();
  if (error) throw error;
  const items = data?.checked_items;
  return Array.isArray(items) ? (items as string[]) : [];
}

export async function saveInventoryChecks(specialty: string, checkedItems: string[]): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in required');
  const { error } = await supabase.from('tech_inventory_checks').upsert({
    tech_id: user.id,
    specialty,
    checked_items: checkedItems,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
