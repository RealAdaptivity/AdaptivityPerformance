import { jsPDF } from 'jspdf';
import { SITE_PHONE_DISPLAY, SITE_ORIGIN } from '../site/seo';
import type { InvoiceItem } from '../admin/InvoiceBuilderTab';
import { ADAPTIVITY_LOGO_PNG_BASE64 } from './invoiceLogoAsset';

export interface InvoicePdfData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  status: string;
  paymentMethod: string;
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
  shopSuppliesFee: number;
  taxAmount: number;
  laborSubtotal: number;
  partsSubtotal: number;
  grandTotal: number;
  techNotes?: string;
}

/**
 * Builds a vector PDF document for the invoice using jsPDF.
 */
export function buildInvoiceJsPdf(data: InvoicePdfData): jsPDF {
  // Letter size is 612 x 792 pt
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  const margin = 40;
  const pageWidth = 612;
  const contentWidth = pageWidth - margin * 2; // 532 pt

  // --- BRAND HEADER ---
  // Top Orange Accent Bar along the top edge of page
  doc.setFillColor(234, 88, 12); // Orange #ea580c
  doc.rect(0, 0, pageWidth, 5, 'F');

  let y = 32;

  // Adaptivity Performance Logo
  try {
    doc.addImage(ADAPTIVITY_LOGO_PNG_BASE64, 'PNG', margin, y, 44, 44);
  } catch {
    // Fallback vector box if image fails
    doc.setFillColor(11, 12, 16);
    doc.roundedRect(margin, y, 44, 44, 8, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(234, 88, 12);
    doc.text('AP', margin + 8, y + 30);
  }

  const headerTextX = margin + 52;

  // Company Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(234, 88, 12);
  doc.text('ADAPTIVITY PERFORMANCE', headerTextX, y + 14);

  // Subheader & Contact
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text('Mobile & Shop Auto Repair Specialist • Justin / DFW, TX', headerTextX, y + 27);
  doc.text(`Phone: ${SITE_PHONE_DISPLAY} • service@adaptivityperformance.com`, headerTextX, y + 39);

  // INVOICE Title on Right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(17, 24, 39); // Slate-900
  doc.text('INVOICE', pageWidth - margin, y + 14, { align: 'right' });

  // Invoice Number & Dates on Right
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`# ${data.invoiceNumber}`, pageWidth - margin, y + 27, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date: ${data.invoiceDate}   |   Due: ${data.dueDate}`, pageWidth - margin, y + 39, { align: 'right' });

  // Payment Status Badge
  const statusColor = data.status === 'PAID' ? [5, 150, 105] : [217, 119, 6]; // Emerald vs Amber
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(pageWidth - margin - 120, y + 46, 120, 15, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(`${data.status} — ${data.paymentMethod.split(' ')[0]}`, pageWidth - margin - 60, y + 57, { align: 'center' });

  y += 68;

  // Thin Clean Divider Line
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);
  y += 14;

  // --- CUSTOMER & VEHICLE BOXES ---
  const boxWidth = (contentWidth - 14) / 2;
  const boxHeight = 74;

  // Customer Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, boxWidth, boxHeight, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(234, 88, 12);
  doc.text('CUSTOMER / BILL TO', margin + 10, y + 13);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(data.customerName || 'Customer', margin + 10, y + 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Phone: ${data.customerPhone}`, margin + 10, y + 39);
  doc.text(`Email: ${data.customerEmail}`, margin + 10, y + 51);
  doc.text(`Location: ${data.serviceAddress.substring(0, 36)}`, margin + 10, y + 63);

  // Vehicle Box
  const vBoxX = margin + boxWidth + 14;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(vBoxX, y, boxWidth, boxHeight, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(234, 88, 12);
  doc.text('VEHICLE & SERVICE INFO', vBoxX + 10, y + 13);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(data.vehicleYearMakeModel.substring(0, 32), vBoxX + 10, y + 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`VIN: ${data.vehicleVin || 'N/A'}`, vBoxX + 10, y + 39);
  doc.text(`Odometer: ${data.vehicleMileage || 'N/A'}  •  Plate: ${data.vehiclePlate || 'N/A'}`, vBoxX + 10, y + 51);
  doc.text(`Tech: ${data.technicianName}  (#${data.bookingRef})`, vBoxX + 10, y + 63);

  y += boxHeight + 14;

  // --- ITEMIZED ITEMS TABLE ---
  // Table Header
  doc.setFillColor(15, 23, 42); // Dark slate header
  doc.rect(margin, y, contentWidth, 20, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('TYPE', margin + 8, y + 13);
  doc.text('DESCRIPTION / PROCEDURE', margin + 65, y + 13);
  doc.text('QTY / HRS', margin + 370, y + 13, { align: 'center' });
  doc.text('RATE', margin + 445, y + 13, { align: 'right' });
  doc.text('TOTAL', pageWidth - margin - 8, y + 13, { align: 'right' });
  y += 20;

  // Line Items Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  data.items.forEach((it, idx) => {
    const rowHeight = 18;
    const isEven = idx % 2 === 0;

    if (isEven) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }

    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);

    // Type Badge
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(234, 88, 12);
    doc.text(it.type.toUpperCase(), margin + 8, y + 12);

    // Description
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    const truncDesc = it.description.length > 55 ? it.description.substring(0, 52) + '...' : it.description;
    doc.text(truncDesc, margin + 65, y + 12);

    // Qty / Hours
    doc.setTextColor(71, 85, 105);
    doc.text(`${it.qtyOrHours} ${it.type === 'Labor' ? 'hrs' : ''}`, margin + 370, y + 12, { align: 'center' });

    // Rate
    doc.text(`$${it.rate.toFixed(2)}`, margin + 445, y + 12, { align: 'right' });

    // Total
    const lineTotal = it.qtyOrHours * it.rate;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`$${lineTotal.toFixed(2)}`, pageWidth - margin - 8, y + 12, { align: 'right' });

    y += rowHeight;
  });

  y += 8;

  // --- TOTALS CALCULATION BOX ---
  const totalsX = margin + contentWidth - 220;
  const totalsWidth = 220;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  const addTotalRow = (label: string, valueStr: string, isBold: boolean = false, isHighlight: boolean = false) => {
    if (isHighlight) {
      doc.setFillColor(254, 243, 199);
      doc.rect(totalsX - 4, y - 9, totalsWidth + 4, 15, 'F');
    }
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setTextColor(isHighlight ? 180 : 71, isHighlight ? 83 : 85, isHighlight ? 9 : 105);
    doc.text(label, totalsX, y);
    doc.text(valueStr, pageWidth - margin - 8, y, { align: 'right' });
    y += 13.5;
  };

  addTotalRow('Labor Subtotal:', `$${data.laborSubtotal.toFixed(2)}`);
  addTotalRow('Parts & Materials Subtotal:', `$${data.partsSubtotal.toFixed(2)}`);
  addTotalRow(
    'Diagnostic Visit Fee:',
    data.waiveDiagnosticFee ? 'WAIVED ($0.00)' : '$85.00',
    false,
    data.waiveDiagnosticFee
  );
  addTotalRow('Shop Supplies & Environmental (5%):', `$${data.shopSuppliesFee.toFixed(2)}`);
  addTotalRow('Texas Sales Tax (8.25%):', `$${data.taxAmount.toFixed(2)}`);

  // Grand Total Line
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(1.5);
  doc.line(totalsX - 4, y, pageWidth - margin, y);
  y += 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(234, 88, 12);
  doc.text('TOTAL AMOUNT:', totalsX, y);
  doc.text(`$${data.grandTotal.toFixed(2)}`, pageWidth - margin - 8, y, { align: 'right' });
  y += 18;

  // --- WARRANTY BADGE BOX ---
  doc.setFillColor(255, 247, 237); // Orange-50
  doc.setDrawColor(251, 146, 60); // Orange-400
  doc.roundedRect(margin, y, contentWidth, 32, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(194, 65, 12);
  doc.text('[12-MONTH / 12,000-MILE NATIONWIDE PARTS & LABOR WARRANTY]', margin + 10, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(124, 45, 18);
  doc.text(
    'All workmanship and Adaptivity Performance supplied parts are warrantied for 12 months / 12,000 miles. Not liable for customer-provided parts.',
    margin + 10,
    y + 23
  );
  y += 38;

  // --- TECH NOTES ---
  if (data.techNotes) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 26, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Technician Findings & Notes:', margin + 8, y + 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(data.techNotes.substring(0, 110), margin + 8, y + 19);
    y += 32;
  }

  // --- TEXAS STATUTORY MECHANICS' LIEN & SIGNATURES ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TEXAS STATUTORY MECHANIC\'S LIEN NOTICE (TX PROPERTY CODE § 70.001):', margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'I hereby authorize the repair work herein described. Adaptivity Performance employees may operate vehicle for testing. An express mechanic\'s lien is acknowledged on vehicle.',
    margin,
    y
  );
  y += 22;

  // Signature Lines
  const sigWidth = (contentWidth - 40) / 2;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.75);

  doc.line(margin, y, margin + sigWidth, y);
  doc.line(margin + sigWidth + 40, y, pageWidth - margin, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('CUSTOMER SIGNATURE & AUTHORIZATION', margin, y + 9);
  doc.text('CERTIFIED TECHNICIAN SIGNATURE', margin + sigWidth + 40, y + 9);

  return doc;
}

/**
 * Triggers a direct vector PDF file download on iPhone, Android, and desktop.
 */
export async function downloadInvoicePdfDirect(data: InvoicePdfData): Promise<void> {
  const doc = buildInvoiceJsPdf(data);
  const fileName = `Invoice-${data.invoiceNumber || 'INV-2026'}.pdf`;

  // Direct jsPDF save (triggers native file download on all modern browsers)
  doc.save(fileName);
}

/**
 * Shares or sends the invoice PDF directly using native device Share Sheet (AirDrop / Save to Files on iPhone)
 * or opens email client with pre-filled message & online payment link.
 */
export async function shareInvoicePdfDirect(data: InvoicePdfData): Promise<{ method: 'share' | 'mailto' }> {
  const doc = buildInvoiceJsPdf(data);
  const fileName = `Invoice-${data.invoiceNumber || 'INV-2026'}.pdf`;
  const subject = `Invoice #${data.invoiceNumber} - Adaptivity Performance`;
  const payUrl = `${SITE_ORIGIN}/pay/${data.bookingRef || data.invoiceNumber}`;
  const messageBody = `Hi ${data.customerName},\n\nYour official auto repair invoice #${data.invoiceNumber} for your ${data.vehicleYearMakeModel} is ready.\n\nTotal: $${data.grandTotal.toFixed(2)}\nView & Pay Online:\n${payUrl}\n\nOur service includes a 12-Month / 12,000-Mile Warranty.\n\nThank you!\nAdaptivity Performance Mobile Dispatch\n${SITE_PHONE_DISPLAY}`;

  try {
    const pdfBlob = doc.output('blob');
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

    // Check if Web Share API with files is supported (iPhone Safari, Android Chrome)
    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      await navigator.share({
        title: subject,
        text: messageBody,
        files: [pdfFile],
      });
      return { method: 'share' };
    }
  } catch {
    // Fall back to mailto if share cancelled or unavailable
  }

  // Fallback to mailto + direct download
  const mailtoUrl = `mailto:${data.customerEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(messageBody)}`;
  window.open(mailtoUrl, '_blank');
  doc.save(fileName);
  return { method: 'mailto' };
}
