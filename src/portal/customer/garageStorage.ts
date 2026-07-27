export type GarageVehicle = {
  id: string;
  year: string;
  make: string;
  model: string;
  vin: string;
  mileage: string;
  healthScore: number;
  healthStatus: 'good' | 'warning' | 'urgent';
  healthLabel: string;
};

const STORAGE_KEY = 'adaptivity_portal_garage';

const DEFAULT_VEHICLES: GarageVehicle[] = [
  {
    id: 'v1',
    year: '2021',
    make: 'Ford',
    model: 'F-150 XLT',
    vin: '1FTFW1E84MKD12345',
    mileage: '42,180',
    healthScore: 82,
    healthStatus: 'good',
    healthLabel: 'Healthy — next service in 2,500 mi',
  },
];

export function loadGarageVehicles(): GarageVehicle[] {
  if (typeof window === 'undefined') return DEFAULT_VEHICLES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VEHICLES;
    const parsed = JSON.parse(raw) as GarageVehicle[];
    return parsed.length ? parsed : DEFAULT_VEHICLES;
  } catch {
    return DEFAULT_VEHICLES;
  }
}

export function saveGarageVehicles(vehicles: GarageVehicle[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(vehicles));
}

export function vehicleLabel(v: GarageVehicle) {
  return `${v.year} ${v.make} ${v.model}`;
}
