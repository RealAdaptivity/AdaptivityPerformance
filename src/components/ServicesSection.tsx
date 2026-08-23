import React, { useMemo } from 'react';
import { ArrowRight, Wrench } from 'lucide-react';
import {
  SERVICE_CATALOG,
  formatCatalogPriceRange,
  specialtyForServiceKind,
  type CatalogService,
} from '../services/serviceCatalog';

const SPECIALTY_LABELS: Record<string, string> = {
  mechanical: 'Diagnostics & Mechanical',
  audio: 'Car Audio',
  tint: 'Window Tint',
  wrap: 'Wrap & PPF',
  bodywork: 'Body Work',
  modification: 'Mods & Accessories',
  detailing: 'Detailing',
  tires: 'Tires & Wheels',
  glass: 'Auto Glass',
  performance: 'Performance',
};

interface ServicesSectionProps {
  onOpenBooking: () => void;
  onBookService?: (serviceId: string) => void;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({ onOpenBooking, onBookService }) => {
  const groups = useMemo(() => {
    const map = new Map<string, CatalogService[]>();
    for (const s of SERVICE_CATALOG) {
      const key = specialtyForServiceKind(s.kind);
      const list = map.get(key) || [];
      list.push(s);
      map.set(key, list);
    }
    return [...map.entries()];
  }, []);

  return (
    <section id="services" className="py-20 bg-[#0e1017] border-t border-white/10 relative overflow-hidden">
      <div className="absolute top-1/4 left-0 w-72 h-72 bg-orange-600/8 blur-[100px] rounded-full pointer-events-none" />
      <div className="container mx-auto px-4 relative z-10 space-y-10">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 border border-orange-500/30 px-3.5 py-1.5 rounded-full">
            <Wrench className="w-3.5 h-3.5" />
            Complete Mobile Service Catalog
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-black text-white leading-tight">
            Full Automotive Care —{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500">
              Dispatched to Your Driveway
            </span>
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Select a service below to view transparent pricing and schedule your mobile mechanic. 
            All jobs are backed by our 12-month nationwide warranty.
          </p>
          <button
            type="button"
            onClick={onOpenBooking}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm shadow-lg shadow-orange-500/20"
          >
            Schedule Mobile Service
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl mx-auto">
          {groups.map(([key, items]) => (
            <article
              key={key}
              className="rounded-3xl border border-white/10 bg-[#12141c] p-5 sm:p-6 space-y-3 text-left"
            >
              <h3 className="font-heading text-lg font-extrabold text-white">
                {SPECIALTY_LABELS[key] || key}
              </h3>
              <ul className="space-y-2">
                {items.slice(0, 6).map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => (onBookService ? onBookService(s.id) : onOpenBooking())}
                      className="w-full flex items-start gap-3 text-left rounded-xl px-2.5 py-2 hover:bg-white/5 transition-colors group"
                    >
                      <span className="text-base leading-none mt-0.5" aria-hidden>
                        {s.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-200 group-hover:text-orange-300">
                          {s.title}
                        </span>
                        <span className="block text-[11px] text-slate-500 line-clamp-1">{s.description}</span>
                      </span>
                      <span className="text-[11px] font-bold text-orange-400 shrink-0 pt-0.5 text-right max-w-[7.5rem] leading-snug">
                        {formatCatalogPriceRange(s) ?? 'On-site price'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
