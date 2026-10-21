/** IRS tax forms for 1099 contractors — shared copy. */

/** Payments made in 2026 and later: $2,000 (raised from $600 by the 2025
 *  tax law; the IRS adjusts it for inflation after 2026). */
export const FORM_1099_NEC_THRESHOLD_DOLLARS = 2000;

export const FORM_1099_NEC_NOTICE =
  `If Adaptivity pays you $${FORM_1099_NEC_THRESHOLD_DOLLARS.toLocaleString('en-US')} or more in nonemployee compensation during a calendar year, we are required to file Form 1099-NEC with the IRS and furnish a copy to you by January 31 of the following year.`;

export const FORM_1099_NEC_PLATFORM_NOTE =
  'Give dispatch a completed Form W-9 so we can prepare 1099-NEC reporting. Your pay is recorded on every job you close out in the app, and that is what the 1099-NEC totals.';
