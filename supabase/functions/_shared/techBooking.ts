/** Whether a technician may book a visit for themselves from the tech portal.
 *
 *  Booking for yourself puts the job on your own list, so it takes the same
 *  paperwork a claim does (see claim_booking_for_current_tech): a W-9 on file
 *  and the current contractor agreement signed. It does not need an open
 *  shift, because the visit is usually for a later day.
 *
 *  No imports, so tests/techBooking.test.ts can load it with node.
 */

export type TechBookingDetail = {
  terminated_at?: string | null;
  w9_completed_at?: string | null;
  tax_id_provided?: boolean | null;
  contractor_agreement_signed_at?: string | null;
  contractor_agreement_signature_path?: string | null;
  contractor_agreement_version?: string | null;
};

/** The reason the tech cannot book, or null when they can. */
export function techBookingBlocker(
  detail: TechBookingDetail | null | undefined,
  requiredAgreementVersion: string | null
): string | null {
  if (!detail) return 'Your technician profile is not set up yet. Ask dispatch to finish it.';
  if (detail.terminated_at) return 'Your technician account is no longer active.';
  if (!detail.w9_completed_at || !detail.tax_id_provided) {
    return 'Your W-9 is not on file yet — dispatch records it once they have it.';
  }
  if (!detail.contractor_agreement_signed_at || !detail.contractor_agreement_signature_path) {
    return 'Sign the Independent Contractor Agreement before booking a job.';
  }
  if (requiredAgreementVersion && (detail.contractor_agreement_version ?? '') !== requiredAgreementVersion) {
    return 'The Independent Contractor Agreement has been updated — sign the current version before booking a job.';
  }
  return null;
}
