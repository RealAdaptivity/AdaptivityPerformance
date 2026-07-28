import React from 'react';
import {
  ArrowRight,
  Briefcase,
  Building2,
  Clock,
  GraduationCap,
  Headset,
  LayoutDashboard,
  UserPlus,
} from 'lucide-react';
import { SiteLink } from '../site/SiteLink';

type Props = {
  onOpenRecruitment: () => void;
  onOpenPartnerApply: () => void;
};

export const CareersPage: React.FC<Props> = ({ onOpenRecruitment, onOpenPartnerApply }) => {
  return (
    <div className="bg-[#0b0c10]">
      <section className="pt-14 pb-12 border-b border-white/10 relative overflow-hidden">
        <div className="absolute top-10 left-1/4 w-72 h-72 bg-orange-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10 max-w-3xl text-center space-y-4">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 border border-orange-500/30 px-3.5 py-1.5 rounded-full">
            <Briefcase className="w-3.5 h-3.5" />
            Careers at Adaptivity
          </span>
          <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">
            Build with us —{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">
              now and next
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            We’re hiring independent techs and partner shops today. As we grow, we’ll add full team roles
            like customer support and dispatch admin so drivers and techs get even faster help.
          </p>
        </div>
      </section>

      {/* Open now */}
      <section className="py-14 border-b border-white/10">
        <div className="container mx-auto px-4 max-w-5xl space-y-6">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Open now</p>
            <h2 className="font-heading text-2xl font-black text-white">Roles you can join today</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <article className="rounded-2xl border border-amber-500/30 bg-[#12141c] p-6 space-y-3 text-left md:col-span-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h3 className="font-heading text-xl font-extrabold text-white">Want to Learn — paid training</h3>
              <p className="text-sm text-slate-400 leading-relaxed max-w-3xl">
                In school or new to the trade? Pay for training, learn hands-on skills, then work toward
                becoming a full Adaptivity tech when you meet our readiness bar.
              </p>
              <SiteLink
                to="learn"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold"
              >
                Explore Want to Learn <ArrowRight className="w-3.5 h-3.5" />
              </SiteLink>
            </article>
            <article className="rounded-2xl border border-emerald-500/30 bg-[#12141c] p-6 space-y-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <UserPlus className="w-5 h-5" />
              </div>
              <h3 className="font-heading text-xl font-extrabold text-white">Mobile / shop technician</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Independent contractor. Claim jobs by trade, keep most of the labor + tips, Instant or
                Standard payouts. Multi-job or standalone — and a path to become a partner later.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={onOpenRecruitment}
                  className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  Apply as tech <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <SiteLink
                  to="join"
                  className="px-4 py-2.5 rounded-xl border border-white/15 text-slate-200 text-xs font-bold hover:bg-white/5"
                >
                  Full requirements
                </SiteLink>
                <SiteLink
                  to="wantToTeach"
                  className="px-4 py-2.5 rounded-xl border border-violet-500/40 text-violet-300 text-xs font-bold hover:bg-violet-500/10"
                >
                  Want to Teach
                </SiteLink>
              </div>
            </article>

            <article className="rounded-2xl border border-sky-500/30 bg-[#12141c] p-6 space-y-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="font-heading text-xl font-extrabold text-white">Partner shop / garage host</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Own a bay, shop, or garage space? Host booked customers — we handle booking, holds, and
                dispatch. Techs can also grow into partner status over time.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={onOpenPartnerApply}
                  className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  Partner apply <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <SiteLink
                  to="partners"
                  className="px-4 py-2.5 rounded-xl border border-white/15 text-slate-200 text-xs font-bold hover:bg-white/5"
                >
                  Partner network
                </SiteLink>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Coming later */}
      <section className="py-14 border-b border-white/10 bg-[#0c0d12]">
        <div className="container mx-auto px-4 max-w-5xl space-y-6">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-400 inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Hiring later
            </p>
            <h2 className="font-heading text-2xl font-black text-white">
              Team roles we’re planning as we scale
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl">
              These aren’t open yet — we’re building the ops layer for when volume needs dedicated people
              behind the phone and the dispatch board.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <article className="rounded-2xl border border-white/10 bg-[#12141c] p-6 space-y-3 text-left relative">
              <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-full">
                Coming later
              </span>
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Headset className="w-5 h-5" />
              </div>
              <h3 className="font-heading text-xl font-extrabold text-white pr-24">
                Customer support
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Help drivers with bookings, quotes, Pay in 4 / 8 questions, memberships, and job status.
                You’ll be the calm voice when someone’s car won’t start and they need clear next steps.
              </p>
              <ul className="text-xs text-slate-300 space-y-1.5 pt-1">
                <li>• Phone / chat / email support for DFW customers</li>
                <li>• Booking troubleshooting and reschedule help</li>
                <li>• Escalation to dispatch or techs when needed</li>
              </ul>
            </article>

            <article className="rounded-2xl border border-white/10 bg-[#12141c] p-6 space-y-3 text-left relative">
              <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-full">
                Coming later
              </span>
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <h3 className="font-heading text-xl font-extrabold text-white pr-24">
                Dispatch admin
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Run the board: match jobs to techs, watch SLAs, unblock holds/quotes, and keep mobile units
                and partner shops flowing across Justin, Fort Worth, and greater DFW.
              </p>
              <ul className="text-xs text-slate-300 space-y-1.5 pt-1">
                <li>• Live dispatch console & job assignment support</li>
                <li>• Tech coverage, routing, and emergency triage</li>
                <li>• Coordinate with partner locations and admin tools</li>
              </ul>
            </article>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#12141c] p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1 text-left">
              <p className="font-bold text-white text-sm">Interested in support or dispatch later?</p>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                Email us your name, role interest (Customer Support or Dispatch Admin), and a short note.
                We’ll keep your info for when those seats open.
              </p>
            </div>
            <a
              href="mailto:service@adaptivityperformance.com?subject=Future%20interest%20%E2%80%94%20Support%20%2F%20Dispatch&body=Name%3A%0ARole%20interest%20(Customer%20Support%20or%20Dispatch%20Admin)%3A%0APhone%3A%0AShort%20background%3A%0A"
              className="shrink-0 px-5 py-3 rounded-xl border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 text-xs font-bold inline-flex items-center gap-2"
            >
              Email future interest
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
