import React from 'react';
import { ShieldCheck, FileText, Lock, CheckCircle2 } from 'lucide-react';
import { SITE_PHONE_DISPLAY, SITE_PHONE_TEL } from '../site/seo';

export const TermsPrivacyPage: React.FC = () => {
  return (
    <div className="py-16 bg-[#08090d] text-slate-300 min-h-screen">
      <div className="container mx-auto px-4 max-w-4xl space-y-12">
        
        {/* Page Header */}
        <div className="text-center space-y-3 border-b border-white/10 pb-8">
          <div className="inline-flex items-center space-x-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Legal Disclosures & Consumer Terms</span>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-white">
            Terms of Service & Privacy Policy
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto">
            Adaptivity Performance LLC • Last Updated July 2026. Official terms governing mobile dispatch, repair warranties, payment authorizations, and data protection.
          </p>
        </div>

        {/* Section 1: Terms of Service */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-6">
          <div className="flex items-center space-x-3 text-orange-400 border-b border-white/5 pb-4">
            <FileText className="w-6 h-6" />
            <h2 className="font-heading text-xl font-bold text-white">1. Terms of Service & Authorization</h2>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <p>
              By requesting mobile mechanic dispatch, garage hub service, or submitting a vehicle VIN for estimate, you agree to the following operational terms:
            </p>

            <div className="space-y-3 bg-[#0b0c10] p-4 rounded-2xl border border-white/5 text-xs">
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span><strong>Service Authorization & On-Site Inspection:</strong> You authorize certified Adaptivity Performance technicians to inspect, test-drive, and perform requested diagnostic and repair procedures on your vehicle.</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span><strong>Transparent Diagnostic & Credit Policy:</strong> $100 diagnostic fees are 100% credited toward completed repairs approved on-site.</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span><strong>12-Month / 12,000-Mile Warranty:</strong> All qualifying parts and technician labor installed by Adaptivity Performance are backed by our 12-Month / 12,000-Mile warranty.</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span><strong>CARFAX & History Reporting:</strong> Vehicle identification numbers (VIN), mileage, and completed service line items are securely transmitted to CARFAX & Experian AutoCheck for vehicle history verification.</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Privacy Policy */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-6">
          <div className="flex items-center space-x-3 text-emerald-400 border-b border-white/5 pb-4">
            <Lock className="w-6 h-6" />
            <h2 className="font-heading text-xl font-bold text-white">2. Privacy Policy & Data Protection</h2>
          </div>

          <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <p>
              Adaptivity Performance is committed to protecting consumer data and vehicle records. We collect only necessary vehicle specification data, service addresses, and contact numbers to complete your repair orders.
            </p>

            <ul className="list-disc pl-5 space-y-2 text-xs">
              <li><strong>Zero Data Selling:</strong> We never sell customer names, phone numbers, or residential addresses to third-party telemarketers or brokers.</li>
              <li><strong>Stripe Payment Security:</strong> Card payments and authorizations are processed via PCI-DSS compliant Stripe Connect. No raw credit card data is stored on local servers.</li>
              <li><strong>SMS Notifications:</strong> By submitting your mobile number, you consent to receive transactional SMS updates regarding tech arrival, live dispatch tracking, and invoice receipts.</li>
            </ul>
          </div>
        </section>

        {/* Contact Support */}
        <div className="bg-[#0b0c10] p-6 rounded-2xl border border-white/10 text-center space-y-2">
          <h3 className="font-bold text-white text-sm">Questions Regarding Legal Terms?</h3>
          <p className="text-xs text-slate-400">
            Contact Adaptivity Support Dispatch: <a href={SITE_PHONE_TEL} className="text-orange-400 font-bold hover:underline">{SITE_PHONE_DISPLAY}</a>
          </p>
        </div>

      </div>
    </div>
  );
};
