-- Authorized card holds should show as awaiting capture, not generic awaiting_payment.
UPDATE public.payments
SET payout_status = 'awaiting_capture'
WHERE status = 'authorized'
  AND payout_status IN ('none', 'awaiting_payment');
