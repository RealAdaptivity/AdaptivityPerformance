import React, { useState } from 'react';
import { useBookingContext } from '../context/BookingContext';
import { 
  Wrench, CheckCircle2, Phone, MapPin, Truck, ShieldCheck, 
  Wallet, Zap, Building2, Lock, LogOut, FileText, Settings, 
  UserCheck, AlertTriangle, Download
} from 'lucide-react';

export const StandaloneTechApp: React.FC = () => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true); // Pre-authenticated for demo
  const [techEmail, setTechEmail] = useState('alex.vance@adaptivityperformance.com');
  const [techPassword, setTechPassword] = useState('••••••••••••');
  const [loginError, setLoginError] = useState('');

  // App Navigation Tabs: 'jobs' | 'earnings' | 'settings'
  const [activeTab, setActiveTab] = useState<'jobs' | 'earnings' | 'settings'>('jobs');
  const [jobFilter, setJobFilter] = useState<'available' | 'active'>('active');

  // Context for live dispatches
  const { bookings, updateBookingStatus } = useBookingContext();

  // Mock Available Unassigned Jobs in Justin/Northlake/DFW
  const [availableJobs, setAvailableJobs] = useState([
    {
      id: 'AP-9102',
      customerName: 'Sarah Jenkins',
      customerPhone: '(214) 555-0199',
      customerAddress: '482 Pecan Square Blvd, Northlake, TX 76226',
      vehicle: '2022 BMW X5 (3.0L Turbo)',
      services: ['Front Ceramic Brake Pads & OEM Sensor Replacement', 'Synthetic Oil Service'],
      distanceMiles: 4.8,
      totalEstimate: 415,
      techPayout: 291, // 70%
      urgent: true,
    },
    {
      id: 'AP-9108',
      customerName: 'Marcus Vance',
      customerPhone: '(940) 555-8420',
      customerAddress: '812 FM 156 S, Justin, TX 76247',
      vehicle: '2020 RAM 2500 Heavy Duty Diesel',
      services: ['Serpentine Belt & Tensioner Replacement', 'Multi-Point Inspection'],
      distanceMiles: 3.2,
      totalEstimate: 360,
      techPayout: 252, // 70%
      urgent: false,
    }
  ]);

  // Active Job (Alex Vance)
  const activeJob = bookings.find(b => b.status === 'EN_ROUTE' || b.status === 'ON_SITE');

  // Bank & Tax Settings State
  const [bankName, setBankName] = useState('Chase Bank (Checking •••• 9102)');
  const stripeExpressId = 'acct_1M00000000000000';
  const taxYear = '2025';

  // Handle Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!techEmail || !techPassword) {
      setLoginError('Please enter approved technician credentials.');
      return;
    }
    setLoginError('');
    setIsAuthenticated(true);
  };

  // Handle Claiming a Job
  const handleClaimJob = (jobId: string) => {
    const claimed = availableJobs.find(j => j.id === jobId);
    if (claimed) {
      setAvailableJobs(prev => prev.filter(j => j.id !== jobId));
      setJobFilter('active');
    }
  };

  // ----------------------------------------------------
  // SCREEN 1: APPROVED TECHNICIAN LOGIN SCREEN
  // ----------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans">
        {/* Top Header Logo */}
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 p-0.5 shadow-lg shadow-orange-500/20">
              <div className="w-full h-full bg-[#0b0c10] rounded-[10px] flex items-center justify-center">
                <Wrench className="w-5 h-5 text-orange-500" />
              </div>
            </div>
            <div>
              <div className="font-heading font-extrabold text-lg tracking-tight text-white">
                ADAPTIVITY <span className="text-orange-500">TECH</span>
              </div>
              <p className="text-[10px] tracking-widest text-slate-400 uppercase font-semibold">Technician Mobile Dispatch System</p>
            </div>
          </div>

          {/* Standalone Native App Branding */}
        </div>

        {/* Login Form Card */}
        <div className="max-w-md w-full mx-auto my-auto space-y-6 bg-[#12141c] border border-white/10 p-6 sm:p-8 rounded-3xl shadow-2xl">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="font-heading text-xl font-extrabold text-white">Technician Portal Login</h2>
            <p className="text-xs text-slate-400">Enter your approved ASE Technician credentials to access dispatch jobs & Stripe payouts.</p>
          </div>

          {loginError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Approved Tech Email</label>
              <input
                type="email"
                required
                value={techEmail}
                onChange={e => setTechEmail(e.target.value)}
                className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-mono focus:border-orange-500 focus:outline-none"
                placeholder="tech@adaptivityperformance.com"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Password / PIN</label>
              <input
                type="password"
                required
                value={techPassword}
                onChange={e => setTechPassword(e.target.value)}
                className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-mono focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-orange-500/25 flex items-center justify-center space-x-2 transition-all"
              >
                <UserCheck className="w-4 h-4" />
                <span>Sign In to Mobile Dispatch</span>
              </button>
            </div>

            <div className="p-3 bg-slate-900 rounded-xl border border-white/5 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center justify-between font-semibold text-slate-300">
                <span>Account Requirements:</span>
                <span className="text-emerald-400">ASE Verified</span>
              </div>
              <p>Mobile dispatch accounts require completed background checks, tool verification, and linked Stripe Express payout setup.</p>
            </div>
          </form>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-500 py-4 border-t border-white/5">
          🔒 Encrypted 256-Bit SSL • Adaptivity Performance Technician Dispatch Platform v2.4
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SCREEN 2: STANDALONE TECHNICIAN DASHBOARD (LOGGED IN)
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 font-sans flex flex-col pb-20">
      
      {/* APP HEADER BAR */}
      <header className="bg-[#12141c] border-b border-white/10 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 p-0.5 shadow-md shadow-orange-500/20">
              <div className="w-full h-full bg-[#0b0c10] rounded-[9px] flex items-center justify-center">
                <Wrench className="w-4 h-4 text-orange-500" />
              </div>
            </div>
            <div>
              <div className="font-heading font-extrabold text-base tracking-tight text-white flex items-center gap-2">
                <span>ADAPTIVITY TECH</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md font-bold uppercase">
                  ONLINE
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">Alex Vance • Rig #4 (Justin Hub)</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsAuthenticated(false)}
              className="p-1.5 bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 rounded-lg border border-white/10 transition-colors flex items-center space-x-1 text-xs"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* STANDALONE APP TOP NAVIGATION TABS */}
        <div className="container mx-auto px-4 grid grid-cols-3 gap-1 pt-1 pb-2">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center space-x-2 transition-all ${
              activeTab === 'jobs'
                ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/20'
                : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Jobs</span>
          </button>

          <button
            onClick={() => setActiveTab('earnings')}
            className={`py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center space-x-2 transition-all ${
              activeTab === 'earnings'
                ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/20'
                : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Earnings</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center space-x-2 transition-all ${
              activeTab === 'settings'
                ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/20'
                : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      </header>

      {/* MAIN BODY AREA BASED ON ACTIVE TAB */}
      <main className="container mx-auto px-4 py-5 space-y-5 flex-1 max-w-3xl">
        
        {/* ======================================================== */}
        {/* TAB 1: JOBS DISPATCH FEED & ACTIVE JOB CONTROLS          */}
        {/* ======================================================== */}
        {activeTab === 'jobs' && (
          <div className="space-y-4">
            
            {/* Job Sub-Filter Toggle */}
            <div className="bg-[#12141c] p-1 rounded-2xl border border-white/10 grid grid-cols-2 gap-1 text-xs font-bold">
              <button
                onClick={() => setJobFilter('active')}
                className={`py-2 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
                  jobFilter === 'active'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>My Active Job (1)</span>
              </button>

              <button
                onClick={() => setJobFilter('available')}
                className={`py-2 rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
                  jobFilter === 'available'
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Available Feed ({availableJobs.length})</span>
              </button>
            </div>

            {/* ACTIVE JOB VIEW */}
            {jobFilter === 'active' && (
              <div className="space-y-4">
                {activeJob ? (
                  <div className="bg-[#12141c] border border-orange-500/30 rounded-3xl p-5 shadow-2xl space-y-4">
                    <div className="flex justify-between items-start border-b border-white/10 pb-3">
                      <div>
                        <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-bold uppercase">
                          STATUS: {activeJob.status}
                        </span>
                        <h3 className="font-heading font-extrabold text-lg text-white mt-1">{activeJob.vehicle}</h3>
                      </div>
                      <span className="font-mono text-xs font-extrabold text-orange-400 bg-orange-950/40 px-2.5 py-1 rounded-lg border border-orange-500/30">
                        #{activeJob.id}
                      </span>
                    </div>

                    {/* Customer Info Card */}
                    <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-white/10 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300 font-bold">{activeJob.customerName}</span>
                        <a href={`tel:${activeJob.customerPhone.replace(/[^0-9]/g, '')}`} className="text-orange-400 font-bold flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" /> {activeJob.customerPhone}
                        </a>
                      </div>
                      <div className="text-slate-400 flex items-start space-x-1.5 pt-1 text-[11px]">
                        <MapPin className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
                        <span>{activeJob.customerAddress}</span>
                      </div>
                    </div>

                    {/* On-Site Custom Quote Adjuster */}
                    {activeJob.status === 'ON_SITE' && (
                      <div className="bg-slate-900 p-4 rounded-2xl border border-orange-500/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-extrabold text-orange-400 tracking-wider">🛠️ On-Site Custom Quote Adjuster</span>
                          <span className="text-[10px] text-slate-400 font-mono">ASE Rate: $125/hr</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block text-[10px] text-slate-400 font-semibold mb-1">Diagnostic / Labor ($)</label>
                            <input
                              type="number"
                              defaultValue={Math.round(activeJob.totalEstimate * 0.65)}
                              onChange={e => {
                                const newLabor = parseFloat(e.target.value) || 0;
                                const parts = Math.round(activeJob.totalEstimate * 0.35);
                                activeJob.totalEstimate = newLabor + parts;
                              }}
                              className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2 font-mono text-white text-xs focus:border-orange-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 font-semibold mb-1">OEM Parts Cost ($)</label>
                            <input
                              type="number"
                              defaultValue={Math.round(activeJob.totalEstimate * 0.35)}
                              onChange={e => {
                                const newParts = parseFloat(e.target.value) || 0;
                                const labor = Math.round(activeJob.totalEstimate * 0.65);
                                activeJob.totalEstimate = labor + newParts;
                              }}
                              className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2 font-mono text-white text-xs focus:border-orange-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-xs pt-2 border-t border-white/10 font-bold">
                          <span className="text-slate-300">Updated Customer Total:</span>
                          <span className="text-orange-400 font-mono text-base">${activeJob.totalEstimate}.00</span>
                        </div>
                      </div>
                    )}

                    {/* 70% Payout Card */}
                    <div className="bg-slate-900 p-3.5 rounded-2xl border border-white/10 text-xs space-y-1">
                      <div className="flex justify-between font-bold text-white">
                        <span>Your 70% Labor Share:</span>
                        <span className="text-emerald-400 font-mono text-sm">${Math.round(activeJob.totalEstimate * 0.70)}.00</span>
                      </div>
                      <p className="text-[10px] text-slate-400">Transferred automatically via Stripe Express upon customer sign-off.</p>
                    </div>

                    {/* Action Buttons */}
                    {activeJob.status === 'EN_ROUTE' && (
                      <button
                        onClick={() => updateBookingStatus(activeJob.id, 'ON_SITE', 0, 0)}
                        className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-2xl shadow-lg flex items-center justify-center space-x-2"
                      >
                        <MapPin className="w-4 h-4" />
                        <span>Mark Arrived On Site</span>
                      </button>
                    )}

                    {activeJob.status === 'ON_SITE' && (
                      <button
                        onClick={() => updateBookingStatus(activeJob.id, 'COMPLETED')}
                        className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs rounded-2xl shadow-lg flex items-center justify-center space-x-2"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Complete Job & Request Customer Escrow Checkout (${activeJob.totalEstimate})</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="bg-[#12141c] border border-white/10 rounded-3xl p-8 text-center space-y-3">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                    <h3 className="font-heading font-extrabold text-white text-base">No Active Job Currently In Progress</h3>
                    <p className="text-xs text-slate-400">Check the Available Feed tab to claim new mobile repair dispatches in Justin & Northlake.</p>
                    <button
                      onClick={() => setJobFilter('available')}
                      className="px-5 py-2.5 bg-orange-500 text-white font-bold text-xs rounded-xl"
                    >
                      View Available Feed ({availableJobs.length})
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* AVAILABLE DISPATCH FEED VIEW */}
            {jobFilter === 'available' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Dispatches near Justin / Northlake radius:</span>
                  <span className="font-bold text-orange-400 font-mono">{availableJobs.length} Jobs Ready</span>
                </div>

                {availableJobs.map(job => (
                  <div key={job.id} className="bg-[#12141c] border border-white/10 hover:border-orange-500/40 rounded-3xl p-5 space-y-4 transition-all shadow-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        {job.urgent && (
                          <span className="text-[9px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded font-extrabold uppercase mr-2">
                            🚨 High Priority Dispatch
                          </span>
                        )}
                        <h3 className="font-heading font-extrabold text-base text-white mt-1">{job.vehicle}</h3>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-400 bg-slate-900 px-2 py-1 rounded-lg">
                        #{job.id}
                      </span>
                    </div>

                    {/* Service & Customer Summary */}
                    <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-white/5 text-xs space-y-2">
                      <div className="flex justify-between text-slate-300">
                        <span className="font-bold">{job.customerName}</span>
                        <span className="text-orange-400 font-mono">{job.distanceMiles} Miles Away</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                        <span>{job.customerAddress}</span>
                      </div>
                      <div className="pt-1 text-[11px] text-slate-300">
                        <strong>Requested Repairs:</strong>
                        <ul className="list-disc list-inside text-slate-400 pt-0.5">
                          {job.services.map((s, idx) => (
                            <li key={idx}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Financial Payout Card */}
                    <div className="bg-gradient-to-r from-slate-900 to-slate-950 p-3.5 rounded-2xl border border-emerald-500/30 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Customer Total: ${job.totalEstimate}</span>
                        <span className="text-xs text-slate-300 font-bold">Your 70% Payout:</span>
                      </div>
                      <span className="text-xl font-extrabold text-emerald-400 font-mono">${job.techPayout}.00</span>
                    </div>

                    <button
                      onClick={() => handleClaimJob(job.id)}
                      className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-extrabold text-xs rounded-2xl shadow-lg flex items-center justify-center space-x-2"
                    >
                      <Zap className="w-4 h-4" />
                      <span>Accept & Dispatch To Job (${job.techPayout} Payout)</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: EARNINGS & STRIPE EXPRESS PAYOUT WALLET           */}
        {/* ======================================================== */}
        {activeTab === 'earnings' && (
          <div className="space-y-5">
            {/* Big Earnings Balance Card */}
            <div className="bg-gradient-to-br from-[#161a26] to-[#0d0e14] border border-emerald-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-extrabold text-emerald-400 tracking-wider">AVAILABLE 70% SHARE BALANCE</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                  Stripe Express Connected
                </span>
              </div>

              <div className="text-4xl font-black text-white font-mono">$318.00</div>

              {/* Linked Bank Card */}
              <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-white/10 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  <Building2 className="w-5 h-5 text-orange-400" />
                  <div>
                    <span className="font-bold text-white block">{bankName}</span>
                    <span className="text-[10px] text-emerald-400">Direct Deposit Active • Stripe ID: {stripeExpressId.slice(0, 10)}...</span>
                  </div>
                </div>
              </div>

              <button className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs rounded-2xl shadow-lg flex items-center justify-center space-x-2">
                <Zap className="w-4 h-4" />
                <span>Instant Cash Out ($318.00) To Bank →</span>
              </button>
            </div>

            {/* Completed Jobs History Ledger */}
            <div className="bg-[#12141c] border border-white/10 rounded-3xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <h3 className="font-heading font-extrabold text-sm text-white">Completed Jobs Earnings Ledger</h3>
                <span className="text-xs text-slate-400">This Week: <strong className="text-emerald-400 font-mono">$640.00</strong></span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-slate-900 p-3.5 rounded-2xl border border-white/5 flex justify-between items-center">
                  <div>
                    <strong className="text-slate-200 block text-xs">Front Brake Pads & Rotor Resurface</strong>
                    <span className="text-[11px] text-slate-400">Order #AP-8492 • Customer: Mark Stevens</span>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-400 font-mono font-bold block text-sm">$196.00</span>
                    <span className="text-[10px] text-slate-500">70% Share ($280 total)</span>
                  </div>
                </div>

                <div className="bg-slate-900 p-3.5 rounded-2xl border border-white/5 flex justify-between items-center">
                  <div>
                    <strong className="text-slate-200 block text-xs">Full Synthetic Oil & Filter Service</strong>
                    <span className="text-[11px] text-slate-400">Order #AP-7210 • Customer: Sarah Jenkins</span>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-400 font-mono font-bold block text-sm">$66.50</span>
                    <span className="text-[10px] text-slate-500">70% Share ($95 total)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: SETTINGS, BANK LINK & 1099 TAX DOCUMENTATION       */}
        {/* ======================================================== */}
        {activeTab === 'settings' && (
          <div className="space-y-5">
            
            {/* Direct Deposit Settings Card */}
            <div className="bg-[#12141c] border border-white/10 rounded-3xl p-5 space-y-4">
              <div className="flex items-center space-x-3 border-b border-white/10 pb-3">
                <Building2 className="w-5 h-5 text-orange-400" />
                <div>
                  <h3 className="font-heading font-extrabold text-sm text-white">Direct Deposit & Payout Settings</h3>
                  <p className="text-[11px] text-slate-400">Manage your connected bank account for automated 70% labor payouts.</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Bank Name / Account Label</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Stripe Express Account ID</label>
                  <input
                    type="text"
                    readOnly
                    value={stripeExpressId}
                    className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-slate-400 font-mono cursor-not-allowed"
                  />
                </div>

                <button className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-white/10">
                  Update Stripe Express Direct Deposit Link →
                </button>
              </div>
            </div>

            {/* 1099 Tax Documentation & Annual Statements Card */}
            <div className="bg-[#12141c] border border-white/10 rounded-3xl p-5 space-y-4">
              <div className="flex items-center space-x-3 border-b border-white/10 pb-3">
                <FileText className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-heading font-extrabold text-sm text-white">1099-NEC Tax Documentation Vault</h3>
                  <p className="text-[11px] text-slate-400">Annual contractor tax forms and IRS 1099 income statements.</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center bg-slate-900 p-3.5 rounded-2xl border border-white/5">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-4 h-4 text-orange-400" />
                    <div>
                      <strong className="text-white block">Form 1099-NEC ({taxYear} Tax Year)</strong>
                      <span className="text-[10px] text-slate-400">IRS Non-Employee Compensation Report</span>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg font-bold text-[11px] flex items-center space-x-1">
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                </div>

                <div className="flex justify-between items-center bg-slate-900 p-3.5 rounded-2xl border border-white/5">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <div>
                      <strong className="text-white block">W-9 Taxpayer Verification</strong>
                      <span className="text-[10px] text-emerald-400">Status: Verified & Filed</span>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg font-bold text-[11px]">
                    View W-9
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Rig & Tool Audit Status */}
            <div className="bg-[#12141c] border border-white/10 rounded-3xl p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-bold text-white">Technician Rig Audit Status</span>
                <span className="text-emerald-400 font-bold bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px]">
                  ASE Master Verified
                </span>
              </div>
              <div className="text-slate-400 space-y-1 text-[11px]">
                <p>• Mobile Unit: 2023 Ford F-250 Super Duty (Rig #4)</p>
                <p>• 8-Point Tool Audit: OBD-II Diagnostic Scanner, Hydraulic Jacks, Torque Wrenches</p>
                <p>• Coverage Area: Justin, Northlake, Argyle, Haslet & DFW Radius</p>
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
};
