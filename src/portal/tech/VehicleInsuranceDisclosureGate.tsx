import React, { useCallback, useEffect, useState } from 'react';
import { Car } from 'lucide-react';
import {
  NO_DISCLOSURE,
  fetchDisclosureStatus,
  type DisclosureStatus,
} from '../../services/vehicleInsuranceDisclosure';
import { VehicleInsuranceDisclosureModal } from './VehicleInsuranceDisclosureModal';

/**
 * Asks for the personal vehicle insurance disclosure, and keeps asking.
 *
 * Unlike the contractor agreement, this one can go stale without anybody
 * touching the document: the policy it discloses expires. A disclosure naming
 * a policy that lapsed last month is not proof of insurance, so the banner
 * comes back when the date passes and says which of the two happened.
 */
type Props = {
  onSigned?: (status: DisclosureStatus) => void;
  /** Admins previewing the tech portal should not be nagged. */
  disabled?: boolean;
};

export const VehicleInsuranceDisclosureGate: React.FC<Props> = ({ onSigned, disabled }) => {
  const [status, setStatus] = useState<DisclosureStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setStatus(await fetchDisclosureStatus());
    } catch {
      // A failed check must not block the portal.
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (disabled) {
      setLoading(false);
      return;
    }
    void load();
  }, [disabled, load]);

  if (disabled || loading || !status) return null;
  if (status.current) return null;

  const headline = status.policyExpired
    ? 'Your insurance policy on file has expired'
    : status.staleVersion
      ? 'The vehicle insurance disclosure has been updated'
      : 'File your personal vehicle insurance disclosure';

  const detail = status.policyExpired
    ? `The policy you disclosed expired on ${status.policyExpiresOn}. File your renewed policy details so your coverage record stays current.`
    : status.staleVersion
      ? 'The disclosure has changed since you last signed it. Read the current version and sign it again.'
      : 'Required before field dispatch: your vehicle, plate, insurer and policy details, plus your signature. It takes about a minute.';

  return (
    <>
      <div className="mb-4 rounded-2xl border border-sky-500/40 bg-sky-500/10 p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 shrink-0 rounded-xl bg-sky-500/20 flex items-center justify-center">
            <Car className="w-4 h-4 text-sky-300" />
          </div>
          <div className="min-w-0 space-y-1">
            <h3 className="text-sm font-bold text-sky-100">{headline}</h3>
            <p className="text-[11px] text-sky-200/80 leading-relaxed">{detail}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 w-full py-3 rounded-xl bg-sky-400 text-[#12141c] text-xs font-bold"
        >
          {status.signedAt ? 'Update my insurance details →' : 'Read & sign the disclosure →'}
        </button>
      </div>

      <VehicleInsuranceDisclosureModal
        open={open}
        onClose={() => setOpen(false)}
        // A renewal keeps the same vehicle and carrier, so carry them over.
        initialValues={status.values}
        onSigned={(result) => {
          void (async () => {
            // Re-read rather than assume: the new row's currency depends on the
            // expiry date that was just filed, which only the service knows.
            const next = await fetchDisclosureStatus().catch(() => ({
              ...NO_DISCLOSURE,
              signedAt: result.signedAt,
              signerName: result.signerName,
              signaturePath: result.signaturePath,
            }));
            setStatus(next);
            onSigned?.(next);
          })();
        }}
      />
    </>
  );
};
