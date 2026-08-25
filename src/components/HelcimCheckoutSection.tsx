import React, { useEffect, useState } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import { loadHelcimPay, openHelcimPayModal } from '../services/helcimPay';
import { confirmCheckoutPayment } from '../services/stripePaymentsApi';

interface HelcimCheckoutSectionProps {
  /** HelcimPay.js session from create-payment-intent. */
  checkoutToken: string;
  grandTotal: number;
  /** Receives the Helcim transaction id, for receipts and support lookups. */
  onPaid: (transactionId: string) => void;
}

/**
 * Final payment step on HelcimPay.js.
 *
 * Replaces StripeCheckoutForm / StripeCheckoutSection. Same shape as
 * HelcimBookingHoldSection -- button, hosted modal, server-side confirmation --
 * but the session is a `purchase` rather than a `preauth`, so the money moves
 * immediately instead of being held.
 *
 * Note there is no financing option here. The Stripe version surfaced Affirm,
 * Afterpay, Zip, Sunbit and Klarna through automatic_payment_methods; Helcim has
 * no BNPL offering, so the card is the only path and the copy no longer promises
 * otherwise.
 */
export const HelcimCheckoutSection: React.FC<HelcimCheckoutSectionProps> = ({
  checkoutToken,
  grandTotal,
  onPaid,
}) => {
  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadHelcimPay()
      .then(() => {
        if (!cancelled) setScriptReady(true);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load the secure payment form.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleClick = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const result = await openHelcimPayModal(checkoutToken);

      // The card has been charged by this point, so a failed confirmation means
      // we hold money we have not recorded. Say so rather than inviting a retry
      // that would charge again.
      try {
        await confirmCheckoutPayment({
          checkoutToken,
          transactionId: result.transactionId,
        });
      } catch (confirmErr) {
        setError(
          'Your payment went through, but we could not record it. Please contact us at ' +
            '(940) 304-0620 before paying again so you are not charged twice. ' +
            `(${confirmErr instanceof Error ? confirmErr.message : 'confirmation failed'})`
        );
        return;
      }

      onPaid(result.transactionId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Payment could not be completed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-[11px] text-emerald-400">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Secure card payment</span>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleClick}
        disabled={isProcessing || !scriptReady}
        className="w-full py-3.5 font-black text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white disabled:opacity-50"
      >
        <Lock className="w-4 h-4" />
        <span>
          {!scriptReady
            ? 'Loading secure form…'
            : isProcessing
              ? 'Processing…'
              : `Pay $${grandTotal.toFixed(2)}`}
        </span>
      </button>
    </div>
  );
};
