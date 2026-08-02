import React, { useState } from 'react';
import { MapPin, Search, CheckCircle2, AlertCircle, Clock, Truck, Navigation } from 'lucide-react';
import {
  FREE_MILES_THRESHOLD,
  PER_MILE_RATE,
  lookupServiceZip,
  normalizeZip,
} from '../services/serviceArea';
import { SITE_PHONE_DISPLAY, SITE_PHONE_TEL } from '../site/seo';
interface ServiceAreaCheckerProps {
  onBookMobile: (zip: string) => void;
}

export const ServiceAreaChecker: React.FC<ServiceAreaCheckerProps> = ({ onBookMobile }) => {
  const [zipInput, setZipInput] = useState('76102');
  const [searchResult, setSearchResult] = useState(() => lookupServiceZip('76102'));
  const [hasSearched, setHasSearched] = useState(true);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanZip = normalizeZip(zipInput) || zipInput.trim();
    setSearchResult(lookupServiceZip(cleanZip));
    setHasSearched(true);
  };

  const calculateTravelFee = (dist: number) => {
    if (dist <= FREE_MILES_THRESHOLD) return '$0 (FREE Local Dispatch)';
    const extra = dist - FREE_MILES_THRESHOLD;
    const fee = extra * PER_MILE_RATE;
    return `$${fee.toFixed(2)} (${extra} mi past 15mi @ $${PER_MILE_RATE.toFixed(2)}/mi)`;
  };

  return (
    <section id="area" className="py-20 bg-[#0e1017] border-t border-white/5 relative">
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center space-y-3 mb-12">
          <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
            <Navigation className="w-3.5 h-3.5" />
            <span>DFW / Fort Worth Mobile Coverage</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white">
            Serving <span className="text-orange-500">Dallas–Fort Worth</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Mobile vans across the DFW / Fort Worth metro. First 15 miles from our Justin hub are free —
            then $2.00/mi.
          </p>
        </div>

        <div className="max-w-4xl mx-auto bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="p-4 rounded-2xl bg-[#0b0c10] border border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                  0 – 15 MILES
                </span>
                <div className="font-bold text-base text-white mt-1">Justin Hub Free Radius</div>
                <div className="text-xs text-slate-400">Justin, Northlake, nearby Alliance</div>
              </div>
              <span className="text-xl font-extrabold text-emerald-400 font-heading">$0 FREE</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0b0c10] border border-orange-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-orange-500/20 text-orange-400">
                  DFW METRO
                </span>
                <div className="font-bold text-base text-white mt-1">Fort Worth · Dallas · Mid-Cities</div>
                <div className="text-xs text-slate-400">Zips 750–752 & 760–762</div>
              </div>
              <span className="text-xl font-extrabold text-orange-400 font-heading">$2.00 / mi</span>
            </div>
          </div>

          <form onSubmit={handleSearch} className="max-w-lg mx-auto mb-8">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 text-center">
              Enter Your Zip Code
            </label>
            <div className="flex items-center bg-[#0b0c10] p-1.5 rounded-2xl border border-white/15 focus-within:border-orange-500 transition-colors">
              <MapPin className="w-5 h-5 text-orange-500 ml-3 flex-shrink-0" />
              <input
                type="text"
                value={zipInput}
                onChange={(e) => setZipInput(e.target.value)}
                placeholder="e.g. 76102 or 76011"
                className="w-full bg-transparent px-3 py-2 text-white placeholder-slate-500 text-base font-semibold focus:outline-none"
                maxLength={5}
              />
              <button
                type="submit"
                className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center space-x-1.5"
              >
                <Search className="w-4 h-4" />
                <span>Check</span>
              </button>
            </div>
          </form>

          {hasSearched && (
            <div className="max-w-2xl mx-auto">
              {searchResult ? (
                <div className="bg-gradient-to-b from-[#181b26] to-[#12141c] p-6 rounded-2xl border border-emerald-500/40 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>
                        {searchResult.status === 'Local Radius'
                          ? 'In free dispatch radius'
                          : 'In DFW / Fort Worth coverage'}
                      </span>
                    </div>
                    <span className="text-xs bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full border border-orange-500/30 font-bold">
                      {calculateTravelFee(searchResult.distanceMiles)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left pt-2 border-t border-white/10">
                    <div>
                      <div className="text-xs text-slate-400">City / Distance from hub</div>
                      <div className="font-heading text-lg font-bold text-white">
                        {searchResult.city} ({searchResult.distanceMiles} mi)
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{searchResult.area}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Est. Mobile Van ETA</div>
                      <div className="font-heading text-lg font-bold text-orange-400 flex items-center gap-1">
                        <Clock className="w-4 h-4" /> {searchResult.responseTime}
                      </div>
                      <div className="text-xs text-emerald-400 mt-0.5 font-semibold flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5" /> Mobile vans ready
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onBookMobile(searchResult.zip)}
                    className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm rounded-xl shadow-lg transition-all"
                  >
                    Request Mobile Service in {searchResult.city}
                  </button>
                </div>
              ) : (
                <div className="bg-[#181b26] p-6 rounded-2xl border border-amber-500/40 space-y-3 text-center">
                  <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                  <h4 className="font-bold text-white text-base">Outside DFW mobile coverage</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Zip {zipInput} isn’t in our DFW / Fort Worth mobile area (TX 750–752, 760–762). We can still
                    quote custom distance or welcome you at the Justin shop.
                  </p>
                  <a href={SITE_PHONE_TEL} className="inline-block text-xs font-bold text-orange-400 underline pt-1">
                    Call {SITE_PHONE_DISPLAY} for a custom quote
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
