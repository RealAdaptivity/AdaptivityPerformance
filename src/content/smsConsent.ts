/**
 * SMS opt-in wording for the 10DLC / Grasshopper campaign.
 *
 * Kept in one place, and asserted in tests, because a carrier reviews this
 * exact text. Every clause below is there because the registration requires
 * it — dropping any one of them is what gets a campaign rejected:
 *
 *   - the sending brand, and the number messages come from
 *   - what the messages are (must match the privacy policy and the campaign
 *     type registered with Grasshopper — informational only here, so the
 *     campaign must NOT be registered as Marketing)
 *   - that consent is not a condition of purchase
 *   - that frequency varies and message/data rates may apply
 *   - STOP to opt out, HELP for help
 *   - a link to the privacy policy
 *
 * The opt-in itself must be an explicit choice with nothing pre-selected.
 */

/** Brand as registered on the campaign, not the marketing name. */
export const SMS_BRAND = 'RealAdaptivity LLC DBA AdaptivityPerformance';

/** The number texts are sent from, as registered on the campaign.
 *  Written out rather than imported from site/seo: this is a registration
 *  fact, and a business can end up sending from a dedicated 10DLC number that
 *  is not the one advertised for calls. verify-production-ops.mjs fails the
 *  build if the two drift apart without that being deliberate. */
export const SMS_FROM_NUMBER = '(940) 304-0620';

/** Informational only. If this ever grows to include offers or promotions, the
 *  Grasshopper campaign has to be re-registered as Marketing and the privacy
 *  policy updated to match, or the opt-in and the campaign disagree. */
/** Where the opt-in is captured. The carrier's policy template requires the
 *  opt-in method to be named, and it must be the truth. */
export const SMS_OPT_IN_METHOD = 'our website contact form at adaptivityperformance.com';

/** Support contact for the messaging program: HELP, opt-out and questions. */
export const SMS_SUPPORT_EMAIL = 'owner@adaptivityperformance.com';
export const SMS_WEBSITE = 'adaptivityperformance.com';

export const SMS_MESSAGE_TYPES =
  'appointment reminders, booking confirmations, repair status updates and receipts';

export const SMS_CONSENT_QUESTION =
  `Do you agree to receive informational text messages from ${SMS_BRAND}, sent from ${SMS_FROM_NUMBER}?`;

export const SMS_CONSENT_DETAIL =
  `Message frequency varies and may include ${SMS_MESSAGE_TYPES}. ` +
  'Consent is not a condition of purchase. Message and data rates may apply. ' +
  `Reply STOP or CANCEL at any time to end or unsubscribe. For assistance, reply HELP or contact support at ${SMS_FROM_NUMBER} or ${SMS_SUPPORT_EMAIL}. ` +
  'We do not share your mobile opt-in information with anyone.';

export const SMS_CONSENT_YES = `Yes, I agree to receive text messages from ${SMS_BRAND}, sent from ${SMS_FROM_NUMBER}.`;

export const SMS_CONSENT_NO = `No, I do not want to receive text messages from ${SMS_BRAND}.`;

/** Stored verbatim with the submission, so a later edit to this file cannot
 *  rewrite what a given person actually agreed to. */
export function smsConsentRecord(agreed: boolean): string {
  return [SMS_CONSENT_QUESTION, SMS_CONSENT_DETAIL, agreed ? SMS_CONSENT_YES : SMS_CONSENT_NO].join(' ');
}
