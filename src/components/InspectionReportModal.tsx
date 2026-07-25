import React, { useState } from 'react';
import { X, AlertCircle, CheckCircle, Clock, Camera, FileCheck, Send, CheckSquare, Square, PenTool } from 'lucide-react';

interface InspectionItem {
  id: string;
  category: string;
  title: string;
  status: 'red' | 'yellow' | 'green';
  finding: string;
  recommendation: string;
  estimatedCost: number;
  photoLabel?: string;
  photoUrl?: string;
  isRequiredDefault: boolean;
}

const DVI_ITEMS: InspectionItem[] = [
  {
    id: 'dvi-1',
    category: 'Brake System',
    title: 'Front Ceramic Brake Pads & Rotors',
    status: 'red',
    finding: 'Front friction pad thickness measured at 2.1mm (Critical limit is 3.0mm). Driver rotor shows grooving.',
    recommendation: 'Replace front ceramic brake pads & precision machine/replace rotors.',
    estimatedCost: 240,
    photoLabel: 'Tech Photo: 2.1mm Pad Wear Gauge',
    isRequiredDefault: true,
  },
  {
    id: 'dvi-2',
    category: 'Electrical & Battery',
    title: '12V AGM Battery & Charging Test',
    status: 'yellow',
    finding: 'Battery resting voltage 12.2V (65% health capacity). Alternator output healthy at 14.2V.',
    recommendation: 'Monitor battery before winter or preventative swap to AGM 850CCA unit.',
    estimatedCost: 195,
    photoLabel: 'Midtronics Tester Printout (65% SOH)',
    isRequiredDefault: false,
  },
  {
    id: 'dvi-3',
    category: 'Fluids & Engine',
    title: 'Full Synthetic Engine Oil & Coolant Condition',
    status: 'green',
    finding: 'Oil level full, clean amber tint. Coolant freeze protection tested down to -25°F.',
    recommendation: 'No service required at this time.',
    estimatedCost: 0,
    isRequiredDefault: false,
  },
  {
    id: 'dvi-4',
    category: 'Suspension & Steering',
    title: 'Front Driver Strut & Shock Body',
    status: 'yellow',
    finding: 'Minor damp seepage observed along lower strut body. Zero clunking or bouncing detected.',
    recommendation: 'Re-inspect during next 5,000 mile oil service.',
    estimatedCost: 310,
    photoLabel: 'Tech Photo: Strut Seepage Wetness',
    isRequiredDefault: false,
  },
  {
    id: 'dvi-5',
    category: 'Tires & Tread',
    title: '4-Wheel Tread Depth & Air Pressure',
    status: 'green',
    finding: 'All 4 Michelin tires measured at 7/32" even wear across tread face. Pressure set to 35 PSI.',
    recommendation: 'Tires in excellent condition.',
    estimatedCost: 0,
    isRequiredDefault: false,
  }
];

interface InspectionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApproveAndBook: (approvedServices: string[], totalCost: number) => void;
}

export const InspectionReportModal: React.FC<InspectionReportModalProps> = ({
  isOpen,
  onClose,
  onApproveAndBook,
}) => {
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(
    DVI_ITEMS.filter(item => item.isRequiredDefault).map(item => item.id)
  );

  const [customerSignature, setCustomerSignature] = useState('Mark Stevens');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const toggleItemSelection = (id: string) => {
    setSelectedItemIds(prev =>
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const selectedItems = DVI_ITEMS.filter(item => selectedItemIds.includes(item.id));
  const totalApprovedCost = selectedItems.reduce((acc, curr) => acc + curr.estimatedCost, 0);

  const handleAuthorizeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => {
      onApproveAndBook(
        selectedItems.map(item => item.title),
        totalApprovedCost
      );
      setIsSubmitted(false);
      onClose();
    }, 1500);
  };

  const redCount = DVI_ITEMS.filter(i => i.status === 'red').length;
  const yellowCount = DVI_ITEMS.filter(i => i.status === 'yellow').length;
  const greenCount = DVI_ITEMS.filter(i => i.status === 'green').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="bg-[#12141c] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-6 py-4 bg-[#1a1d28] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-heading font-extrabold text-lg text-white">Digital Vehicle Inspection (DVI) Report</h2>
                <span className="text-[11px] font-mono bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded font-bold">
                  #DVI-8492
                </span>
              </div>
              <p className="text-xs text-slate-400">
                2021 Ford F-150 SuperCrew • Inspected by <strong className="text-amber-400">Alex Vance (ASE Master Tech)</strong>
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Health Score Summary Banner */}
        <div className="px-6 py-3 bg-[#0b0c10] border-b border-white/5 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold">
              <AlertCircle className="w-4 h-4" />
              <span>{redCount} Action Required</span>
            </div>
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold">
              <Clock className="w-4 h-4" />
              <span>{yellowCount} Monitor</span>
            </div>
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
              <CheckCircle className="w-4 h-4" />
              <span>{greenCount} Good Standing</span>
            </div>
          </div>

          <div className="text-slate-400 text-right">
            Mobile Unit Rig #2 • Justin, TX Service Location
          </div>
        </div>

        {/* Scrollable Report Content */}
        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          {isSubmitted ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-emerald-400 animate-bounce">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-heading font-black text-white">Inspection Authorization Approved!</h3>
              <p className="text-sm text-slate-300 max-w-md mx-auto">
                Electronic signature verified. Alex Vance has been notified to dispatch the mobile unit with parts for your approved services.
              </p>
            </div>
          ) : (
            <>
              {/* Inspection Items List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-extrabold text-sm text-white uppercase tracking-wider">
                    Detailed Inspection Breakdown & Findings
                  </h3>
                  <span className="text-xs text-slate-400">Select items to authorize repair</span>
                </div>

                <div className="space-y-3">
                  {DVI_ITEMS.map(item => {
                    const isSelected = selectedItemIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`p-5 rounded-2xl border transition-all ${
                          item.status === 'red'
                            ? 'bg-rose-950/20 border-rose-500/40'
                            : item.status === 'yellow'
                            ? 'bg-amber-950/15 border-amber-500/30'
                            : 'bg-emerald-950/10 border-emerald-500/20'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="flex items-start space-x-3.5">
                            {/* Checkbox for actionable items */}
                            {item.estimatedCost > 0 ? (
                              <button
                                type="button"
                                onClick={() => toggleItemSelection(item.id)}
                                className="mt-1 text-slate-400 hover:text-orange-400 focus:outline-none"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-5 h-5 text-orange-500" />
                                ) : (
                                  <Square className="w-5 h-5" />
                                )}
                              </button>
                            ) : (
                              <div className="mt-1">
                                <CheckCircle className="w-5 h-5 text-emerald-400" />
                              </div>
                            )}

                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                  {item.category}
                                </span>
                                <span>•</span>
                                <span className={`text-[10px] uppercase font-extrabold px-2 py-0.2 rounded ${
                                  item.status === 'red'
                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    : item.status === 'yellow'
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                }`}>
                                  {item.status === 'red' ? 'Critical Action' : item.status === 'yellow' ? 'Monitor' : 'Passed'}
                                </span>
                              </div>

                              <h4 className="font-bold text-base text-white">{item.title}</h4>
                              <p className="text-xs text-slate-200"><strong className="text-slate-300">Tech Finding:</strong> {item.finding}</p>
                              <p className="text-xs text-slate-400"><strong className="text-slate-300">Recommendation:</strong> {item.recommendation}</p>

                              {/* Photo Mockup Box */}
                              {item.photoLabel && (
                                <div className="mt-3 bg-slate-950/80 border border-white/10 p-2.5 rounded-xl flex items-center space-x-3 text-xs w-fit">
                                  <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400">
                                    <Camera className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <span className="font-semibold text-slate-200 block">{item.photoLabel}</span>
                                    <span className="text-[10px] text-slate-400">High-Res Image Captured by Tech Van Rig #2</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Pricing & Selection Status */}
                          {item.estimatedCost > 0 && (
                            <div className="text-right flex md:flex-col items-center md:items-end justify-between self-end md:self-start pt-2 md:pt-0 border-t md:border-t-0 border-white/10 w-full md:w-auto">
                              <span className="text-xs text-slate-400">Labor & Parts</span>
                              <span className="font-bold text-lg text-white font-mono">${item.estimatedCost}</span>
                              <button
                                type="button"
                                onClick={() => toggleItemSelection(item.id)}
                                className={`text-[11px] font-bold mt-1 px-2.5 py-1 rounded-lg transition-colors ${
                                  isSelected
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white'
                                }`}
                              >
                                {isSelected ? '✓ Approved' : '+ Add Service'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Electronic Approval & Signature Section */}
              <form onSubmit={handleAuthorizeSubmit} className="bg-gradient-to-r from-slate-900/90 via-slate-800/90 to-slate-900/90 border border-white/10 rounded-2xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div>
                    <h4 className="font-heading font-extrabold text-base text-white flex items-center gap-2">
                      <PenTool className="w-4 h-4 text-orange-400" />
                      Authorize Selected Repair Services
                    </h4>
                    <p className="text-xs text-slate-400">Includes 12-Month / 12,000-Mile Mobile Warranty on parts and labor.</p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Total Approved Estimate</span>
                    <span className="text-2xl font-black text-emerald-400 font-mono">${totalApprovedCost}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Customer Electronic Signature</label>
                    <input
                      type="text"
                      value={customerSignature}
                      onChange={e => setCustomerSignature(e.target.value)}
                      required
                      placeholder="Type Full Name to Sign"
                      className="w-full bg-slate-950/80 border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-serif italic text-base focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="flex flex-col justify-end">
                    <button
                      type="submit"
                      disabled={selectedItemIds.length === 0}
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                      <span>Approve ${totalApprovedCost} & Authorize Mobile Dispatch</span>
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
