import React, { useEffect, useRef, useState } from 'react';
import {
  Wrench,
  Phone,
  Calendar,
  Clock,
  ShieldCheck,
  Truck,
  Car,
  FileCheck,
  UserPlus,
  LogIn,
  Menu,
  X,
} from 'lucide-react';
import { portalPath } from '../portal/portalRoute';

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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [menuOpen]);

  const close = () => setMenuOpen(false);

  const openMembership = () => {
    const elem = document.getElementById('membership');
    if (elem) elem.scrollIntoView({ behavior: 'smooth' });
    onOpenMembership();
    close();
  };

  return (
    <header className="sticky top-0 z-50 bg-[#0b0c10]/90 backdrop-blur-md border-b border-white/10">
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white text-xs py-1.5 px-4 font-medium">
        <div className="container mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2 min-w-0">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping flex-shrink-0" />
            <span className="truncate">
              <strong>NOW ACTIVE:</strong> Mobile Service in <strong>Justin</strong> & <strong>Northlake</strong>
            </span>
          </div>
          <span className="hidden sm:flex items-center space-x-1 flex-shrink-0 opacity-90">
            <Clock className="w-3.5 h-3.5" />
            <span>Mon–Sat 7AM–7PM</span>
          </span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
        <a href="#" className="flex items-center space-x-3 group min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 p-0.5 shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-all duration-300 flex-shrink-0">
            <div className="w-full h-full bg-[#0b0c10] rounded-[10px] flex items-center justify-center">
              <Wrench className="w-5 h-5 text-orange-500 group-hover:rotate-12 transition-transform duration-300" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="font-heading font-extrabold text-lg sm:text-xl tracking-tight text-white flex items-center gap-1.5 truncate">
              ADAPTIVITY <span className="text-orange-500">PERFORMANCE</span>
            </div>
            <p className="text-[10px] tracking-widest text-slate-400 uppercase font-semibold hidden sm:block">
              Mobile & Shop Automotive Specialist
            </p>
          </div>
        </a>

        <div className="relative flex items-center gap-2 sm:gap-4" ref={menuRef}>
          <nav className="flex items-center gap-1 sm:gap-2 text-sm font-medium text-slate-300">
            <a
              href="#services"
              className="hover:text-orange-400 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white/5"
            >
              Services
            </a>
            <a
              href="#estimator"
              className="hover:text-orange-400 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white/5 flex items-center gap-1.5"
            >
              <span>Quotes</span>
              <span className="bg-orange-500/20 text-orange-400 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase hidden sm:inline">
                Fast
              </span>
            </a>
          </nav>

          <button
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="text-slate-200 hover:text-white p-2 rounded-lg border border-white/10 hover:border-orange-500/40 hover:bg-white/5 transition-colors"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-[min(100vw-2rem,20rem)] bg-[#12141c] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 p-2 z-50">
              <div className="flex flex-col text-sm font-medium text-slate-300">
                <button
                  type="button"
                  onClick={() => {
                    onOpenGarage();
                    close();
                  }}
                  className="text-left px-3 py-2.5 rounded-xl hover:bg-white/5 flex items-center gap-2.5 text-amber-300"
                >
                  <Car className="w-4 h-4 text-orange-400" /> My Garage
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onOpenInspection();
                    close();
                  }}
                  className="text-left px-3 py-2.5 rounded-xl hover:bg-white/5 flex items-center gap-2.5 text-blue-300"
                >
                  <FileCheck className="w-4 h-4 text-blue-400" /> DVI Report
                </button>
                <button
                  type="button"
                  onClick={openMembership}
                  className="text-left px-3 py-2.5 rounded-xl hover:bg-white/5 flex items-center gap-2.5 text-orange-300"
                >
                  <ShieldCheck className="w-4 h-4 text-orange-400" /> VIP Shield
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onOpenRecruitment();
                    close();
                  }}
                  className="text-left px-3 py-2.5 rounded-xl hover:bg-white/5 flex items-center gap-2.5 text-emerald-300"
                >
                  <UserPlus className="w-4 h-4 text-emerald-400" /> Join as Tech
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onOpenTracker();
                    close();
                  }}
                  className="text-left px-3 py-2.5 rounded-xl hover:bg-white/5 flex items-center gap-2.5"
                >
                  <Truck className="w-4 h-4 text-orange-400" /> Track Live Dispatch
                </button>
                <a
                  href="#area"
                  onClick={close}
                  className="px-3 py-2.5 rounded-xl hover:bg-white/5 hover:text-orange-400"
                >
                  Justin & Northlake Coverage
                </a>

                <div className="my-1 border-t border-white/10" />

                <a
                  href={portalPath()}
                  onClick={close}
                  className="px-3 py-2.5 rounded-xl hover:bg-white/5 flex items-center gap-2.5 text-orange-300 font-semibold"
                >
                  <LogIn className="w-4 h-4" /> Client / Tech Login
                </a>
                <a
                  href="tel:2146203244"
                  onClick={close}
                  className="px-3 py-2.5 rounded-xl hover:bg-white/5 flex items-center gap-2.5"
                >
                  <Phone className="w-4 h-4 text-orange-400" /> (214) 620-3244
                </a>
                <button
                  type="button"
                  onClick={() => {
                    onOpenBooking();
                    close();
                  }}
                  className="mt-1 mx-1 mb-1 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-orange-500/25"
                >
                  <Calendar className="w-4 h-4" />
                  Book Service
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
