import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle2, MapPin, Wrench, ArrowRight } from 'lucide-react';
import { fetchApprovedPartners, type PartnerLocation } from '../services/partners';

interface PartnerNetworkSectionProps {
  onOpenPartnerApply: () => void;
}

export const PartnerNetworkSection: React.FC<PartnerNetworkSectionProps> = ({
  onOpenPartnerApply,
}) => {
  const [partners, setPartners] = useState<PartnerLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchApprovedPartners()
      .then(setPartners)
      .catch(() => setPartners([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="partners" className="py-16 bg-[#0b0c10] border-t border-white/10">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center space-y-3 mb-10">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-400 bg-sky-500/10 border border-sky-500/30 px-3 py-1.5 rounded-full">
            <Building2 className="w-3.5 h-3.5" />
            Shop & garage partnerships
          </span>
          <h2 className="font-heading text-3xl lg:text-4xl font-black text-white">
            We bring customers to local shops & garages
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Own a shop, bay, or private garage? Partner with Adaptivity — we handle booking, payment holds,
            and dispatch. You host the work (or we send a mobile tech to your space) and grow volume without
            extra marketing spend.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 max-w-4xl mx-auto text-xs">
          {[
            {
              title: 'More booked jobs',
              body: 'Customers choose your location for drop-off, lifts, and heavier work.',
            },
            {
              title: 'We handle the front door',
              body: 'Quotes, card holds, tracking, and payouts stay on Adaptivity’s platform.',
            },
            {
              title: 'Keep your brand',
              body: 'Listed as a partner host location — you still run your shop day to day.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/10 bg-[#12141c] p-4 text-left space-y-1.5"
            >
              <p className="font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {item.title}
              </p>
              <p className="text-slate-400 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="max-w-3xl mx-auto space-y-3 mb-8">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Partner locations accepting bookings
          </p>
          {loading && <p className="text-xs text-slate-500">Loading partners…</p>}
          {!loading && partners.length === 0 && (
            <p className="text-xs text-slate-500">
              Partner network launching — apply below to be among the first host locations.
            </p>
          )}
          {partners.map((p) => (
            <div
              key={p.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#12141c] px-4 py-3"
            >
              <div className="space-y-1">
                <p className="font-bold text-white text-sm flex items-center gap-2">
                  {p.businessName}
                  {p.isAdaptivityOwned && (
                    <span className="text-[10px] font-bold text-orange-300 bg-orange-500/15 border border-orange-500/30 px-2 py-0.5 rounded-full">
                      Adaptivity hub
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {p.address}
                </p>
                <p className="text-[11px] text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
                  {p.hasLift && (
                    <span className="inline-flex items-center gap-1">
                      <Wrench className="w-3 h-3" /> Lift available
                    </span>
                  )}
                  {p.bayCount != null && <span>{p.bayCount} bay{p.bayCount === 1 ? '' : 's'}</span>}
                  {p.hoursNote && <span>{p.hoursNote}</span>}
                </p>
              </div>
              <span className="shrink-0 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-xs font-semibold">
                Facility In Progress
              </span>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={onOpenPartnerApply}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-sm shadow-lg shadow-sky-500/20"
          >
            Partner your shop or garage
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
