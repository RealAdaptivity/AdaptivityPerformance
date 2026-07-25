import React, { useState } from 'react';
import { useBookingContext } from '../context/BookingContext';
import { Truck, Phone, ShieldCheck, UserCheck, X, Search } from 'lucide-react';

interface RepairTrackerDemoProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCheckout?: () => void;
}

export const RepairTrackerDemo: React.FC<RepairTrackerDemoProps> = ({ isOpen, onClose, onOpenCheckout }) => {
  const { getBookingById, bookings } = useBookingContext();
  const [jobSearchInput, setJobSearchInput] = useState('AP-8492');
  const [searchedBookingId, setSearchedBookingId] = useState('AP-8492');

  if (!isOpen) return null;

  const currentBooking = getBookingById(searchedBookingId) || bookings[0];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchedBookingId(jobSearchInput.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#12141c] w-full max-w-2xl rounded-3xl border border-orange-500/40 shadow-2xl shadow-orange-500/10 overflow-hidden relative text-white">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-[#181a26] to-[#0e1017] p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
              <Truck className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-heading text-lg font-bold text-white">Live Customer Repair & Dispatch Tracker</h3>
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/30">LIVE SYNC</span>
              </div>
              <p className="text-xs text-slate-400">Job Reference: <span className="text-orange-400 font-mono font-bold">{currentBooking.id}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg bg-white/5 hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Job ID Lookup Box */}
          <form onSubmit={handleSearch} className="flex items-center space-x-2 bg-[#0b0c10] p-1.5 rounded-xl border border-white/10">
            <Search className="w-4 h-4 text-orange-400 ml-2 flex-shrink-0" />
            <input
              type="text"
              value={jobSearchInput}
              onChange={e => setJobSearchInput(e.target.value.toUpperCase())}
              placeholder="Enter Job ID (e.g. AP-8492)"
              className="w-full bg-transparent px-2 py-1.5 text-xs text-white font-mono uppercase focus:outline-none"
            />
            <button type="submit" className="px-4 py-1.5 bg-orange-500 text-white font-bold text-xs rounded-lg hover:bg-orange-600">
              Lookup
            </button>
          </form>

          {/* Mechanic Card */}
          <div className="bg-[#0b0c10] p-4 rounded-2xl border border-white/10 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 p-0.5 flex-shrink-0">
                <div className="w-full h-full bg-[#12141c] rounded-full flex items-center justify-center font-bold text-orange-400 text-sm">
                  {currentBooking.claimedBy ? currentBooking.claimedBy.name.split(' ').map(n => n[0]).join('') : 'UN'}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{currentBooking.claimedBy ? 'Assigned Lead Technician' : 'Awaiting Dispatch Claim'}</span>
                </div>
                <div className="font-bold text-sm text-white">
                  {currentBooking.claimedBy ? `${currentBooking.claimedBy.name} (${currentBooking.claimedBy.role})` : 'Unit Dispatched Shortly'}
                </div>
                <div className="text-[11px] text-slate-400">
                  {currentBooking.claimedBy ? currentBooking.claimedBy.vanNumber : 'Available Mobile Van Unit'}
                </div>
              </div>
            </div>

            {currentBooking.claimedBy && (
              <div className="flex items-center space-x-2">
                <a href={`tel:${currentBooking.claimedBy.phone.replace(/[^0-9]/g, '')}`} className="p-2.5 bg-slate-800 hover:bg-slate-700 text-orange-400 rounded-xl border border-white/10 text-xs font-semibold flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  <span className="hidden sm:inline">Call Tech</span>
                </a>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex justify-between">
              <span>Live Progress Timeline</span>
              <span className="text-orange-400 font-mono">{currentBooking.vehicle}</span>
            </div>

            <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-white/10">
              
              {/* Step 1: Complete */}
              <div className="flex items-start space-x-4 relative">
                <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 z-10 text-xs font-bold">
                  ✓
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-white">Appointment Confirmed</span>
                    <span className="text-[10px] text-slate-400">{currentBooking.dateCreated}</span>
                  </div>
                  <p className="text-xs text-slate-400">Services: {currentBooking.services.join(', ')} at {currentBooking.customerAddress}.</p>
                </div>
              </div>

              {/* Step 2: En Route Status */}
              <div className={`flex items-start space-x-4 relative ${currentBooking.status === 'UNASSIGNED' ? 'opacity-50' : ''}`}>
                <div className={`w-7 h-7 rounded-full text-white flex items-center justify-center flex-shrink-0 z-10 text-xs font-bold ${
                  currentBooking.status === 'EN_ROUTE' ? 'bg-orange-500 animate-pulse' : 
                  currentBooking.status === 'ON_SITE' || currentBooking.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-slate-800'
                }`}>
                  <Truck className="w-4 h-4" />
                </div>
                <div className={`p-3 rounded-xl border w-full ${
                  currentBooking.status === 'EN_ROUTE' ? 'bg-orange-500/10 border-orange-500/40 text-white' : 'bg-[#0b0c10] border-white/5 text-slate-300'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-orange-400 flex items-center gap-1.5">
                      <span>Mobile Unit En-Route</span>
                      {currentBooking.status === 'EN_ROUTE' && (
                        <span className="text-[10px] bg-orange-500 text-white px-2 py-0.2 rounded font-bold uppercase">LIVE</span>
                      )}
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-300">
                      {currentBooking.status === 'EN_ROUTE' ? `ETA: ~${currentBooking.etaMinutes} Mins (${currentBooking.distanceMiles} mi)` : 'Claimed'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {currentBooking.claimedBy ? `${currentBooking.claimedBy.name} is navigating toward ${currentBooking.customerAddress}.` : 'Waiting for technician to claim dispatch.'}
                  </p>
                </div>
              </div>

              {/* Step 3: On Site Servicing */}
              <div className={`flex items-start space-x-4 relative ${currentBooking.status === 'UNASSIGNED' || currentBooking.status === 'EN_ROUTE' ? 'opacity-50' : ''}`}>
                <div className={`w-7 h-7 rounded-full text-white flex items-center justify-center flex-shrink-0 z-10 text-xs font-bold ${
                  currentBooking.status === 'ON_SITE' ? 'bg-amber-500 animate-pulse' :
                  currentBooking.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-slate-800'
                }`}>
                  3
                </div>
                <div>
                  <div className="font-bold text-sm text-white">On-Site Servicing & Torque Verification</div>
                  <p className="text-xs text-slate-400">Includes 25-point brake inspection & live telemetry test.</p>
                </div>
              </div>

              {/* Step 4: Completion */}
              <div className={`flex items-start space-x-4 relative ${currentBooking.status !== 'COMPLETED' ? 'opacity-50' : ''}`}>
                <div className={`w-7 h-7 rounded-full text-white flex items-center justify-center flex-shrink-0 z-10 text-xs font-bold ${
                  currentBooking.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-slate-800'
                }`}>
                  4
                </div>
                <div>
                  <div className="font-bold text-sm text-white">Job Completion & Digital Receipt</div>
                  <p className="text-xs text-slate-400">12-Month / 12,000-mile warranty auto-activated.</p>
                </div>
              </div>

            </div>
          </div>

          <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between text-xs text-emerald-400 font-semibold gap-3">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Official In-Platform Checkout Protects 12-Month / 12k Warranty
            </span>
            {onOpenCheckout && (
              <button
                onClick={() => {
                  onClose();
                  onOpenCheckout();
                }}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs transition-colors flex-shrink-0"
              >
                Pay via Escrow →
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
