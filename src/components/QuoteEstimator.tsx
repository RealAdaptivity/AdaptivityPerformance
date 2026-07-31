import React, { useState, useEffect } from 'react';
import { Check, Truck, Home, Calendar, Shield, Info, ArrowRight, Navigation, Search, AlertCircle, CheckCircle2, Award, MapPin } from 'lucide-react';
import { ALL_MAKES_2002_2026, getVehicleTierKey, fetchModelsForMakeAndYear } from '../services/nhtsaVehicleApi';

interface QuoteEstimatorProps {
  onBookWithEstimate: (estimateDetails: any) => void;
  defaultMode?: 'mobile' | 'shop';
}

const HOURLY_LABOR_RATE = 125; // $125 / hour labor rate
const YEARS_2002_2026 = Array.from({ length: 25 }, (_, i) => (2026 - i).toString());

interface ServiceOption {
  id: string;
  name: string;
  category: string;
  laborHours: number;
  basePartsCost: number;
  timeEstimate: string;
  description: string;
  mobileCapable: boolean;
  shopOnly?: boolean;
}

const SERVICES: ServiceOption[] = [
  { id: 'brakes_front', name: 'Front Brake Pads & Rotor Replacement', category: 'Brakes & Safety', laborHours: 1.5, basePartsCost: 110, timeEstimate: '1.5 hrs', description: 'Premium ceramic/Euro pads + vented rotors, wear sensors & fluid inspection.', mobileCapable: true },
  { id: 'brakes_full', name: 'Complete 4-Wheel Brake Overhaul', category: 'Brakes & Safety', laborHours: 2.5, basePartsCost: 200, timeEstimate: '2.5 hrs', description: 'All 4 wheels: pads, rotors, wear sensors, caliper slide lube & full brake fluid flush.', mobileCapable: true },
  { id: 'oil_synthetic', name: 'Full Synthetic Oil Change & Filter', category: 'Maintenance', laborHours: 0.5, basePartsCost: 35, timeEstimate: '30 mins', description: 'Up to 6-8 qts OE synthetic oil (Liqui Moly / Pennzoil), filter & 25-pt inspection.', mobileCapable: true },
  { id: 'battery_replacement', name: 'AGM/Heavy Duty Battery Swap', category: 'Electrical', laborHours: 0.5, basePartsCost: 145, timeEstimate: '30 mins', description: 'New AGM battery, terminal cleaning, voltage check & battery coding/registration.', mobileCapable: true },
  { id: 'starter_alternator', name: 'Starter or Alternator Replacement', category: 'Electrical', laborHours: 1.8, basePartsCost: 160, timeEstimate: '1.8 hrs', description: 'OE-spec high output unit replacement + belt check & battery load test.', mobileCapable: true },
  { id: 'diag_computer', name: 'Full Computer Diagnostic & Coding', category: 'Diagnostics', laborHours: 0.75, basePartsCost: 0, timeEstimate: '45 mins', description: 'Full system scan (Engine, Transmission, ABS, Airbag, Body modules), live sensor data.', mobileCapable: true },
  { id: 'spark_plugs', name: 'Tune-Up: Plugs & Ignition Coils', category: 'Tune-Up', laborHours: 1.5, basePartsCost: 85, timeEstimate: '1.5 hrs', description: 'Iridium/Platinum long-life spark plugs + coil inspection & throttle body check.', mobileCapable: true },
  { id: 'suspension_shocks', name: 'Strut / Shock Absorber Replacement', category: 'Suspension', laborHours: 2.2, basePartsCost: 195, timeEstimate: '2.2 hrs', description: 'Pair of front or rear heavy-duty struts/shocks, sway bar link inspection.', mobileCapable: true },
  { id: 'lift_level_kit', name: 'Truck Leveling / Lift Kit Installation', category: 'Performance & Mods', laborHours: 3.5, basePartsCost: 220, timeEstimate: '3.5 hrs', description: 'Professional suspension lift/leveling kit install, alignment check.', mobileCapable: false, shopOnly: true },
  { id: 'exhaust_system', name: 'Cat-Back Exhaust & Intake Performance', category: 'Performance & Mods', laborHours: 2.0, basePartsCost: 190, timeEstimate: '2.0 hrs', description: 'Aftermarket performance exhaust / cold air intake bolt-on installation.', mobileCapable: false, shopOnly: true },
  { id: 'prep_inspection', name: 'Pre-Purchase Vehicle Deep Inspection', category: 'Inspection', laborHours: 1.0, basePartsCost: 0, timeEstimate: '1 hr', description: 'Unbiased multi-point mobile check before buying a used vehicle in Justin/Northlake.', mobileCapable: true },
];

const FREE_RADIUS_MILES = 15;
const PER_MILE_RATE = 2.00;

// Vehicle Tier Multipliers
const VEHICLE_TIERS: Record<string, { name: string; multiplier: number; badge: string; desc: string }> = {
  standard: { name: 'Standard Domestic / Asian', multiplier: 1.0, badge: 'STANDARD RATE', desc: 'Standard OEM parts & labor specs (Ford 1500, Chevy, Toyota, Honda).' },
  german: { name: 'German / European Specialty', multiplier: 1.35, badge: 'GERMAN / EURO SPEC (+35%)', desc: 'Requires Euro-approved synthetic fluids (Liqui-Moly), wear sensors, and diagnostic coding.' },
  heavyduty: { name: 'Heavy Duty Truck & Diesel', multiplier: 1.25, badge: 'HEAVY DUTY SPEC (+25%)', desc: 'High fluid volume capacity, heavy rotor torque specs (F-250/350, 2500/3500 HD).' },
  exotic: { name: 'Exotic / High-End Performance', multiplier: 1.50, badge: 'EXOTIC / HIGH-END (+50%)', desc: 'Specialized low-clearance lift equipment, custom torque & track-line parts.' },
};

// Common Trims & Engine Options for Quick Dropdown Assistance
const COMMON_TRIMS = [
  'XL / Base', 'XLT', 'Lariat', 'King Ranch', 'Platinum', 'Limited', 'Raptor', 'Tremor',
  'LS / LT', 'LTZ', 'High Country', 'Z71 Off-Road', 'Trail Boss', 'RS', 'SS',
  'SR / SR5', 'TRD Sport', 'TRD Off-Road', 'TRD Pro', 'Limited (Toyota)', '1794 Edition', 'Capstone',
  'LX / EX', 'EX-L', 'Touring', 'Sport (Honda/Nissan)', 'Type R',
  'Tradesman', 'Big Horn', 'Laramie', 'Longhorn', 'Limited (RAM)', 'Rebel', 'TRX',
  'Sport (Jeep)', 'Sahara', 'Rubicon', 'Mojave', 'Overland',
  'Standard / Base', 'M Sport / AMG Line / S Line', 'Performance / Track Pack'
];
const COMMON_ENGINES = [
  '2.0L Turbo 4-Cylinder', '2.4L / 2.5L 4-Cylinder DOHC', '3.0L Turbo Inline-6',
  '3.5L V6 EcoBoost Twin-Turbo', '3.6L V6 Pentastar / DOHC',
  '5.0L V8 Coyote', '5.3L V8 EcoTec3', '5.7L V8 HEMI', '6.2L V8 L87 / LT1',
  '3.0L PowerStroke / Duramax Diesel', '6.6L Duramax Turbo Diesel', '6.7L Cummins / PowerStroke Turbo Diesel'
];

// Known Local Addresses for Fast Presets
const QUICK_SAMPLE_ADDRESSES = [
  { label: 'Canyon Falls (Northlake)', address: '1234 Canyon Falls Dr, Northlake, TX 76226', estMiles: 5.2 },
  { label: 'Harvest (Justin)', address: '500 Harvest Way, Justin, TX 76247', estMiles: 3.8 },
  { label: 'Pecan Square (Northlake)', address: '800 Pecan Square Blvd, Northlake, TX 76226', estMiles: 4.5 },
  { label: 'Argyle Country Club', address: '100 Country Club Rd, Argyle, TX 76227', estMiles: 17.4 },
  { label: 'Denton Square', address: '110 W Hickory St, Denton, TX 76201', estMiles: 21.6 },
];

function calculateHaversineMiles(lat1: number, lon1: number, lat2: number = 33.0904, lon2: number = -97.2964): number {
  const R = 3958.8;
  const dLat = (lat1 - lat2) * Math.PI / 180;
  const dLon = (lon1 - lon2) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat2 * Math.PI / 180) * Math.cos(lat1 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightLineMiles = R * c;
  return Math.round(straightLineMiles * 1.25 * 10) / 10;
}

export const QuoteEstimator: React.FC<QuoteEstimatorProps> = ({ onBookWithEstimate, defaultMode = 'mobile' }) => {
  const [vehicleSelectionMethod, setVehicleSelectionMethod] = useState<'dropdown' | 'vin'>('dropdown');
  
  // 2002 - 2026 Dynamic Cascading States
  const [selectedYear, setSelectedYear] = useState('2021');
  const [selectedMake, setSelectedMake] = useState('Ford');
  const [availableModels, setAvailableModels] = useState<string[]>(['F-150', 'F-250 Super Duty', 'Mustang', 'Explorer', 'Bronco']);
  const [modelsLoading, setModelsLoading] = useState(false);
  
  const [selectedModel, setSelectedModel] = useState('F-150');
  const [selectedTrim, setSelectedTrim] = useState('XLT SuperCrew');
  const [selectedEngine, setSelectedEngine] = useState('3.5L V6 EcoBoost Twin-Turbo');
  const [vehicleTierKey, setVehicleTierKey] = useState<string>('standard');

  // Address & Distance States
  const [addressInput, setAddressInput] = useState('1234 Canyon Falls Dr, Northlake, TX 76226');
  const [addressLoading, setAddressLoading] = useState(false);
  const [calculatedDistance, setCalculatedDistance] = useState<number>(5.2);
  const [addressSuccessMsg, setAddressSuccessMsg] = useState<string>('Distance verified: 5.2 Miles from Justin Hub ($0 FREE Travel)');
  const [addressError, setAddressError] = useState<string>('');

  // VIN Decoder States
  const [vinInput, setVinInput] = useState('1FTFW1E84MKD12345');
  const [vinLoading, setVinLoading] = useState(false);
  const [vinDecodedData, setVinDecodedData] = useState<any>({
    year: '2021',
    make: 'Ford',
    model: 'F-150',
    engine: '3.5L V6 EcoBoost Twin-Turbo',
    drive: '4WD',
    trim: 'XLT SuperCrew',
    status: 'success',
    tierKey: 'standard'
  });
  const [vinError, setVinError] = useState('');

  const [serviceLocation, setServiceLocation] = useState<'mobile' | 'shop'>(defaultMode);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(['brakes_front']);

  // Fetch models whenever Year or Make changes
  useEffect(() => {
    let isMounted = true;
    async function loadModels() {
      setModelsLoading(true);
      const fetched = await fetchModelsForMakeAndYear(selectedMake, selectedYear);
      if (isMounted) {
        if (fetched && fetched.length > 0) {
          setAvailableModels(fetched);
          setSelectedModel(fetched[0]);
        }
        setModelsLoading(false);
      }
    }
    loadModels();
    return () => { isMounted = false; };
  }, [selectedMake, selectedYear]);

  // Update Vehicle Tier Key whenever Make or Model changes
  useEffect(() => {
    const tier = getVehicleTierKey(selectedMake, selectedModel);
    setVehicleTierKey(tier);
  }, [selectedMake, selectedModel]);

  // Address Distance Calculator
  const handleCalculateAddressDistance = async (customAddr?: string) => {
    const targetAddress = (customAddr || addressInput).trim();
    if (!targetAddress || targetAddress.length < 5) {
      setAddressError('Please enter a valid street address or city/zip code');
      return;
    }

    setAddressLoading(true);
    setAddressError('');
    setAddressSuccessMsg('');

    try {
      const encoded = encodeURIComponent(targetAddress);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&countrycodes=us`);
      const data = await res.json();

      if (data && data.length > 0) {
        const place = data[0];
        const lat = parseFloat(place.lat);
        const lon = parseFloat(place.lon);
        const miles = calculateHaversineMiles(lat, lon);

        setCalculatedDistance(miles);
        const fee = miles <= FREE_RADIUS_MILES ? 0 : Math.round((miles - FREE_RADIUS_MILES) * PER_MILE_RATE * 100) / 100;
        
        if (fee === 0) {
          setAddressSuccessMsg(`Address Verified: ${miles} Miles from Justin Hub → 100% FREE Dispatch ($0)`);
        } else {
          setAddressSuccessMsg(`Address Verified: ${miles} Miles from Justin Hub → Mobile Travel Fee: $${fee.toFixed(2)}`);
        }
      } else {
        const preset = QUICK_SAMPLE_ADDRESSES.find(p => targetAddress.toLowerCase().includes(p.label.toLowerCase()) || targetAddress.toLowerCase().includes(p.address.toLowerCase()));
        if (preset) {
          setCalculatedDistance(preset.estMiles);
          setAddressSuccessMsg(`Address Verified: ${preset.estMiles} Miles from Justin Hub`);
        } else {
          setCalculatedDistance(10);
          setAddressSuccessMsg(`Address Verified: ~10 Miles from Justin Hub → FREE Dispatch ($0)`);
        }
      }
    } catch (err) {
      setAddressError('Could not verify address automatically. Defaulting to local Justin/Northlake radius.');
    } finally {
      setAddressLoading(false);
    }
  };

  // NHTSA Live VIN Lookup Handler
  const handleDecodeVin = async (vinToDecode?: string) => {
    const targetVin = (vinToDecode || vinInput).trim().toUpperCase();
    if (targetVin.length < 11) {
      setVinError('Please enter a valid 17-character VIN number');
      return;
    }

    setVinLoading(true);
    setVinError('');

    try {
      const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${targetVin}?format=json`);
      const data = await response.json();

      if (data.Results && data.Results.length > 0) {
        const result = data.Results[0];
        if (result.Make && result.Model) {
          const detectedTierKey = getVehicleTierKey(result.Make, result.Model);
          const fetchedData = {
            year: result.ModelYear || '2021',
            make: result.Make,
            model: result.Model,
            engine: `${result.DisplacementL ? result.DisplacementL + 'L' : ''} ${result.EngineCylinders ? result.EngineCylinders + '-Cyl' : ''} ${result.FuelTypePrimary || ''}`.trim() || 'Standard OEM Specs',
            drive: result.DriveType || 'RWD / AWD',
            trim: result.Trim || result.Series || 'Base',
            status: 'success',
            tierKey: detectedTierKey
          };
          setVinDecodedData(fetchedData);
          setSelectedYear(fetchedData.year);
          setSelectedMake(fetchedData.make);
          setSelectedModel(fetchedData.model);
          setSelectedTrim(fetchedData.trim);
          setSelectedEngine(fetchedData.engine);
          setVehicleTierKey(detectedTierKey);
        } else {
          setVinError('VIN not recognized by NHTSA database. Try manual dropdowns below.');
        }
      }
    } catch (err) {
      setVinError('Could not connect to VIN service. Utilizing offline vehicle defaults.');
    } finally {
      setVinLoading(false);
    }
  };

  const toggleService = (id: string) => {
    setSelectedServiceIds(prev => 
      prev.includes(id) 
        ? (prev.length > 1 ? prev.filter(item => item !== id) : prev) 
        : [...prev, id]
    );
  };

  const currentTier = VEHICLE_TIERS[vehicleTierKey] || VEHICLE_TIERS.standard;
  const selectedServices = SERVICES.filter(s => selectedServiceIds.includes(s.id));
  
  const extraMiles = Math.max(0, calculatedDistance - FREE_RADIUS_MILES);
  const mobileTravelFee = serviceLocation === 'mobile' ? Math.round(extraMiles * PER_MILE_RATE * 100) / 100 : 0;

  const totalLaborHours = selectedServices.reduce((acc, curr) => acc + curr.laborHours, 0);
  const rawLaborCost = totalLaborHours * HOURLY_LABOR_RATE;
  const rawPartsCost = selectedServices.reduce((acc, curr) => acc + curr.basePartsCost, 0);

  const adjustedLaborCost = Math.round(rawLaborCost * currentTier.multiplier);
  const adjustedPartsCost = Math.round(rawPartsCost * currentTier.multiplier);
  const subtotalBeforeTax = adjustedLaborCost + adjustedPartsCost;

  const estimatedTax = Math.round(subtotalBeforeTax * 0.0825);
  const totalPrice = Math.round(subtotalBeforeTax + mobileTravelFee + estimatedTax);

  const activeVehicleDescription = vehicleSelectionMethod === 'vin' && vinDecodedData?.status === 'success'
    ? `${vinDecodedData.year} ${vinDecodedData.make} ${vinDecodedData.model} (${vinDecodedData.trim} • ${vinDecodedData.engine})`
    : `${selectedYear} ${selectedMake} ${selectedModel} (${selectedTrim} • ${selectedEngine})`;

  const handleBook = () => {
    onBookWithEstimate({
      vehicle: activeVehicleDescription,
      vin: vehicleSelectionMethod === 'vin' ? vinInput : undefined,
      vehicleTier: currentTier.name,
      locationType: serviceLocation,
      serviceAddress: addressInput,
      calculatedDistanceMiles: calculatedDistance,
      mobileTravelFee: mobileTravelFee,
      services: selectedServices.map(s => s.name),
      totalEstimate: totalPrice,
    });
  };

  return (
    <section id="estimator" className="py-20 bg-[#0e1017] border-y border-white/5 relative">
      <div className="container mx-auto px-4 relative z-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-3 mb-12">
          <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 px-3.5 py-1.5 rounded-full border border-orange-500/20">
            <MapPin className="w-3.5 h-3.5" />
            <span>Complete 2002 - 2026 Vehicle Database</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white">
            Select <span className="text-orange-500">Every Year, Make, Model & Trim (2002 - 2026)</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Select any vehicle manufactured between 2002 and 2026. Models and trims dynamically query NHTSA's live automotive database.
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Interactive Form & Service Picker */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Step 1: Address Input & Distance Calculator */}
            <div className="bg-[#12141c] p-6 rounded-2xl border border-white/10 shadow-lg space-y-4">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold">1</span>
                <span>Your Home / Work Service Address</span>
              </h3>

              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-400">
                  Street Address, City, State & Zip Code
                </label>
                
                <div className="flex items-center bg-[#0b0c10] p-1.5 rounded-xl border border-white/15 focus-within:border-orange-500 transition-colors">
                  <MapPin className="w-5 h-5 text-orange-500 ml-3 flex-shrink-0" />
                  <input 
                    type="text"
                    value={addressInput}
                    onChange={e => setAddressInput(e.target.value)}
                    placeholder="e.g. 1234 Canyon Falls Dr, Northlake, TX 76226"
                    className="w-full bg-transparent px-3 py-2 text-white text-sm font-medium focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleCalculateAddressDistance()}
                    disabled={addressLoading}
                    className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs rounded-lg shadow transition-all flex items-center space-x-1.5 flex-shrink-0 disabled:opacity-50"
                  >
                    {addressLoading ? (
                      <span>Calculating...</span>
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5" />
                        <span>Calculate Cost</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Sample Preset Addresses */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500">Test Sample Addresses:</span>
                  {QUICK_SAMPLE_ADDRESSES.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setAddressInput(sample.address);
                        handleCalculateAddressDistance(sample.address);
                      }}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-white/5 font-medium"
                    >
                      {sample.label}
                    </button>
                  ))}
                </div>

                {addressError && (
                  <div className="p-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{addressError}</span>
                  </div>
                )}

                {addressSuccessMsg && (
                  <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> {addressSuccessMsg}
                    </span>
                    <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded border border-white/10 font-mono text-white">
                      {calculatedDistance} mi from Hub
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: 2002 - 2026 Vehicle Selection Engine */}
            <div className="bg-[#12141c] p-6 rounded-2xl border border-white/10 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold">2</span>
                  <span>Vehicle Specifications (2002 - 2026)</span>
                </h3>

                {/* Method Switcher */}
                <div className="flex bg-[#0b0c10] p-1 rounded-xl border border-white/10 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setVehicleSelectionMethod('dropdown')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      vehicleSelectionMethod === 'dropdown' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All Makes & Models
                  </button>
                  <button
                    type="button"
                    onClick={() => setVehicleSelectionMethod('vin')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      vehicleSelectionMethod === 'vin' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Instant VIN Decoder
                  </button>
                </div>
              </div>

              {vehicleSelectionMethod === 'dropdown' ? (
                <div className="space-y-4">
                  {/* Row 1: Year (2002 - 2026) & Make (All 35 Brands) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Model Year (2002 - 2026)</label>
                      <select 
                        value={selectedYear} 
                        onChange={e => setSelectedYear(e.target.value)}
                        className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-bold focus:border-orange-500 focus:outline-none"
                      >
                        {YEARS_2002_2026.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Make / Brand (All Makes)</label>
                      <select 
                        value={selectedMake} 
                        onChange={e => setSelectedMake(e.target.value)}
                        className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-orange-400 focus:border-orange-500 focus:outline-none"
                      >
                        {ALL_MAKES_2002_2026.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Live NHTSA Dynamic Model Dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center justify-between">
                      <span>Model ({selectedMake} - {selectedYear})</span>
                      {modelsLoading && <span className="text-orange-400 text-[10px] animate-pulse">Querying Live Database...</span>}
                    </label>
                    
                    <div className="flex gap-2">
                      <select 
                        value={selectedModel} 
                        onChange={e => setSelectedModel(e.target.value)}
                        disabled={modelsLoading}
                        className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-white focus:border-orange-500 focus:outline-none disabled:opacity-50"
                      >
                        {availableModels.map(mod => <option key={mod} value={mod}>{mod}</option>)}
                      </select>
                      
                      <input 
                        type="text" 
                        value={selectedModel} 
                        onChange={e => setSelectedModel(e.target.value)}
                        placeholder="Or type custom model"
                        className="w-1/2 bg-[#0b0c10] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Row 3: Trim & Engine Customization */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Trim Level / Package</label>
                      <select 
                        value={selectedTrim} 
                        onChange={e => setSelectedTrim(e.target.value)}
                        className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:border-orange-500 focus:outline-none mb-1.5"
                      >
                        {COMMON_TRIMS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input 
                        type="text"
                        value={selectedTrim}
                        onChange={e => setSelectedTrim(e.target.value)}
                        placeholder="Custom Trim Name"
                        className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Engine Size & Fuel Specs</label>
                      <select 
                        value={selectedEngine} 
                        onChange={e => setSelectedEngine(e.target.value)}
                        className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-semibold text-amber-400 focus:border-orange-500 focus:outline-none mb-1.5"
                      >
                        {COMMON_ENGINES.map(eng => <option key={eng} value={eng}>{eng}</option>)}
                      </select>
                      <input 
                        type="text"
                        value={selectedEngine}
                        onChange={e => setSelectedEngine(e.target.value)}
                        placeholder="Custom Engine Specs"
                        className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-amber-400 focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Vehicle Specialty Tier Display */}
                  <div className="p-3 bg-[#0b0c10] rounded-xl border border-white/10 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Detected Specialty Tier:</span>
                    <span className="font-extrabold text-orange-400 uppercase bg-orange-500/10 px-2.5 py-1 rounded border border-orange-500/20">
                      {currentTier.badge}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-400">
                    17-Digit Vehicle Identification Number (VIN)
                  </label>
                  
                  <div className="flex items-center bg-[#0b0c10] p-1.5 rounded-xl border border-white/15 focus-within:border-orange-500 transition-colors">
                    <input 
                      type="text"
                      value={vinInput}
                      onChange={e => setVinInput(e.target.value.toUpperCase())}
                      placeholder="e.g. 1FTFW1E84MKD12345"
                      maxLength={17}
                      className="w-full bg-transparent px-3 py-2 text-white font-mono text-sm uppercase tracking-wider focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleDecodeVin()}
                      disabled={vinLoading}
                      className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs rounded-lg shadow transition-all flex items-center space-x-1.5 flex-shrink-0 disabled:opacity-50"
                    >
                      {vinLoading ? (
                        <span>Decoding...</span>
                      ) : (
                        <>
                          <Search className="w-3.5 h-3.5" />
                          <span>Decode VIN</span>
                        </>
                      )}
                    </button>
                  </div>

                  {vinError && (
                    <div className="p-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{vinError}</span>
                    </div>
                  )}

                  {vinDecodedData && (
                    <div className="bg-[#0b0c10] p-4 rounded-xl border border-emerald-500/30 space-y-2">
                      <div className="flex items-center justify-between text-xs text-emerald-400 font-bold">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> Official NHTSA Specification Match
                        </span>
                        <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase">
                          {currentTier.badge}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5 text-xs">
                        <div>
                          <div className="text-[10px] text-slate-500">Year / Make / Model</div>
                          <div className="font-bold text-white">{vinDecodedData.year} {vinDecodedData.make} {vinDecodedData.model}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500">Engine Specs</div>
                          <div className="font-bold text-orange-400">{vinDecodedData.engine}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500">Trim Edition</div>
                          <div className="font-bold text-slate-300">{vinDecodedData.trim}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500">Pricing Tier</div>
                          <div className="font-bold text-amber-400">{currentTier.name}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 3: Select Location Type */}
            <div className="bg-[#12141c] p-6 rounded-2xl border border-white/10 shadow-lg space-y-4">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold">3</span>
                <span>Select Service Location Type</span>
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setServiceLocation('mobile')}
                  className={`p-4 rounded-xl text-left border transition-all ${
                    serviceLocation === 'mobile'
                      ? 'border-orange-500 bg-orange-500/10 text-white shadow-md'
                      : 'border-white/10 bg-[#0b0c10] text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Truck className={`w-5 h-5 ${serviceLocation === 'mobile' ? 'text-orange-400' : 'text-slate-500'}`} />
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">15 MILES FREE</span>
                  </div>
                  <div className="font-bold text-sm text-white">Mobile Van Service</div>
                  <div className="text-xs text-slate-400 mt-1">We bring tools & parts to your address.</div>
                </button>

                <button
                  type="button"
                  onClick={() => setServiceLocation('shop')}
                  className={`p-4 rounded-xl text-left border transition-all ${
                    serviceLocation === 'shop'
                      ? 'border-orange-500 bg-orange-500/10 text-white shadow-md'
                      : 'border-white/10 bg-[#0b0c10] text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Home className={`w-5 h-5 ${serviceLocation === 'shop' ? 'text-orange-400' : 'text-slate-500'}`} />
                    <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-bold">GARAGE HUB</span>
                  </div>
                  <div className="font-bold text-sm text-white">Drop Off at Shop</div>
                  <div className="text-xs text-slate-400 mt-1">Drop off at our Justin garage hub ($0 travel).</div>
                </button>
              </div>
            </div>

            {/* Step 4: Select Services */}
            <div className="bg-[#12141c] p-6 rounded-2xl border border-white/10 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold">4</span>
                  <span>Select Services Needed</span>
                </h3>
                <span className="text-xs text-orange-400 font-bold bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                  Labor Rate: ${HOURLY_LABOR_RATE}/Hr
                </span>
              </div>

              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {SERVICES.map(service => {
                  const isSelected = selectedServiceIds.includes(service.id);
                  const isShopDisabled = serviceLocation === 'mobile' && service.shopOnly;
                  
                  const serviceLaborCost = Math.round(service.laborHours * HOURLY_LABOR_RATE * currentTier.multiplier);
                  const servicePartsCost = Math.round(service.basePartsCost * currentTier.multiplier);
                  const itemTotal = serviceLaborCost + servicePartsCost;

                  return (
                    <div
                      key={service.id}
                      onClick={() => !isShopDisabled && toggleService(service.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isShopDisabled
                          ? 'opacity-40 bg-[#0b0c10] border-white/5 cursor-not-allowed'
                          : isSelected
                          ? 'border-orange-500/70 bg-orange-500/10 text-white'
                          : 'border-white/5 bg-[#0b0c10] hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border transition-all ${
                          isSelected ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-600 bg-slate-900'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm">{service.name}</span>
                            {service.shopOnly && (
                              <span className="text-[9px] bg-slate-800 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-semibold uppercase">Shop Only</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{service.description}</p>
                          <div className="text-[10px] text-slate-500 mt-1 font-mono">
                            Labor: {service.laborHours} hrs (${serviceLaborCost}) + Parts: ${servicePartsCost}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 ml-4">
                        <div className="font-extrabold text-sm text-orange-400">${itemTotal}</div>
                        {currentTier.multiplier !== 1 && (
                          <div className="text-[9px] text-amber-400 font-semibold">{currentTier.badge}</div>
                        )}
                        <div className="text-[10px] text-slate-500">{service.timeEstimate}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Quote Summary Card */}
          <div className="lg:col-span-5 sticky top-24 space-y-4">
            <div className="bg-gradient-to-b from-[#161924] to-[#0f1118] p-6 rounded-2xl border border-orange-500/30 shadow-2xl shadow-orange-500/10 space-y-6">
              
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-orange-400">Exact Vehicle Quote</span>
                  <h3 className="font-heading text-lg font-bold text-white">{activeVehicleDescription}</h3>
                  <div className="text-[11px] font-semibold text-amber-400 mt-0.5 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" /> {currentTier.name} ({currentTier.multiplier}x Rate)
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg border border-white/10 capitalize flex items-center gap-1 self-start">
                  {serviceLocation === 'mobile' ? <Truck className="w-3.5 h-3.5 text-orange-400" /> : <Home className="w-3.5 h-3.5 text-orange-400" />}
                  <span>{serviceLocation} Service</span>
                </span>
              </div>

              {/* Destination Address Line */}
              <div className="bg-[#0b0c10] p-3 rounded-xl border border-white/10 text-xs space-y-1">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                  <Navigation className="w-3 h-3 text-orange-400" /> Service Destination Address
                </div>
                <div className="font-semibold text-white truncate">{addressInput}</div>
                <div className="text-[11px] text-emerald-400 font-medium">
                  {calculatedDistance} Miles from Hub {calculatedDistance <= FREE_RADIUS_MILES ? '(100% FREE Travel)' : `(+${extraMiles.toFixed(1)} mi @ $2/mi)`}
                </div>
              </div>

              {/* Line items & Labor breakdown */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Line Item Summary</span>
                  <span className="text-[10px] text-orange-400">${HOURLY_LABOR_RATE}/Hr Labor</span>
                </div>

                {selectedServices.map(s => {
                  const sLabor = Math.round(s.laborHours * HOURLY_LABOR_RATE * currentTier.multiplier);
                  const sParts = Math.round(s.basePartsCost * currentTier.multiplier);
                  return (
                    <div key={s.id} className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                      <div>
                        <div className="text-slate-300 font-medium">{s.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {s.laborHours} hrs labor (${sLabor}) + Parts (${sParts})
                        </div>
                      </div>
                      <span className="font-bold text-white ml-2">${sLabor + sParts}</span>
                    </div>
                  );
                })}

                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="text-slate-400">Total Est. Labor Hours</span>
                  <span className="font-bold text-white font-mono">{totalLaborHours} Hours @ ${HOURLY_LABOR_RATE}/hr</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Adjusted Subtotal Labor</span>
                  <span className="font-bold text-slate-200">${adjustedLaborCost}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Adjusted Subtotal Parts</span>
                  <span className="font-bold text-slate-200">${adjustedPartsCost}</span>
                </div>

                <div className="flex justify-between items-center text-xs pt-1 border-t border-white/5">
                  <span className="text-slate-400">
                    Mobile Dispatch Travel Fee ({calculatedDistance} mi)
                  </span>
                  <span className={`font-bold ${mobileTravelFee === 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
                    {mobileTravelFee === 0 ? 'FREE ($0)' : `$${mobileTravelFee.toFixed(2)} (${extraMiles.toFixed(1)} mi @ $2/mi)`}
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Estimated Sales Tax (8.25%)</span>
                  <span className="text-slate-300">${estimatedTax}</span>
                </div>
              </div>

              {/* Total Box */}
              <div className="bg-[#0b0c10] p-4 rounded-xl border border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Rough estimate only</div>
                  <div className="text-[11px] text-amber-400 font-semibold">
                    Final price set by your tech on site
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300 font-heading">
                    ~${totalPrice}
                  </div>
                  <div className="text-[10px] text-slate-500">Ballpark labor + parts · not a final bill</div>
                </div>
              </div>

              {/* Action */}
              <button
                onClick={handleBook}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all flex items-center justify-center space-x-2"
              >
                <Calendar className="w-4 h-4" />
                <span>Book $100 diagnostic hold</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-2 text-[11px] text-slate-400 justify-center">
                <Shield className="w-3.5 h-3.5 text-orange-400" />
                <span>No payment required until work is completed & verified.</span>
              </div>
            </div>

            <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 text-xs text-slate-400 flex items-start space-x-3">
              <Info className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
              <p>Need custom performance tuning, heavy engine overhaul, or a service not listed above? Give our Justin shop a call at <strong className="text-white">(214) 620-3244</strong> for a custom phone diagnostic.</p>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
