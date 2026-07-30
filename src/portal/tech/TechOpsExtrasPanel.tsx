import React, { useEffect, useState } from 'react';
import type { TechSpecialty } from '../../services/techSpecialties';
import {
  SPECIALTY_INVENTORY,
  addUnavailableWindow,
  listUnavailableWindows,
  loadInventoryChecks,
  removeUnavailableWindow,
  saveInventoryChecks,
  type UnavailableWindow,
} from '../../services/techOpsExtras';

type Props = { specialties: TechSpecialty[] };

export const TechOpsExtrasPanel: React.FC<Props> = ({ specialties }) => {
  const [specialty, setSpecialty] = useState<string>(specialties[0] || 'brakes');
  const [checked, setChecked] = useState<string[]>([]);
  const [windows, setWindows] = useState<UnavailableWindow[]>([]);
  const [startLocal, setStartLocal] = useState('');
  const [endLocal, setEndLocal] = useState('');
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const items = SPECIALTY_INVENTORY[specialty] || SPECIALTY_INVENTORY.full_auto || [];

  useEffect(() => {
    if (!specialties.includes(specialty as TechSpecialty) && specialties[0]) {
      setSpecialty(specialties[0]);
    }
  }, [specialties, specialty]);

  useEffect(() => {
    void loadInventoryChecks(specialty)
      .then(setChecked)
      .catch(() => setChecked([]));
  }, [specialty]);

  useEffect(() => {
    void listUnavailableWindows()
      .then(setWindows)
      .catch(() => setWindows([]));
  }, []);

  const toggleItem = async (item: string) => {
    const next = checked.includes(item) ? checked.filter((x) => x !== item) : [...checked, item];
    setChecked(next);
    try {
      await saveInventoryChecks(specialty, next);
      setMsg('Checklist saved');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const addBlock = async () => {
    if (!startLocal || !endLocal) return;
    setMsg(null);
    try {
      await addUnavailableWindow({
        startsAt: new Date(startLocal).toISOString(),
        endsAt: new Date(endLocal).toISOString(),
        reason,
      });
      setWindows(await listUnavailableWindows());
      setStartLocal('');
      setEndLocal('');
      setReason('');
      setMsg('Unavailable window added');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not add window');
    }
  };

  return (
    <>
      <div className="bg-[#12141c] border border-white/10 rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-white">Inventory checklist</h3>
        <p className="text-xs text-slate-400">Van stock checklist by specialty — synced to your account.</p>
        <select
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
        >
          {(specialties.length ? specialties : Object.keys(SPECIALTY_INVENTORY)).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item}>
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={checked.includes(item)}
                  onChange={() => void toggleItem(item)}
                />
                {item}
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-[#12141c] border border-white/10 rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-white">Unavailable windows</h3>
        <p className="text-xs text-slate-400">Block times you cannot take jobs (vacation, shop day, etc.).</p>
        <input
          type="datetime-local"
          value={startLocal}
          onChange={(e) => setStartLocal(e.target.value)}
          className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
        />
        <input
          type="datetime-local"
          value={endLocal}
          onChange={(e) => setEndLocal(e.target.value)}
          className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
        />
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
        />
        <button
          type="button"
          onClick={() => void addBlock()}
          className="w-full py-2.5 border border-white/15 rounded-xl text-xs font-bold text-slate-200"
        >
          Add unavailable window
        </button>
        <ul className="space-y-1.5">
          {windows.map((w) => (
            <li
              key={w.id}
              className="flex justify-between gap-2 text-[11px] text-slate-400 border border-white/10 rounded-lg px-2 py-1.5"
            >
              <span>
                {new Date(w.startsAt).toLocaleString()} → {new Date(w.endsAt).toLocaleString()}
                {w.reason ? ` · ${w.reason}` : ''}
              </span>
              <button
                type="button"
                className="text-red-300 font-bold shrink-0"
                onClick={() =>
                  void removeUnavailableWindow(w.id).then(async () =>
                    setWindows(await listUnavailableWindows())
                  )
                }
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        {msg && <p className="text-[11px] text-slate-400">{msg}</p>}
      </div>
    </>
  );
};
