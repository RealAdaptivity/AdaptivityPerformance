import React, { useCallback, useEffect, useState } from 'react';
import { FileSignature } from 'lucide-react';
import {
  CONTRACTOR_AGREEMENT_VERSION,
  fetchContractorAgreementStatus,
  getContractorAgreementSignatureUrl,
  type ContractorAgreementStatus,
} from '../../services/contractorAgreement';
import { openContractorAgreementPrintWindow } from '../../services/contractorAgreementPdf';
import { ContractorAgreementSignModal } from './ContractorAgreementSignModal';

/**
 * Surfaces the agreement to contractors who have not signed the current
 * version.
 *
 * Before this, the only way to reach the signer was Settings → scroll past
 * Stripe, W-9 and payouts → "Sign agreement digitally". The portal opens on
 * Jobs and said nothing, so a new contractor's first signal that the agreement
 * exists was a job claim failing. This renders above every tab until the
 * current version is signed, and cannot be dismissed — claiming work is gated
 * on it either way.
 */
type Props = {
  /** Lets the Settings tab stay in step when the gate is what produced the signature. */
  onSigned?: (status: ContractorAgreementStatus) => void;
  /** Admins previewing the tech portal should not be nagged to sign. */
  disabled?: boolean;
};

export const ContractorAgreementGate: React.FC<Props> = ({ onSigned, disabled }) => {
  const [status, setStatus] = useState<ContractorAgreementStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setStatus(await fetchContractorAgreementStatus());
    } catch {
      // A failed status check must not block the portal. The database claim
      // gate is the real enforcement point; this banner is the prompt.
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
  if (status.signed && status.signaturePath) return null;

  const isStaleVersion = Boolean(status.signedAt) && status.agreementVersion !== CONTRACTOR_AGREEMENT_VERSION;
  const isMissingSignature = Boolean(status.signedAt) && !status.signaturePath;

  const headline = isStaleVersion
    ? 'The contractor agreement has been updated'
    : isMissingSignature
      ? 'Finish signing your contractor agreement'
      : 'Sign your contractor agreement to start claiming jobs';

  const detail = isStaleVersion
    ? `You signed ${status.agreementVersion || 'an earlier version'}. Read version ${CONTRACTOR_AGREEMENT_VERSION} and sign it to keep claiming jobs.`
    : isMissingSignature
      ? 'We have your acceptance on file but no signature image. Read the agreement and add your signature so we have a signed copy.'
      : 'Read the full 1099 terms — pay split, liability, insurance, warranty and taxes — then sign. It takes about two minutes and is required before your first job.';

  return (
    <>
      <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 shrink-0 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <FileSignature className="w-4 h-4 text-amber-300" />
          </div>
          <div className="min-w-0 space-y-1">
            <h3 className="text-sm font-bold text-amber-100">{headline}</h3>
            <p className="text-[11px] text-amber-200/80 leading-relaxed">{detail}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 w-full py-3 rounded-xl bg-amber-500 text-[#12141c] text-xs font-bold"
        >
          Read &amp; sign the agreement →
        </button>
      </div>

      <ContractorAgreementSignModal
        open={open}
        onClose={() => setOpen(false)}
        onSigned={(result) => {
          const next: ContractorAgreementStatus = {
            signed: true,
            signedAt: result.signedAt,
            signerName: result.signerName,
            signaturePath: result.signaturePath,
            agreementVersion: CONTRACTOR_AGREEMENT_VERSION,
          };
          setStatus(next);
          onSigned?.(next);
          // Hand the contractor their copy straight away — a signed agreement
          // they never receive is a records problem waiting to happen.
          void (async () => {
            const signatureImageUrl = await getContractorAgreementSignatureUrl(result.signaturePath);
            openContractorAgreementPrintWindow({
              signerName: result.signerName,
              signedAt: result.signedAt,
              signatureImageUrl,
              agreementVersion: CONTRACTOR_AGREEMENT_VERSION,
            });
          })();
        }}
      />
    </>
  );
};
