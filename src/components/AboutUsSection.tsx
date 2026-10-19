import React from 'react';
import { LOCAL_HUB } from '../site/localSeo';
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  ClipboardCheck,
  MapPin,
  Phone,
  ReceiptText,
  ShieldCheck,
  Star,
  Wrench,
} from 'lucide-react';
import { SiteLink } from '../site/SiteLink';
import { BUSINESS_HOURS, GOOGLE_RATING, GOOGLE_REVIEW_URL, SITE_PHONE_DISPLAY, SITE_PHONE_TEL } from '../site/seo';
import {
  DIAGNOSTIC_FEE_DOLLARS,
  FIRST_RESPONDER_DISCOUNT_NOTE,
  LABOR_RATE_PER_HOUR_DOLLARS,
  PARTS_PICKUP_NOTE,
  TRAVEL_FEE_DOLLARS,
  WEATHER_FEE_NOTE,
} from '../services/serviceCatalog';
import { EUROPEAN_LABOR_RATE_PER_HOUR_DOLLARS } from '../services/europeanRate';
import { WorkPhotoGallery } from './WorkPhotoGallery';

interface AboutUsSectionProps {
  onOpenBooking: () => void;
  onOpenRecruitment: () => void;
  onOpenPartnerApply: () => void;
}

/**
 * About, written for the person whose car needs fixing: who we are, how a
 * visit goes, what it costs and what is covered. How techs are paid and where
 * the company is headed belong on the Careers and Partners pages, not here.
 */
export const AboutUsSection: React.FC<AboutUsSectionProps> = ({
  onOpenBooking,
  onOpenRecruitment,
  onOpenPartnerApply,
}) => {
  const radius = LOCAL_HUB.radiusMiles;

  const facts = [
    { icon: <Star className="w-4 h-4 text-amber-400 fill-amber-400" />, label: `${GOOGLE_RATING} on Google`, href: GOOGLE_REVIEW_URL },
    { icon: <BadgeCheck className="w-4 h-4 text-orange-400" />, label: 'ASE-certified technicians' },
    { icon: <ShieldCheck className="w-4 h-4 text-orange-400" />, label: '12-month / 12,000-mile warranty' },
    { icon: <MapPin className="w-4 h-4 text-orange-400" />, label: `Within ${radius} miles of ${LOCAL_HUB.city}` },
  ];

  const steps = [
    {
      icon: <CalendarCheck className="w-5 h-5 text-orange-400" />,
      title: 'Book a time',
      body: `Online in about a minute, or call ${SITE_PHONE_DISPLAY}. Tell us the vehicle, where it is and what it’s doing.`,
    },
    {
      icon: <Wrench className="w-5 h-5 text-orange-400" />,
      title: 'A technician comes to you',
      body: `An ASE-certified tech arrives with the tools and diagnoses it where it sits — at home, at work, wherever it’s parked.`,
    },
    {
      icon: <ClipboardCheck className="w-5 h-5 text-orange-400" />,
      title: 'You approve the price first',
      body: 'You hear what’s wrong, what it takes and what it costs. Nothing is repaired until you say yes.',
    },
    {
      icon: <ReceiptText className="w-5 h-5 text-orange-400" />,
      title: 'Pay and get an itemized invoice',
      body: 'Pay in person by card, cash or Zelle when the work is done, or over time with Affirm or Klarna. Your invoice lists every part and every hour.',
    },
  ];

  const prices = [
    { label: 'Diagnostic visit', value: `$${DIAGNOSTIC_FEE_DOLLARS}` },
    { label: `Travel, anywhere within ${radius} miles`, value: `$${TRAVEL_FEE_DOLLARS} flat` },
    { label: 'Labor', value: `$${LABOR_RATE_PER_HOUR_DOLLARS}/hr` },
    { label: 'Labor on European vehicles', value: `$${EUROPEAN_LABOR_RATE_PER_HOUR_DOLLARS}/hr` },
  ];

  return (
    <section id="about" className="py-20 bg-[#0c0d12] border-t border-white/10 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[420px] h-[420px] bg-orange-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10 max-w-5xl space-y-14">
        <header className="max-w-3xl mx-auto text-center space-y-4">
          <span className="inline-block text-[11px] font-bold uppercase tracking-[0.14em] text-orange-400 bg-orange-500/10 border border-orange-500/30 px-3 py-1 rounded-full">
            About Adaptivity Performance
          </span>
          <h1 className="font-heading text-3xl sm:text-5xl font-extrabold text-white leading-tight">
            Auto repair that <span className="text-orange-500">comes to you</span>
          </h1>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            We’re a mobile-only auto repair company based in {LOCAL_HUB.city}, Texas. Our ASE-certified
            technicians bring the tools and the parts to your driveway or workplace anywhere within {radius}{' '}
            miles — so you don’t lose a day to a waiting room or a tow.
          </p>
          <ul className="flex flex-wrap justify-center gap-2.5 pt-2" aria-label="At a glance">
            {facts.map((f) => (
              <li key={f.label}>
                {f.href ? (
                  <a
                    href={f.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-[#171a21] px-4 py-2 text-[13px] font-semibold text-slate-200 hover:border-amber-400/60"
                  >
                    {f.icon}
                    {f.label}
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.09] bg-[#171a21] px-4 py-2 text-[13px] font-semibold text-slate-200">
                    {f.icon}
                    {f.label}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </header>

        <div className="space-y-5">
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-white">How a visit works</h2>
          <ol className="grid sm:grid-cols-2 gap-4">
            {steps.map((s, i) => (
              <li key={s.title} className="rounded-2xl border border-white/10 bg-[#12141c] p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-center">
                    {s.icon}
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Step {i + 1}</span>
                </div>
                <h3 className="text-lg font-bold text-white">{s.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-white">Our work</h2>
            <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
              Photos our technicians took on a recent job, done start to finish in the customer’s driveway.
            </p>
          </div>
          <WorkPhotoGallery wideWidthPx={185} />
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-[#12141c] p-6 sm:p-7 space-y-4">
            <h2 className="font-heading text-2xl font-extrabold text-white">Straight pricing</h2>
            <dl className="divide-y divide-white/5">
              {prices.map((p) => (
                <div key={p.label} className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="text-sm text-slate-300">{p.label}</dt>
                  <dd className="text-base font-bold text-white tabular-nums">{p.value}</dd>
                </div>
              ))}
            </dl>
            <ul className="space-y-2 text-xs text-slate-400 leading-relaxed">
              <li>
                <strong className="text-slate-200">Pay over time:</strong> Affirm, Klarna and other pay-later plans
                on qualifying repairs, subject to lender approval — ask your tech when you pay.
              </li>
              <li>{PARTS_PICKUP_NOTE}</li>
              <li>{WEATHER_FEE_NOTE}</li>
              <li className="text-emerald-300/90">{FIRST_RESPONDER_DISCOUNT_NOTE}</li>
            </ul>
          </div>

          <div id="warranty" className="scroll-mt-24 rounded-2xl border border-orange-500/25 bg-gradient-to-br from-orange-500/[0.07] to-[#12141c] p-6 sm:p-7 space-y-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-orange-400" aria-hidden="true" />
              <h2 className="font-heading text-2xl font-extrabold text-white">Our warranty</h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Parts and labor we supply are covered for <strong className="text-white">12 months or 12,000 miles</strong>,
              whichever comes first. If something we fixed goes wrong, call us and we come back out.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Parts you supply yourself aren’t covered. Full details are in our{' '}
              <SiteLink to="refunds" className="text-orange-400 hover:underline">
                refund &amp; warranty policy
              </SiteLink>
              .
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#12141c] p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <h2 className="font-heading text-2xl font-extrabold text-white">Where and when</h2>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xl">
              Every day, {BUSINESS_HOURS.label}, anywhere within {radius} miles of {LOCAL_HUB.city} — Northlake,
              Argyle, Denton, Keller, Haslet, Roanoke and more.{' '}
              <SiteLink to="coverage" className="text-orange-400 hover:underline">
                See the full service area
              </SiteLink>
              .
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenBooking}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold"
            >
              Book a visit <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
            <a
              href={SITE_PHONE_TEL}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/15 text-slate-200 hover:border-orange-500/50 text-sm font-bold"
            >
              <Phone className="w-4 h-4" aria-hidden="true" /> {SITE_PHONE_DISPLAY}
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500">
          Technician looking for work?{' '}
          <button type="button" onClick={onOpenRecruitment} className="text-slate-300 hover:text-orange-400 underline-offset-2 hover:underline">
            Join the team
          </button>
          {' · '}
          Garage or fleet owner?{' '}
          <button type="button" onClick={onOpenPartnerApply} className="text-slate-300 hover:text-orange-400 underline-offset-2 hover:underline">
            Partner with us
          </button>
        </p>
      </div>
    </section>
  );
};
