/**
 * Comprehensive Automotive Labor Time Guide & Job Matrix (ALLDATA / Mitchell1 standard)
 * Provides industry-standard flat-rate labor times, technical procedures, torque specs,
 * parts itemization, and multi-tier RO calculation for Adaptivity Performance dispatchers.
 */

export type VehicleCategory =
  | 'All Makes / Universal'
  | 'Domestic (Ford / Chevy / GM / Dodge)'
  | 'Asian (Toyota / Honda / Nissan / Hyundai / Subaru)'
  | 'European (BMW / Mercedes / Audi / VW)'
  | 'Trucks & HD (F-150, Silverado, Ram, Diesel)';

export type RepairCategory =
  | 'Brakes & Traction'
  | 'Engine & Valvetrain'
  | 'Electrical & Starting'
  | 'Heating & Air Conditioning'
  | 'Suspension & Steering'
  | 'Cooling & Belts'
  | 'Transmission & Drivetrain'
  | 'Fuel & Exhaust'
  | 'Maintenance & Fluids';

export interface LaborOperation {
  id: string;
  code: string;
  category: RepairCategory;
  title: string;
  description: string;
  bookHours: number;           // Standard flat rate book time (e.g. 1.8 hrs)
  warrantyHours: number;       // OEM Warranty book time (e.g. 1.3 hrs)
  mobileHours: number;         // Driveway / mobile service time (e.g. 2.0 hrs)
  difficulty: 1 | 2 | 3 | 4 | 5; // 1=Entry Tech, 5=Master Tech only
  drivewayCapable: boolean;    // Can be done in driveway vs lift required
  vehicleFitment: VehicleCategory;
  requiredTools: string[];
  recommendedParts: {
    name: string;
    qty: number;
    typicalCostDollars: number;
    partType: 'OEM' | 'Premium Aftermarket' | 'Fluid / Chemical';
  }[];
  torqueSpecs: {
    component: string;
    spec: string;
  }[];
  procedureSteps: string[];
  diagnosticTips: string[];
}

export interface RepairOrderLineItem {
  id: string;
  operationId?: string;
  description: string;
  hours: number;
  laborRatePerHour: number;
  parts: {
    name: string;
    qty: number;
    costPerUnit: number;
  }[];
  notes?: string;
}

export interface RepairOrderCalculation {
  totalHours: number;
  laborSubtotal: number;
  partsSubtotal: number;
  shopSuppliesFee: number;
  taxAmount: number;
  grandTotal: number;
  techPayoutLabor: number;
  platformShareLabor: number;
}

export const ALLDATA_LABOR_OPERATIONS: LaborOperation[] = [
  // --- BRAKES & TRACTION ---
  {
    id: 'brk-front-pads-rotors',
    code: 'BRK-01',
    category: 'Brakes & Traction',
    title: 'Front Brake Pads & Rotors Replacement',
    description: 'R&I front caliper assemblies, clean caliper bracket slide ways, install premium ceramic pads, replace front disc rotors, service caliper guide pins with silicone paste, bed-in test.',
    bookHours: 1.8,
    warrantyHours: 1.3,
    mobileHours: 2.0,
    difficulty: 2,
    drivewayCapable: true,
    vehicleFitment: 'All Makes / Universal',
    requiredTools: ['3-Ton Floor Jack', 'Jack Stands', 'Torque Wrench (1/2")', 'Caliper Hanger Hook', 'Piston Compression Tool', 'Wire Brush', 'Brake Cleaner'],
    recommendedParts: [
      { name: 'Front Premium Ceramic Brake Pad Set', qty: 1, typicalCostDollars: 65, partType: 'Premium Aftermarket' },
      { name: 'Front Vented Disc Rotors', qty: 2, typicalCostDollars: 110, partType: 'Premium Aftermarket' },
      { name: 'Stainless Hardware Clip Kit & Abutment Shims', qty: 1, typicalCostDollars: 15, partType: 'Premium Aftermarket' },
      { name: 'Silicone Ceramic Brake Caliper Grease', qty: 1, typicalCostDollars: 6, partType: 'Fluid / Chemical' },
    ],
    torqueSpecs: [
      { component: 'Caliper Bracket Mounting Bolts', spec: '80–120 ft-lbs (Vehicle specific)' },
      { component: 'Caliper Slide Pin Guide Bolts', spec: '24–35 ft-lbs' },
      { component: 'Wheel Lug Nuts', spec: '100–150 ft-lbs (Star pattern)' },
    ],
    procedureSteps: [
      'Raise vehicle on level surface and secure with heavy-duty jack stands.',
      'Remove front wheel assemblies; inspect brake lines and hoses for cracking or leaks.',
      'Remove caliper guide pin bolts and hang caliper using caliper hanger wire (never hang by rubber hose).',
      'Remove caliper bracket mounting bolts; clean corrosion and rust off bracket lands.',
      'Remove old rotor; clean wheel hub surface with wire brush to ensure zero rotor runout.',
      'Install new disc rotor; clean anti-rust shipping oil with brake cleaner.',
      'Apply anti-seize paste to hub face; reinstall bracket with threadlocker to OEM torque.',
      'Compress piston using caliper tool while monitoring master cylinder reservoir fluid level.',
      'Lubricate slide pins with high-temperature silicone grease and install new hardware clips.',
      'Torque slide pins, reinstall wheels to torque, pump brake pedal 4x to seat pads before drive test.',
    ],
    diagnosticTips: [
      'Check rotor runout with dial indicator if pulsation occurs after install.',
      'Always inspect brake fluid boiling point and moisture level with digital tester.',
    ],
  },
  {
    id: 'brk-rear-pads-rotors-epb',
    code: 'BRK-02',
    category: 'Brakes & Traction',
    title: 'Rear Brake Pads & Rotors (Electronic Parking Brake EPB)',
    description: 'Electronic scan tool EPB service mode retract, R&I rear calipers and electric actuators, replace rear rotors and ceramic pads, reset EPB caliper calibration.',
    bookHours: 2.1,
    warrantyHours: 1.5,
    mobileHours: 2.3,
    difficulty: 3,
    drivewayCapable: true,
    vehicleFitment: 'All Makes / Universal',
    requiredTools: ['OBD-II Scan Tool with EPB Service Function', 'Rear Caliper Retract Tool', 'Torque Wrench', 'Jack & Stands'],
    recommendedParts: [
      { name: 'Rear Ceramic Pad Set with EPB Springs', qty: 1, typicalCostDollars: 58, partType: 'Premium Aftermarket' },
      { name: 'Rear Solid/Vented Rotors', qty: 2, typicalCostDollars: 95, partType: 'Premium Aftermarket' },
      { name: 'EPB Hardware Kit', qty: 1, typicalCostDollars: 14, partType: 'Premium Aftermarket' },
    ],
    torqueSpecs: [
      { component: 'Rear Caliper Bracket Bolts', spec: '65–90 ft-lbs' },
      { component: 'Rear Caliper Guide Pins', spec: '22–28 ft-lbs' },
      { component: 'EPB Actuator Screws (Torx)', spec: '7–9 ft-lbs (80–100 in-lbs)' },
    ],
    procedureSteps: [
      'Connect OBD-II scanner and command "Enter Electronic Parking Brake Service / Pad Replacement Mode".',
      'Verify electric actuator motor has fully backed off before pushing piston.',
      'Remove caliper slide bolts and bracket; remove worn pads and rotor.',
      'Clean hub face thoroughly; install new rotor and lubricate slide pins.',
      'Carefully push back piston straight (do not rotate if EPB spindle is retracted).',
      'Reassemble caliper bracket and caliper to OEM torque.',
      'Use scanner to command "Exit EPB Service Mode" and perform automatic calibration cycle.',
      'Pump pedal to set clearance; verify zero EPB fault codes on dashboard.',
    ],
    diagnosticTips: [
      'NEVER force a rear EPB piston back with C-clamp without electronic service mode or motor damage will occur.',
    ],
  },
  {
    id: 'brk-fluid-flush',
    code: 'BRK-03',
    category: 'Brakes & Traction',
    title: 'Complete Brake Hydraulic Fluid Pressure Flush',
    description: 'Complete evacuation of contaminated hygroscopic brake fluid from reservoir and all 4 wheel caliper bleeders using pneumatic pressure bleeder.',
    bookHours: 0.9,
    warrantyHours: 0.7,
    mobileHours: 1.0,
    difficulty: 2,
    drivewayCapable: true,
    vehicleFitment: 'All Makes / Universal',
    requiredTools: ['Pneumatic / Vacuum Pressure Bleeder', 'Bleeder Wrench (8mm/10mm/11mm)', 'Fluid Moisture Tester'],
    recommendedParts: [
      { name: 'DOT 4 High-Temp Synthetic Brake Fluid (32oz)', qty: 2, typicalCostDollars: 24, partType: 'Fluid / Chemical' },
    ],
    torqueSpecs: [
      { component: 'Caliper Bleeder Screws', spec: '7–12 ft-lbs (Do not overtighten)' },
    ],
    procedureSteps: [
      'Test existing fluid moisture content (>3% indicates immediate failure).',
      'Evacuate old dark fluid from master cylinder reservoir using suction syringe.',
      'Fill master cylinder with fresh DOT 4 fluid and attach pressure bleeder cap.',
      'Bleed sequence: Right Rear → Left Rear → Right Front → Left Front (or OEM ABS sequence).',
      'Bleed until crystal-clear fluid flows with zero air bubbles.',
      'Wipe bleeder valves and reinstall rubber dust caps to prevent water ingress.',
    ],
    diagnosticTips: [
      'Moisture in brake fluid reduces boiling point from 446°F down to <300°F causing brake fade under load.',
    ],
  },

  // --- ELECTRICAL & STARTING ---
  {
    id: 'elc-battery-agm-swap',
    code: 'ELC-01',
    category: 'Electrical & Starting',
    title: '12V AGM Battery Replacement & BMS Registration',
    description: 'R&I 12V high-capacity AGM battery, terminal post anti-corrosion treat, memory saver preserve, OBD-II Battery Management System (BMS) reset / registration.',
    bookHours: 0.7,
    warrantyHours: 0.5,
    mobileHours: 0.8,
    difficulty: 1,
    drivewayCapable: true,
    vehicleFitment: 'All Makes / Universal',
    requiredTools: ['OBD-II BMS Reset Scanner', '10mm/13mm Deep Sockets', 'Terminal Brush', 'Digital Multimeter / Load Tester'],
    recommendedParts: [
      { name: 'Group 48 / H6 or Group 65 AGM Battery (750+ CCA)', qty: 1, typicalCostDollars: 195, partType: 'Premium Aftermarket' },
      { name: 'Anti-Corrosion Terminal Protector Washers & Gel', qty: 1, typicalCostDollars: 5, partType: 'Fluid / Chemical' },
    ],
    torqueSpecs: [
      { component: 'Battery Terminal Clamps', spec: '4–6 ft-lbs (50–70 in-lbs)' },
      { component: 'Battery Hold-Down Bracket Bolt', spec: '7–9 ft-lbs' },
    ],
    procedureSteps: [
      'Connect OBD-II memory keeper to preserve radio, clock, and ECU adaptations.',
      'Disconnect Negative (-) ground terminal first, followed by Positive (+) terminal.',
      'Remove battery hold-down wedge/bracket bolt and extract heavy old battery.',
      'Clean corrosion from battery tray and terminal clamps with terminal wire brush.',
      'Drop in new AGM battery; tighten hold-down bracket securely.',
      'Connect Positive (+) cable first, followed by Negative (-) cable.',
      'Connect diagnostic tool and perform "Register New Battery / Reset BMS Days of Service".',
      'Test alternator charging rate under load (13.8V – 14.5V normal).',
    ],
    diagnosticTips: [
      'Modern vehicles with smart alternators overcharge new AGM batteries if BMS registration is omitted, shortening battery life by 50%.',
    ],
  },
  {
    id: 'elc-starter-motor',
    code: 'ELC-02',
    category: 'Electrical & Starting',
    title: 'Starter Motor & Solenoid Assembly Replacement',
    description: 'Diagnose no-crank / click condition, R&I starter motor assembly, test B+ supply cable and ignition solenoid signal wire, verify flywheel ring gear teeth.',
    bookHours: 1.6,
    warrantyHours: 1.2,
    mobileHours: 1.8,
    difficulty: 3,
    drivewayCapable: true,
    vehicleFitment: 'All Makes / Universal',
    requiredTools: ['1/4" & 3/8" Ratchet Set with Swivel Extensions', 'Digital Multimeter', 'Heavy-Duty Jack Stands'],
    recommendedParts: [
      { name: 'OEM Remanufactured High-Torque Starter Motor', qty: 1, typicalCostDollars: 165, partType: 'Premium Aftermarket' },
    ],
    torqueSpecs: [
      { component: 'Starter Mounting Bolts (Bellhousing)', spec: '35–45 ft-lbs' },
      { component: 'Starter B+ Main Terminal Nut', spec: '8–11 ft-lbs' },
      { component: 'S-Terminal Signal Nut', spec: '3–4 ft-lbs' },
    ],
    procedureSteps: [
      'CRITICAL: Disconnect negative battery terminal before touching starter B+ wire.',
      'Safely raise vehicle and locate starter on engine bellhousing.',
      'Inspect starter electrical harness for heat degradation or oil saturation from valve cover leaks.',
      'Remove B+ terminal nut and disconnect trigger wire.',
      'Support starter and remove bellhousing mounting bolts.',
      'Inspect flywheel / flexplate ring gear teeth for missing teeth or severe wear.',
      'Position new starter and hand-thread all bolts before torquing to specification.',
      'Torque B+ terminal nut securely and reinstall rubber protective boot.',
      'Reconnect battery and perform 3 test crank cycles.',
    ],
    diagnosticTips: [
      'Check for voltage drop across B+ battery cable if new starter cranks sluggishly (<0.3V drop is acceptable).',
    ],
  },
  {
    id: 'elc-alternator',
    code: 'ELC-03',
    category: 'Electrical & Starting',
    title: 'Alternator / Charging System Generator Replacement',
    description: 'Diagnose battery warning light / diode failure, release serpentine drive belt tensioner, R&I alternator, verify charging output voltage and ripple current.',
    bookHours: 1.7,
    warrantyHours: 1.3,
    mobileHours: 1.9,
    difficulty: 3,
    drivewayCapable: true,
    vehicleFitment: 'All Makes / Universal',
    requiredTools: ['Serpentine Belt Tensioner Tool', 'Multimeter with AC Ripple test', 'Socket Set'],
    recommendedParts: [
      { name: '130A–220A High-Output Alternator Assembly', qty: 1, typicalCostDollars: 210, partType: 'Premium Aftermarket' },
      { name: 'Serpentine Micro-V Drive Belt', qty: 1, typicalCostDollars: 32, partType: 'Premium Aftermarket' },
    ],
    torqueSpecs: [
      { component: 'Alternator Pivot & Mounting Bolts', spec: '35–45 ft-lbs' },
      { component: 'Alternator B+ Output Post Nut', spec: '9–12 ft-lbs' },
    ],
    procedureSteps: [
      'Disconnect battery negative terminal.',
      'Relieve serpentine belt tension with belt tool and remove belt from alternator pulley.',
      'Disconnect electrical connector plug and main 12V B+ output cable.',
      'Remove alternator bracket through-bolts; maneuver alternator out of engine bay.',
      'Compare new alternator pulley groove count and connector pinout with old unit.',
      'Mount new alternator; torque bolts to spec in proper sequence.',
      'Install new serpentine belt following underhood belt routing diagram.',
      'Reconnect battery, start vehicle, verify 14.1V–14.6V charging output with headlights and AC on max.',
    ],
    diagnosticTips: [
      'Check AC ripple voltage. More than 0.5V AC indicates blown rectifier diodes that kill batteries overnight.',
    ],
  },
  {
    id: 'elc-spark-plugs-coils',
    code: 'ELC-04',
    category: 'Electrical & Starting',
    title: 'Iridium Spark Plugs & Ignition Coil Packs Service',
    description: 'Diagnose misfires (P0300–P0308), remove intake charge pipes if applicable, R&I spark plugs, check gap, apply dielectric grease, install ignition coils.',
    bookHours: 1.5,
    warrantyHours: 1.1,
    mobileHours: 1.7,
    difficulty: 2,
    drivewayCapable: true,
    vehicleFitment: 'All Makes / Universal',
    requiredTools: ['Magnetic Spark Plug Socket (5/8" or 9/16")', 'Feeler Wire Gap Gauge', 'Dielectric Grease', '1/4" Torque Wrench'],
    recommendedParts: [
      { name: 'Laser Iridium Spark Plugs (NGK / Denso / Motorcraft)', qty: 6, typicalCostDollars: 72, partType: 'OEM' },
      { name: 'Ignition Coil Pack Assembly', qty: 6, typicalCostDollars: 180, partType: 'Premium Aftermarket' },
      { name: 'Dielectric Silicone Compound', qty: 1, typicalCostDollars: 6, partType: 'Fluid / Chemical' },
    ],
    torqueSpecs: [
      { component: 'Spark Plugs (Aluminum Heads)', spec: '12–15 ft-lbs (NEVER overtighten)' },
      { component: 'Ignition Coil Hold-down Bolts (10mm)', spec: '7–8 ft-lbs (80–95 in-lbs)' },
    ],
    procedureSteps: [
      'Allow engine to cool down to ambient temperature to prevent aluminum cylinder head thread damage.',
      'Carefully unclip fragile plastic coil harness connectors with pick tool.',
      'Remove 10mm coil hold-down bolts and twist coil boots gently to break suction before pulling.',
      'Blow compressed air into spark plug wells to blow out debris before plug removal.',
      'Use magnetic plug socket to extract old spark plugs; inspect electrode color for lean/rich/oil fouling.',
      'Verify gap on new Iridium plugs with feeler gauge (do not pry against fine iridium tip).',
      'Thread new plugs in by hand using extension rod to avoid cross-threading.',
      'Torque plugs to 13 ft-lbs using calibrated torque wrench.',
      'Apply thin film of dielectric grease to rubber coil boots and secure coil packs.',
      'Clear ECU fault codes and perform smooth idle live misfire counter check.',
    ],
    diagnosticTips: [
      'Always replace rubber coil boot insulators when replacing plugs; hardened boots cause high-voltage spark arcing.',
    ],
  },

  // --- ENGINE & VALVETRAIN ---
  {
    id: 'eng-valve-cover-gasket',
    code: 'ENG-01',
    category: 'Engine & Valvetrain',
    title: 'Valve Cover Gasket & Spark Plug Tube Seals Replacement',
    description: 'Diagnose oil leaks onto exhaust manifold or into spark plug tubes, remove coils/harnesses, R&I valve cover, clean mating surfaces, apply RTV at cam caps.',
    bookHours: 2.5,
    warrantyHours: 1.9,
    mobileHours: 2.8,
    difficulty: 3,
    drivewayCapable: true,
    vehicleFitment: 'All Makes / Universal',
    requiredTools: ['Plastic Gasket Scraper', 'Brake Cleaner', '1/4" Inch-Pound Torque Wrench', 'Ultra Grey/Black RTV Silicone'],
    recommendedParts: [
      { name: 'Molded Rubber Valve Cover Gasket Set with Tube Seals', qty: 1, typicalCostDollars: 45, partType: 'OEM' },
      { name: 'High-Temp Oil-Resistant RTV Gasket Maker', qty: 1, typicalCostDollars: 12, partType: 'Fluid / Chemical' },
    ],
    torqueSpecs: [
      { component: 'Valve Cover Perimeter Bolts', spec: '7–9 ft-lbs (80–105 in-lbs in center-out sequence)' },
    ],
    procedureSteps: [
      'Disconnect negative battery terminal; label and disconnect PCV hoses and sensor wiring.',
      'Remove ignition coils and set aside.',
      'Remove valve cover perimeter bolts in reverse order of tightening.',
      'Gently pry cover loose with plastic trim tool (never drive steel screwdriver into aluminum head).',
      'Peel away old hardened brittle gasket and spark plug tube seals.',
      'Clean cylinder head mating surface with brake cleaner and plastic scraper until bone-dry and spotless.',
      'Apply pea-sized dabs of high-temp RTV sealant at the front timing cover-to-cylinder head joint cracks.',
      'Seat new rubber gasket into valve cover groove; ensure tube seals sit straight.',
      'Torque bolts in star/spiral pattern from center outward to avoid warping magnesium/plastic cover.',
      'Reinstall coils, reconnect PCV hoses, run engine and check for zero oil seepage.',
    ],
    diagnosticTips: [
      'Oil in spark plug wells causes intermittent cylinder misfires under heavy throttle load.',
    ],
  },
  {
    id: 'eng-water-pump-thermostat',
    code: 'ENG-02',
    category: 'Engine & Valvetrain',
    title: 'Engine Water Pump & Thermostat Housing Assembly',
    description: 'Diagnose coolant leak / weeping bearing or overheating, drain engine cooling system, R&I serpentine belt, replace water pump and thermostat, vacuum refill.',
    bookHours: 2.8,
    warrantyHours: 2.1,
    mobileHours: 3.2,
    difficulty: 3,
    drivewayCapable: true,
    vehicleFitment: 'All Makes / Universal',
    requiredTools: ['Cooling System Vacuum Fill Kit', 'Hose Clamp Pliers', 'Torque Wrench', 'Drain Pan'],
    recommendedParts: [
      { name: 'Heavy-Duty Mechanical Water Pump with Metal Impeller', qty: 1, typicalCostDollars: 95, partType: 'OEM' },
      { name: 'Integrated Thermostat & Housing Assembly (195°F)', qty: 1, typicalCostDollars: 48, partType: 'OEM' },
      { name: '50/50 Prediluted OEM Engine Coolant (Gal)', qty: 2, typicalCostDollars: 44, partType: 'Fluid / Chemical' },
    ],
    torqueSpecs: [
      { component: 'Water Pump Mounting Bolts (M8)', spec: '18–22 ft-lbs' },
      { component: 'Water Pump Pulley Bolts', spec: '15–18 ft-lbs' },
      { component: 'Thermostat Housing Bolts', spec: '8–10 ft-lbs' },
    ],
    procedureSteps: [
      'Allow engine to cool completely; place drain pan under radiator drain petcock and drain coolant.',
      'Loosen water pump pulley bolts while serpentine belt tension is still applied.',
      'Remove serpentine drive belt.',
      'Remove water pump pulley and unbolt water pump assembly.',
      'Clean engine block gasket surface thoroughly; remove all old paper/RTV remnants.',
      'Install new water pump with new pre-formed gasket / O-ring; torque in cross pattern.',
      'Replace thermostat and seal housing to prevent future sticking.',
      'Reinstall water pump pulley and serpentine belt.',
      'Connect vacuum coolant refiller, draw 25 inHg vacuum, verify system holds vacuum (no leaks), and refill coolant.',
      'Run engine until thermostat opens; verify heater core blows 130°F+ hot air and cooling fans cycle.',
    ],
    diagnosticTips: [
      'Air pockets in modern aluminum engines cause rapid localized cylinder head hot-spots and warped heads.',
    ],
  },

  // --- HEATING & AIR CONDITIONING ---
  {
    id: 'ac-evac-recharge',
    code: 'AC-01',
    category: 'Heating & Air Conditioning',
    title: 'R134a / R1234yf AC System Vacuum Test & Precision Recharge',
    description: 'Diagnose warm AC / vent temperatures, recover residual refrigerant, pull 29.5 inHg deep vacuum to boil off moisture, inject UV leak detection dye, recharge exact factory oz spec.',
    bookHours: 1.2,
    warrantyHours: 0.9,
    mobileHours: 1.4,
    difficulty: 2,
    drivewayCapable: true,
    vehicleFitment: 'All Makes / Universal',
    requiredTools: ['Automotive AC Gauge Manifold & Digital Scale', 'High-CFM Vacuum Pump', 'UV Leak Detection Flashlight', 'Digital Vent Thermometer'],
    recommendedParts: [
      { name: 'Virgin R134a Refrigerant (12oz Cans / Bulk)', qty: 2, typicalCostDollars: 36, partType: 'Fluid / Chemical' },
      { name: 'PAG 46 / PAG 100 Synthetic Compressor Oil + UV Dye', qty: 1, typicalCostDollars: 16, partType: 'Fluid / Chemical' },
    ],
    torqueSpecs: [
      { component: 'AC Service Port Valve Caps', spec: 'Finger tight' },
      { component: 'AC Schrader Valve Core', spec: '3–5 in-lbs' },
    ],
    procedureSteps: [
      'Connect high & low side quick-connect couplers; record static pressures.',
      'Evacuate system with vacuum pump for minimum 30 minutes to boil off internal moisture.',
      'Perform 10-minute static vacuum decay test; ensure system holds deep vacuum with 0 gauge drift.',
      'Inject 2oz PAG synthetic compressor oil with fluorescent UV dye.',
      'Zero digital refrigerant scale and charge manufacturer exact mass (e.g. 18 oz R134a).',
      'Start engine, turn AC to MAX Cool, recirculate, blower on high.',
      'Monitor low side (28–38 PSI) and high side (150–225 PSI dependent on ambient temp).',
      'Measure center vent temperature (must drop to 38°F – 45°F).',
      'Scan entire engine bay AC lines, condenser, compressor shaft seal with UV light.',
    ],
    diagnosticTips: [
      'Never overcharge AC refrigerant by guessing with DIY trigger cans — 2 extra ounces reduces cooling efficiency by 25% and causes compressor hydraulic lock.',
    ],
  },

  // --- SUSPENSION & STEERING ---
  {
    id: 'sus-control-arm-balljoint',
    code: 'SUS-01',
    category: 'Suspension & Steering',
    title: 'Front Lower Control Arm Assembly with Ball Joint & Bushings',
    description: 'Diagnose clunking over bumps / wandering steering / torn bushings, separate ball joint taper from steering knuckle, R&I control arm assembly, align geometry.',
    bookHours: 2.2,
    warrantyHours: 1.6,
    mobileHours: 2.5,
    difficulty: 3,
    drivewayCapable: true,
    vehicleFitment: 'All Makes / Universal',
    requiredTools: ['Ball Joint Separator / Pickle Fork', 'Heavy-Duty Breaker Bar (1/2")', 'Jack & Stands', 'Torque Wrench'],
    recommendedParts: [
      { name: 'Heavy-Duty Complete Lower Control Arm with Sealed Ball Joint', qty: 2, typicalCostDollars: 160, partType: 'Premium Aftermarket' },
      { name: 'New Castle Nut & Cotter Pin Kit', qty: 1, typicalCostDollars: 8, partType: 'Premium Aftermarket' },
    ],
    torqueSpecs: [
      { component: 'Ball Joint Stud Pinch Bolt / Castle Nut', spec: '55–75 ft-lbs' },
      { component: 'Subframe Bushing Pivot Bolts', spec: '85–110 ft-lbs (Torque at ride height!)' },
      { component: 'Sway Bar End Link Nut', spec: '45–55 ft-lbs' },
    ],
    procedureSteps: [
      'Raise front of vehicle safely and remove front wheels.',
      'Disconnect sway bar end link from control arm.',
      'Remove ball joint pinch bolt or remove cotter pin and loosen castle nut.',
      'Use mechanical ball joint puller to separate taper from knuckle without damaging ABS sensor wires.',
      'Remove front and rear control arm pivot through-bolts from subframe.',
      'Maneuver old control arm out; clean subframe mounting pockets.',
      'Install new control arm; thread pivot bolts finger-tight.',
      'Insert ball joint stud into knuckle and torque to spec; insert fresh cotter pin.',
      'CRITICAL: Place floor jack under control arm and compress suspension to normal RIDE HEIGHT before final torquing of pivot bushing bolts to prevent premature bushing tearing.',
      'Recommend 4-wheel computerized alignment.',
    ],
    diagnosticTips: [
      'Torquing suspension rubber bushings with wheels hanging in the air twists and destroys the rubber within 2,000 miles.',
    ],
  },
  {
    id: 'sus-struts-shocks-quick',
    code: 'SUS-02',
    category: 'Suspension & Steering',
    title: 'Front Complete Quick-Strut Assemblies Replacement',
    description: 'Diagnose nose-dive under braking / bounce / blown hydraulic oil, remove wiper cowl if needed, unbolt knuckle pinch bolts, replace pre-assembled strut & coil springs.',
    bookHours: 2.0,
    warrantyHours: 1.5,
    mobileHours: 2.3,
    difficulty: 2,
    drivewayCapable: true,
    vehicleFitment: 'All Makes / Universal',
    requiredTools: ['Pass-through Strut Nut Socket', 'Heavy-Duty Impact Wrench', 'Torque Wrench', 'Floor Jack & Stands'],
    recommendedParts: [
      { name: 'Monroe / KYB Complete Loaded Quick-Strut Assembly', qty: 2, typicalCostDollars: 240, partType: 'Premium Aftermarket' },
      { name: 'Heavy-Duty Front Sway Bar End Links', qty: 2, typicalCostDollars: 42, partType: 'Premium Aftermarket' },
    ],
    torqueSpecs: [
      { component: 'Upper Strut Mount Body Nuts (3x)', spec: '25–35 ft-lbs' },
      { component: 'Lower Knuckle Cleve Bolts (2x M14)', spec: '110–145 ft-lbs' },
      { component: 'Brake Line Bracket Screw', spec: '8–12 ft-lbs' },
    ],
    procedureSteps: [
      'Remove upper strut tower dust caps / access panels under hood.',
      'Loosen top mount nuts (do NOT loosen center piston rod nut).',
      'Raise vehicle, support on jack stands, and remove front wheels.',
      'Unbolt ABS wheel speed sensor wire bracket and brake flex hose from strut body.',
      'Disconnect sway bar end link from strut body.',
      'Remove lower knuckle clevis through-bolts and separate steering knuckle from strut.',
      'Support strut and remove upper mount nuts; lower complete strut assembly out.',
      'Position new pre-assembled Quick-Strut into tower; thread top nuts hand-tight.',
      'Attach knuckle to lower strut bracket; install through-bolts and torque to OEM spec.',
      'Reattach sway link and brake line brackets; torque upper strut mount nuts.',
      'Road test vehicle for zero squeaks, rattle, or drifting.',
    ],
    diagnosticTips: [
      'Always replace struts in pairs (both front or both rear) to maintain balanced braking and handling stability.',
    ],
  },

  // --- MAINTENANCE & FLUIDS ---
  {
    id: 'maint-synthetic-oil-50pt',
    code: 'MNT-01',
    category: 'Maintenance & Fluids',
    title: 'Full Synthetic Oil Service & 50-Point Digital Inspection',
    description: 'Drain contaminated engine oil, replace OEM spec oil filter, install new drain plug crush washer, refill manufacturer viscosity synthetic oil, reset oil life monitor, comprehensive digital photo report.',
    bookHours: 0.6,
    warrantyHours: 0.4,
    mobileHours: 0.7,
    difficulty: 1,
    drivewayCapable: true,
    vehicleFitment: 'All Makes / Universal',
    requiredTools: ['Oil Drain Pan', 'Filter Cap Wrench Socket', 'Digital Oil Life Reset Tool', 'Tire Pressure Gauge & Tread Depth Gauge'],
    recommendedParts: [
      { name: 'Mobil 1 / Castrol Edge Full Synthetic Motor Oil (5–7 Quarts)', qty: 1, typicalCostDollars: 42, partType: 'Fluid / Chemical' },
      { name: 'WIX / Mobil 1 High-Efficiency Spin-on or Cartridge Filter', qty: 1, typicalCostDollars: 14, partType: 'OEM' },
      { name: 'Copper / Aluminum Drain Plug Crush Gasket', qty: 1, typicalCostDollars: 2, partType: 'OEM' },
    ],
    torqueSpecs: [
      { component: 'Engine Oil Drain Plug', spec: '18–25 ft-lbs (NEVER strip pan threads)' },
      { component: 'Cartridge Filter Plastic Housing Cap', spec: '18 ft-lbs (25 N-m)' },
    ],
    procedureSteps: [
      'Warm engine slightly to suspend contaminants; raise vehicle on ramps or stands.',
      'Place oil drain container underneath oil pan drain plug.',
      'Remove drain plug and oil fill cap; allow old oil to drain for full 10 minutes.',
      'Remove old oil filter; verify old rubber O-ring came off with filter and is not stuck to block.',
      'Lube new filter gasket with fresh oil; hand-tighten 3/4 turn after gasket contacts base.',
      'Install new drain plug crush washer and torque drain plug to 20 ft-lbs.',
      'Refill engine with exact manufacturer capacity & viscosity (0W-20, 5W-30, etc.).',
      'Start engine, check for oil pressure light extinguishing within 2 seconds, check for leaks.',
      'Shut off engine, wait 3 minutes, verify oil dipstick level is precisely at the upper full mark.',
      'Reset dashboard Oil Life % monitor and perform 50-Point digital vehicle health inspection.',
    ],
    diagnosticTips: [
      'Modern turbocharged direct-injection (GDI) engines suffer from fuel dilution; always adhere to 5,000-mile full synthetic intervals.',
    ],
  },
  {
    id: 'maint-trans-drain-fill',
    code: 'MNT-02',
    category: 'Maintenance & Fluids',
    title: 'Automatic Transmission Fluid Drain, Filter & Level Set',
    description: 'Drain transmission fluid, drop pan, clean internal magnets of metallic sludge, replace transmission filter and pan gasket, refill OEM fluid, level set at 104°F–122°F scan tool temp.',
    bookHours: 1.8,
    warrantyHours: 1.3,
    mobileHours: 2.0,
    difficulty: 3,
    drivewayCapable: true,
    vehicleFitment: 'All Makes / Universal',
    requiredTools: ['Fluid Transfer Pump', 'OBD-II Live Transmission Temp Scanner', 'Torque Wrench', 'Level Surface'],
    recommendedParts: [
      { name: 'OEM Spec Full Synthetic ATF (Mercon LV, WS, Dexron VI, +4)', qty: 6, typicalCostDollars: 66, partType: 'Fluid / Chemical' },
      { name: 'Transmission Filter & Molded Rubber Pan Gasket Set', qty: 1, typicalCostDollars: 38, partType: 'OEM' },
    ],
    torqueSpecs: [
      { component: 'Transmission Pan Bolts (M6)', spec: '7–9 ft-lbs (80–100 in-lbs)' },
      { component: 'Transmission Level Check Plug', spec: '15–20 ft-lbs' },
    ],
    procedureSteps: [
      'Safely raise vehicle completely level on 4 stands.',
      'Loosen transmission pan bolts starting at the rear to drain fluid into catch pan.',
      'Remove pan; clean black friction sludge and metallic debris off internal magnets with lint-free rag.',
      'Pull out old transmission filter and O-ring seal; install new filter.',
      'Clean pan mating flange; install new pan gasket and torque bolts in criss-cross pattern to 85 in-lbs.',
      'Pump 4–5 quarts of new ATF fluid through fill port.',
      'Start engine, cycle shifter through P-R-N-D-1-2 pausing 3 seconds in each gear.',
      'Monitor transmission fluid temperature on scan tool until it reaches operating window (40°C–50°C / 104°F–122°F).',
      'Remove level check plug while engine is running in Park; let excess fluid trickle out until steady stream becomes thin drip, then reinstall plug.',
    ],
    diagnosticTips: [
      'Checking transmission fluid level cold or with the engine off results in severe underfilling and transmission slippage.',
    ],
  },
];

/**
 * Calculates a complete repair order quote based on selected operations, custom items,
 * shop labor rate, and parts markup.
 */
export function calculateRepairOrder(
  lineItems: RepairOrderLineItem[],
  laborRatePerHour: number = 145,
  options?: {
    shopSuppliesPercentage?: number; // default 0.05 (5%)
    shopSuppliesMaxDollars?: number;  // default 45
    taxPercentage?: number;           // default 0.0825 (8.25% Texas sales tax)
    techLaborSharePercentage?: number;// default 0.70 (70% tech split)
  }
): RepairOrderCalculation {
  const suppliesRate = options?.shopSuppliesPercentage ?? 0.05;
  const suppliesMax = options?.shopSuppliesMaxDollars ?? 45;
  const taxRate = options?.taxPercentage ?? 0.0825;
  const techShareRate = options?.techLaborSharePercentage ?? 0.70;

  let totalHours = 0;
  let laborSubtotal = 0;
  let partsSubtotal = 0;

  for (const item of lineItems) {
    totalHours += item.hours;
    laborSubtotal += item.hours * (item.laborRatePerHour || laborRatePerHour);
    for (const p of item.parts) {
      partsSubtotal += p.costPerUnit * p.qty;
    }
  }

  const rawSupplies = (laborSubtotal + partsSubtotal) * suppliesRate;
  const shopSuppliesFee = Math.min(rawSupplies, suppliesMax);
  const taxableAmount = partsSubtotal + shopSuppliesFee;
  const taxAmount = taxableAmount * taxRate;
  const grandTotal = laborSubtotal + partsSubtotal + shopSuppliesFee + taxAmount;

  const techPayoutLabor = laborSubtotal * techShareRate;
  const platformShareLabor = laborSubtotal * (1 - techShareRate);

  return {
    totalHours: Number(totalHours.toFixed(1)),
    laborSubtotal: Number(laborSubtotal.toFixed(2)),
    partsSubtotal: Number(partsSubtotal.toFixed(2)),
    shopSuppliesFee: Number(shopSuppliesFee.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    grandTotal: Number(grandTotal.toFixed(2)),
    techPayoutLabor: Number(techPayoutLabor.toFixed(2)),
    platformShareLabor: Number(platformShareLabor.toFixed(2)),
  };
}
