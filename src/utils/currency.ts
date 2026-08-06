import { DocumentItem } from '../types';

/**
 * Format a number into FCFA currency display
 * e.g., 1250000 -> "1 250 000 FCFA"
 */
export function formatFCFA(amount: number, symbol: string = 'FCFA'): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return `0 ${symbol}`;
  }
  
  // Format integer part with non-breaking spaces for thousands
  const rounded = Math.round(amount);
  const formattedNumber = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  
  return `${formattedNumber} ${symbol}`;
}

/**
 * Converts a number to French words for formal invoice legal compliance
 * e.g., 1250000 -> "un million deux cent cinquante mille Francs CFA"
 */
export function numberToWordsFR(amount: number, currencySuffix: string = 'Francs CFA'): string {
  const num = Math.round(Math.abs(amount));
  if (num === 0) return `zéro ${currencySuffix}`;

  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingts', 'quatre-vingt-dix'];

  function convertGroup(n: number): string {
    let result = '';
    
    // Hundreds
    const hundred = Math.floor(n / 100);
    const remainder = n % 100;

    if (hundred > 0) {
      if (hundred === 1) {
        result += 'cent ';
      } else {
        result += units[hundred] + (remainder === 0 ? ' cents ' : ' cent ');
      }
    }

    if (remainder > 0) {
      if (remainder < 10) {
        result += units[remainder];
      } else if (remainder < 20) {
        result += teens[remainder - 10];
      } else {
        const tenDigit = Math.floor(remainder / 10);
        const unitDigit = remainder % 10;

        if (tenDigit === 7) {
          result += 'soixante-' + (unitDigit === 1 ? 'et-onze' : teens[unitDigit]);
        } else if (tenDigit === 9) {
          result += 'quatre-vingt-' + teens[unitDigit];
        } else if (tenDigit === 8) {
          result += 'quatre-vingt' + (unitDigit === 0 ? 's' : '-' + units[unitDigit]);
        } else {
          result += tens[tenDigit] + (unitDigit === 1 ? '-et-un' : (unitDigit > 0 ? '-' + units[unitDigit] : ''));
        }
      }
    }

    return result.trim();
  }

  const billions = Math.floor(num / 1000000000);
  let rem = num % 1000000000;
  const millions = Math.floor(rem / 1000000);
  rem = rem % 1000000;
  const thousands = Math.floor(rem / 1000);
  const ones = rem % 1000;

  let words = '';

  if (billions > 0) {
    words += (billions === 1 ? 'un milliard ' : convertGroup(billions) + ' milliards ');
  }

  if (millions > 0) {
    words += (millions === 1 ? 'un million ' : convertGroup(millions) + ' millions ');
  }

  if (thousands > 0) {
    if (thousands === 1) {
      words += 'mille ';
    } else {
      words += convertGroup(thousands) + ' mille ';
    }
  }

  if (ones > 0) {
    words += convertGroup(ones);
  }

  const capitalized = words.trim().charAt(0).toUpperCase() + words.trim().slice(1);
  return `${capitalized} ${currencySuffix}`;
}

export function calculateItemTotals(item: DocumentItem) {
  const gross = item.quantity * item.unitPrice;
  const discountAmount = gross * ((item.discount || 0) / 100);
  const subtotalHT = gross - discountAmount;
  const taxAmount = subtotalHT * ((item.taxRate || 0) / 100);
  const totalTTC = subtotalHT + taxAmount;

  return {
    gross,
    discountAmount,
    subtotalHT,
    taxAmount,
    totalTTC,
  };
}

export function calculateDocumentTotals(items: DocumentItem[], globalTaxRate?: number) {
  let totalHT = 0;
  let totalDiscount = 0;
  let totalTVA = 0;

  items.forEach((item) => {
    const calc = calculateItemTotals(item);
    totalHT += calc.subtotalHT;
    totalDiscount += calc.discountAmount;
    
    // If tax rate is defined per item or global
    const effectiveTaxRate = item.taxRate !== undefined ? item.taxRate : (globalTaxRate || 0);
    const itemTax = calc.subtotalHT * (effectiveTaxRate / 100);
    totalTVA += itemTax;
  });

  const totalTTC = totalHT + totalTVA;

  return {
    totalHT,
    totalDiscount,
    totalTVA,
    totalTTC,
  };
}
