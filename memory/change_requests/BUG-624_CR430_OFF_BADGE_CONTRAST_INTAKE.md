# BUG-624 — CR-430 OFF Badge Unreadable (White Text on Light Grey)

**ID:** BUG-624  **Type:** BUG  **Registered:** 2026-10-28  **Sprint:** nov_cr_batch
**Severity:** P3  **Risk:** LOW  **Status:** GATE_1_INTAKE_COMPLETE
**Source:** QA-FOUND (QA batch 2026-10-28, testing agent iteration_10)
**Related:** CR-430

## Description
StatusConfigPage.jsx — the "Auto-expand Served Items" toggle OFF badge uses white text (`color: '#fff'`) on `COLORS.borderGray` background (very light grey). This makes the "OFF" label nearly unreadable. Other toggles on the same page (e.g. "Stay on Order Entry") use dark grey text for OFF state.

## Evidence
- `StatusConfigPage.jsx:1026`: `style={{ backgroundColor: servedAutoExpand ? COLORS.primaryGreen : COLORS.borderGray, color: '#fff' }}`
- The `color: '#fff'` is always white regardless of ON/OFF state
- Confidence: CONFIRMED (QA browser screenshot)

## Blast Radius
SMALL — 1 file, 1 line. CSS-only change.

## Fix Scope
Change `color: '#fff'` to conditional: green ON → white, grey OFF → dark text (`COLORS.darkText` or `#374151`).
