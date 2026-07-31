import React, { useState } from 'react';
import { Send, Phone, Mail, MapPin, CheckCircle2, Loader2, MessageSquare, Car, Wrench, Clock } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { SITE_PHONE_DISPLAY, SITE_PHONE_TEL } from '../site/seo';

type FormState = 'idle' | 'submitting' | 'success' | 'error';

interface ContactFormProps {
  onOpenBooking?: () => void;
}

export const ContactSection: React.FC<ContactFormProps> = ({ onOpenBooking }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [issue, setIssue] = useState('');
  const [preferredContact, setPreferredContact] = useState<'phone' | 'text' | 'email'>('text');
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState('submitting');
    setErrorMsg('');

    try {
      const { error } = await supabase
        .from('contact_inquiries')
        .insert({
          full_name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          vehicle: vehicle.trim(),
          issue_description: issue.trim(),
          preferred_contact: preferredContact,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      setFormState('success');
      setName(''); setPhone(''); setEmail(''); setVehicle(''); setIssue('');
    } catch {
      setFormState('error');
      setErrorMsg('Something went wrong. Please call us directly or try again.');
    }
  };

  return (
    <section className="py-20 bg-[#0c0d12] border-t border-white/5" id="contact">
      <div className="container mx-auto px-4 max-w-6xl">

        {/* Header */}
        <div className="max-w-2xl mx-auto text-center space-y-3 mb-12">
          <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-sky-400 bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/20">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Get in Touch — We Respond Fast</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-white">
            Contact <span className="text-orange-500">Adaptivity</span>
          </h2>
          <p className="text-slate-400 text-sm">
            Send us a message and we'll get back to you within 1 hour during business hours — or call for immediate dispatch.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* Left — Contact Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick contact cards */}
            <a
              href={SITE_PHONE_TEL}
              className="flex items-start gap-4 bg-[#12141c] p-5 rounded-2xl border border-white/10 hover:border-orange-500/40 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
                <Phone className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Call or Text</div>
                <div className="font-bold text-white text-lg group-hover:text-orange-400 transition-colors">{SITE_PHONE_DISPLAY}</div>
                <div className="text-xs text-slate-500">Available 24/7 for emergency dispatch</div>
              </div>
            </a>

            <a
              href="mailto:service@adaptivityperformance.com"
              className="flex items-start gap-4 bg-[#12141c] p-5 rounded-2xl border border-white/10 hover:border-sky-500/40 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Email</div>
                <div className="font-bold text-white group-hover:text-sky-400 transition-colors text-sm">service@adaptivityperformance.com</div>
                <div className="text-xs text-slate-500">Replies within 1 hour</div>
              </div>
            </a>

            <div className="flex items-start gap-4 bg-[#12141c] p-5 rounded-2xl border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Garage Hub</div>
                <div className="font-bold text-white text-sm">410 FM 156, Justin TX 76247</div>
                <div className="text-xs text-slate-500">Mobile dispatch across all of DFW</div>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-[#12141c] p-5 rounded-2xl border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Hours</div>
                <div className="font-bold text-white text-sm">24 / 7 — Every Day</div>
                <div className="text-xs text-slate-500">Emergency mobile dispatch always available</div>
              </div>
            </div>

            {/* Book directly CTA */}
            {onOpenBooking && (
              <button
                id="contact-book-now-btn"
                onClick={onOpenBooking}
                className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Wrench className="w-4 h-4" />
                Skip the Form — Book Online Now
              </button>
            )}
          </div>

          {/* Right — Contact Form */}
          <div className="lg:col-span-3">
            <div className="bg-[#12141c] rounded-3xl border border-white/10 p-6 sm:p-8">
              {formState === 'success' ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="font-heading text-xl font-extrabold text-white">Message Received!</h3>
                  <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
                    We'll reach out within 1 hour. For immediate service, call us directly at{' '}
                    <a href={SITE_PHONE_TEL} className="text-orange-400 font-bold hover:underline">{SITE_PHONE_DISPLAY}</a>.
                  </p>
                  <button
                    onClick={() => setFormState('idle')}
                    className="text-xs text-slate-500 hover:text-slate-300 underline"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="font-heading text-lg font-bold text-white mb-4">Send Us a Message</h3>

                  {/* Name + Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contact-name" className="block text-xs font-bold text-slate-300 mb-1.5">
                        Full Name <span className="text-orange-400">*</span>
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:border-orange-500 focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label htmlFor="contact-phone" className="block text-xs font-bold text-slate-300 mb-1.5">
                        Phone Number <span className="text-orange-400">*</span>
                      </label>
                      <input
                        id="contact-phone"
                        type="tel"
                        required
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="(214) 555-0100"
                        className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:border-orange-500 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="contact-email" className="block text-xs font-bold text-slate-300 mb-1.5">
                      Email Address
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:border-orange-500 focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Vehicle */}
                  <div>
                    <label htmlFor="contact-vehicle" className="block text-xs font-bold text-slate-300 mb-1.5">
                      <Car className="w-3.5 h-3.5 inline mr-1 text-orange-400" />
                      Your Vehicle (Year / Make / Model)
                    </label>
                    <input
                      id="contact-vehicle"
                      type="text"
                      value={vehicle}
                      onChange={e => setVehicle(e.target.value)}
                      placeholder="e.g. 2021 Ford F-150 XLT"
                      className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:border-orange-500 focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Issue */}
                  <div>
                    <label htmlFor="contact-issue" className="block text-xs font-bold text-slate-300 mb-1.5">
                      What's going on? <span className="text-orange-400">*</span>
                    </label>
                    <textarea
                      id="contact-issue"
                      rows={4}
                      required
                      value={issue}
                      onChange={e => setIssue(e.target.value)}
                      placeholder="Describe what you're experiencing — check engine light, noise, service needed, etc."
                      className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:border-orange-500 focus:outline-none transition-colors resize-none"
                    />
                  </div>

                  {/* Preferred contact method */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">How should we reach you?</label>
                    <div className="flex gap-2">
                      {(['text', 'phone', 'email'] as const).map(method => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPreferredContact(method)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border capitalize transition-all ${
                            preferredContact === method
                              ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                              : 'border-white/10 bg-[#0b0c10] text-slate-400 hover:border-white/20'
                          }`}
                        >
                          {method === 'text' ? '💬 Text' : method === 'phone' ? '📞 Call' : '✉️ Email'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {formState === 'error' && (
                    <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2">
                      {errorMsg}
                    </p>
                  )}

                  <button
                    id="contact-submit-btn"
                    type="submit"
                    disabled={formState === 'submitting'}
                    className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    {formState === 'submitting' ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                    ) : (
                      <><Send className="w-4 h-4" /> Send Message</>
                    )}
                  </button>

                  <p className="text-[11px] text-slate-500 text-center">
                    By submitting, you agree to our{' '}
                    <a href="/terms" className="text-orange-400 hover:underline">Terms of Service</a> and{' '}
                    <a href="/privacy" className="text-orange-400 hover:underline">Privacy Policy</a>.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
