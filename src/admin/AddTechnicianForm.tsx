import React, { useState } from 'react';
import { CheckCircle2, Loader2, UserPlus, X } from 'lucide-react';
import {
  TECH_SPECIALTIES,
  validateOnboarding,
  type OnboardingField,
} from '../services/techOnboarding';
import { onboardTechnician } from '../services/techApplications';

/**
 * Add a technician without them applying on the website first. They get the
 * same password-setup email an approved applicant gets; signing in with it
 * makes them a tech, and the portal then asks them to sign the contractor
 * agreement and the insurance disclosure before they can be dispatched.
 */
export const AddTechnicianForm: React.FC<{ onAdded?: () => void }> = ({ onAdded }) => {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [specialties, setSpecialties] = useState<string[]>(['mechanical']);
  const [toolsVerified, setToolsVerified] = useState(false);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Partial<Record<OnboardingField, string>>>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const reset = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setSpecialties(['mechanical']);
    setToolsVerified(false);
    setNotes('');
    setErrors({});
    setFailure(null);
  };

  const toggleSpecialty = (id: string) =>
    setSpecialties((cur) => (cur.includes(id) ? cur.filter((s) => s !== id) : [...cur, id]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFailure(null);
    setDone(null);
    const check = validateOnboarding({ fullName, email, phone, specialties });
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const result = await onboardTechnician(check.value, {
        toolsVerified,
        adminNotes: notes,
      });
      setDone(result.message);
      reset();
      setOpen(false);
      onAdded?.();
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'Could not add the technician.');
    } finally {
      setBusy(false);
    }
  };

  const field =
    'w-full min-h-[44px] rounded-xl bg-[#0b0c10] border px-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50';
  const label = 'block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5';

  if (!open) {
    return (
      <div className="space-y-3">
        {done && (
          <p role="status" className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-100">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-300" aria-hidden="true" />
            {done}
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setDone(null);
            setOpen(true);
          }}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white hover:bg-orange-600"
        >
          <UserPlus className="w-4 h-4" aria-hidden="true" /> Add a technician
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-2xl border border-orange-500/30 bg-[#12141c] p-5 space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white">Add a technician</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            They’ll get an email to set a password, then sign in at the tech portal. Before their
            first job the portal has them sign the contractor agreement and the vehicle insurance
            disclosure.
          </p>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="tech-name" className={label}>Full name</label>
          <input
            id="tech-name"
            autoComplete="off"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            aria-invalid={errors.fullName ? true : undefined}
            aria-describedby={errors.fullName ? 'tech-name-err' : undefined}
            className={`${field} ${errors.fullName ? 'border-amber-400/70' : 'border-white/10'}`}
          />
          {errors.fullName && <p id="tech-name-err" className="mt-1.5 text-[11px] text-amber-300">{errors.fullName}</p>}
        </div>
        <div>
          <label htmlFor="tech-email" className={label}>Email (their login)</label>
          <input
            id="tech-email"
            type="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'tech-email-err' : undefined}
            className={`${field} ${errors.email ? 'border-amber-400/70' : 'border-white/10'}`}
          />
          {errors.email && <p id="tech-email-err" className="mt-1.5 text-[11px] text-amber-300">{errors.email}</p>}
        </div>
        <div>
          <label htmlFor="tech-phone" className={label}>Mobile phone</label>
          <input
            id="tech-phone"
            type="tel"
            autoComplete="off"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={errors.phone ? 'tech-phone-err' : undefined}
            className={`${field} ${errors.phone ? 'border-amber-400/70' : 'border-white/10'}`}
          />
          {errors.phone && <p id="tech-phone-err" className="mt-1.5 text-[11px] text-amber-300">{errors.phone}</p>}
        </div>
      </div>

      <fieldset>
        <legend className={label}>Specialties — decide which jobs they can claim</legend>
        <div className="flex flex-wrap gap-2">
          {TECH_SPECIALTIES.map((s) => {
            const on = specialties.includes(s.id);
            return (
              <label
                key={s.id}
                className={`inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-full border px-3.5 text-xs font-semibold transition-colors ${
                  on
                    ? 'border-orange-500/60 bg-orange-500/15 text-orange-100'
                    : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25'
                }`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggleSpecialty(s.id)}
                  className="accent-orange-500"
                />
                {s.label}
              </label>
            );
          })}
        </div>
        {errors.specialties && <p className="mt-1.5 text-[11px] text-amber-300">{errors.specialties}</p>}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
        <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2.5 text-xs font-semibold text-slate-200">
          <input
            type="checkbox"
            checked={toolsVerified}
            onChange={(e) => setToolsVerified(e.target.checked)}
            className="h-4 w-4 accent-orange-500"
          />
          I’ve checked their tools
        </label>
        <div>
          <label htmlFor="tech-notes" className={label}>Notes (only admins see these)</label>
          <input
            id="tech-notes"
            autoComplete="off"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={`${field} border-white/10`}
          />
        </div>
      </div>

      {failure && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
          {failure}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <UserPlus className="w-4 h-4" aria-hidden="true" />}
          {busy ? 'Adding…' : 'Add and send sign-in email'}
        </button>
        <p className="text-[11px] text-slate-500">
          Already applied or already added? It uses their existing record instead of making a duplicate.
        </p>
      </div>
    </form>
  );
};
