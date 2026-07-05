# Cheque Writer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A single-page HTML tool that prints payee, auto-generated amount-in-words, and numeric amount onto pre-printed bank cheques, with mm-precise calibration.

**Architecture:** One `cheque.html` (UI + inline script + print CSS) loads `amount-to-words.js`, a pure-function classic script that is also `require()`-able by Node for tests. All layout settings persist in `localStorage`. Print CSS strips everything but the three positioned text strings.

**Tech Stack:** Plain HTML/CSS/JS. Node ≥ 20 built-in test runner (`node --test`). No dependencies, no package.json, no build step.

## Global Constraints

- Zero dependencies. No package.json. Never run `npm`.
- Classic `<script>` only — ES modules are blocked over `file://` in Chrome. `amount-to-words.js` exposes the global `ChequeAmount` AND guards `module.exports` for Node.
- All positions and dimensions in millimetres (CSS `mm` units).
- Print CSS uses `@page { size: letter portrait; margin: 0 }` — NEVER a custom page size (custom `@page` sizes print landscape on this machine's printer setup).
- Amount range: 0.01 – 999,999,999.99 PHP; input rounded to 2 decimals first.
- Words style: Title Case, hyphenated tens (`Forty-Five`), centavos as ` and NN/100`, always suffixed ` Only`, singular `Peso` for exactly 1.
- No date field anywhere — the date is handwritten by decision.
- localStorage keys: `cheque-writer-settings-v1` (JSON settings), `cheque-writer-bg-v1` (background image dataURL).
- TDD: write the failing test first for all pure logic. Run tests with `node --test` from the repo root.
- Commits: small, imperative subject lines, NO Co-Authored-By trailer.
- Repo root: `/Users/jason/claude-code/cheque-writer` (git repo on `main`, remote `origin` = github.com/jasoncalalang/cheque-writer).

---

### Task 1: `amountToWords` — integer pesos

**Files:**
- Create: `amount-to-words.js`
- Test: `tests/amount-to-words.test.js`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: global/module `ChequeAmount` with `amountToWords(amount: number) -> string`. After this task it handles non-negative integers only; later tasks extend it. Internal helpers `threeDigits(n)` and `integerToWords(n)` that later tasks reuse.

- [ ] **Step 1: Verify Node version supports `node --test` discovery**

Run: `node --version`
Expected: `v20.x` or higher. If lower, stop and report — the test commands in this plan assume Node ≥ 20.

- [ ] **Step 2: Write the failing tests**

Create `tests/amount-to-words.test.js`:

```js
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
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `node --test`
Expected: FAIL — `Cannot find module '../amount-to-words.js'`

- [ ] **Step 4: Write minimal implementation**

Create `amount-to-words.js`:

```js
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test`
Expected: 10 passing, 0 failing.

- [ ] **Step 6: Commit**

```bash
git add amount-to-words.js tests/amount-to-words.test.js
git commit -m "Add amountToWords for integer peso amounts"
```

---

### Task 2: `amountToWords` — centavos, singular Peso, rounding

**Files:**
- Modify: `amount-to-words.js`
- Test: `tests/amount-to-words.test.js`

**Interfaces:**
- Consumes: Task 1's `integerToWords`.
- Produces: `amountToWords` handles decimals. Internal `toCents(amount) -> integer` (rounds half-up through float noise); Task 3 adds validation inside it, Task 4 reuses it.

- [ ] **Step 1: Add failing tests**

Append to `tests/amount-to-words.test.js`:

```js
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

test('boundary max with centavos', () => {
  assert.equal(amountToWords(999999999.99),
    'Nine Hundred Ninety-Nine Million Nine Hundred Ninety-Nine Thousand Nine Hundred Ninety-Nine Pesos and 99/100 Only');
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `node --test`
Expected: the 9 new tests FAIL (e.g. `12345.67` currently produces garbage words from a non-integer); the 10 Task-1 tests still pass.

- [ ] **Step 3: Implement cents-based conversion**

In `amount-to-words.js`, add `toCents` after the `SCALES` declaration and replace the `amountToWords` function:

```js
  // Round to whole centavos, half-up through binary float noise:
  // 1.005 stores as 1.00499...; the (1 + EPSILON) factor lifts values
  // within ~2e-14 of a .5 boundary over it without disturbing others.
  function toCents(amount) {
    return Math.round(amount * 100 * (1 + Number.EPSILON));
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test`
Expected: 19 passing, 0 failing.

- [ ] **Step 5: Commit**

```bash
git add amount-to-words.js tests/amount-to-words.test.js
git commit -m "Handle centavos, singular peso, and rounding in amountToWords"
```

---

### Task 3: `amountToWords` — input validation

**Files:**
- Modify: `amount-to-words.js`
- Test: `tests/amount-to-words.test.js`

**Interfaces:**
- Consumes: Task 2's `toCents`.
- Produces: `toCents` (and therefore `amountToWords` and Task 4's `formatAmount`) throws `TypeError` for non-finite/non-number input and `RangeError` for < 0.01 or > 999,999,999.99. The UI (Task 5) catches these and shows `error.message`.

- [ ] **Step 1: Add failing tests**

Append to `tests/amount-to-words.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `node --test`
Expected: the 7 new tests FAIL (nothing throws yet); 19 prior tests pass.

- [ ] **Step 3: Add validation to `toCents`**

Replace `toCents` in `amount-to-words.js`:

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test`
Expected: 26 passing, 0 failing.

- [ ] **Step 5: Commit**

```bash
git add amount-to-words.js tests/amount-to-words.test.js
git commit -m "Validate amount range and type in toCents"
```

---

### Task 4: `formatAmount` — numeric field formatting

**Files:**
- Modify: `amount-to-words.js`
- Test: `tests/amount-to-words.test.js`

**Interfaces:**
- Consumes: Task 3's validated `toCents`.
- Produces: `formatAmount(amount: number, opts?: { guard?: boolean }) -> string`. Guard defaults to **true** (prefix `**`). Exported alongside `amountToWords` in `ChequeAmount`.

- [ ] **Step 1: Add failing tests**

In `tests/amount-to-words.test.js`, change the require line at the top to:

```js
const { amountToWords, formatAmount } = require('../amount-to-words.js');
```

Append:

```js
test('formatAmount groups thousands with guard by default', () => {
  assert.equal(formatAmount(12345.67), '**12,345.67');
});

test('formatAmount pads centavos to two digits', () => {
  assert.equal(formatAmount(500), '**500.00');
});

test('formatAmount without guard', () => {
  assert.equal(formatAmount(12345.67, { guard: false }), '12,345.67');
});

test('formatAmount groups millions', () => {
  assert.equal(formatAmount(999999999.99), '**999,999,999.99');
});

test('formatAmount shares validation', () => {
  assert.throws(() => formatAmount(0), RangeError);
  assert.throws(() => formatAmount(NaN), TypeError);
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `node --test`
Expected: the 5 new tests FAIL — `formatAmount is not a function`; 26 prior tests pass.

- [ ] **Step 3: Implement `formatAmount`**

In `amount-to-words.js`, add after `amountToWords` and extend the export:

```js
  function formatAmount(amount, opts) {
    const guard = !opts || opts.guard !== false;
    const cents = toCents(amount);
    const pesos = Math.floor(cents / 100);
    const centavos = cents % 100;
    return (guard ? '**' : '')
      + pesos.toLocaleString('en-US')
      + '.' + String(centavos).padStart(2, '0');
  }

  const api = { amountToWords, formatAmount };
```

(Replace the existing `const api = { amountToWords };` line.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test`
Expected: 31 passing, 0 failing.

- [ ] **Step 5: Commit**

```bash
git add amount-to-words.js tests/amount-to-words.test.js
git commit -m "Add formatAmount with comma grouping and asterisk guard"
```

---

### Task 5: `cheque.html` — form, live preview, validation gating

**Files:**
- Create: `cheque.html`

**Interfaces:**
- Consumes: global `ChequeAmount.amountToWords` / `.formatAmount` (throws `TypeError`/`RangeError` with human-readable `.message`).
- Produces: the `DEFAULTS` settings object shape and element IDs (`#payee`, `#amount`, `#errors`, `#printBtn`, `#sheet`, `#cheque`, `#f-payee`, `#f-words`, `#f-amount`) plus functions `applyLayout()` and `render()` that Tasks 6–7 extend. Body class `invalid` is toggled by `render()` — Task 7's print CSS relies on it.

- [ ] **Step 1: Create `cheque.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Cheque Writer</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; margin: 24px; }
  h1 { font-size: 1.2rem; }
  #controls { max-width: 420px; display: grid; gap: 12px; }
  label { display: grid; gap: 4px; font-size: 0.9rem; }
  input[type="text"], input[type="number"] { padding: 6px 8px; font-size: 1rem; }
  #errors { color: #b00020; min-height: 1.2em; font-size: 0.9rem; white-space: pre-line; }
  #printBtn { padding: 8px 16px; font-size: 1rem; width: fit-content; }
  #printBtn:disabled { opacity: 0.5; }

  #sheet { margin-top: 24px; }
  #cheque {
    position: relative;
    border: 1px dashed #888;
    background-size: 100% 100%;
    background-repeat: no-repeat;
  }
  .field {
    position: absolute;
    white-space: nowrap;
    overflow: hidden;
    font-family: "Courier New", monospace;
  }
</style>
</head>
<body>
<main id="app">
  <h1>Cheque Writer</h1>
  <div id="controls">
    <label>Payee
      <input id="payee" type="text" autocomplete="off">
    </label>
    <label>Amount (PHP)
      <input id="amount" type="number" min="0.01" max="999999999.99" step="0.01">
    </label>
    <div id="errors"></div>
    <button id="printBtn" disabled>Print</button>
  </div>
</main>

<section id="sheet">
  <div id="cheque">
    <span class="field" id="f-payee"></span>
    <span class="field" id="f-words"></span>
    <span class="field" id="f-amount"></span>
  </div>
</section>

<script src="amount-to-words.js"></script>
<script>
'use strict';
const { amountToWords, formatAmount } = ChequeAmount;

const DEFAULTS = {
  chequeWidthMm: 178,
  chequeHeightMm: 76,
  offsetXMm: 0,
  offsetYMm: 0,
  guard: true,
  fill: false,
  fields: {
    payee:  { xMm: 25,  yMm: 20, widthMm: 115, fontPt: 11 },
    words:  { xMm: 15,  yMm: 31, widthMm: 150, fontPt: 11 },
    amount: { xMm: 142, yMm: 20, widthMm: 32,  fontPt: 11 },
  },
};

let settings = structuredClone(DEFAULTS);

const els = {
  payee: document.getElementById('payee'),
  amount: document.getElementById('amount'),
  errors: document.getElementById('errors'),
  printBtn: document.getElementById('printBtn'),
  cheque: document.getElementById('cheque'),
  fields: {
    payee: document.getElementById('f-payee'),
    words: document.getElementById('f-words'),
    amount: document.getElementById('f-amount'),
  },
};

function applyLayout() {
  els.cheque.style.width = settings.chequeWidthMm + 'mm';
  els.cheque.style.height = settings.chequeHeightMm + 'mm';
  for (const key of Object.keys(settings.fields)) {
    const f = settings.fields[key];
    const el = els.fields[key];
    el.style.left = (f.xMm + settings.offsetXMm) + 'mm';
    el.style.top = (f.yMm + settings.offsetYMm) + 'mm';
    el.style.width = f.widthMm + 'mm';
    el.style.fontSize = f.fontPt + 'pt';
  }
}

function render() {
  const errors = [];

  const payee = els.payee.value.trim();
  if (!payee) errors.push('Payee is required.');
  els.fields.payee.textContent = payee;

  let words = '';
  let numeric = '';
  if (els.amount.value === '') {
    errors.push('Amount is required.');
  } else {
    try {
      const amount = Number(els.amount.value);
      words = amountToWords(amount);
      numeric = formatAmount(amount, { guard: settings.guard });
    } catch (e) {
      errors.push('Amount ' + e.message + '.');
    }
  }
  els.fields.words.textContent = words;
  els.fields.amount.textContent = numeric;

  els.errors.textContent = errors.join('\n');
  els.printBtn.disabled = errors.length > 0;
  document.body.classList.toggle('invalid', errors.length > 0);
}

els.payee.addEventListener('input', render);
els.amount.addEventListener('input', render);
els.printBtn.addEventListener('click', () => window.print());

applyLayout();
render();
</script>
</body>
</html>
```

- [ ] **Step 2: Manually verify in the browser**

Run: `open /Users/jason/claude-code/cheque-writer/cheque.html`

Check each of these:
1. Empty form → errors show "Payee is required." and "Amount is required.", Print disabled.
2. Payee `Juan dela Cruz`, amount `12345.67` → words field shows *Twelve Thousand Three Hundred Forty-Five Pesos and 67/100 Only*, amount field shows `**12,345.67`, Print enabled, no errors.
3. Amount `0` → error "Amount must be at least 0.01.", Print disabled, words/amount fields empty.
4. Amount `1000000000` → error "Amount must not exceed 999,999,999.99.", Print disabled.
5. The dashed cheque outline is 178 mm × 76 mm and the three texts sit inside it.

- [ ] **Step 3: Commit**

```bash
git add cheque.html
git commit -m "Add cheque form with live preview and validation gating"
```

---

### Task 6: Setup mode — persistence and calibration controls

**Files:**
- Modify: `cheque.html`

**Interfaces:**
- Consumes: Task 5's `settings`, `DEFAULTS`, `applyLayout()`, `render()`, `els`.
- Produces: `loadSettings()`, `saveSettings()`, localStorage keys `cheque-writer-settings-v1` and `cheque-writer-bg-v1`, field selection state `selectedField`. Task 7 relies on the `guard`/`fill` checkboxes re-rendering via `render()`.

- [ ] **Step 1: Add the setup panel markup**

In `cheque.html`, insert directly after the `</div>` that closes `#controls` (still inside `<main id="app">`):

```html
  <details id="setup">
    <summary>Setup / calibration</summary>
    <div id="setup-grid">
      <label>Cheque width (mm)
        <input id="s-width" type="number" step="0.5" min="100" max="215">
      </label>
      <label>Cheque height (mm)
        <input id="s-height" type="number" step="0.5" min="50" max="120">
      </label>
      <label>Print offset X (mm)
        <input id="s-offx" type="number" step="0.5" min="-20" max="20">
      </label>
      <label>Print offset Y (mm)
        <input id="s-offy" type="number" step="0.5" min="-20" max="20">
      </label>
      <label class="row"><input id="s-guard" type="checkbox">
        Asterisk guard on numeric amount</label>
      <label class="row"><input id="s-fill" type="checkbox">
        Fill words line with trailing asterisks</label>
      <label>Background (photo/scan of a sample cheque)
        <input id="s-bg" type="file" accept="image/*">
      </label>
      <button id="s-bg-clear" type="button">Remove background</button>
      <fieldset>
        <legend>Field: <span id="s-selname">none selected</span></legend>
        <p>Click a field on the preview to select it, then drag it or nudge:</p>
        <div id="nudges">
          <button type="button" data-nudge="0,-0.5">↑</button>
          <button type="button" data-nudge="0,0.5">↓</button>
          <button type="button" data-nudge="-0.5,0">←</button>
          <button type="button" data-nudge="0.5,0">→</button>
        </div>
        <label>Font size (pt)
          <input id="s-font" type="number" step="0.5" min="8" max="16">
        </label>
        <label>Field width (mm)
          <input id="s-fwidth" type="number" step="1" min="10" max="200">
        </label>
      </fieldset>
      <button id="s-reset" type="button">Reset all settings</button>
    </div>
  </details>
```

And add to the `<style>` block:

```css
  #setup { max-width: 420px; margin-top: 12px; }
  #setup-grid { display: grid; gap: 10px; padding: 8px 0; }
  #setup label.row { display: flex; gap: 8px; align-items: center; }
  #nudges button { width: 36px; height: 28px; }
  fieldset { display: grid; gap: 8px; }
  .field.selected { outline: 2px solid #0a84ff; outline-offset: 1px; }
  body.setup-open .field { cursor: move; }
```

- [ ] **Step 2: Add persistence and wire the controls**

In the inline script, replace the line `let settings = structuredClone(DEFAULTS);` with:

```js
const SETTINGS_KEY = 'cheque-writer-settings-v1';
const BG_KEY = 'cheque-writer-bg-v1';

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const saved = JSON.parse(raw);
    const merged = { ...structuredClone(DEFAULTS), ...saved };
    merged.fields = {};
    for (const key of Object.keys(DEFAULTS.fields)) {
      merged.fields[key] = { ...DEFAULTS.fields[key], ...(saved.fields || {})[key] };
    }
    return merged;
  } catch {
    return structuredClone(DEFAULTS);
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

let settings = loadSettings();
let selectedField = null;
```

Then append the setup wiring before the final `applyLayout();` / `render();` lines:

```js
// ---- setup mode ----
const setup = {
  root: document.getElementById('setup'),
  width: document.getElementById('s-width'),
  height: document.getElementById('s-height'),
  offx: document.getElementById('s-offx'),
  offy: document.getElementById('s-offy'),
  guard: document.getElementById('s-guard'),
  fill: document.getElementById('s-fill'),
  bg: document.getElementById('s-bg'),
  bgClear: document.getElementById('s-bg-clear'),
  selname: document.getElementById('s-selname'),
  font: document.getElementById('s-font'),
  fwidth: document.getElementById('s-fwidth'),
  reset: document.getElementById('s-reset'),
};

function syncSetupInputs() {
  setup.width.value = settings.chequeWidthMm;
  setup.height.value = settings.chequeHeightMm;
  setup.offx.value = settings.offsetXMm;
  setup.offy.value = settings.offsetYMm;
  setup.guard.checked = settings.guard;
  setup.fill.checked = settings.fill;
  if (selectedField) {
    setup.selname.textContent = selectedField;
    setup.font.value = settings.fields[selectedField].fontPt;
    setup.fwidth.value = settings.fields[selectedField].widthMm;
  } else {
    setup.selname.textContent = 'none selected';
    setup.font.value = '';
    setup.fwidth.value = '';
  }
}

function updateSetting(fn) {
  fn();
  saveSettings();
  applyLayout();
  render();
}

setup.root.addEventListener('toggle', () => {
  document.body.classList.toggle('setup-open', setup.root.open);
});

setup.width.addEventListener('input', () =>
  updateSetting(() => { settings.chequeWidthMm = Number(setup.width.value) || DEFAULTS.chequeWidthMm; }));
setup.height.addEventListener('input', () =>
  updateSetting(() => { settings.chequeHeightMm = Number(setup.height.value) || DEFAULTS.chequeHeightMm; }));
setup.offx.addEventListener('input', () =>
  updateSetting(() => { settings.offsetXMm = Number(setup.offx.value) || 0; }));
setup.offy.addEventListener('input', () =>
  updateSetting(() => { settings.offsetYMm = Number(setup.offy.value) || 0; }));
setup.guard.addEventListener('change', () =>
  updateSetting(() => { settings.guard = setup.guard.checked; }));
setup.fill.addEventListener('change', () =>
  updateSetting(() => { settings.fill = setup.fill.checked; }));

function applyBackground() {
  const dataUrl = localStorage.getItem(BG_KEY);
  els.cheque.style.backgroundImage = dataUrl ? 'url(' + dataUrl + ')' : 'none';
}

setup.bg.addEventListener('change', () => {
  const file = setup.bg.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      localStorage.setItem(BG_KEY, reader.result);
    } catch {
      els.errors.textContent =
        'Background image too large for localStorage — use a photo under ~2 MB.';
      return;
    }
    applyBackground();
  };
  reader.readAsDataURL(file);
});

setup.bgClear.addEventListener('click', () => {
  localStorage.removeItem(BG_KEY);
  setup.bg.value = '';
  applyBackground();
});

setup.reset.addEventListener('click', () => {
  localStorage.removeItem(SETTINGS_KEY);
  localStorage.removeItem(BG_KEY);
  settings = structuredClone(DEFAULTS);
  selectedField = null;
  setup.bg.value = '';
  applyBackground();
  syncSetupInputs();
  applyLayout();
  render();
});

// field selection + nudge + drag
function selectField(key) {
  selectedField = key;
  for (const [k, el] of Object.entries(els.fields)) {
    el.classList.toggle('selected', k === key);
  }
  syncSetupInputs();
}

for (const btn of document.querySelectorAll('#nudges button')) {
  btn.addEventListener('click', () => {
    if (!selectedField) return;
    const [dx, dy] = btn.dataset.nudge.split(',').map(Number);
    updateSetting(() => {
      settings.fields[selectedField].xMm += dx;
      settings.fields[selectedField].yMm += dy;
    });
  });
}

setup.font.addEventListener('input', () => {
  if (!selectedField) return;
  updateSetting(() => {
    settings.fields[selectedField].fontPt = Number(setup.font.value) || 11;
  });
});

setup.fwidth.addEventListener('input', () => {
  if (!selectedField) return;
  updateSetting(() => {
    settings.fields[selectedField].widthMm = Number(setup.fwidth.value) || 100;
  });
});

for (const [key, el] of Object.entries(els.fields)) {
  el.addEventListener('pointerdown', (down) => {
    if (!setup.root.open) return;
    selectField(key);
    down.preventDefault();
    const pxPerMm = els.cheque.getBoundingClientRect().width / settings.chequeWidthMm;
    const start = { x: down.clientX, y: down.clientY,
      xMm: settings.fields[key].xMm, yMm: settings.fields[key].yMm };
    function move(ev) {
      settings.fields[key].xMm = start.xMm + (ev.clientX - start.x) / pxPerMm;
      settings.fields[key].yMm = start.yMm + (ev.clientY - start.y) / pxPerMm;
      applyLayout();
    }
    function up() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      // snap to 0.5 mm and persist
      settings.fields[key].xMm = Math.round(settings.fields[key].xMm * 2) / 2;
      settings.fields[key].yMm = Math.round(settings.fields[key].yMm * 2) / 2;
      saveSettings();
      applyLayout();
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });
}

applyBackground();
syncSetupInputs();
```

- [ ] **Step 3: Manually verify in the browser**

Run: `open /Users/jason/claude-code/cheque-writer/cheque.html`

Check each of these:
1. Open "Setup / calibration" → inputs show defaults (178 / 76 / 0 / 0, guard checked, fill unchecked).
2. Change cheque width to 170 → outline narrows immediately; reload the page → still 170.
3. With setup open, click the payee field → it gets a blue outline, fieldset shows "payee". Nudge → moves 0.5 mm per click; drag → follows the pointer, position survives reload.
4. Uncheck asterisk guard → numeric preview loses the `**` prefix immediately.
5. Choose a background image → it appears stretched across the cheque outline and survives reload; "Remove background" clears it.
6. "Reset all settings" → everything back to defaults, background gone.
7. With setup closed, dragging fields does nothing.

- [ ] **Step 4: Commit**

```bash
git add cheque.html
git commit -m "Add setup mode with persistence, drag/nudge calibration, and background"
```

---

### Task 7: Print CSS, auto-shrink, and asterisk fill

**Files:**
- Modify: `cheque.html`

**Interfaces:**
- Consumes: Task 5's `render()`/body `invalid` class, Task 6's `settings.fill`.
- Produces: the final print path. `fitText(el, maxPt) -> boolean` (false = doesn't fit at the 8 pt floor).

- [ ] **Step 1: Add print CSS**

Append to the `<style>` block in `cheque.html`:

```css
  @page { size: letter portrait; margin: 0; }
  @media print {
    body { margin: 0; }
    #app { display: none; }
    #sheet { margin: 0; }
    #cheque { border: none; background-image: none !important; }
    .field { outline: none; }
    /* Hard stop: even Cmd+P prints nothing when the form is invalid. */
    body.invalid .field { visibility: hidden; }
  }
```

- [ ] **Step 2: Add `fitText` and the fill logic to `render()`**

In the inline script, add above `render()`:

```js
const MIN_FONT_PT = 8;

// Shrinks el's font from maxPt in 0.5pt steps until its content fits.
// Returns false if it still overflows at the MIN_FONT_PT floor.
function fitText(el, maxPt) {
  let pt = maxPt;
  el.style.fontSize = pt + 'pt';
  while (el.scrollWidth > el.clientWidth && pt > MIN_FONT_PT) {
    pt -= 0.5;
    el.style.fontSize = pt + 'pt';
  }
  return el.scrollWidth <= el.clientWidth;
}

function fillWithAsterisks(el) {
  let text = el.textContent + ' ';
  el.textContent = text;
  let guardCount = 0;
  while (el.scrollWidth <= el.clientWidth && guardCount < 500) {
    text += '*';
    el.textContent = text;
    guardCount++;
  }
  el.textContent = text.slice(0, -1);
}
```

Then in `render()`, replace the two lines

```js
  els.errors.textContent = errors.join('\n');
  els.printBtn.disabled = errors.length > 0;
```

with:

```js
  const labels = { payee: 'Payee', words: 'Amount in words', amount: 'Amount' };
  for (const key of Object.keys(els.fields)) {
    const el = els.fields[key];
    if (!el.textContent) continue;
    if (!fitText(el, settings.fields[key].fontPt)) {
      errors.push(labels[key] + ' does not fit its field even at '
        + MIN_FONT_PT + ' pt — widen the field or shorten the text.');
    }
  }
  if (settings.fill && els.fields.words.textContent && errors.length === 0) {
    fillWithAsterisks(els.fields.words);
  }

  els.errors.textContent = errors.join('\n');
  els.printBtn.disabled = errors.length > 0;
```

- [ ] **Step 3: Manually verify in the browser**

Run: `open /Users/jason/claude-code/cheque-writer/cheque.html`

Check each of these:
1. Valid payee + amount → Cmd+P preview shows ONLY the three text strings on a letter-portrait page, near the top-left; no outline, no form, no background image.
2. Clear the payee, then Cmd+P → the print preview page is blank (invalid state prints nothing).
3. Amount `999999999.99` with a narrow words field (e.g. width 80 mm in setup) → words font visibly shrinks; make it 40 mm → error "Amount in words does not fit its field even at 8 pt…" and Print disables.
4. Enable "Fill words line with trailing asterisks" → words line pads with `*` up to the field width; disable → padding gone.
5. Print one page on plain paper: margins None, scale 100%, headers/footers off. Confirm the three strings land roughly where a cheque held at the sheet's top edge would want them.

- [ ] **Step 4: Commit**

```bash
git add cheque.html
git commit -m "Add print CSS with invalid-print block, font auto-shrink, and asterisk fill"
```

---

### Task 8: README status update and push

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: everything prior — this task ships it.
- Produces: nothing new; final state pushed to origin.

- [ ] **Step 1: Update README status**

In `README.md`, replace the blockquote

```markdown
> **Status:** design approved, implementation in progress. See
> [`docs/superpowers/specs/2026-07-05-cheque-layout-design.md`](docs/superpowers/specs/2026-07-05-cheque-layout-design.md).
```

with:

```markdown
> Design spec: [`docs/superpowers/specs/2026-07-05-cheque-layout-design.md`](docs/superpowers/specs/2026-07-05-cheque-layout-design.md).
```

- [ ] **Step 2: Run the full test suite one last time**

Run: `node --test`
Expected: 31 passing, 0 failing.

- [ ] **Step 3: Commit and push**

```bash
git add README.md
git commit -m "Mark README as shipped"
git push origin main
```

- [ ] **Step 4: Physical calibration (user-driven, not automatable)**

Tell Jason the tool is ready for the paper-overlay calibration from the README: measure the sample cheque, enter W×H in setup, drop in a photo, position the fields, test-print on plain paper, tune the global X/Y offset. This step is complete when he confirms a real cheque prints correctly.
