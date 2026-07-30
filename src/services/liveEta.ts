/** Estimate drive minutes from tech GPS → job (rough city-driving heuristic). */

const MPH = 22; // DFW arterial average for ETA heuristic

export function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function etaMinutesFromGps(params: {
  techLat: number | null | undefined;
  techLng: number | null | undefined;
  /** Optional geocoded job coords; when missing, fall back to stored etaMinutes */
  jobLat?: number | null;
  jobLng?: number | null;
  fallbackEtaMinutes?: number | null;
}): { minutes: number | null; source: 'gps' | 'stored' | 'none'; miles: number | null } {
  const { techLat, techLng, jobLat, jobLng, fallbackEtaMinutes } = params;
  if (
    techLat != null &&
    techLng != null &&
    jobLat != null &&
    jobLng != null &&
    Number.isFinite(techLat) &&
    Number.isFinite(techLng) &&
    Number.isFinite(jobLat) &&
    Number.isFinite(jobLng)
  ) {
    const miles = haversineMiles(techLat, techLng, jobLat, jobLng);
    const minutes = Math.max(1, Math.round((miles / MPH) * 60));
    return { minutes, source: 'gps', miles: Math.round(miles * 10) / 10 };
  }
  if (fallbackEtaMinutes != null && Number.isFinite(fallbackEtaMinutes)) {
    return { minutes: Math.max(0, Math.round(fallbackEtaMinutes)), source: 'stored', miles: null };
  }
  return { minutes: null, source: 'none', miles: null };
}

export function formatLiveEta(minutes: number | null, source: 'gps' | 'stored' | 'none'): string {
  if (minutes == null) return 'ETA updating…';
  if (source === 'gps') return `~${minutes} min live ETA`;
  return `~${minutes} min ETA`;
}
