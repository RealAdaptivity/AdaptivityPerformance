import React, { useMemo } from 'react';
import { Elements, PaymentMethodMessagingElement } from '@stripe/react-stripe-js';
import { CalendarRange } from 'lucide-react';
import { getStripe } from '../services/stripeConnectService';
import {
  bnplHeadline,
  bnplLenderList,
  bnplPlanHintForAmount,
  bnplShortBlurb,
} from '../services/bnplEligibility';

type Props = {
  amountDollars: number;
  variant?: 'compact' | 'checkout';
  className?: string;
};

/**
 * Stripe Payment Method Messaging + Adaptivity BNPL copy.
 * Enable Affirm, Afterpay, Zip, Sunbit, Klarna in Stripe Dashboard (or a platform PMC).
 */
export const BnplMessaging: React.FC<Props> = ({
  amountDollars,
  variant = 'compact',
  className = '',
}) => {
  const amountCents = Math.max(0, Math.round(amountDollars * 100));
  const hint = bnplPlanHintForAmount(amountDollars);
  const headline = bnplHeadline(amountDollars);

  const options = useMemo(
    () => ({
      amount: amountCents,
      currency: 'USD' as const,
      countryCode: 'US' as const,
      // Messaging Element currently types Affirm / Klarna / Afterpay only; Zip & Sunbit still appear at Payment Element checkout.
      paymentMethodTypes: ['affirm', 'afterpay_clearpay', 'klarna'] as (
        | 'affirm'
        | 'afterpay_clearpay'
        | 'klarna'
      )[],
    }),
    [amountCents]
  );

  if (amountCents < 5000) {
    return (
      <div
        className={`rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11px] text-slate-400 ${className}`}
      >
        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-300">
          <CalendarRange className="w-3.5 h-3.5 text-amber-400" />
          Pay in 4 / longer plans
        </span>
        <p className="mt-1 leading-relaxed">
          Financing via {bnplLenderList()} appears at final checkout on eligible totals (typically $50+).
          Diagnostic card holds stay on a regular card.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-amber-500/25 bg-amber-950/20 px-3 py-3 space-y-2 ${className}`}
    >
      <div className="flex items-start gap-2">
        <CalendarRange className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-bold text-amber-200">
            {hint === 'pay_in_4'
              ? 'Pay in 4 available'
              : hint === 'longer'
                ? 'Pay in 4 or longer plans'
                : 'Flexible payments'}
          </p>
          {headline && variant === 'checkout' && (
            <p className="text-[11px] text-slate-300 leading-relaxed">{headline}</p>
          )}
          <p className="text-[11px] text-slate-400 leading-relaxed">{bnplShortBlurb(amountDollars)}</p>
          <p className="text-[10px] text-slate-500">{bnplLenderList()}</p>
        </div>
      </div>
      <div className="bnpl-messaging-element text-slate-200 [&_a]:text-orange-400">
        <Elements stripe={getStripe()}>
          <PaymentMethodMessagingElement options={options} />
        </Elements>
      </div>
      {variant === 'checkout' && (
        <p className="text-[10px] text-slate-500 leading-relaxed">
          Turn on Affirm, Afterpay, Zip, Sunbit, and Klarna in Stripe → Payment methods (or your platform
          payment method configuration). Exact plans are shown by each lender at checkout. Sunbit messaging
          appears in the payment form when enabled.
        </p>
      )}
    </div>
  );
};
