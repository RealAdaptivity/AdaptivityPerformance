import React, { useState, useMemo } from 'react';
import {
  Wrench,
  Search,
  Plus,
  Trash2,
  Copy,
  Check,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Car,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import {
  ALLDATA_LABOR_OPERATIONS,
  calculateRepairOrder,
  type LaborOperation,
  type RepairCategory,
  type RepairOrderLineItem,
} from '../services/alldataLaborGuide';

const CATEGORIES: ('All' | RepairCategory)[] = [
  'All',
  'Brakes & Traction',
  'Electrical & Starting',
  'Engine & Valvetrain',
  'Heating & Air Conditioning',
  'Suspension & Steering',
  'Maintenance & Fluids',
  'Cooling & Belts',
  'Transmission & Drivetrain',
  'Fuel & Exhaust',
];

const POPULAR_YEARS = ['2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015', '2014', '2013', '2012', '2010', '2008', '2005'];
const POPULAR_MAKES = ['Ford', 'Chevrolet', 'Toyota', 'Honda', 'Ram / Dodge', 'GMC', 'Jeep', 'Nissan', 'BMW', 'Mercedes-Benz', 'Hyundai', 'Subaru'];

interface AllDataLaborGuideTabProps {
  onAttachQuoteToBooking?: (quoteSummary: string, totalAmount: number) => void;
}

export const AllDataLaborGuideTab: React.FC<AllDataLaborGuideTabProps> = ({ onAttachQuoteToBooking }) => {
  // Vehicle Filters
  const [selectedYear, setSelectedYear] = useState('2021');
  const [selectedMake, setSelectedMake] = useState('Ford');
  const [selectedModel, setSelectedModel] = useState('F-150');
  const [selectedEngine, setSelectedEngine] = useState('3.5L V6 EcoBoost Twin-Turbo');

  // Search & Category Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | RepairCategory>('All');
  const [laborRate, setLaborRate] = useState<number>(145);
  const [expandedOperationId, setExpandedOperationId] = useState<string | null>(null);

  // Repair Order (RO) State
  const [roItems, setRoItems] = useState<RepairOrderLineItem[]>([
    {
      id: 'ro-1',
      operationId: 'brk-front-pads-rotors',
      description: 'Front Brake Pads & Rotors Replacement (Ceramic + Vented Rotors)',
      hours: 1.8,
      laborRatePerHour: 145,
      parts: [
        { name: 'Front Ceramic Brake Pad Set', qty: 1, costPerUnit: 65 },
        { name: 'Front Vented Disc Rotors', qty: 2, costPerUnit: 110 },
      ],
      notes: 'Clean hub face, lubricate caliper slide pins, torque to 95 ft-lbs',
    },
  ]);

  const [copiedQuote, setCopiedQuote] = useState(false);

  // Filtered Operations
  const filteredOperations = useMemo(() => {
    return ALLDATA_LABOR_OPERATIONS.filter((op) => {
      const matchCategory = selectedCategory === 'All' || op.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        op.title.toLowerCase().includes(q) ||
        op.code.toLowerCase().includes(q) ||
        op.description.toLowerCase().includes(q) ||
        op.requiredTools.some((t) => t.toLowerCase().includes(q)) ||
        op.recommendedParts.some((p) => p.name.toLowerCase().includes(q));

      return matchCategory && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Calculated Totals
  const roTotals = useMemo(() => {
    return calculateRepairOrder(roItems, laborRate);
  }, [roItems, laborRate]);

  // Add Operation to RO
  const handleAddOperationToRO = (op: LaborOperation) => {
    const newItem: RepairOrderLineItem = {
      id: `ro-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      operationId: op.id,
      description: op.title,
      hours: op.bookHours,
      laborRatePerHour: laborRate,
      parts: op.recommendedParts.map((p) => ({
        name: p.name,
        qty: p.qty,
        costPerUnit: p.typicalCostDollars,
      })),
      notes: `Standard ALLDATA ${op.code} procedure.`,
    };
    setRoItems((prev) => [...prev, newItem]);
  };

  // Remove Line Item
  const handleRemoveROItem = (id: string) => {
    setRoItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Update Item Hours
  const handleUpdateItemHours = (id: string, hours: number) => {
    setRoItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, hours: Math.max(0.1, hours) } : item))
    );
  };

  // Generate Clean Customer Quote Text
  const handleCopyQuote = () => {
    const lines = [
      `=========================================`,
      `🔧 ADAPTIVITY PERFORMANCE - REPAIR ORDER QUOTE`,
      `Vehicle: ${selectedYear} ${selectedMake} ${selectedModel} (${selectedEngine})`,
      `Labor Rate: $${laborRate}/hr Mobile Dispatch`,
      `=========================================`,
      ``,
      ...roItems.map((item, idx) => {
        const itemLabor = item.hours * (item.laborRatePerHour || laborRate);
        const partsList = item.parts.map(p => `   • ${p.qty}x ${p.name} ($${p.costPerUnit * p.qty})`).join('\n');
        return `${idx + 1}. ${item.description}\n   Labor: ${item.hours} hrs @ $${item.laborRatePerHour || laborRate}/hr = $${itemLabor.toFixed(2)}\n${partsList}`;
      }),
      ``,
      `-----------------------------------------`,
      `Total Labor (${roTotals.totalHours} hrs): $${roTotals.laborSubtotal.toFixed(2)}`,
      `Total Parts: $${roTotals.partsSubtotal.toFixed(2)}`,
      `Shop Supplies & Hazmat: $${roTotals.shopSuppliesFee.toFixed(2)}`,
      `Texas Sales Tax (8.25%): $${roTotals.taxAmount.toFixed(2)}`,
      `-----------------------------------------`,
      `🏆 ESTIMATED TOTAL: $${roTotals.grandTotal.toFixed(2)}`,
      `Warranty: 12-Month / 12,000-Mile Nationwide Parts & Labor`,
      `=========================================`,
    ];

    const quoteText = lines.join('\n');
    navigator.clipboard.writeText(quoteText);
    setCopiedQuote(true);
    setTimeout(() => setCopiedQuote(false), 2500);

    if (onAttachQuoteToBooking) {
      onAttachQuoteToBooking(quoteText, roTotals.grandTotal);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-[#141622] via-[#10121b] to-[#161928] p-5 sm:p-6 rounded-3xl border border-white/10 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center gap-1">
              <Zap className="w-3 h-3" /> ALLDATA / Mitchell1 Standard Guide
            </span>
            <span className="text-xs text-slate-400">Master Flat-Rate Labor Engine</span>
          </div>
          <h2 className="font-heading text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            Automotive Labor Matrix & Repair Order Builder
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            Lookup industry flat-rate book hours, step-by-step OEM procedures, torque specifications, and build comprehensive customer repair orders.
          </p>
        </div>

        {/* Hourly Rate Controls */}
        <div className="bg-[#0b0c10] border border-white/10 p-3 rounded-2xl flex items-center gap-3 shrink-0">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Mobile Labor Rate</span>
            <span className="text-lg font-black text-orange-400">${laborRate}<span className="text-xs text-slate-400 font-normal">/hr</span></span>
          </div>
          <div className="flex items-center gap-1">
            {[125, 145, 165, 185].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setLaborRate(rate)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  laborRate === rate
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                ${rate}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Vehicle Specification Filter Bar */}
      <div className="bg-[#12141c] border border-white/10 p-4 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Model Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-orange-500 focus:outline-none"
          >
            {POPULAR_YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Make</label>
          <select
            value={selectedMake}
            onChange={(e) => setSelectedMake(e.target.value)}
            className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-orange-500 focus:outline-none"
          >
            {POPULAR_MAKES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Model</label>
          <input
            type="text"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            placeholder="e.g. F-150, Silverado, Civic"
            className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-orange-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Engine / Trim</label>
          <input
            type="text"
            value={selectedEngine}
            onChange={(e) => setSelectedEngine(e.target.value)}
            placeholder="e.g. 3.5L V6, 5.0L V8, 2.0T"
            className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-orange-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Main Content Layout: Operations Explorer (Left 7 Cols) + Repair Order Builder (Right 5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT: ALLDATA Operation Catalog */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Search & Category Tabs */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search operations by keyword, DTC code (e.g. P0300, brakes, struts, water pump)..."
                className="w-full bg-[#12141c] border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none shadow-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-slate-400 hover:text-white absolute right-3.5 top-1/2 -translate-y-1/2"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-[#12141c] text-slate-400 hover:text-white border border-white/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Operation Cards */}
          <div className="space-y-3">
            {filteredOperations.map((op) => {
              const isExpanded = expandedOperationId === op.id;
              const laborCharge = (op.bookHours * laborRate).toFixed(2);
              const partsTotal = op.recommendedParts.reduce((acc, p) => acc + p.typicalCostDollars * p.qty, 0);

              return (
                <div
                  key={op.id}
                  className="bg-[#12141c] border border-white/10 hover:border-orange-500/30 rounded-2xl p-4 transition-all shadow-md space-y-3"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-mono font-bold text-orange-400">
                          {op.code}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          {op.category}
                        </span>
                        {op.drivewayCapable ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                            🏡 Driveway OK
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold">
                            🏢 Shop Lift Preferred
                          </span>
                        )}
                      </div>
                      <h3 className="font-heading font-extrabold text-base text-white">
                        {op.title}
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {op.description}
                      </p>
                    </div>

                    {/* Quick Add Button */}
                    <button
                      type="button"
                      onClick={() => handleAddOperationToRO(op)}
                      className="px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-md shadow-orange-500/20 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add to RO</span>
                    </button>
                  </div>

                  {/* Metrics Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5 text-xs">
                    <div className="bg-[#0b0c10] p-2 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-500 block">Flat Rate Book</span>
                      <span className="font-extrabold text-white">{op.bookHours} hrs</span>
                    </div>
                    <div className="bg-[#0b0c10] p-2 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-500 block">Labor Cost (@ ${laborRate}/hr)</span>
                      <span className="font-extrabold text-orange-400">${laborCharge}</span>
                    </div>
                    <div className="bg-[#0b0c10] p-2 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-500 block">Est. Parts ({op.recommendedParts.length})</span>
                      <span className="font-extrabold text-slate-200">~${partsTotal}</span>
                    </div>
                    <div className="bg-[#0b0c10] p-2 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-500 block">Difficulty Level</span>
                      <span className="font-extrabold text-amber-400">{'★'.repeat(op.difficulty)}{'☆'.repeat(5 - op.difficulty)}</span>
                    </div>
                  </div>

                  {/* Toggle Technical Procedure Drawer */}
                  <button
                    type="button"
                    onClick={() => setExpandedOperationId(isExpanded ? null : op.id)}
                    className="w-full text-[11px] font-bold text-slate-400 hover:text-orange-400 flex items-center justify-center gap-1 pt-1 transition-colors"
                  >
                    <span>{isExpanded ? 'Hide ALLDATA Procedure & Specs' : 'View Torque Specs & OEM Steps'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {/* Expanded Technical Details Drawer */}
                  {isExpanded && (
                    <div className="bg-[#0b0c10] p-4 rounded-2xl border border-orange-500/20 space-y-3.5 text-xs text-slate-300 animate-fadeIn">
                      
                      {/* Torque Specs */}
                      <div>
                        <span className="font-bold text-orange-400 uppercase tracking-wider text-[10px] block mb-1.5 flex items-center gap-1">
                          <Wrench className="w-3 h-3" /> Critical Torque Specifications
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {op.torqueSpecs.map((t, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white/5 px-2.5 py-1.5 rounded-lg text-[11px]">
                              <span className="text-slate-400">{t.component}:</span>
                              <span className="font-mono font-bold text-amber-300">{t.spec}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Required Tools */}
                      <div>
                        <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px] block mb-1">
                          Required Specialized Tools:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {op.requiredTools.map((tool, idx) => (
                            <span key={idx} className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] text-slate-300">
                              🔧 {tool}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* OEM Step-by-Step Procedure */}
                      <div>
                        <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px] block mb-1.5">
                          OEM Procedure Checklist:
                        </span>
                        <ol className="space-y-1 pl-4 list-decimal text-slate-400 text-[11px]">
                          {op.procedureSteps.map((step, idx) => (
                            <li key={idx} className="leading-relaxed">{step}</li>
                          ))}
                        </ol>
                      </div>

                      {/* Master Tech Pro Tips */}
                      {op.diagnosticTips.length > 0 && (
                        <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl text-amber-200 text-[11px] space-y-1">
                          <span className="font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Pro Diagnostic Tip:
                          </span>
                          {op.diagnosticTips.map((tip, idx) => (
                            <p key={idx} className="leading-relaxed">{tip}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredOperations.length === 0 && (
              <div className="text-center py-12 bg-[#12141c] rounded-2xl border border-white/10 space-y-2">
                <Wrench className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm text-slate-400 font-medium">No operations matched your search filter.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className="text-xs text-orange-400 underline font-bold"
                >
                  Reset filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Live Repair Order (RO) & Customer Quote Builder */}
        <div className="lg:col-span-5 sticky top-6 space-y-4">
          <div className="bg-[#12141c] border border-orange-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
            
            {/* RO Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Live Repair Order (RO)
                </span>
                <h3 className="font-heading font-black text-lg text-white">
                  Estimate & Payout Builder
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-orange-500/20 text-orange-300 border border-orange-500/40">
                {roItems.length} {roItems.length === 1 ? 'Job' : 'Jobs'}
              </span>
            </div>

            {/* Vehicle Header in RO */}
            <div className="bg-[#0b0c10] p-3 rounded-2xl border border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-orange-400 shrink-0" />
                <span className="font-bold text-white">
                  {selectedYear} {selectedMake} {selectedModel}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{selectedEngine}</span>
            </div>

            {/* RO Line Items List */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {roItems.map((item, idx) => {
                const itemLabor = item.hours * (item.laborRatePerHour || laborRate);

                return (
                  <div
                    key={item.id}
                    className="bg-[#0b0c10] border border-white/10 p-3.5 rounded-2xl space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span className="text-orange-400">#{idx + 1}</span>
                        <span>{item.description}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveROItem(item.id)}
                        className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                        title="Remove job from estimate"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Hours adjuster */}
                    <div className="flex items-center justify-between bg-white/5 px-2.5 py-1.5 rounded-xl text-[11px]">
                      <span className="text-slate-400">Flat Rate Hours:</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={item.hours}
                          onChange={(e) => handleUpdateItemHours(item.id, parseFloat(e.target.value) || 0.1)}
                          className="w-14 bg-[#12141c] border border-white/15 rounded px-1.5 py-0.5 text-center font-bold text-white focus:outline-none focus:border-orange-500"
                        />
                        <span className="text-slate-400">hrs =</span>
                        <span className="font-extrabold text-orange-400">${itemLabor.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Parts List */}
                    {item.parts.length > 0 && (
                      <div className="space-y-1 text-[11px] text-slate-400 pt-1">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">Itemized Parts:</span>
                        {item.parts.map((p, pIdx) => (
                          <div key={pIdx} className="flex items-center justify-between text-slate-300">
                            <span>• {p.qty}x {p.name}</span>
                            <span className="font-mono text-slate-400">${(p.costPerUnit * p.qty).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {roItems.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-xs italic">
                  No jobs added to RO yet. Click "+ Add to RO" on any operation on the left.
                </div>
              )}
            </div>

            {/* RO Calculation Summary Card */}
            {roItems.length > 0 && (
              <div className="bg-[#0b0c10] border border-white/10 p-4 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Total Labor ({roTotals.totalHours} Book Hrs @ ${laborRate}/hr):</span>
                  <span className="font-bold text-white">${roTotals.laborSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Total Parts & Materials:</span>
                  <span className="font-bold text-white">${roTotals.partsSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Shop Supplies & Environmental (5%):</span>
                  <span className="font-bold text-white">${roTotals.shopSuppliesFee.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Texas Sales Tax (8.25%):</span>
                  <span className="font-bold text-white">${roTotals.taxAmount.toFixed(2)}</span>
                </div>

                <div className="border-t border-white/15 pt-2 flex items-center justify-between">
                  <span className="font-heading font-black text-sm text-white">Grand Total Estimate:</span>
                  <span className="font-heading font-black text-xl text-orange-400">
                    ${roTotals.grandTotal.toFixed(2)}
                  </span>
                </div>

                {/* Tech Split Breakdown */}
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl text-[11px] flex items-center justify-between text-emerald-300 mt-2">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tech 70% Labor Share:</span>
                  </div>
                  <span className="font-bold font-mono text-emerald-400">
                    ${roTotals.techPayoutLabor.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Actions: Copy Formatted Quote */}
            {roItems.length > 0 && (
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyQuote}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-orange-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {copiedQuote ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedQuote ? 'Copied Quote to Clipboard!' : 'Copy Formatted Customer Quote'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRoItems([])}
                  className="w-full text-[11px] text-slate-500 hover:text-rose-400 transition-colors text-center py-1"
                >
                  Clear Repair Order
                </button>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};
