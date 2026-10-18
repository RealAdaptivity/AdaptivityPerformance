import { supabase } from '../../services/supabaseClient';

/** A vehicle in the customer's garage: the `vehicles` rows they own. */
export type GarageVehicle = {
  id: string;
  year: string;
  make: string;
  model: string;
  vin: string;
  mileage: string;
  /** Only when a technician recorded one; nothing computes a score yet, so
   *  most vehicles have none and none is shown. */
  healthScore: number | null;
  healthStatus: 'good' | 'warning' | 'urgent' | null;
  healthLabel: string | null;
};

export function garageVehicleFromRow(row: Record<string, unknown>): GarageVehicle {
  const status = row.health_status;
  return {
    id: row.id as string,
    year: (row.year as string) || '',
    make: (row.make as string) || '',
    model: (row.model as string) || '',
    vin: (row.vin as string) || '',
    mileage: (row.mileage as string) || '',
    healthScore: typeof row.health_score === 'number' ? row.health_score : null,
    healthStatus: status === 'good' || status === 'warning' || status === 'urgent' ? status : null,
    healthLabel: (row.health_label as string) || null,
  };
}

/** The customer's saved vehicles, newest first. Empty when they have none —
 *  never a sample vehicle. */
export async function fetchGarageVehicles(customerId: string): Promise<GarageVehicle[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('owner_id', customerId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => garageVehicleFromRow(r as Record<string, unknown>));
}

export function vehicleLabel(v: GarageVehicle) {
  return [v.year, v.make, v.model].filter(Boolean).join(' ');
}
