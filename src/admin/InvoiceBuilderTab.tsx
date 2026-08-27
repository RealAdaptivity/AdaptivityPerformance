import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Download,
  Send,
  Copy,
  Check,
  CreditCard,
  User,
  Wrench,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { openPrintableHtmlWindow } from '../services/openPrintableHtml';
import { SITE_PHONE_DISPLAY, SITE_ORIGIN } from '../site/seo';
import { fetchAdminBookings } from '../services/adminApi';
import type { Booking } from '../context/BookingContext';
import { ALLDATA_LABOR_OPERATIONS } from '../services/alldataLaborGuide';
import {
  downloadInvoicePdfDirect,
  shareInvoicePdfDirect,
  type InvoicePdfData,
} from '../services/invoicePdfGenerator';

export interface InvoiceItem {
  id: string;
  type: 'Labor' | 'Part' | 'Diagnostic' | 'Fee' | 'Discount';
  description: string;
  qtyOrHours: number;
  rate: number;
  isTaxable: boolean;
}

export interface InvoiceRecord {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  status: 'PAID' | 'DUE' | 'DRAFT' | 'PARTIAL';
  paymentMethod: 'Credit/Debit Card (Stripe)' | 'BNPL (Affirm/Klarna/Afterpay)' | 'Zelle / Bank Transfer' | 'Cash';
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  serviceAddress: string;
  vehicleYearMakeModel: string;
  vehicleVin: string;
  vehicleMileage: string;
  vehiclePlate: string;
  technicianName: string;
  bookingRef: string;
  items: InvoiceItem[];
  waiveDiagnosticFee: boolean;
  shopSuppliesPct: number;
  taxPct: number;
  techNotes: string;
}

const DEFAULT_INVOICE_ITEMS: InvoiceItem[] = [
  {
    id: 'item-1',
    type: 'Labor',
    description: 'Front Brake Pads & Rotors Replacement (ALLDATA Flat Rate BRK-01)',
    qtyOrHours: 1.8,
    rate: 145,
    isTaxable: false,
  },
  {
    id: 'item-2',
    type: 'Part',
    description: 'Premium Ceramic Brake Pad Set (Front)',
    qtyOrHours: 1,
    rate: 65,
    isTaxable: true,
  },
  {
    id: 'item-3',
    type: 'Part',
    description: 'Vented Disc Brake Rotors (Pair)',
    qtyOrHours: 2,
    rate: 55,
    isTaxable: true,
  },
];

export const InvoiceBuilderTab: React.FC = () => {
  // Booking import list
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [selectedBookingRef, setSelectedBookingRef] = useState<string>('');

  // Invoice Fields
  const [invoiceNumber, setInvoiceNumber] = useState<string>(
    () => `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [invoiceDate, setInvoiceDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<'PAID' | 'DUE' | 'DRAFT' | 'PARTIAL'>('PAID');
  const [paymentMethod, setPaymentMethod] = useState<InvoiceRecord['paymentMethod']>(
    'Credit/Debit Card (Stripe)'
  );

  // Customer & Vehicle Fields
  const [customerName, setCustomerName] = useState('John Doe');
  const [customerPhone, setCustomerPhone] = useState('(214) 555-0199');
  const [customerEmail, setCustomerEmail] = useState('customer@example.com');
  const [serviceAddress, setServiceAddress] = useState('1234 Canyon Falls Dr, Northlake, TX 76226');
  const [vehicleYearMakeModel, setVehicleYearMakeModel] = useState('2021 Ford F-150 XLT 3.5L V6');
  const [vehicleVin, setVehicleVin] = useState('1FTFW1E84MFA12345');
  const [vehicleMileage, setVehicleMileage] = useState('48,250 mi');
  const [vehiclePlate, setVehiclePlate] = useState('TX-ABC1234');
  const [technicianName, setTechnicianName] = useState('Master Tech Marcus (ASE Certified)');
  const [bookingRef, setBookingRef] = useState('AP-8492');

  // Items & Options
  const [items, setItems] = useState<InvoiceItem[]>(DEFAULT_INVOICE_ITEMS);
  const [waiveDiagnosticFee, setWaiveDiagnosticFee] = useState(true);
  const [shopSuppliesPct, setShopSuppliesPct] = useState(5);
  const [taxPct, setTaxPct] = useState(8.25);
  const [techNotes, setTechNotes] = useState(
    'Torqued caliper bracket bolts to 95 ft-lbs. Slide pins lubricated with synthetic silicone grease. Road tested; zero noise or pulsation.'
  );

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [sentPdf, setSentPdf] = useState(false);

  // Load recent bookings for 1-click import
  useEffect(() => {
    void (async () => {
      try {
        const bookings = await fetchAdminBookings();
        setRecentBookings(bookings.slice(0, 30));
      } catch {
        // ignore
      }
    })();
  }, []);

  // 1-Click Import from Dispatch Booking
  const handleImportBooking = (bookingId: string) => {
    setSelectedBookingRef(bookingId);
    const b = recentBookings.find((x) => x.id === bookingId);
    if (!b) return;

    setBookingRef(b.id || '');
    setCustomerName(b.customerName || '');
    setCustomerPhone(b.customerPhone || '');
    setServiceAddress(b.customerAddress || '');
    setVehicleYearMakeModel(b.vehicle || '');
    if (b.vin) setVehicleVin(b.vin);
    if (b.status === 'COMPLETED') setStatus('PAID');
    if (b.claimedBy?.name) setTechnicianName(b.claimedBy.name);
  };

  // Calculations
  const calculations = useMemo(() => {
    let laborSubtotal = 0;
    let partsSubtotal = 0;
    let otherSubtotal = 0;
    let taxableAmount = 0;

    for (const it of items) {
      const lineTotal = it.qtyOrHours * it.rate;
      if (it.type === 'Labor') {
        laborSubtotal += lineTotal;
      } else if (it.type === 'Part') {
        partsSubtotal += lineTotal;
      } else {
        otherSubtotal += lineTotal;
      }

      if (it.isTaxable) {
        taxableAmount += lineTotal;
      }
    }

    const diagCredit = waiveDiagnosticFee ? 0 : 85;
    const rawSupplies = (laborSubtotal + partsSubtotal) * (shopSuppliesPct / 100);
    const shopSupplies = Math.min(rawSupplies, 45); // Capped at $45
    const taxableTotal = taxableAmount + shopSupplies;
    const taxAmount = taxableTotal * (taxPct / 100);
    const grandTotal = laborSubtotal + partsSubtotal + otherSubtotal + diagCredit + shopSupplies + taxAmount;
    const techShare = laborSubtotal * 0.7; // 70% tech split
    const platformShare = laborSubtotal * 0.3;

    return {
      laborSubtotal,
      partsSubtotal,
      otherSubtotal,
      diagCredit,
      shopSupplies,
      taxAmount,
      grandTotal,
      techShare,
      platformShare,
    };
  }, [items, waiveDiagnosticFee, shopSuppliesPct, taxPct]);

  // Add Item
  const handleAddItem = (type: InvoiceItem['type']) => {
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}`,
      type,
      description: type === 'Labor' ? 'Labor Operation / Repair Service' : 'Replacement Part / Material',
      qtyOrHours: type === 'Labor' ? 1.0 : 1,
      rate: type === 'Labor' ? 145 : 45,
      isTaxable: type === 'Part',
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Add from ALLDATA
  const handleAddAlldataOperation = (opId: string) => {
    const op = ALLDATA_LABOR_OPERATIONS.find((x) => x.id === opId);
    if (!op) return;

    const newLaborItem: InvoiceItem = {
      id: `item-alldata-labor-${Date.now()}`,
      type: 'Labor',
      description: `${op.title} (${op.code})`,
      qtyOrHours: op.bookHours,
      rate: 145,
      isTaxable: false,
    };

    const newPartsItems: InvoiceItem[] = op.recommendedParts.map((p, idx) => ({
      id: `item-alldata-part-${Date.now()}-${idx}`,
      type: 'Part',
      description: p.name,
      qtyOrHours: p.qty,
      rate: p.typicalCostDollars,
      isTaxable: true,
    }));

    setItems((prev) => [...prev, newLaborItem, ...newPartsItems]);
  };

  // Remove Item
  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Update Item
  const handleUpdateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  // Copy Clean Customer Summary
  const handleCopySummary = () => {
    const lines = [
      `=========================================`,
      `📄 ADAPTIVITY PERFORMANCE - OFFICIAL INVOICE`,
      `Invoice #: ${invoiceNumber} | Date: ${invoiceDate}`,
      `Status: ${status} (${paymentMethod})`,
      `Booking Ref: #${bookingRef}`,
      `-----------------------------------------`,
      `Customer: ${customerName}`,
      `Phone: ${customerPhone} | Email: ${customerEmail}`,
      `Service Address: ${serviceAddress}`,
      `Vehicle: ${vehicleYearMakeModel}`,
      `VIN: ${vehicleVin || 'N/A'} | Mileage: ${vehicleMileage || 'N/A'}`,
      `Technician: ${technicianName}`,
      `=========================================`,
      `ITEMIZED SERVICES & PARTS:`,
      ...items.map((it, idx) => {
        const total = it.qtyOrHours * it.rate;
        return `${idx + 1}. [${it.type.toUpperCase()}] ${it.description}\n   ${it.qtyOrHours} ${it.type === 'Labor' ? 'hrs' : 'qty'} @ $${it.rate.toFixed(2)} = $${total.toFixed(2)}`;
      }),
      ``,
      `-----------------------------------------`,
      `Labor Subtotal: $${calculations.laborSubtotal.toFixed(2)}`,
      `Parts Subtotal: $${calculations.partsSubtotal.toFixed(2)}`,
      `Diagnostic Fee: ${waiveDiagnosticFee ? 'WAIVED ($0.00 with repair)' : '$85.00'}`,
      `Shop Supplies / Hazmat (5%): $${calculations.shopSupplies.toFixed(2)}`,
      `Texas Sales Tax (8.25%): $${calculations.taxAmount.toFixed(2)}`,
      `-----------------------------------------`,
      `🏆 TOTAL PAID / DUE: $${calculations.grandTotal.toFixed(2)}`,
      `-----------------------------------------`,
      `Warranty: 12-Month / 12,000-Mile Nationwide Parts & Labor Warranty`,
      `Texas Mechanics' Lien notice pursuant to TX Property Code § 70.001.`,
      `=========================================`,
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  // Copy Customer Pay Link
  const handleCopyPayLink = () => {
    const link = `${SITE_ORIGIN}/pay/${bookingRef || invoiceNumber}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Build PDF Data payload
  const getInvoicePdfData = (): InvoicePdfData => ({
    invoiceNumber,
    invoiceDate,
    dueDate,
    status,
    paymentMethod,
    customerName,
    customerPhone,
    customerEmail,
    serviceAddress,
    vehicleYearMakeModel,
    vehicleVin,
    vehicleMileage,
    vehiclePlate,
    technicianName,
    bookingRef,
    items,
    waiveDiagnosticFee,
    shopSuppliesFee: calculations.shopSupplies,
    taxAmount: calculations.taxAmount,
    laborSubtotal: calculations.laborSubtotal,
    partsSubtotal: calculations.partsSubtotal,
    grandTotal: calculations.grandTotal,
    techNotes,
  });

  // Direct Vector PDF File Download (Mobile & Desktop)
  const handleDownloadPdf = async () => {
    try {
      await downloadInvoicePdfDirect(getInvoicePdfData());
    } catch {
      // Fallback to printable window if popup or save fails
      handlePrintInvoice();
    }
  };

  // Send PDF via Native Share Sheet (AirDrop / Save to Files / Mail / Messages)
  const handleSendPdf = async () => {
    try {
      await shareInvoicePdfDirect(getInvoicePdfData());
    } catch {
      // Fallback
    }
    setSentPdf(true);
    setTimeout(() => setSentPdf(false), 2500);
  };

  // Print & Fallback HTML Invoice
  const handlePrintInvoice = () => {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Invoice ${invoiceNumber} - Adaptivity Performance</title>
  <style>
    @page { size: letter; margin: 18mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1a1a1a;
      line-height: 1.45;
      font-size: 13px;
      margin: 0;
      padding: 0;
    }
    .invoice-container { max-width: 800px; margin: 0 auto; }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .logo-title { font-size: 22px; font-weight: 900; color: #ea580c; text-transform: uppercase; letter-spacing: -0.5px; }
    .logo-sub { font-size: 11px; color: #666; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
    .inv-title { font-size: 26px; font-weight: 900; color: #111; text-align: right; text-transform: uppercase; }
    .inv-badge { display: inline-block; padding: 4px 12px; font-size: 11px; font-weight: 800; text-transform: uppercase; border-radius: 4px; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; margin-top: 4px; }
    .grid-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
    .grid-table td { padding: 10px 14px; vertical-align: top; width: 50%; font-size: 12px; }
    .section-label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #ea580c; margin-bottom: 4px; letter-spacing: 0.5px; }
    .item-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .item-table th { background: #0f172a; color: #fff; text-align: left; padding: 9px 12px; font-size: 11px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; }
    .item-table td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    .item-table tr:nth-child(even) { background: #f8fafc; }
    .totals-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .totals-table td { padding: 6px 12px; text-align: right; font-size: 12px; }
    .grand-total-row { font-size: 18px; font-weight: 900; color: #ea580c; border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; }
    .warranty-box { border: 2px solid #ea580c; background: #fff7ed; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px; font-size: 11px; }
    .legal-notice { font-size: 10px; color: #64748b; line-height: 1.4; border-top: 1px solid #cbd5e1; padding-top: 12px; }
    .sig-table { width: 100%; margin-top: 24px; border-collapse: collapse; }
    .sig-table td { width: 50%; padding: 10px; vertical-align: bottom; }
    .sig-line { border-bottom: 1px solid #000; height: 35px; margin-bottom: 4px; }
  </style>
</head>
<body>
  <div class="invoice-container">
    <table class="header-table">
      <tr>
        <td>
          <div class="logo-title">ADAPTIVITY PERFORMANCE</div>
          <div class="logo-sub">Mobile &amp; Shop Auto Repair Specialist</div>
          <div style="font-size:11px; color:#475569; margin-top:4px;">
            Justin &amp; Northlake, TX • DFW Mobile Dispatch<br>
            Phone: ${SITE_PHONE_DISPLAY} • service@adaptivityperformance.com<br>
            adaptivityperformance.com
          </div>
        </td>
        <td style="text-align: right;">
          <div class="inv-title">INVOICE</div>
          <div style="font-weight: 800; font-size: 14px; color: #334155;"># ${invoiceNumber}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Date: ${invoiceDate}</div>
          <div class="inv-badge">${status} — ${paymentMethod}</div>
        </td>
      </tr>
    </table>

    <table class="grid-table">
      <tr>
        <td>
          <div class="section-label">Bill To / Customer Information</div>
          <strong>${escapeHtml(customerName)}</strong><br>
          Phone: ${escapeHtml(customerPhone)}<br>
          Email: ${escapeHtml(customerEmail)}<br>
          Service Location: ${escapeHtml(serviceAddress)}<br>
          Booking Ref: <strong>#${escapeHtml(bookingRef)}</strong>
        </td>
        <td>
          <div class="section-label">Vehicle &amp; Service Details</div>
          Vehicle: <strong>${escapeHtml(vehicleYearMakeModel)}</strong><br>
          VIN: <strong style="font-family:monospace;">${escapeHtml(vehicleVin || 'N/A')}</strong><br>
          Odometer: ${escapeHtml(vehicleMileage || 'N/A')} • License: ${escapeHtml(vehiclePlate || 'N/A')}<br>
          Assigned Tech: <strong>${escapeHtml(technicianName)}</strong>
        </td>
      </tr>
    </table>

    <table class="item-table">
      <thead>
        <tr>
          <th style="width: 12%;">Type</th>
          <th style="width: 53%;">Service / Parts Description</th>
          <th style="width: 12%; text-align: center;">Qty / Hrs</th>
          <th style="width: 11%; text-align: right;">Rate</th>
          <th style="width: 12%; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map((it) => {
            const rowTotal = it.qtyOrHours * it.rate;
            return `
            <tr>
              <td><span style="font-weight:800; font-size:10px; color:#ea580c; text-transform:uppercase;">${it.type}</span></td>
              <td><strong>${escapeHtml(it.description)}</strong></td>
              <td style="text-align: center;">${it.qtyOrHours} ${it.type === 'Labor' ? 'hrs' : ''}</td>
              <td style="text-align: right;">$${it.rate.toFixed(2)}</td>
              <td style="text-align: right; font-weight:700;">$${rowTotal.toFixed(2)}</td>
            </tr>`;
          })
          .join('')}
      </tbody>
    </table>

    <table class="totals-table">
      <tr>
        <td style="width: 70%;"><strong>Labor Subtotal:</strong></td>
        <td style="width: 30%;">$${calculations.laborSubtotal.toFixed(2)}</td>
      </tr>
      <tr>
        <td><strong>Parts &amp; Materials Subtotal:</strong></td>
        <td>$${calculations.partsSubtotal.toFixed(2)}</td>
      </tr>
      <tr>
        <td><strong>Diagnostic Visit Fee:</strong></td>
        <td>${waiveDiagnosticFee ? '<span style="color:#059669; font-weight:bold;">WAIVED ($0.00 with repair)</span>' : '$85.00'}</td>
      </tr>
      <tr>
        <td>Shop Supplies &amp; Environmental Hazmat (5%):</td>
        <td>$${calculations.shopSupplies.toFixed(2)}</td>
      </tr>
      <tr>
        <td>Texas Sales Tax (8.25%):</td>
        <td>$${calculations.taxAmount.toFixed(2)}</td>
      </tr>
      <tr class="grand-total-row">
        <td>TOTAL AMOUNT:</td>
        <td>$${calculations.grandTotal.toFixed(2)}</td>
      </tr>
    </table>

    <div class="warranty-box">
      <strong>🛡️ 12-MONTH / 12,000-MILE NATIONWIDE WARRANTY</strong><br>
      All workmanship and Adaptivity Performance supplied parts are covered for 12 months or 12,000 miles, whichever comes first. Adaptivity Performance is not responsible for defects or failures in customer-provided parts.
    </div>

    ${
      techNotes
        ? `<div style="margin-bottom:18px; background:#f8fafc; border:1px solid #e2e8f0; padding:10px 14px; border-radius:6px; font-size:11px;">
            <strong>Technician Notes &amp; Findings:</strong><br>${escapeHtml(techNotes)}
          </div>`
        : ''
    }

    <div class="legal-notice">
      <strong>TEXAS STATUTORY MECHANIC'S LIEN NOTICE (TX Property Code § 70.001):</strong><br>
      I hereby authorize the above repair work to be completed along with the necessary materials. Adaptivity Performance employees may operate the vehicle for purpose of testing, inspection, or delivery. An express mechanic's lien is acknowledged on vehicle to secure the amount of repairs thereto.
    </div>

    <table class="sig-table">
      <tr>
        <td>
          <div class="sig-line"></div>
          <div style="font-size:10px; text-transform:uppercase; color:#64748b; font-weight:bold;">Customer Signature &amp; Authorization</div>
        </td>
        <td>
          <div class="sig-line"></div>
          <div style="font-size:10px; text-transform:uppercase; color:#64748b; font-weight:bold;">Certified Technician Signature</div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;

    openPrintableHtmlWindow(html);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#161826] via-[#12141f] to-[#1a1d2e] p-5 sm:p-6 rounded-3xl border border-white/10 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center gap-1">
              <FileText className="w-3 h-3" /> Official Invoice Generator
            </span>
            <span className="text-xs text-slate-400">PDF & Stripe Ready</span>
          </div>
          <h2 className="font-heading text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            Repair Order & Invoice Builder
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            Create professional itemized customer invoices, waiving diagnostic fees for approved repairs, calculating Texas sales tax, and generating printable PDF copies.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>

          <button
            type="button"
            onClick={handleSendPdf}
            className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-sky-600/20 transition-all"
          >
            {sentPdf ? <Check className="w-4 h-4 text-emerald-300" /> : <Send className="w-4 h-4" />}
            <span>{sentPdf ? 'PDF Sent!' : 'Send PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyPayLink}
            className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <CreditCard className="w-3.5 h-3.5 text-orange-400" />}
            <span>{copiedLink ? 'Link Copied!' : 'Pay Link'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopySummary}
            className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSummary ? 'Summary Copied!' : 'Copy Summary'}</span>
          </button>
        </div>
      </div>

      {/* 1-Click Import from Dispatch Booking */}
      <div className="bg-[#12141c] border border-white/10 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-300">⚡ Auto-Fill from Dispatch Booking:</span>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedBookingRef}
            onChange={(e) => handleImportBooking(e.target.value)}
            className="w-full sm:w-80 bg-[#0b0c10] border border-white/15 rounded-xl px-3 py-2 text-xs font-medium text-white focus:border-orange-500 focus:outline-none"
          >
            <option value="">-- Select Active Dispatch Booking --</option>
            {recentBookings.map((b) => (
              <option key={b.id} value={b.id}>
                #{b.id} — {b.customerName} ({b.vehicle || 'Vehicle'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Form Controls (Left 8) + Summary & Quick ALLDATA (Right 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT: Invoice Details Form */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Metadata Row */}
          <div className="bg-[#12141c] border border-white/10 p-5 rounded-3xl space-y-4">
            <h3 className="font-heading font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-1.5 text-orange-400">
              <Calendar className="w-4 h-4" /> 1. Invoice Header & Status
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Invoice Number</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3 py-2 text-white font-mono font-bold focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Payment Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3 py-2 text-white font-bold focus:border-orange-500 focus:outline-none"
                >
                  <option value="PAID">PAID (Completed)</option>
                  <option value="DUE">DUE (Unpaid)</option>
                  <option value="PARTIAL">PARTIAL</option>
                  <option value="DRAFT">DRAFT</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3 py-2 text-white font-medium focus:border-orange-500 focus:outline-none"
                >
                  <option value="Credit/Debit Card (Stripe)">Card (Stripe)</option>
                  <option value="BNPL (Affirm/Klarna/Afterpay)">BNPL (Affirm/Klarna)</option>
                  <option value="Zelle / Bank Transfer">Zelle / Transfer</option>
                  <option value="Cash">Cash on Site</option>
                </select>
              </div>
            </div>
          </div>

          {/* Customer & Vehicle Grid */}
          <div className="bg-[#12141c] border border-white/10 p-5 rounded-3xl space-y-4">
            <h3 className="font-heading font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-1.5 text-orange-400">
              <User className="w-4 h-4" /> 2. Customer & Vehicle Identification
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Customer Details</span>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3 py-2 text-white font-bold focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Phone</label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Email</label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Service Address</label>
                  <input
                    type="text"
                    value={serviceAddress}
                    onChange={(e) => setServiceAddress(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Vehicle Details</span>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Year / Make / Model / Engine</label>
                  <input
                    type="text"
                    value={vehicleYearMakeModel}
                    onChange={(e) => setVehicleYearMakeModel(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3 py-2 text-white font-bold focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">17-Character VIN</label>
                  <input
                    type="text"
                    value={vehicleVin}
                    onChange={(e) => setVehicleVin(e.target.value.toUpperCase())}
                    className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-3 py-2 text-white font-mono uppercase focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Plate</label>
                    <input
                      type="text"
                      value={vehiclePlate}
                      onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                      className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-2.5 py-2 text-white font-mono uppercase focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Odometer</label>
                    <input
                      type="text"
                      value={vehicleMileage}
                      onChange={(e) => setVehicleMileage(e.target.value)}
                      className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-2.5 py-2 text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Assigned Tech</label>
                    <input
                      type="text"
                      value={technicianName}
                      onChange={(e) => setTechnicianName(e.target.value)}
                      className="w-full bg-[#0b0c10] border border-white/10 rounded-xl px-2.5 py-2 text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="bg-[#12141c] border border-white/10 p-5 rounded-3xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-heading font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-1.5 text-orange-400">
                <Wrench className="w-4 h-4" /> 3. Itemized Labor, Parts & Services
              </h3>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddItem('Labor')}
                  className="px-2.5 py-1.5 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500 hover:text-white text-xs font-bold transition-all flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> + Labor Line
                </button>
                <button
                  type="button"
                  onClick={() => handleAddItem('Part')}
                  className="px-2.5 py-1.5 rounded-lg bg-sky-500/20 text-sky-400 hover:bg-sky-500 hover:text-white text-xs font-bold transition-all flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> + Part Line
                </button>
              </div>
            </div>

            {/* Table Header */}
            <div className="space-y-2">
              {items.map((it) => (
                <div
                  key={it.id}
                  className="bg-[#0b0c10] border border-white/10 p-3 rounded-2xl grid grid-cols-12 gap-2 items-center text-xs"
                >
                  {/* Type Selector */}
                  <div className="col-span-12 sm:col-span-2">
                    <select
                      value={it.type}
                      onChange={(e) => handleUpdateItem(it.id, 'type', e.target.value)}
                      className="w-full bg-[#12141c] border border-white/10 rounded-lg px-2 py-1.5 text-[11px] font-bold text-orange-400 focus:outline-none"
                    >
                      <option value="Labor">Labor</option>
                      <option value="Part">Part</option>
                      <option value="Diagnostic">Diag Fee</option>
                      <option value="Fee">Fee</option>
                      <option value="Discount">Discount</option>
                    </select>
                  </div>

                  {/* Description */}
                  <div className="col-span-12 sm:col-span-5">
                    <input
                      type="text"
                      value={it.description}
                      onChange={(e) => handleUpdateItem(it.id, 'description', e.target.value)}
                      placeholder="Service or part description..."
                      className="w-full bg-[#12141c] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  {/* Qty / Hours */}
                  <div className="col-span-4 sm:col-span-2">
                    <div className="flex items-center gap-1 bg-[#12141c] px-2 py-1.5 rounded-lg border border-white/10">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={it.qtyOrHours}
                        onChange={(e) => handleUpdateItem(it.id, 'qtyOrHours', parseFloat(e.target.value) || 0)}
                        className="w-full bg-transparent text-center font-bold text-white focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-500">{it.type === 'Labor' ? 'hrs' : 'qty'}</span>
                    </div>
                  </div>

                  {/* Unit Rate */}
                  <div className="col-span-4 sm:col-span-2">
                    <div className="flex items-center gap-1 bg-[#12141c] px-2 py-1.5 rounded-lg border border-white/10">
                      <span className="text-[10px] text-slate-500">$</span>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={it.rate}
                        onChange={(e) => handleUpdateItem(it.id, 'rate', parseFloat(e.target.value) || 0)}
                        className="w-full bg-transparent text-right font-bold text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Line Total & Remove */}
                  <div className="col-span-4 sm:col-span-1 flex items-center justify-between">
                    <span className="font-extrabold text-orange-400 text-xs">
                      ${(it.qtyOrHours * it.rate).toFixed(0)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(it.id)}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Diagnostic Fee Waiver Checkbox */}
            <div className="bg-[#0b0c10] border border-orange-500/30 p-3.5 rounded-2xl flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={waiveDiagnosticFee}
                  onChange={(e) => setWaiveDiagnosticFee(e.target.checked)}
                  className="w-4 h-4 rounded text-orange-500 focus:ring-0 bg-[#12141c] border-white/20"
                />
                <div>
                  <span className="font-bold text-white block">
                    Waive $85.00 Diagnostic Visit Fee (Customer Approved Same-Day Repair)
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    Diagnostic fee is 100% credited toward final approved labor & parts.
                  </span>
                </div>
              </label>
              <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                waiveDiagnosticFee ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {waiveDiagnosticFee ? '-$85.00 WAIVED' : '+$85.00 CHARGED'}
              </span>
            </div>

            {/* Notes */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Technician Findings & Notes for Invoice
              </label>
              <textarea
                rows={2}
                value={techNotes}
                onChange={(e) => setTechNotes(e.target.value)}
                placeholder="Enter technician torque specs, parts brands, and post-repair test findings..."
                className="w-full bg-[#0b0c10] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>

        </div>

        {/* RIGHT: Quick ALLDATA Import & Invoice Total Summary */}
        <div className="lg:col-span-4 space-y-5 sticky top-6">
          
          {/* Quick ALLDATA Operation Inserter */}
          <div className="bg-[#12141c] border border-white/10 p-4 rounded-3xl space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Quick ALLDATA Operation Add
            </span>
            <p className="text-[11px] text-slate-400 leading-tight">
              Select standard flat-rate repair procedures to insert instant labor + parts into this invoice:
            </p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {ALLDATA_LABOR_OPERATIONS.map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => handleAddAlldataOperation(op.id)}
                  className="w-full text-left p-2 rounded-xl bg-[#0b0c10] hover:bg-white/5 border border-white/5 flex items-center justify-between text-xs transition-colors group"
                >
                  <span className="truncate pr-2 text-slate-300 group-hover:text-white font-medium">
                    {op.title}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-orange-400 shrink-0">
                    +{op.bookHours}h
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Invoice Totals Card */}
          <div className="bg-[#12141c] border border-orange-500/30 rounded-3xl p-5 shadow-2xl space-y-3 text-xs">
            <h4 className="font-heading font-black text-sm text-white uppercase tracking-wider border-b border-white/10 pb-2">
              Invoice Summary &amp; Taxes
            </h4>

            <div className="space-y-2 text-slate-400">
              <div className="flex items-center justify-between">
                <span>Labor Subtotal:</span>
                <span className="font-bold text-white">${calculations.laborSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Parts Subtotal:</span>
                <span className="font-bold text-white">${calculations.partsSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Diagnostic Fee:</span>
                <span className={waiveDiagnosticFee ? 'text-emerald-400 font-bold' : 'text-white font-bold'}>
                  {waiveDiagnosticFee ? '$0.00 (Waived)' : '$85.00'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span>Shop Supplies (</span>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={shopSuppliesPct}
                    onChange={(e) => setShopSuppliesPct(parseFloat(e.target.value) || 0)}
                    className="w-10 bg-[#0b0c10] border border-white/10 rounded px-1 text-center font-bold text-white focus:outline-none"
                  />
                  <span>%):</span>
                </div>
                <span className="font-bold text-white">${calculations.shopSupplies.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span>Sales Tax (</span>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.25"
                    value={taxPct}
                    onChange={(e) => setTaxPct(parseFloat(e.target.value) || 0)}
                    className="w-12 bg-[#0b0c10] border border-white/10 rounded px-1 text-center font-bold text-white focus:outline-none"
                  />
                  <span>%):</span>
                </div>
                <span className="font-bold text-white">${calculations.taxAmount.toFixed(2)}</span>
              </div>

              <div className="border-t border-white/15 pt-2.5 flex items-center justify-between">
                <span className="font-heading font-black text-sm text-white">Invoice Total:</span>
                <span className="font-heading font-black text-2xl text-orange-400">
                  ${calculations.grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Tech Payout Breakdown */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl text-[11px] space-y-1 text-emerald-300">
              <div className="flex items-center justify-between font-bold">
                <span>Tech 70% Labor Share:</span>
                <span className="font-mono text-emerald-400 font-black text-sm">
                  ${calculations.techShare.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400 text-[10px]">
                <span>Platform 30% Share:</span>
                <span>${calculations.platformShare.toFixed(2)}</span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF Invoice</span>
              </button>

              <button
                type="button"
                onClick={handleSendPdf}
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 transition-all"
              >
                {sentPdf ? <Check className="w-4 h-4 text-emerald-300" /> : <Send className="w-4 h-4" />}
                <span>{sentPdf ? 'PDF Sent via SMS/Email!' : 'Send PDF (Email / SMS)'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopySummary}
                className="w-full py-2 rounded-xl bg-[#0b0c10] hover:bg-white/5 border border-white/10 text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSummary ? 'Copied Summary!' : 'Copy Summary'}</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
