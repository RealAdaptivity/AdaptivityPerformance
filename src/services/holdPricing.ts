import {
  DIAGNOSTIC_HOLD_DOLLARS,
  SERVICE_CATALOG,
  getCatalogById,
  matchCatalogFromLabel,
  type CatalogService,
} from './serviceCatalog';

export type HoldQuote = {
  holdDollars: number;
  mode: 'diagnostic' | 'direct';
  explanation: string;
  services: CatalogService[];
  /** Catalog subtotal before hold rule (legacy; always diagnostic hold now). */
  catalogSubtotal: number;
};

/**
 * All bookings use an $85 diagnostic card hold.
 * The assigned tech sets labor + parts on site and charges through Adaptivity (70/30).
 */
export function computeHoldQuote(selectedIdsOrTitles: string[]): HoldQuote {
  const services = resolveServices(selectedIdsOrTitles);
  return {
    holdDollars: DIAGNOSTIC_HOLD_DOLLARS,
    mode: 'diagnostic',
    explanation:
      `$${DIAGNOSTIC_HOLD_DOLLARS} diagnostic hold. Your tech inspects on site, sets labor + parts pricing, and charges through Adaptivity when you agree — tech keeps 70%, platform 30%.`,
    services,
    catalogSubtotal: DIAGNOSTIC_HOLD_DOLLARS,
  };
}

function resolveServices(selected: string[]): CatalogService[] {
  const out: CatalogService[] = [];
  const seen = new Set<string>();
  for (const raw of selected) {
    const byId = getCatalogById(raw);
    const match = byId || matchCatalogFromLabel(raw);
    if (match && !seen.has(match.id)) {
      seen.add(match.id);
      out.push(match);
      continue;
    }
    if (!match && !seen.has(raw)) {
      seen.add(raw);
      out.push({
        id: `custom_${raw.slice(0, 24)}`,
        title: raw,
        description: '',
        price: DIAGNOSTIC_HOLD_DOLLARS,
        duration: '',
        icon: '📋',
        kind: 'other',
        directBook: false,
      });
    }
  }
  return out;
}

export function defaultDiagnosticSelection(): string[] {
  return ['diagnostic'];
}

export { DIAGNOSTIC_HOLD_DOLLARS, SERVICE_CATALOG };
