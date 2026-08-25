import React, { useCallback, useEffect, useState } from 'react';
import {
  fetchTechConnectStatus,
  fetchLocalMechanicStripeId,
  fetchMyJobCapacity,
  fetchMyTechSpecialties,
  fetchTechW9Status,
  fetchTechYearToDateCompensation,
  openExpressDashboard,
  openStripePayoutSetup,
  resetStaleStripeConnectLink,
  updateMyJobCapacity,
  updateMyTechSpecialties,
  type TechConnectStatus,
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
  FORM_1099_NEC_THRESHOLD_DOLLARS,
} from '../../content/taxForms';
import {
  clearCachedTechConnectStatus,
  linkedAccountId,
  readCachedTechConnectStatus,
  stripeStatusLabel,
  writeCachedTechConnectStatus,
} from '../../services/techConnectCache';
import { openContractorAgreementPrintWindow } from '../../services/contractorAgreementPdf';
import { AddInstantDebitCardModal } from './AddInstantDebitCardModal';
import { EmbeddedStripeOnboardingModal } from './EmbeddedStripeOnboardingModal';

type Props = { onSignOut: () => void; stripeReturnSync?: boolean; adminPreview?: boolean };

export const TechSettingsTab: React.FC<Props> = ({ onSignOut, stripeReturnSync, adminPreview }) => {
  const [status, setStatus] = useState<TechConnectStatus | null>(() => readCachedTechConnectStatus());
  const [localStripeId, setLocalStripeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [openingDash, setOpeningDash] = useState(false);
  const [showDebitModal, setShowDebitModal] = useState(false);
  const [showEmbeddedOnboarding, setShowEmbeddedOnboarding] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [pendingStripeUrl, setPendingStripeUrl] = useState<string | null>(null);
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
  const [ytd, setYtd] = useState<{
    year: number;
    totalDollars: number;
    thresholdDollars: number;
    meetsNecThreshold: boolean;
  } | null>(null);

  /** Navigate directly; synthetic link clicks are ignored by some mobile/in-app browsers. */
  const openStripeUrl = (url: string) => {
    const parsed = new URL(url);
    const isStripeHost = parsed.hostname === 'stripe.com' || parsed.hostname.endsWith('.stripe.com');
    if (parsed.protocol !== 'https:' || !isStripeHost) {
      throw new Error('Stripe returned an invalid onboarding URL. Please try again.');
    }
    setPendingStripeUrl(parsed.toString());
    window.location.assign(parsed.toString());
  };

  const refresh = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) setLoading(true);
    setLoadError(null);

    // 1. Fast path: Load DB records immediately (~30ms) so W-9 and Agreement status show instantly
    try {
      const [localId, w9Status, agreementStatus, ytdPay] = await Promise.all([
        fetchLocalMechanicStripeId().catch(() => null),
        fetchTechW9Status().catch(() => ({ completed: false, completedAt: null, taxIdProvided: false })),
        fetchContractorAgreementStatus().catch(() => ({ signed: false, signedAt: null, signerName: null, signaturePath: null, agreementVersion: null })),
        fetchTechYearToDateCompensation().catch(() => null),
      ]);
      setLocalStripeId(localId);
      setW9(w9Status);
      setAgreement(agreementStatus);
      if (ytdPay) setYtd(ytdPay);
    } catch {
      /* non-blocking */
    }

    // 2. Background path: Sync live Stripe Connect status via edge function (can take 2-5s)
    try {
      const remote = await fetchTechConnectStatus();
      if (remote) {
        setStatus(remote);
        if (remote.accountId) writeCachedTechConnectStatus(remote);
        if (remote.taxIdProvided) {
          const freshW9 = await fetchTechW9Status();
          setW9(freshW9);
        }
      }
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Could not load Stripe status');
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

  useEffect(() => {
    if (stripeReturnSync) void refresh();
  }, [stripeReturnSync, refresh]);

  const connect = async (_opts?: { forceReset?: boolean }) => {
    setShowEmbeddedOnboarding(true);
    // Background fetch hosted fallback URL
    void openStripePayoutSetup()
      .then((res) => {
        if (res?.onboardingUrl) setPendingStripeUrl(res.onboardingUrl);
      })
      .catch(() => undefined);
  };

  const resetConnect = async () => {
    setResetting(true);
    setConnectError(null);
    try {
      await resetStaleStripeConnectLink();
      clearCachedTechConnectStatus();
      setLocalStripeId(null);
      setStatus({
        accountId: null,
        detailsSubmitted: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        readyForPayouts: false,
      });
      setConnectError(null);
      await refresh({ quiet: true });
    } catch (e: unknown) {
      setConnectError(e instanceof Error ? e.message : 'Could not reset Stripe link');
    } finally {
      setResetting(false);
    }
  };

  const openDashboard = async () => {
    setOpeningDash(true);
    setConnectError(null);
    try {
      const result = await openExpressDashboard();
      if (result.accountId) writeCachedTechConnectStatus(result);
      setStatus(result);
      setLocalStripeId(result.accountId?.startsWith('acct_') ? result.accountId : null);
      openStripeUrl(result.loginUrl);
      if (result.openedOnboarding) {
        setConnectError(
          'No Live Express account yet — opened Stripe onboarding instead. Finish that, then return here for the Dashboard.'
        );
      }
    } catch (e: unknown) {
      setConnectError(e instanceof Error ? e.message : 'Could not open Express Dashboard');
    } finally {
      setOpeningDash(false);
    }
  };

  // Only trust edge sync for Dashboard — never a stale local/cached test acct_
  const acctId = linkedAccountId(status, localStripeId, { allowLocalFallback: false });
  const label = stripeStatusLabel(status, acctId, loading);

  return (
    <div className="space-y-4 max-w-md">
      {adminPreview && (
        <div className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/40 rounded-xl px-3 py-3 space-y-2">
          <p className="font-bold text-amber-100">Admin preview — Stripe binds to this admin login</p>
          <p className="text-amber-100/90 leading-relaxed">
            Tap <strong>Start Stripe Express onboarding</strong> below. Express Dashboard stays unavailable
            until that finishes. For a real tech payout account, sign out and use an approved tech login.
          </p>
        </div>
      )}

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
          Every mechanic must provide a tax ID (SSN or EIN) before claiming a dispatch. We collect it through{' '}
          <strong className="text-slate-300">Stripe Express</strong> (same as Form W-9) so Adaptivity can issue 1099s.
          We do not store your Social Security number in our database.
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
            Not complete yet. Connect Stripe Express below and submit your SSN or EIN. Refresh after onboarding;
            completion is verified directly with Stripe and cannot be self-certified.
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
        {ytd && (
          <div className="rounded-xl border border-white/10 bg-[#0b0c10] px-3 py-2.5 space-y-1">
            <p className="text-[11px] text-slate-400">
              {ytd.year} YTD compensation (your 70% job share)
            </p>
            <p className="text-lg font-extrabold text-white tabular-nums">
              ${ytd.totalDollars.toFixed(2)}
              <span className="text-xs font-semibold text-slate-500 ml-2">
                / ${FORM_1099_NEC_THRESHOLD_DOLLARS} threshold
              </span>
            </p>
            <p
              className={`text-[11px] ${
                ytd.meetsNecThreshold ? 'text-amber-300' : 'text-emerald-400/90'
              }`}
            >
              {ytd.meetsNecThreshold
                ? `At or above $${FORM_1099_NEC_THRESHOLD_DOLLARS} — Adaptivity will file Form 1099-NEC and send you a copy by Jan 31 of the next year.`
                : `Under $${FORM_1099_NEC_THRESHOLD_DOLLARS} so far this year — no 1099-NEC required until the threshold is met.`}
            </p>
          </div>
        )}
        <a
          href="https://www.irs.gov/forms-pubs/about-form-1099-nec"
          target="_blank"
          rel="noreferrer"
          className="block text-[11px] text-orange-400 underline"
        >
          IRS: About Form 1099-NEC
        </a>
      </div>

      <div className="bg-[#12141c] border border-white/10 rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-bold text-white">Stripe Express payouts</h3>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-[11px] font-mono text-slate-500 break-all">
          {acctId ?? (loading ? 'Loading…' : 'Not linked yet')}
        </p>
        {acctId && (status?.duplicateStripeAccountsForEmail ?? 0) > 1 && (
          <p className="text-[11px] text-sky-400/90 leading-relaxed border border-sky-500/25 rounded-lg px-3 py-2">
            Stripe has {status!.duplicateStripeAccountsForEmail} test Connect accounts for your email; the app uses{' '}
            <span className="font-mono">{status?.usingAccountId ?? acctId}</span>. Delete extras in the Stripe Dashboard
            (Connect → Accounts) or finish onboarding on the linked one.
          </p>
        )}
        {acctId && (status?.requirementsDue?.length ?? 0) > 0 && (
          <p className="text-[11px] text-amber-400/95 leading-relaxed border border-amber-500/30 rounded-lg px-3 py-2">
            Stripe still needs: {status!.requirementsDue!.join(', ')}. Tap Update payout setup and upload a photo ID
            (test mode: any clear image often works). Bank is not enough until identity verifies.
          </p>
        )}
        {acctId && status?.transfersEnabled === false && !(status?.requirementsDue?.length) && (
          <p className="text-[11px] text-amber-400/95 leading-relaxed border border-amber-500/30 rounded-lg px-3 py-2">
            Stripe has not enabled <strong>Transfers</strong> on this account yet. Tap Update payout setup and
            complete every step (identity, business info, bank). Then use Earnings → Retry transfer.
          </p>
        )}
        {acctId && status?.hasDebitCardForInstant !== true && (
          <p className="text-[11px] text-sky-300/95 leading-relaxed border border-sky-500/30 rounded-lg px-3 py-2">
            Want money in ~30 minutes? Tap <strong>Add Instant debit card</strong> below and add a Visa/Mastercard
            debit card. Bank alone only supports Standard (~2 business days, no Instant fee).
          </p>
        )}
        {acctId && status?.hasDebitCardForInstant === true && (
          <p className="text-[11px] text-emerald-400/90 leading-relaxed">
            Instant debit card on file. On Earnings you can choose Instant (~30 min, ~1% fee) or Standard bank
            (~2 days, no Instant fee).
          </p>
        )}
        {connectError && (
          <p className="text-[11px] text-red-400 leading-relaxed border border-red-500/30 rounded-lg px-3 py-2">
            {connectError}
          </p>
        )}
        {pendingStripeUrl && (
          <a
            href={pendingStripeUrl}
            className="block w-full py-3 border border-orange-500/60 text-orange-300 text-center rounded-xl text-xs font-bold"
          >
            Open Stripe onboarding manually →
          </a>
        )}
        {loadError && (
          <p className="text-[11px] text-amber-400 leading-relaxed">
            {loadError} (your saved link is unchanged — try Refresh or reopen this tab)
          </p>
        )}
        <p className="text-[10px] text-slate-500 leading-relaxed">
          <strong className="text-slate-400">Standard:</strong> bank deposit in ~2 business days, no Instant fee.{' '}
          <strong className="text-slate-400">Instant:</strong> debit card in ~30 minutes, Stripe ~1% fee (min ~$0.50).
        </p>
        {acctId && status?.hasDebitCardForInstant !== true && (
          <button
            type="button"
            disabled={openingDash}
            onClick={() => void openDashboard()}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 rounded-xl text-xs font-bold text-white transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {openingDash ? 'Opening Stripe Express…' : 'Add Instant debit card (Stripe Portal) →'}
          </button>
        )}
        <button
          type="button"
          disabled={resetting}
          onClick={() => void connect({ forceReset: Boolean(adminPreview) })}
          className="w-full py-3 bg-orange-500 rounded-xl text-xs font-bold text-white disabled:opacity-60"
        >
          {status?.readyForPayouts
            ? 'Update Stripe payout setup →'
            : 'Start Stripe Express onboarding →'}
        </button>
        {acctId && status?.detailsSubmitted && (
          <button
            type="button"
            disabled={openingDash}
            onClick={() => void openDashboard()}
            className="w-full py-3 border border-white/15 text-slate-300 rounded-xl text-xs font-bold disabled:opacity-60"
          >
            {openingDash ? 'Opening…' : 'Open Express Dashboard (bank / balance)'}
          </button>
        )}
        <p className="text-[10px] text-slate-500 leading-relaxed">
          Use <strong className="text-slate-400">Start Stripe Express onboarding</strong> first (not
          Dashboard). Dashboard only works after Stripe finishes identity + bank. Live still has no
          Connect account until that orange button succeeds.
        </p>
        {!status?.readyForPayouts && (
          <button
            type="button"
            disabled={resetting}
            onClick={() => void resetConnect()}
            className="w-full py-2.5 border border-white/10 text-slate-400 rounded-xl text-[11px] font-semibold disabled:opacity-60"
          >
            {resetting ? 'Resetting…' : 'Reset Stripe link (fix→Live cutover)'}
          </button>
        )}
      </div>
      <button type="button" onClick={onSignOut} className="w-full py-3 text-xs text-rose-300 border border-rose-500/30 rounded-xl">
        Sign out
      </button>
      {showDebitModal && (
        <AddInstantDebitCardModal
          onClose={() => setShowDebitModal(false)}
          onAdded={() => {
            void refresh({ quiet: true });
          }}
        />
      )}
      {showEmbeddedOnboarding && (
        <EmbeddedStripeOnboardingModal
          open={showEmbeddedOnboarding}
          onClose={() => setShowEmbeddedOnboarding(false)}
          onCompleted={() => {
            void refresh({ quiet: true });
          }}
          fallbackHostedUrl={pendingStripeUrl}
        />
      )}
    </div>
  );
};
