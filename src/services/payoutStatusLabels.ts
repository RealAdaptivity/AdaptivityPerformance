/** Human-readable payment + payout state for tech earnings UI. */
export function formatTechPayoutLabel(payoutStatus: string, paymentStatus: string): string {
  switch (payoutStatus) {
    case 'instant_paid':
      return 'Instant paid';
    case 'paid':
      return 'Paid out';
    case 'instant_pending':
      return 'Instant transfer in progress';
    case 'standard_pending':
      return 'Bank transfer in progress';
    case 'retry_pending':
      return 'Waiting for Connect balance';
    case 'failed':
      return 'Payout failed';
    case 'skipped':
      return 'No Connect account at capture';
    case 'pending':
      return 'On Connect — use Instant cash out';
    case 'awaiting_job':
      return 'Deposit paid — complete job to settle';
    case 'awaiting_capture':
      return 'Deposit paid — complete job to settle';
    case 'awaiting_payment':
      return paymentStatus === 'deposit_paid'
        ? 'Deposit paid — complete job to settle'
        : 'Waiting for customer payment';
    case 'none':
      if (paymentStatus === 'deposit_paid') return 'Deposit paid — complete job to settle';
      if (paymentStatus === 'balance_due') return 'Balance due — send a payment link';
      if (paymentStatus === 'pending') return 'Waiting for customer card';
      if (paymentStatus === 'succeeded') return 'Captured — transfer to Connect needed';
      return 'Not started';
    default:
      return payoutStatus.replace(/_/g, ' ');
  }
}

export function countsTowardLedgerPending(payoutStatus: string, paymentStatus: string): boolean {
  if (!['deposit_paid', 'balance_due', 'authorized', 'succeeded'].includes(paymentStatus)) return false;
  return ['retry_pending', 'awaiting_capture', 'awaiting_job', 'none', 'pending', 'awaiting_payment'].includes(
    payoutStatus
  );
}
