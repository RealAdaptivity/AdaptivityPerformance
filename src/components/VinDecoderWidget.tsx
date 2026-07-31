import React, { useState } from 'react';
import { Search, CheckCircle2, AlertCircle, Loader2, ArrowRight, Car } from 'lucide-react';

interface VinDecoderWidgetProps {
  onBookWithVehicle: (vehicleData: { year: string; make: string; model: string; engine: string; vin: string }) => void;
}

interface VinDecodeResult {
  year: string;
  make: string;
  model: string;
  trim: string;
  series: string;
  engine: string;
  fuelType: string;
  transmission: string;
  driveType: string;
  bodyClass: string;
  gvwr: string;
  brakeSystem: string;
  doors: string;
  plantCountry: string;
  plantCity: string;
  vin: string;
  fullTechSpecString: string;
}

export const VinDecoderWidget: React.FC<VinDecoderWidgetProps> = ({ onBookWithVehicle }) => {
  const [vinInput, setVinInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decodedData, setDecodedData] = useState<VinDecodeResult | null>(null);

  const handleDecodeVin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanVin = vinInput.trim().toUpperCase();

    if (cleanVin.length !== 17) {
      setError('A valid Vehicle Identification Number (VIN) must be exactly 17 characters.');
      setDecodedData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call NHTSA (National Highway Traffic Safety Administration) Free Official VIN Decoder API
      const response = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${cleanVin}?format=json`
      );
      const data = await response.json();

      if (data?.Results?.[0]) {
        const result = data.Results[0];

        if (!result.Make && !result.Model) {
          throw new Error('VIN not found in NHTSA database. Double check character entry.');
        }

        const engineSpec = [
          result.DisplacementL ? `${result.DisplacementL}L` : '',
          result.EngineConfiguration,
          result.EngineCylinders ? `${result.EngineCylinders}-Cyl` : '',
          result.EngineModel ? `(${result.EngineModel})` : '',
        ].filter(Boolean).join(' ') || 'Standard Powertrain';

        const fullSpecs = [
          `${result.ModelYear} ${result.Make} ${result.Model}`,
          result.Trim ? `Trim: ${result.Trim}` : '',
          result.Series ? `Series: ${result.Series}` : '',
          `Engine: ${engineSpec}`,
          result.FuelTypePrimary ? `Fuel: ${result.FuelTypePrimary}` : '',
          result.TransmissionStyle ? `Trans: ${result.TransmissionStyle}` : '',
          result.DriveType ? `Drivetrain: ${result.DriveType}` : '',
          result.BrakeSystemType ? `Brakes: ${result.BrakeSystemType}` : '',
          `VIN: ${cleanVin}`
        ].filter(Boolean).join(' | ');

        const decoded: VinDecodeResult = {
          year: result.ModelYear || 'N/A',
          make: result.Make || 'N/A',
          model: result.Model || 'N/A',
          trim: result.Trim || 'N/A',
          series: result.Series || 'N/A',
          engine: engineSpec,
          fuelType: result.FuelTypePrimary || 'Gasoline',
          transmission: result.TransmissionStyle || 'Automatic',
          driveType: result.DriveType || 'N/A',
          bodyClass: result.BodyClass || 'Vehicle',
          gvwr: result.GVWR || 'Standard Class',
          brakeSystem: result.BrakeSystemType || 'Hydraulic Disc/Drum',
          doors: result.Doors || '4-Door',
          plantCountry: result.PlantCountry || 'USA',
          plantCity: result.PlantCity || 'N/A',
          vin: cleanVin,
          fullTechSpecString: fullSpecs,
        };

        setDecodedData(decoded);
      } else {
        throw new Error('Could not decode VIN. Please check your 17-digit VIN.');
      }
    } catch (err: any) {
      setError(err.message || 'Error decoding VIN. Please try again.');
      setDecodedData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-16 bg-[#0c0d12] border-t border-white/10 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-10">
          <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-orange-500/10 border border-orange-500/30 text-orange-400">
            Instant Parts & Vehicle Specs Lookup
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white">
            Free Official NHTSA VIN Decoder
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Enter your 17-digit VIN below to instantly pull exact factory specifications, engine trim, drive type, and exact OEM part matches for your vehicle.
          </p>
        </div>

        {/* Decoder Input Box */}
        <div className="max-w-2xl mx-auto bg-[#12141c] border border-orange-500/30 rounded-3xl p-6 shadow-2xl space-y-6">
          <form onSubmit={handleDecodeVin} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                maxLength={17}
                value={vinInput}
                onChange={(e) => setVinInput(e.target.value.toUpperCase())}
                placeholder="Enter 17-Digit VIN (e.g., 1FTFW1E84...)"
                className="w-full bg-[#0b0c10] border border-white/15 focus:border-orange-500 rounded-2xl px-4 py-3.5 text-sm text-white font-mono placeholder-slate-500 uppercase tracking-widest focus:outline-none transition-colors"
              />
              <span className="absolute right-3 top-3.5 text-[10px] font-mono text-slate-500">
                {vinInput.length}/17
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || vinInput.length !== 17}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 disabled:opacity-40 text-white font-bold text-xs sm:text-sm shadow-lg shadow-orange-500/25 flex items-center justify-center space-x-2 flex-shrink-0 transition-all active:scale-95"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Search className="w-4 h-4 text-white" />
              )}
              <span>{loading ? 'Decoding Specs…' : 'Decode VIN'}</span>
            </button>
          </form>

          {/* Error Notice */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Decoded Result Card */}
          {decodedData && (
            <div className="p-6 rounded-2xl bg-[#181b26] border border-emerald-500/30 space-y-5 animate-fade-in text-left">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold tracking-wider">
                      Verified NHTSA Vehicle Record
                    </span>
                    <h3 className="font-heading text-lg font-extrabold text-white">
                      {decodedData.year} {decodedData.make} {decodedData.model} {decodedData.trim}
                    </h3>
                  </div>
                </div>
                <span className="text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-2.5 py-1 rounded-full font-bold">
                  Matched
                </span>
              </div>

              {/* Full Technician Specification Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-[#0b0c10] p-3 rounded-xl border border-white/5 space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Trim & Package</span>
                  <p className="text-amber-300 font-bold truncate">{decodedData.trim !== 'N/A' ? decodedData.trim : (decodedData.series !== 'N/A' ? decodedData.series : 'Base Trim')}</p>
                </div>
                <div className="bg-[#0b0c10] p-3 rounded-xl border border-white/5 space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Engine Specs</span>
                  <p className="text-white font-medium truncate">{decodedData.engine}</p>
                </div>
                <div className="bg-[#0b0c10] p-3 rounded-xl border border-white/5 space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Transmission</span>
                  <p className="text-white font-medium truncate">{decodedData.transmission}</p>
                </div>
                <div className="bg-[#0b0c10] p-3 rounded-xl border border-white/5 space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Fuel Type</span>
                  <p className="text-white font-medium truncate">{decodedData.fuelType}</p>
                </div>
                <div className="bg-[#0b0c10] p-3 rounded-xl border border-white/5 space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Drivetrain</span>
                  <p className="text-white font-medium truncate">{decodedData.driveType}</p>
                </div>
                <div className="bg-[#0b0c10] p-3 rounded-xl border border-white/5 space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Brake System</span>
                  <p className="text-white font-medium truncate">{decodedData.brakeSystem}</p>
                </div>
                <div className="bg-[#0b0c10] p-3 rounded-xl border border-white/5 space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Body / Doors</span>
                  <p className="text-white font-medium truncate">{decodedData.bodyClass} ({decodedData.doors})</p>
                </div>
                <div className="bg-[#0b0c10] p-3 rounded-xl border border-white/5 space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">GVWR Rating</span>
                  <p className="text-white font-medium truncate">{decodedData.gvwr}</p>
                </div>
                <div className="bg-[#0b0c10] p-3 rounded-xl border border-white/5 space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Assembly Plant</span>
                  <p className="text-white font-medium truncate">{decodedData.plantCity !== 'N/A' ? `${decodedData.plantCity}, ` : ''}{decodedData.plantCountry}</p>
                </div>
                <div className="bg-[#0b0c10] p-3 rounded-xl border border-orange-500/30 space-y-0.5 sm:col-span-3">
                  <span className="text-[10px] text-orange-400 font-bold uppercase">Technician Dispatch Payload (Full VIN Spec String)</span>
                  <p className="text-slate-300 font-mono text-[11px] font-semibold tracking-wide break-all leading-snug">{decodedData.fullTechSpecString}</p>
                </div>
              </div>

              {/* Action Button to Book with Decoded Specs */}
              <div className="pt-2">
                <button
                  onClick={() => onBookWithVehicle(decodedData)}
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-orange-500/25 flex items-center justify-center space-x-2 hover:scale-105 transition-transform"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Book Mobile Service for This {decodedData.make} {decodedData.model}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
