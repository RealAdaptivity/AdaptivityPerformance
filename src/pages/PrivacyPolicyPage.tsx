import React from 'react';
import { ShieldCheck, Eye, Database, Mail, Share2, Lock, Clock, UserX, Phone } from 'lucide-react';
import { SITE_PHONE_DISPLAY, SITE_PHONE_TEL } from '../site/seo';

export const PrivacyPolicyPage: React.FC = () => {
  const effectiveDate = 'July 31, 2026';

  return (
    <div className="py-16 bg-[#08090d] text-slate-300 min-h-screen">
      <div className="container mx-auto px-4 max-w-4xl space-y-12">

        {/* Header */}
        <div className="text-center space-y-3 border-b border-white/10 pb-8">
          <div className="inline-flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>CCPA & GDPR Compliant Privacy Policy</span>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-white">
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto">
            Adaptivity Performance LLC • Effective Date: <strong className="text-white">{effectiveDate}</strong>
          </p>
          <p className="text-xs text-slate-500 max-w-2xl mx-auto">
            This Privacy Policy explains how Adaptivity Performance LLC ("we", "us", or "our") collects, uses, discloses, and protects your personal information when you use our website at adaptivityperformance.com and mobile mechanic services.
          </p>
        </div>

        {/* 1. Information We Collect */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-5">
          <div className="flex items-center space-x-3 text-sky-400 border-b border-white/5 pb-4">
            <Database className="w-6 h-6" />
            <h2 className="font-heading text-xl font-bold text-white">1. Information We Collect</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-[#0b0c10] p-4 rounded-2xl border border-white/5 space-y-2">
              <p className="font-bold text-sky-400 uppercase tracking-wider text-[11px]">Information You Provide</p>
              <ul className="space-y-1 text-slate-300 leading-relaxed list-disc list-inside">
                <li>Full name, phone number, and email address when booking</li>
                <li>Vehicle VIN, year, make, model, and mileage</li>
                <li>Service address (home / workplace driveway)</li>
                <li>Payment card details (processed by Stripe — we never store raw card data)</li>
                <li>Referral codes and membership plan selections</li>
                <li>Notes or messages submitted through booking forms</li>
              </ul>
            </div>
            <div className="bg-[#0b0c10] p-4 rounded-2xl border border-white/5 space-y-2">
              <p className="font-bold text-sky-400 uppercase tracking-wider text-[11px]">Automatically Collected Data</p>
              <ul className="space-y-1 text-slate-300 leading-relaxed list-disc list-inside">
                <li>IP address and approximate geolocation (city-level)</li>
                <li>Browser type, operating system, and device type</li>
                <li>Pages visited, time on site, and referring URL</li>
                <li>Cookies and similar tracking technologies</li>
                <li>Diagnostic trouble codes (DTCs) submitted via our AI Mechanic tool</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 2. How We Use Your Information */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-5">
          <div className="flex items-center space-x-3 text-orange-400 border-b border-white/5 pb-4">
            <Eye className="w-6 h-6" />
            <h2 className="font-heading text-xl font-bold text-white">2. How We Use Your Information</h2>
          </div>
          <div className="space-y-2 text-xs text-slate-300">
            {[
              ['Schedule and dispatch mobile mechanic appointments', 'Core service delivery'],
              ['Process payment card authorizations and final charges via Stripe', 'Payment processing'],
              ['Report completed repair orders to CARFAX & Experian AutoCheck to update your vehicle history', 'VIN history sync'],
              ['Send appointment confirmations, repair status updates, and receipts via SMS and email', 'Communications'],
              ['Verify identity, detect fraud, and prevent unauthorized transactions', 'Security'],
              ['Improve our website, services, and technician dispatch quality', 'Service improvement'],
              ['Comply with Texas Property Code, TCEQ regulations, and applicable law', 'Legal compliance'],
              ['Send service reminders and promotional offers (only if you opt in)', 'Marketing — opt-in only'],
            ].map(([use, category]) => (
              <div key={use} className="flex items-start space-x-3 bg-[#0b0c10] p-3 rounded-xl border border-white/5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-white">{use}</span>
                  <span className="ml-2 text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded font-mono">{category}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Sharing of Information */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-5">
          <div className="flex items-center space-x-3 text-amber-400 border-b border-white/5 pb-4">
            <Share2 className="w-6 h-6" />
            <h2 className="font-heading text-xl font-bold text-white">3. How We Share Your Information</h2>
          </div>
          <p className="text-xs text-slate-400">We do <strong className="text-white">NOT</strong> sell your personal information. We only share data with trusted service partners necessary to deliver our services:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {[
              ['Stripe, Inc.', 'Payment card processing and authorization holds'],
              ['CARFAX / Experian AutoCheck', 'Vehicle service history reporting by VIN'],
              ['Supabase', 'Encrypted cloud database for booking records'],
              ['Affirm / Klarna / Afterpay', '0% APR financing options at checkout'],
              ['Google Analytics', 'Anonymized website traffic analysis (opt-out via cookie settings)'],
              ['Certified Flatbed Towing Partners', 'Non-driveable vehicle transport when authorized by customer'],
            ].map(([partner, use]) => (
              <div key={partner} className="bg-[#0b0c10] p-3 rounded-xl border border-white/5 space-y-1">
                <p className="font-bold text-white text-[11px]">{partner}</p>
                <p className="text-slate-400 leading-relaxed">{use}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400">We may also disclose your information when required by law, court order, or to protect the safety of our technicians or the public.</p>
        </section>

        {/* 4. Cookies */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-5">
          <div className="flex items-center space-x-3 text-purple-400 border-b border-white/5 pb-4">
            <Lock className="w-6 h-6" />
            <h2 className="font-heading text-xl font-bold text-white">4. Cookies & Tracking Technologies</h2>
          </div>
          <div className="text-xs text-slate-300 space-y-3">
            <p>We use the following types of cookies:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                ['Essential Cookies', 'Required for our site to function. Cannot be disabled. Includes login sessions, booking state, and security tokens.', 'text-emerald-400'],
                ['Analytics Cookies', 'Google Analytics 4 for anonymized traffic analysis. Can be declined via our cookie consent banner.', 'text-amber-400'],
                ['Preference Cookies', 'Remember your service mode, zip code, and vehicle selections for a faster booking experience.', 'text-sky-400'],
              ].map(([type, desc, color]) => (
                <div key={type} className="bg-[#0b0c10] p-3 rounded-xl border border-white/5 space-y-1">
                  <p className={`font-bold text-[11px] uppercase tracking-wider ${color}`}>{type}</p>
                  <p className="text-slate-400 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
            <p>You can manage cookie preferences at any time via your browser settings or our cookie consent banner.</p>
          </div>
        </section>

        {/* 5. Data Retention */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-5">
          <div className="flex items-center space-x-3 text-slate-400 border-b border-white/5 pb-4">
            <Clock className="w-6 h-6" />
            <h2 className="font-heading text-xl font-bold text-white">5. Data Retention</h2>
          </div>
          <div className="text-xs text-slate-300 space-y-2">
            <p>We retain your personal data for as long as necessary to provide our services and comply with legal obligations:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                ['Booking & repair records', '7 years (Texas business tax retention requirement)'],
                ['Payment records', '7 years (IRS and Texas Comptroller requirements)'],
                ['Customer portal accounts', 'Until account deletion is requested'],
                ['Vehicle history VIN reports', 'Transmitted to CARFAX/AutoCheck permanently'],
                ['Analytics data', '14 months (Google Analytics default)'],
                ['Cookie preferences', '1 year or until browser data is cleared'],
              ].map(([item, period]) => (
                <div key={item} className="bg-[#0b0c10] p-3 rounded-xl border border-white/5 flex justify-between items-center gap-2">
                  <span className="text-white">{item}</span>
                  <span className="text-orange-400 font-mono text-[10px] flex-shrink-0">{period}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. Your Rights (CCPA / Texas) */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-5">
          <div className="flex items-center space-x-3 text-rose-400 border-b border-white/5 pb-4">
            <UserX className="w-6 h-6" />
            <h2 className="font-heading text-xl font-bold text-white">6. Your Privacy Rights (CCPA / Texas)</h2>
          </div>
          <p className="text-xs text-slate-400">Under the California Consumer Privacy Act (CCPA) and Texas Privacy Protection Act, you have the right to:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {[
              ['Know', 'Request a list of all personal data we have collected about you'],
              ['Access', 'Receive a copy of your personal data in a portable format'],
              ['Delete', 'Request deletion of your personal data (subject to legal retention requirements)'],
              ['Correct', 'Request correction of inaccurate personal information'],
              ['Opt-Out', 'Opt out of marketing emails and analytics tracking at any time'],
              ['Non-Discrimination', 'Exercise your rights without receiving different or inferior service'],
            ].map(([right, desc]) => (
              <div key={right} className="bg-[#0b0c10] p-3 rounded-xl border border-white/5 space-y-1">
                <p className="font-bold text-rose-400 text-[11px] uppercase tracking-wider">Right to {right}</p>
                <p className="text-slate-300 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400">To exercise any of these rights, contact us using the information below. We will respond within <strong className="text-white">45 days</strong> as required by law.</p>
        </section>

        {/* 7. Children's Privacy */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center space-x-3 text-emerald-400 border-b border-white/5 pb-4">
            <ShieldCheck className="w-6 h-6" />
            <h2 className="font-heading text-xl font-bold text-white">7. Children's Privacy</h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Our services are not directed at children under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware that a child under 13 has provided us with personal data, we will delete it immediately. If you believe a child has submitted data to us, contact us immediately.
          </p>
        </section>

        {/* 8. Security */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center space-x-3 text-sky-400 border-b border-white/5 pb-4">
            <Lock className="w-6 h-6" />
            <h2 className="font-heading text-xl font-bold text-white">8. Security of Your Information</h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            We implement industry-standard security measures to protect your personal information, including:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {[
              ['TLS/HTTPS Encryption', 'All data in transit is encrypted using TLS 1.3'],
              ['Stripe PCI-DSS Compliance', 'Card data never touches our servers — processed by Stripe Level 1 PCI'],
              ['Supabase Row-Level Security', 'Database access restricted by customer identity, not just API keys'],
            ].map(([feature, desc]) => (
              <div key={feature} className="bg-[#0b0c10] p-3 rounded-xl border border-white/5 space-y-1">
                <p className="font-bold text-sky-400 text-[11px]">{feature}</p>
                <p className="text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 9. Changes to this Policy */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center space-x-3 text-amber-400 border-b border-white/5 pb-4">
            <Mail className="w-6 h-6" />
            <h2 className="font-heading text-xl font-bold text-white">9. Changes to This Privacy Policy</h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            We may update this Privacy Policy from time to time to reflect changes in law, technology, or our business practices. When we make material changes, we will update the Effective Date at the top of this page and notify existing customers by email when feasible. Your continued use of our services after the effective date constitutes acceptance of the updated policy.
          </p>
        </section>

        {/* Contact */}
        <div className="bg-[#0b0c10] p-6 rounded-2xl border border-white/10 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-white font-bold text-sm">
            <Phone className="w-4 h-4 text-orange-400" />
            Privacy Questions or Data Requests
          </div>
          <p className="text-xs text-slate-400">
            Adaptivity Performance LLC • 410 FM 156, Justin, TX 76247
          </p>
          <p className="text-xs text-slate-400">
            Phone: <a href={SITE_PHONE_TEL} className="text-orange-400 font-bold hover:underline">{SITE_PHONE_DISPLAY}</a>
          </p>
          <p className="text-xs text-slate-500 mt-2">
            We respond to all privacy requests within 45 days as required by the CCPA and Texas Privacy Protection Act.
          </p>
        </div>

      </div>
    </div>
  );
};
