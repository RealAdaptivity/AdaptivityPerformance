import React, { useState } from 'react';
import { AlertTriangle, ExternalLink, Flame, Loader2, Search, ShieldAlert, Trash2 } from 'lucide-react';
import { isVinShaped, normalizeVin } from '../services/vinDecode';
import {
  addVehicleNote,
  deleteVehicleNote,
  listVehicleNotes,
  researchVehicle,
  type VehicleNote,
  type VehicleResearchResult,
} from '../services/vehicleResearchApi';

/**
 * Vehicle research: the public-data half of ALLDATA / Mitchell 1. A VIN (or a
 * year, make and model) brings up NHTSA safety recalls, what owners complain
 * about most on that vehicle, the newest complaints, the shop's own notes, and
 * links into the licensed repair-information services for procedures, wiring
 * and labor times.
 */

const inputCls =
  'w-full min-h-[44px] bg-[#0b0c10] border border-white/15 rounded-xl px-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50';

function shortDate(iso: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const Section: React.FC<{ title: string; aside?: React.ReactNode; children: React.ReactNode }> = ({
  title,
  aside,
  children,
}) => (
  <section className="bg-[#12141c] border border-white/10 rounded-2xl p-4 space-y-3">
    <div className="flex items-baseline justify-between gap-3 flex-wrap">
      <h3 className="text-sm font-bold text-white">{title}</h3>
      {aside && <span className="text-[11px] text-slate-500">{aside}</span>}
    </div>
    {children}
  </section>
);

/** Two lines of a long owner complaint; tap to read the rest. */
const ClampedText: React.FC<{ text: string }> = ({ text }) => {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      aria-expanded={open}
      className={`block w-full text-left text-[12px] leading-relaxed text-slate-300 ${open ? '' : 'line-clamp-2'}`}
    >
      {text}
    </button>
  );
};

export const ResearchAdmin: React.FC<{ isAdmin?: boolean }> = ({ isAdmin = true }) => {
  const [mode, setMode] = useState<'vin' | 'ymm'>('vin');
  const [vin, setVin] = useState('');
  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VehicleResearchResult | null>(null);
  const [showAllComplaints, setShowAllComplaints] = useState(false);

  const [notes, setNotes] = useState<VehicleNote[]>([]);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const ready =
    mode === 'vin' ? isVinShaped(normalizeVin(vin)) : /^\d{4}$/.test(year.trim()) && !!make.trim() && !!model.trim();

  const loadNotes = async (v: { year: string; make: string; model: string }) => {
    try {
      setNotes(await listVehicleNotes(v));
      setNotesError(null);
    } catch (e) {
      setNotesError(e instanceof Error ? e.message : 'Could not load shop notes');
    }
  };

  const run = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    setShowAllComplaints(false);
    try {
      const r = await researchVehicle(
        mode === 'vin' ? { vin: normalizeVin(vin) } : { year: year.trim(), make: make.trim(), model: model.trim() }
      );
      setResult(r);
      void loadNotes(r.vehicle);
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : 'Research failed');
    } finally {
      setBusy(false);
    }
  };

  const saveNote = async () => {
    if (!result || !draft.trim()) return;
    setSavingNote(true);
    try {
      await addVehicleNote({ ...result.vehicle, note: draft });
      setDraft('');
      await loadNotes(result.vehicle);
    } catch (e) {
      setNotesError(e instanceof Error ? e.message : 'Could not save the note');
    } finally {
      setSavingNote(false);
    }
  };

  const removeNote = async (n: VehicleNote) => {
    if (!result || !window.confirm('Delete this shop note?')) return;
    try {
      await deleteVehicleNote(n.id);
      await loadNotes(result.vehicle);
    } catch (e) {
      setNotesError(e instanceof Error ? e.message : 'Could not delete the note');
    }
  };

  const v = result?.vehicle;
  const title = v ? v.decoded?.description || `${v.year} ${v.make} ${v.model}` : '';
  const recalls = result ? result.recalls : null;
  const complaints = result ? result.complaints : null;
  const topComponents = complaints?.byComponent.slice(0, 8) ?? [];
  const shownComplaints = showAllComplaints ? complaints?.recent ?? [] : (complaints?.recent ?? []).slice(0, 8);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-white">Vehicle research</h2>
        <p className="text-xs text-slate-400">
          Recalls, common problems and owner complaints from NHTSA, plus the shop’s own notes. Factory procedures,
          wiring diagrams and labor times stay in ALLDATA / Mitchell 1 — links below each result.
        </p>
      </div>

      <form
        className="bg-[#12141c] border border-white/10 rounded-2xl p-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
      >
        <div className="flex gap-1 p-1 bg-[#0b0c10] border border-white/10 rounded-xl w-fit" role="group" aria-label="Search by">
          {(
            [
              ['vin', 'VIN'],
              ['ymm', 'Year / make / model'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={mode === id}
              onClick={() => setMode(id)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg ${
                mode === id ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          {mode === 'vin' ? (
            <>
              <label htmlFor="research-vin" className="sr-only">
                VIN
              </label>
              <input
                id="research-vin"
                className={`${inputCls} font-mono tracking-wider`}
                value={vin}
                maxLength={20}
                spellCheck={false}
                autoComplete="off"
                placeholder="17-character VIN"
                onChange={(e) => setVin(e.target.value.toUpperCase())}
              />
            </>
          ) : (
            <>
              <label className="sr-only" htmlFor="research-year">Year</label>
              <input id="research-year" className={`${inputCls} sm:w-24`} inputMode="numeric" maxLength={4}
                placeholder="2016" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, ''))} />
              <label className="sr-only" htmlFor="research-make">Make</label>
              <input id="research-make" className={inputCls} placeholder="Ford" value={make}
                onChange={(e) => setMake(e.target.value)} />
              <label className="sr-only" htmlFor="research-model">Model</label>
              <input id="research-model" className={inputCls} placeholder="F-150" value={model}
                onChange={(e) => setModel(e.target.value)} />
            </>
          )}
          <button
            type="submit"
            disabled={!ready || busy}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-40 w-full sm:w-auto"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Search className="w-4 h-4" aria-hidden="true" />}
            Research
          </button>
        </div>
        {error && <p role="alert" className="text-xs text-amber-300">{error}</p>}
      </form>

      {result && v && (
        <div className="space-y-4">
          <section className="bg-[#12141c] border border-white/10 rounded-2xl p-4 space-y-3">
            <div>
              <p className="text-base font-bold text-white">
                {title}
                {v.decoded?.trim ? <span className="font-semibold text-slate-400"> · {v.decoded.trim}</span> : null}
              </p>
              {v.vin && <p className="text-[11px] font-mono text-slate-500 mt-0.5">VIN {v.vin}</p>}
            </div>
            {v.decoded && v.decoded.details.length > 0 && (
              <dl className="grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_auto_1fr] gap-x-3 gap-y-1 text-[11px]">
                {v.decoded.details.map((d) => (
                  <React.Fragment key={d.label}>
                    <dt className="text-slate-500">{d.label}</dt>
                    <dd className="text-slate-200">{d.value}</dd>
                  </React.Fragment>
                ))}
              </dl>
            )}
            {v.decoded?.warnings.map((w) => (
              <p key={w} className="flex items-start gap-1.5 text-[11px] text-amber-300">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                {w}
              </p>
            ))}
            <div className="grid sm:grid-cols-2 gap-2">
              {result.links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl border border-white/10 bg-[#0b0c10] px-3 py-2.5 hover:border-orange-500/50"
                >
                  <span className="flex items-center gap-1.5 text-xs font-bold text-orange-300">
                    {l.label}
                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </span>
                  <span className="block text-[11px] text-slate-400 mt-0.5">{l.note}</span>
                </a>
              ))}
            </div>
          </section>

          <Section
            title={recalls ? `Safety recalls (${recalls.length})` : 'Safety recalls'}
            aside={`Every ${v.year} ${v.make} ${v.model}`}
          >
            {recalls === null ? (
              <p className="text-xs text-amber-300">NHTSA’s recall service did not answer. Try again in a minute.</p>
            ) : recalls.length === 0 ? (
              <p className="text-xs text-slate-400">No safety recalls on file for this vehicle.</p>
            ) : (
              <>
                {v.vin && (
                  <p className="text-[11px] text-slate-500">
                    Not every recall applies to every vehicle, and some are already repaired. “Open recalls for this
                    VIN” above shows what is still open on this one.
                  </p>
                )}
                <ul className="space-y-2">
                  {recalls.map((r) => (
                    <li key={r.campaign} className="rounded-xl border border-white/10 bg-[#0b0c10] p-3 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white">{r.component}</span>
                        {r.parkIt && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-200 bg-red-500/20 border border-red-500/40 rounded-full px-2 py-0.5">
                            <ShieldAlert className="w-3 h-3" aria-hidden="true" /> Do not drive
                          </span>
                        )}
                        {r.parkOutside && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-200 bg-amber-500/20 border border-amber-500/40 rounded-full px-2 py-0.5">
                            <Flame className="w-3 h-3" aria-hidden="true" /> Park outside
                          </span>
                        )}
                        {r.overTheAir && (
                          <span className="text-[10px] font-bold text-sky-200 bg-sky-500/15 border border-sky-500/30 rounded-full px-2 py-0.5">
                            Over-the-air fix
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 ml-auto">
                          #{r.campaign}
                          {r.reportedOn ? ` · ${shortDate(r.reportedOn)}` : ''}
                        </span>
                      </div>
                      <p className="text-[12px] leading-relaxed text-slate-300">{r.summary}</p>
                      <details>
                        <summary className="cursor-pointer text-[11px] font-semibold text-orange-400">Risk and remedy</summary>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                          <strong className="text-slate-300">Risk:</strong> {r.consequence}
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                          <strong className="text-slate-300">Remedy:</strong> {r.remedy}
                        </p>
                      </details>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Section>

          <Section
            title="Common problems"
            aside={
              complaints
                ? `${complaints.total} owner complaint${complaints.total === 1 ? '' : 's'} · ${complaints.crashes} crash · ${complaints.fires} fire · ${complaints.injuries} injur${complaints.injuries === 1 ? 'y' : 'ies'}`
                : undefined
            }
          >
            {complaints === null ? (
              <p className="text-xs text-amber-300">NHTSA’s complaint service did not answer. Try again in a minute.</p>
            ) : complaints.total === 0 ? (
              <p className="text-xs text-slate-400">No owner complaints on file for this vehicle.</p>
            ) : (
              <>
                <p className="text-[11px] text-slate-500">
                  What owners report to NHTSA most on this vehicle — a starting point for where to look.
                </p>
                <ol className="divide-y divide-white/5">
                  {topComponents.map((c, i) => (
                    <li key={c.component} className="flex items-baseline justify-between gap-3 py-1.5 text-xs">
                      <span className="text-slate-200">
                        <span className="text-slate-500 tabular-nums mr-2">{i + 1}.</span>
                        {c.component}
                      </span>
                      <span className="tabular-nums text-slate-400">{c.count}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </Section>

          {complaints && complaints.recent.length > 0 && (
            <Section title="Recent owner complaints" aside="Newest first">
              <ul className="space-y-2">
                {shownComplaints.map((c) => (
                  <li key={c.id} className="rounded-xl border border-white/10 bg-[#0b0c10] p-3 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {c.components.map((comp) => (
                        <span key={comp} className="text-[10px] font-semibold text-slate-300 bg-white/5 border border-white/10 rounded-full px-2 py-0.5">
                          {comp}
                        </span>
                      ))}
                      {c.crash && <span className="text-[10px] font-bold text-red-300">Crash</span>}
                      {c.fire && <span className="text-[10px] font-bold text-amber-300">Fire</span>}
                      <span className="text-[10px] text-slate-500 ml-auto">{shortDate(c.filedOn)}</span>
                    </div>
                    <ClampedText text={c.summary} />
                  </li>
                ))}
              </ul>
              {complaints.recent.length > shownComplaints.length && (
                <button type="button" onClick={() => setShowAllComplaints(true)} className="text-[11px] font-bold text-orange-400">
                  Show {complaints.recent.length - shownComplaints.length} more
                </button>
              )}
            </Section>
          )}

          <Section title={`Shop notes (${notes.length})`} aside={`Shared for every ${v.year} ${v.make} ${v.model}`}>
            <p className="text-[11px] text-slate-500">
              Confirmed fixes, part numbers, torque specs you looked up, gotchas. Techs see these too.
            </p>
            {notesError && <p role="alert" className="text-xs text-amber-300">{notesError}</p>}
            <ul className="space-y-2">
              {notes.map((n) => (
                <li key={n.id} className="rounded-xl border border-white/10 bg-[#0b0c10] p-3">
                  <p className="text-[12px] leading-relaxed text-slate-200 whitespace-pre-wrap">{n.note}</p>
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] text-slate-500">
                    <span>
                      {n.authorName || 'Staff'} · {shortDate(n.createdAt)}
                      {n.vin ? ` · VIN ${n.vin}` : ''}
                    </span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => void removeNote(n)}
                        aria-label="Delete note"
                        className="ml-auto text-slate-500 hover:text-red-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <label htmlFor="research-note" className="sr-only">
              New shop note
            </label>
            <textarea
              id="research-note"
              rows={3}
              className={`${inputCls} py-2.5`}
              placeholder="e.g. P0300 misfire — coil packs on 3.5 EcoBoost; replace all six, Motorcraft DG-549"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={4000}
            />
            <button
              type="button"
              disabled={!draft.trim() || savingNote}
              onClick={() => void saveNote()}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-white/15 px-4 text-xs font-bold text-slate-200 hover:border-white/30 disabled:opacity-40"
            >
              {savingNote && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
              Save note
            </button>
          </Section>
        </div>
      )}
    </div>
  );
};
