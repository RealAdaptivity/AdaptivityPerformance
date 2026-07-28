import React from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Hammer,
  Sparkles,
  UserPlus,
  Wrench,
} from 'lucide-react';
import { SiteLink } from '../site/SiteLink';

type Props = {
  onOpenRecruitment: () => void;
};

const PATH = [
  {
    n: '01',
    title: 'Enroll in paid training',
    body: 'Pick a track (mechanical basics, brakes, diagnostics, detailing, tint, audio, and more). You pay for structured hands-on learning with our team.',
  },
  {
    n: '02',
    title: 'Learn on real tools & real cars',
    body: 'School-friendly schedule options when available. Practice the skills customers actually book — not just classroom theory.',
  },
  {
    n: '03',
    title: 'Build your kit & confidence',
    body: 'We help you understand which tools you need for your trade and how mobile / shop jobs actually run on Adaptivity.',
  },
  {
    n: '04',
    title: 'Graduate into full tech status',
    body: 'When you meet our experience and tool bar, apply (or get invited) to join as a full Adaptivity tech — claim jobs, get paid, grow toward partnership later.',
  },
];

const TRACKS = [
  { title: 'Diagnostics & mechanical basics', blurb: 'Scan tools, inspections, common driveway repairs' },
  { title: 'Brakes & maintenance', blurb: 'Pads, fluids, oil service workflows customers book often' },
  { title: 'Detailing & cosmetics', blurb: 'Interior / exterior systems that turn into paid jobs' },
  { title: 'Tint, audio & accessories', blurb: 'Trade intro paths for specialty mobile work' },
];

export const WantToLearnPage: React.FC<Props> = ({ onOpenRecruitment }) => {
  return (
    <div className="bg-[#0b0c10]">
      <section className="pt-14 pb-12 border-b border-white/10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-[380px] h-[380px] bg-amber-500/10 blur-[110px] rounded-full pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10 max-w-3xl text-center space-y-5">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 rounded-full">
            <GraduationCap className="w-3.5 h-3.5" />
            Want to learn
          </span>
          <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">
            Pay to learn.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-emerald-400">
              Become a full tech with us.
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            In school or just getting started? Adaptivity offers <strong className="text-white">paid training</strong>{' '}
            for people who want to learn how to do the work — then step up into our tech network when you’re
            ready. You’re not just taking a class; you’re training toward real jobs on our platform.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            <a
              href="mailto:service@adaptivityperformance.com?subject=Want%20to%20Learn%20%E2%80%94%20Training%20interest&body=Name%3A%0APhone%3A%0ASchool%20%2F%20status%20(in%20school%2C%20career%20change%2C%20etc.)%3A%0ATrade%20interest%3A%0ANotes%3A%0A"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-sm inline-flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
            >
              Ask about training
              <ArrowRight className="w-4 h-4" />
            </a>
            <SiteLink
              to="join"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-emerald-500/40 text-emerald-300 font-bold text-sm hover:bg-emerald-500/10 text-center"
            >
              Already skilled? Join as Tech
            </SiteLink>
            <SiteLink
              to="wantToTeach"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-violet-500/40 text-violet-300 font-bold text-sm hover:bg-violet-500/10 text-center"
            >
              Want to Teach instead?
            </SiteLink>
          </div>
        </div>
      </section>

      <section className="py-14 border-b border-white/10">
        <div className="container mx-auto px-4 max-w-5xl space-y-8">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="font-heading text-2xl sm:text-3xl font-black text-white">Who this is for</h2>
            <p className="text-sm text-slate-400">
              Built for students and beginners who are serious about turning curiosity into a paid trade —
              not free tips, a real training path with a price.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: <BookOpen className="w-5 h-5" />,
                title: 'People in school',
                body: 'Learn around class schedules when slots allow. Build a skill that pays after graduation — or while you’re still enrolled.',
              },
              {
                icon: <Hammer className="w-5 h-5" />,
                title: 'Career changers',
                body: 'New to auto work but ready to invest in training. We teach the fundamentals customers actually need.',
              },
              {
                icon: <Sparkles className="w-5 h-5" />,
                title: 'Future Adaptivity techs',
                body: 'Training is the on-ramp. After you prove skills and tool readiness, you can become a full tech on our dispatch board.',
              },
            ].map((card) => (
              <article
                key={card.title}
                className="rounded-2xl border border-white/10 bg-[#12141c] p-5 space-y-3 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
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
        <div className="container mx-auto px-4 max-w-5xl space-y-8">
          <div className="text-center space-y-2">
            <h2 className="font-heading text-2xl sm:text-3xl font-black text-white">
              Learn → earn → join the network
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl mx-auto">
              Training is paid. The goal is clear: get you ready to work as a full Adaptivity technician.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PATH.map((step) => (
              <article
                key={step.n}
                className="rounded-2xl border border-white/10 bg-[#12141c] p-5 sm:p-6 text-left space-y-2"
              >
                <span className="text-xs font-black text-amber-400 font-mono">{step.n}</span>
                <h3 className="font-heading text-lg font-extrabold text-white">{step.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 border-b border-white/10">
        <div className="container mx-auto px-4 max-w-5xl space-y-6">
          <div className="text-center space-y-2">
            <h2 className="font-heading text-2xl sm:text-3xl font-black text-white">Training tracks</h2>
            <p className="text-sm text-slate-400">
              Tracks and pricing depend on demand and coach availability — ask us for current packages.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TRACKS.map((t) => (
              <div
                key={t.title}
                className="rounded-2xl border border-white/10 bg-[#12141c] p-5 text-left flex gap-3"
              >
                <Wrench className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-white text-sm">{t.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{t.blurb}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 border-b border-white/10 bg-[#0c0d12]">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-950/30 via-[#12141c] to-[#0b0c10] p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4 text-left">
              <h2 className="font-heading text-2xl sm:text-3xl font-black text-white">
                What you get when you pay to learn
              </h2>
              <ul className="space-y-2.5 text-sm text-slate-300">
                {[
                  'Hands-on instruction oriented around real Adaptivity job types',
                  'Clear expectations for tools, safety, and customer communication',
                  'A defined path from trainee → full tech on our platform (when you’re ready)',
                  'Same end goal as experienced applicants: claim jobs, get paid, grow toward partnership',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Training does not automatically make you a dispatched tech. You still need to meet our tool,
                safety, and readiness bar — then you apply or get approved to join the board like any other tech.
              </p>
            </div>
            <div className="lg:col-span-5 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-[#0b0c10]/80 p-5 space-y-3 text-left">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Pricing</p>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Training is <strong className="text-white">paid</strong> — packages vary by track and hours.
                  Email us for current rates and upcoming cohorts (including school-friendly options).
                </p>
              </div>
              <a
                href="mailto:service@adaptivityperformance.com?subject=Want%20to%20Learn%20%E2%80%94%20Training%20interest&body=Name%3A%0APhone%3A%0ASchool%20%2F%20status%3A%0ATrade%20interest%3A%0A"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-sm inline-flex items-center justify-center gap-2"
              >
                Get training pricing
                <ArrowRight className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={onOpenRecruitment}
                className="w-full py-3 rounded-xl border border-emerald-500/40 text-emerald-300 font-bold text-xs hover:bg-emerald-500/10 inline-flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Ready now? Open tech application
              </button>
              <SiteLink
                to="wantToTeach"
                className="block w-full py-3 rounded-xl border border-violet-500/40 text-violet-300 font-bold text-xs text-center hover:bg-violet-500/10"
              >
                Are you a tech who wants to teach?
              </SiteLink>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
