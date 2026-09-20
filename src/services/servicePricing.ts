import {
  DIAGNOSTIC_FEE_DOLLARS,
  SERVICE_CATALOG,
  getCatalogById,
  matchCatalogFromLabel,
  type CatalogService,
} from './serviceCatalog';

export type HoldQuote = {
  quotedDollars: number;
  mode: 'diagnostic' | 'direct';
  explanation: string;
  services: CatalogService[];
  /** Catalog subtotal before the quote rule (legacy; always the diagnostic now). */
  catalogSubtotal: number;
};

/**
 * All bookings quote a $100 diagnostic, collected in person.
 * The assigned tech sets labor + parts on site and charges through Adaptivity (70/30).
 */
export function computeServiceQuote(selectedIdsOrTitles: string[]): HoldQuote {
  const services = resolveServices(selectedIdsOrTitles);
  return {
    quotedDollars: DIAGNOSTIC_FEE_DOLLARS,
    mode: 'diagnostic',
    explanation:
      `$${DIAGNOSTIC_FEE_DOLLARS} diagnostic, paid in person. Your tech inspects on site and sets labor + parts pricing before any repair work.`,
    services,
    catalogSubtotal: DIAGNOSTIC_FEE_DOLLARS,
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
        price: DIAGNOSTIC_FEE_DOLLARS,
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

export { DIAGNOSTIC_FEE_DOLLARS, SERVICE_CATALOG };
