/** Contractor agreement digital signature — upload + record acceptance. */

import { supabase } from './supabaseClient';

export const CONTRACTOR_AGREEMENT_VERSION = '2026-07-v1';

export type ContractorAgreementStatus = {
  signed: boolean;
  signedAt: string | null;
  signerName: string | null;
  signaturePath: string | null;
  agreementVersion: string | null;
};

export type ContractorAgreementRecord = {
  profileId: string;
  email: string | null;
  fullName: string | null;
  signedAt: string | null;
  signerName: string | null;
  signaturePath: string | null;
  agreementVersion: string | null;
};

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, b64] = dataUrl.split(',');
  const mime = /data:(.*?);/.exec(header)?.[1] || 'image/png';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function fetchContractorAgreementStatus(): Promise<ContractorAgreementStatus> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { signed: false, signedAt: null, signerName: null, signaturePath: null, agreementVersion: null };
  }
  const { data } = await supabase
    .from('mechanic_details')
    .select(
      'contractor_agreement_signed_at, contractor_agreement_signer_name, contractor_agreement_signature_path, contractor_agreement_version'
    )
    .eq('profile_id', user.id)
    .maybeSingle();
  return {
    signed: Boolean(data?.contractor_agreement_signed_at),
    signedAt: (data?.contractor_agreement_signed_at as string) || null,
    signerName: (data?.contractor_agreement_signer_name as string) || null,
    signaturePath: (data?.contractor_agreement_signature_path as string) || null,
    agreementVersion: (data?.contractor_agreement_version as string) || null,
  };
}

/** Upload drawn signature PNG and record E-SIGN acceptance. */
export async function signContractorAgreement(opts: {
  signerName: string;
  signatureDataUrl: string;
}): Promise<{ signedAt: string; signaturePath: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const name = opts.signerName.trim();
  if (name.length < 2) throw new Error('Enter your full legal name');
  if (!opts.signatureDataUrl.startsWith('data:image/')) {
    throw new Error('Draw your signature before submitting');
  }

  const path = `${user.id}/agreement-${CONTRACTOR_AGREEMENT_VERSION}-${Date.now()}.png`;
  const blob = dataUrlToBlob(opts.signatureDataUrl);
  const { error: upErr } = await supabase.storage.from('contractor-agreements').upload(path, blob, {
    contentType: 'image/png',
    upsert: false,
  });
  if (upErr) throw upErr;

  const { data, error } = await supabase.rpc('sign_contractor_agreement', {
    p_signer_name: name,
    p_signature_path: path,
    p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 400) : null,
    p_agreement_version: CONTRACTOR_AGREEMENT_VERSION,
  });
  if (error) throw error;

  return { signedAt: String(data), signaturePath: path };
}

export async function getContractorAgreementSignatureUrl(path: string): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from('contractor-agreements')
    .createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/** Admin: list techs who signed the contractor agreement. */
export async function fetchSignedContractorAgreements(): Promise<ContractorAgreementRecord[]> {
  const { data, error } = await supabase
    .from('mechanic_details')
    .select(
      'profile_id, contractor_agreement_signed_at, contractor_agreement_signer_name, contractor_agreement_signature_path, contractor_agreement_version'
    )
    .not('contractor_agreement_signed_at', 'is', null)
    .order('contractor_agreement_signed_at', { ascending: false });
  if (error) throw error;

  const rows = data || [];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.profile_id as string);
  const { data: profiles } = await supabase.from('profiles').select('id, email, full_name').in('id', ids);
  const byId = new Map((profiles || []).map((p) => [p.id as string, p]));

  return rows.map((row) => {
    const profile = byId.get(row.profile_id as string);
    return {
      profileId: row.profile_id as string,
      email: (profile?.email as string) || null,
      fullName: (profile?.full_name as string) || null,
      signedAt: (row.contractor_agreement_signed_at as string) || null,
      signerName: (row.contractor_agreement_signer_name as string) || null,
      signaturePath: (row.contractor_agreement_signature_path as string) || null,
      agreementVersion: (row.contractor_agreement_version as string) || null,
    };
  });
}
