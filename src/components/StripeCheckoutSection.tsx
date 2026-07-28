import React, { useEffect, useMemo, useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { getStripe } from '../services/stripeConnectService';
import { createCheckoutPaymentIntent } from '../services/stripePaymentsApi';
import { StripeCheckoutForm } from './StripeCheckoutForm';

interface StripeCheckoutSectionProps {
  baseAmount: number;
  tipAmount: number;
  grandTotal: number;
  techPayoutAmount: number;
  platformFeeAmount: number;
  preferFinancing?: boolean;
  bookingDetails: {
    id: string;
    customerName: string;
    customerEmail?: string;
    serviceAddress?: string;
    techStripeAccountId?: string | null;
  };
  onPaid: (paymentIntentId: string) => void;
}

export const StripeCheckoutSection: React.FC<StripeCheckoutSectionProps> = ({
  baseAmount,
  tipAmount,
  grandTotal,
  techPayoutAmount,
  platformFeeAmount,
  preferFinancing = true,
  bookingDetails,
  onPaid,
}) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
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
          shippingAddress: bookingDetails.serviceAddress
            ? { line1: bookingDetails.serviceAddress }
            : undefined,
          techStripeAccountId: bookingDetails.techStripeAccountId,
          bookingReference: bookingDetails.id,
          preferFinancing,
        });
        if (!cancelled) setClientSecret(result.clientSecret);
      } catch (e: unknown) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Could not initialize Stripe checkout');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [baseAmount, tipAmount, bookingDetails, preferFinancing]);

  const options = useMemo(() => {
    if (!clientSecret) return undefined;
    return {
      clientSecret,
      appearance: {
        theme: 'night' as const,
        variables: {
          colorPrimary: '#f97316',
          colorBackground: '#0b0c10',
          colorText: '#f1f5f9',
        },
      },
    };
  }, [clientSecret]);

  if (loadError) {
    return (
      <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
        {loadError}
        <p className="text-xs text-slate-400 mt-2">
          Add Supabase secret <code className="text-slate-300">STRIPE_SECRET_KEY</code> (Dashboard → Project Settings → Edge Functions → Secrets).
          Enable Affirm, Afterpay, Zip, Sunbit & Klarna under Stripe → Settings → Payment methods
          (or attach a platform <code className="text-slate-300">pmc_…</code> config).
        </p>
      </div>
    );
  }

  if (!clientSecret || !options) {
    return <p className="text-sm text-slate-400 animate-pulse">Initializing secure Stripe checkout…</p>;
  }

  return (
    <Elements stripe={getStripe()} options={options}>
      <StripeCheckoutForm
        grandTotal={grandTotal}
        techPayoutAmount={techPayoutAmount}
        platformFeeAmount={platformFeeAmount}
        bookingDetails={bookingDetails}
        preferFinancing={preferFinancing}
        onPaid={onPaid}
      />
    </Elements>
  );
};
