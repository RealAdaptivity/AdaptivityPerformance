import React, { useState } from 'react';
import { useBookingContext } from '../context/BookingContext';
import { Wrench, Navigation, CheckCircle2, Phone, MapPin, Truck, Clock, ShieldCheck, Wallet, Zap, Building2 } from 'lucide-react';

interface TechMobileAppProps {
  onReturnToCustomerSite: () => void;
}

export const TechMobileApp: React.FC<TechMobileAppProps> = ({ onReturnToCustomerSite }) => {
  const { bookings, activeTech, claimBooking, updateBookingStatus } = useBookingContext();
  const [activeTab, setActiveTab] = useState<'available' | 'my_jobs' | 'payout_wallet'>('my_jobs');
  const [isCashoutProcessing, setIsCashoutProcessing] = useState(false);
  const [cashoutSuccess, setCashoutSuccess] = useState(false);

  const unassignedBookings = bookings.filter(b => b.status === 'UNASSIGNED');
  const myClaimedBookings = bookings.filter(b => b.claimedBy?.id === activeTech.id && b.status !== 'COMPLETED');
  const completedBookings = bookings.filter(b => b.claimedBy?.id === activeTech.id && b.status === 'COMPLETED');

  const rawGrossEarnings = completedBookings.reduce((sum, b) => sum + b.totalEstimate, 0) + 
    myClaimedBookings.reduce((sum, b) => sum + (b.status === 'ON_SITE' ? b.totalEstimate : 0), 0);
  
  // 70% Mechanic Share
  const techNetEarnings = Math.round(rawGrossEarnings * 0.70);

  const handleSimulateDrive = (bookingId: string, currentMiles: number, currentEta: number) => {
    const newMiles = Math.max(0.2, Math.round((currentMiles - 1.2) * 10) / 10);
    const newEta = Math.max(1, Math.round(currentEta - 3));
    updateBookingStatus(bookingId, 'EN_ROUTE', newMiles, newEta);
  };

  const handleTriggerInstantCashout = () => {
    setIsCashoutProcessing(true);
    setTimeout(() => {
      setIsCashoutProcessing(false);
      setCashoutSuccess(true);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 font-sans pb-24">
      
      {/* Top Mobile App Header */}
      <header className="sticky top-0 z-40 bg-[#12141c]/95 backdrop-blur-md border-b border-orange-500/30 p-4">
        <div className="container mx-auto max-w-md flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-600 p-0.5 shadow-lg shadow-orange-500/20">
              <div className="w-full h-full bg-[#0b0c10] rounded-[10px] flex items-center justify-center text-orange-400 font-bold">
                <Truck className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h1 className="font-heading font-extrabold text-base text-white">Technician Portal</h1>
                <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-emerald-500/30">ONLINE</span>
              </div>
              <p className="text-[11px] text-slate-400">{activeTech.name} • {activeTech.vanNumber}</p>
            </div>
          </div>

          <button
            onClick={onReturnToCustomerSite}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl border border-white/10 font-semibold"
          >
            Switch to Customer View
          </button>
        </div>
      </header>

      <div className="container mx-auto max-w-md p-4 space-y-5">
        
        {/* Quick Stats Cards */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-[#12141c] p-3 rounded-2xl border border-white/10">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Available</div>
            <div className="font-heading text-xl font-extrabold text-orange-400">{unassignedBookings.length} Jobs</div>
          </div>
          <div className="bg-[#12141c] p-3 rounded-2xl border border-white/10">
            <div className="text-[10px] text-slate-400 uppercase font-bold">In Progress</div>
            <div className="font-heading text-xl font-extrabold text-amber-400">{myClaimedBookings.length} Active</div>
          </div>
          <div className="bg-[#12141c] p-3 rounded-2xl border border-white/10">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Est. Earnings</div>
            <div className="font-heading text-xl font-extrabold text-emerald-400">${techNetEarnings}</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 bg-[#12141c] p-1 rounded-2xl border border-white/10 text-[11px] font-bold">
          <button
            onClick={() => setActiveTab('my_jobs')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center space-x-1 ${
              activeTab === 'my_jobs'
                ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Active ({myClaimedBookings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('available')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center space-x-1 ${
              activeTab === 'available'
                ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Jobs ({unassignedBookings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('payout_wallet')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center space-x-1 ${
              activeTab === 'payout_wallet'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-300" />
            <span>Payouts</span>
          </button>
        </div>

        {/* Tab 1: Available Unassigned Jobs Feed */}
        {activeTab === 'available' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
              <span>Unassigned Mobile Repair Requests</span>
              <span className="text-orange-400">Justin / Northlake</span>
            </div>

            {unassignedBookings.length === 0 ? (
              <div className="p-8 text-center bg-[#12141c] rounded-2xl border border-white/5 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-white text-sm">All Current Jobs Claimed!</h4>
                <p className="text-xs text-slate-400">You are up to date. Check back shortly for new incoming customer bookings.</p>
              </div>
            ) : (
              unassignedBookings.map(job => (
                <div key={job.id} className="bg-[#12141c] p-5 rounded-2xl border border-white/10 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-xs text-orange-400">{job.id}</span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-extrabold">NEW REQUEST</span>
                      </div>
                      <h3 className="font-bold text-sm text-white mt-0.5">{job.vehicle}</h3>
                    </div>
                    <div className="text-right">
                      <div className="font-heading text-lg font-extrabold text-emerald-400">${job.totalEstimate}</div>
                      <div className="text-[10px] text-slate-400">Total Ticket</div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-start space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
                      <span className="font-medium text-white">{job.customerAddress}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Submitted: {job.dateCreated} • {job.distanceMiles} Miles away</span>
                    </div>
                  </div>

                  <div className="bg-[#0b0c10] p-3 rounded-xl border border-white/5 space-y-1 text-xs">
                    <div className="font-bold text-slate-400 text-[10px] uppercase">Services Required:</div>
                    {job.services.map((svc, idx) => (
                      <div key={idx} className="flex items-center space-x-1.5 text-white">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                        <span>{svc}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      claimBooking(job.id);
                      setActiveTab('my_jobs');
                    }}
                    className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-orange-500/25 flex items-center justify-center space-x-2"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Grab & Claim Job ({job.id})</span>
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: My Claimed Jobs & Live Control HUD */}
        {activeTab === 'my_jobs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
              <span>Active Assigned Jobs ({activeTech.name})</span>
            </div>

            {myClaimedBookings.length === 0 ? (
              <div className="p-8 text-center bg-[#12141c] rounded-2xl border border-white/5 space-y-3">
                <Wrench className="w-8 h-8 text-slate-500 mx-auto" />
                <h4 className="font-bold text-white text-sm">No Active Jobs Claimed</h4>
                <p className="text-xs text-slate-400">Switch to the "Job Feed" tab above to grab pending repair requests in Justin or Northlake.</p>
                <button
                  onClick={() => setActiveTab('available')}
                  className="px-4 py-2 bg-orange-500 text-white font-bold text-xs rounded-xl"
                >
                  Browse Available Jobs
                </button>
              </div>
            ) : (
              myClaimedBookings.map(job => (
                <div key={job.id} className="bg-gradient-to-b from-[#161924] to-[#12141c] p-5 rounded-2xl border border-orange-500/40 space-y-5 shadow-2xl">
                  
                  {/* Status Bar */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-sm text-orange-400">{job.id}</span>
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded border ${
                        job.status === 'EN_ROUTE' ? 'bg-orange-500/20 text-orange-400 border-orange-500/40 animate-pulse' :
                        job.status === 'ON_SITE' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                        'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      }`}>
                        STATUS: {job.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="text-xs font-mono font-bold text-amber-300">
                      {job.status === 'EN_ROUTE' && `ETA: ~${job.etaMinutes} Mins (${job.distanceMiles} mi)`}
                      {job.status === 'ON_SITE' && 'ON SITE / SERVICING'}
                    </div>
                  </div>

                  {/* Customer & Vehicle Info */}
                  <div className="space-y-2">
                    <h3 className="font-heading text-base font-bold text-white">{job.vehicle}</h3>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-semibold">{job.customerName}</span>
                      <a href={`tel:${job.customerPhone.replace(/[^0-9]/g, '')}`} className="text-orange-400 font-bold flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" /> {job.customerPhone}
                      </a>
                    </div>
                    <div className="text-xs text-slate-400 flex items-start space-x-1.5 pt-1">
                      <MapPin className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
                      <span>{job.customerAddress}</span>
                    </div>
                  </div>

                  {/* Live Dispatch Controls HUD */}
                  <div className="bg-[#0b0c10] p-4 rounded-xl border border-white/10 space-y-3">
                    <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                      <span>Technician Live Dispatch Controls</span>
                      <span className="text-emerald-400 font-normal">Customer Sees Updates Live</span>
                    </div>

                    {job.status === 'EN_ROUTE' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs bg-slate-900 p-2.5 rounded-lg">
                          <span className="text-slate-300">Driving Progress:</span>
                          <span className="font-bold text-orange-400">{job.distanceMiles} Miles Away (~{job.etaMinutes} mins)</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleSimulateDrive(job.id, job.distanceMiles, job.etaMinutes)}
                            className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-lg flex items-center justify-center space-x-1 border border-white/5"
                          >
                            <Navigation className="w-3.5 h-3.5 text-orange-400" />
                            <span>Simulate Drive (-1.2 mi)</span>
                          </button>

                          <button
                            onClick={() => updateBookingStatus(job.id, 'ON_SITE', 0, 0)}
                            className="py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow flex items-center justify-center space-x-1"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            <span>Mark Arrived On Site</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {job.status === 'ON_SITE' && (
                      <div className="space-y-3">
                        <div className="p-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold text-center">
                          Technician Performing Service On Site • Total Job: ${job.totalEstimate}
                        </div>

                        {/* On-Site Custom Price Generator / Diagnostic Adjustment */}
                        <div className="bg-slate-900 p-3.5 rounded-xl border border-orange-500/30 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-extrabold text-orange-400 tracking-wider">🛠️ On-Site Custom Quote Adjuster</span>
                            <span className="text-[10px] text-slate-400 font-mono">ASE Rate: $125/hr</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <label className="block text-[10px] text-slate-400 font-semibold mb-1">Diagnostic / Labor ($)</label>
                              <input
                                type="number"
                                defaultValue={Math.round(job.totalEstimate * 0.65)}
                                onChange={e => {
                                  const newLabor = parseFloat(e.target.value) || 0;
                                  const parts = Math.round(job.totalEstimate * 0.35);
                                  const newTotal = newLabor + parts;
                                  job.totalEstimate = newTotal;
                                }}
                                className="w-full bg-[#0b0c10] border border-white/15 rounded-lg px-2.5 py-1.5 font-mono text-white text-xs focus:border-orange-500 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 font-semibold mb-1">OEM Parts Cost ($)</label>
                              <input
                                type="number"
                                defaultValue={Math.round(job.totalEstimate * 0.35)}
                                onChange={e => {
                                  const newParts = parseFloat(e.target.value) || 0;
                                  const labor = Math.round(job.totalEstimate * 0.65);
                                  const newTotal = labor + newParts;
                                  job.totalEstimate = newTotal;
                                }}
                                className="w-full bg-[#0b0c10] border border-white/15 rounded-lg px-2.5 py-1.5 font-mono text-white text-xs focus:border-orange-500 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-xs pt-1 border-t border-white/10">
                            <span className="text-slate-300 font-bold">Updated Customer Total:</span>
                            <span className="font-extrabold text-orange-400 font-mono text-sm">${job.totalEstimate}.00</span>
                          </div>
                        </div>

                        {/* 70% Payout Breakdown Badge */}
                        <div className="bg-slate-900 p-3 rounded-xl border border-white/10 text-xs space-y-1">
                          <div className="flex justify-between font-bold text-white">
                            <span>Your 70% Labor Share:</span>
                            <span className="text-emerald-400 font-mono">${Math.round(job.totalEstimate * 0.70)}.00</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Auto-transferred directly to your bank account via Stripe Express immediately upon customer platform checkout.
                          </div>
                        </div>

                        <button
                          onClick={() => updateBookingStatus(job.id, 'COMPLETED')}
                          className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center space-x-2"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>Complete Job & Request Platform Checkout (${job.totalEstimate})</span>
                        </button>

                        <div className="p-2.5 bg-rose-950/40 border border-rose-500/30 rounded-xl text-[10px] text-rose-300">
                          <strong>⚠️ Anti-Side-Payment Compliance Notice:</strong> Receiving personal Zelle, Cash, or Venmo payments directly from customers is strictly prohibited and results in immediate account suspension.
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-xs pt-1 text-slate-400 border-t border-white/5">
                    <span>Total Ticket Payout:</span>
                    <span className="font-bold text-emerald-400 text-sm">${job.totalEstimate}</span>
                  </div>

                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Payout Wallet & Instant Bank Transfer */}
        {activeTab === 'payout_wallet' && (
          <div className="space-y-4">
            
            {/* Balance Card */}
            <div className="bg-gradient-to-br from-slate-900 via-[#12141c] to-[#161d2a] p-5 rounded-3xl border border-emerald-500/40 shadow-2xl space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-extrabold tracking-widest text-emerald-400">Available 70% Share Balance</span>
                  <div className="font-heading text-3xl font-black text-white font-mono mt-0.5">
                    ${cashoutSuccess ? '0.00' : '318.00'}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Wallet className="w-6 h-6" />
                </div>
              </div>

              {/* Bank Account Connection Info */}
              <div className="bg-slate-950/80 p-3 rounded-2xl border border-white/10 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <div>
                    <div className="font-bold text-white text-[11px]">Chase Bank •••• 9102</div>
                    <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-emerald-400" /> Stripe Express Instant Payout Linked
                    </div>
                  </div>
                </div>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold uppercase">VERIFIED</span>
              </div>

              {/* Instant Cashout Button */}
              {cashoutSuccess ? (
                <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-center space-y-1 text-xs">
                  <div className="font-bold text-emerald-300 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> $318.00 Transferred to Chase Debit!
                  </div>
                  <p className="text-[10px] text-slate-300">Funds available in your bank account immediately.</p>
                </div>
              ) : (
                <button
                  onClick={handleTriggerInstantCashout}
                  disabled={isCashoutProcessing}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                >
                  {isCashoutProcessing ? (
                    <span>Processing Stripe Direct Deposit...</span>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Instant Cash Out ($318.00) to Bank →</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Payout Breakdown Rules Notice */}
            <div className="bg-[#12141c] p-4 rounded-2xl border border-white/10 text-xs space-y-2">
              <h4 className="font-bold text-white flex items-center gap-1 text-xs">
                <ShieldCheck className="w-4 h-4 text-orange-400" /> How Adaptivity 70/30 Mobile Payouts Work:
              </h4>
              <ul className="space-y-1.5 text-slate-300 text-[11px] list-disc list-inside leading-relaxed">
                <li>Mechanics keep <strong>70% of total labor billed</strong> on all mobile dispatch repairs.</li>
                <li>100% of customer tips are passed directly to technician payout with zero fees.</li>
                <li>Customer payment is held securely in <strong>Adaptivity Escrow</strong> until customer signs digital completion.</li>
                <li>Upon customer sign-off, 70% share is transferred to your bank within 30 seconds via Stripe Express.</li>
              </ul>
            </div>

            {/* Completed Jobs Ledger */}
            <div className="space-y-2">
              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Completed Jobs Ledger</div>

              <div className="bg-[#12141c] p-4 rounded-2xl border border-white/10 space-y-3 text-xs">
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <div>
                    <div className="font-bold text-white">Front Brake Pads & Rotor Resurface</div>
                    <div className="text-[10px] text-slate-400">Order #AP-8492 • Customer: Mark Stevens</div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="font-extrabold text-emerald-400 text-sm">$280.00 Total</div>
                    <div className="text-[10px] text-amber-400">Tech Share: $196 (70%)</div>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold text-white">Full Synthetic Oil & Filter Service</div>
                    <div className="text-[10px] text-slate-400">Order #AP-7210 • Customer: Sarah Jenkins</div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="font-extrabold text-emerald-400 text-sm">$95.00 Total</div>
                    <div className="text-[10px] text-amber-400">Tech Share: $66.50 (70%)</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
