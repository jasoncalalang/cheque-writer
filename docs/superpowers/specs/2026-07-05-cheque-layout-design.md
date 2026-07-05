# Cheque Writer — Design

**Date:** 2026-07-05
**Status:** Approved

## Purpose

A local, zero-dependency tool for printing the payee, amount in words, and numeric
amount onto pre-printed bank cheques. Single user (Jason), occasional use, one bank's
cheque format, calibrated against a physical sample cheque. The date is handwritten
and is NOT printed.

## Decisions (from brainstorming)

- Output: print directly onto real pre-printed bank cheques (not a voucher/document).
- One bank's cheque format; a sample cheque is on hand for calibration.
- Single user, occasional use, local machine — no hosting, no accounts, no backend.
- Fields printed: payee, amount in words, numeric amount. No date.
- Approach: single-page HTML + print CSS (chosen over a Word template and a
  Python→PDF script). Rationale: auto-generated amount-in-words eliminates
  words/figures mismatch; millimetre-precise positioning; fast calibration loop;
  nothing to install or maintain.

## Project structure

```
cheque-writer/
├── cheque.html                     # entire UI + print CSS (open via file://)
├── amount-to-words.js              # pure functions, classic script + module.exports guard
├── tests/
│   └── amount-to-words.test.js     # node --test, no dependencies
├── README.md                       # usage + calibration ritual + print dialog settings
└── docs/superpowers/specs/         # this document
```

`amount-to-words.js` is loaded by `cheque.html` as a classic `<script src>` (ES
modules are blocked over `file://` in Chrome). It exposes globals for the browser and
guards `module.exports` for Node so the same file is testable with `node --test`.

## User flow

1. Open `cheque.html` in the browser.
2. Type payee and numeric amount. The amount-in-words line renders live.
3. Preview shows all three fields positioned on a cheque-sized outline.
4. Cmd+P → print onto the cheque placed in the printer tray.

## Positioning & calibration

- All positions and dimensions are in **millimetres** (CSS `mm` units).
- **Setup mode** (toggleable panel):
  - Enter cheque width/height in mm (measured from the sample).
  - Drop in a photo/scan of the cheque as the preview background (stored as a
    dataURL in localStorage; never printed).
  - Position each field by dragging and/or arrow-button nudging (0.5 mm steps).
  - Per-field font size adjustable.
- **Global X/Y print offset** compensates for printer feed skew: print a test on
  plain paper, hold it over the cheque against a light, adjust the offset, repeat.
- All settings (cheque dimensions, field positions, font sizes, global offset,
  toggles, background image) persist in `localStorage`. A reset-to-defaults button
  clears them. Export/import of settings is OUT of scope (single machine).

## Print CSS

- `@page { size: letter portrait; margin: 0 }` — deliberately NOT a custom cheque-
  sized page: on this Mac/printer setup, custom `@page` sizes print landscape
  (known gotcha). The cheque zone is anchored near the top-left of a letter-sized
  layout; the physical cheque is placed in the tray where a letter sheet's top edge
  feeds. The anchor offset is part of the calibratable global offset.
- Print media hides everything except the three positioned text strings: no form,
  no background image, no cheque outline.
- README documents the required print-dialog settings: margins None, scale 100%,
  no headers/footers.

## Amount-in-words rules (PH cheque convention)

`amountToWords(amount)` returns Title Case words:

| Input        | Output                                                     |
|--------------|------------------------------------------------------------|
| 12345.67     | Twelve Thousand Three Hundred Forty-Five Pesos and 67/100 Only |
| 500          | Five Hundred Pesos Only                                    |
| 1            | One Peso Only                                              |
| 0.50         | Zero Pesos and 50/100 Only                                 |

- Centavos rendered as `NN/100`; omitted entirely when zero.
- Singular `Peso` for exactly one peso; otherwise `Pesos`.
- Hyphenated tens: `Twenty-One` … `Ninety-Nine`.
- Always suffixed ` Only`.
- Range: 0.01 – 999,999,999.99. Input is rounded to 2 decimal places first.
- Out-of-range, zero, negative, or non-numeric input **throws** — callers must
  handle it; nothing silently prints a wrong amount.

## Numeric amount formatting

- `formatAmount(amount, {guard})` → comma-grouped, two decimals: `12,345.67`.
- Asterisk guard prefix against alteration: `**12,345.67`. Toggle, **default on**.
- Optional trailing-asterisk fill for the words line to pad the box. Toggle,
  **default off**.

## Error handling

- Invalid amount (zero, negative, > max, NaN): inline error message, print action
  disabled, words line cleared.
- Words-line overflow: font auto-shrinks to fit the configured field width, down to
  a floor of 8 pt. Below the floor, printing is blocked with a message (never print
  an illegible amount).
- Empty payee: printing blocked with a message.

## Testing

TDD (tests written first) on all pure logic, via `node --test`:

- `amountToWords`: units, teens, tens, hundreds, each thousands group (thousand /
  million), exact pesos (no fraction), one centavo, one peso singular,
  boundary 999,999,999.99, rounding (e.g. 1.005), throws on 0 / negative / NaN /
  overflow.
- `formatAmount`: comma grouping, two-decimal padding, guard toggle on/off.

Physical positioning is verified manually with the paper-overlay test print; the
procedure lives in the README. No browser-automation tests — the layout surface is
one static page and the calibration loop is inherently physical.

## Out of scope (YAGNI)

- Date printing (handwritten by decision).
- Multiple bank presets, multi-user hosting, cheque registers/history, voucher
  printing, batch runs, settings export.
