/** Personal vehicle insurance disclosure — record and read back a signature. */

import { supabase } from './supabaseClient';
import {
  COMPANY_REPRESENTATIVE_NAME,
  COMPANY_REPRESENTATIVE_TITLE,
  VEHICLE_INSURANCE_DISCLOSURE_VERSION,
} from '../content/vehicleInsuranceDisclosure';

/** Signatures share the contractor-agreements bucket. Its policies key on the
 *  first path segment being the signer's own id, so a per-user folder is what
 *  makes the upload allowed — the filename is what tells the two documents
 *  apart. */
const SIGNATURE_BUCKET = 'contractor-agreements';

export * from './vehicleInsuranceRules';
import {
  NO_DISCLOSURE,
  isPolicyExpired,
  validateDisclosure,
  type DisclosureStatus,
  type DisclosureValues,
} from './vehicleInsuranceRules';

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, b64] = dataUrl.split(',');
  const mime = /data:(.*?);/.exec(header)?.[1] || 'image/png';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function fetchDisclosureStatus(): Promise<DisclosureStatus> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NO_DISCLOSURE;

  const { data, error } = await supabase
    .from('vehicle_insurance_disclosures')
    .select(
      'signed_at, signer_name, signature_path, disclosure_version, policy_expires_on, vehicle_description, license_plate, license_plate_state, insurance_carrier, policy_number'
    )
    .eq('profile_id', user.id)
    .order('signed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('[fetchDisclosureStatus]', error.message);
    return NO_DISCLOSURE;
  }
  if (!data?.signed_at) return NO_DISCLOSURE;

  const version = (data.disclosure_version as string) || null;
  const expiresOn = (data.policy_expires_on as string) || null;
  const staleVersion = version !== VEHICLE_INSURANCE_DISCLOSURE_VERSION;
  const policyExpired = isPolicyExpired(expiresOn);

  return {
    current: !staleVersion && !policyExpired,
    staleVersion,
    policyExpired,
    signedAt: data.signed_at as string,
    signerName: (data.signer_name as string) || null,
    signaturePath: (data.signature_path as string) || null,
    disclosureVersion: version,
    policyExpiresOn: expiresOn,
    values: {
      vehicleDescription: (data.vehicle_description as string) || '',
      licensePlate: (data.license_plate as string) || '',
      licensePlateState: (data.license_plate_state as string) || '',
      insuranceCarrier: (data.insurance_carrier as string) || '',
      policyNumber: (data.policy_number as string) || '',
      policyExpiresOn: expiresOn || '',
    },
  };
}

export async function signVehicleInsuranceDisclosure(opts: {
  values: DisclosureValues;
  signerName: string;
  signatureDataUrl: string;
}): Promise<{ signedAt: string; signaturePath: string; signerName: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const problems = validateDisclosure(opts.values, opts.signerName, opts.signatureDataUrl);
  if (problems.length) throw new Error(problems[0].message);

  const path = `${user.id}/vehicle-insurance-${VEHICLE_INSURANCE_DISCLOSURE_VERSION}-${Date.now()}.png`;
  const { error: upErr } = await supabase.storage
    .from(SIGNATURE_BUCKET)
    .upload(path, dataUrlToBlob(opts.signatureDataUrl), {
      contentType: 'image/png',
      upsert: true,
    });
  if (upErr) {
    console.error('[signVehicleInsuranceDisclosure] upload:', upErr);
    throw new Error(upErr.message || 'Could not upload your signature');
  }

  const signerName = opts.signerName.trim();
  const { data, error } = await supabase
    .from('vehicle_insurance_disclosures')
    .insert({
      profile_id: user.id,
      vehicle_description: opts.values.vehicleDescription.trim(),
      license_plate: opts.values.licensePlate.trim().toUpperCase(),
      license_plate_state: opts.values.licensePlateState.trim().toUpperCase(),
      insurance_carrier: opts.values.insuranceCarrier.trim(),
      policy_number: opts.values.policyNumber.trim(),
      policy_expires_on: opts.values.policyExpiresOn.trim(),
      signer_name: signerName,
      signature_path: path,
      disclosure_version: VEHICLE_INSURANCE_DISCLOSURE_VERSION,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 400) : null,
      company_representative_name: COMPANY_REPRESENTATIVE_NAME,
      company_representative_title: COMPANY_REPRESENTATIVE_TITLE,
    })
    .select('signed_at')
    .single();

  if (error) {
    console.error('[signVehicleInsuranceDisclosure] insert:', error);
    throw new Error(error.message || 'Could not record your disclosure');
  }

  return { signedAt: String(data.signed_at), signaturePath: path, signerName };
}

export async function getDisclosureSignatureUrl(path: string): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(SIGNATURE_BUCKET).createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
