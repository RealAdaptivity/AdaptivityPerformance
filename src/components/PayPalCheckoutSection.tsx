import React, { useEffect, useRef, useState } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import { loadPayPalSdk, type PayPalCardFields } from '../services/paypalSdk';
import { confirmCheckoutPayment } from '../services/stripePaymentsApi';

interface PayPalCheckoutSectionProps {
  /** Order id from create-payment-intent. */
  orderId: string;
  grandTotal: number;
  onPaid: (captureId: string) => void;
}

/**
 * Final payment step on PayPal hosted card fields.
 *
 * Replaces StripeCheckoutForm / StripeCheckoutSection. Same shape as
 * PayPalBookingHoldSection, but the order carries intent CAPTURE rather than
 * AUTHORIZE, so the money moves immediately instead of being held.
 *
 * There is no financing option here. The Stripe version surfaced Affirm,
 * Afterpay, Zip, Sunbit and Klarna through automatic_payment_methods; this path
 * is card-only, and the copy no longer promises otherwise.
 */
export const PayPalCheckoutSection: React.FC<PayPalCheckoutSectionProps> = ({
  orderId,
  grandTotal,
  onPaid,
}) => {
  const [ready, setReady] = useState(false);
  const [ineligible, setIneligible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const cardFieldsRef = useRef<PayPalCardFields | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await loadPayPalSdk();
        if (cancelled) return;

        const CardFields = window.paypal?.CardFields;
        if (!CardFields) {
          setIneligible(true);
          return;
        }

        const fields = CardFields({
          createOrder: async () => orderId,
          onApprove: async (data) => {
            // The card is being charged here, so a failure below means we may
            // hold money we have not recorded.
            try {
              const result = await confirmCheckoutPayment({ orderId: data.orderID });
              if (!cancelled) onPaid(result.captureId ?? '');
            } catch (confirmErr) {
              if (cancelled) return;
              setError(
                'Your payment went through, but we could not record it. Please call us at ' +
                  '(940) 304-0620 before paying again so you are not charged twice. ' +
                  `(${confirmErr instanceof Error ? confirmErr.message : 'confirmation failed'})`
              );
            }
          },
          onError: (err: unknown) => {
            if (cancelled) return;
            setError(err instanceof Error ? err.message : 'Could not process the card.');
            setIsProcessing(false);
          },
        });

        if (!fields.isEligible()) {
          setIneligible(true);
          return;
        }

        await fields.NumberField().render('#paypal-checkout-number');
        await fields.ExpiryField().render('#paypal-checkout-expiry');
        await fields.CVVField().render('#paypal-checkout-cvv');

        if (cancelled) return;
        cardFieldsRef.current = fields;
        setReady(true);
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load the secure payment form.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderId, onPaid]);

  const handleSubmit = async () => {
    if (!cardFieldsRef.current) return;
    setIsProcessing(true);
    setError(null);
    try {
      await cardFieldsRef.current.submit();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not submit the card.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (ineligible) {
    return (
      <div className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
        Card payment isn&apos;t available on this device right now. Please call us at
        (940) 304-0620 to settle this invoice.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-[11px] text-emerald-400">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Secure card payment</span>
      </div>

      <div className="space-y-3">
        <div id="paypal-checkout-number" className="min-h-[44px] bg-slate-950 border border-white/10 rounded-xl px-3" />
        <div className="grid grid-cols-2 gap-3">
          <div id="paypal-checkout-expiry" className="min-h-[44px] bg-slate-950 border border-white/10 rounded-xl px-3" />
          <div id="paypal-checkout-cvv" className="min-h-[44px] bg-slate-950 border border-white/10 rounded-xl px-3" />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isProcessing || !ready}
        className="w-full py-3.5 font-black text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white disabled:opacity-50"
      >
        <Lock className="w-4 h-4" />
        <span>
          {!ready ? 'Loading secure form…' : isProcessing ? 'Processing…' : `Pay $${grandTotal.toFixed(2)}`}
        </span>
      </button>
    </div>
  );
};
