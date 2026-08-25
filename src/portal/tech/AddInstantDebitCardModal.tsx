import React, { useCallback, useMemo, useState } from 'react';
import { loadConnectAndInitialize } from '@stripe/connect-js';
import {
  ConnectAccountManagement,
  ConnectComponentsProvider,
  ConnectPayouts,
} from '@stripe/react-connect-js';
import { invokeEdgeFunction } from '../../services/edgeFunctionErrors';
import { getActiveStripePublishableKey } from '../../config/stripeEnvironment';
import { ExternalLink, Loader2 } from 'lucide-react';

type Props = {
  onClose: () => void;
  onAdded: () => void;
};

type Tab = 'account' | 'payouts';

/**
 * Express platforms cannot POST /external_accounts for connected accounts.
 * Stripe’s embedded Account Management / Payouts UI and hosted Express Dashboard are the supported paths to add a debit card.
 */
export const AddInstantDebitCardModal: React.FC<Props> = ({ onClose, onAdded }) => {
  const [tab, setTab] = useState<Tab>('account');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isOpeningHosted, setIsOpeningHosted] = useState(false);

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

  const openHostedExpress = async () => {
    try {
      setIsOpeningHosted(true);
      const data = await invokeEdgeFunction<{ loginUrl: string }>('create-stripe-account-link', {
        action: 'express_dashboard',
      });
      if (data.loginUrl) {
        window.open(data.loginUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Could not open Stripe Express portal');
    } finally {
      setIsOpeningHosted(false);
    }
  };

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
              <p className="text-sm font-bold text-white">Add Instant Debit Card</p>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Add your Visa/Mastercard debit card for ~30-minute instant cash outs.
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

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex gap-1 p-0.5 bg-black/30 rounded-lg w-fit">
              <button
                type="button"
                onClick={() => setTab('account')}
                className={`text-[11px] font-bold px-3 py-1.5 rounded-md ${
                  tab === 'account' ? 'bg-orange-500 text-white' : 'text-slate-400'
                }`}
              >
                Bank & Cards
              </button>
              <button
                type="button"
                onClick={() => setTab('payouts')}
                className={`text-[11px] font-bold px-3 py-1.5 rounded-md ${
                  tab === 'payouts' ? 'bg-orange-500 text-white' : 'text-slate-400'
                }`}
              >
                Payout History
              </button>
            </div>

            <button
              type="button"
              disabled={isOpeningHosted}
              onClick={() => void openHostedExpress()}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/15 border border-white/15 text-orange-400 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
            >
              {isOpeningHosted ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ExternalLink className="w-3.5 h-3.5" />
              )}
              <span>Open in Stripe Portal ↗</span>
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
