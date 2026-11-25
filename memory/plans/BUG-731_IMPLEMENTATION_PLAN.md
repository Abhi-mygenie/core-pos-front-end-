# IMPLEMENTATION PLAN (Gate 3) — BUG-731

**Date:** 2026-11-20 · **Role:** PLANNING (Gate 3 — plan only, NO code) · **Risk:** MEDIUM · **Priority:** P0
**Item:** BUG-731 — "Check In" system marker leaks into ScanOrderPopOut (rendered as KOT item; inflates count/KOT selection).
**Depends on IA:** `impact/BUG-731_IMPACT_ANALYSIS.md` · **Conflict:** CLEAN · **Single file:** `frontend/src/components/dashboard/ScanOrderPopOut.jsx`

---

## Strategy
Introduce one source-of-truth `visibleItems` (= order items minus `isCheckInMarker`) right after `activeOrder` is derived, and route every list/count/KOT-selection read through it. Mirrors `CartPanel.visibleCartItems` (CartPanel.jsx L874). Presentation + selection only — the marker is already price-0/tax-0 so no bill-math/payload value changes, only its accidental inclusion is removed.

## Edits (all in `ScanOrderPopOut.jsx`)

**E1 — add single source (after L326 `const activeOrder = …`)**
```js
// BUG-731: hide backend "Check In" system marker (see orderTransform.js L292-309)
const visibleItems = (activeOrder.items || []).filter(it => !it?.isCheckInMarker);
```

**E2 — `newItems` (L332)** — replace source list:
`const newItems = isEditMode ? (activeOrder.items || []).filter(...)` → `… ? visibleItems.filter(it => it.isNotConfirmed && it.status !== 'cancelled') : [];`

**E3 — `prevItems` (L333)**:
`const prevItems = isEditMode ? (activeOrder.items || []).filter(it => !it.isNotConfirmed) : [];` → use `visibleItems.filter(...)`.

**E4 — `kotSelectedItems` (L335)**:
`(activeOrder.items || []).filter(it => selectedItemIds.has(it.id))` → `visibleItems.filter(it => selectedItemIds.has(it.id))`. (Belt-and-braces: marker can't be in the selectable set anymore, so it can never reach the KOT payload.)

**E5 — items container guard (L518)**:
`{Array.isArray(activeOrder.items) && activeOrder.items.length > 0 ? (` → `{visibleItems.length > 0 ? (`
(so a marker-only order doesn't render an empty items box).

**E6 — normal-mode Select-all block (L595-626)** — replace the three `(activeOrder.items || [])` reads with `visibleItems`:
- L595-597 the `some(...)` gate
- L607-609 the `checked` `filter(...).every(...)`
- L612-614 the `onChange` `selectable = (activeOrder.items||[]).filter(...)`
- L621-626 the label `filter(...).every(...)` and the `(… .length)` count
(the inner `status!=='cancelled' && foodStatus!==3` predicate stays unchanged — just the base list changes.)

**E7 — Mode A list map (L632)**:
`{[...(activeOrder.items || [])].sort((a,b) => {…APS…}).map(...)}` → `{[...visibleItems].sort((a,b) => {…}).map(...)}`.

**E8 — `formatItemCount` helper (L170-175)** — exclude marker from the count:
```js
const items = (Array.isArray(order?.items) ? order.items : []).filter(it => !it?.isCheckInMarker);
```
(rest of the helper unchanged.)

> Mode B `newItems`/`prevItems` `.map` (L553-587) need no direct edit — they consume E2/E3 which are now marker-free.

## Tests (add)
New `frontend/src/__tests__/components/dashboard/BUG731_CheckInMarker.test.jsx` (or extend `CR547_SelectiveKOT.test.jsx`):
1. Order with a normal item + one `{ isCheckInMarker: true, name: 'check in', price: 0 }` → popout renders only the normal item; no "check in" text.
2. `formatItemCount` / count label = non-marker count.
3. onPrintKOT present → Select-all selects only real items; `KOT (n)` excludes marker; marker never in the `kotSelectedItems` passed to `onPrintKOT`.
4. Regression: order with no marker renders identically (snapshot of row count unchanged).

## Verification (post-impl → QA, from IA §6)
Browser smoke on a checked-in-room order: marker absent in Mode A / Mode B / prev; count correct; Select-all → KOT count excludes marker; non-marker orders unchanged (CR-557 parity).

## Rollback
Single file; revert the E1-E8 diff (~8-12 lines). No data/migration/backend impact.

## Scope lock
WILL change: `ScanOrderPopOut.jsx` + 1 new test file. WILL NOT touch: `PopoutItemRow.jsx`, `orderTransform.js`, `DashboardPage.jsx`, socket/print/payment files.

## Handover (→ IMPLEMENTATION)
Gate 3 complete. BUG-731 → **GATE_3_IMPL_PLAN_COMPLETE**. Mechanical edit list above; no owner decision; conflict CLEAN; sequences after CR-557 (already at HEAD). Ready to implement.
