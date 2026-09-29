/**
 * Rules for adding a technician from the admin, with no imports so the node
 * test runner can load them. The side-effecting half — reading and writing
 * tech_applications, sending the invite — is onboardTechnician in
 * techApplications.ts, which calls into these.
 *
 * Onboarding deliberately goes through the same pipeline as a tech who
 * applied on the website: an application row, approve_tech_application, the
 * invite-approved-tech email, and link_approved_tech_application when they
 * first sign in. One path means the contractor agreement and insurance
 * disclosure gates, the role guard and the 1099 records all apply the same
 * way to a tech the owner added by hand.
 */

/** The specialties a tech can be given. They decide which jobs the tech can claim,
 *  so the ids must match what techCanClaimServices checks. */
export const TECH_SPECIALTIES: { id: string; label: string }[] = [
  { id: 'mechanical', label: 'Mechanical / ASE' },
  { id: 'tires', label: 'Tires & wheels' },
  { id: 'performance', label: 'Performance' },
  { id: 'glass', label: 'Auto glass' },
  { id: 'bodywork', label: 'Body work' },
  { id: 'detailing', label: 'Mobile detailing' },
  { id: 'modification', label: 'Mods / accessories' },
  { id: 'audio', label: 'Car audio' },
  { id: 'tint', label: 'Window tint' },
  { id: 'wrap', label: 'Wrap / PPF' },
];

export type OnboardingInput = {
  fullName: string;
  email: string;
  phone: string;
  specialties: string[];
};

export type OnboardingField = keyof OnboardingInput;

export type OnboardingCheck =
  | { ok: true; value: OnboardingInput }
  | { ok: false; errors: Partial<Record<OnboardingField, string>> };

/** "(940) 304-0620" from anything with ten digits, a leading 1 allowed. */
export function normalizeUsPhone(input: string): string | null {
  let digits = input.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  if (digits.length !== 10) return null;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Check the form and return it cleaned, or every problem at once.
 *
 * The email matters most: it is the tech's login, where the password-setup
 * email goes, and what link_approved_tech_application matches on when they
 * first sign in. It is lower-cased so the match cannot miss on case.
 */
export function validateOnboarding(input: OnboardingInput): OnboardingCheck {
  const errors: Partial<Record<OnboardingField, string>> = {};

  const fullName = input.fullName.trim().replace(/\s+/g, ' ');
  if (fullName.length < 2) errors.fullName = 'Enter their full name.';

  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email — it’s where their password setup link goes.';
  }

  const phone = normalizeUsPhone(input.phone);
  if (!phone) errors.phone = 'Enter a 10-digit phone number.';

  const known = new Set(TECH_SPECIALTIES.map((s) => s.id));
  const specialties = [...new Set(input.specialties.filter((s) => known.has(s)))];
  if (specialties.length === 0) errors.specialties = 'Pick at least one specialty.';

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { fullName, email, phone: phone!, specialties } };
}

export type ExistingApplication = { id: string; status: string; createdAt: string };

export type OnboardingPlan =
  | { kind: 'create' }
  | { kind: 'approve'; applicationId: string }
  | { kind: 'resend'; applicationId: string };

/**
 * What to do given the applications already on file for this email.
 *
 * - Already approved: don't make a second one. Resend the invite, which the
 *   edge function turns into a password reset if they already have a login.
 * - Applied on the website and waiting: approve that one rather than leave a
 *   duplicate sitting in the Techs inbox.
 * - Only rejected ones, or none: start fresh. approve_tech_application refuses
 *   a rejected row, and the owner adding them by hand is the decision to
 *   take them on now.
 */
export function planOnboarding(existing: ExistingApplication[]): OnboardingPlan {
  const newestFirst = existing.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const approved = newestFirst.find((a) => a.status === 'approved');
  if (approved) return { kind: 'resend', applicationId: approved.id };
  const waiting = newestFirst.find((a) => a.status === 'submitted');
  if (waiting) return { kind: 'approve', applicationId: waiting.id };
  return { kind: 'create' };
}

/** Labels for the chosen specialties, in the order the form lists them. The
 *  application stores these as `trades` so the Techs tab reads the same way it
 *  does for a website application. */
export function specialtyLabels(ids: string[]): string[] {
  const chosen = new Set(ids);
  return TECH_SPECIALTIES.filter((s) => chosen.has(s.id)).map((s) => s.label);
}
