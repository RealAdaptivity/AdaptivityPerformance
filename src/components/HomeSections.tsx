import React from 'react';
import {
  ArrowRight,
  BatteryCharging,
  Cog,
  Disc,
  Droplet,
  Gauge,
  Phone,
  ShieldCheck,
  Star,
  Stethoscope,
  Wrench,
} from 'lucide-react';
import { LOCAL_CITIES, LOCAL_HUB, cityPathOf } from '../site/localSeo';
import { GOOGLE_REVIEW_URL, SITE_PHONE_DISPLAY, SITE_PHONE_TEL } from '../site/seo';
import { SiteLink } from '../site/SiteLink';
import {
  BOOKABLE_SERVICE_CATALOG,
  DIAGNOSTIC_FEE_DOLLARS,
  TRAVEL_FEE_DOLLARS,
  WEATHER_FEE_NOTE,
  type ServiceKind,
} from '../services/serviceCatalog';
import {
  featuredServices,
  servicePriceLabel,
  townsForDisplay,
  type BookingPrefill,
} from '../site/homeContent';
import { StoreBadgeLinks } from './StoreBadgeLinks';

type OnBook = (prefill: BookingPrefill, source: string) => void;

/* Every figure on the homepage comes from the data the rest of the site runs
   on — the call-out from the catalog, the radius and towns from the coverage
   data — so the page cannot drift from what the booking form charges or the
   dispatcher accepts. verify-production-ops fails the build if a literal
   sneaks back in. */
const FEE = `$${DIAGNOSTIC_FEE_DOLLARS}`;
const RADIUS = LOCAL_HUB.radiusMiles;
/** One flat service fee on every mobile visit, wherever it is in the radius. */
const TRAVEL = `$${TRAVEL_FEE_DOLLARS}`;

const SERVICE_ICON: Partial<Record<ServiceKind, React.ReactNode>> = {
  diagnostic: <Stethoscope className="w-6 h-6" aria-hidden="true" />,
  battery: <BatteryCharging className="w-6 h-6" aria-hidden="true" />,
  oil_change: <Droplet className="w-6 h-6" aria-hidden="true" />,
  brakes: <Disc className="w-6 h-6" aria-hidden="true" />,
  transmission_oil: <Cog className="w-6 h-6" aria-hidden="true" />,
  differential: <Gauge className="w-6 h-6" aria-hidden="true" />,
};

const sectionHeading = 'font-heading font-bold text-white tracking-[-0.03em]';

/** What the call-out buys, before anything else is asked of the reader. */
export const PriceBand: React.FC = () => (
  <section aria-labelledby="price-heading" className="container mx-auto max-w-7xl px-4 sm:px-6 pt-12 lg:pt-14">
    <h2 id="price-heading" className="sr-only">
      What a visit costs
    </h2>
    <div className="grid gap-4 md:grid-cols-3 md:gap-5">
      <div className="rounded-[18px] border border-white/[0.09] bg-[#12141c] p-6 sm:p-7">
        <p className="font-heading text-4xl font-bold tracking-[-0.04em] text-brand">{FEE}</p>
        <h3 className="mt-2.5 text-[17px] font-bold text-white">diagnostic visit</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Plus a flat {TRAVEL} service fee anywhere within {RADIUS} miles of{' '}
          {LOCAL_HUB.city}. Both paid in person — no card to book.
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-500">
          {WEATHER_FEE_NOTE} Members pay neither fee.
        </p>
      </div>
      <div className="rounded-[18px] border border-white/[0.09] bg-[#12141c] p-6 sm:p-7">
        <p className="font-heading text-4xl font-bold tracking-[-0.04em] text-white">Then</p>
        <h3 className="mt-2.5 text-[17px] font-bold text-white">you get a straight answer</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          A certified tech diagnoses it on the spot and tells you what it is, what it takes and
          what it costs.
        </p>
      </div>
      <div className="rounded-[18px] border border-white/[0.09] bg-[#12141c] p-6 sm:p-7">
        <p className="font-heading text-4xl font-bold tracking-[-0.04em] text-white">You</p>
        <h3 className="mt-2.5 text-[17px] font-bold text-white">decide before we start</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Nothing is done to the vehicle without your say-so, and you get an itemised invoice for
          what was.
        </p>
      </div>
    </div>
  </section>
);

/** The four jobs people most often need done in a driveway. The catalog has
 *  far more than a homepage can show well, so the rest sit behind the fifth
 *  card; its count comes from the catalog so it cannot go stale. */
const FEATURED_SERVICE_IDS = ['diagnostic', 'brakes', 'battery', 'oil_change'];

/** Cards come from the bookable catalog, not a copy of it: retire a service
 *  there and its card goes too. */
export const ServicesGrid: React.FC<{ onBook: OnBook }> = ({ onBook }) => (
  <section id="services" aria-labelledby="services-heading" className="container mx-auto max-w-7xl px-4 sm:px-6 pt-14 lg:pt-16 scroll-mt-24">
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <h2 id="services-heading" className={`${sectionHeading} text-3xl sm:text-[38px]`}>
        What we fix in your driveway
      </h2>
      <a href={SITE_PHONE_TEL} className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-brand-soft hover:text-white">
        Something else? Call us <ArrowRight className="w-4 h-4" aria-hidden="true" />
      </a>
    </div>

    <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {featuredServices(BOOKABLE_SERVICE_CATALOG, FEATURED_SERVICE_IDS).map((service) => (
        <li key={service.id}>
          <button
            type="button"
            onClick={() => onBook({ services: [service.title] }, 'home_service_card')}
            className="group flex h-full w-full flex-col rounded-2xl border border-white/[0.09] bg-[#12141c] p-5 text-left transition-colors hover:border-brand/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
          >
            <span className="text-brand">{SERVICE_ICON[service.kind] ?? <Wrench className="w-6 h-6" aria-hidden="true" />}</span>
            <span className="mt-4 text-base font-bold leading-snug text-white">{service.title}</span>
            <span className="mt-2 flex-1 text-[13px] leading-relaxed text-slate-400">{service.description}</span>
            <span className="mt-4 flex items-center justify-between gap-2">
              <span className="text-[13px] font-bold text-brand-soft">{servicePriceLabel(service)}</span>
              <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-400 group-hover:text-white">
                Book <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
            </span>
          </button>
        </li>
      ))}
      <li>
        <SiteLink
          to="services"
          className="group flex h-full min-h-[180px] w-full flex-col justify-between rounded-2xl border border-dashed border-white/[0.16] p-5 transition-colors hover:border-brand/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
        >
          <span className="text-base font-bold leading-snug text-white">
            See all {BOOKABLE_SERVICE_CATALOG.length} services
          </span>
          <span className="mt-2 flex-1 text-[13px] leading-relaxed text-slate-400">
            Every service we book, with what each one costs to start.
          </span>
          <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-bold text-brand-soft group-hover:text-white">
            All services <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </span>
        </SiteLink>
      </li>
    </ul>
  </section>
);

export const HowItWorks: React.FC = () => (
  <section id="how" aria-labelledby="how-heading" className="container mx-auto max-w-7xl px-4 sm:px-6 pt-14 lg:pt-16 scroll-mt-24">
    <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-5">
      <h2 id="how-heading" className={`${sectionHeading} text-3xl sm:text-[38px] leading-[1.1]`}>
        Three steps,
        <br className="hidden lg:block" /> no phone tag
      </h2>
      <ol className="grid gap-6 sm:grid-cols-3 sm:gap-5">
        <li className="border-t-[3px] border-brand pt-5">
          <span className="font-heading text-[13px] font-bold tracking-[0.1em] text-brand">STEP 01</span>
          <h3 className="mt-3 text-xl font-bold text-white">Book in about a minute</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Tell us the vehicle, the address and what it’s doing. Add photos or a video of the noise
            if you have them.
          </p>
        </li>
        <li className="border-t-[3px] border-white/[0.16] pt-5">
          <span className="font-heading text-[13px] font-bold tracking-[0.1em] text-slate-400">STEP 02</span>
          <h3 className="mt-3 text-xl font-bold text-white">A certified tech comes out</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            You get a booking reference straight away and can follow the job from your customer
            portal.
          </p>
        </li>
        <li className="border-t-[3px] border-white/[0.16] pt-5">
          <span className="font-heading text-[13px] font-bold tracking-[0.1em] text-slate-400">STEP 03</span>
          <h3 className="mt-3 text-xl font-bold text-white">Fixed where it sits</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            You approve the price before a single bolt is turned, and get an itemised invoice when
            it’s done.
          </p>
        </li>
      </ol>
    </div>
  </section>
);

/** How many towns to name before "+N more". Enough to include every town
 *  within about 25 minutes; the rest are one click away on the coverage page. */
const TOWNS_SHOWN = 28;

export const CoverageSection: React.FC = () => {
  const { towns, remaining, total } = townsForDisplay(LOCAL_CITIES, TOWNS_SHOWN);
  return (
    <section
      id="coverage"
      aria-labelledby="coverage-heading"
      className="mt-14 lg:mt-16 border-y border-white/[0.08] bg-[#0e1016] scroll-mt-24"
    >
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-10 lg:py-12 grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-12">
        <div>
          <h2 id="coverage-heading" className={`${sectionHeading} text-3xl sm:text-[34px] leading-[1.12]`}>
            {total} towns, {RADIUS} miles
            <br className="hidden lg:block" /> around {LOCAL_HUB.city}
          </h2>
          <p className="mt-3.5 text-[15px] leading-relaxed text-slate-400">
            The service fee is a flat {TRAVEL} everywhere on this list — the same whether you’re next door or at the
            edge of the radius.
          </p>
          <a href="#book" className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-bold text-brand-soft hover:text-white">
            Check your ZIP <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </a>
        </div>
        <ul className="columns-2 sm:columns-3 lg:columns-4 gap-x-7 text-sm leading-[2.1]">
          {towns.map((town) => (
            <li key={town.slug} className="break-inside-avoid">
              <a href={cityPathOf(town.slug)} className="text-slate-300 hover:text-white">
                {town.city}
              </a>
            </li>
          ))}
          {remaining > 0 && (
            <li className="break-inside-avoid">
              <SiteLink to="coverage" className="font-semibold text-brand-soft hover:text-white">
                + {remaining} more
              </SiteLink>
            </li>
          )}
        </ul>
      </div>
    </section>
  );
};

export const TrustBand: React.FC = () => (
  <section id="warranty" aria-label="Warranty and reviews" className="container mx-auto max-w-7xl px-4 sm:px-6 pt-12 lg:pt-14 scroll-mt-24">
    <div className="grid gap-4 md:grid-cols-2 md:gap-5">
      <div className="flex gap-4 rounded-[18px] border border-brand/35 bg-[#12141c] p-6 sm:p-7">
        <ShieldCheck className="mt-0.5 w-7 h-7 shrink-0 text-brand" aria-hidden="true" />
        <div>
          <h3 className="font-heading text-[22px] font-bold tracking-tight text-white">12 months / 12,000 miles</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Parts and labour on the work we do, whichever comes first. If it goes wrong, we come
            back out.
          </p>
        </div>
      </div>
      <div className="flex gap-4 rounded-[18px] border border-white/[0.09] bg-[#12141c] p-6 sm:p-7">
        <Star className="mt-0.5 w-7 h-7 shrink-0 text-brand-soft" aria-hidden="true" />
        <div>
          <h3 className="font-heading text-[22px] font-bold tracking-tight text-white">Reviews, unedited</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            We don’t print testimonials on our own site. Read what {LOCAL_HUB.city}-area drivers
            actually wrote, on Google.
          </p>
          <a
            href={GOOGLE_REVIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-bold text-brand-soft hover:text-white"
          >
            Read our Google reviews <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  </section>
);

/** A second way into the pages the old homepage promoted. Membership matters
 *  most: the footer does not link it, so without this row it would have no
 *  way in from the homepage at all. */
export const MoreLinks: React.FC = () => (
  <section aria-label="More from Adaptivity" className="container mx-auto max-w-7xl px-4 sm:px-6 pt-12 lg:pt-14">
    <div className="flex flex-col gap-6 rounded-[18px] border border-white/[0.08] bg-[#0e1016] p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Also from Adaptivity</p>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold">
          <li><SiteLink to="membership" className="inline-flex min-h-[40px] items-center text-slate-200 hover:text-brand-soft">VIP membership</SiteLink></li>
          <li><SiteLink to="partners" className="inline-flex min-h-[40px] items-center text-slate-200 hover:text-brand-soft">Partner shops</SiteLink></li>
          <li><SiteLink to="performance" className="inline-flex min-h-[40px] items-center text-slate-200 hover:text-brand-soft">Performance builds</SiteLink></li>
          <li><SiteLink to="join" className="inline-flex min-h-[40px] items-center text-slate-200 hover:text-brand-soft">Join as a tech</SiteLink></li>
          <li><SiteLink to="learn" className="inline-flex min-h-[40px] items-center text-slate-200 hover:text-brand-soft">Want to learn</SiteLink></li>
          <li><SiteLink to="faq" className="inline-flex min-h-[40px] items-center text-slate-200 hover:text-brand-soft">FAQ</SiteLink></li>
        </ul>
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Get the customer app</p>
        <StoreBadgeLinks className="mt-3" />
      </div>
    </div>
  </section>
);

export const FinalCta: React.FC<{ onBook: OnBook }> = ({ onBook }) => (
  <section aria-labelledby="final-cta-heading" className="mt-12 lg:mt-14 bg-brand">
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-10 lg:py-12 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h2 id="final-cta-heading" className="font-heading text-[28px] sm:text-[32px] font-bold leading-tight tracking-[-0.03em] text-[#0b0c10]">
          Not sure what’s wrong? That’s the {FEE}.
        </h2>
        <p className="mt-1.5 text-[15px] font-medium text-[#0b0c10]/80">
          Call and talk to a person, or book online and pick a time that suits you.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <a
          href={SITE_PHONE_TEL}
          className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-[#0b0c10] px-7 text-base font-bold text-white hover:bg-black"
        >
          <Phone className="w-4 h-4" aria-hidden="true" /> Call {SITE_PHONE_DISPLAY}
        </a>
        <button
          type="button"
          onClick={() => onBook({}, 'home_final_cta')}
          className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border-[1.5px] border-[#0b0c10]/50 bg-[#0b0c10]/[0.08] px-7 text-base font-bold text-[#0b0c10] hover:bg-[#0b0c10]/[0.14]"
        >
          Book online <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  </section>
);
