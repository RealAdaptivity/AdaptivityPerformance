import React, { useState } from 'react';
import { AlertTriangle, Loader2, Search } from 'lucide-react';
import { lookupVin, type VinSummary } from '../services/vinLookup';
import { isVinShaped, normalizeVin } from '../services/vinDecode';

/**
 * Decode a VIN in the admin dashboard (NHTSA, through the decode-vin edge
 * function). With `onUse`, a button copies the decoded vehicle into the form
 * it sits in.
 */
export const VinLookupPanel: React.FC<{
  initialVin?: string | null;
  onUse?: (summary: VinSummary) => void;
  useLabel?: string;
}> = ({ initialVin, onUse, useLabel = 'Use this vehicle' }) => {
  const [vin, setVin] = useState(initialVin ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<VinSummary | null>(null);

  const decode = async () => {
    setBusy(true);
    setError(null);
    try {
      setSummary(await lookupVin(vin));
    } catch (e) {
      setSummary(null);
      setError(e instanceof Error ? e.message : 'Could not look up that VIN.');
    } finally {
      setBusy(false);
    }
  };

  const ready = isVinShaped(normalizeVin(vin));
  return (
    <div className="space-y-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (ready && !busy) void decode();
        }}
        className="flex gap-2"
      >
        <label className="sr-only" htmlFor={`vin-${initialVin ?? 'new'}`}>
          VIN
        </label>
        <input
          id={`vin-${initialVin ?? 'new'}`}
          value={vin}
          onChange={(e) => setVin(e.target.value.toUpperCase())}
          maxLength={20}
          spellCheck={false}
          autoComplete="off"
          placeholder="17-character VIN"
          className="min-h-[40px] min-w-0 flex-1 rounded-lg border border-white/10 bg-[#0b0c10] px-3 font-mono text-xs tracking-wider text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
        />
        <button
          type="submit"
          disabled={!ready || busy}
          className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs font-semibold text-slate-200 hover:border-white/30 disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Search className="h-3.5 w-3.5" aria-hidden="true" />}
          Decode
        </button>
      </form>
      {error && <p role="alert" className="text-[11px] text-amber-300">{error}</p>}
      {summary && (
        <div className="space-y-2 rounded-lg border border-white/10 bg-[#0b0c10] p-3">
          <p className="text-sm font-bold text-white">
            {summary.description}
            {summary.trim ? <span className="font-semibold text-slate-400"> · {summary.trim}</span> : null}
          </p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
            {summary.details.map((d) => (
              <React.Fragment key={d.label}>
                <dt className="text-slate-500">{d.label}</dt>
                <dd className="text-slate-200">{d.value}</dd>
              </React.Fragment>
            ))}
          </dl>
          {summary.warnings.map((w) => (
            <p key={w} className="flex items-start gap-1.5 text-[11px] text-amber-300">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
              {w}
            </p>
          ))}
          {onUse && (
            <button
              type="button"
              onClick={() => onUse(summary)}
              className="inline-flex min-h-[36px] items-center rounded-lg bg-orange-500 px-3 text-xs font-bold text-white hover:bg-orange-600"
            >
              {useLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
