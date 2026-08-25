import React, { useState } from 'react';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { CreditCard, Lock, Loader2, ShieldCheck, Sparkles } from 'lucide-react';

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
      setPayError(error.message || 'Payment failed');
      return;
    }
    if (
      paymentIntent?.status === 'succeeded' ||
      paymentIntent?.status === 'requires_capture'
    ) {
      onAuthorized();
    } else {
      setPayError(`Unexpected payment status: ${paymentIntent?.status ?? 'unknown'}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-start gap-2 text-[11px] text-slate-300 bg-slate-950/80 border border-white/10 rounded-xl p-3.5 space-y-1">
        <CreditCard className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-white">
            Pay <strong className="text-orange-400">${holdAmountDollars.toFixed(2)}</strong> Diagnostic Fee & Save Card on File
          </p>
          <p className="text-slate-400 text-[10px] leading-relaxed">
            Your $85 payment reserves your certified technician. Additional labor & parts are quoted on-site and charged upon completion.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
        <span className="flex items-center gap-1 text-emerald-400 font-medium">
          <Sparkles className="w-3.5 h-3.5" /> Buy Now, Pay Later Available
        </span>
        <span className="text-[10px] text-slate-500">Affirm · Klarna · Afterpay · Card · Apple Pay</span>
      </div>

      <div className="min-h-[140px] bg-slate-950/60 border border-white/10 rounded-xl p-3.5">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
          onChange={() => setPayError(null)}
        />
      </div>

      {payError && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {payError}
        </p>
      )}

      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 px-1">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>Backed by our 12-Month / 12,000-Mile Warranty</span>
      </div>

      <button
        type="submit"
        disabled={isProcessing || !stripe}
        className="w-full py-3.5 font-black text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white disabled:opacity-50 transition"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Processing $85.00 payment…</span>
          </>
        ) : (
          <>
            <Lock className="w-4 h-4" />
            <span>Pay ${holdAmountDollars.toFixed(2)} & Book Appointment</span>
          </>
        )}
      </button>
    </form>
  );
};
