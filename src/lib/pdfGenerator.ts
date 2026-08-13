import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Bill, SupplierProfile } from '../types';
import { formatInvoiceDate, numberToWordsIndian, calculateItemAmount } from './billingLogic';

export async function generateInvoicePDF(bill: Bill, supplier: SupplierProfile): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  await generateInvoicePage(doc, bill, supplier);

  return doc.output('blob');
}

export async function generateBulkInvoicePDF(bills: Bill[], supplier: SupplierProfile): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  for (let i = 0; i < bills.length; i++) {
    if (i > 0) {
      doc.addPage();
    }
    await generateInvoicePage(doc, bills[i], supplier);
  }

  return doc.output('blob');
}

async function generateInvoicePage(doc: jsPDF, bill: Bill, supplier: SupplierProfile) {
  const m = 12.7; // Margins
  const pageWidth = doc.internal.pageSize.getWidth();
  const innerWidth = pageWidth - m * 2;
  const midX = m + innerWidth / 2;
  
  const boxHeight = 271.6;
  const boxEndY = m + boxHeight;

  // Thick and thin constants
  const thick = 0.5;
  const thin = 0.25;

  doc.setFont('helvetica');
  doc.setTextColor(0, 0, 0);

  let currentY = m + 4; // Start slightly below the top margin for text baseline

  // Header Title
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('COMPOSITION TAXABLE PERSON, NOT ELIGIBLE TO COLLECT TAX ON SUPPLIES', pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL OF SUPPLY', pageWidth / 2, currentY, { align: 'center' });
  currentY += 7;

  // Supplier Details (Centered)
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(supplier.businessName || 'ADARSH COLLECTION', pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(supplier.address || '', pageWidth / 2, currentY, { align: 'center' });
  currentY += 4;
  
  const contactText = [];
  if (supplier.phone) contactText.push(`Mob: ${supplier.phone}`);
  if (supplier.gstin) contactText.push(`GSTIN: ${supplier.gstin}`);
  
  if (contactText.length > 0) {
    doc.text(contactText.join(' | '), pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;
  }
  
  currentY += 2; // small padding before line

  // Line below header
  doc.setLineWidth(thin);
  doc.line(m, currentY, pageWidth - m, currentY);

  const headerStartY = currentY;

  // --- Header Blocks (Buyer / Info) ---
  const headerHeight = 35;
  const rowHeight = headerHeight / 4;
  
  // Left: Buyer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Buyer (Bill to)', m + 2, currentY + 4);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(bill.customerName || 'Cash', m + 2, currentY + 9);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  let buyerY = currentY + 14;
  if (bill.customerCity) {
    doc.text(bill.customerCity, m + 2, buyerY);
    buyerY += 4.5;
  }
  if (bill.customerState) {
    let stateText = bill.customerState;
    if (bill.customerStateCode) {
      stateText += ` (Code: ${bill.customerStateCode})`;
    }
    doc.text(stateText, m + 2, buyerY);
  }

  // Right Side: 4 Rows
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  
  // Row 1
  doc.text('BILL NO.', midX + 2, currentY + 4);
  doc.setFont('helvetica', 'normal');
  doc.text(bill.invoiceNumber || '-', midX + 2, currentY + 8);
  
  doc.setFont('helvetica', 'bold');
  doc.text('DATE', midX + (innerWidth/4) + 2, currentY + 4);
  doc.setFont('helvetica', 'normal');
  doc.text(formatInvoiceDate(bill.date).text, midX + (innerWidth/4) + 2, currentY + 8);

  // Row 2
  const r2Y = currentY + rowHeight;
  doc.setFont('helvetica', 'bold');
  doc.text('PLACE OF SUPPLY', midX + 2, r2Y + 4);
  doc.setFont('helvetica', 'normal');
  doc.text(bill.placeOfSupply || '-', midX + 2, r2Y + 8);

  doc.setFont('helvetica', 'bold');
  doc.text('STATE CODE', midX + (innerWidth/4) + 2, r2Y + 4);
  doc.setFont('helvetica', 'normal');
  doc.text(bill.supplyStateCode || '-', midX + (innerWidth/4) + 2, r2Y + 8);

  // Row 3
  const r3Y = currentY + rowHeight * 2;
  doc.setFont('helvetica', 'bold');
  doc.text('MODE OF PAY', midX + 2, r3Y + 4);
  doc.setFont('helvetica', 'normal');
  doc.text(bill.modeOfPay || '-', midX + 2, r3Y + 8);

  doc.setFont('helvetica', 'bold');
  doc.text('TRANSPORT / REF', midX + (innerWidth/4) + 2, r3Y + 4);
  doc.setFont('helvetica', 'normal');
  doc.text(bill.transportRef || '-', midX + (innerWidth/4) + 2, r3Y + 8);

  // Row 4
  const r4Y = currentY + rowHeight * 3;
  doc.setFont('helvetica', 'bold');
  doc.text('E-WAY BILL NO.', midX + 2, r4Y + 4);
  doc.setFont('helvetica', 'normal');
  doc.text(bill.ewayBillNo || '-', midX + 2, r4Y + 8);

  doc.setFont('helvetica', 'bold');
  doc.text('DISPATCH THROUGH', midX + (innerWidth/4) + 2, r4Y + 4);
  doc.setFont('helvetica', 'normal');
  doc.text(bill.dispatchThrough || '-', midX + (innerWidth/4) + 2, r4Y + 8);

  
  // Header borders (thin lines)
  doc.setLineWidth(thin);
  doc.line(midX, currentY, midX, currentY + headerHeight); // Vertical split
  doc.line(m, currentY + headerHeight, pageWidth - m, currentY + headerHeight); // Horizontal below header
  
  // Right side inner lines
  doc.line(midX, currentY + rowHeight, pageWidth - m, currentY + rowHeight);
  doc.line(midX, currentY + rowHeight * 2, pageWidth - m, currentY + rowHeight * 2);
  doc.line(midX, currentY + rowHeight * 3, pageWidth - m, currentY + rowHeight * 3);
  doc.line(midX + (innerWidth/4), currentY, midX + (innerWidth/4), currentY + headerHeight); // Right vertical split
  
  currentY += headerHeight;

  // --- Layout Calculations for the bottom ---
  const footerHeight = 35;
  const wordsHeight = 12;
  const totalsHeight = (bill.discount ? 6 : 0) + (bill.roundOff ? 6 : 0) + 8;
  
  const bottomOfTable = boxEndY - footerHeight - wordsHeight;
  const totalsStartY = bottomOfTable - totalsHeight;

  // --- Table Body ---
  let totalQty = 0;
  const tableData = bill.items.map((item, index) => {
    const isDiscount = item.quantity < 0 || item.rate < 0;
    if (!isDiscount) {
      totalQty += Number(item.quantity);
    }
    return [
      index + 1,
      item.description,
      item.hsnSac || '',
      isDiscount ? '' : `${item.quantity}`,
      isDiscount ? '' : `${Number(item.rate || 0).toFixed(2)}`,
      item.per || 'PCS',
      Number(item.amount || 0).toFixed(2)
    ];
  });

  const tableStartY = currentY;

  autoTable(doc, {
    startY: currentY,
    head: [['Sl No.', 'Description of Goods', 'HSN/SAC', 'Quantity', 'Rate', 'Per', 'Amount']],
    body: tableData,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      textColor: [0, 0, 0],
      cellPadding: 2,
    },
    headStyles: {
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { halign: 'left' },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'right', cellWidth: 18 },
      4: { halign: 'right', cellWidth: 20 },
      5: { halign: 'center', cellWidth: 12 },
      6: { halign: 'right', cellWidth: 28 },
    },
    margin: { left: m, right: m },
  });

  // Draw table inner lines down to totalsStartY
  doc.setLineWidth(thin);
  const headHeight = (doc as any).lastAutoTable.head[0].height;
  
  // Horizontal line below table header
  doc.line(m, tableStartY + headHeight, pageWidth - m, tableStartY + headHeight);
  
  // Vertical lines for columns
  const cols = [
    m + 12, // Sl No
    pageWidth - m - 98, // Desc -> HSN
    pageWidth - m - 78, // HSN -> Qty
    pageWidth - m - 60, // Qty -> Rate
    pageWidth - m - 40, // Rate -> Per
    pageWidth - m - 28, // Per -> Amount
  ];
  for (const x of cols) {
    doc.line(x, tableStartY, x, totalsStartY);
  }
  
  // Extend specific column lines through the Totals section down to bottomOfTable
  doc.line(pageWidth - m - 78, totalsStartY, pageWidth - m - 78, bottomOfTable); // Qty line
  doc.line(pageWidth - m - 60, totalsStartY, pageWidth - m - 60, bottomOfTable); // Rate line
  doc.line(pageWidth - m - 28, totalsStartY, pageWidth - m - 28, bottomOfTable); // Amount line

  // Horizontal line above totals
  doc.line(m, totalsStartY, pageWidth - m, totalsStartY);
  // Horizontal line below totals
  doc.line(m, bottomOfTable, pageWidth - m, bottomOfTable);

  // --- Totals ---
  let currentTotalY = totalsStartY + 6;
  doc.setFontSize(9);
  
  if (bill.discount) {
    doc.setFont('helvetica', 'normal');
    doc.text('Less: Discount', pageWidth - m - 30, currentTotalY, { align: 'right' });
    doc.text(`-${Number(bill.discount || 0).toFixed(2)}`, pageWidth - m - 2, currentTotalY, { align: 'right' });
    currentTotalY += 6;
  }
  
  if (bill.roundOff) {
    doc.setFont('helvetica', 'normal');
    doc.text('Add: Round Off', pageWidth - m - 30, currentTotalY, { align: 'right' });
    doc.text(`${bill.roundOff > 0 ? '+' : ''}${Number(bill.roundOff || 0).toFixed(2)}`, pageWidth - m - 2, currentTotalY, { align: 'right' });
    currentTotalY += 6;
  }

  // Total Line
  doc.setFont('helvetica', 'bold');
  doc.text('Total', pageWidth - m - 30, bottomOfTable - 3, { align: 'right' });
  doc.text(Number(bill.netAmount || 0).toFixed(2), pageWidth - m - 2, bottomOfTable - 3, { align: 'right' });

  if (totalQty > 0) {
    doc.text(totalQty.toString(), pageWidth - m - 62, bottomOfTable - 3, { align: 'right' });
  }

  // --- Amount Chargeable (in words) ---
  const wordsY = bottomOfTable;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Amount Chargeable (in words)', m + 2, wordsY + 4);
  doc.setFont('helvetica', 'bold');
  doc.text(numberToWordsIndian(bill.netAmount), m + 2, wordsY + 9);
  
  // Net Amount on the right side
  doc.setFontSize(9);
  doc.text(`Net Amount: Rs. ${Number(bill.netAmount || 0).toFixed(2)}`, pageWidth - m - 2, wordsY + 9, { align: 'right' });
  
  // Horizontal line below words
  doc.line(m, wordsY + wordsHeight, pageWidth - m, wordsY + wordsHeight);

  // --- Terms and Signatory Box ---
  const footerY = wordsY + wordsHeight;
  
  // Declaration & Terms
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('DECLARATION & TERMS', m + 2, footerY + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  
  let termsText = '';
  if (supplier.termsList && supplier.termsList.length > 0) {
    termsText = supplier.termsList.filter(t => t.trim() !== '').map((t, i) => `${i + 1}. ${t}`).join('\n');
  } else if (supplier.terms) {
    termsText = supplier.terms;
  } else {
    termsText = "1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if payment is delayed.\n3. Subject to local jurisdiction.\n4. E.& O.E.";
  }
  
  const termsLines = doc.splitTextToSize(termsText, (innerWidth / 2) - 4);
  doc.text(termsLines, m + 2, footerY + 8);

  // Bank Details
  let bankY = footerY + 8 + (termsLines.length * 3) + 2;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('BANK ACCOUNT DETAILS', m + 2, bankY);
  bankY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  if (supplier.bankName) doc.text(`Bank Name: ${supplier.bankName}`, m + 2, bankY);
  bankY += 3.5;
  if (supplier.accountNumber) doc.text(`A/C No: ${supplier.accountNumber}`, m + 2, bankY);
  bankY += 3.5;
  if (supplier.ifsc) doc.text(`IFSC: ${supplier.ifsc}`, m + 2, bankY);
  bankY += 3.5;
  if (supplier.upi) doc.text(`UPI: ${supplier.upi}`, m + 2, bankY);


  // Vertical split for Signatory Block
  doc.line(midX, footerY, midX, boxEndY);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`for ${supplier.businessName || 'ADARSH COLLECTION'}`, pageWidth - m - 2, footerY + 4, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Authorised Signatory', pageWidth - m - 2, boxEndY - 2, { align: 'right' });

  // --- Draw Outer Thick Box ---
  doc.setLineWidth(thick);
  doc.rect(m, m, innerWidth, boxHeight);
}

