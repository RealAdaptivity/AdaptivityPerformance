import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SMS_BRAND,
  SMS_OPT_IN_METHOD,
  SMS_SUPPORT_EMAIL,
  SMS_WEBSITE,
  SMS_CONSENT_DETAIL,
  SMS_CONSENT_NO,
  SMS_CONSENT_QUESTION,
  SMS_CONSENT_YES,
  SMS_FREQUENCY_NOTICE,
  SMS_FROM_NUMBER,
  SMS_HELP_INSTRUCTION,
  SMS_MESSAGE_TYPES,
  SMS_MESSAGE_TYPES_NOTICE,
  SMS_OPT_OUT_INSTRUCTION,
  SMS_RATES_NOTICE,
  SMS_REQUIRED_DISCLOSURES,
  smsConsentRecord,
} from '../src/content/smsConsent.ts';

/* A carrier reads this exact wording when approving the 10DLC campaign.
   Every assertion below is a clause the registration requires; if one of them
   starts failing, the campaign is at risk of rejection, not just the test. */

test('the disclosure names the brand and the sending number', () => {
  assert.match(SMS_CONSENT_QUESTION, /RealAdaptivity LLC DBA AdaptivityPerformance/);
  assert.ok(SMS_CONSENT_QUESTION.includes(SMS_FROM_NUMBER), 'must say what number texts come from');
  assert.match(SMS_CONSENT_QUESTION, /^Do you agree to receive/);
});

test('the disclosure carries every clause the campaign requires', () => {
  const required: [RegExp, string][] = [
    [/consent is not a condition of purchase/i, 'consent is not a condition of purchase'],
    [/message frequency varies/i, 'frequency varies'],
    [/message and data rates may apply/i, 'rates may apply'],
    [/\bSTOP\b/, 'STOP to opt out'],
    [/\bHELP\b/, 'HELP for assistance'],
    [/do not share your mobile opt-in/i, 'opt-in data is not shared'],
  ];
  for (const [re, what] of required) {
    assert.match(SMS_CONSENT_DETAIL, re, `disclosure is missing: ${what}`);
  }
});

test('both choices name the brand, and only the yes names the number', () => {
  assert.ok(SMS_CONSENT_YES.includes(SMS_BRAND));
  assert.ok(SMS_CONSENT_YES.includes(SMS_FROM_NUMBER));
  assert.match(SMS_CONSENT_YES, /^Yes, I agree/);

  assert.ok(SMS_CONSENT_NO.includes(SMS_BRAND));
  assert.match(SMS_CONSENT_NO, /^No, I do not want/);
});

test('the campaign is informational only, so no marketing language appears', () => {
  // The registered campaign type is informational. Promotional wording here
  // would contradict both the privacy policy and the Grasshopper registration,
  // which is exactly the mismatch that gets a campaign rejected.
  const marketing = /promotion|special offer|deal|discount|sale\b|marketing/i;
  assert.doesNotMatch(SMS_MESSAGE_TYPES, marketing);
  assert.doesNotMatch(SMS_CONSENT_DETAIL, marketing);
  assert.doesNotMatch(SMS_CONSENT_QUESTION, marketing);
});

test('the stored record keeps the question, the terms and the answer together', () => {
  const yes = smsConsentRecord(true);
  assert.ok(yes.includes(SMS_CONSENT_QUESTION));
  assert.ok(yes.includes(SMS_CONSENT_DETAIL));
  assert.ok(yes.includes(SMS_CONSENT_YES));
  assert.ok(!yes.includes(SMS_CONSENT_NO));

  const no = smsConsentRecord(false);
  assert.ok(no.includes(SMS_CONSENT_NO));
  assert.ok(!no.includes(SMS_CONSENT_YES));
});

test('the record is self-contained evidence of what was agreed', () => {
  // Stored verbatim on the row, so editing the form later cannot rewrite what
  // a given person actually saw and agreed to.
  const rec = smsConsentRecord(true);
  for (const clause of [SMS_BRAND, SMS_FROM_NUMBER, 'STOP', 'HELP', 'not a condition of purchase']) {
    assert.ok(rec.includes(clause), `stored consent is missing: ${clause}`);
  }
});

test('opt-out offers both keywords the policy names', () => {
  // The privacy policy's messaging terms say STOP or CANCEL. If the opt-in
  // offered only one of them the two documents would disagree, which is the
  // mismatch a reviewer looks for.
  assert.match(SMS_CONSENT_DETAIL, /\bSTOP\b/);
  assert.match(SMS_CONSENT_DETAIL, /\bCANCEL\b/);
});

test('support contact is reachable by both phone and email', () => {
  assert.ok(SMS_CONSENT_DETAIL.includes(SMS_SUPPORT_EMAIL), 'HELP must name an email');
  assert.ok(SMS_CONSENT_DETAIL.includes(SMS_FROM_NUMBER), 'HELP must name a phone number');
  assert.match(SMS_SUPPORT_EMAIL, /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i);
});

test('the opt-in method is named and is the truth', () => {
  // The policy template requires the opt-in method to be stated. Ours is the
  // website contact form; nothing else captures this consent.
  assert.match(SMS_OPT_IN_METHOD, /contact form/i);
  assert.ok(SMS_OPT_IN_METHOD.includes(SMS_WEBSITE));
});

/* The carrier review came back saying the required disclosures were missing.
   They were present on the privacy policy but nowhere on the terms of service.
   These pin the exact wording that was asked for. */

test('the opt-out instruction names the keyword and the number', () => {
  assert.match(SMS_OPT_OUT_INSTRUCTION, /\bSTOP\b/);
  assert.ok(
    SMS_OPT_OUT_INSTRUCTION.includes(SMS_FROM_NUMBER),
    '"Reply STOP" without a number is not an instruction a customer can follow'
  );
  // CANCEL stays because the privacy policy's opt-out clause offers both.
  assert.match(SMS_OPT_OUT_INSTRUCTION, /\bCANCEL\b/);
});

test('the help instruction names the keyword, the number and the email', () => {
  assert.match(SMS_HELP_INSTRUCTION, /\bHELP\b/);
  assert.ok(SMS_HELP_INSTRUCTION.includes(SMS_FROM_NUMBER));
  assert.ok(SMS_HELP_INSTRUCTION.includes(SMS_SUPPORT_EMAIL));
});

test('frequency and rates are stated in the words the carrier asked for', () => {
  assert.match(SMS_FREQUENCY_NOTICE, /message frequency varies/i);
  assert.match(SMS_RATES_NOTICE, /message and data rates may apply/i);
});

test('the message-type notice describes only what we actually send', () => {
  assert.ok(SMS_MESSAGE_TYPES_NOTICE.includes(SMS_MESSAGE_TYPES));
  // The campaign is informational; promising promotions here would contradict
  // both the registration and the privacy policy.
  assert.match(SMS_MESSAGE_TYPES_NOTICE, /do not send marketing or promotional/i);
});

test('every required disclosure is collected in one exported set', () => {
  assert.equal(SMS_REQUIRED_DISCLOSURES.length, 5);
  for (const clause of SMS_REQUIRED_DISCLOSURES) {
    assert.ok(typeof clause === 'string' && clause.length > 0);
  }
});

test('the opt-in on the form quotes the same instructions as the policies', () => {
  // A reviewer comparing the form against the terms must not find two
  // different answers about how to stop or get help.
  assert.ok(SMS_CONSENT_DETAIL.includes(SMS_OPT_OUT_INSTRUCTION));
  assert.ok(SMS_CONSENT_DETAIL.includes(SMS_HELP_INSTRUCTION));
  assert.ok(SMS_CONSENT_DETAIL.includes(SMS_FREQUENCY_NOTICE));
  assert.ok(SMS_CONSENT_DETAIL.includes(SMS_RATES_NOTICE));
});
