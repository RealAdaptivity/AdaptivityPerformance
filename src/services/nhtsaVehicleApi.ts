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
    // 1. Try querying models by year + make
    let res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsforbyyear/make/${cleanMake}/year/${year}?format=json`);
    let data = await res.json();

    if (data && data.Results && data.Results.length > 0) {
      const modelNames = Array.from(new Set(data.Results.map((r: any) => String(r.Model_Name).trim()))) as string[];
      if (modelNames.length > 0) return modelNames.sort();
    }

    // 2. Fallback: Query all models for make (ignoring year restriction)
    res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformake/${cleanMake}?format=json`);
    data = await res.json();

    if (data && data.Results && data.Results.length > 0) {
      const modelNames = Array.from(new Set(data.Results.map((r: any) => String(r.Model_Name).trim()))) as string[];
      if (modelNames.length > 0) return modelNames.sort();
    }
  } catch (e) {
    console.warn('Failed to fetch live models from NHTSA API:', e);
  }

  // Fallback realistic defaults per make if offline
  const fallbackMakeMap: Record<string, string[]> = {
    Ford: ['F-150', 'F-250 Super Duty', 'F-350', 'Mustang', 'Explorer', 'Bronco', 'Expedition', 'Edge', 'Escape', 'Ranger', 'Maverick', 'Transit'],
    Chevrolet: ['Silverado 1500', 'Silverado 2500HD', 'Tahoe', 'Suburban', 'Corvette', 'Camaro', 'Equinox', 'Traverse', 'Colorado', 'Blazer'],
    Toyota: ['Tundra', 'Tacoma', '4Runner', 'RAV4', 'Camry', 'Corolla', 'Highlander', 'Sequoia', 'Supra', 'Land Cruiser'],
    Honda: ['Civic', 'Accord', 'CR-V', 'Pilot', 'Odyssey', 'Ridgeline', 'Passport', 'HR-V'],
    RAM: ['1500', '2500', '3500', 'ProMaster', '1500 Classic', 'TRX'],
    GMC: ['Sierra 1500', 'Sierra 2500HD', 'Yukon', 'Yukon XL', 'Acadia', 'Canyon', 'Terrain'],
    Jeep: ['Wrangler', 'Grand Cherokee', 'Gladiator', 'Cherokee', 'Compass', 'Renegade', 'Wagoneer'],
    BMW: ['3 Series', '5 Series', '7 Series', 'X3', 'X5', 'X7', 'M3', 'M5', 'M4', 'Z4'],
    'Mercedes-Benz': ['C-Class', 'E-Class', 'S-Class', 'GLC', 'GLE', 'GLS', 'G-Class', 'AMG GT', 'Sprinter'],
    Audi: ['A4', 'A6', 'A8', 'Q5', 'Q7', 'Q8', 'S4', 'S5', 'RS6', 'R8'],
    Nissan: ['Titan', 'Frontier', 'Altima', 'Rogue', 'Pathfinder', 'Armada', 'Z', 'GT-R', 'Sentra'],
    Subaru: ['Outback', 'Forester', 'Crosstrek', 'WRX', 'Impreza', 'Ascent', 'BRZ'],
  };

  const clean = make.trim();
  if (fallbackMakeMap[clean]) return fallbackMakeMap[clean];

  return [`${clean} Standard Series`, `${clean} Sport Edition`, `${clean} Custom Model`];
}

// Brand-Specific OEM Engine Map to prevent showing incorrect engines for selected make
export function getEnginesForMake(make: string): string[] {
  const m = make.toUpperCase();

  if (m.includes('FORD') || m.includes('LINCOLN')) {
    return [
      '2.7L V6 EcoBoost Turbo',
      '3.3L V6 PFDI',
      '3.5L V6 EcoBoost Twin-Turbo',
      '3.5L PowerBoost Full Hybrid',
      '5.0L V8 Coyote',
      '6.2L V8 Boss',
      '6.7L PowerStroke V8 Turbo Diesel',
      '7.3L V8 Godzilla'
    ];
  }

  if (m.includes('CHEVROLET') || m.includes('GMC') || m.includes('CADILLAC') || m.includes('BUICK')) {
    return [
      '2.7L Turbo High-Output 4-Cyl',
      '4.3L EcoTec3 V6',
      '5.3L V8 EcoTec3 (L83/L84)',
      '6.2L V8 EcoTec3 (L87)',
      '6.6L V8 L8T Gas',
      '6.6L Duramax V8 Turbo Diesel (L5P)'
    ];
  }

  if (m.includes('RAM') || m.includes('DODGE') || m.includes('JEEP') || m.includes('CHRYSLER')) {
    return [
      '3.6L V6 Pentastar',
      '5.7L V8 HEMI MDS',
      '6.4L V8 SRT HEMI 392',
      '6.2L Supercharged HEMI V8 (Hellcat / TRX)',
      '3.0L EcoDiesel V6',
      '6.7L Cummins Turbo Diesel I6'
    ];
  }

  if (m.includes('TOYOTA') || m.includes('LEXUS')) {
    return [
      '2.4L Turbo T24A-FTS',
      '2.5L 4-Cylinder Dynamic Force',
      '3.4L V6 i-FORCE Twin-Turbo',
      '3.4L V6 i-FORCE MAX Hybrid',
      '3.5L V6 2GR-FKS',
      '4.0L V6 1GR-FE',
      '5.7L V8 i-FORCE'
    ];
  }

  if (m.includes('HONDA') || m.includes('ACURA')) {
    return [
      '1.5L Turbo 4-Cylinder',
      '2.0L Turbo 4-Cylinder (K20C1)',
      '2.4L / 2.5L DOHC 4-Cylinder',
      '3.5L V6 J35'
    ];
  }

  if (m.includes('BMW')) {
    return [
      '2.0L Inline-4 Turbo (B48)',
      '3.0L Inline-6 Turbo (B58 / S58)',
      '4.4L Twin-Turbo V8 (S63 / N63)'
    ];
  }

  if (m.includes('MERCEDES')) {
    return [
      '2.0L Inline-4 Turbo (M274)',
      '3.0L Inline-6 Turbo (M256)',
      '4.0L Biturbo V8 (M177 / M178)'
    ];
  }

  if (m.includes('AUDI') || m.includes('VOLKSWAGEN') || m.includes('PORSCHE')) {
    return [
      '2.0L TFSI Turbo 4-Cyl',
      '3.0L TFSI V6',
      '4.0L TFSI Twin-Turbo V8'
    ];
  }

  if (m.includes('SUBARU')) {
    return [
      '2.0L / 2.5L DOHC Boxer 4-Cyl',
      '2.4L / 2.5L Turbo Boxer 4-Cyl (FA24 / EJ25)'
    ];
  }

  if (m.includes('NISSAN') || m.includes('INFINITI')) {
    return [
      '2.5L DOHC 4-Cylinder',
      '3.0L Twin-Turbo V6 (VR30DDTT)',
      '3.8L Twin-Turbo V6 (VR38DETT)',
      '5.6L V8 Endurance (VK56)'
    ];
  }

  return [
    '2.0L Turbo 4-Cylinder',
    '2.5L DOHC 4-Cylinder',
    '3.0L V6 Engine',
    '3.5L V6 Engine',
    '5.0L / 5.7L V8 Engine'
  ];
}
