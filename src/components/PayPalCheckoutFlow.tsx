import React, { useEffect, useState } from 'react';
import { createCheckoutPaymentIntent } from '../services/stripePaymentsApi';
import { PayPalCheckoutSection } from './PayPalCheckoutSection';

interface PayPalCheckoutFlowProps {
  baseAmount: number;
  tipAmount: number;
  grandTotal: number;
  bookingDetails: {
    id: string;
    customerName: string;
    customerEmail?: string;
  };
  onPaid: (captureId: string) => void;
}

/**
 * Opens a PayPal checkout order, then hands off to the card fields.
 *
 * Replaces StripeCheckoutSection. The Stripe version had to fetch a client
 * secret and feed it to an <Elements> provider before any card UI could render;
 * here the order id goes straight to the PayPal SDK, so the provider layer is
 * gone.
 *
 * The tech payout and platform fee props the old component took are dropped:
 * they were display-only, and the split is recorded server-side in tech_payouts
 * at confirmation rather than asserted by the client.
 */
export const PayPalCheckoutFlow: React.FC<PayPalCheckoutFlowProps> = ({
  baseAmount,
  tipAmount,
  grandTotal,
  bookingDetails,
  onPaid,
}) => {
  const [orderId, setOrderId] = useState<string | null>(null);
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
        if (!cancelled) setOrderId(result.orderId);
      } catch (e: unknown) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Could not start checkout');
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
          Check that <code className="text-slate-300">PAYPAL_CLIENT_ID</code> and{' '}
          <code className="text-slate-300">PAYPAL_CLIENT_SECRET</code> are set under Supabase →
          Project Settings → Edge Functions → Secrets.
        </p>
      </div>
    );
  }

  if (!orderId) {
    return <p className="text-sm text-slate-400 animate-pulse">Starting secure checkout…</p>;
  }

  return <PayPalCheckoutSection orderId={orderId} grandTotal={grandTotal} onPaid={onPaid} />;
};
