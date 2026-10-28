# BUG-623 — Null Variation Entry Crashes orderTransform.reduce + BUG-618 Markers Missing

**ID:** BUG-623  **Type:** BUG  **Registered:** 2026-10-28  **Sprint:** nov_cr_batch
**Severity:** P1  **Risk:** MEDIUM  **Status:** GATE_1_INTAKE_COMPLETE
**Source:** QA-FOUND (QA batch 2026-10-28, testing agent iteration_10)
**Related:** BUG-618

## Description
`orderTransform.js:722` — `item.variation.reduce((sum, v) => { if (v.price) ... })` reads `v.price` and `v.values` on possibly-null `v`. When aggregator/scan socket re-hydration includes null entries in the variation array, this throws a TypeError. The BUG-618 fix added null guards in `CollectPaymentPanel.getItemLinePrice` but did NOT filter nulls in orderTransform, which is the upstream source.

Additionally, the BUG-618 fix markers in CollectPaymentPanel.jsx say `// BUG-NEW` (L259, L261) instead of `// BUG-618`, breaking code traceability.

## Evidence
- `orderTransform.js:722`: `item.variation.reduce((sum, v) => { if (v.price) ... }` — no null guard on `v`
- `orderTransform.js:706`: `item.variation.map(v => { ... })` — also no null guard
- `CollectPaymentPanel.jsx:259,261`: markers say `BUG-NEW` not `BUG-618`
- Confidence: CONFIRMED (code traced)

## Root Cause
BUG-618 fix was incomplete — guarded the symptom (CollectPaymentPanel crash) but not the source (orderTransform passes null entries through).

## Blast Radius
SMALL — 1 file primary (`orderTransform.js`), 1 file marker fix (`CollectPaymentPanel.jsx`)

## Fix Scope
1. `orderTransform.js:706`: Add `.filter(Boolean)` before `.map()`
2. `orderTransform.js:722`: Add `.filter(Boolean)` before `.reduce()`
3. `CollectPaymentPanel.jsx:259,261`: Relabel `BUG-NEW` → `BUG-618`
