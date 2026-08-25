import React, { useMemo } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { getStripe } from '../services/stripeConnectService';
import { StripeBookingHoldForm } from './StripeBookingHoldForm';

interface StripeBookingHoldSectionProps {
  clientSecret: string;
  holdAmountDollars: number;
  customerName: string;
  customerEmail: string;
  onAuthorized: () => void;
}

export const StripeBookingHoldSection: React.FC<StripeBookingHoldSectionProps> = ({
  clientSecret,
  holdAmountDollars,
  customerName,
  customerEmail,
  onAuthorized,
}) => {
  const options = useMemo(
    () => ({
      clientSecret,
      appearance: {
        theme: 'night' as const,
        variables: {
          colorPrimary: '#f97316',
          colorBackground: '#0b0c10',
          colorText: '#f1f5f9',
        },
      },
    }),
    [clientSecret]
  );

  return (
    <Elements stripe={getStripe()} options={options}>
      <StripeBookingHoldForm
        holdAmountDollars={holdAmountDollars}
        customerName={customerName}
        customerEmail={customerEmail}
        onAuthorized={onAuthorized}
      />
    </Elements>
  );
};
