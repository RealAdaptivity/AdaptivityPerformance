import React, { useState } from 'react';
import { MapPin, Search, CheckCircle2, AlertCircle, Clock, Truck, Navigation } from 'lucide-react';

const COVERED_ZIPS: Record<string, { city: string; area: string; distanceMiles: number; responseTime: string; status: 'Local Radius' | 'Extended Per-Mile' }> = {
  '76247': { city: 'Justin', area: 'Downtown Justin, Hardeman, Wildcat Ridge', distanceMiles: 3, responseTime: '15 - 30 Mins', status: 'Local Radius' },
  '76226': { city: 'Northlake', area: 'Canyon Falls, Harvest, Pecan Square', distanceMiles: 6, responseTime: '15 - 30 Mins', status: 'Local Radius' },
  '76262': { city: 'Northlake / Roanoke', area: 'Northlake Town Center, Alliance', distanceMiles: 11, responseTime: '20 - 35 Mins', status: 'Local Radius' },
  '76227': { city: 'Argyle', area: 'Village of Argyle, Country Club', distanceMiles: 18, responseTime: '25 - 40 Mins', status: 'Extended Per-Mile' },
  '76052': { city: 'Haslet', area: 'Haslet Town Center, Sendera Ranch', distanceMiles: 16, responseTime: '20 - 35 Mins', status: 'Extended Per-Mile' },
  '76259': { city: 'Ponder', area: 'Ponder & W Denton County', distanceMiles: 19, responseTime: '25 - 40 Mins', status: 'Extended Per-Mile' },
  '76248': { city: 'Keller / Fort Worth', area: 'Alliance Corridor', distanceMiles: 24, responseTime: '30 - 45 Mins', status: 'Extended Per-Mile' },
  '76201': { city: 'Denton', area: 'Denton Metro & Loop 288', distanceMiles: 22, responseTime: '30 - 45 Mins', status: 'Extended Per-Mile' },
};

const FREE_MILES_THRESHOLD = 15;
const PER_MILE = 2.00;

interface ServiceAreaCheckerProps {
  onBookMobile: (zip: string) => void;
}

export const ServiceAreaChecker: React.FC<ServiceAreaCheckerProps> = ({ onBookMobile }) => {
  const [zipInput, setZipInput] = useState('76247');
  const [searchResult, setSearchResult] = useState<any>(COVERED_ZIPS['76247']);
  const [hasSearched, setHasSearched] = useState(true);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanZip = zipInput.trim();
    if (COVERED_ZIPS[cleanZip]) {
      setSearchResult(COVERED_ZIPS[cleanZip]);
    } else {
      setSearchResult(null);
    }
    setHasSearched(true);
  };

  const calculateTravelFee = (dist: number) => {
    if (dist <= FREE_MILES_THRESHOLD) return '$0 (FREE Local Dispatch)';
    const extra = dist - FREE_MILES_THRESHOLD;
    const fee = extra * PER_MILE;
    return `$${fee.toFixed(2)} (${extra} mi past 15mi @ $2/mi)`;
  };

  return (
    <section id="area" className="py-20 bg-[#0e1017] border-t border-white/5 relative">
      <div className="container mx-auto px-4 relative z-10">

        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-3 mb-12">
          <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
            <Navigation className="w-3.5 h-3.5" />
            <span>Local Radius + Per-Mile Mileage Model</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white">
            First 15 Miles <span className="text-orange-500">100% FREE.</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            No travel fees for Justin & Northlake. Just $2.00 per mile for distances beyond our 15-mile local radius.
          </p>
        </div>

        <div className="max-w-4xl mx-auto bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl">
          
          {/* Rule Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="p-4 rounded-2xl bg-[#0b0c10] border border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">0 – 15 MILES</span>
                <div className="font-bold text-base text-white mt-1">Justin & Northlake Core</div>
                <div className="text-xs text-slate-400">Harvest, Canyon Falls, Pecan Square</div>
              </div>
              <span className="text-xl font-extrabold text-emerald-400 font-heading">$0 FREE</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0b0c10] border border-orange-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-orange-500/20 text-orange-400">15+ MILES</span>
                <div className="font-bold text-base text-white mt-1">Extended Distance Rate</div>
                <div className="text-xs text-slate-400">Argyle, Haslet, Denton, Keller</div>
              </div>
              <span className="text-xl font-extrabold text-orange-400 font-heading">$2.00 / mi</span>
            </div>
          </div>

          {/* Zip Lookup Input */}
          <form onSubmit={handleSearch} className="max-w-lg mx-auto mb-8">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 text-center">
              Enter Your Zip Code
            </label>
            <div className="flex items-center bg-[#0b0c10] p-1.5 rounded-2xl border border-white/15 focus-within:border-orange-500 transition-colors">
              <MapPin className="w-5 h-5 text-orange-500 ml-3 flex-shrink-0" />
              <input
                type="text"
                value={zipInput}
                onChange={e => setZipInput(e.target.value)}
                placeholder="e.g. 76247 or 76226"
                className="w-full bg-transparent px-3 py-2 text-white placeholder-slate-500 text-base font-semibold focus:outline-none"
                maxLength={5}
              />
              <button
                type="submit"
                className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center space-x-1.5"
              >
                <Search className="w-4 h-4" />
                <span>Calculate</span>
              </button>
            </div>
          </form>

          {/* Search Result Display */}
          {hasSearched && (
            <div className="max-w-2xl mx-auto">
              {searchResult ? (
                <div className="bg-gradient-to-b from-[#181b26] to-[#12141c] p-6 rounded-2xl border border-emerald-500/40 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>{searchResult.status === 'Local Radius' ? '100% In Free Dispatch Radius' : 'Extended Mileage Service Area'}</span>
                    </div>
                    <span className="text-xs bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full border border-orange-500/30 font-bold">
                      {calculateTravelFee(searchResult.distanceMiles)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left pt-2 border-t border-white/10">
                    <div>
                      <div className="text-xs text-slate-400">City / Distance</div>
                      <div className="font-heading text-lg font-bold text-white">{searchResult.city} ({searchResult.distanceMiles} mi)</div>
                      <div className="text-xs text-slate-400 mt-0.5">{searchResult.area}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Est. Mobile Van ETA</div>
                      <div className="font-heading text-lg font-bold text-orange-400 flex items-center gap-1">
                        <Clock className="w-4 h-4" /> {searchResult.responseTime}
                      </div>
                      <div className="text-xs text-emerald-400 mt-0.5 font-semibold flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5" /> Mobile Van Units Ready
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onBookMobile(zipInput)}
                    className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm rounded-xl shadow-lg transition-all"
                  >
                    Request Mobile Service in {searchResult.city}
                  </button>
                </div>
              ) : (
                <div className="bg-[#181b26] p-6 rounded-2xl border border-amber-500/40 space-y-3 text-center">
                  <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                  <h4 className="font-bold text-white text-base">Long Distance Service Area</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Zip code {zipInput} is further than our standard mobile dispatch area, but we can calculate a custom per-mile quote or welcome you to our Justin garage hub!
                  </p>
                  <a href="tel:2146203244" className="inline-block text-xs font-bold text-orange-400 underline pt-1">
                    Call (214) 620-3244 for custom distance quote
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
