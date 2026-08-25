import {
  ShieldCheck,
  RefreshCw,
  Clock,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  FileText,
  PhoneCall,
  Mail,
  HelpCircle,
  Shield,
  RotateCcw,
} from 'lucide-react';
import { SITE_PHONE_DISPLAY, SITE_PHONE_TEL } from '../site/seo';
import { SiteLink } from '../site/SiteLink';

export const RefundPolicyPage: React.FC = () => {
  return (
    <div className="py-16 bg-[#08090d] text-slate-300 min-h-screen">
      <div className="container mx-auto px-4 max-w-4xl space-y-12">
        {/* Page Header */}
        <div className="text-center space-y-3 border-b border-white/10 pb-8">
          <div className="inline-flex items-center space-x-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            <RefreshCw className="w-4 h-4" />
            <span>Customer Protection & Fair Billing Guarantee</span>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-white">
            Refund & Cancellation Policy
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto">
            Adaptivity Performance LLC • Effective Date: January 1, 2026 • Clear, transparent terms
            for mobile diagnostic holds, completed repair warranties, parts returns, and payment link refunds.
          </p>
        </div>

        {/* Quick Summary Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#0e1017] p-5 rounded-2xl border border-white/10 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">Free Cancellation (2+ hrs)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cancel or reschedule at least 2 hours before your appointment window for a 100% full release of your $85 hold with zero penalty.
            </p>
          </div>

          <div className="bg-[#0e1017] p-5 rounded-2xl border border-white/10 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">12-Mo / 12k-Mi Warranty</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              All qualifying parts and labor are backed by our 12-Month / 12,000-Mile Nationwide Peace-of-Mind Warranty.
            </p>
          </div>

          <div className="bg-[#0e1017] p-5 rounded-2xl border border-white/10 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
              <RotateCcw className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">Fast 5–10 Day Processing</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Approved refunds are credited directly to your original payment method (Card, BNPL, Apple Pay) within 5–10 business days.
            </p>
          </div>
        </div>

        {/* SECTION 1: Diagnostic Authorization Holds ($85) */}
        <section className="bg-[#0e1017] p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
          <div className="flex items-center space-x-3 text-orange-400 border-b border-white/10 pb-4">
            <CreditCard className="w-6 h-6 text-orange-500" />
            <h2 className="font-heading text-xl font-extrabold text-white">
              1. Diagnostic Authorization Holds ($85.00)
            </h2>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            When booking mobile repair or on-site diagnosis, a temporary pre-authorization hold of <strong>$85.00</strong> is placed on your credit or debit card. 
            This is <em>not an immediate charge</em> — it ensures technician scheduling and reserves your dedicated dispatch slot.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
              <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Full Refund / Hold Release
              </div>
              <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                <li><strong>Advance Cancellation:</strong> Cancel 2 or more hours prior to your scheduled arrival window.</li>
                <li><strong>Advance Rescheduling:</strong> Reschedule 2+ hours in advance at zero charge.</li>
                <li><strong>Technician Unavailability:</strong> If weather, emergency, or dispatch delays prevent us from serving you.</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2">
              <div className="font-bold text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Late Cancellation / No-Show Fee
              </div>
              <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                <li><strong>Late Cancellation:</strong> Cancellations made within 2 hours of the arrival window forfeit the $85 hold to cover tech dispatch and fuel costs.</li>
                <li><strong>No-Show on Site:</strong> If the vehicle or customer is unreachable for 15+ minutes after technician arrival.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* SECTION 2: Completed Service Labor & Quotes */}
        <section className="bg-[#0e1017] p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
          <div className="flex items-center space-x-3 text-orange-400 border-b border-white/10 pb-4">
            <Shield className="w-6 h-6 text-orange-500" />
            <h2 className="font-heading text-xl font-extrabold text-white">
              2. Completed Repairs & Labor Satisfaction Guarantee
            </h2>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Prior to performing any repair beyond the initial diagnostic, your assigned technician provides an itemized digital quote for parts and labor. 
            Work only begins once you explicitly approve the quote.
          </p>

          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-xl bg-[#141722] border border-white/10 space-y-1.5">
              <h4 className="font-bold text-white text-sm">Labor Guarantee & Re-Inspection</h4>
              <p className="text-slate-300 leading-relaxed">
                If an issue directly related to the specific repair performed by Adaptivity Performance persists within 30 days of service, we will dispatch a certified technician to re-inspect and correct the issue at no additional labor cost. If we are unable to rectify a verifiable workmanship defect, a full or partial refund of the labor fee will be issued.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#141722] border border-white/10 space-y-1.5">
              <h4 className="font-bold text-white text-sm">Customer-Supplied Parts Disclaimer</h4>
              <p className="text-slate-300 leading-relaxed">
                While we install customer-supplied parts upon request, our warranty and refund policy applies strictly to our installation labor. We cannot warrant, return, or refund parts purchased independently by the customer from third-party vendors.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 3: Replacement Parts & Core Returns */}
        <section className="bg-[#0e1017] p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
          <div className="flex items-center space-x-3 text-orange-400 border-b border-white/10 pb-4">
            <FileText className="w-6 h-6 text-orange-500" />
            <h2 className="font-heading text-xl font-extrabold text-white">
              3. Replacement Parts & Core Deposits
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-[#141722] border border-white/10 space-y-2">
              <h4 className="font-bold text-white text-sm">OEM & Aftermarket Parts Returns</h4>
              <p className="text-slate-300 leading-relaxed">
                Uninstalled parts sourced by Adaptivity Performance may be returned within 14 days subject to manufacturer restocking terms. Installed electrical components (sensors, control modules, relays) are non-returnable once connected to a vehicle.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#141722] border border-white/10 space-y-2">
              <h4 className="font-bold text-white text-sm">Core Deposit Refunds</h4>
              <p className="text-slate-300 leading-relaxed">
                Core charges (such as alternators, starters, brake calipers, and batteries) will be refunded 100% upon receipt of the undamaged, rebuildable used core within 14 calendar days of job completion.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 4: Buy Now Pay Later (BNPL) & Payment Links */}
        <section className="bg-[#0e1017] p-6 sm:p-8 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center space-x-3 text-orange-400 border-b border-white/10 pb-4">
            <CreditCard className="w-6 h-6 text-orange-500" />
            <h2 className="font-heading text-xl font-extrabold text-white">
              4. Payment Links & Buy Now Pay Later (BNPL) Financing
            </h2>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            If you finalized your repair payment through a digital payment link using an installment or BNPL provider (such as <strong>Affirm, Klarna, Afterpay, Zip, or Sunbit</strong>), any approved refund is transmitted through Stripe directly to your financing provider.
          </p>

          <p className="text-xs text-slate-400 leading-relaxed">
            The financing provider will automatically adjust your remaining balance or issue a credit to your payment card in accordance with their consumer financing agreement.
          </p>
        </section>

        {/* SECTION 5: How to Request a Refund */}
        <section className="bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-slate-900 p-6 sm:p-8 rounded-3xl border border-orange-500/30 space-y-6">
          <div className="flex items-center space-x-3 text-orange-400 border-b border-orange-500/20 pb-4">
            <HelpCircle className="w-6 h-6 text-orange-400" />
            <h2 className="font-heading text-xl font-extrabold text-white">
              5. How to Request a Refund or Reschedule
            </h2>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            To cancel an upcoming appointment, request a refund on an existing booking, or submit a warranty inspection claim, please contact our dispatch team with your <strong>Booking Reference Code</strong> (e.g. <code>#AP-1234</code>):
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
            <a
              href={SITE_PHONE_TEL}
              className="p-4 rounded-xl bg-black/40 border border-white/10 hover:border-orange-500/50 transition flex flex-col items-center text-center space-y-2 group"
            >
              <PhoneCall className="w-5 h-5 text-orange-400 group-hover:scale-110 transition-transform" />
              <div>
                <strong className="text-white block">Call / Text Dispatch</strong>
                <span className="text-slate-400">{SITE_PHONE_DISPLAY}</span>
              </div>
            </a>

            <a
              href="mailto:service@adaptivityperformance.com"
              className="p-4 rounded-xl bg-black/40 border border-white/10 hover:border-orange-500/50 transition flex flex-col items-center text-center space-y-2 group"
            >
              <Mail className="w-5 h-5 text-orange-400 group-hover:scale-110 transition-transform" />
              <div>
                <strong className="text-white block">Email Billing Support</strong>
                <span className="text-slate-400">service@adaptivityperformance.com</span>
              </div>
            </a>

            <div className="p-4 rounded-xl bg-black/40 border border-white/10 flex flex-col items-center text-center space-y-2">
              <Clock className="w-5 h-5 text-emerald-400" />
              <div>
                <strong className="text-white block">Operating Hours</strong>
                <span className="text-slate-400">Every day 8AM–10PM CT</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 pt-2 border-t border-white/5">
            <strong>Corporate Address:</strong> Adaptivity Performance LLC, 410 FM 156, Justin, TX 76247. Registered in the State of Texas.
          </div>
        </section>

        {/* Footer Navigation Back Links */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-white/10 text-xs">
          <SiteLink to="terms" className="text-slate-400 hover:text-white flex items-center gap-1">
            ← Terms of Service
          </SiteLink>
          <SiteLink to="privacy" className="text-slate-400 hover:text-white flex items-center gap-1">
            Privacy Policy →
          </SiteLink>
        </div>
      </div>
    </div>
  );
};
