'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { amountToWords } = require('../amount-to-words.js');

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
