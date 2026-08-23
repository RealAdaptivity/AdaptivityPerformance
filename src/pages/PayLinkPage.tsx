import React, { useEffect, useMemo, useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { getStripe } from '../services/stripeConnectService';
import { createCheckoutPaymentIntent, type CreatePaymentIntentResult } from '../services/stripePaymentsApi';
import { StripeCheckoutForm } from '../components/StripeCheckoutForm';

/** Extract the booking reference from a `/pay/<ref>` path. */
export function payReferenceFromPath(pathname: string): string | null {
  const match = pathname.replace(/\/+$/, '').match(/^\/pay\/([A-Za-z0-9_-]{3,40})$/);
  return match ? decodeURIComponent(match[1]) : null;
}

interface PayLinkPageProps {
  reference: string;
}

export const PayLinkPage: React.FC<PayLinkPageProps> = ({ reference }) => {
  const [intent, setIntent] = useState<CreatePaymentIntentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIntent(null);
    setError(null);
    (async () => {
      try {
        const result = await createCheckoutPaymentIntent({ paymentLinkReference: reference });
        if (!cancelled) setIntent(result);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load this payment link');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reference]);

  const options = useMemo(() => {
    if (!intent?.clientSecret) return undefined;
    return {
      clientSecret: intent.clientSecret,
      appearance: {
        theme: 'night' as const,
        variables: {
          colorPrimary: '#f97316',
          colorBackground: '#0b0c10',
          colorText: '#f1f5f9',
        },
      },
    };
  }, [intent?.clientSecret]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-4">
          <ShieldCheck className="w-4 h-4" /> Adaptivity Performance — Secure Checkout
        </div>

        {error && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            {error}
          </div>
        )}

        {!error && !intent && (
          <p className="text-sm text-slate-400 animate-pulse">Loading your secure payment…</p>
        )}

        {paid && (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h2 className="text-lg font-black">Payment received</h2>
            <p className="text-sm text-slate-400 mt-1">Thank you — a receipt is on its way.</p>
          </div>
        )}

        {!paid && intent && options && (
          <>
            <div className="mb-5">
              <p className="text-xs text-slate-400">Service total for {intent.customerName || 'your visit'}</p>
              <p className="text-3xl font-black text-emerald-400 font-mono">
                ${(intent.totalCharged ?? 0).toFixed(2)}
              </p>
              {intent.services && intent.services.length > 0 && (
                <p className="text-[11px] text-slate-500 mt-1">{intent.services.join(' · ')}</p>
              )}
              <p className="text-[11px] text-amber-400/90 mt-2">
                Pay by card or finance with Affirm · Afterpay · Zip · Sunbit · Klarna when eligible
              </p>
            </div>

            <Elements stripe={getStripe()} options={options}>
              <StripeCheckoutForm
                grandTotal={intent.totalCharged ?? 0}
                techPayoutAmount={intent.techShareAmount ?? 0}
                platformFeeAmount={intent.platformShareAmount ?? 0}
                bookingDetails={{
                  id: intent.bookingReference || reference,
                  customerName: intent.customerName || 'Customer',
                }}
                preferFinancing
                onPaid={() => setPaid(true)}
              />
            </Elements>
          </>
        )}
      </div>
    </div>
  );
};
