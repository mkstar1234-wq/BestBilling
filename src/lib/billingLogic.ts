import { Bill, InvoiceItem } from '../types';

/**
 * 1.1 Bill Number Generation
 */
export function getNextInvoiceNumber(
  existingBills: Bill[],
  invoicePrefix: string = 'INV-',
  startBase: number = 1
): string {
  const usedNumbers = new Set<number>();
  let paddingLength = 4; // Default padding

  // Regex to extract trailing consecutive digits
  const trailingDigitsRegex = /(\d+)(?=\D*$)/;

  for (const bill of existingBills) {
    if (!bill.invoiceNumber) continue;
    
    // Check if the bill's prefix matches the current prefix (optional strictness)
    // We mainly just want to extract the numeric part at the end
    const match = bill.invoiceNumber.match(trailingDigitsRegex);
    if (match && match[1]) {
      const numStr = match[1];
      const num = parseInt(numStr, 10);
      if (!isNaN(num)) {
        usedNumbers.add(num);
        // Adapt padding length to match the largest found (or keep default 4)
        if (numStr.length > paddingLength) {
          paddingLength = numStr.length;
        }
      }
    }
  }

  let candidate = startBase;
  while (usedNumbers.has(candidate)) {
    candidate++;
  }

  const paddedCandidate = candidate.toString().padStart(paddingLength, '0');
  return `${invoicePrefix}${paddedCandidate}`;
}

/**
 * 1.2 Date Formatting
 */
export interface FormattedDate {
  text: string;           // "22 July 2026"
  numerical: string;      // "22-07-2026"
  numerical_slash: string; // "22/07/2026"
  iso: string;            // "2026-07-22"
}

export function formatInvoiceDate(input: string | number | Date): FormattedDate {
  let date: Date;
  
  if (input instanceof Date) {
    date = input;
  } else if (typeof input === 'number') {
    date = new Date(input);
  } else {
    // Handle string inputs safely
    // To avoid timezone shift issues with YYYY-MM-DD, parse parts if possible
    const isoMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      date = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
    } else {
      date = new Date(input);
    }
  }

  // Fallback if invalid
  if (isNaN(date.getTime())) {
    date = new Date();
  }

  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();

  const pad = (n: number) => n.toString().padStart(2, '0');
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return {
    text: `${day} ${monthNames[month]} ${year}`,
    numerical: `${pad(day)}-${pad(month + 1)}-${year}`,
    numerical_slash: `${pad(day)}/${pad(month + 1)}/${year}`,
    iso: `${year}-${pad(month + 1)}-${pad(day)}`
  };
}

/**
 * 1.3 Mathematical Calculations
 */
export function calculateItemAmount(quantity: number, rate: number): number {
  return Number((Number(quantity || 0) * Number(rate || 0)).toFixed(2));
}

export function calculateTotalAmount(items: InvoiceItem[]): number {
  const total = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  return Number(Number(total || 0).toFixed(2));
}

export function calculateNetAmount(totalAmount: number, discount: number, roundOff: number): number {
  return Number((Number(totalAmount || 0) - Number(discount || 0) + Number(roundOff || 0)).toFixed(2));
}

/**
 * Number to Words Converter (Indian Numbering System)
 */
export function numberToWordsIndian(amount: number): string {
  if (amount === 0) return "Rupees Zero Only";

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const numToWords = (num: number): string => {
    let str = '';
    if (num > 9999999) {
      str += numToWords(Math.floor(num / 10000000)) + ' Crore ';
      num %= 10000000;
    }
    if (num > 99999) {
      str += numToWords(Math.floor(num / 100000)) + ' Lakh ';
      num %= 100000;
    }
    if (num > 999) {
      str += numToWords(Math.floor(num / 1000)) + ' Thousand ';
      num %= 1000;
    }
    if (num > 99) {
      str += numToWords(Math.floor(num / 100)) + ' Hundred ';
      num %= 100;
    }
    if (num > 0) {
      if (str !== '') str += 'and ';
      if (num < 20) {
        str += a[num] + ' ';
      } else {
        str += b[Math.floor(num / 10)] + ' ';
        if (num % 10 > 0) {
          str += a[num % 10] + ' ';
        }
      }
    }
    return str.trim();
  };

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  const rupees = Math.floor(absAmount);
  const paise = Math.round((absAmount - rupees) * 100);

  let result = isNegative ? 'Minus ' : '';

  if (rupees > 0) {
    result += `Rupees ${numToWords(rupees)}`;
  } else {
    result += 'Rupees Zero';
  }

  if (paise > 0) {
    result += ` and Paisa ${numToWords(paise)}`;
  }

  return `${result} Only`;
}
