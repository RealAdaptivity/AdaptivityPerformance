// NHTSA Official Automotive Database API Service for 2002 - 2026 Vehicles

export interface DecodedVehicleInfo {
  year: string;
  make: string;
  model: string;
  trim: string;
  engine: string;
  drive: string;
  tierKey: 'standard' | 'german' | 'heavyduty' | 'exotic';
}

// 35 Primary Automotive Manufacturers from 2002 to 2026
export const ALL_MAKES_2002_2026 = [
  'Acura', 'Alfa Romeo', 'Aston Martin', 'Audi', 'Bentley', 'BMW', 'Buick', 'Cadillac', 
  'Chevrolet', 'Chrysler', 'Dodge', 'Ferrari', 'Fiat', 'Ford', 'Genesis', 'GMC', 
  'Honda', 'Hyundai', 'Infiniti', 'Jaguar', 'Jeep', 'Kia', 'Lamborghini', 'Land Rover', 
  'Lexus', 'Lincoln', 'Maserati', 'Mazda', 'Mercedes-Benz', 'MINI', 'Mitsubishi', 
  'Nissan', 'Porsche', 'RAM', 'Subaru', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo'
];

export function getVehicleTierKey(make: string, model: string = ''): 'standard' | 'german' | 'heavyduty' | 'exotic' {
  const m = make.toUpperCase();
  const mod = model.toUpperCase();

  if (m.includes('FERRARI') || m.includes('LAMBORGHINI') || m.includes('ASTON') || m.includes('BENTLEY') || mod.includes('CORVETTE') || mod.includes('VIPER')) {
    return 'exotic';
  }
  if (m.includes('BMW') || m.includes('MERCEDES') || m.includes('AUDI') || m.includes('PORSCHE') || m.includes('VOLKSWAGEN') || m.includes('VW') || m.includes('MINI') || m.includes('ALFA') || m.includes('JAGUAR')) {
    return 'german';
  }
  if (m.includes('RAM') || m.includes('GMC') || mod.includes('F-250') || mod.includes('F-350') || mod.includes('F-450') || mod.includes('2500') || mod.includes('3500') || mod.includes('POWERSTROKE') || mod.includes('CUMMINS') || mod.includes('DURAMAX')) {
    return 'heavyduty';
  }
  return 'standard';
}

// Fetch all models for a specific Year & Make live from NHTSA API
export async function fetchModelsForMakeAndYear(make: string, year: string): Promise<string[]> {
  try {
    const cleanMake = encodeURIComponent(make.trim());
    const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsforbyyear/make/${cleanMake}/year/${year}?format=json`);
    const data = await res.json();

    if (data && data.Results && data.Results.length > 0) {
      const modelNames = Array.from(new Set(data.Results.map((r: any) => String(r.Model_Name).trim()))) as string[];
      return modelNames.sort();
    }
  } catch (e) {
    console.warn('Failed to fetch live models from NHTSA API, using fallback defaults.');
  }

  // Fallback defaults if offline
  return ['Base Series', 'Sport Edition', 'Performance Trim', 'Custom Model'];
}
