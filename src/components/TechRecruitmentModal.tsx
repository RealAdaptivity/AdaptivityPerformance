import React, { useState } from 'react';
import { X, Wrench, DollarSign, Truck, CheckCircle2, Send, Award, Compass, Loader2, Layers, User } from 'lucide-react';
import {
  TECH_INSURANCE_RECOMMENDATION,
  TECH_LIABILITY_ACK_LABEL,
  TECH_LIABILITY_SUMMARY,
  TECH_WORKERS_COMP_NOTICE,
} from '../content/contractorLiability';
import { submitTechApplication } from '../services/techApplications';

interface TechRecruitmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TechRecruitmentModal: React.FC<TechRecruitmentModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [zip, setZip] = useState('76247');
  const [yearsExp, setYearsExp] = useState('5-8 Years');
  const [aseCerts, setAseCerts] = useState<string[]>(['A4 Brakes', 'A6 Electrical']);
  const [trades, setTrades] = useState<string[]>(['Mechanical / ASE']);
  const [payPreference, setPayPreference] = useState<'hourly' | 'revshare'>('revshare');
  const [jobCapacity, setJobCapacity] = useState<'multi' | 'standalone'>('multi');
  const [hasVehicle, setHasVehicle] = useState(true);

  // Tool audit checklist items
  const [tools, setTools] = useState({
    obdScanner: true,
    impactTools: true,
    floorJack: true,
    multimeter: true,
    brakeBleeder: true,
    torqueWrench: true,
    oilCatch: true,
    handToolsSet: true,
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isOnboardingStripe = false;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [acceptedLiability, setAcceptedLiability] = useState(false);

  if (!isOpen) return null;

  const toggleTool = (key: keyof typeof tools) => {
    setTools(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAse = (cert: string) => {
    setAseCerts(prev =>
      prev.includes(cert) ? prev.filter(c => c !== cert) : [...prev, cert]
    );
  };

  const toggleTrade = (trade: string) => {
    setTrades((prev) => {
      if (prev.includes(trade)) {
        const next = prev.filter((t) => t !== trade);
        return next.length ? next : prev;
      }
      return [...prev, trade];
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!acceptedLiability) {
      setSubmitError('Please confirm the liability & insurance acknowledgment before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitTechApplication({
        fullName: name,
        email,
        phone,
        zipCode: zip,
        yearsExperience: yearsExp,
        trades,
        aseCerts,
        tools,
        hasVehicle,
        payPreference: 'revshare',
        jobCapacity,
        liabilityAccepted: true,
      });
      setIsSubmitted(true);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Could not submit application. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkedToolCount = Object.values(tools).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="bg-[#12141c] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#1a1d28] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-heading font-extrabold text-lg text-white">Join Adaptivity as a Mobile Tech</h2>
                <span className="text-[11px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
                  70% Revenue Split to Techs + 100% Tips
                </span>
              </div>
              <p className="text-xs text-slate-400">Justin, Northlake, Argyle & Denton County Mobile Dispatch Network</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Benefits Strip */}
        <div className="bg-gradient-to-r from-amber-950/40 via-orange-950/40 to-slate-900 border-b border-white/5 px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-300">
          <div className="flex items-center space-x-2">
            <Wrench className="w-4 h-4 text-orange-400 flex-shrink-0" />
            <span>Must Own Tools</span>
          </div>
          <div className="flex items-center space-x-2">
            <Truck className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>Own Rig/Truck</span>
          </div>
          <div className="flex items-center space-x-2">
            <DollarSign className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>70% Labor Payout</span>
          </div>
          <div className="flex items-center space-x-2">
            <Compass className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span>Set Own Territory</span>
          </div>
        </div>

        {/* Form Body */}
        <div className="flex-grow overflow-y-auto p-6">
          {isSubmitted ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-emerald-400 animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-heading font-black text-white">Technician Application Received!</h3>
              <p className="text-sm text-slate-300 max-w-md mx-auto">
                Thanks, <strong>{name}</strong>. Your application is in our admin inbox. We’ll contact you at{' '}
                <strong>{phone}</strong> within 24 hours. After approval, create your Tech account at{' '}
                <strong className="text-white">/portal</strong> with <strong>{email}</strong>, then finish Stripe
                Express + W-9 in Settings.
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Preferred work style:{' '}
                <strong className="text-white">
                  {jobCapacity === 'multi' ? 'Multi-job (take several jobs)' : 'Standalone (one job at a time)'}
                </strong>
                . You can change this anytime in Tech Portal → Settings after you’re approved.
              </p>
              <div className="pt-4">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs"
                >
                  Return to Main Site
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleFormSubmit} className="space-y-6">
              {/* Form Step Indicators */}
              <div className="flex items-center justify-between text-xs border-b border-white/10 pb-4">
                <div className="flex items-center space-x-4 font-semibold">
                  <span className={`px-2.5 py-1 rounded-lg ${step === 1 ? 'bg-orange-500 text-white' : 'bg-white/5 text-slate-400'}`}>
                    1. Contact Info
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg ${step === 2 ? 'bg-orange-500 text-white' : 'bg-white/5 text-slate-400'}`}>
                    2. Tool Inventory Audit
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg ${step === 3 ? 'bg-orange-500 text-white' : 'bg-white/5 text-slate-400'}`}>
                    3. Rig & Pay Setup
                  </span>
                </div>
                <span className="text-slate-400 font-mono">Step {step} of 3</span>
              </div>

              {/* STEP 1: Personal Info */}
              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="font-heading font-extrabold text-base text-white">Applicant Contact & Experience</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Jason Myers"
                        className="w-full bg-slate-900/80 border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Mobile Phone (For Dispatch Texts)</label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="(940) 555-0192"
                        className="w-full bg-slate-900/80 border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="mechanic@gmail.com"
                        className="w-full bg-slate-900/80 border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Home / Service Base Zip Code</label>
                      <input
                        type="text"
                        required
                        value={zip}
                        onChange={e => setZip(e.target.value)}
                        placeholder="76247"
                        className="w-full bg-slate-900/80 border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Years of Experience</label>
                      <select
                        value={yearsExp}
                        onChange={e => setYearsExp(e.target.value)}
                        className="w-full bg-slate-900/80 border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-orange-500"
                      >
                        <option value="2-4 Years">2-4 Years Professional Experience</option>
                        <option value="5-8 Years">5-8 Years Senior Technician</option>
                        <option value="9+ Years">9+ Years Master Technician</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1.5">
                        Trade specialties (select all that apply)
                      </label>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {[
                          'Mechanical / ASE',
                          'Tire & Wheel',
                          'Auto Glass',
                          'Body Work',
                          'Mobile Detailing',
                          'Modification / Accessories',
                          'Audio',
                          'Tint',
                          'Wrap / PPF',
                          'Performance',
                        ].map((trade) => {
                          const on = trades.includes(trade);
                          return (
                            <button
                              key={trade}
                              type="button"
                              onClick={() => toggleTrade(trade)}
                              className={`p-2.5 rounded-xl border text-left font-semibold transition-all ${
                                on
                                  ? 'bg-orange-500/20 border-orange-500 text-orange-300'
                                  : 'bg-white/5 border-white/10 text-slate-400'
                              }`}
                            >
                              {on ? '✓ ' : '+ '}
                              {trade}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Do You Own a Reliable Truck/Van for Dispatch?</label>
                      <div className="flex items-center space-x-4 pt-2">
                        <label className="flex items-center space-x-2 text-white font-medium cursor-pointer">
                          <input
                            type="radio"
                            checked={hasVehicle}
                            onChange={() => setHasVehicle(true)}
                            className="text-orange-500 focus:ring-0"
                          />
                          <span>Yes (Truck / Van / Utility Rig)</span>
                        </label>
                        <label className="flex items-center space-x-2 text-white font-medium cursor-pointer">
                          <input
                            type="radio"
                            checked={!hasVehicle}
                            onChange={() => setHasVehicle(false)}
                            className="text-orange-500 focus:ring-0"
                          />
                          <span>No</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      disabled={!name || !phone}
                      onClick={() => setStep(2)}
                      className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs disabled:opacity-50"
                    >
                      Next: Tool Audit ({checkedToolCount}/8 Ready) →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Tool Ownership Audit */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-heading font-extrabold text-base text-white flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-orange-500" />
                        Technician Tool Ownership Verification
                      </h3>
                      <p className="text-xs text-slate-400">Mobile mechanics must provide their own hand, power, & diagnostic tools.</p>
                    </div>

                    <span className="text-xs font-bold px-3 py-1 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30">
                      {checkedToolCount} of 8 Verified
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div 
                      onClick={() => toggleTool('obdScanner')}
                      className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                        tools.obdScanner ? 'bg-orange-950/20 border-orange-500 text-white' : 'bg-white/[0.02] border-white/10 text-slate-400'
                      }`}
                    >
                      <span>Bi-Directional OBD-II Scanner</span>
                      <CheckCircle2 className={`w-4 h-4 ${tools.obdScanner ? 'text-orange-400' : 'text-slate-600'}`} />
                    </div>

                    <div 
                      onClick={() => toggleTool('impactTools')}
                      className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                        tools.impactTools ? 'bg-orange-950/20 border-orange-500 text-white' : 'bg-white/[0.02] border-white/10 text-slate-400'
                      }`}
                    >
                      <span>Cordless Impact Wrenches (1/2" & 3/8")</span>
                      <CheckCircle2 className={`w-4 h-4 ${tools.impactTools ? 'text-orange-400' : 'text-slate-600'}`} />
                    </div>

                    <div 
                      onClick={() => toggleTool('floorJack')}
                      className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                        tools.floorJack ? 'bg-orange-950/20 border-orange-500 text-white' : 'bg-white/[0.02] border-white/10 text-slate-400'
                      }`}
                    >
                      <span>Low-Profile Floor Jack & Heavy Jack Stands</span>
                      <CheckCircle2 className={`w-4 h-4 ${tools.floorJack ? 'text-orange-400' : 'text-slate-600'}`} />
                    </div>

                    <div 
                      onClick={() => toggleTool('multimeter')}
                      className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                        tools.multimeter ? 'bg-orange-950/20 border-orange-500 text-white' : 'bg-white/[0.02] border-white/10 text-slate-400'
                      }`}
                    >
                      <span>Digital Multimeter & Probe Tester</span>
                      <CheckCircle2 className={`w-4 h-4 ${tools.multimeter ? 'text-orange-400' : 'text-slate-600'}`} />
                    </div>

                    <div 
                      onClick={() => toggleTool('brakeBleeder')}
                      className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                        tools.brakeBleeder ? 'bg-orange-950/20 border-orange-500 text-white' : 'bg-white/[0.02] border-white/10 text-slate-400'
                      }`}
                    >
                      <span>Brake Caliper Tool Kit & Pressure Bleeder</span>
                      <CheckCircle2 className={`w-4 h-4 ${tools.brakeBleeder ? 'text-orange-400' : 'text-slate-600'}`} />
                    </div>

                    <div 
                      onClick={() => toggleTool('torqueWrench')}
                      className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                        tools.torqueWrench ? 'bg-orange-950/20 border-orange-500 text-white' : 'bg-white/[0.02] border-white/10 text-slate-400'
                      }`}
                    >
                      <span>Calibrated Torque Wrenches (Ft-lbs / In-lbs)</span>
                      <CheckCircle2 className={`w-4 h-4 ${tools.torqueWrench ? 'text-orange-400' : 'text-slate-600'}`} />
                    </div>

                    <div 
                      onClick={() => toggleTool('oilCatch')}
                      className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                        tools.oilCatch ? 'bg-orange-950/20 border-orange-500 text-white' : 'bg-white/[0.02] border-white/10 text-slate-400'
                      }`}
                    >
                      <span>Spill-Proof Fluid Catch & Transfer Pumps</span>
                      <CheckCircle2 className={`w-4 h-4 ${tools.oilCatch ? 'text-orange-400' : 'text-slate-600'}`} />
                    </div>

                    <div 
                      onClick={() => toggleTool('handToolsSet')}
                      className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                        tools.handToolsSet ? 'bg-orange-950/20 border-orange-500 text-white' : 'bg-white/[0.02] border-white/10 text-slate-400'
                      }`}
                    >
                      <span>Complete Metric & SAE Socket / Wrench Set</span>
                      <CheckCircle2 className={`w-4 h-4 ${tools.handToolsSet ? 'text-orange-400' : 'text-slate-600'}`} />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                    >
                      ← Back
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs"
                    >
                      Next: Pay & Certifications →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Certifications & Pay Option */}
              {step === 3 && (
                <div className="space-y-4">
                  <h3 className="font-heading font-extrabold text-base text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    ASE Certifications & Compensation Structure
                  </h3>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-300">ASE Certifications Held (Select all that apply):</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {['A1 Engine Repair', 'A4 Brakes', 'A5 Suspension', 'A6 Electrical', 'A7 Heating/AC', 'A8 Performance', 'ASE Master Tech', 'L1 Advanced Diagnostics'].map(cert => (
                        <button
                          type="button"
                          key={cert}
                          onClick={() => toggleAse(cert)}
                          className={`p-2 rounded-lg border text-left text-[11px] font-semibold transition-all ${
                            aseCerts.includes(cert)
                              ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                              : 'bg-white/5 border-white/10 text-slate-400'
                          }`}
                        >
                          {aseCerts.includes(cert) ? '✓ ' : '+ '} {cert}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="block text-xs font-semibold text-slate-300">
                      How do you want to work? (changeable later in Settings)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => setJobCapacity('multi')}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          jobCapacity === 'multi'
                            ? 'bg-emerald-950/30 border-emerald-500 text-white'
                            : 'bg-white/5 border-white/10 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-sm text-emerald-400 mb-1">
                          <Layers className="w-4 h-4" />
                          Multi-job
                        </div>
                        <p className="text-[11px] text-slate-300">
                          Claim and juggle multiple active dispatches — best if you want max volume and earnings.
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setJobCapacity('standalone')}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          jobCapacity === 'standalone'
                            ? 'bg-sky-950/30 border-sky-500 text-white'
                            : 'bg-white/5 border-white/10 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-sm text-sky-400 mb-1">
                          <User className="w-4 h-4" />
                          Standalone (single)
                        </div>
                        <p className="text-[11px] text-slate-300">
                          One active job at a time — focus on a single customer until that job is done.
                        </p>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="block text-xs font-semibold text-slate-300">Preferred Pay Plan:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div
                        onClick={() => setPayPreference('revshare')}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          payPreference === 'revshare' ? 'bg-emerald-950/30 border-emerald-500 text-white' : 'bg-white/5 border-white/10 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold text-sm text-emerald-400 mb-1">
                          <span>70/30 Revenue Split + 100% Tips</span>
                          <span>Mechanic Keeps 70%</span>
                        </div>
                        <p className="text-[11px] text-slate-300">Mechanics keep 70% of total labor billed (30% platform). Technicians average $65.00 – $95.00+/hr on mobile repair jobs in Justin & Northlake.</p>
                      </div>

                      <div
                        className="p-4 rounded-xl border border-white/10 bg-white/[0.03] text-slate-500 cursor-not-allowed opacity-80 relative"
                        aria-disabled="true"
                        title="Flat hourly is coming soon"
                      >
                        <span className="absolute top-3 right-3 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40">
                          Coming soon
                        </span>
                        <div className="flex items-center justify-between font-bold text-sm text-slate-500 mb-1 pr-24">
                          <span>Guaranteed $50 - $65/hr Base</span>
                          <span>Flat Hourly Rate</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Guaranteed hourly for active dispatch + 100% tips — not open for signup yet. Apply on 70/30 for now.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-white/10 p-3.5 rounded-xl text-xs space-y-1">
                    <strong className="text-emerald-400 font-bold block">🔒 Official Platform Checkout & Payout Terms</strong>
                    <p className="text-[11px] text-slate-300">
                      All customer service payments are processed through Adaptivity In-App Checkout. Technicians receive 70% of total labor billed + 100% tips deposited directly to their bank account after every completed job. Cash/Zelle side-transactions are prohibited.
                    </p>
                  </div>

                  <div className="bg-amber-950/40 border border-amber-500/30 p-3.5 rounded-xl text-xs space-y-2">
                    <strong className="text-amber-300 font-bold block">Liability &amp; insurance</strong>
                    <p className="text-[11px] text-slate-300 leading-relaxed">{TECH_LIABILITY_SUMMARY}</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{TECH_INSURANCE_RECOMMENDATION}</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{TECH_WORKERS_COMP_NOTICE}</p>
                    <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={acceptedLiability}
                        onChange={(e) => setAcceptedLiability(e.target.checked)}
                        className="mt-0.5 rounded border-white/20"
                        required
                      />
                      <span className="text-[11px] text-slate-200 leading-relaxed">{TECH_LIABILITY_ACK_LABEL}</span>
                    </label>
                  </div>

                  {submitError && (
                    <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                      {submitError}
                    </p>
                  )}

                  <div className="pt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                    >
                      ← Back
                    </button>

                    <button
                      type="submit"
                      disabled={isOnboardingStripe || isSubmitting || !acceptedLiability}
                      className="px-7 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs shadow-lg shadow-emerald-500/25 flex items-center space-x-2 disabled:opacity-60"
                    >
                      {isSubmitting || isOnboardingStripe ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Submitting…</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Submit Technician Application</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
