/**
 * Vehicle research for the admin dashboard: NHTSA safety recalls and owner
 * complaints for a year / make / model, shaped for the Research tab.
 *
 * This is the public-data half of what a shop gets from ALLDATA or Mitchell 1.
 * Factory repair procedures, wiring diagrams and labor times are licensed OEM
 * content and are not here; researchLinks() points at those services instead.
 *
 * No imports, so the node test runner can load it, and the vehicle-research
 * edge function uses an identical copy (supabase/functions/_shared/
 * vehicleResearch.ts; tests/vehicleResearch.test.ts keeps them the same).
 * NHTSA's APIs send no CORS headers, so browsers reach them through that
 * function.
 */

export type RecallItem = {
  campaign: string;
  component: string;
  summary: string;
  consequence: string;
  remedy: string;
  /** ISO date NHTSA received the manufacturer's report. */
  reportedOn: string | null;
  /** NHTSA's "do not drive" flag. */
  parkIt: boolean;
  /** "Park outside" — fire risk while parked. */
  parkOutside: boolean;
  overTheAir: boolean;
};

export type ComplaintItem = {
  id: string;
  filedOn: string | null;
  incidentOn: string | null;
  components: string[];
  summary: string;
  crash: boolean;
  fire: boolean;
  injuries: number;
  deaths: number;
};

export type ComponentCount = { component: string; count: number };

export type ComplaintSummary = {
  total: number;
  crashes: number;
  fires: number;
  injuries: number;
  deaths: number;
  /** Most-complained-about systems first: where to look first on this vehicle. */
  byComponent: ComponentCount[];
  /** Newest first. */
  recent: ComplaintItem[];
};

export type ResearchLink = { label: string; href: string; note: string };

const text = (v: unknown): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');
const count = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

/**
 * NHTSA writes recall dates day-first ("18/12/2018") and complaint dates
 * month-first ("10/05/2026"). Returns 'YYYY-MM-DD', or null for anything that
 * is not a real calendar date.
 */
export function parseNhtsaDate(raw: unknown, order: 'dmy' | 'mdy'): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text(raw));
  if (!m) return null;
  const [a, b, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const [d, mo] = order === 'dmy' ? [a, b] : [b, a];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** "SEAT BELTS:REAR/OTHER" → "Seat belts: rear/other"; "AIR BAGS" → "Air bags". */
export function componentLabel(raw: string): string {
  const s = text(raw).toLowerCase().replace(/\s*:\s*/g, ': ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * A complaint lists its systems comma-separated with no space
 * ("POWER TRAIN,ENGINE"), while a few system names carry their own ", "
 * ("SERVICE BRAKES, HYDRAULIC"), so only a comma without a space splits.
 */
export function splitComponents(raw: unknown): string[] {
  return text(raw)
    .split(/,(?! )/)
    .map((c) => c.trim())
    .filter(Boolean)
    .map(componentLabel);
}

/** recallsByVehicle → do-not-drive and park-outside recalls first, then newest first. */
export function summarizeRecalls(json: unknown): RecallItem[] {
  const results = (json as { results?: unknown })?.results;
  if (!Array.isArray(results)) return [];
  const seen = new Set<string>();
  const out: RecallItem[] = [];
  for (const r of results as Record<string, unknown>[]) {
    const campaign = text(r?.NHTSACampaignNumber);
    if (!campaign || seen.has(campaign)) continue;
    seen.add(campaign);
    out.push({
      campaign,
      component: componentLabel(text(r.Component)),
      summary: text(r.Summary),
      consequence: text(r.Consequence),
      remedy: text(r.Remedy),
      reportedOn: parseNhtsaDate(r.ReportReceivedDate, 'dmy'),
      parkIt: r.parkIt === true,
      parkOutside: r.parkOutSide === true,
      overTheAir: r.overTheAirUpdate === true,
    });
  }
  const urgent = (x: RecallItem) => (x.parkIt ? 2 : x.parkOutside ? 1 : 0);
  return out.sort(
    (a, b) => urgent(b) - urgent(a) || (b.reportedOn ?? '').localeCompare(a.reportedOn ?? '')
  );
}

/** complaintsByVehicle → totals, the systems owners complain about most, and the newest complaints. */
export function summarizeComplaints(json: unknown, recentLimit = 25): ComplaintSummary {
  const results = (json as { results?: unknown })?.results;
  const rows = Array.isArray(results) ? (results as Record<string, unknown>[]) : [];
  const items: ComplaintItem[] = rows.map((c) => ({
    id: String(c?.odiNumber ?? ''),
    filedOn: parseNhtsaDate(c?.dateComplaintFiled, 'mdy'),
    incidentOn: parseNhtsaDate(c?.dateOfIncident, 'mdy'),
    components: splitComponents(c?.components),
    summary: text(c?.summary),
    crash: c?.crash === true,
    fire: c?.fire === true,
    injuries: count(c?.numberOfInjuries),
    deaths: count(c?.numberOfDeaths),
  }));

  const tally = new Map<string, number>();
  for (const it of items) for (const comp of new Set(it.components)) tally.set(comp, (tally.get(comp) ?? 0) + 1);
  const byComponent = [...tally.entries()]
    .map(([component, n]) => ({ component, count: n }))
    .sort((a, b) => b.count - a.count || a.component.localeCompare(b.component));

  return {
    total: items.length,
    crashes: items.filter((i) => i.crash).length,
    fires: items.filter((i) => i.fire).length,
    injuries: items.reduce((s, i) => s + i.injuries, 0),
    deaths: items.reduce((s, i) => s + i.deaths, 0),
    byComponent,
    recent: [...items]
      .sort((a, b) => (b.filedOn ?? '').localeCompare(a.filedOn ?? ''))
      .slice(0, Math.max(0, recentLimit)),
  };
}

/**
 * Where the licensed repair information lives. ALLDATA, Mitchell 1 and
 * Identifix need the shop's own subscription; NHTSA's pages are free and its
 * VIN search is the only way to see whether a recall is still open on this
 * particular vehicle.
 */
export function researchLinks(v: { vin?: string | null; year: string; make: string; model: string }): ResearchLink[] {
  const enc = encodeURIComponent;
  const links: ResearchLink[] = [];
  if (v.vin) {
    links.push({
      label: 'Open recalls for this VIN',
      href: `https://www.nhtsa.gov/recalls?vin=${enc(v.vin)}`,
      note: 'NHTSA — shows which recalls are still unrepaired on this exact vehicle.',
    });
  }
  links.push(
    {
      label: 'NHTSA vehicle page',
      href: `https://www.nhtsa.gov/vehicle/${enc(v.year)}/${enc(v.make.toUpperCase())}/${enc(v.model.toUpperCase())}`,
      note: 'Recalls, investigations, complaints and manufacturer service bulletins (TSBs).',
    },
    {
      label: 'ALLDATA Repair',
      href: 'https://my.alldata.com/',
      note: 'Factory procedures, wiring diagrams, specs, labor times. Needs your ALLDATA login.',
    },
    {
      label: 'Mitchell 1 ProDemand',
      href: 'https://www1.prodemand.com/',
      note: 'OEM repair info and SureTrack real-world fixes. Needs your ProDemand login.',
    },
    {
      label: 'Identifix Direct-Hit',
      href: 'https://dh.identifix.com/',
      note: 'Confirmed fixes from other shops by symptom and code. Needs your Identifix login.',
    }
  );
  return links;
}
