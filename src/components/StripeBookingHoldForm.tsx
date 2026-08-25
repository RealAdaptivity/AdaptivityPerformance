import React, { useState } from 'react';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { CreditCard, Lock, Loader2 } from 'lucide-react';

interface StripeBookingHoldFormProps {
  holdAmountDollars: number;
  customerName: string;
  customerEmail: string;
  onAuthorized: () => void;
}

export const StripeBookingHoldForm: React.FC<StripeBookingHoldFormProps> = ({
  holdAmountDollars,
  customerName,
  customerEmail,
  onAuthorized,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [payError, setPayError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setPayError(null);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: {
        receipt_email: customerEmail,
        payment_method_data: {
          billing_details: { name: customerName, email: customerEmail },
        },
      },
    });
    setIsProcessing(false);

    if (error) {
      setPayError(error.message || 'Could not save card');
      return;
    }
    if (
      paymentIntent?.status === 'requires_capture' ||
      paymentIntent?.status === 'succeeded'
    ) {
      onAuthorized();
    } else {
      setPayError(`Unexpected payment status: ${paymentIntent?.status ?? 'unknown'}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-start gap-2 text-[11px] text-slate-300 bg-slate-950/80 border border-white/10 rounded-xl p-3">
        <CreditCard className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
        <p>
          We&apos;ll place a <strong className="text-white">${holdAmountDollars.toFixed(2)}</strong> hold for your
          diagnostic visit. Your card is charged only when the job is completed. Technicians receive 70% via
          platform checkout.
        </p>
      </div>

      {!isReady && (
        <div className="py-8 flex items-center justify-center text-xs text-slate-400 gap-2 bg-slate-950/40 border border-white/5 rounded-xl">
          <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
          <span>Loading secure card inputs...</span>
        </div>
      )}

      <div className={isReady ? 'block' : 'hidden'}>
        <PaymentElement
          options={{ layout: 'tabs' }}
          onReady={() => setIsReady(true)}
          onChange={() => setPayError(null)}
        />
      </div>

      {payError && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {payError}
        </p>
      )}

      <button
        type="submit"
        disabled={isProcessing || !stripe || !isReady}
        className="w-full py-3.5 font-black text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white disabled:opacity-50 transition"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Saving card…</span>
          </>
        ) : (
          <>
            <Lock className="w-4 h-4" />
            <span>Confirm hold — ${holdAmountDollars.toFixed(2)}</span>
          </>
        )}
      </button>
    </form>
  );
};
