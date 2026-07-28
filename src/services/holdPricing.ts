import {
  DIAGNOSTIC_HOLD_DOLLARS,
  DIRECT_BOOK_KINDS,
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
  /** Catalog subtotal before hold rule (direct path only). */
  catalogSubtotal: number;
};

/**
 * Quote hold rules:
 * - Always start with $100 diagnostic, then recommend repairs —
 *   UNLESS the booking is only direct-book work (brakes, oil, transmission oil, differential).
 */
export function computeHoldQuote(selectedIdsOrTitles: string[]): HoldQuote {
  const services = resolveServices(selectedIdsOrTitles);
  if (services.length === 0) {
    return {
      holdDollars: DIAGNOSTIC_HOLD_DOLLARS,
      mode: 'diagnostic',
      explanation: 'Mobile diagnostic visit — $100. We recommend repairs after inspection.',
      services: [],
      catalogSubtotal: 0,
    };
  }

  const allDirect = services.every((s) => DIRECT_BOOK_KINDS.includes(s.kind) && s.directBook);
  if (allDirect) {
    const catalogSubtotal = services.reduce((sum, s) => sum + s.price, 0);
    return {
      holdDollars: catalogSubtotal,
      mode: 'direct',
      explanation:
        'Direct-book service (brakes / oil / transmission / differential) — no diagnostic fee. Card hold matches the service price.',
      services,
      catalogSubtotal,
    };
  }

  const consultFirst = services.some((s) => !s.directBook);

  return {
    holdDollars: DIAGNOSTIC_HOLD_DOLLARS,
    mode: 'diagnostic',
    explanation: consultFirst
      ? 'Starts with a $100 on-site diagnostic / consult. Your specialist quotes the full job before any repair or install charge.'
      : 'Starts with a $100 diagnostic fee. After inspection we recommend what needs to be done before any repair charge.',
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
      // Unknown / custom concern → treated as diagnostic path
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
