import React, { useEffect, useRef, useState } from 'react';
import { CreditCard, Lock } from 'lucide-react';
import { loadPayPalSdk, type PayPalCardFields } from '../services/paypalSdk';
import { confirmBookingHold } from '../services/stripePaymentsApi';

interface PayPalDepositSectionProps {
  /** Order id created server-side at booking. */
  orderId: string;
  bookingReference: string;
  depositAmountDollars: number;
  onAuthorized: () => void;
}

/**
 * Diagnostic deposit step, on PayPal hosted card fields.
 *
 * PayPal renders the number, expiry and CVV inputs into our containers from its
 * own iframe, so the card never touches this DOM and the customer never needs a
 * PayPal account.
 *
 * The deposit is charged, not held, and the copy says so. Approving the order in
 * the browser moves no money — only the server-side capture does — so a failure
 * after approval is reported plainly rather than retried into a second charge on
 * the customer's card.
 */
export const PayPalDepositSection: React.FC<PayPalDepositSectionProps> = ({
  orderId,
  bookingReference,
  depositAmountDollars,
  onAuthorized,
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
          // The order already exists; hand PayPal its id rather than creating
          // another, which would leave an orphaned order per attempt.
          createOrder: async () => orderId,
          onApprove: async (data) => {
            // From here the customer's card is being authorized, so a failure
            // below is not a simple "try again".
            try {
              await confirmBookingHold({
                bookingReference,
                orderId: data.orderID,
              });
              if (!cancelled) onAuthorized();
            } catch (confirmErr) {
              if (cancelled) return;
              setError(
                `Your payment went through, but we could not attach it to booking ${bookingReference}. ` +
                  'Please call us at (940) 304-0620 before trying again so you are not charged twice. ' +
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

        await fields.NumberField().render('#paypal-card-number');
        await fields.ExpiryField().render('#paypal-card-expiry');
        await fields.CVVField().render('#paypal-card-cvv');

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
  }, [orderId, bookingReference, onAuthorized]);

  const handleSubmit = async () => {
    if (!cardFieldsRef.current) return;
    setIsProcessing(true);
    setError(null);
    try {
      // Resolves once PayPal has run onApprove (or onError).
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
        (940) 304-0620 and we&apos;ll take your booking over the phone.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 text-[11px] text-slate-300 bg-slate-950/80 border border-white/10 rounded-xl p-3">
        <CreditCard className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
        <p>
          Your card will be charged{' '}
          <strong className="text-white">${depositAmountDollars.toFixed(2)}</strong> now to confirm
          the visit. It comes straight off your repair total, and we refund it in full if we
          can&apos;t make the appointment.
        </p>
      </div>

      <div className="space-y-3">
        <div id="paypal-card-number" className="min-h-[44px] bg-slate-950 border border-white/10 rounded-xl px-3" />
        <div className="grid grid-cols-2 gap-3">
          <div id="paypal-card-expiry" className="min-h-[44px] bg-slate-950 border border-white/10 rounded-xl px-3" />
          <div id="paypal-card-cvv" className="min-h-[44px] bg-slate-950 border border-white/10 rounded-xl px-3" />
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
          {!ready
            ? 'Loading secure form…'
            : isProcessing
              ? 'Processing…'
              : `Pay deposit — $${depositAmountDollars.toFixed(2)}`}
        </span>
      </button>
    </div>
  );
};
