import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, CheckCircle2, Lock, CreditCard, CalendarRange } from 'lucide-react';
import { PayPalCheckoutFlow } from './PayPalCheckoutFlow';
import { BnplMessaging } from './BnplMessaging';
import { bnplLenderList } from '../services/bnplEligibility';

interface PaymentCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingDetails?: {
    id: string;
    customerName: string;
    customerEmail?: string;
    serviceAddress?: string;
    vehicle: string;
    services: string[];
    totalAmount: number;
    techName?: string;
    techStripeAccountId?: string | null;
  };
  onPaymentSuccess?: (paymentId: string) => void;
}

export const PaymentCheckoutModal: React.FC<PaymentCheckoutModalProps> = ({
  isOpen,
  onClose,
  bookingDetails = {
    id: '',
    customerName: '',
    customerEmail: '',
    vehicle: '',
    services: [],
    totalAmount: 0,
    techName: '',
    techStripeAccountId: null,
  },
  onPaymentSuccess,
}) => {
  const [tipPercentage, setTipPercentage] = useState<number>(15);
  const [isPaid, setIsPaid] = useState(false);
  const [paymentId, setPaymentId] = useState('');
  const [preferFinancing, setPreferFinancing] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsPaid(false);
      setPaymentId('');
      setTipPercentage(15);
      setPreferFinancing(true);
    }
  }, [isOpen, bookingDetails.id]);

  if (!isOpen) return null;

  const baseAmount = bookingDetails.totalAmount || 280;
  const tipAmount = Math.round((baseAmount * tipPercentage) / 100);
  const grandTotal = baseAmount + tipAmount;

  const techPayoutAmount = Math.round(baseAmount * 0.7) + tipAmount;
  const platformFeeAmount = Math.round(baseAmount * 0.3);

  const handlePaid = (piId: string) => {
    setPaymentId(piId);
    setIsPaid(true);
    onPaymentSuccess?.(piId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div
        className="bg-[#12141c] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 bg-[#1a1d28] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h2 className="font-heading font-extrabold text-lg text-white">
                  Adaptivity Official Escrow Checkout
                </h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold uppercase">
                  AFFIRM · AFTERPAY · ZIP · SUNBIT · KLARNA
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official Mobile Dispatch Payment • Order #{bookingDetails.id}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-gradient-to-r from-amber-950/60 via-orange-950/40 to-slate-900 border-b border-amber-500/30 px-6 py-3 flex items-start space-x-3 text-xs">
          <ShieldCheck className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <strong className="text-amber-300 font-bold block">
              12-Month / 12,000-Mile Warranty Protection Notice
            </strong>
            <span className="text-slate-300 text-[11px] leading-tight block">
              Paying through Adaptivity Escrow activates your full{' '}
              <strong className="text-white">12 Month / 12,000 Mile Parts & Labor Warranty</strong>. Off-platform
              payments void coverage.
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {isPaid ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center animate-fadeIn">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 mb-2">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-heading font-black text-white">Payment Secured in Escrow</h3>
              <p className="text-slate-400 text-sm max-w-sm">
                Funds are held securely. Your tech is notified and will receive payout after job completion.
              </p>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 mt-4">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">
                  Transaction ID
                </span>
                <span className="font-mono text-emerald-400 text-sm">{paymentId}</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors"
              >
                Close Checkout
              </button>
            </div>
          ) : (
            <>
              <div className="bg-[#1a1d28] border border-white/5 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-white text-sm mb-1">Service Summary</h3>
                    <p className="text-xs text-slate-400">
                      {bookingDetails.vehicle} • Tech: {bookingDetails.techName || 'Pending Match'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                      Subtotal
                    </span>
                    <span className="font-mono font-bold text-white">${baseAmount.toFixed(2)}</span>
                  </div>
                </div>
                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  {bookingDetails.services.map((svc, i) => (
                    <div key={i} className="flex justify-between text-xs text-slate-300">
                      <span>• {svc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Add a Tip for your Tech
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 10, 15, 20].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setTipPercentage(pct)}
                      className={`py-2.5 rounded-xl text-sm font-bold transition-all border ${
                        tipPercentage === pct
                          ? 'bg-orange-500/20 border-orange-500 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.15)]'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      {pct === 0 ? 'None' : `${pct}%`}
                    </button>
                  ))}
                </div>
                {tipPercentage > 0 && (
                  <p className="text-[11px] text-emerald-400 mt-2 font-medium">
                    +${tipAmount.toFixed(2)} tip goes 100% to {bookingDetails.techName || 'your tech'}
                  </p>
                )}
              </div>

              <BnplMessaging amountDollars={grandTotal} variant="checkout" />

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  How do you want to pay?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPreferFinancing(true)}
                    className={`flex items-start gap-2 rounded-xl border px-3 py-3 text-left transition-all ${
                      preferFinancing
                        ? 'border-amber-500/50 bg-amber-500/10 text-amber-100'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <CalendarRange className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="text-xs">
                      <strong className="block text-sm mb-0.5">Pay in 4 / longer plans</strong>
                      Affirm, Afterpay, Zip, Sunbit, or Klarna when eligible
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreferFinancing(false)}
                    className={`flex items-start gap-2 rounded-xl border px-3 py-3 text-left transition-all ${
                      !preferFinancing
                        ? 'border-orange-500/50 bg-orange-500/10 text-orange-100'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="text-xs">
                      <strong className="block text-sm mb-0.5">Pay with card</strong>
                      Charge card now (financing still may appear if enabled)
                    </span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">{bnplLenderList()} via Stripe</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex justify-between items-center">
                <div>
                  <span className="text-xs text-slate-400 block mb-0.5">Total Due Today</span>
                  <span className="text-2xl font-heading font-black text-white tracking-tight">
                    ${grandTotal.toFixed(2)}
                  </span>
                </div>
                <div className="text-right text-[10px] text-slate-500 space-y-0.5">
                  <div>
                    Tech Payout:{' '}
                    <span className="text-emerald-400 font-mono">${techPayoutAmount.toFixed(2)}</span>
                  </div>
                  <div>
                    Platform Fee:{' '}
                    <span className="text-slate-400 font-mono">${platformFeeAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <PayPalCheckoutFlow
                baseAmount={baseAmount}
                tipAmount={tipAmount}
                grandTotal={grandTotal}
                bookingDetails={bookingDetails}
                onPaid={handlePaid}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
