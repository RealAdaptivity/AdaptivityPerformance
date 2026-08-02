import { stripeRequest } from './stripe.ts';

export async function calculatePartsSalesTax(opts: {
  postalCode: string;
  parts: Array<{ reference: string; amountCents: number }>;
}) {
  const parts = opts.parts.filter((part) => part.amountCents > 0);
  if (parts.length === 0) return { id: null as string | null, taxCents: 0 };
  const postalCode = opts.postalCode.trim();
  if (!/^\d{5}(?:-\d{4})?$/.test(postalCode)) {
    throw new Error('A valid service ZIP code is required to calculate sales tax.');
  }
  const calculation = await stripeRequest('/tax/calculations', 'POST', {
    currency: 'usd',
    line_items: parts.map((part, index) => ({
      amount: part.amountCents,
      reference: `${index + 1}-${part.reference}`.slice(0, 500),
      tax_behavior: 'exclusive',
      tax_code: 'txcd_99999999',
    })),
    customer_details: {
      address: { country: 'US', postal_code: postalCode },
      address_source: 'shipping',
    },
  });
  return {
    id: typeof calculation.id === 'string' ? calculation.id : null,
    taxCents: Math.max(0, Number(calculation.tax_amount_exclusive) || 0),
  };
}

export async function commitSalesTaxCalculation(calculationId: string, bookingReference: string) {
  return stripeRequest('/tax/transactions/create_from_calculation', 'POST', {
    calculation: calculationId,
    reference: `booking-${bookingReference}`,
    metadata: { booking_reference: bookingReference },
  });
}
