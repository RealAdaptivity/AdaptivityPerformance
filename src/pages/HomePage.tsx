import React from 'react';
import {
  ArrowRight,
  Wrench,
  Users,
  Calculator,
  UserPlus,
  Building2,
  MapPin,
  ShieldCheck,
  Stethoscope,
  Briefcase,
  GraduationCap,
} from 'lucide-react';
import { Hero } from '../components/Hero';
import { HowItWorksSection } from '../components/HowItWorksSection';
import { DrivewayServicesTabs } from '../components/DrivewayServicesTabs';
import { Testimonials } from '../components/Testimonials';
import { ComparisonTable } from '../components/ComparisonTable';
import { BnplBanner } from '../components/BnplBanner';
import { DiagnosticCreditBanner } from '../components/DiagnosticCreditBanner';
import { ServiceShowcaseGrid } from '../components/ServiceShowcaseGrid';
import { FactoryWarrantySection } from '../components/FactoryWarrantySection';
import { FleetHOASection } from '../components/FleetHOASection';
import { SiteLink } from '../site/SiteLink';
import { ContactSection } from '../components/ContactSection';
import { ScrollReveal } from '../components/ScrollReveal';
import type { SitePage } from '../site/siteRoute';

type Props = {
  onOpenBooking: () => void;
  onSelectServiceMode: (mode: 'mobile' | 'shop') => void;
  onOpenRecruitment: () => void;
  onOpenPartnerApply?: () => void;
};

const LINKS: {
  to: SitePage;
  title: string;
  blurb: string;
  icon: React.ReactNode;
  accent: string;
}[] = [
    {
      to: 'about',
      title: 'About Us',
      blurb: 'How we serve customers, shops, techs, and the community — plus Pay in 4 / 8.',
      icon: <Users className="w-5 h-5" />,
      accent: 'text-orange-400 bg-orange-500/15 border-orange-500/30',
    },
    {
      to: 'services',
      title: 'Services',
      blurb: 'Diagnostics, brakes, audio, tint, detailing, performance, and more.',
      icon: <Wrench className="w-5 h-5" />,
      accent: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
    },
    {
      to: 'quotes',
      title: 'Price Estimate',
      blurb: 'Rough ballpark only — your tech sets the final labor + parts price on site.',
      icon: <Calculator className="w-5 h-5" />,
      accent: 'text-sky-400 bg-sky-500/15 border-sky-500/30',
    },
    {
      to: 'membership',
      title: 'VIP Membership',
      blurb: 'Adaptivity Shield — $0 travel fees and member discounts.',
      icon: <ShieldCheck className="w-5 h-5" />,
      accent: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
    },
    {
      to: 'diagnostics',
      title: 'Symptom Checker',
      blurb: 'Tell us what’s wrong — get a recommended service path.',
      icon: <Stethoscope className="w-5 h-5" />,
      accent: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
    },
    {
      to: 'join',
      title: 'Join as Tech',
      blurb: 'Ready to claim jobs — multi-job or standalone, keep most of the labor + tips.',
      icon: <UserPlus className="w-5 h-5" />,
      accent: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
    },
    {
      to: 'learn',
      title: 'Want to Learn',
      blurb: 'Paid training for students & beginners — path to full tech with us.',
      icon: <GraduationCap className="w-5 h-5" />,
      accent: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
    },
    {
      to: 'wantToTeach',
      title: 'Want to Teach',
      blurb: 'Mechanics & techs with us can coach learners and get paid to teach.',
      icon: <GraduationCap className="w-5 h-5" />,
      accent: 'text-violet-300 bg-violet-500/15 border-violet-500/30',
    },
    {
      to: 'careers',
      title: 'Careers',
      blurb: 'Open tech & partner roles now — support & dispatch admin coming later.',
      icon: <Briefcase className="w-5 h-5" />,
      accent: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
    },
    {
      to: 'partners',
      title: 'Partner Shops',
      blurb: 'Host a bay or garage — we send booked customers your way.',
      icon: <Building2 className="w-5 h-5" />,
      accent: 'text-sky-300 bg-sky-500/10 border-sky-500/30',
    },
    {
      to: 'coverage',
      title: 'Service Area',
      blurb: 'DFW / Fort Worth mobile coverage from our Justin hub.',
      icon: <MapPin className="w-5 h-5" />,
      accent: 'text-orange-300 bg-orange-500/10 border-orange-500/30',
    },
  ];

export const HomePage: React.FC<Props> = ({
  onOpenBooking,
  onSelectServiceMode,
  onOpenRecruitment,
  onOpenPartnerApply = () => { },
}) => {
  return (
    <>
      <Hero onOpenBooking={onOpenBooking} onSelectServiceMode={onSelectServiceMode} />

      <ScrollReveal>
        <HowItWorksSection onOpenBooking={onOpenBooking} />
      </ScrollReveal>

      <ScrollReveal delayMs={30}>
        <DrivewayServicesTabs onOpenBooking={onOpenBooking} />
      </ScrollReveal>

      <ScrollReveal variant="left">
        <ComparisonTable onOpenBooking={onOpenBooking} />
      </ScrollReveal>

      <ScrollReveal>
        <Testimonials />
      </ScrollReveal>

      <ScrollReveal>
        <BnplBanner onOpenBooking={onOpenBooking} />
      </ScrollReveal>

      <ScrollReveal delayMs={40} variant="scale">
        <ServiceShowcaseGrid onBookService={() => onOpenBooking()} />
      </ScrollReveal>



      <ScrollReveal>
        <FactoryWarrantySection onOpenBooking={onOpenBooking} />
      </ScrollReveal>

      <ScrollReveal delayMs={40} variant="scale">
        <FleetHOASection onOpenBooking={onOpenBooking} onOpenPartnerApply={onOpenPartnerApply} />
      </ScrollReveal>

      <ScrollReveal>
        <ContactSection onOpenBooking={onOpenBooking} />
      </ScrollReveal>

      <section className="py-16 bg-[#0c0d12] border-t border-white/10">
        <div className="container mx-auto px-4 space-y-8">
          <ScrollReveal className="max-w-2xl mx-auto text-center space-y-3">
            <h2 className="font-heading text-2xl sm:text-3xl font-black text-white">
              Explore Adaptivity
            </h2>
            <p className="text-sm text-slate-400">
              Everything lives on its own page now — pick where you want to go.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
            {LINKS.map((item, index) => (
              <ScrollReveal key={item.to} delayMs={Math.min(index * 55, 330)} variant="up">
                <SiteLink
                  to={item.to}
                  className="group rounded-2xl border border-white/10 bg-[#12141c] p-5 text-left hover:border-orange-500/40 transition-colors space-y-3 hover-lift block h-full"
                >
                  <div
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center ${item.accent}`}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="font-heading font-extrabold text-white group-hover:text-orange-300 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.blurb}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-400">
                    Open page <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </SiteLink>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal delayMs={80} variant="fade">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={onOpenBooking}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white text-sm font-bold shadow-lg hover:scale-105 transition-transform"
              >
                Schedule / Call for Quote
              </button>
              <SiteLink
                to="join"
                className="px-6 py-3 rounded-xl border border-emerald-500/40 text-emerald-300 text-sm font-bold hover:bg-emerald-500/10"
              >
                Join as Tech
              </SiteLink>
              <SiteLink
                to="wantToTeach"
                className="px-6 py-3 rounded-xl border border-violet-500/40 text-violet-300 text-sm font-bold hover:bg-violet-500/10"
              >
                Want to Teach
              </SiteLink>
              <button
                type="button"
                onClick={onOpenRecruitment}
                className="px-6 py-3 rounded-xl border border-orange-500/40 text-orange-300 text-sm font-bold hover:bg-orange-500/10"
              >
                Apply as Tech
              </button>
              <SiteLink
                to="performance"
                className="px-6 py-3 rounded-xl border border-white/15 text-slate-200 text-sm font-bold hover:bg-white/5"
              >
                Performance builds
              </SiteLink>
              <SiteLink
                to="faq"
                className="px-6 py-3 rounded-xl border border-white/15 text-slate-200 text-sm font-bold hover:bg-white/5"
              >
                FAQ
              </SiteLink>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <ScrollReveal>
        <DiagnosticCreditBanner onOpenBooking={onOpenBooking} />
      </ScrollReveal>

      <ScrollReveal variant="left">
        <ContactSection onOpenBooking={onOpenBooking} />
      </ScrollReveal>

      <ScrollReveal delayMs={40} variant="scale">
        <Testimonials />
      </ScrollReveal>
    </>
  );
};

