import React, { useState } from 'react';
import {
  loadGarageVehicles,
  saveGarageVehicles,
  vehicleLabel,
  type GarageVehicle,
} from './garageStorage';

type Props = { onBookVehicle: (vehicleId: string) => void };

export const CustomerGarageTab: React.FC<Props> = ({ onBookVehicle }) => {
  const [vehicles, setVehicles] = useState<GarageVehicle[]>(() => loadGarageVehicles());
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ year: '2020', make: '', model: '', vin: '', mileage: '' });

  const persist = (next: GarageVehicle[]) => {
    setVehicles(next);
    saveGarageVehicles(next);
  };

  const handleAdd = () => {
    if (!draft.make.trim() || !draft.model.trim()) return;
    const v: GarageVehicle = {
      id: `v-${Date.now()}`,
      year: draft.year,
      make: draft.make.trim(),
      model: draft.model.trim(),
      vin: draft.vin.trim(),
      mileage: draft.mileage.trim() || '—',
      healthScore: 75,
      healthStatus: 'good',
      healthLabel: 'Added — schedule inspection for full score',
    };
    persist([...vehicles, v]);
    setShowAdd(false);
    setDraft({ year: '2020', make: '', model: '', vin: '', mileage: '' });
  };

  const statusColor = (s: GarageVehicle['healthStatus']) =>
    s === 'urgent' ? 'text-rose-400' : s === 'warning' ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">Your vehicles (saved on this device — same as the iOS/Android garage tab).</p>
      {vehicles.map((v) => (
        <div key={v.id} className="bg-[#12141c] border border-white/10 rounded-2xl p-4 space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-white">{vehicleLabel(v)}</h3>
              <p className="text-[11px] text-slate-500 font-mono">VIN {v.vin || '—'} · {v.mileage} mi</p>
            </div>
            <span className={`text-xs font-bold ${statusColor(v.healthStatus)}`}>{v.healthScore}/100</span>
          </div>
          <p className="text-xs text-slate-400">{v.healthLabel}</p>
          <button
            type="button"
            onClick={() => onBookVehicle(v.id)}
            className="w-full py-2.5 mt-2 bg-orange-500/15 border border-orange-500/40 text-orange-400 text-xs font-bold rounded-xl"
          >
            Book service for this vehicle →
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setShowAdd(true)}
        className="w-full py-3 border border-dashed border-white/20 rounded-xl text-xs text-slate-400 font-semibold"
      >
        + Add vehicle
      </button>
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#12141c] border border-white/10 rounded-2xl p-5 w-full max-w-md space-y-3">
            <h4 className="font-bold text-white">Add vehicle</h4>
            {(['year', 'make', 'model', 'vin', 'mileage'] as const).map((field) => (
              <input
                key={field}
                placeholder={field}
                value={draft[field]}
                onChange={(e) => setDraft({ ...draft, [field]: e.target.value })}
                className="w-full bg-[#0b0c10] border border-white/15 rounded-lg px-3 py-2 text-sm text-white"
              />
            ))}
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2 text-xs text-slate-400">
                Cancel
              </button>
              <button type="button" onClick={handleAdd} className="flex-1 py-2 bg-orange-500 rounded-lg text-xs font-bold text-white">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
