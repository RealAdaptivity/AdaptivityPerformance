import React from 'react';
import {
  ArrowRight,
  Award,
  Building2,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  Layers,
  MapPin,
  ShieldCheck,
  Truck,
  User,
  UserPlus,
  Wrench,
} from 'lucide-react';
import { TechRecruitmentSection } from '../components/TechRecruitmentSection';
import { SiteLink } from '../site/SiteLink';
import {
  TECH_INSURANCE_RECOMMENDATION,
  TECH_LIABILITY_SUMMARY,
} from '../content/contractorLiability';

type Props = {
  onOpenRecruitment: () => void;
  onOpenPartnerApply: () => void;
};

const STEPS = [
  {
    n: '01',
    title: 'Apply online',
    body: 'Tell us your trades, tools, experience, pay preference, and whether you want multi-job or standalone dispatch.',
  },
  {
    n: '02',
    title: 'Quick review & tool check',
    body: 'We review your application, confirm you meet the basics, and may schedule a short tool audit / ride-along.',
  },
  {
    n: '03',
    title: 'Set up payouts',
    body: 'Once approved, create your tech login and connect Stripe Express so labor + tips go straight to you.',
  },
  {
    n: '04',
    title: 'Claim jobs & get paid',
    body: 'Jobs matching your specialties show on the board. Claim, complete, capture — we handle customers and payments.',
  },
];

const REQUIREMENTS = [
  {
    title: 'Experience',
    items: [
      'Typically 2+ years professional experience in your trade (shop, mobile, or dealership)',
      'Comfortable working independently at customer locations or partner shops',
      'Able to diagnose, quote clearly, and finish work safely the first visit when possible',
      'ASE certs are a plus (not always required for every trade — list what you hold)',
    ],
  },
  {
    title: 'Tools & equipment',
    items: [
      'Your own hand tools and power tools for your specialty',
      'Mechanical techs: OBD scanner, jack/stands, impacts, torque wrenches, fluid catch, etc.',
      'Trade-specific kits for audio, tint, wrap, detailing, glass, tires, body, or performance',
      'Reliable way to carry tools to the job (truck, van, or utility rig preferred)',
    ],
  },
  {
    title: 'Vehicle & coverage',
    items: [
      'Valid driver’s license and reliable transportation for DFW / Fort Worth jobs',
      'Ability to work from a home base zip we can dispatch near (Justin hub: 76247)',
      'Willingness to text customers when you’re on the way and keep status updated',
    ],
  },
  {
    title: 'Business basics',
    items: [
      'Able to work as an independent contractor (1099) on our platform',
      'Adaptivity is not liable for accidents or damage you cause on a job — you are',
      'Insurance for tools / liability is strongly recommended (not required to join)',
      'Customers are told before the diagnostic hold that the working tech is responsible for damage they cause',
      'Stripe Express payout account (we walk you through Connect after approval)',
      'Professional communication with customers — you’re the face of Adaptivity on site',
      'No side cash / Zelle for Adaptivity jobs — all payments stay in-app',
    ],
  },
];
const APPLY_NEEDS = [
  'Full name, mobile phone, and email',
  'Home / service-base ZIP code',
  'Years of experience + trade specialties (select all that apply)',
  'Whether you own a truck / van / utility rig',
  'Tool inventory checklist for your trade',
  'ASE certs (if any)',
  'Pay preference: 70/30 revenue share or hourly base',
  'Work style: Multi-job or Standalone (changeable later in Settings)',
];

const TRADES = [
  'Mechanical / ASE',
  'Tires & wheels',
  'Auto glass',
  'Body work',
  'Mobile detailing',
  'Mods / accessories',
  'Car audio',
  'Window tint',
  'Wrap / PPF',
  'Performance',
];

export const JoinAsTechPage: React.FC<Props> = ({ onOpenRecruitment, onOpenPartnerApply }) => {
  return (
    <div className="bg-[#0b0c10]">
      {/* Hero */}
      <section className="pt-14 pb-12 border-b border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[420px] h-[420px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10 max-w-4xl text-center space-y-5">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 rounded-full">
            <UserPlus className="w-3.5 h-3.5" />
            Join Adaptivity as a tech
          </span>
          <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">
            Bring your skill.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-amber-400 to-orange-500">
              We bring the customers.
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Adaptivity is a DFW / Fort Worth mobile + shop network. Independent techs claim jobs by trade,
            keep 70% of labor billed (30% to Adaptivity), and get paid through Stripe — Instant or Standard.
            Start as a normal tech; as you complete jobs and grow your own shop or business, you can advance
            into a partnered host with us. Already own a shop or garage? You can partner as a host sooner.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onOpenRecruitment}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold text-sm inline-flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
            >
              Start tech application
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onOpenPartnerApply}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-sky-500/40 text-sky-300 font-bold text-sm hover:bg-sky-500/10 inline-flex items-center justify-center gap-2"
            >
              <Building2 className="w-4 h-4" />
              Partner your business
            </button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 border-b border-white/10">
        <div className="container mx-auto px-4 max-w-5xl space-y-8">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="font-heading text-2xl sm:text-3xl font-black text-white">How it works</h2>
            <p className="text-sm text-slate-400">
              From application to first payout — simple, transparent, and built for independent techs.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {STEPS.map((step) => (
              <article
                key={step.n}
                className="rounded-2xl border border-white/10 bg-[#12141c] p-5 sm:p-6 text-left space-y-2"
              >
                <span className="text-xs font-black text-orange-400 font-mono">{step.n}</span>
                <h3 className="font-heading text-lg font-extrabold text-white">{step.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Experience & requirements */}
      <section className="py-16 border-b border-white/10 bg-[#0c0d12]">
        <div className="container mx-auto px-4 max-w-5xl space-y-8">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="font-heading text-2xl sm:text-3xl font-black text-white">
              What’s required to become a tech
            </h2>
            <p className="text-sm text-slate-400">
              We’re looking for skilled, reliable tradespeople who already have the experience and tools to
              do the job right — we supply the demand, dispatch, and payments.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {REQUIREMENTS.map((block) => (
              <article
                key={block.title}
                className="rounded-2xl border border-white/10 bg-[#12141c] p-5 sm:p-6 space-y-3 text-left"
              >
                <h3 className="font-heading text-lg font-extrabold text-white flex items-center gap-2">
                  {block.title === 'Experience' && <Award className="w-5 h-5 text-amber-400" />}
                  {block.title === 'Tools & equipment' && <Wrench className="w-5 h-5 text-orange-400" />}
                  {block.title === 'Vehicle & coverage' && <Truck className="w-5 h-5 text-sky-400" />}
                  {block.title === 'Business basics' && <ShieldCheck className="w-5 h-5 text-emerald-400" />}
                  {block.title}
                </h3>
                <ul className="space-y-2">
                  {block.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 sm:p-6 space-y-2 text-left">
            <h3 className="font-heading text-lg font-extrabold text-amber-300 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              Liability &amp; insurance (read before you apply)
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">{TECH_LIABILITY_SUMMARY}</p>
            <p className="text-sm text-slate-400 leading-relaxed">{TECH_INSURANCE_RECOMMENDATION}</p>
          </div>
        </div>
      </section>

      {/* What you need to apply */}
      <section className="py-16 border-b border-white/10">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-3">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-orange-300 bg-orange-500/10 border border-orange-500/30 px-3 py-1.5 rounded-full">
                <ClipboardList className="w-3.5 h-3.5" />
                Application checklist
              </div>
              <h2 className="font-heading text-2xl sm:text-3xl font-black text-white">
                What you need to apply
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                The form takes a few minutes. Have this ready so we can review you quickly and get you on the
                board.
              </p>
              <button
                type="button"
                onClick={onOpenRecruitment}
                className="mt-2 px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold inline-flex items-center gap-2"
              >
                Open application
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <ul className="lg:col-span-7 rounded-2xl border border-white/10 bg-[#12141c] p-5 sm:p-6 space-y-3">
              {APPLY_NEEDS.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Work style + pay */}
      <section className="py-16 border-b border-white/10 bg-[#0c0d12]">
        <div className="container mx-auto px-4 max-w-5xl space-y-8">
          <div className="text-center space-y-2">
            <h2 className="font-heading text-2xl sm:text-3xl font-black text-white">
              How you work & how you get paid
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl mx-auto">
              Choose multi-job or standalone when you apply — switch anytime later in Settings.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <article className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 sm:p-6 space-y-2 text-left">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Layers className="w-5 h-5" />
                Multi-job
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                Claim several active dispatches. Best if you want volume and can juggle routing across DFW.
              </p>
            </article>
            <article className="rounded-2xl border border-sky-500/30 bg-sky-950/20 p-5 sm:p-6 space-y-2 text-left">
              <div className="flex items-center gap-2 text-sky-400 font-bold">
                <User className="w-5 h-5" />
                Standalone (single)
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                One active job at a time. Finish or release before claiming the next — change this anytime.
              </p>
            </article>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="rounded-2xl border border-white/10 bg-[#12141c] p-5 space-y-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-white">70% labor + 100% tips</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Revenue-share techs keep 70% of labor billed (30% to Adaptivity). Tips go fully to you. Platform handles checkout.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#12141c] p-5 space-y-2">
              <ShieldCheck className="w-5 h-5 text-orange-400" />
              <h3 className="font-bold text-white">Hourly option available</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Prefer a base rate? Choose guaranteed hourly during apply — still 100% of tips.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#12141c] p-5 space-y-2">
              <MapPin className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white">Instant or Standard cash-out</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Stripe Express: Standard bank (~2 days) or Instant to debit (~30 min, small fee).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trades */}
      <section className="py-16 border-b border-white/10">
        <div className="container mx-auto px-4 max-w-5xl space-y-6 text-center">
          <h2 className="font-heading text-2xl sm:text-3xl font-black text-white">Trades we hire</h2>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto">
            If it involves cars, we want you. Jobs are matched to the specialties you save in Settings.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {TRADES.map((t) => (
              <span
                key={t}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border border-white/10 bg-white/5 text-slate-200"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Partner business path */}
      <section className="py-16 border-b border-white/10 bg-[#0c0d12]">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="rounded-3xl border border-sky-500/30 bg-gradient-to-br from-sky-950/40 via-[#12141c] to-[#0b0c10] p-6 sm:p-8 overflow-hidden relative">
            <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4 text-left">
                <div className="inline-flex items-center gap-2 text-xs font-bold text-sky-300 bg-sky-500/10 border border-sky-500/30 px-3 py-1.5 rounded-full">
                  <Building2 className="w-3.5 h-3.5" />
                  Partnered business option
                </div>
                <h2 className="font-heading text-2xl sm:text-3xl font-black text-white leading-tight">
                  Own a shop, bay, or garage? Partner with us.
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  You don’t have to be a solo mobile tech. Local businesses — independent shops, people with
                  garage space, or lift-equipped spaces — can join as <strong className="text-white">partner
                  host locations</strong>. We send booked customers for drop-off and heavier work; you provide
                  the space (and optionally your own techs). Booking, card holds, tracking, and payments stay
                  on Adaptivity.
                </p>
                <ul className="space-y-2 text-sm text-slate-300">
                  {[
                    'Get more clients without carrying the whole marketing funnel alone',
                    'Listed as an approved drop-off / host location on our network',
                    'Keep running your business — we route demand to you',
                    'Techs can work mobile, at our Justin hub, or at partner locations',
                    'Solo techs can level up to partner status after strong completed-job history and building out their own shop / business',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="lg:col-span-5 space-y-3">
                <div className="rounded-2xl border border-white/10 bg-[#0b0c10]/80 p-5 space-y-3 text-left">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Two paths — and a ladder</p>
                  <p className="text-sm text-slate-300">
                    <strong className="text-white">Tech:</strong> claim jobs, bring tools, get paid per job.
                  </p>
                  <p className="text-sm text-slate-300">
                    <strong className="text-white">Partner business:</strong> host space / shop, receive
                    booked clients through Adaptivity.
                  </p>
                  <p className="text-sm text-slate-300 leading-relaxed border-t border-white/10 pt-3">
                    <strong className="text-white">Start as a tech → grow into a partner.</strong> A normal
                    tech can become a partnered business with us in the future based on completed jobs,
                    reliability on the platform, and advancement in your own shop or business — when you’re
                    ready to host space or scale beyond solo dispatch.
                  </p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Apply as a tech today. When your volume and setup are ready, we’ll invite you (or you can
                    apply) to join as a host partner — no need to choose both on day one.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenPartnerApply}
                  className="w-full py-3.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm inline-flex items-center justify-center gap-2"
                >
                  Apply to partner your business
                  <ArrowRight className="w-4 h-4" />
                </button>
                <SiteLink
                  to="partners"
                  className="block w-full py-3 rounded-xl border border-white/15 text-slate-200 text-sm font-bold text-center hover:bg-white/5"
                >
                  See partner locations
                </SiteLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Existing recruitment CTA band */}
      <TechRecruitmentSection onOpenRecruitment={onOpenRecruitment} />
    </div>
  );
};
