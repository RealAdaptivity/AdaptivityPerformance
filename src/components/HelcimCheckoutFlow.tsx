import React, { useEffect, useState } from 'react';
import { createCheckoutPaymentIntent } from '../services/stripePaymentsApi';
import { HelcimCheckoutSection } from './HelcimCheckoutSection';

interface HelcimCheckoutFlowProps {
  baseAmount: number;
  tipAmount: number;
  grandTotal: number;
  bookingDetails: {
    id: string;
    customerName: string;
    customerEmail?: string;
  };
  onPaid: (transactionId: string) => void;
}

/**
 * Opens a Helcim checkout session, then hands off to the payment button.
 *
 * Replaces StripeCheckoutSection. The Stripe version had to fetch a client
 * secret and feed it to an <Elements> provider before any card UI could render;
 * here the session token goes straight to HelcimPay.js, so the provider layer
 * is gone.
 *
 * The tech payout and platform fee props the old component took are dropped:
 * they were only displayed, and the split is now recorded server-side in
 * tech_payouts at confirmation rather than being asserted by the client.
 */
export const HelcimCheckoutFlow: React.FC<HelcimCheckoutFlowProps> = ({
  baseAmount,
  tipAmount,
  grandTotal,
  bookingDetails,
  onPaid,
}) => {
  const [checkoutToken, setCheckoutToken] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await createCheckoutPaymentIntent({
          baseAmountDollars: baseAmount,
          tipAmountDollars: tipAmount,
          customerEmail: bookingDetails.customerEmail,
          customerName: bookingDetails.customerName,
          bookingReference: bookingDetails.id,
        });
        if (!cancelled) setCheckoutToken(result.checkoutToken);
      } catch (e: unknown) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Could not start checkout');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [baseAmount, tipAmount, bookingDetails]);

  if (loadError) {
    return (
      <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
        {loadError}
        <p className="text-xs text-slate-400 mt-2">
          Check that <code className="text-slate-300">HELCIM_API_TOKEN</code> is set under Supabase
          → Project Settings → Edge Functions → Secrets.
        </p>
      </div>
    );
  }

  if (!checkoutToken) {
    return <p className="text-sm text-slate-400 animate-pulse">Starting secure checkout…</p>;
  }

  return (
    <HelcimCheckoutSection
      checkoutToken={checkoutToken}
      grandTotal={grandTotal}
      onPaid={onPaid}
    />
  );
};
