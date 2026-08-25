import React, { useCallback, useMemo, useState } from 'react';
import { loadConnectAndInitialize } from '@stripe/connect-js';
import {
  ConnectAccountManagement,
  ConnectComponentsProvider,
  ConnectPayouts,
} from '@stripe/react-connect-js';
import { invokeEdgeFunction } from '../../services/edgeFunctionErrors';
import { getActiveStripePublishableKey } from '../../config/stripeEnvironment';

type Props = {
  onClose: () => void;
  onAdded: () => void;
};

type Tab = 'payouts' | 'account';

/**
 * Express platforms cannot POST /external_accounts for connected accounts.
 * Stripe’s embedded Account Management / Payouts UI is the supported path to add a debit card.
 */
export const AddInstantDebitCardModal: React.FC<Props> = ({ onClose, onAdded }) => {
  const [tab, setTab] = useState<Tab>('account');
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchClientSecret = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await invokeEdgeFunction<{ clientSecret: string }>('create-account-session', {});
      if (!data.clientSecret) throw new Error('Missing Account Session secret');
      return data.clientSecret;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not start Stripe session';
      setLoadError(msg);
      throw e;
    }
  }, []);

  const publishableKey = getActiveStripePublishableKey();

  const stripeConnectInstance = useMemo(() => {
    if (!publishableKey.startsWith('pk_')) return null;
    return loadConnectAndInitialize({
      publishableKey,
      fetchClientSecret,
      appearance: {
        overlays: 'dialog',
        variables: {
          colorPrimary: '#f97316',
          colorBackground: '#12141c',
          colorText: '#e2e8f0',
          colorSecondaryText: '#94a3b8',
          colorBorder: 'rgba(255,255,255,0.12)',
          borderRadius: '12px',
        },
      },
    });
  }, [publishableKey, fetchClientSecret]);

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-hidden bg-[#12141c] border border-white/10 rounded-2xl shadow-2xl flex flex-col">
        <div className="px-4 pt-4 pb-3 border-b border-white/10 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-white">Add Instant debit card</p>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Express does not allow the app to attach cards directly. Use Stripe’s payout settings
                below → add a <strong className="text-slate-300">debit card</strong> (keep your bank
                for Standard). Test card: <span className="font-mono text-slate-300">4000056655665556</span>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onAdded();
                onClose();
              }}
              className="text-xs text-slate-400 hover:text-white px-2 py-1"
            >
              Done
            </button>
          </div>
          <div className="flex gap-1 p-0.5 bg-black/30 rounded-lg w-fit">
            <button
              type="button"
              onClick={() => setTab('payouts')}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-md ${
                tab === 'payouts' ? 'bg-orange-500 text-white' : 'text-slate-400'
              }`}
            >
              Payouts / Instant
            </button>
            <button
              type="button"
              onClick={() => setTab('account')}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-md ${
                tab === 'account' ? 'bg-orange-500 text-white' : 'text-slate-400'
              }`}
            >
              Account / bank & cards
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-[320px]">
          {!publishableKey.startsWith('pk_') && (
            <p className="text-[11px] text-red-400">Missing VITE_STRIPE_PUBLISHABLE_KEY.</p>
          )}
          {loadError && (
            <p className="text-[11px] text-red-400 leading-relaxed border border-red-500/30 rounded-lg px-3 py-2 mb-3">
              {loadError}
            </p>
          )}
          {stripeConnectInstance && (
            <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
              {tab === 'payouts' ? (
                <ConnectPayouts />
              ) : (
                <ConnectAccountManagement />
              )}
            </ConnectComponentsProvider>
          )}
        </div>

        <div className="px-4 py-3 border-t border-white/10 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              onAdded();
              onClose();
            }}
            className="px-4 py-2 text-xs font-bold text-white bg-orange-500 rounded-xl"
          >
            I’ve added the card — refresh status
          </button>
        </div>
      </div>
    </div>
  );
};
