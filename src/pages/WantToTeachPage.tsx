import React from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  DollarSign,
  GraduationCap,
  Users,
  UserPlus,
  Wrench,
} from 'lucide-react';
import { SiteLink } from '../site/SiteLink';

type Props = {
  onOpenRecruitment: () => void;
};

export const WantToTeachPage: React.FC<Props> = ({ onOpenRecruitment }) => {
  return (
    <div className="bg-[#0b0c10]">
      <section className="pt-14 pb-12 border-b border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-violet-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10 max-w-3xl text-center space-y-5">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-300 bg-violet-500/10 border border-violet-500/30 px-3.5 py-1.5 rounded-full">
            <GraduationCap className="w-3.5 h-3.5" />
            Want to teach
          </span>
          <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">
            Mechanics & techs with us can{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-amber-400 to-orange-500">
              teach — and get paid.
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Already on the Adaptivity network (or joining as a tech)? Share your trade with students and
            beginners in our paid <strong className="text-white">Want to Learn</strong> program. You coach
            hands-on skills; we handle enrollment and you earn for teaching time.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            <a
              href="mailto:service@adaptivityperformance.com?subject=Want%20to%20Teach%20%E2%80%94%20Instructor%20interest&body=Name%3A%0APhone%3A%0AAlready%20an%20Adaptivity%20tech%3F%20(yes%2Fno)%3A%0ATrades%20you%20can%20teach%3A%0AYears%20experience%3A%0ANotes%3A%0A"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-violet-500 to-orange-600 text-white font-bold text-sm inline-flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
            >
              Apply to teach
              <ArrowRight className="w-4 h-4" />
            </a>
            <SiteLink
              to="join"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-emerald-500/40 text-emerald-300 font-bold text-sm hover:bg-emerald-500/10 text-center"
            >
              Not a tech yet? Join first
            </SiteLink>
            <SiteLink
              to="learn"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-amber-500/40 text-amber-300 font-bold text-sm hover:bg-amber-500/10 text-center"
            >
              See Want to Learn
            </SiteLink>
          </div>
        </div>
      </section>

      <section className="py-14 border-b border-white/10">
        <div className="container mx-auto px-4 max-w-5xl space-y-8">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="font-heading text-2xl sm:text-3xl font-black text-white">How teaching works</h2>
            <p className="text-sm text-slate-400">
              Learners pay for training. Instructors — our mechanics and techs — get paid to teach them.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: <UserPlus className="w-5 h-5" />,
                title: 'Be a tech with us',
                body: 'Teaching seats are for Adaptivity mechanics/techs (or applicants who get approved). You already know how our jobs run.',
                accent: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
              },
              {
                icon: <BookOpen className="w-5 h-5" />,
                title: 'Coach paid learners',
                body: 'Students and beginners enroll in Want to Learn tracks. You run hands-on sessions in your specialty — brakes, diagnostics, detailing, tint, and more.',
                accent: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
              },
              {
                icon: <DollarSign className="w-5 h-5" />,
                title: 'Get paid to teach',
                body: 'Instructor pay is separate from job labor. You earn for teaching hours / sessions — same Stripe Express payouts you already use for repairs.',
                accent: 'text-violet-300 bg-violet-500/15 border-violet-500/30',
              },
            ].map((card) => (
              <article
                key={card.title}
                className="rounded-2xl border border-white/10 bg-[#12141c] p-5 space-y-3 text-left"
              >
                <div
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center ${card.accent}`}
                >
                  {card.icon}
                </div>
                <h3 className="font-heading text-lg font-extrabold text-white">{card.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 border-b border-white/10 bg-[#0c0d12]">
        <div className="container mx-auto px-4 max-w-5xl space-y-6">
          <div className="text-center space-y-2">
            <h2 className="font-heading text-2xl sm:text-3xl font-black text-white">
              Who should want to teach
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <article className="rounded-2xl border border-white/10 bg-[#12141c] p-5 sm:p-6 space-y-3 text-left">
              <div className="flex items-center gap-2 text-violet-300 font-bold">
                <Wrench className="w-5 h-5" />
                Active Adaptivity techs
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                You’re already claiming jobs and know the standard. Teaching is a second income stream —
                share what you do every day and help the next wave of techs get ready for our board.
              </p>
              <ul className="space-y-2 text-sm text-slate-300">
                {[
                  'Teach in the trades you already specialize in',
                  'Flexible sessions when learner demand and your schedule align',
                  'Paid separately from repair / dispatch work',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-violet-300 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
            <article className="rounded-2xl border border-white/10 bg-[#12141c] p-5 sm:p-6 space-y-3 text-left">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Users className="w-5 h-5" />
                Skilled techs joining soon
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                Not on the platform yet? Join as a tech first (tools, experience, payouts). Once you’re
                approved, you can opt into instructor sessions when we need coaches for Want to Learn.
              </p>
              <button
                type="button"
                onClick={onOpenRecruitment}
                className="mt-1 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold inline-flex items-center gap-1.5"
              >
                Start tech application <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </article>
          </div>
        </div>
      </section>

      <section className="py-14 border-b border-white/10">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-950/30 via-[#12141c] to-[#0b0c10] p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4 text-left">
              <h2 className="font-heading text-2xl sm:text-3xl font-black text-white">
                Teach → earn → grow the network
              </h2>
              <ul className="space-y-2.5 text-sm text-slate-300">
                {[
                  'Learners find us on Want to Learn and pay for training',
                  'We match them with Adaptivity mechanics/techs who want to teach',
                  'You get paid for instruction; they work toward becoming full techs with us',
                  'Strong instructors help the community — and can keep claiming regular jobs too',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-violet-300 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Instructor rates and session formats vary by track. Email us to get on the teach list —
                we’ll follow up with pay details and upcoming cohorts.
              </p>
            </div>
            <div className="lg:col-span-5 space-y-3">
              <a
                href="mailto:service@adaptivityperformance.com?subject=Want%20to%20Teach%20%E2%80%94%20Instructor%20interest&body=Name%3A%0APhone%3A%0AAlready%20an%20Adaptivity%20tech%3F%3A%0ATrades%20you%20can%20teach%3A%0A"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-500 to-orange-600 text-white font-bold text-sm inline-flex items-center justify-center gap-2"
              >
                I want to teach — email us
                <ArrowRight className="w-4 h-4" />
              </a>
              <SiteLink
                to="learn"
                className="block w-full py-3 rounded-xl border border-amber-500/40 text-amber-300 text-sm font-bold text-center hover:bg-amber-500/10"
              >
                View learner side (Want to Learn)
              </SiteLink>
              <SiteLink
                to="join"
                className="block w-full py-3 rounded-xl border border-white/15 text-slate-200 text-sm font-bold text-center hover:bg-white/5"
              >
                Join as Tech requirements
              </SiteLink>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
