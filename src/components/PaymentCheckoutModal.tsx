import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, CheckCircle2, Lock } from 'lucide-react';
import { StripeCheckoutSection } from './StripeCheckoutSection';

interface PaymentCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingDetails?: {
    id: string;
    customerName: string;
    customerEmail?: string;
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
    id: 'AP-8492',
    customerName: 'Mark Stevens',
    customerEmail: 'customer@example.com',
    vehicle: '2021 Ford F-150 SuperCrew',
    services: ['Front Ceramic Brake Pads & Rotors', 'Full Synthetic Oil Change'],
    totalAmount: 335,
    techName: 'Alex Vance (ASE Master Tech)',
    techStripeAccountId: null,
  },
  onPaymentSuccess,
}) => {
  const [tipPercentage, setTipPercentage] = useState<number>(15);
  const [isPaid, setIsPaid] = useState(false);
  const [paymentId, setPaymentId] = useState('');

  useEffect(() => {
    if (isOpen) {
      setIsPaid(false);
      setPaymentId('');
      setTipPercentage(15);
    }
  }, [isOpen, bookingDetails.id]);

  if (!isOpen) return null;

  const baseAmount = bookingDetails.totalAmount || 280;
  const tipAmount = Math.round((baseAmount * tipPercentage) / 100);
  const grandTotal = baseAmount + tipAmount;

  // 80/20 Payout calculation
  const techPayoutAmount = Math.round(baseAmount * 0.70) + tipAmount;
  const platformFeeAmount = Math.round(baseAmount * 0.30);

  const handlePaid = (piId: string) => {
    setPaymentId(piId);
    setIsPaid(true);
    onPaymentSuccess?.(piId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="bg-[#12141c] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#1a1d28] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-heading font-extrabold text-lg text-white">Adaptivity Official Escrow Checkout</h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold uppercase">
                  POWERED BY STRIPE CONNECT • 256-BIT SSL
                </span>
              </div>
              <p className="text-xs text-slate-400">Official Mobile Dispatch Payment • Order #{bookingDetails.id}</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Anti-Circumvention Warranty Protection Notice */}
        <div className="bg-gradient-to-r from-amber-950/60 via-orange-950/40 to-slate-900 border-b border-amber-500/30 px-6 py-3 flex items-start space-x-3 text-xs">
          <ShieldCheck className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <strong className="text-amber-300 font-bold block">12-Month / 12,000-Mile Warranty Protection Notice</strong>
            <span className="text-slate-300 text-[11px] leading-tight block">
              Your nationwide warranty & roadside assistance are valid <strong>ONLY when paid through this official platform checkout</strong>. Direct side payments to mechanics (Zelle, Cash, Venmo) void all warranty, insurance, and dispute coverage.
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          {isPaid ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-emerald-400 animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-heading font-black text-white">Payment Completed & Escrow Released!</h3>
              <p className="text-sm text-slate-300 max-w-md mx-auto">
                Thank you, <strong>{bookingDetails.customerName}</strong>! Your payment of <strong>${grandTotal}</strong> has been processed securely.
                {paymentId && (
                  <span className="block text-[11px] text-slate-500 mt-1 font-mono">Stripe PI: {paymentId}</span>
                )}
              </p>

              {/* Real-time 80/20 Payout Breakdown Card */}
              <div className="max-w-md mx-auto bg-slate-950 border border-white/10 rounded-2xl p-4 text-xs space-y-2 text-left">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="font-bold text-white uppercase tracking-wider text-[10px]">Platform Escrow Payout Breakdown</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded font-mono">STATUS: SETTLED</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Technician Auto-Payout (80% + 100% Tip):</span>
                  <span className="font-bold text-emerald-400 font-mono">${techPayoutAmount}.00 (Direct Deposited)</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Adaptivity Platform Support Fee (20%):</span>
                  <span className="font-mono">${platformFeeAmount}.00</span>
                </div>
                <div className="text-[10px] text-slate-500 pt-1">Tech: {bookingDetails.techName || 'Alex Vance'}</div>
              </div>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs"
                >
                  Close Checkout
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Order Summary Card */}
              <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-4 space-y-3 text-xs">
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <div>
                    <h4 className="font-bold text-white text-sm">{bookingDetails.vehicle}</h4>
                    <p className="text-slate-400 text-[11px]">Assigned Tech: <span className="text-amber-400">{bookingDetails.techName || 'Alex Vance'}</span></p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg">
                    #{bookingDetails.id}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold block text-[11px]">Services Performed:</span>
                  {bookingDetails.services.map((s, idx) => (
                    <div key={idx} className="flex justify-between text-slate-200">
                      <span>• {s}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tip Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">Add Technician Tip (100% goes directly to tech):</label>
                <div className="grid grid-cols-4 gap-2 text-xs font-bold">
                  {[10, 15, 20, 25].map(pct => (
                    <button
                      type="button"
                      key={pct}
                      onClick={() => setTipPercentage(pct)}
                      className={`py-2.5 rounded-xl border transition-all ${
                        tipPercentage === pct
                          ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {pct}% (${Math.round((baseAmount * pct) / 100)})
                    </button>
                  ))}
                </div>
              </div>

              <StripeCheckoutSection
                key={`${bookingDetails.id}-${tipAmount}`}
                baseAmount={baseAmount}
                tipAmount={tipAmount}
                grandTotal={grandTotal}
                techPayoutAmount={techPayoutAmount}
                platformFeeAmount={platformFeeAmount}
                bookingDetails={{
                  id: bookingDetails.id,
                  customerName: bookingDetails.customerName,
                  customerEmail: bookingDetails.customerEmail,
                  techStripeAccountId: bookingDetails.techStripeAccountId,
                }}
                onPaid={handlePaid}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
