import React from 'react';
import {
  ShieldCheck,
  Eye,
  Database,
  Mail,
  Share2,
  Lock,
  Clock,
  UserX,
  PhoneCall,
  MessageSquare,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { SITE_PHONE_DISPLAY, SITE_PHONE_TEL } from '../site/seo';
import { SiteLink } from '../site/SiteLink';

export const PrivacyPolicyPage: React.FC = () => {
  const effectiveDate = 'January 1, 2026';

  return (
    <div className="py-16 bg-[#08090d] text-slate-300 min-h-screen">
      <div className="container mx-auto px-4 max-w-4xl space-y-12">
        {/* Page Header */}
        <div className="text-center space-y-3 border-b border-white/10 pb-8">
          <div className="inline-flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Texas TDPSA & CCPA Compliant Privacy Policy</span>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-white">
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto">
            Adaptivity Performance LLC • Effective Date: <strong className="text-white">{effectiveDate}</strong>
          </p>
          <p className="text-xs text-slate-500 max-w-2xl mx-auto">
            This Privacy Policy explains how Adaptivity Performance LLC (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects, uses, discloses, and protects your personal information when you use our website at adaptivityperformance.com and mobile mechanic services across North Texas.
          </p>
        </div>

        {/* 1. Information We Collect */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-5">
          <div className="flex items-center space-x-3 text-sky-400 border-b border-white/5 pb-4">
            <Database className="w-6 h-6 flex-shrink-0" />
            <h2 className="font-heading text-xl font-bold text-white">1. Information We Collect</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-[#0b0c10] p-4 rounded-2xl border border-white/5 space-y-2">
              <p className="font-bold text-sky-400 uppercase tracking-wider text-[11px]">Information You Provide</p>
              <ul className="space-y-1.5 text-slate-300 leading-relaxed list-disc list-inside">
                <li>Full name, phone number, and email address for booking and dispatch</li>
                <li>Vehicle details: VIN, year, make, model, trim, and current odometer mileage</li>
                <li>Service location: Home driveway, workplace, or designated parking address</li>
                <li>Payment details: Processed securely via encrypted PCI-DSS payment gateways</li>
                <li>Referral codes and service notes submitted through booking forms</li>
                <li>Customer garage and vehicle service history preferences</li>
              </ul>
            </div>
            <div className="bg-[#0b0c10] p-4 rounded-2xl border border-white/5 space-y-2">
              <p className="font-bold text-sky-400 uppercase tracking-wider text-[11px]">Automatically Collected Data</p>
              <ul className="space-y-1.5 text-slate-300 leading-relaxed list-disc list-inside">
                <li>IP address and approximate geolocation (city-level across DFW)</li>
                <li>Browser type, operating system, and mobile device characteristics</li>
                <li>Pages visited, referring URL, and site interaction analytics</li>
                <li>Diagnostic Trouble Codes (DTCs) and OBD-II telemetry submitted via diagnostic tools</li>
                <li>Session cookies and preference tokens</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 2. How We Use Your Information */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-5">
          <div className="flex items-center space-x-3 text-orange-400 border-b border-white/5 pb-4">
            <Eye className="w-6 h-6 flex-shrink-0" />
            <h2 className="font-heading text-xl font-bold text-white">2. How We Use Your Information</h2>
          </div>
          <div className="space-y-2 text-xs text-slate-300">
            {[
              ['Schedule and dispatch certified mobile technicians directly to your address', 'Core Dispatch'],
              ['Provide transparent digital quotes, inspection photos, and invoices upon service completion', 'Invoicing'],
              ['Report completed maintenance and repairs to CARFAX & Experian AutoCheck to enhance vehicle resale value', 'Vehicle History'],
              ['Send real-time appointment confirmations, technician en-route SMS alerts, and warranty receipts', 'Communications'],
              ['Verify identity, prevent fraud, and maintain secure transaction processing', 'Security'],
              ['Comply with Texas Property Code, TCEQ environmental standards, and federal tax laws', 'Legal Compliance'],
              ['Continuously refine mobile route optimization, response times, and technician training quality', 'Service Quality'],
            ].map(([use, category]) => (
              <div key={use} className="flex items-start space-x-3 bg-[#0b0c10] p-3 rounded-xl border border-white/5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 flex flex-wrap items-center justify-between gap-1">
                  <span className="text-white">{use}</span>
                  <span className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded font-mono flex-shrink-0">
                    {category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Sharing of Information & Data Sharing Disclosures */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-5">
          <div className="flex items-center space-x-3 text-amber-400 border-b border-white/5 pb-4">
            <Share2 className="w-6 h-6 flex-shrink-0" />
            <h2 className="font-heading text-xl font-bold text-white">3. How We Share Your Information & Data Sharing Disclosures</h2>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl space-y-2 text-xs">
            <p className="font-bold text-amber-300 uppercase tracking-wider text-[11px]">Strict Data Sharing Policy</p>
            <ul className="space-y-1 text-slate-200 leading-relaxed list-disc list-inside">
              <li><strong>Customer data is not shared with 3rd parties for promotional or marketing purposes.</strong></li>
              <li><strong>Mobile opt-in and consent are never shared with anyone for any purpose. Any information sharing that may be mentioned elsewhere in this policy excludes mobile opt-in data.</strong></li>
            </ul>
          </div>
          <p className="text-xs text-slate-400">
            We do <strong className="text-white">NOT</strong> sell or rent your personal information to third parties or data brokers. We share data only with trusted infrastructure partners strictly necessary to perform our operational automotive services:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {[
              ['Stripe & Digital Payment Processors', 'Secure payment card processing, digital invoicing, and merchant reconciliation'],
              ['CARFAX / Experian AutoCheck', 'Official vehicle maintenance records syncing by Vehicle Identification Number (VIN)'],
              ['Supabase Cloud Database', 'Encrypted cloud infrastructure with strict Row-Level Security (RLS) policies'],
              ['Financing Partners (Affirm / Klarna / Afterpay)', 'Optional installment financing when selected by customer at checkout'],
              ['Google Analytics', 'Anonymized web performance metrics (can be declined via cookie settings)'],
              ['Certified Flatbed Towing Partners', 'Emergency shop transport when authorized by vehicle owner'],
            ].map(([partner, use]) => (
              <div key={partner} className="bg-[#0b0c10] p-3.5 rounded-xl border border-white/5 space-y-1">
                <p className="font-bold text-white text-[11px]">{partner}</p>
                <p className="text-slate-400 leading-relaxed">{use}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            We may disclose information if required by law, subpoena, or to protect the safety of our technicians, customers, or the general public.
          </p>
        </section>

        {/* 4. Messaging Consent and Privacy & Messaging Terms and Conditions */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-6">
          <div className="flex items-center space-x-3 text-emerald-400 border-b border-white/5 pb-4">
            <MessageSquare className="w-6 h-6 flex-shrink-0" />
            <div>
              <h2 className="font-heading text-xl font-bold text-white">4. Messaging Consent and Privacy</h2>
              <p className="text-xs text-slate-400">10DLC & TCPA Compliant Mobile Messaging Policy</p>
            </div>
          </div>

          {/* Data Sharing Callout */}
          <div className="bg-[#0b0c10] p-5 rounded-2xl border border-emerald-500/20 space-y-3 text-xs">
            <h3 className="font-bold text-emerald-400 uppercase tracking-wider text-xs">Data Sharing</h3>
            <ul className="space-y-1.5 text-slate-300 leading-relaxed list-disc list-inside">
              <li>Customer data is not shared with 3rd parties for promotional or marketing purposes.</li>
              <li>Mobile opt-in and consent are never shared with anyone for any purpose. Any information sharing that may be mentioned elsewhere in this policy excludes mobile opt-in data.</li>
            </ul>
          </div>

          {/* Real Adaptivity Messaging Terms and Conditions */}
          <div className="bg-[#0b0c10] p-5 sm:p-6 rounded-2xl border border-white/10 space-y-4 text-xs">
            <h3 className="font-heading text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-orange-400" />
              Real Adaptivity Messaging Terms and Conditions
            </h3>

            <ol className="space-y-3 text-slate-300 leading-relaxed list-decimal list-inside">
              <li className="pl-1">
                <span className="font-semibold text-white">Program Description:</span> The messaging program consists of general conversational messaging to answer questions and provide support to customers.
              </li>
              <li className="pl-1">
                <span className="font-semibold text-white">Cancellation &amp; Opt-Out:</span> You can cancel the SMS service at any time. Just text &apos;STOP&apos; to the phone number from which you received messages. After you send the SMS message &apos;STOP&apos; to us, we will send you an SMS message to confirm that you have been unsubscribed. After this, you will no longer receive SMS messages from us. If you want to join again, just sign up as you did the first time and we will start sending SMS messages to you again.
              </li>
              <li className="pl-1">
                <span className="font-semibold text-white">Customer Support &amp; Help:</span> If you are experiencing issues with the messaging program you can reply with the keyword HELP for more assistance, or you can get help directly at <a href="mailto:michaelrobertsmith2002@gmail.com" className="text-orange-400 underline hover:text-orange-300">michaelrobertsmith2002@gmail.com</a>.
              </li>
              <li className="pl-1">
                <span className="font-semibold text-white">Carrier Liability:</span> Carriers are not liable for delayed or undelivered messages.
              </li>
              <li className="pl-1">
                <span className="font-semibold text-white">Rates &amp; Message Frequency:</span> As always, message and data rates may apply for any messages sent to you from us and to us from you. Message frequency will vary based on communication needs. If you have any questions about your text plan or data plan, it is best to contact your wireless provider.
              </li>
              <li className="pl-1">
                <span className="font-semibold text-white">Privacy Questions:</span> If you have any questions regarding privacy, please read our privacy policy contained in the rest of this document/page.
              </li>
            </ol>
          </div>
        </section>

        {/* 5. Cookies & Tracking Technologies */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-5">
          <div className="flex items-center space-x-3 text-purple-400 border-b border-white/5 pb-4">
            <Lock className="w-6 h-6 flex-shrink-0" />
            <h2 className="font-heading text-xl font-bold text-white">5. Cookies & Tracking Technologies</h2>
          </div>
          <div className="text-xs text-slate-300 space-y-3">
            <p>We use minimal, privacy-focused cookies to ensure site functionality and improve user experience:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                ['Essential Cookies', 'Required for site security, customer login sessions, and booking flow state. Cannot be disabled.', 'text-emerald-400'],
                ['Analytics Cookies', 'Google Analytics 4 for aggregated, anonymized usage insights. Can be declined at any time.', 'text-amber-400'],
                ['Preference Cookies', 'Saves your service mode (mobile/shop), zip code, and vehicle details for faster future booking.', 'text-sky-400'],
              ].map(([type, desc, color]) => (
                <div key={type} className="bg-[#0b0c10] p-3 rounded-xl border border-white/5 space-y-1">
                  <p className={`font-bold text-[11px] uppercase tracking-wider ${color}`}>{type}</p>
                  <p className="text-slate-400 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. Data Retention */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-5">
          <div className="flex items-center space-x-3 text-slate-400 border-b border-white/5 pb-4">
            <Clock className="w-6 h-6 flex-shrink-0" />
            <h2 className="font-heading text-xl font-bold text-white">6. Data Retention Schedule</h2>
          </div>
          <div className="text-xs text-slate-300 space-y-2">
            <p>We retain personal records strictly as necessary to fulfill service warranties and satisfy statutory obligations:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                ['Booking & repair orders', '7 years (Texas business record retention requirements)'],
                ['Payment transaction logs', '7 years (IRS & Texas Comptroller audit compliance)'],
                ['Customer portal accounts', 'Until account deletion is requested by the customer'],
                ['CARFAX VIN repair history', 'Reported permanently to vehicle history databases'],
                ['Website analytics data', '14 months (Google Analytics default)'],
                ['Cookie consent preferences', '1 year or until browser storage is cleared'],
              ].map(([item, period]) => (
                <div key={item} className="bg-[#0b0c10] p-3 rounded-xl border border-white/5 flex justify-between items-center gap-2">
                  <span className="text-white">{item}</span>
                  <span className="text-orange-400 font-mono text-[10px] flex-shrink-0">{period}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 7. Your Privacy Rights (Texas TDPSA & CCPA) */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-5">
          <div className="flex items-center space-x-3 text-rose-400 border-b border-white/5 pb-4">
            <UserX className="w-6 h-6 flex-shrink-0" />
            <h2 className="font-heading text-xl font-bold text-white">7. Your Privacy Rights (Texas TDPSA & CCPA)</h2>
          </div>
          <p className="text-xs text-slate-400">
            Under the Texas Data Privacy and Security Act (TDPSA) and California Consumer Privacy Act (CCPA), you enjoy the following rights:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {[
              ['Know & Confirm', 'Confirm whether we are processing your personal data and request details on collected categories'],
              ['Access & Portability', 'Obtain a copy of your personal data in a readable, portable digital format'],
              ['Correct Inaccuracies', 'Request correction of inaccurate or outdated personal and vehicle information'],
              ['Delete Data', 'Request deletion of personal data provided by or obtained about you (subject to legal retention requirements)'],
              ['Opt-Out of Profiling', 'Opt out of targeted advertising, profiling, or non-essential data processing'],
              ['Non-Discrimination', 'Exercise your privacy rights without facing differences in service quality or pricing'],
            ].map(([right, desc]) => (
              <div key={right} className="bg-[#0b0c10] p-3 rounded-xl border border-white/5 space-y-1">
                <p className="font-bold text-rose-400 text-[11px] uppercase tracking-wider">Right to {right}</p>
                <p className="text-slate-300 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400">
            To submit a data request or inquiry, contact us at <strong>service@adaptivityperformance.com</strong>. We verify and respond to all verified requests within <strong className="text-white">45 days</strong>.
          </p>
        </section>

        {/* 8. Security Architecture */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center space-x-3 text-sky-400 border-b border-white/5 pb-4">
            <Lock className="w-6 h-6 flex-shrink-0" />
            <h2 className="font-heading text-xl font-bold text-white">8. Security Architecture</h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            We enforce multi-layered administrative and technical safeguards to secure your data:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {[
              ['TLS 1.3 In-Flight Encryption', 'All web traffic and API endpoints are encrypted in transit via modern TLS certificates'],
              ['PCI-DSS Level 1 Compliance', 'Payment card data is tokenized directly by certified payment processors'],
              ['Row-Level Security (RLS)', 'Supabase cloud database enforces identity-based security boundaries on every record'],
            ].map(([feature, desc]) => (
              <div key={feature} className="bg-[#0b0c10] p-3 rounded-xl border border-white/5 space-y-1">
                <p className="font-bold text-sky-400 text-[11px]">{feature}</p>
                <p className="text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 9. Children's Privacy & Updates */}
        <section className="bg-[#12141c] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center space-x-3 text-amber-400 border-b border-white/5 pb-4">
            <FileText className="w-6 h-6 flex-shrink-0" />
            <h2 className="font-heading text-xl font-bold text-white">9. Children&apos;s Privacy & Policy Updates</h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Our services are strictly intended for individuals aged 18 and older. We do not knowingly collect information from children under 13 under the Children&apos;s Online Privacy Protection Act (COPPA). We may periodically update this policy; material modifications will be posted here with an updated effective date.
          </p>
        </section>

        {/* Support & Corporate Information */}
        <section className="bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-slate-900 p-6 sm:p-8 rounded-3xl border border-orange-500/30 space-y-6">
          <div className="text-center space-y-2">
            <h3 className="font-heading text-lg font-bold text-white">Privacy Inquiries or Data Rights Requests</h3>
            <p className="text-xs text-slate-400">
              For any questions regarding personal data or privacy compliance, reach out to our team:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <a
              href={SITE_PHONE_TEL}
              className="p-4 rounded-xl bg-black/40 border border-white/10 hover:border-orange-500/50 transition flex items-center space-x-3 group"
            >
              <PhoneCall className="w-5 h-5 text-orange-400 group-hover:scale-110 transition-transform flex-shrink-0" />
              <div>
                <strong className="text-white block">Call / Text Dispatch</strong>
                <span className="text-slate-400">{SITE_PHONE_DISPLAY}</span>
              </div>
            </a>

            <a
              href="mailto:service@adaptivityperformance.com"
              className="p-4 rounded-xl bg-black/40 border border-white/10 hover:border-orange-500/50 transition flex items-center space-x-3 group"
            >
              <Mail className="w-5 h-5 text-orange-400 group-hover:scale-110 transition-transform flex-shrink-0" />
              <div>
                <strong className="text-white block">Email Privacy Officer</strong>
                <span className="text-slate-400">service@adaptivityperformance.com</span>
              </div>
            </a>
          </div>

          <div className="text-[11px] text-slate-500 pt-2 border-t border-white/5 text-center">
            <strong>Corporate Address:</strong> Adaptivity Performance LLC, 410 FM 156, Justin, TX 76247. Registered in the State of Texas.
          </div>
        </section>

        {/* Footer Navigation Back Links */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-white/10 text-xs">
          <SiteLink to="terms" className="text-slate-400 hover:text-white flex items-center gap-1">
            ← Terms of Service
          </SiteLink>
          <SiteLink to="refunds" className="text-slate-400 hover:text-white flex items-center gap-1">
            Refund & Cancellation Policy →
          </SiteLink>
        </div>
      </div>
    </div>
  );
};
