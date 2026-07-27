import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { vehicleLabel, type GarageVehicle } from './garageStorage';

type Props = { onBookVehicle: (vehicleId: string) => void; customerId: string };

function mapRow(row: Record<string, unknown>): GarageVehicle {
  return {
    id: row.id as string,
    year: (row.year as string) || '',
    make: row.make as string,
    model: row.model as string,
    vin: (row.vin as string) || '',
    mileage: (row.mileage as string) || '—',
    healthScore: typeof row.health_score === 'number' ? row.health_score : 75,
    healthStatus: (row.health_status as GarageVehicle['healthStatus']) || 'good',
    healthLabel: (row.health_label as string) || 'On file',
  };
}

export const CustomerGarageTab: React.FC<Props> = ({ onBookVehicle, customerId }) => {
  const [vehicles, setVehicles] = useState<GarageVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ year: '2020', make: '', model: '', vin: '', mileage: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: qErr } = await supabase
      .from('vehicles')
      .select('*')
      .eq('owner_id', customerId)
      .order('created_at', { ascending: false });
    if (qErr) {
      setError(qErr.message);
      setVehicles([]);
    } else {
      setVehicles((data || []).map((r) => mapRow(r as Record<string, unknown>)));
    }
    setLoading(false);
  }, [customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAdd = async () => {
    if (!draft.make.trim() || !draft.model.trim()) return;
    setSaving(true);
    setError(null);
    const { error: insErr } = await supabase.from('vehicles').insert({
      owner_id: customerId,
      year: draft.year,
      make: draft.make.trim(),
      model: draft.model.trim(),
      vin: draft.vin.trim() || null,
      mileage: draft.mileage.trim() || null,
      health_status: 'good',
      health_label: 'Added — schedule inspection for full score',
      health_score: 75,
    });
    setSaving(false);
    if (insErr) {
      setError(insErr.message);
      return;
    }
    setShowAdd(false);
    setDraft({ year: '2020', make: '', model: '', vin: '', mileage: '' });
    await load();
  };

  const handleRemove = async (id: string) => {
    if (!window.confirm('Remove this vehicle from your garage?')) return;
    const { error: delErr } = await supabase.from('vehicles').delete().eq('id', id);
    if (delErr) {
      setError(delErr.message);
      return;
    }
    await load();
  };

  const statusColor = (s: GarageVehicle['healthStatus']) =>
    s === 'urgent' ? 'text-rose-400' : s === 'warning' ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">
        Your vehicles (saved to your Adaptivity account — same garage as the mobile app).
      </p>
      {loading && <p className="text-xs text-slate-500">Loading garage…</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {!loading && vehicles.length === 0 && (
        <p className="text-xs text-slate-500">No vehicles yet. Add one to book mobile service.</p>
      )}
      {vehicles.map((v) => (
        <div key={v.id} className="bg-[#12141c] border border-white/10 rounded-2xl p-4 space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-white">{vehicleLabel(v)}</h3>
              <p className="text-[11px] text-slate-500 font-mono">
                VIN {v.vin || '—'} · {v.mileage}
              </p>
            </div>
            <div className="text-right">
              <span className={`text-xs font-bold ${statusColor(v.healthStatus)}`}>
                {v.healthScore}/100
              </span>
              <button
                type="button"
                onClick={() => void handleRemove(v.id)}
                className="block text-[10px] text-slate-500 hover:text-rose-300 mt-1 ml-auto"
              >
                Remove
              </button>
            </div>
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
                className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm"
              />
            ))}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleAdd()}
                className="flex-1 py-2.5 bg-orange-500 rounded-xl text-xs font-bold text-white disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="flex-1 py-2.5 border border-white/15 rounded-xl text-xs text-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
