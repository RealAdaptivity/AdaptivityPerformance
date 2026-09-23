import React, { useCallback, useEffect, useState } from 'react';
import {
  fetchMyJobCapacity,
  fetchMyTechSpecialties,
  fetchTechW9Status,
  updateMyJobCapacity,
  updateMyTechSpecialties,
  type TechJobCapacity,
  type TechW9Status,
} from '../../services/techDispatch';
import {
  CONTRACTOR_AGREEMENT_VERSION,
  fetchContractorAgreementStatus,
  getContractorAgreementSignatureUrl,
  type ContractorAgreementStatus,
} from '../../services/contractorAgreement';
import { ContractorAgreementSignModal } from './ContractorAgreementSignModal';
import { TECH_SPECIALTIES, type TechSpecialty } from '../../services/techSpecialties';
import { TechOpsExtrasPanel } from './TechOpsExtrasPanel';
import {
  FORM_1099_NEC_NOTICE,
  FORM_1099_NEC_PLATFORM_NOTE,
} from '../../content/taxForms';
import { openContractorAgreementPrintWindow } from '../../services/contractorAgreementPdf';

type Props = { onSignOut: () => void };

export const TechSettingsTab: React.FC<Props> = ({ onSignOut }) => {
  const [loading, setLoading] = useState(true);
  const [jobCapacity, setJobCapacity] = useState<TechJobCapacity>('multi');
  const [savingCapacity, setSavingCapacity] = useState(false);
  const [capacityMsg, setCapacityMsg] = useState<string | null>(null);
  const [specialties, setSpecialties] = useState<TechSpecialty[]>(['mechanical']);
  const [savingSpecialties, setSavingSpecialties] = useState(false);
  const [specialtyMsg, setSpecialtyMsg] = useState<string | null>(null);
  const [w9, setW9] = useState<TechW9Status | null>(null);
  const [agreement, setAgreement] = useState<ContractorAgreementStatus | null>(null);
  const [agreementMsg, setAgreementMsg] = useState<string | null>(null);
  const [signOpen, setSignOpen] = useState(false);

  const refresh = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) setLoading(true);

    try {
      const [w9Status, agreementStatus] = await Promise.all([
        fetchTechW9Status().catch(() => ({ completed: false, completedAt: null, taxIdProvided: false })),
        fetchContractorAgreementStatus().catch(() => ({ signed: false, signedAt: null, signerName: null, signaturePath: null, agreementVersion: null })),
      ]);
      setW9(w9Status);
      setAgreement(agreementStatus);
    } catch {
      /* both reads already fall back above; nothing further to surface */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    void fetchMyJobCapacity().then(setJobCapacity);
    void fetchMyTechSpecialties().then((list) =>
      setSpecialties(list.length ? (list as TechSpecialty[]) : ['mechanical'])
    );
    const onFocus = () => void refresh({ quiet: true });
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  const saveJobCapacity = async (capacity: TechJobCapacity) => {
    setSavingCapacity(true);
    setCapacityMsg(null);
    try {
      await updateMyJobCapacity(capacity);
      setJobCapacity(capacity);
      setCapacityMsg(
        capacity === 'multi'
          ? 'Saved — you can claim multiple active jobs.'
          : 'Saved — one active job at a time. Change anytime.'
      );
    } catch (e: unknown) {
      setCapacityMsg(e instanceof Error ? e.message : 'Could not save work style');
    } finally {
      setSavingCapacity(false);
    }
  };

  const toggleSpecialty = (id: TechSpecialty) => {
    setSpecialties((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((s) => s !== id);
        return next.length ? next : ['mechanical'];
      }
      return [...prev, id];
    });
  };

  const saveSpecialties = async () => {
    setSavingSpecialties(true);
    setSpecialtyMsg(null);
    try {
      await updateMyTechSpecialties(specialties);
      setSpecialtyMsg('Specialties saved — job board filters to your trades.');
    } catch (e: unknown) {
      setSpecialtyMsg(e instanceof Error ? e.message : 'Could not save specialties');
    } finally {
      setSavingSpecialties(false);
    }
  };

  return (
    <div className="space-y-4 max-w-md">

      <div className="bg-[#12141c] border border-white/10 rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-white">Your trade specialties</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Pick every trade you cover. Available jobs match these specialties.
        </p>
        <div className="flex flex-wrap gap-2">
          {TECH_SPECIALTIES.map((s) => {
            const on = specialties.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleSpecialty(s.id)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                  on
                    ? 'border-orange-500 bg-orange-500/15 text-orange-300'
                    : 'border-white/10 text-slate-400 hover:bg-white/5'
                }`}
              >
                {on ? '✓ ' : ''}
                {s.shortLabel}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          disabled={savingSpecialties}
          onClick={() => void saveSpecialties()}
          className="w-full py-2.5 bg-orange-500 rounded-xl text-xs font-bold text-white disabled:opacity-60"
        >
          {savingSpecialties ? 'Saving…' : 'Save specialties'}
        </button>
        {specialtyMsg && <p className="text-[11px] text-slate-400">{specialtyMsg}</p>}
      </div>

      <div className="bg-[#12141c] border border-white/10 rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-white">Work style</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Choose whether you take multiple jobs or stay standalone on one job. You can change this anytime.
        </p>
        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            disabled={savingCapacity}
            onClick={() => void saveJobCapacity('multi')}
            className={`text-left px-3 py-3 rounded-xl border text-xs transition-all ${
              jobCapacity === 'multi'
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                : 'border-white/10 text-slate-400 hover:bg-white/5'
            }`}
          >
            <strong className="block text-sm mb-0.5">Multi-job</strong>
            Claim several active dispatches at once
          </button>
          <button
            type="button"
            disabled={savingCapacity}
            onClick={() => void saveJobCapacity('standalone')}
            className={`text-left px-3 py-3 rounded-xl border text-xs transition-all ${
              jobCapacity === 'standalone'
                ? 'border-sky-500 bg-sky-500/10 text-sky-300'
                : 'border-white/10 text-slate-400 hover:bg-white/5'
            }`}
          >
            <strong className="block text-sm mb-0.5">Standalone (single)</strong>
            One active job until you finish or release it
          </button>
        </div>
        {capacityMsg && <p className="text-[11px] text-slate-400">{capacityMsg}</p>}
      </div>

      <TechOpsExtrasPanel specialties={specialties} />

      <div className="bg-[#12141c] border border-white/10 rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-white">IRS Form W-9 (required before first job)</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Every mechanic must give Adaptivity a completed Form W-9 before claiming a dispatch, so we can issue
          1099s. Download the blank form below, fill it in, and hand or send it to dispatch. Your Social Security
          number is never entered into this app and is not stored in our database.
        </p>
        {w9 === null && loading ? (
          <p className="text-[11px] text-slate-500 animate-pulse">Checking W-9 status…</p>
        ) : w9?.completed ? (
          <p className="text-[11px] text-emerald-400 leading-relaxed">
            W-9 / tax ID on file
            {w9.completedAt ? ` · ${new Date(w9.completedAt).toLocaleDateString()}` : ''}. You can claim jobs.
          </p>
        ) : (
          <p className="text-[11px] text-amber-300 leading-relaxed border border-amber-500/30 rounded-lg px-3 py-2">
            Not on file yet. Send your completed W-9 to dispatch — they record it once received. It cannot be
            self-certified from this app.
          </p>
        )}
        <a
          href="https://www.irs.gov/pub/irs-pdf/fw9.pdf"
          target="_blank"
          rel="noreferrer"
          className="block text-[11px] text-orange-400 underline"
        >
          Download blank IRS Form W-9 (PDF)
        </a>
      </div>

      <div className="bg-[#12141c] border border-white/10 rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-white">Independent Contractor Agreement</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Digitally sign the 1099 contractor terms (liability, workers’ comp, tax, payouts). Required before claiming
          your first job. We store your name, signature image, and timestamp for Adaptivity records.
        </p>
        {agreement === null && loading ? (
          <p className="text-[11px] text-slate-500 animate-pulse">Checking agreement status…</p>
        ) : agreement?.signed && agreement.signaturePath ? (
          <p className="text-[11px] text-emerald-400 leading-relaxed">
            Signed
            {agreement.signerName ? ` by ${agreement.signerName}` : ''}
            {agreement.signedAt ? ` · ${new Date(agreement.signedAt).toLocaleString()}` : ''}.
          </p>
        ) : agreement?.signed && !agreement.signaturePath ? (
          <p className="text-[11px] text-amber-300 leading-relaxed border border-amber-500/30 rounded-lg px-3 py-2">
            Accepted earlier without a drawn signature. Complete the digital signature below so we have a signed copy
            on file.
          </p>
        ) : agreement?.signedAt && agreement.agreementVersion !== CONTRACTOR_AGREEMENT_VERSION ? (
          <p className="text-[11px] text-amber-300 leading-relaxed border border-amber-500/30 rounded-lg px-3 py-2">
            The agreement has been updated since you signed
            {agreement.agreementVersion ? ` (you signed ${agreement.agreementVersion})` : ''}. Read and sign the
            current version to keep claiming jobs.
          </p>
        ) : (
          <p className="text-[11px] text-amber-300 leading-relaxed border border-amber-500/30 rounded-lg px-3 py-2">
            Not signed yet. Open the signer, type your legal name, draw your signature, and save.
          </p>
        )}
        {agreementMsg && <p className="text-[11px] text-slate-400">{agreementMsg}</p>}
        <button
          type="button"
          onClick={() => {
            void (async () => {
              try {
                let signatureImageUrl: string | null = null;
                if (agreement?.signaturePath) {
                  signatureImageUrl = await getContractorAgreementSignatureUrl(agreement.signaturePath);
                }
                openContractorAgreementPrintWindow({
                  signerName: agreement?.signerName || undefined,
                  signedAt: agreement?.signedAt,
                  signatureImageUrl,
                  agreementVersion: agreement?.agreementVersion,
                });
              } catch (e: unknown) {
                setAgreementMsg(e instanceof Error ? e.message : 'Could not open agreement');
              }
            })();
          }}
          className="w-full py-3 border border-white/15 text-slate-200 rounded-xl text-xs font-bold"
        >
          View / print signed PDF
        </button>
        {(!agreement?.signed || !agreement.signaturePath) && (
          <button
            type="button"
            onClick={() => setSignOpen(true)}
            className="w-full py-3 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold"
          >
            {agreement?.signed && !agreement.signaturePath
              ? 'Complete digital signature →'
              : agreement?.signedAt && agreement.agreementVersion !== CONTRACTOR_AGREEMENT_VERSION
                ? 'Review and sign the updated agreement →'
                : 'Sign agreement digitally →'}
          </button>
        )}
      </div>

      <ContractorAgreementSignModal
        open={signOpen}
        onClose={() => setSignOpen(false)}
        onSigned={(result) => {
          setAgreement({
            signed: true,
            signedAt: result.signedAt,
            signerName: result.signerName,
            signaturePath: result.signaturePath,
            agreementVersion: CONTRACTOR_AGREEMENT_VERSION,
          });
          setAgreementMsg('Agreement signed and saved. You can claim jobs once W-9 is also complete.');
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

      <div className="bg-[#12141c] border border-white/10 rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-white">Form 1099-NEC</h3>
        <p className="text-xs text-slate-400 leading-relaxed">{FORM_1099_NEC_NOTICE}</p>
        <p className="text-[11px] text-slate-500 leading-relaxed">{FORM_1099_NEC_PLATFORM_NOTE}</p>
        <a
          href="https://www.irs.gov/forms-pubs/about-form-1099-nec"
          target="_blank"
          rel="noreferrer"
          className="block text-[11px] text-orange-400 underline"
        >
          IRS: About Form 1099-NEC
        </a>
      </div>

      <button type="button" onClick={onSignOut} className="w-full py-3 text-xs text-rose-300 border border-rose-500/30 rounded-xl">
        Sign out
      </button>
    </div>
  );
};
