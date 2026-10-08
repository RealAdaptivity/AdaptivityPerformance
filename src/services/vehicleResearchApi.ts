import { supabase } from './supabaseClient';
import { invokeEdgeFunction } from './edgeFunctionErrors';
import type { VinSummary } from './vinDecode';
import type { ComplaintSummary, RecallItem, ResearchLink } from './vehicleResearch';

export type VehicleResearchResult = {
  vehicle: { vin: string | null; year: string; make: string; model: string; decoded: VinSummary | null };
  /** Null when NHTSA did not answer, which is different from "no recalls". */
  recalls: RecallItem[] | null;
  complaints: ComplaintSummary | null;
  links: ResearchLink[];
};

/** Recalls and complaints through the vehicle-research edge function (staff only). */
export function researchVehicle(
  query: { vin: string } | { year: string; make: string; model: string }
): Promise<VehicleResearchResult> {
  return invokeEdgeFunction<VehicleResearchResult>('vehicle-research', query);
}

export type VehicleNote = {
  id: string;
  note: string;
  vin: string | null;
  createdAt: string;
  authorName: string | null;
};

/** ilike treats % and _ as wildcards; a make or model is matched literally. */
const literal = (s: string) => s.trim().replace(/[\\%_]/g, '\\$&');

/** Shop notes for every vehicle of this year, make and model, newest first. */
export async function listVehicleNotes(v: { year: string; make: string; model: string }): Promise<VehicleNote[]> {
  const { data, error } = await supabase
    .from('vehicle_notes')
    .select('id, note, vin, created_at, author:profiles!vehicle_notes_created_by_fkey ( full_name )')
    .eq('model_year', Number(v.year))
    .ilike('make', literal(v.make))
    .ilike('model', literal(v.model))
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => {
    const author = (r as { author?: { full_name: string | null } | { full_name: string | null }[] | null }).author;
    const one = Array.isArray(author) ? author[0] : author;
    return {
      id: r.id as string,
      note: r.note as string,
      vin: (r.vin as string | null) ?? null,
      createdAt: r.created_at as string,
      authorName: one?.full_name ?? null,
    };
  });
}

export async function addVehicleNote(v: {
  year: string;
  make: string;
  model: string;
  vin?: string | null;
  note: string;
}): Promise<void> {
  const note = v.note.trim();
  if (!note) throw new Error('Write the note first.');
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in again to save notes.');
  const { error } = await supabase.from('vehicle_notes').insert({
    model_year: Number(v.year),
    make: v.make.trim(),
    model: v.model.trim(),
    vin: v.vin || null,
    note,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
}

export async function deleteVehicleNote(id: string): Promise<void> {
  const { error } = await supabase.from('vehicle_notes').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
