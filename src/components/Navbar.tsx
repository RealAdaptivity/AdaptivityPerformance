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
import { SITE_PHONE_DISPLAY, SITE_PHONE_TEL } from '../site/seo';
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

function MenuSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pt-1">
      <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <div className="flex flex-col">{children}</div>
    </div>
  );
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
  const [moreOpen, setMoreOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const page = useSitePage();

  useEffect(() => {
    if (!menuOpen) {
      setMoreOpen(false);
      return;
    }
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

  const itemClass =
    'px-3 py-2 rounded-xl hover:bg-white/5 hover:text-orange-400 flex items-center gap-2.5 text-left w-full';
  const linkClass = (id: string) =>
    `transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white/5 ${
      page === id ? 'text-orange-400' : 'hover:text-orange-400'
    }`;

  return (
    <header className="sticky top-0 z-50 bg-[#07080b]/90 backdrop-blur-xl border-b border-white/10 shadow-lg">
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white text-xs py-1.5 px-4 font-medium">
        <div className="container mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2 min-w-0">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping flex-shrink-0" />
            <span className="truncate">
              <strong>NOW ACTIVE:</strong> 100% Mobile Service Dispatched across <strong>DFW</strong> & <strong>Fort Worth</strong>
            </span>
          </div>
          <span className="hidden sm:flex items-center space-x-1.5 flex-shrink-0 opacity-95 text-[11px] font-bold">
            <Clock className="w-3.5 h-3.5" />
            <span>24/7 Mobile Dispatch</span>
          </span>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
        <SiteLink to="home" className="group min-w-0">
          <BrandLogo withWordmark size={40} />
        </SiteLink>

        <div className="relative flex items-center gap-2 sm:gap-3" ref={menuRef}>
          <nav className="hidden lg:flex items-center gap-1 text-sm font-semibold text-slate-300">
            <SiteLink to="home" className={linkClass('home')}>
              Home
            </SiteLink>
            <SiteLink to="services" className={linkClass('services')}>
              Services
            </SiteLink>
            <SiteLink to="about" className={linkClass('about')}>
              About
            </SiteLink>
            <SiteLink to="quotes" className={linkClass('quotes')}>
              Price Quotes
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
          </nav>

          <a
            href={SITE_PHONE_TEL}
            className="hidden md:inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-orange-400 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-orange-500/30 transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-orange-400" />
            <span>{SITE_PHONE_DISPLAY}</span>
          </a>

          <button
            type="button"
            onClick={onOpenBooking}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs sm:text-sm px-4 sm:px-5 py-2.5 rounded-xl shadow-lg shadow-orange-500/25 transition-all transform hover:-translate-y-0.5 active:scale-95"
          >
            <Calendar className="w-4 h-4" />
            <span>Book Service Now</span>
          </button>

          <button
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="text-slate-200 hover:text-white p-2.5 rounded-xl border border-white/10 hover:border-orange-500/40 hover:bg-white/5 transition-colors"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-[min(100vw-2rem,19rem)] max-h-[min(80vh,32rem)] overflow-y-auto bg-[#12141c] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 p-2 z-50">
              <div className="flex flex-col text-sm font-medium text-slate-300">
                <MenuSection label="Main">
                  <SiteLink to="services" onNavigate={close} className={itemClass}>
                    <Wrench className="w-4 h-4 text-orange-400" /> Services
                  </SiteLink>
                  <SiteLink to="quotes" onNavigate={close} className={itemClass}>
                    <Calculator className="w-4 h-4 text-sky-400" /> Price Estimate
                  </SiteLink>
                  <SiteLink to="about" onNavigate={close} className={itemClass}>
                    About
                  </SiteLink>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenTracker();
                      close();
                    }}
                    className={itemClass}
                  >
                    <Truck className="w-4 h-4 text-orange-400" /> Track Dispatch
                  </button>
                </MenuSection>

                <MenuSection label="Work with us">
                  <button
                    type="button"
                    onClick={() => {
                      navigateSite('join');
                      onOpenRecruitment();
                      close();
                    }}
                    className={`${itemClass} text-emerald-300`}
                  >
                    <UserPlus className="w-4 h-4 text-emerald-400" /> Join as Tech
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenPartnerApply();
                      close();
                    }}
                    className={`${itemClass} text-sky-300`}
                  >
                    <Building2 className="w-4 h-4 text-sky-400" /> Partner your shop
                  </button>
                  <SiteLink to="careers" onNavigate={close} className={itemClass}>
                    Careers
                  </SiteLink>
                </MenuSection>

                <MenuSection label="Account">
                  <a href={portalPath()} onClick={close} className={`${itemClass} text-orange-300 font-semibold`}>
                    <LogIn className="w-4 h-4" /> Client / Tech Login
                  </a>
                  <a href={SITE_PHONE_TEL} onClick={close} className={itemClass}>
                    <Phone className="w-4 h-4 text-orange-400" /> {SITE_PHONE_DISPLAY}
                  </a>
                </MenuSection>

                <div className="my-1 border-t border-white/10" />

                <button
                  type="button"
                  onClick={() => setMoreOpen((o) => !o)}
                  aria-expanded={moreOpen}
                  className="px-3 py-2 rounded-xl hover:bg-white/5 flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider"
                >
                  <span>More</span>
                  <span className="text-slate-500">{moreOpen ? '−' : '+'}</span>
                </button>

                {moreOpen && (
                  <div className="flex flex-col pb-1">
                    <SiteLink
                      to="membership"
                      onNavigate={() => {
                        close();
                        onOpenMembership();
                      }}
                      className={`${itemClass} text-orange-300`}
                    >
                      <ShieldCheck className="w-4 h-4 text-orange-400" /> VIP Shield
                    </SiteLink>
                    <SiteLink to="diagnostics" onNavigate={close} className={itemClass}>
                      Symptom Checker
                    </SiteLink>
                    <SiteLink to="partners" onNavigate={close} className={itemClass}>
                      <Building2 className="w-4 h-4 text-sky-400" /> Partner locations
                    </SiteLink>
                    <SiteLink to="coverage" onNavigate={close} className={itemClass}>
                      <MapPin className="w-4 h-4 text-orange-400" /> Service area
                    </SiteLink>
                    <SiteLink to="performance" onNavigate={close} className={itemClass}>
                      Performance builds
                    </SiteLink>
                    <SiteLink to="learn" onNavigate={close} className={`${itemClass} text-amber-300`}>
                      <GraduationCap className="w-4 h-4 text-amber-400" /> Want to Learn
                    </SiteLink>
                    <SiteLink to="wantToTeach" onNavigate={close} className={`${itemClass} text-violet-300`}>
                      <GraduationCap className="w-4 h-4 text-violet-300" /> Want to Teach
                    </SiteLink>
                    <SiteLink to="faq" onNavigate={close} className={itemClass}>
                      FAQ
                    </SiteLink>
                    <SiteLink
                      to="blog"
                      onNavigate={close}
                      className={`${itemClass} ${
                        page === 'blog' || page === 'blogPost' ? 'text-orange-400' : ''
                      }`}
                    >
                      Blog
                    </SiteLink>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenGarage();
                        close();
                      }}
                      className={`${itemClass} text-amber-300`}
                    >
                      <Car className="w-4 h-4 text-orange-400" /> My Garage
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenInspection();
                        close();
                      }}
                      className={`${itemClass} text-blue-300`}
                    >
                      <FileCheck className="w-4 h-4 text-blue-400" /> DVI Report
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onOpenBooking();
                    close();
                  }}
                  className="mt-2 mx-1 mb-1 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-orange-500/25"
                >
                  <Calendar className="w-4 h-4" />
                  Schedule / Call for Quote
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
