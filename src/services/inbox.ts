import { supabase } from './supabaseClient';

/** Messages from the Contact Us form and membership requests, newest first.
 *  The public site may only insert them; only an admin can read or update. */

export type InquiryTopic = 'contact' | 'membership';
export type InquiryStatus = 'new' | 'replied' | 'closed';

export type Inquiry = {
  id: string;
  createdAt: string;
  topic: InquiryTopic;
  status: InquiryStatus;
  fullName: string;
  phone: string | null;
  email: string | null;
  vehicle: string | null;
  message: string;
  /** null when the form did not ask (membership requests). */
  smsConsent: boolean | null;
  handledAt: string | null;
};

const COLUMNS =
  'id, created_at, topic, status, full_name, phone, email, vehicle, issue_description, sms_consent, handled_at';

type Row = {
  id: string;
  created_at: string;
  topic: string | null;
  status: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  vehicle: string | null;
  issue_description: string;
  sms_consent: boolean | null;
  handled_at: string | null;
};

function fromRow(r: Row): Inquiry {
  return {
    id: r.id,
    createdAt: r.created_at,
    topic: r.topic === 'membership' ? 'membership' : 'contact',
    status: r.status === 'replied' || r.status === 'closed' ? r.status : 'new',
    fullName: r.full_name,
    phone: r.phone,
    email: r.email,
    vehicle: r.vehicle,
    message: r.issue_description,
    smsConsent: r.sms_consent,
    handledAt: r.handled_at,
  };
}

export async function fetchInquiries(limit = 200): Promise<Inquiry[]> {
  const { data, error } = await supabase
    .from('contact_inquiries')
    .select(COLUMNS)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[]).map(fromRow);
}

/** How many are still waiting on a reply, for the tab badge. */
export async function countNewInquiries(): Promise<number> {
  const { count, error } = await supabase
    .from('contact_inquiries')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'new');
  if (error) return 0;
  return count ?? 0;
}

export async function setInquiryStatus(id: string, status: InquiryStatus, adminId?: string): Promise<void> {
  const { error } = await supabase
    .from('contact_inquiries')
    .update({
      status,
      handled_at: status === 'new' ? null : new Date().toISOString(),
      handled_by: status === 'new' ? null : adminId ?? null,
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/** A membership request from the site, saved where the Inbox shows it
 *  rather than left to the customer's email app. */
export async function submitMembershipRequest(input: {
  fullName: string;
  phone: string;
  email: string;
  vehicle: string;
  plan: string;
  billing: string;
  priceDollars: number;
  visitsPerYear: number;
}): Promise<void> {
  const { error } = await supabase.from('contact_inquiries').insert({
    topic: 'membership',
    full_name: input.fullName.trim(),
    phone: input.phone.trim() || null,
    email: input.email.trim() || null,
    vehicle: input.vehicle.trim() || null,
    issue_description: [
      `Membership request: ${input.plan} plan, billed ${input.billing} ($${input.priceDollars}).`,
      `Expects about ${input.visitsPerYear} visit${input.visitsPerYear === 1 ? '' : 's'} a year.`,
      'Follow up to take payment and start the membership.',
    ].join(' '),
    preferred_contact: 'text',
  });
  if (error) throw new Error(error.message);
}
