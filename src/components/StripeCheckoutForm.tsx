import React, { useState } from 'react';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Lock } from 'lucide-react';

interface StripeCheckoutFormProps {
  grandTotal: number;
  techPayoutAmount: number;
  platformFeeAmount: number;
  bookingDetails: {
    id: string;
    customerName: string;
    customerEmail?: string;
  };
  onPaid: (paymentIntentId: string) => void;
}

export const StripeCheckoutForm: React.FC<StripeCheckoutFormProps> = ({
  grandTotal,
  techPayoutAmount,
  platformFeeAmount,
  bookingDetails,
  onPaid,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [payError, setPayError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setPayError(null);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: {
        receipt_email: bookingDetails.customerEmail,
        payment_method_data: {
          billing_details: {
            name: bookingDetails.customerName,
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
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        </div>
        <button
          type="submit"
          disabled={isProcessing || !stripe}
          className="px-7 py-3.5 font-black text-xs rounded-xl shadow-lg flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white disabled:opacity-50"
        >
          <Lock className="w-4 h-4" />
          <span>{isProcessing ? 'Processing…' : `Pay $${grandTotal}.00`}</span>
        </button>
      </div>
    </form>
  );
};
