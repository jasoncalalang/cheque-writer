(function (global) {
  'use strict';

  const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
    'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen',
    'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty',
    'Seventy', 'Eighty', 'Ninety'];
  const SCALES = ['', ' Thousand', ' Million'];

  const MAX_CENTS = 99999999999; // 999,999,999.99 pesos

  // Round to whole centavos, half-up through binary float noise:
  // 1.005 stores as 1.00499...; the (1 + EPSILON) factor lifts values
  // within ~2e-14 of a .5 boundary over it without disturbing others.
  function toCents(amount) {
    if (typeof amount !== 'number' || !isFinite(amount)) {
      throw new TypeError('must be a number');
    }
    const cents = Math.round(amount * 100 * (1 + Number.EPSILON));
    if (cents < 1) throw new RangeError('must be at least 0.01');
    if (cents > MAX_CENTS) {
      throw new RangeError('must not exceed 999,999,999.99');
    }
    return cents;
  }

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
    const cents = toCents(amount);
    const pesos = Math.floor(cents / 100);
    const centavos = cents % 100;
    let words = integerToWords(pesos) + (pesos === 1 ? ' Peso' : ' Pesos');
    if (centavos > 0) {
      words += ' and ' + String(centavos).padStart(2, '0') + '/100';
    }
    return words + ' Only';
  }

  // Plain digits only — the format PCHC MC 3814 (eff. 2025-07-01) calls for.
  // MC 3893 (2025-07-28) re-allowed ** around the figures, but plain digits
  // are the one format valid under every circular.
  function formatAmount(amount) {
    const cents = toCents(amount);
    const pesos = Math.floor(cents / 100);
    const centavos = cents % 100;
    return pesos.toLocaleString('en-US')
      + '.' + String(centavos).padStart(2, '0');
  }

  const api = { amountToWords, formatAmount };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.ChequeAmount = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
