import React, { useEffect, useState } from 'react';
import { CreditCard, Lock } from 'lucide-react';
import { loadHelcimPay, openHelcimPayModal } from '../services/helcimPay';
import { confirmBookingHold } from '../services/stripePaymentsApi';

interface HelcimBookingHoldSectionProps {
  /** HelcimPay.js session from create-booking-with-hold. */
  checkoutToken: string;
  bookingReference: string;
  holdAmountDollars: number;
  onAuthorized: () => void;
}

/**
 * Card hold step, on HelcimPay.js.
 *
 * Replaces StripeBookingHoldSection + StripeBookingHoldForm, which were two
 * components because Elements needed a provider wrapping a form of card fields.
 * HelcimPay.js hosts its own modal, so there are no fields to render here -- the
 * whole step is a button, the modal, and then confirming the result with our
 * backend.
 *
 * The hold is not real until confirmBookingHold succeeds. A customer who
 * completes the modal but whose confirmation fails has an authorization sitting
 * on their card that we have no record of, so that case is surfaced explicitly
 * rather than being retried silently or swallowed.
 */
export const HelcimBookingHoldSection: React.FC<HelcimBookingHoldSectionProps> = ({
  checkoutToken,
  bookingReference,
  holdAmountDollars,
  onAuthorized,
}) => {
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadHelcimPay()
      .then(() => {
        if (!cancelled) setScriptReady(true);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setScriptError(e instanceof Error ? e.message : 'Could not load the secure payment form.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleClick = async () => {
    setIsProcessing(true);
    setPayError(null);
    try {
      const result = await openHelcimPayModal(checkoutToken);

      // From here the customer's card already carries an authorization, so a
      // failure below is not a simple "try again" -- say so plainly.
      try {
        await confirmBookingHold({
          bookingReference,
          transactionId: result.transactionId,
        });
      } catch (confirmErr) {
        setPayError(
          `Your card was authorized, but we could not attach it to booking ${bookingReference}. ` +
            `Please contact us at (940) 304-0620 before trying again so you are not charged twice. ` +
            `(${confirmErr instanceof Error ? confirmErr.message : 'confirmation failed'})`
        );
        return;
      }

      onAuthorized();
    } catch (e: unknown) {
      setPayError(e instanceof Error ? e.message : 'Could not save your card.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 text-[11px] text-slate-300 bg-slate-950/80 border border-white/10 rounded-xl p-3">
        <CreditCard className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
        <p>
          We&apos;ll place a{' '}
          <strong className="text-white">${holdAmountDollars.toFixed(2)}</strong> hold for your
          diagnostic visit. Your card is charged only when the job is completed.
        </p>
      </div>

      {scriptError && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {scriptError}
        </p>
      )}

      {payError && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {payError}
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
              ? 'Waiting for card…'
              : `Confirm hold — $${holdAmountDollars.toFixed(2)}`}
        </span>
      </button>
    </div>
  );
};
