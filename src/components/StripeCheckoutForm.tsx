import React, { useEffect, useState } from 'react';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Lock } from 'lucide-react';
import { BnplMessaging } from './BnplMessaging';

interface StripeCheckoutFormProps {
  grandTotal: number;
  techPayoutAmount: number;
  platformFeeAmount: number;
  bookingDetails: {
    id: string;
    customerName: string;
    customerEmail?: string;
  };
  preferFinancing?: boolean;
  onPaid: (paymentIntentId: string) => void;
}

export const StripeCheckoutForm: React.FC<StripeCheckoutFormProps> = ({
  grandTotal,
  techPayoutAmount,
  platformFeeAmount,
  bookingDetails,
  preferFinancing = true,
  onPaid,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [payError, setPayError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Return from Affirm / Klarna / Afterpay / Zip / Sunbit redirect flows
  useEffect(() => {
    if (!stripe) return;
    const params = new URLSearchParams(window.location.search);
    const clientSecret = params.get('payment_intent_client_secret');
    if (!clientSecret) return;
    let cancelled = false;
    (async () => {
      const { paymentIntent, error } = await stripe.retrievePaymentIntent(clientSecret);
      if (cancelled) return;
      if (error) {
        setPayError(error.message || 'Could not confirm financing payment');
        return;
      }
      if (paymentIntent?.status === 'succeeded') {
        onPaid(paymentIntent.id);
        const url = new URL(window.location.href);
        url.searchParams.delete('payment_intent');
        url.searchParams.delete('payment_intent_client_secret');
        url.searchParams.delete('redirect_status');
        window.history.replaceState({}, '', url.pathname + url.search + url.hash);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stripe, onPaid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setPayError(null);

    const returnUrl = new URL(window.location.href);
    returnUrl.searchParams.set('checkout', 'bnpl_return');

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: {
        return_url: returnUrl.toString(),
        receipt_email: bookingDetails.customerEmail,
        payment_method_data: {
          billing_details: {
            name: bookingDetails.customerName,
            email: bookingDetails.customerEmail,
            address: { country: 'US' },
          },
        },
      },
    });
    setIsProcessing(false);

    if (error) {
      setPayError(error.message || 'Payment failed');
      return;
    }
    if (paymentIntent?.status === 'succeeded') {
      onPaid(paymentIntent.id);
    } else if (paymentIntent?.status === 'processing') {
      setPayError('Payment is processing — we’ll confirm when the lender finishes.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {preferFinancing && <BnplMessaging amountDollars={grandTotal} variant="checkout" />}

      <PaymentElement options={{ layout: 'tabs' }} />

      {payError && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{payError}</p>
      )}

      <div className="text-[11px] text-slate-400 flex justify-between">
        <span>Tech payout (70% + tip): ${techPayoutAmount}</span>
        <span>Platform fee (30%): ${platformFeeAmount}</span>
      </div>

      <div className="bg-slate-950 p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs text-slate-400 block">Total Due (Service + Tip)</span>
          <span className="text-2xl font-black text-emerald-400 font-mono">${grandTotal}.00</span>
          <span className="block text-[10px] text-amber-400/90 mt-1">
            Card or Affirm · Afterpay · Zip · Sunbit · Klarna when eligible
          </span>
        </div>
        <button
          type="submit"
          disabled={isProcessing || !stripe}
          className="px-7 py-3.5 font-black text-xs rounded-xl shadow-lg flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white disabled:opacity-50"
        >
          <Lock className="w-4 h-4" />
          <span>{isProcessing ? 'Processing…' : 'Pay securely'}</span>
        </button>
      </div>
    </form>
  );
};
