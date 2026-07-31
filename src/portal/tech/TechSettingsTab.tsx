import React, { useCallback, useEffect, useState } from 'react';
import {
  fetchTechConnectStatus,
  fetchLocalMechanicStripeId,
  fetchMyJobCapacity,
  fetchMyTechSpecialties,
  fetchTechW9Status,
  fetchTechYearToDateCompensation,
  fetchContractorAgreementStatus,
  markContractorAgreementSigned,
  markTechW9Complete,
  openExpressDashboard,
  openStripePayoutSetup,
  resetStaleStripeConnectLink,
  updateMyJobCapacity,
  updateMyTechSpecialties,
  type TechConnectStatus,
  type TechJobCapacity,
  type TechW9Status,
} from '../../services/techDispatch';
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

type Props = { onSignOut: () => void; stripeReturnSync?: boolean; adminPreview?: boolean };

export const TechSettingsTab: React.FC<Props> = ({ onSignOut, stripeReturnSync, adminPreview }) => {
  const [status, setStatus] = useState<TechConnectStatus | null>(() => readCachedTechConnectStatus());
  const [localStripeId, setLocalStripeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [openingDash, setOpeningDash] = useState(false);
  const [showDebitModal, setShowDebitModal] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [jobCapacity, setJobCapacity] = useState<TechJobCapacity>('multi');
  const [savingCapacity, setSavingCapacity] = useState(false);
  const [capacityMsg, setCapacityMsg] = useState<string | null>(null);
  const [specialties, setSpecialties] = useState<TechSpecialty[]>(['mechanical']);
  const [savingSpecialties, setSavingSpecialties] = useState(false);
  const [specialtyMsg, setSpecialtyMsg] = useState<string | null>(null);
  const [w9, setW9] = useState<TechW9Status | null>(null);
  const [w9Busy, setW9Busy] = useState(false);
  const [w9Msg, setW9Msg] = useState<string | null>(null);
  const [agreement, setAgreement] = useState<{ signed: boolean; signedAt: string | null } | null>(null);
  const [agreementBusy, setAgreementBusy] = useState(false);
  const [agreementMsg, setAgreementMsg] = useState<string | null>(null);
  const [ytd, setYtd] = useState<{
    year: number;
    totalDollars: number;
    thresholdDollars: number;
    meetsNecThreshold: boolean;
  } | null>(null);

  /** Prefer same-tab after async — popup blockers often kill window.open post-await. */
  const openStripeUrl = (url: string) => {
    window.location.assign(url);
  };

  const refresh = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) setLoading(true);
    setLoadError(null);
    try {
      const [remote, localId, w9Status, ytdPay, agreementStatus] = await Promise.all([
        fetchTechConnectStatus(),
        fetchLocalMechanicStripeId(),
        fetchTechW9Status(),
        fetchTechYearToDateCompensation().catch(() => null),
        fetchContractorAgreementStatus(),
      ]);
      setLocalStripeId(localId);
      setW9(w9Status);
      setAgreement(agreementStatus);
      if (ytdPay) setYtd(ytdPay);
      if (remote) {
        setStatus(remote);
        if (remote.accountId) writeCachedTechConnectStatus(remote);
        if (remote.taxIdProvided && !w9Status.completed) {
          setW9(await fetchTechW9Status());
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

  const connect = async (opts?: { forceReset?: boolean }) => {
    setLinking(true);
    setConnectError(null);
    try {
      if (opts?.forceReset || adminPreview) {
        // Admin preview + Live cutover: always clear a dead/test acct_ before create.
        await resetStaleStripeConnectLink().catch(() => undefined);
        clearCachedTechConnectStatus();
        setLocalStripeId(null);
      }
      const result = await openStripePayoutSetup();
      if (result.accountId) writeCachedTechConnectStatus(result);
      setStatus(result);
      setLocalStripeId(result.accountId?.startsWith('acct_') ? result.accountId : null);
      if (!result.onboardingUrl?.startsWith('http')) {
        throw new Error('Stripe onboarding URL missing — try Reset Stripe link, then Connect again.');
      }
      openStripeUrl(result.onboardingUrl);
    } catch (e: unknown) {
      let msg = e instanceof Error ? e.message : 'Could not open Stripe';
      if (/not a valid url/i.test(msg)) {
        msg +=
          ' Deploy the latest create-stripe-account-link edge function (localhost needs HTTPS business URL + http redirect URLs).';
      }
      if (/technician profile required|not a tech/i.test(msg)) {
        msg =
          'This login is not a tech account. Sign out and use Technician login (or finish Join as Tech approval), then Connect Stripe.';
      }
      setConnectError(msg);
    } finally {
      setLinking(false);
    }
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
          <p className="font-bold text-amber-100">Admin preview — not a tech login</p>
          <p className="text-amber-100/90 leading-relaxed">
            Express Dashboard will keep failing until <strong>this admin account</strong> finishes Live
            Connect (or you sign out and use a real tech user). Stripe never attaches to “the tech
            dashboard view” — only to whoever is signed in.
          </p>
          <button
            type="button"
            disabled={linking || resetting}
            onClick={() => void connect({ forceReset: true })}
            className="w-full py-3 bg-orange-500 rounded-xl text-xs font-bold text-white disabled:opacity-60"
          >
            {linking ? 'Opening Stripe…' : 'Start Live Stripe Connect (admin account) →'}
          </button>
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
        {w9?.completed ? (
          <p className="text-[11px] text-emerald-400 leading-relaxed">
            W-9 / tax ID on file
            {w9.completedAt ? ` · ${new Date(w9.completedAt).toLocaleDateString()}` : ''}. You can claim jobs.
          </p>
        ) : (
          <p className="text-[11px] text-amber-300 leading-relaxed border border-amber-500/30 rounded-lg px-3 py-2">
            Not complete yet. Connect Stripe Express below and submit your SSN or EIN, then tap Mark W-9 complete
            (or refresh — we auto-detect when Stripe has your tax ID).
          </p>
        )}
        {w9Msg && <p className="text-[11px] text-slate-400">{w9Msg}</p>}
        {!w9?.completed && (
          <button
            type="button"
            disabled={w9Busy || !(status?.taxIdProvided || status?.detailsSubmitted)}
            onClick={() => {
              void (async () => {
                setW9Busy(true);
                setW9Msg(null);
                try {
                  await markTechW9Complete();
                  setW9(await fetchTechW9Status());
                  setW9Msg('W-9 marked complete. You can claim jobs.');
                } catch (e: unknown) {
                  setW9Msg(e instanceof Error ? e.message : 'Could not mark W-9 complete');
                } finally {
                  setW9Busy(false);
                }
              })();
            }}
            className="w-full py-3 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold disabled:opacity-50"
          >
            {w9Busy ? 'Saving…' : 'I submitted my tax ID in Stripe — mark W-9 complete'}
          </button>
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
          Review and accept the 1099 contractor terms (liability, workers’ comp notice, tax forms, payouts).
          Required before claiming your first job. Print/save as PDF from the browser print dialog.
        </p>
        {agreement?.signed ? (
          <p className="text-[11px] text-emerald-400 leading-relaxed">
            Accepted
            {agreement.signedAt ? ` · ${new Date(agreement.signedAt).toLocaleDateString()}` : ''}.
          </p>
        ) : (
          <p className="text-[11px] text-amber-300 leading-relaxed border border-amber-500/30 rounded-lg px-3 py-2">
            Not accepted yet. Open the agreement, then confirm acceptance below.
          </p>
        )}
        {agreementMsg && <p className="text-[11px] text-slate-400">{agreementMsg}</p>}
        <button
          type="button"
          onClick={() => {
            try {
              openContractorAgreementPrintWindow({
                signedAt: agreement?.signedAt,
              });
            } catch (e: unknown) {
              setAgreementMsg(e instanceof Error ? e.message : 'Could not open agreement');
            }
          }}
          className="w-full py-3 border border-white/15 text-slate-200 rounded-xl text-xs font-bold"
        >
          View / print agreement (PDF)
        </button>
        {!agreement?.signed && (
          <button
            type="button"
            disabled={agreementBusy}
            onClick={() => {
              void (async () => {
                setAgreementBusy(true);
                setAgreementMsg(null);
                try {
                  const signedAt = await markContractorAgreementSigned();
                  setAgreement({ signed: true, signedAt });
                  openContractorAgreementPrintWindow({ signedAt });
                  setAgreementMsg('Agreement accepted. You can claim jobs once W-9 is also complete.');
                } catch (e: unknown) {
                  setAgreementMsg(e instanceof Error ? e.message : 'Could not record acceptance');
                } finally {
                  setAgreementBusy(false);
                }
              })();
            }}
            className="w-full py-3 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold disabled:opacity-50"
          >
            {agreementBusy ? 'Saving…' : 'I accept the Independent Contractor Agreement'}
          </button>
        )}
      </div>

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
            onClick={() => setShowDebitModal(true)}
            className="w-full py-3 bg-orange-500 rounded-xl text-xs font-bold text-white"
          >
            Add Instant debit card →
          </button>
        )}
        {acctId && status?.detailsSubmitted && !adminPreview && (
          <button
            type="button"
            disabled={openingDash}
            onClick={() => void openDashboard()}
            className="w-full py-3 border border-white/15 text-slate-300 rounded-xl text-xs font-bold disabled:opacity-60"
          >
            {openingDash ? 'Opening…' : 'Open Express Dashboard (bank / balance)'}
          </button>
        )}
        {!adminPreview && (
          <button
            type="button"
            disabled={linking || resetting}
            onClick={() => void connect()}
            className="w-full py-3 border border-orange-500/40 text-orange-400 rounded-xl text-xs font-bold disabled:opacity-60"
          >
            {linking
              ? 'Opening Stripe…'
              : acctId
                ? 'Update identity / bank setup →'
                : 'Connect Stripe Express →'}
          </button>
        )}
        <p className="text-[10px] text-slate-500 leading-relaxed">
          {adminPreview
            ? 'Use the orange admin button above. Express Dashboard stays hidden in admin preview until Connect is finished on this login.'
            : 'Express Dashboard only works after you finish Connect Stripe Express (Live). If Connect fails, use Reset Stripe link below, then Connect again.'}
        </p>
        {!status?.readyForPayouts && (
          <button
            type="button"
            disabled={linking || resetting}
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
    </div>
  );
};
