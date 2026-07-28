import React from 'react';
import {
  Users,
  Building2,
  Wrench,
  HeartHandshake,
  CalendarRange,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Truck,
  Globe2,
  Rocket,
} from 'lucide-react';
import { SiteLink } from '../site/SiteLink';

interface AboutUsSectionProps {
  onOpenBooking: () => void;
  onOpenRecruitment: () => void;
  onOpenPartnerApply: () => void;
}

export const AboutUsSection: React.FC<AboutUsSectionProps> = ({
  onOpenBooking,
  onOpenRecruitment,
  onOpenPartnerApply,
}) => {
  return (
    <section id="about" className="py-20 bg-[#0c0d12] border-t border-white/10 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[420px] h-[420px] bg-orange-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[360px] h-[360px] bg-amber-500/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10 space-y-14">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 border border-orange-500/30 px-3.5 py-1.5 rounded-full">
            About Adaptivity Performance
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">
            Built for drivers, shops, techs,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500">
              and the DFW community
            </span>
          </h2>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            We’re a Justin-based mobile and shop automotive network. We make it easier to keep vehicles
            maintained — by coming to you, partnering with local garages, paying technicians fairly, and
            offering flexible ways to pay so important repairs don’t get put off.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl mx-auto">
          <article className="rounded-3xl border border-white/10 bg-[#12141c] p-6 sm:p-7 space-y-3 text-left">
            <div className="w-11 h-11 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-heading text-xl font-extrabold text-white">How we serve customers</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Book mobile service to your driveway or drop off at our Justin hub / partner shops. You get
              clear quotes, card holds instead of surprise bills, live job tracking, and ASE-minded techs
              across repair, tint, audio, detailing, body work, and more.
            </p>
            <ul className="space-y-2 text-xs text-slate-300 pt-1">
              {[
                'Mobile dispatch across DFW / Fort Worth',
                'Transparent holds — charge when work is approved',
                'Garage history, receipts, and repair tracking in one place',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-3xl border border-white/10 bg-[#12141c] p-6 sm:p-7 space-y-3 text-left">
            <div className="w-11 h-11 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="font-heading text-xl font-extrabold text-white">How we grow local businesses</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Independent shops and people with garage space partner with us as host locations. We bring
              booked customers, payments, and dispatch — you provide the bay, lift, or workspace and get
              more steady work without spending on ads alone.
            </p>
            <ul className="space-y-2 text-xs text-slate-300 pt-1">
              {[
                'Listed as an approved drop-off / host location',
                'We handle booking, holds, and customer updates',
                'You keep running your shop — we send demand your way',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-3xl border border-white/10 bg-[#12141c] p-6 sm:p-7 space-y-3 text-left">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Wrench className="w-5 h-5" />
            </div>
            <h3 className="font-heading text-xl font-extrabold text-white">How we make techs more profitable</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Mobile mechanics, audio, tint, wrap, body, detailing, and performance techs keep{' '}
              <strong className="text-white">70% of labor billed</strong> (30% platform) — with Stripe
              Express payouts, Instant or Standard cash-out, and a dispatch board that matches jobs to your
              trade.
            </p>
            <ul className="space-y-2 text-xs text-slate-300 pt-1">
              {[
                '70% revenue share on completed jobs (plus 100% of tips)',
                'We find the customers — you bring tools and skill',
                'Claim jobs by specialty and get paid after capture',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-3xl border border-white/10 bg-[#12141c] p-6 sm:p-7 space-y-3 text-left">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <h3 className="font-heading text-xl font-extrabold text-white">How we serve the community</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Reliable transportation keeps people working, picking up kids, and getting to appointments.
              We focus on DFW neighborhoods — Justin, Northlake, Fort Worth, and surrounding zips — so
              maintenance stays local, honest, and reachable before small problems become roadside emergencies.
            </p>
            <ul className="space-y-2 text-xs text-slate-300 pt-1">
              {[
                'Local techs and partner shops, not a faceless call center',
                'Help drivers fix issues early instead of delaying care',
                'Emergency mobile options when plans go sideways',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>

        {/* Pay in 4 / Pay in 8 */}
        <div className="max-w-5xl mx-auto rounded-3xl border border-orange-500/30 bg-gradient-to-br from-orange-950/40 via-[#151822] to-[#12141c] p-6 sm:p-8 overflow-hidden relative">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-orange-500/20 blur-3xl rounded-full pointer-events-none" />
          <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-orange-300 bg-orange-500/10 border border-orange-500/30 px-3 py-1.5 rounded-full">
                <CalendarRange className="w-3.5 h-3.5" />
                Flexible payments
              </div>
              <h3 className="font-heading text-2xl sm:text-3xl font-black text-white leading-tight">
                Pay in 4 or longer plans — keep maintenance affordable
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Big repairs shouldn’t force people to drive unsafe cars. At final checkout we offer{' '}
                <strong className="text-white">Affirm, Afterpay, Zip, Sunbit, and Klarna</strong>. Eligible
                customers can choose <strong className="text-white">Pay in 4</strong> or{' '}
                <strong className="text-white">longer monthly plans</strong> (Sunbit 3–18 months, Affirm/Klarna
                financing — Pay in 8–style depending on approval). You get paid upfront; the customer repays
                the lender.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                <li className="flex items-center gap-2 rounded-xl bg-black/20 border border-white/5 px-3 py-2.5">
                  <span className="font-black text-orange-400 text-lg leading-none">4</span>
                  <span>Pay in 4 — Affirm, Afterpay, Zip, Klarna (typically $50–$700)</span>
                </li>
                <li className="flex items-center gap-2 rounded-xl bg-black/20 border border-white/5 px-3 py-2.5">
                  <span className="font-black text-amber-400 text-lg leading-none">8+</span>
                  <span>Longer plans — Sunbit + Affirm/Klarna monthly on larger repairs</span>
                </li>
              </ul>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Subject to lender eligibility. Enable Affirm, Afterpay, Zip, Sunbit & Klarna in Stripe →
                Payment methods (or your platform PMC). Diagnostic holds stay on a card; financing is at
                final escrow checkout.
              </p>
            </div>
            <div className="lg:col-span-5 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-[#0b0c10]/80 p-5 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Why it matters</p>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Spreading cost helps families and workers choose preventive care now — instead of waiting
                  until a breakdown costs more time and money.
                </p>
                <div className="flex items-start gap-2 text-xs text-slate-400">
                  <MapPin className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                  <span>Serving DFW / Fort Worth from our Justin garage hub and partner locations.</span>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenBooking}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm inline-flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
              >
                Book service — see payment options
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Future plans */}
        <div id="future" className="max-w-5xl mx-auto space-y-6">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full">
              <Rocket className="w-3.5 h-3.5 text-orange-400" />
              Plans for the future
            </span>
            <h3 className="font-heading text-2xl sm:text-3xl font-black text-white leading-tight">
              Where we’re headed next
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              We’re building from Justin and DFW outward — stronger tools for our team, then bigger impact
              for communities at home and around the world.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <article className="rounded-3xl border border-white/10 bg-[#12141c] p-6 sm:p-7 space-y-4 text-left relative overflow-hidden">
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full pointer-events-none" />
              <div className="relative space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
                  <Truck className="w-5 h-5" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400/90">Fleet roadmap</p>
                <h4 className="font-heading text-xl font-extrabold text-white">
                  Rentable service vans for the team
                </h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  We’re working toward a fleet of rentable vans our technicians can use on demand —
                  outfitted to carry more tools, parts, and specialty equipment for each job. That means
                  fewer trips back for gear, faster completions, and more jobs finished the same visit.
                </p>
                <ul className="space-y-2 text-xs text-slate-300 pt-1">
                  {[
                    'Stocked vans so techs roll up ready for bigger repairs',
                    'More capacity for audio, tint, performance, and mechanical kits',
                    'Lower barrier for skilled techs who don’t own a full work truck yet',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>

            <article className="rounded-3xl border border-white/10 bg-[#12141c] p-6 sm:p-7 space-y-4 text-left relative overflow-hidden">
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-sky-500/10 blur-3xl rounded-full pointer-events-none" />
              <div className="relative space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Globe2 className="w-5 h-5" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400/90">Global vision</p>
                <h4 className="font-heading text-xl font-extrabold text-white">
                  Communities near home — and people worldwide
                </h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Reliable mobility shouldn’t depend on where you live. As we grow, we want the same
                  model — fair techs, honest shops, flexible pay, and reachable maintenance — to help
                  families and workers in more cities, then more countries, keep their vehicles on the road.
                </p>
                <ul className="space-y-2 text-xs text-slate-300 pt-1">
                  {[
                    'Start local: deepen roots in DFW neighborhoods we already serve',
                    'Expand the playbook: partner shops + mobile techs in new markets',
                    'Benefit people worldwide with access to trustworthy, affordable care',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={onOpenBooking}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-sm font-bold shadow-lg shadow-orange-500/25 inline-flex items-center justify-center gap-2"
          >
            Schedule Service
            <ArrowRight className="w-4 h-4" />
          </button>
          <SiteLink
            to="services"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-white/15 text-slate-200 hover:bg-white/5 text-sm font-bold text-center"
          >
            Browse services
          </SiteLink>
          <SiteLink
            to="join"
            className="w-full sm:w-auto px-5 py-3 rounded-xl border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 text-xs font-bold text-center"
          >
            Join as Tech
          </SiteLink>
          <SiteLink
            to="wantToTeach"
            className="w-full sm:w-auto px-5 py-3 rounded-xl border border-violet-500/40 text-violet-300 hover:bg-violet-500/10 text-xs font-bold text-center"
          >
            Want to Teach
          </SiteLink>
          <button
            type="button"
            onClick={onOpenRecruitment}
            className="w-full sm:w-auto px-5 py-3 rounded-xl border border-orange-500/40 text-orange-300 hover:bg-orange-500/10 text-xs font-bold"
          >
            Apply now
          </button>
          <button
            type="button"
            onClick={onOpenPartnerApply}
            className="w-full sm:w-auto px-5 py-3 rounded-xl border border-sky-500/40 text-sky-300 hover:bg-sky-500/10 text-xs font-bold"
          >
            Partner your shop
          </button>
        </div>
      </div>
    </section>
  );
};
