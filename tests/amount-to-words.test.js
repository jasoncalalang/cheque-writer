'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { amountToWords, formatAmount } = require('../amount-to-words.js');

test('units', () => {
  assert.equal(amountToWords(5), 'Five Pesos Only');
});

test('teens', () => {
  assert.equal(amountToWords(14), 'Fourteen Pesos Only');
});

test('tens', () => {
  assert.equal(amountToWords(40), 'Forty Pesos Only');
});

test('hyphenated tens', () => {
  assert.equal(amountToWords(99), 'Ninety-Nine Pesos Only');
});

test('hundreds', () => {
  assert.equal(amountToWords(500), 'Five Hundred Pesos Only');
});

test('hundred with tens and units', () => {
  assert.equal(amountToWords(345), 'Three Hundred Forty-Five Pesos Only');
});

test('thousands', () => {
  assert.equal(amountToWords(12345),
    'Twelve Thousand Three Hundred Forty-Five Pesos Only');
});

test('millions with sparse groups', () => {
  assert.equal(amountToWords(2000001), 'Two Million One Pesos Only');
});

test('skips empty groups entirely', () => {
  assert.equal(amountToWords(1000000), 'One Million Pesos Only');
});

test('max integer amount', () => {
  assert.equal(amountToWords(999999999),
    'Nine Hundred Ninety-Nine Million Nine Hundred Ninety-Nine Thousand Nine Hundred Ninety-Nine Pesos Only');
});

test('centavos', () => {
  assert.equal(amountToWords(12345.67),
    'Twelve Thousand Three Hundred Forty-Five Pesos and 67/100 Only');
});

test('single-digit centavos are zero-padded', () => {
  assert.equal(amountToWords(2.05), 'Two Pesos and 05/100 Only');
});

test('one centavo', () => {
  assert.equal(amountToWords(0.01), 'Zero Pesos and 01/100 Only');
});

test('zero pesos with centavos', () => {
  assert.equal(amountToWords(0.50), 'Zero Pesos and 50/100 Only');
});

test('singular peso', () => {
  assert.equal(amountToWords(1), 'One Peso Only');
});

test('singular peso with centavos', () => {
  assert.equal(amountToWords(1.25), 'One Peso and 25/100 Only');
});

test('rounds half up through float noise', () => {
  assert.equal(amountToWords(1.005), 'One Peso and 01/100 Only');
});

test('rounds away extra precision', () => {
  assert.equal(amountToWords(2.999), 'Three Pesos Only');
});

test('centavos rounding up into a whole peso', () => {
  assert.equal(amountToWords(0.995), 'One Peso Only');
});

test('boundary max with centavos', () => {
  assert.equal(amountToWords(999999999.99),
    'Nine Hundred Ninety-Nine Million Nine Hundred Ninety-Nine Thousand Nine Hundred Ninety-Nine Pesos and 99/100 Only');
});

test('throws RangeError on zero', () => {
  assert.throws(() => amountToWords(0), RangeError);
});

test('throws RangeError on negative', () => {
  assert.throws(() => amountToWords(-5), RangeError);
});

test('throws RangeError on overflow', () => {
  assert.throws(() => amountToWords(1000000000), RangeError);
});

test('throws RangeError on sub-centavo amount', () => {
  assert.throws(() => amountToWords(0.004), RangeError);
});

test('throws TypeError on NaN', () => {
  assert.throws(() => amountToWords(NaN), TypeError);
});

test('throws TypeError on Infinity', () => {
  assert.throws(() => amountToWords(Infinity), TypeError);
});

test('throws TypeError on string input', () => {
  assert.throws(() => amountToWords('100'), TypeError);
});

test('formatAmount groups thousands', () => {
  assert.equal(formatAmount(12345.67), '12,345.67');
});

test('formatAmount pads centavos to two digits', () => {
  assert.equal(formatAmount(500), '500.00');
});

test('formatAmount groups millions', () => {
  assert.equal(formatAmount(999999999.99), '999,999,999.99');
});

test('formatAmount shares validation', () => {
  assert.throws(() => formatAmount(0), RangeError);
  assert.throws(() => formatAmount(NaN), TypeError);
});
