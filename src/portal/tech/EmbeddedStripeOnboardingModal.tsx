import React, { useCallback, useMemo, useState } from 'react';
import { loadConnectAndInitialize } from '@stripe/connect-js';
import { ConnectAccountOnboarding, ConnectComponentsProvider } from '@stripe/react-connect-js';
import { X, ExternalLink } from 'lucide-react';
import { invokeEdgeFunction } from '../../services/edgeFunctionErrors';

type Props = {
  open: boolean;
  onClose: () => void;
  onCompleted: () => void;
  fallbackHostedUrl?: string | null;
};

export const EmbeddedStripeOnboardingModal: React.FC<Props> = ({
  open,
  onClose,
  onCompleted,
  fallbackHostedUrl,
}) => {
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchClientSecret = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await invokeEdgeFunction<{ clientSecret: string }>('create-account-session', {});
      if (!data.clientSecret) throw new Error('Missing Account Session secret');
      return data.clientSecret;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not initialize Stripe onboarding session';
      setLoadError(msg);
      throw e;
    }
  }, []);

  const publishableKey =
    (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_STRIPE_PUBLISHABLE_KEY ||
    'pk_live_51PkuUCPQ2G1lE6cgjWwX0BhyWq5v49k7QoB21Y99wUkmkQf6xX8m8H3b8U9m4E4Y0Y8n6A5B6v8C7D8E9F0G';

  const stripeConnectInstance = useMemo(() => {
    if (!open) return null;
    return loadConnectAndInitialize({
      publishableKey,
      fetchClientSecret,
      appearance: {
        overlays: 'dialog',
        variables: {
          colorPrimary: '#f97316',
          colorBackground: '#12141c',
          colorText: '#f8fafc',
          colorSecondaryText: '#94a3b8',
          colorBorder: 'rgba(255,255,255,0.12)',
          borderRadius: '16px',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          fontSizeBase: '13px',
        },
      },
    });
  }, [open, publishableKey, fetchClientSecret]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-3xl h-[94vh] sm:h-[88vh] bg-[#12141c] border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3 bg-[#0b0c10]">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Stripe Payout & Tax ID Setup</span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Secure & Encrypted
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Submit your tax ID (SSN/EIN) and bank/debit details for direct payouts.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {fallbackHostedUrl && (
              <a
                href={fallbackHostedUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-orange-400 hover:text-orange-300 px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20"
              >
                <span>Open in tab</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                onCompleted();
                onClose();
              }}
              className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Embedded Content */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-4 bg-[#12141c]">
          {loadError && (
            <div className="p-3 mb-3 text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl space-y-2">
              <p>{loadError}</p>
              {fallbackHostedUrl && (
                <a
                  href={fallbackHostedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-orange-300 underline"
                >
                  Open hosted Stripe onboarding page →
                </a>
              )}
            </div>
          )}

          {stripeConnectInstance && (
            <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
              <ConnectAccountOnboarding
                onExit={() => {
                  onCompleted();
                  onClose();
                }}
              />
            </ConnectComponentsProvider>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/10 bg-[#0b0c10] flex items-center justify-between">
          <p className="text-[10px] text-slate-500">
            Powered by Stripe Connect · Adaptivity does not store your Social Security number
          </p>
          <button
            type="button"
            onClick={() => {
              onCompleted();
              onClose();
            }}
            className="px-4 py-2 bg-orange-500 rounded-xl text-xs font-bold text-white hover:bg-orange-600 transition-colors"
          >
            Done / Finished
          </button>
        </div>
      </div>
    </div>
  );
};
