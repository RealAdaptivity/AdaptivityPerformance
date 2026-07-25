import React, { useState } from 'react';
import { Wrench, Phone, Calendar, Clock, ShieldCheck, Truck, Car, FileCheck, UserPlus } from 'lucide-react';

interface NavbarProps {
  onOpenBooking: () => void;
  onOpenTracker: () => void;
  onOpenGarage: () => void;
  onOpenInspection: () => void;
  onOpenRecruitment: () => void;
  onOpenMembership: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onOpenBooking, 
  onOpenTracker, 
  onOpenGarage,
  onOpenInspection,
  onOpenRecruitment,
  onOpenMembership,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#0b0c10]/90 backdrop-blur-md border-b border-white/10">
      {/* Top Announcement Bar */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white text-xs py-1.5 px-4 font-medium flex items-center justify-between">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span><strong>NOW ACTIVE:</strong> Mobile Service Units Dispatched in <strong>Justin (76247)</strong> & <strong>Northlake (76226/76262)</strong></span>
          </div>
          <div className="hidden md:flex items-center space-x-6 text-xs">
            <button 
              onClick={onOpenRecruitment}
              className="bg-black/30 hover:bg-black/50 px-2.5 py-0.5 rounded-full font-bold text-amber-200 hover:text-white border border-amber-400/40 transition-colors flex items-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5 text-amber-400" />
              <span>Mechanics Hiring (80% Pay Split)</span>
            </button>
            <span className="flex items-center space-x-1"><Clock className="w-3.5 h-3.5" /> <span>Mon-Sat: 7:00 AM - 7:00 PM</span></span>
            <button onClick={onOpenTracker} className="underline hover:text-amber-200 transition-colors flex items-center gap-1 font-bold">
              <Truck className="w-3.5 h-3.5" /> Track Live Dispatch
            </button>
          </div>
        </div>
      </div>

      {/* Main Nav */}
      <div className="container mx-auto px-4 py-3.5 flex items-center justify-between">
        {/* Brand Logo */}
        <a href="#" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 p-0.5 shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-all duration-300">
            <div className="w-full h-full bg-[#0b0c10] rounded-[10px] flex items-center justify-center">
              <Wrench className="w-5 h-5 text-orange-500 group-hover:rotate-12 transition-transform duration-300" />
            </div>
          </div>
          <div>
            <div className="font-heading font-extrabold text-xl tracking-tight text-white flex items-center gap-1.5">
              ADAPTIVITY <span className="text-orange-500">PERFORMANCE</span>
            </div>
            <p className="text-[10px] tracking-widest text-slate-400 uppercase font-semibold">Mobile & Shop Automotive Specialist</p>
          </div>
        </a>

        {/* Desktop Menu */}
        <nav className="hidden lg:flex items-center space-x-5 text-sm font-medium text-slate-300">
          <a href="#services" className="hover:text-orange-400 transition-colors">Services</a>
          <a href="#estimator" className="hover:text-orange-400 transition-colors flex items-center gap-1">
            <span>Instant Quote</span>
            <span className="bg-orange-500/20 text-orange-400 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Fast</span>
          </a>
          <button 
            onClick={onOpenGarage}
            className="hover:text-orange-400 transition-colors flex items-center gap-1.5 text-amber-400 font-semibold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20"
          >
            <Car className="w-4 h-4 text-orange-400" />
            <span>My Garage</span>
          </button>
          <button 
            onClick={onOpenInspection}
            className="hover:text-orange-400 transition-colors flex items-center gap-1.5 text-blue-400 font-semibold bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20"
          >
            <FileCheck className="w-4 h-4 text-blue-400" />
            <span>DVI Report</span>
          </button>
          <button 
            onClick={() => {
              const elem = document.getElementById('membership');
              if (elem) elem.scrollIntoView({ behavior: 'smooth' });
              onOpenMembership();
            }}
            className="hover:text-amber-300 transition-colors flex items-center gap-1.5 text-orange-400 font-semibold bg-orange-500/10 px-2.5 py-1 rounded-lg border border-orange-500/20"
          >
            <ShieldCheck className="w-4 h-4 text-orange-400" />
            <span>VIP Shield</span>
          </button>
          <button
            onClick={onOpenRecruitment}
            className="hover:text-orange-400 transition-colors flex items-center gap-1.5 text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20"
          >
            <UserPlus className="w-4 h-4 text-emerald-400" />
            <span>Join as Tech</span>
          </button>
        </nav>

        {/* Right CTA Actions & Employee App Mode Switcher */}
        <div className="hidden sm:flex items-center space-x-3">
          
          <a 
            href="tel:2146203244" 
            className="flex items-center space-x-2 text-slate-200 hover:text-orange-400 px-3 py-2 text-sm font-semibold rounded-lg transition-colors border border-white/5 hover:border-orange-500/30 bg-white/[0.03]"
          >
            <Phone className="w-4 h-4 text-orange-500" />
            <span>(214) 620-3244</span>
          </a>
          
          <button
            onClick={onOpenBooking}
            className="flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-200 active:scale-95"
          >
            <Calendar className="w-4 h-4" />
            <span>Book Service</span>
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden text-slate-300 hover:text-white p-2"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#12141c] border-b border-white/10 px-4 pt-3 pb-6 space-y-4">
          <div className="flex flex-col space-y-3 font-medium text-slate-300">
            <button onClick={() => { 
              const elem = document.getElementById('membership');
              if (elem) elem.scrollIntoView({ behavior: 'smooth' });
              onOpenMembership(); 
              setMobileMenuOpen(false); 
            }} className="text-left font-bold text-orange-400 py-1 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-orange-400" /> Adaptivity Shield VIP Membership
            </button>
            <button onClick={() => { onOpenRecruitment(); setMobileMenuOpen(false); }} className="text-left font-bold text-emerald-400 py-1 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-400" /> Apply as Mobile Mechanic ($45-$75/hr)
            </button>
            <button onClick={() => { onOpenGarage(); setMobileMenuOpen(false); }} className="text-left font-bold text-amber-400 py-1 flex items-center gap-2">
              <Car className="w-4 h-4 text-amber-400" /> My Garage & Health Hub
            </button>
            <button onClick={() => { onOpenInspection(); setMobileMenuOpen(false); }} className="text-left font-bold text-blue-400 py-1 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-blue-400" /> Digital Inspection (DVI)
            </button>
            <a href="#services" onClick={() => setMobileMenuOpen(false)} className="hover:text-orange-400 py-1 border-b border-white/5">Services</a>
            <a href="#estimator" onClick={() => setMobileMenuOpen(false)} className="hover:text-orange-400 py-1 border-b border-white/5">Instant Quote Calculator</a>
            <a href="#area" onClick={() => setMobileMenuOpen(false)} className="hover:text-orange-400 py-1 border-b border-white/5">Justin & Northlake Coverage</a>
            <button onClick={() => { onOpenTracker(); setMobileMenuOpen(false); }} className="text-left text-orange-400 py-1">Track Live Repair / Dispatch</button>
          </div>
          <div className="pt-2 flex flex-col space-y-2">
            <a href="tel:2146203244" className="flex items-center justify-center space-x-2 bg-slate-800 text-slate-200 py-2.5 rounded-xl font-semibold">
              <Phone className="w-4 h-4 text-orange-400" />
              <span>Call (214) 620-3244</span>
            </a>
            <button onClick={() => { onOpenBooking(); setMobileMenuOpen(false); }} className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white py-2.5 rounded-xl font-semibold">
              <Calendar className="w-4 h-4" />
              <span>Book Appointment</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};


