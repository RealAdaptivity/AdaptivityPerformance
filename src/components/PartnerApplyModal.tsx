import React, { useState } from 'react';
import { Building2, CheckCircle2, Loader2, X } from 'lucide-react';
import { submitPartnerApplication } from '../services/partners';

interface PartnerApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PartnerApplyModal: React.FC<PartnerApplyModalProps> = ({ isOpen, onClose }) => {
  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [hasLift, setHasLift] = useState(false);
  const [bayCount, setBayCount] = useState('1');
  const [hoursNote, setHoursNote] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await submitPartnerApplication({
        businessName,
        contactName,
        email,
        phone,
        address,
        city,
        zipCode,
        hasLift,
        bayCount: Number(bayCount) || 1,
        hoursNote,
        notes,
      });
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not submit application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-[#12141c] border border-white/10 rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#1a1d28]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-extrabold text-white">Partner your shop or garage</h2>
              <p className="text-xs text-slate-400">We’ll review and list approved host locations</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {submitted ? (
            <div className="py-10 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <p className="font-bold text-white">Application received</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Thanks — our team will review your shop/garage details and reach out about onboarding and
                how jobs get routed to your location.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 px-5 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3 text-sm">
              <p className="text-xs text-slate-400 leading-relaxed">
                Ideal for independent shops, bay rentals, and people with garage space who want Adaptivity
                to send them more paid work.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Business / shop name</label>
                <input
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white outline-none focus:border-sky-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Your name</label>
                  <input
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white outline-none focus:border-sky-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Shop / garage address</label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street address"
                  className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white outline-none focus:border-sky-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">City</label>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">ZIP</label>
                  <input
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white outline-none focus:border-sky-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 items-end">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pb-2">
                  <input
                    type="checkbox"
                    checked={hasLift}
                    onChange={(e) => setHasLift(e.target.checked)}
                    className="rounded border-white/20"
                  />
                  Has a lift
                </label>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Bay count</label>
                  <input
                    type="number"
                    min={1}
                    value={bayCount}
                    onChange={(e) => setBayCount(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white outline-none focus:border-sky-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Hours / availability</label>
                <input
                  value={hoursNote}
                  onChange={(e) => setHoursNote(e.target.value)}
                  placeholder="e.g. Mon–Sat 8am–6pm"
                  className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Anything else?</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Specialty work you want more of, capacity, etc."
                  className="w-full bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2.5 text-white outline-none focus:border-sky-500"
                />
              </div>
              {error && <p className="text-xs text-rose-400">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? 'Submitting…' : 'Submit partnership application'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
