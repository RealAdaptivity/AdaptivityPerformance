import { LEGAL_ENTITY_NAME } from './businessIdentity.ts';

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

/** Brand as registered on the campaign: the legal entity, not the trading
 *  name. Shared with the rest of the site so a rename cannot leave the
 *  campaign registration quoting a stale one. */
export const SMS_BRAND = LEGAL_ENTITY_NAME;

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

/* The four disclosures a carrier requires wherever the SMS program is
   described. Exported individually so the privacy policy, the terms of
   service and the opt-in on the contact form quote the same sentences — a
   reviewer comparing two pages must not find two different answers. */

/** What the program sends. Must describe only what we actually send. */
export const SMS_MESSAGE_TYPES_NOTICE =
  `You will receive informational text messages: ${SMS_MESSAGE_TYPES}, and replies that answer your questions and provide support. We do not send marketing or promotional text messages.`;

/** How often. */
export const SMS_FREQUENCY_NOTICE = 'Message frequency varies.';

/** Who pays. */
export const SMS_RATES_NOTICE = 'Message and data rates may apply.';

/** How to stop. CANCEL is kept alongside STOP because the privacy policy's
 *  opt-out clause already offers both; dropping it would make the two
 *  documents disagree about which keyword works. */
export const SMS_OPT_OUT_INSTRUCTION =
  `Reply STOP (or CANCEL) to ${SMS_FROM_NUMBER} to opt out at any time.`;

/** How to get help. */
export const SMS_HELP_INSTRUCTION =
  `Reply HELP to ${SMS_FROM_NUMBER} or contact ${SMS_SUPPORT_EMAIL} for assistance.`;

/** The full set, in the order a reviewer reads them. */
export const SMS_REQUIRED_DISCLOSURES = [
  SMS_MESSAGE_TYPES_NOTICE,
  SMS_FREQUENCY_NOTICE,
  SMS_RATES_NOTICE,
  SMS_OPT_OUT_INSTRUCTION,
  SMS_HELP_INSTRUCTION,
] as const;

export const SMS_CONSENT_QUESTION =
  `Do you agree to receive informational text messages from ${SMS_BRAND}, sent from ${SMS_FROM_NUMBER}?`;

export const SMS_CONSENT_DETAIL =
  `${SMS_FREQUENCY_NOTICE} Messages may include ${SMS_MESSAGE_TYPES}. ` +
  `Consent is not a condition of purchase. ${SMS_RATES_NOTICE} ` +
  `${SMS_OPT_OUT_INSTRUCTION} ${SMS_HELP_INSTRUCTION} ` +
  'We do not share your mobile opt-in information with anyone.';

export const SMS_CONSENT_YES = `Yes, I agree to receive text messages from ${SMS_BRAND}, sent from ${SMS_FROM_NUMBER}.`;

export const SMS_CONSENT_NO = `No, I do not want to receive text messages from ${SMS_BRAND}.`;

/** Stored verbatim with the submission, so a later edit to this file cannot
 *  rewrite what a given person actually agreed to. */
export function smsConsentRecord(agreed: boolean): string {
  return [SMS_CONSENT_QUESTION, SMS_CONSENT_DETAIL, agreed ? SMS_CONSENT_YES : SMS_CONSENT_NO].join(' ');
}
