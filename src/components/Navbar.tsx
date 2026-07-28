import React, { useEffect, useRef, useState } from 'react';
import {
  Phone,
  Calendar,
  Clock,
  ShieldCheck,
  Truck,
  Car,
  FileCheck,
  UserPlus,
  Building2,
  LogIn,
  Menu,
  X,
  Calculator,
  MapPin,
  GraduationCap,
  Wrench,
} from 'lucide-react';
import { portalPath } from '../portal/portalRoute';
import { SiteLink } from '../site/SiteLink';
import { navigateSite, useSitePage } from '../site/siteRoute';
import { BrandLogo } from './BrandLogo';

interface NavbarProps {
  onOpenBooking: () => void;
  onOpenTracker: () => void;
  onOpenGarage: () => void;
  onOpenInspection: () => void;
  onOpenRecruitment: () => void;
  onOpenPartnerApply: () => void;
  onOpenMembership: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenBooking,
  onOpenTracker,
  onOpenGarage,
  onOpenInspection,
  onOpenRecruitment,
  onOpenPartnerApply,
  onOpenMembership,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const page = useSitePage();

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

  const linkClass = (id: string) =>
    `transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white/5 ${
      page === id ? 'text-orange-400' : 'hover:text-orange-400'
    }`;

  return (
    <header className="sticky top-0 z-50 bg-[#0b0c10]/90 backdrop-blur-md border-b border-white/10">
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white text-xs py-1.5 px-4 font-medium">
        <div className="container mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2 min-w-0">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping flex-shrink-0" />
            <span className="truncate">
              <strong>NOW ACTIVE:</strong> Mobile Service across <strong>DFW</strong> & <strong>Fort Worth</strong>
            </span>
          </div>
          <span className="hidden sm:flex items-center space-x-1 flex-shrink-0 opacity-90">
            <Clock className="w-3.5 h-3.5" />
            <span>Open 24/7</span>
          </span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-3.5 flex items-center justify-between gap-3">
        <SiteLink to="home" className="group min-w-0">
          <BrandLogo withWordmark size={40} />
        </SiteLink>

        <div className="relative flex items-center gap-1.5 sm:gap-2" ref={menuRef}>
          <nav className="hidden lg:flex items-center gap-0.5 text-sm font-medium text-slate-300">
            <SiteLink to="services" className={linkClass('services')}>
              Services
            </SiteLink>
            <SiteLink to="about" className={linkClass('about')}>
              About
            </SiteLink>
            <SiteLink to="quotes" className={linkClass('quotes')}>
              Quotes
            </SiteLink>
            <SiteLink
              to="join"
              className={`inline-flex items-center gap-1.5 ${linkClass('join')} ${
                page === 'join' ? 'text-emerald-400' : 'text-emerald-400/90 hover:text-emerald-300'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Join as Tech
            </SiteLink>
            <SiteLink
              to="learn"
              className={`inline-flex items-center gap-1.5 ${linkClass('learn')} ${
                page === 'learn' ? 'text-amber-400' : 'hover:text-amber-300'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              Want to Learn
            </SiteLink>
            <SiteLink
              to="wantToTeach"
              className={`inline-flex items-center gap-1.5 ${linkClass('wantToTeach')} ${
                page === 'wantToTeach' ? 'text-violet-300' : 'hover:text-violet-300'
              }`}
            >
              Want to Teach
            </SiteLink>
            <SiteLink to="careers" className={linkClass('careers')}>
              Careers
            </SiteLink>
          </nav>

          <button
            type="button"
            onClick={onOpenBooking}
            className="hidden sm:inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold text-xs sm:text-sm px-3.5 py-2 rounded-xl shadow-lg shadow-orange-500/25"
          >
            <Calendar className="w-4 h-4" />
            Schedule Service
          </button>

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
                <SiteLink
                  to="home"
                  onNavigate={close}
                  className="px-3 py-2.5 rounded-xl hover:bg-white/5 hover:text-orange-400"
                >
                  Home
                </SiteLink>
                <SiteLink
                  to="services"
                  onNavigate={close}
                  className="px-3 py-2.5 rounded-xl hover:bg-white/5 hover:text-orange-400 flex items-center gap-2.5"
                >
                  <Wrench className="w-4 h-4 text-orange-400" /> Services
                </SiteLink>
                <SiteLink
                  to="about"
                  onNavigate={close}
                  className="px-3 py-2.5 rounded-xl hover:bg-white/5 hover:text-orange-400"
                >
                  About Us
                </SiteLink>
                <SiteLink
                  to="quotes"
                  onNavigate={close}
                  className="px-3 py-2.5 rounded-xl hover:bg-white/5 hover:text-orange-400 flex items-center gap-2.5"
                >
                  <Calculator className="w-4 h-4 text-sky-400" /> Price Estimate
                </SiteLink>
                <SiteLink
                  to="join"
                  onNavigate={close}
                  className="px-3 py-2.5 rounded-xl hover:bg-white/5 flex items-center gap-2.5 text-emerald-300"
                >
                  <UserPlus className="w-4 h-4 text-emerald-400" /> Join as Tech
                </SiteLink>
                <SiteLink
                  to="learn"
                  onNavigate={close}
                  className="px-3 py-2.5 rounded-xl hover:bg-white/5 flex items-center gap-2.5 text-amber-300"
                >
                  <GraduationCap className="w-4 h-4 text-amber-400" /> Want to Learn
                </SiteLink>
                <SiteLink
                  to="wantToTeach"
                  onNavigate={close}
                  className="px-3 py-2.5 rounded-xl hover:bg-white/5 flex items-center gap-2.5 text-violet-300"
                >
                  <GraduationCap className="w-4 h-4 text-violet-300" /> Want to Teach
                </SiteLink>
                <SiteLink
                  to="careers"
                  onNavigate={close}
                  className="px-3 py-2.5 rounded-xl hover:bg-white/5 hover:text-orange-400 flex items-center gap-2.5"
                >
                  Careers
                </SiteLink>
                <button
                  type="button"
                  onClick={() => {
                    onOpenBooking();
                    close();
                  }}
                  className="text-left px-3 py-2.5 rounded-xl hover:bg-white/5 flex items-center gap-2.5 text-orange-300 sm:hidden"
                >
                  <Calendar className="w-4 h-4 text-orange-400" /> Schedule Service
                </button>

                <div className="my-1 border-t border-white/10" />

                <SiteLink
                  to="membership"
                  onNavigate={() => {
                    close();
                    onOpenMembership();
                  }}
                  className="px-3 py-2.5 rounded-xl hover:bg-white/5 flex items-center gap-2.5 text-orange-300"
                >
                  <ShieldCheck className="w-4 h-4 text-orange-400" /> VIP Shield
                </SiteLink>
                <SiteLink
                  to="diagnostics"
                  onNavigate={close}
                  className="px-3 py-2.5 rounded-xl hover:bg-white/5 hover:text-orange-400"
                >
                  Symptom Checker
                </SiteLink>
                <SiteLink
                  to="partners"
                  onNavigate={close}
                  className="px-3 py-2.5 rounded-xl hover:bg-white/5 flex items-center gap-2.5 text-sky-300"
                >
                  <Building2 className="w-4 h-4 text-sky-400" /> Partner locations
                </SiteLink>
                <button
                  type="button"
                  onClick={() => {
                    onOpenPartnerApply();
                    close();
                  }}
                  className="text-left px-3 py-2.5 rounded-xl hover:bg-white/5 flex items-center gap-2.5 text-sky-300"
                >
                  <Building2 className="w-4 h-4 text-sky-400" /> Partner your shop
                </button>
                <SiteLink
                  to="coverage"
                  onNavigate={close}
                  className="px-3 py-2.5 rounded-xl hover:bg-white/5 flex items-center gap-2.5"
                >
                  <MapPin className="w-4 h-4 text-orange-400" /> Service area
                </SiteLink>
                <SiteLink
                  to="performance"
                  onNavigate={close}
                  className="px-3 py-2.5 rounded-xl hover:bg-white/5 hover:text-orange-400"
                >
                  Performance builds
                </SiteLink>
                <SiteLink
                  to="faq"
                  onNavigate={close}
                  className="px-3 py-2.5 rounded-xl hover:bg-white/5 hover:text-orange-400"
                >
                  FAQ
                </SiteLink>

                <div className="my-1 border-t border-white/10" />

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
                  onClick={() => {
                    onOpenTracker();
                    close();
                  }}
                  className="text-left px-3 py-2.5 rounded-xl hover:bg-white/5 flex items-center gap-2.5"
                >
                  <Truck className="w-4 h-4 text-orange-400" /> Track Live Dispatch
                </button>

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
                  Schedule Service
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigateSite('join');
                    onOpenRecruitment();
                    close();
                  }}
                  className="mx-1 mb-1 flex items-center justify-center gap-2 border border-emerald-500/40 text-emerald-300 font-semibold py-2.5 rounded-xl hover:bg-emerald-500/10"
                >
                  <UserPlus className="w-4 h-4" />
                  Open tech application
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
