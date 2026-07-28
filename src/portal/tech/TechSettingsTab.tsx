import React, { useCallback, useEffect, useState } from 'react';
import {
  fetchTechConnectStatus,
  fetchLocalMechanicStripeId,
  fetchMyJobCapacity,
  fetchTechW9Status,
  fetchTechYearToDateCompensation,
  markTechW9Complete,
  openExpressDashboard,
  openStripePayoutSetup,
  updateMyJobCapacity,
  type TechConnectStatus,
  type TechJobCapacity,
  type TechW9Status,
} from '../../services/techDispatch';
import {
  FORM_1099_NEC_NOTICE,
  FORM_1099_NEC_PLATFORM_NOTE,
  FORM_1099_NEC_THRESHOLD_DOLLARS,
} from '../../content/taxForms';
import {
  linkedAccountId,
  readCachedTechConnectStatus,
  stripeStatusLabel,
  writeCachedTechConnectStatus,
} from '../../services/techConnectCache';
import { AddInstantDebitCardModal } from './AddInstantDebitCardModal';

type Props = { onSignOut: () => void; stripeReturnSync?: boolean; adminPreview?: boolean };

export const TechSettingsTab: React.FC<Props> = ({ onSignOut, stripeReturnSync, adminPreview }) => {
  const [status, setStatus] = useState<TechConnectStatus | null>(() => readCachedTechConnectStatus());
  const [localStripeId, setLocalStripeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [openingDash, setOpeningDash] = useState(false);
  const [showDebitModal, setShowDebitModal] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [jobCapacity, setJobCapacity] = useState<TechJobCapacity>('multi');
  const [savingCapacity, setSavingCapacity] = useState(false);
  const [capacityMsg, setCapacityMsg] = useState<string | null>(null);
  const [w9, setW9] = useState<TechW9Status | null>(null);
  const [w9Busy, setW9Busy] = useState(false);
  const [w9Msg, setW9Msg] = useState<string | null>(null);
  const [ytd, setYtd] = useState<{
    year: number;
    totalDollars: number;
    thresholdDollars: number;
    meetsNecThreshold: boolean;
  } | null>(null);

  const openStripeUrl = (url: string) => {
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) {
      window.location.assign(url);
    }
  };

  const refresh = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) setLoading(true);
    setLoadError(null);
    try {
      const [remote, localId, w9Status, ytdPay] = await Promise.all([
        fetchTechConnectStatus(),
        fetchLocalMechanicStripeId(),
        fetchTechW9Status(),
        fetchTechYearToDateCompensation().catch(() => null),
      ]);
      setLocalStripeId(localId);
      setW9(w9Status);
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

  useEffect(() => {
    if (stripeReturnSync) void refresh();
  }, [stripeReturnSync, refresh]);

  const connect = async () => {
    setLinking(true);
    setConnectError(null);
    try {
      const result = await openStripePayoutSetup();
      if (result.accountId) writeCachedTechConnectStatus(result);
      setStatus(result);
      setLocalStripeId(result.accountId);
      if (!result.onboardingUrl?.startsWith('http')) {
        throw new Error('Stripe onboarding URL missing — try again or check edge function deploy.');
      }
      openStripeUrl(result.onboardingUrl);
    } catch (e: unknown) {
      let msg = e instanceof Error ? e.message : 'Could not open Stripe';
      if (/not a valid url/i.test(msg)) {
        msg +=
          ' Deploy the latest create-stripe-account-link edge function (localhost needs HTTPS business URL + http redirect URLs).';
      }
      setConnectError(msg);
    } finally {
      setLinking(false);
    }
  };

  const openDashboard = async () => {
    setOpeningDash(true);
    setConnectError(null);
    try {
      const result = await openExpressDashboard();
      if (result.accountId) writeCachedTechConnectStatus(result);
      setStatus(result);
      openStripeUrl(result.loginUrl);
    } catch (e: unknown) {
      setConnectError(e instanceof Error ? e.message : 'Could not open Express Dashboard');
    } finally {
      setOpeningDash(false);
    }
  };

  const acctId = linkedAccountId(status, localStripeId);
  const label = stripeStatusLabel(status, acctId, loading);

  return (
    <div className="space-y-4 max-w-md">
      {adminPreview && (
        <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
          Admin preview: Stripe Connect saves to <strong>your admin login</strong>, not a technician account.
          Sign in with a real tech user to test payouts end-to-end.
        </p>
      )}

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
        {acctId && (
          <button
            type="button"
            disabled={openingDash}
            onClick={() => void openDashboard()}
            className="w-full py-3 border border-white/15 text-slate-300 rounded-xl text-xs font-bold disabled:opacity-60"
          >
            {openingDash ? 'Opening…' : 'Open Express Dashboard (bank / balance)'}
          </button>
        )}
        <button
          type="button"
          disabled={linking}
          onClick={() => void connect()}
          className="w-full py-3 border border-orange-500/40 text-orange-400 rounded-xl text-xs font-bold disabled:opacity-60"
        >
          {linking
            ? 'Opening Stripe…'
            : acctId
              ? 'Update identity / bank setup →'
              : 'Connect Stripe Express →'}
        </button>
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
