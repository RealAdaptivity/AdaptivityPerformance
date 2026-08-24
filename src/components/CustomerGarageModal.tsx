import React, { useState } from 'react';
import { X, Car, Plus, ShieldCheck, AlertTriangle, CheckCircle2, Clock, Wrench, ChevronRight, FileText, Sparkles, Gauge } from 'lucide-react';

interface SavedVehicle {
  id: string;
  year: string;
  make: string;
  model: string;
  engine: string;
  trim: string;
  mileage: number;
  vin: string;
  healthScore: number;
  licensePlate: string;
  imageTag: string;
  reminders: {
    id: string;
    name: string;
    dueMileage: number;
    urgency: 'overdue' | 'soon' | 'good';
    estimatedCost: number;
    description: string;
  }[];
  history: {
    id: string;
    date: string;
    service: string;
    mileage: number;
    cost: number;
    tech: string;
    locationType: 'mobile' | 'shop';
  }[];
}

const INITIAL_GARAGE: SavedVehicle[] = [
  {
    id: 'veh-1',
    year: '2021',
    make: 'Ford',
    model: 'F-150',
    trim: 'Lariat SuperCrew 4x4',
    engine: '3.5L V6 EcoBoost Twin-Turbo',
    mileage: 48500,
    vin: '1FTFW1E84MKD12345',
    licensePlate: 'TX • K9X-4821',
    healthScore: 88,
    imageTag: 'Truck',
    reminders: [
      {
        id: 'rem-1',
        name: 'Full Synthetic Oil & OEM Filter Service',
        dueMileage: 49000,
        urgency: 'soon',
        estimatedCost: 95,
        description: 'Recommended every 5,000 miles for twin-turbo EcoBoost engine protection.'
      },
      {
        id: 'rem-2',
        name: 'Automatic Transmission Fluid Flush',
        dueMileage: 48000,
        urgency: 'overdue',
        estimatedCost: 220,
        description: '10-Speed SelectShift fluid renewal past manufacturer 45,000 mile mark.'
      },
      {
        id: 'rem-3',
        name: 'Heavy-Duty Ceramic Front Brake Pad Inspection',
        dueMileage: 52000,
        urgency: 'good',
        estimatedCost: 240,
        description: 'Brake thickness evaluated at 6mm during last mobile visit.'
      }
    ],
    history: [
      {
        id: 'hist-101',
        date: 'May 14, 2026',
        service: 'Mobile Battery Swap (AGM 850CCA) & Terminal Clean',
        mileage: 45200,
        cost: 215,
        tech: 'Adaptivity Technician',
        locationType: 'mobile'
      },
      {
        id: 'hist-102',
        date: 'Dec 02, 2025',
        service: 'Full Synthetic Oil Change & Multi-Point Inspection',
        mileage: 41800,
        cost: 95,
        tech: 'Marcus Hill',
        locationType: 'mobile'
      }
    ]
  },
  {
    id: 'veh-2',
    year: '2020',
    make: 'Chevrolet',
    model: 'Tahoe',
    trim: 'LT V8 AWD',
    engine: '5.3L EcoTec3 V8',
    mileage: 62100,
    vin: '1GNSKCKD7LR987654',
    licensePlate: 'TX • R8W-9012',
    healthScore: 92,
    imageTag: 'SUV',
    reminders: [
      {
        id: 'rem-4',
        name: 'Serpentine Drive Belt & Tensioner Replacement',
        dueMileage: 65000,
        urgency: 'soon',
        estimatedCost: 165,
        description: 'Preventative replacement recommended before summer high temperatures.'
      },
      {
        id: 'rem-5',
        name: '4-Wheel Brake Fluid Flush & Pressure Test',
        dueMileage: 62000,
        urgency: 'overdue',
        estimatedCost: 140,
        description: 'Brake fluid moisture level exceeds 3.5% threshold.'
      }
    ],
    history: [
      {
        id: 'hist-201',
        date: 'Jan 18, 2026',
        service: 'Rear Ceramic Brake Pad & Rotors Overhaul',
        mileage: 58900,
        cost: 320,
        tech: 'Adaptivity Technician',
        locationType: 'shop'
      }
    ]
  }
];

interface CustomerGarageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookService: (serviceName: string, vehicleInfo: string) => void;
  onOpenDVIReport: () => void;
}

export const CustomerGarageModal: React.FC<CustomerGarageModalProps> = ({
  isOpen,
  onClose,
  onBookService,
  onOpenDVIReport
}) => {
  const [vehicles, setVehicles] = useState<SavedVehicle[]>(INITIAL_GARAGE);
  const [activeVehicleId, setActiveVehicleId] = useState<string>(INITIAL_GARAGE[0].id);
  const [showAddVehicleForm, setShowAddVehicleForm] = useState(false);

  // New vehicle form state
  const [newYear, setNewYear] = useState('2022');
  const [newMake, setNewMake] = useState('RAM');
  const [newModel, setNewModel] = useState('2500 Cummins');
  const [newMileage, setNewMileage] = useState('32000');
  const [newVin, setNewVin] = useState('3D7KS2938NL112233');

  if (!isOpen) return null;

  const currentVehicle = vehicles.find(v => v.id === activeVehicleId) || vehicles[0];

  const handleAddVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const createdVehicle: SavedVehicle = {
      id: 'veh-' + Date.now(),
      year: newYear,
      make: newMake,
      model: newModel,
      trim: 'Standard Edition',
      engine: 'Turbo Diesel / V8 Engine',
      mileage: parseInt(newMileage) || 30000,
      vin: newVin || 'VIN-GENERATED-' + Math.floor(Math.random() * 90000),
      licensePlate: 'TX • NEW-VEH',
      healthScore: 95,
      imageTag: 'Custom Vehicle',
      reminders: [
        {
          id: 'rem-new-1',
          name: 'Initial 50-Point Mobile Inspection',
          dueMileage: parseInt(newMileage) + 500,
          urgency: 'soon',
          estimatedCost: 75,
          description: 'Comprehensive mobile diagnostic & multi-point vehicle health check.'
        }
      ],
      history: []
    };

    setVehicles(prev => [...prev, createdVehicle]);
    setActiveVehicleId(createdVehicle.id);
    setShowAddVehicleForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="bg-[#12141c] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-6 py-4 bg-[#1a1d28] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-extrabold text-lg text-white flex items-center gap-2">
                My Vehicle Garage & Health Hub
                <span className="text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full font-bold">
                  Justin & Northlake Account
                </span>
              </h2>
              <p className="text-xs text-slate-400">Track service schedules, health metrics, and 1-click mobile mechanic dispatch.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Vehicle Selection Tabs */}
        <div className="px-6 py-3 bg-[#0d0e14] border-b border-white/5 flex items-center space-x-3 overflow-x-auto">
          {vehicles.map(v => (
            <button
              key={v.id}
              onClick={() => {
                setActiveVehicleId(v.id);
                setShowAddVehicleForm(false);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap border ${
                activeVehicleId === v.id && !showAddVehicleForm
                  ? 'bg-gradient-to-r from-orange-500/20 to-amber-500/20 border-orange-500 text-orange-400 shadow-md'
                  : 'bg-white/[0.03] border-white/5 text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Car className="w-4 h-4" />
              <span>{v.year} {v.make} {v.model}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold ${
                v.healthScore >= 90 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                {v.healthScore}%
              </span>
            </button>
          ))}

          <button
            onClick={() => setShowAddVehicleForm(true)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center space-x-1.5 transition-all ${
              showAddVehicleForm
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Vehicle</span>
          </button>
        </div>

        {/* Modal Main Content Area */}
        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          {showAddVehicleForm ? (
            /* Add Vehicle Form */
            <form onSubmit={handleAddVehicleSubmit} className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-orange-500" />
                Add New Vehicle to Your Adaptivity Garage
              </h3>
              <p className="text-xs text-slate-400">Save vehicle details for instant mobile mechanics quotes and reminder notifications.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Year</label>
                  <input
                    type="text"
                    value={newYear}
                    onChange={e => setNewYear(e.target.value)}
                    required
                    className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Make</label>
                  <input
                    type="text"
                    value={newMake}
                    onChange={e => setNewMake(e.target.value)}
                    required
                    className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Model / Trim</label>
                  <input
                    type="text"
                    value={newModel}
                    onChange={e => setNewModel(e.target.value)}
                    required
                    className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Current Mileage</label>
                  <input
                    type="number"
                    value={newMileage}
                    onChange={e => setNewMileage(e.target.value)}
                    required
                    className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">VIN (Optional)</label>
                  <input
                    type="text"
                    value={newVin}
                    onChange={e => setNewVin(e.target.value)}
                    placeholder="e.g. 1FTFW1E84MKD..."
                    className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-orange-500 uppercase tracking-wider font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddVehicleForm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/20"
                >
                  Save Vehicle to Garage
                </button>
              </div>
            </form>
          ) : (
            /* Vehicle Detail View */
            <>
              {/* Top Banner Card */}
              <div className="bg-gradient-to-r from-slate-900/90 via-slate-800/80 to-slate-900/90 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-orange-500/10 to-transparent pointer-events-none"></div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-orange-400 uppercase tracking-wider bg-orange-500/10 border border-orange-500/20 px-2.5 py-0.5 rounded-md">
                        {currentVehicle.imageTag}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">{currentVehicle.licensePlate}</span>
                    </div>
                    <h3 className="text-2xl font-heading font-black text-white">
                      {currentVehicle.year} {currentVehicle.make} {currentVehicle.model}
                    </h3>
                    <p className="text-xs text-slate-300 flex items-center gap-2">
                      <span>Engine: <strong>{currentVehicle.engine}</strong></span>
                      <span>•</span>
                      <span>VIN: <strong className="font-mono text-slate-400">{currentVehicle.vin}</strong></span>
                    </p>
                  </div>

                  {/* Health Score Circle */}
                  <div className="flex items-center space-x-6 bg-slate-950/60 border border-white/10 p-4 rounded-xl">
                    <div className="text-center">
                      <div className="flex items-center space-x-1 text-slate-400 text-[11px] uppercase font-bold tracking-wider mb-1">
                        <Gauge className="w-3.5 h-3.5 text-orange-400" />
                        <span>Odometer</span>
                      </div>
                      <div className="text-lg font-bold text-white font-mono">{currentVehicle.mileage.toLocaleString()} mi</div>
                    </div>

                    <div className="h-10 w-px bg-white/10"></div>

                    <div className="text-center">
                      <div className="flex items-center space-x-1 text-slate-400 text-[11px] uppercase font-bold tracking-wider mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Vehicle Health</span>
                      </div>
                      <div className="text-lg font-bold text-emerald-400 font-heading">{currentVehicle.healthScore}% GOOD</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Maintenance Schedule & Reminders */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-heading font-extrabold text-sm text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-400" />
                    Mileage-Based Service Reminders
                  </h4>
                  <span className="text-xs text-slate-400">Based on Ford & GM factory service intervals</span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {currentVehicle.reminders.map(rem => (
                    <div 
                      key={rem.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        rem.urgency === 'overdue'
                          ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500'
                          : rem.urgency === 'soon'
                          ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500'
                          : 'bg-emerald-950/20 border-emerald-500/30'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="mt-0.5">
                          {rem.urgency === 'overdue' ? (
                            <AlertTriangle className="w-5 h-5 text-rose-400 animate-pulse" />
                          ) : rem.urgency === 'soon' ? (
                            <Clock className="w-5 h-5 text-amber-400" />
                          ) : (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-white">{rem.name}</span>
                            <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded ${
                              rem.urgency === 'overdue'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : rem.urgency === 'soon'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}>
                              {rem.urgency === 'overdue' ? 'Action Required' : rem.urgency === 'soon' ? 'Due Soon' : 'Good Standing'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1">{rem.description}</p>
                          <p className="text-[11px] text-slate-400 mt-1 font-mono">Target Mileage: {rem.dueMileage.toLocaleString()} mi</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 self-end sm:self-center">
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block">Est. Cost</span>
                          <span className="font-bold text-sm text-white">${rem.estimatedCost}</span>
                        </div>
                        <button
                          onClick={() => {
                            onClose();
                            onBookService(rem.name, `${currentVehicle.year} ${currentVehicle.make} ${currentVehicle.model}`);
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all ${
                            rem.urgency === 'overdue'
                              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
                              : 'bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:from-orange-600 hover:to-amber-700'
                          }`}
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>Dispatch Service</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Digital Inspection Report (DVI) Quick Banner */}
              <div className="bg-gradient-to-r from-blue-900/30 via-indigo-900/30 to-purple-900/30 border border-blue-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-white">Latest Digital Inspection (DVI) Report Available</h5>
                    <p className="text-xs text-slate-300">Your Adaptivity technician submitted a 50-point mobile inspection with photos.</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onClose();
                    onOpenDVIReport();
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-blue-500/20 whitespace-nowrap"
                >
                  <span>View DVI Report</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Service History Logs */}
              <div className="space-y-3">
                <h4 className="font-heading font-extrabold text-sm text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Adaptivity Completed Service History
                </h4>

                <div className="bg-white/[0.02] border border-white/10 rounded-2xl divide-y divide-white/5 overflow-hidden">
                  {currentVehicle.history.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">No completed services recorded yet for this vehicle.</div>
                  ) : (
                    currentVehicle.history.map(item => (
                      <div key={item.id} className="p-4 flex items-center justify-between text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-white text-sm">{item.service}</span>
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                              {item.locationType === 'mobile' ? 'Mobile Unit' : 'Justin Shop'}
                            </span>
                          </div>
                          <p className="text-slate-400">
                            Completed on <strong>{item.date}</strong> @ {item.mileage.toLocaleString()} mi • Tech: <span className="text-amber-400">{item.tech}</span>
                          </p>
                        </div>

                        <div className="text-right font-mono">
                          <span className="text-sm font-bold text-emerald-400">${item.cost}</span>
                          <span className="block text-[10px] text-slate-500">Receipt Verified</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
