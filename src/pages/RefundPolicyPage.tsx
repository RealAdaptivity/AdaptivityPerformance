import React from 'react';
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
  Wrench,
  Sparkles,
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
            Adaptivity Performance LLC • Effective Date: January 1, 2026 • Transparent, customer-first terms
            for zero-down booking, on-site diagnostics, 12-month warranties, parts returns, and digital invoice refunds.
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
              Zero payment is required to book. Cancel or reschedule 2+ hours in advance with zero fees or penalties.
            </p>
          </div>

          <div className="bg-[#0e1017] p-5 rounded-2xl border border-white/10 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">12-Mo / 12k-Mi Warranty</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              All qualifying parts and workmanship are backed by our 12-Month / 12,000-Mile Peace-of-Mind Warranty.
            </p>
          </div>

          <div className="bg-[#0e1017] p-5 rounded-2xl border border-white/10 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
              <RotateCcw className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base">Fast 3–7 Day Processing</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Approved refunds are credited directly to your original payment method (Credit/Debit Card, BNPL, or Zelle).
            </p>
          </div>
        </div>

        {/* SECTION 1: Booking, Cancellations & Rescheduling */}
        <section className="bg-[#0e1017] p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
          <div className="flex items-center space-x-3 text-orange-400 border-b border-white/10 pb-4">
            <Clock className="w-6 h-6 text-orange-500" />
            <h2 className="font-heading text-xl font-extrabold text-white">
              1. Online Booking, Free Cancellations & Rescheduling
            </h2>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            At Adaptivity Performance, booking your mobile mechanic or shop appointment is <strong>100% free of upfront charges</strong>. 
            No credit card is required to reserve your appointment window online.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
              <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> 100% Free Cancellation & Reschedule
              </div>
              <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                <li><strong>Advance Notice:</strong> Cancel or reschedule 2 or more hours prior to your scheduled arrival window at $0 charge.</li>
                <li><strong>Weather & Delays:</strong> If severe Texas weather or unforeseen road delays impact dispatch, you may reschedule freely.</li>
                <li><strong>No Penalties:</strong> No cancellation fees apply when reasonable notice is provided.</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2">
              <div className="font-bold text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Late Cancellation & On-Site No-Show Policy
              </div>
              <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                <li><strong>Late Cancellation:</strong> Cancellations made within 2 hours of technician arrival may be subject to a standard dispatch trip fee.</li>
                <li><strong>No-Show on Site:</strong> If the vehicle or customer is unreachable for 15+ minutes after technician arrival, a trip dispatch fee may apply.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* SECTION 2: Diagnostic Fee & 100% Credit Policy ($85) */}
        <section className="bg-[#0e1017] p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
          <div className="flex items-center space-x-3 text-orange-400 border-b border-white/10 pb-4">
            <Wrench className="w-6 h-6 text-orange-500" />
            <h2 className="font-heading text-xl font-extrabold text-white">
              2. On-Site Diagnostic Fee & 100% Repair Credit Policy
            </h2>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Our mobile diagnostic visit fee is a transparent <strong>$85.00</strong>. This covers our technician traveling to your driveway or workplace, performing multi-module OBD-II computerized scanning, live sensor analysis, and hands-on component inspection.
          </p>

          <div className="p-4 rounded-xl bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border border-orange-500/30 space-y-2 text-xs">
            <div className="font-bold text-orange-400 flex items-center gap-1.5 text-sm">
              <Sparkles className="w-4 h-4 text-orange-400" /> 100% Diagnostic Credit Guarantee
            </div>
            <p className="text-slate-300 leading-relaxed">
              When you approve the recommended repair on the same visit, your <strong>entire $85.00 diagnostic fee is 100% credited</strong> toward your final labor and parts invoice. If you decline service after inspection, the $85 covers only the technician’s diagnostic time and specialized equipment.
            </p>
          </div>
        </section>

        {/* SECTION 3: Completed Service Labor & 12-Month Warranty */}
        <section className="bg-[#0e1017] p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
          <div className="flex items-center space-x-3 text-orange-400 border-b border-white/10 pb-4">
            <Shield className="w-6 h-6 text-orange-500" />
            <h2 className="font-heading text-xl font-extrabold text-white">
              3. Completed Repairs & 12-Month / 12,000-Mile Warranty
            </h2>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Prior to performing any repair, your assigned technician provides an itemized quote detailing labor and parts. 
            Work only begins once you explicitly approve the quote.
          </p>

          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-xl bg-[#141722] border border-white/10 space-y-1.5">
              <h4 className="font-bold text-white text-sm">Labor Guarantee & Free Re-Inspection</h4>
              <p className="text-slate-300 leading-relaxed">
                If an issue directly related to a repair performed by Adaptivity Performance arises within 12 months or 12,000 miles, we will dispatch a certified technician to re-inspect and correct the issue at zero additional labor cost. If we are unable to rectify a verifiable workmanship defect, a full or partial refund of the labor fee will be issued promptly.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#141722] border border-white/10 space-y-1.5">
              <h4 className="font-bold text-white text-sm">Customer-Supplied Parts Disclaimer</h4>
              <p className="text-slate-300 leading-relaxed">
                When installing customer-supplied parts at the customer’s request, our warranty applies strictly to our professional installation workmanship. We cannot warrant, return, or refund parts purchased independently by the customer from third-party retailers.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 4: Replacement Parts & Core Returns */}
        <section className="bg-[#0e1017] p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
          <div className="flex items-center space-x-3 text-orange-400 border-b border-white/10 pb-4">
            <FileText className="w-6 h-6 text-orange-500" />
            <h2 className="font-heading text-xl font-extrabold text-white">
              4. Replacement Parts & Core Deposit Returns
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-[#141722] border border-white/10 space-y-2">
              <h4 className="font-bold text-white text-sm">OEM & Aftermarket Parts Returns</h4>
              <p className="text-slate-300 leading-relaxed">
                Uninstalled parts sourced by Adaptivity Performance may be returned within 14 days subject to manufacturer restocking guidelines. Installed electrical components (sensors, control modules, relays) are non-returnable once connected to a vehicle.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#141722] border border-white/10 space-y-2">
              <h4 className="font-bold text-white text-sm">Core Deposit Refunds (100%)</h4>
              <p className="text-slate-300 leading-relaxed">
                Core charges (such as alternators, starters, brake calipers, and batteries) will be refunded 100% upon receipt of the undamaged, rebuildable used core within 14 calendar days of service completion.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 5: Buy Now Pay Later (BNPL) & Payment Links */}
        <section className="bg-[#0e1017] p-6 sm:p-8 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center space-x-3 text-orange-400 border-b border-white/10 pb-4">
            <CreditCard className="w-6 h-6 text-orange-500" />
            <h2 className="font-heading text-xl font-extrabold text-white">
              5. Digital Invoices & Buy Now Pay Later (BNPL) Financing
            </h2>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Payment is completed after service is verified via our secure digital invoices (Credit/Debit Card, Apple Pay, Google Pay, Zelle, or Pay-in-4 installment plans via <strong>Affirm, Klarna, or Afterpay</strong>).
          </p>

          <p className="text-xs text-slate-400 leading-relaxed">
            If a refund is approved for a job financed through BNPL, the refund is transmitted directly through our payment processor to your financing provider, who will automatically adjust your balance or issue a credit to your payment method.
          </p>
        </section>

        {/* SECTION 6: How to Request a Refund or Warranty Inspection */}
        <section className="bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-slate-900 p-6 sm:p-8 rounded-3xl border border-orange-500/30 space-y-6">
          <div className="flex items-center space-x-3 text-orange-400 border-b border-orange-500/20 pb-4">
            <HelpCircle className="w-6 h-6 text-orange-400" />
            <h2 className="font-heading text-xl font-extrabold text-white">
              6. How to Request a Refund or Schedule Warranty Inspection
            </h2>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            To reschedule an appointment, request an invoice adjustment, or submit a warranty re-inspection claim, please contact our dispatch team with your <strong>Booking Confirmation Reference</strong> (e.g. <code>#AP-1234</code>):
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
                <strong className="text-white block">Live Dispatch Hours</strong>
                <span className="text-slate-400">8:00 AM – 10:00 PM Daily</span>
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
