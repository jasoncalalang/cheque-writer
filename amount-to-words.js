(function (global) {
  'use strict';

  const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
    'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen',
    'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty',
    'Seventy', 'Eighty', 'Ninety'];
  const SCALES = ['', ' Thousand', ' Million'];

  // 0-999 -> words ('' for 0)
  function threeDigits(n) {
    const parts = [];
    if (n >= 100) parts.push(ONES[Math.floor(n / 100)] + ' Hundred');
    const rem = n % 100;
    if (rem >= 20) {
      parts.push(rem % 10
        ? TENS[Math.floor(rem / 10)] + '-' + ONES[rem % 10]
        : TENS[Math.floor(rem / 10)]);
    } else if (rem > 0) {
      parts.push(ONES[rem]);
    }
    return parts.join(' ');
  }

  function integerToWords(n) {
    if (n === 0) return 'Zero';
    const groups = [];
    while (n > 0) {
      groups.push(n % 1000);
      n = Math.floor(n / 1000);
    }
    const parts = [];
    for (let i = groups.length - 1; i >= 0; i--) {
      if (groups[i] !== 0) parts.push(threeDigits(groups[i]) + SCALES[i]);
    }
    return parts.join(' ');
  }

  function amountToWords(amount) {
    return integerToWords(amount) + ' Pesos Only';
  }

  const api = { amountToWords };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.ChequeAmount = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
