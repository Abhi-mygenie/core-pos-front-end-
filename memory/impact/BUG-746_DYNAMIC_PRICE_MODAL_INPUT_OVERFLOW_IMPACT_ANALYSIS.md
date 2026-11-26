# BUG-746 — Impact Analysis (Gate 2)

**Item:** BUG-746 — Enter Price modal amount input overflows the modal card
**Role:** PLANNING (Gate 2 — Impact Analysis). **No app code changed.**
**Date:** 2026-11-21 · **Risk:** LOW (CSS/display only, no logic/state/API change)
**Code Reality:** CONFIRMED (overflow-prone pattern present in current source)
**Conflict Pre-Check:** `OrderEntry.jsx` is an R5 hotspot, but the dynamic-price modal region (L3062-3125) is **not owned by any OPEN registry item** (last touch = initial deploy snapshot). Target line L3088 is conflict-free → parallel-safe.
**Intake:** `change_requests/BUG-746_DYNAMIC_PRICE_MODAL_INPUT_OVERFLOW_INTAKE.md`

## 1. Code Reality (verified in `frontend/src/components/order-entry/OrderEntry.jsx`)
- Dynamic-price modal gated by `dynamicPriceItem` — L3062-3125.
- **Card:** L3070-3071 `className="bg-white rounded-xl shadow-xl p-6 w-80"` → fixed **320px** width, `p-6` = 24px padding each side → **272px** inner content width.
- **Row:** L3081 `<div className="flex items-center gap-2 mb-2">` → `₹` span (L3082) + amount input (L3083-3098).
- **Input:** L3088 `className="flex-1 border rounded-lg px-3 py-2 text-base focus:outline-none"` — **`flex-1` with NO `min-w-0`**.
- `box-sizing: border-box` is global (`App.css` `*` L3-7 **and** Tailwind preflight `@tailwind base` in `index.css` L6). → This is **not** a box-model bug.
- Buttons row L3105-3121: Cancel/Add are `flex-1` with only `py-2` (no horizontal padding, no intrinsic min) → they shrink fine and do **not** overflow.

## 2. Root Cause
The amount input is a flex item (`flex: 1 1 0%`) whose default **`min-width: auto`** resolves, for a form control `<input>`, to its intrinsic width (UA `size=20` default ≈ ~180-210px incl. padding). `min-width:auto` prevents the flex item from shrinking below that intrinsic width, so when the track is tight the input pushes past the fixed `w-80` card → horizontal "bleed". Only the input exhibits this because the sibling buttons have no intrinsic-min / no horizontal padding. This matches the owner screenshot (only the ₹ input bleeds; buttons fit).

## 3. Data flow
Pure client-side display. Input value → `dynamicPriceInput` state → `confirmDynamicPriceAndAdd()` (L886) sets the cart-line unit price. **No API payload, no transform, no business logic touched** by this bug or its fix — layout/visibility only.

## 4. Fix direction (for Gate 3 — NOT built here)
- **E1 (primary, recommended):** input className `flex-1 …` → add **`min-w-0`** (i.e. `flex-1 min-w-0 border rounded-lg px-3 py-2 text-base focus:outline-none`). Lets the flex item shrink to the track. 1 class, 1 line.
  - Equivalent alternative: replace `flex-1` with `w-full`.
- **E2 (optional guard):** add `overflow-hidden` to the card (L3071) so no inner child can ever bleed.
- Do NOT change the value binding, `onChange`, `onKeyDown`, autofocus, or `confirmDynamicPriceAndAdd`.

## 5. Affected files
- `frontend/src/components/order-entry/OrderEntry.jsx` (R5) — **L3088** input `className` only (+ optionally L3071 card). **1 file, 1-2 lines.**

## 6. Downstream consumers
None. The fix is cosmetic; cart-line pricing, totals, payment and print are unaffected.

## 7. Risk register
| Risk | L | I | Mitigation |
|---|---|---|---|
| `min-w-0` lets input shrink too small | Low | Low | Card is fixed 320px → min track ≈ 252px; input stays comfortably usable. Verify at mobile 390px (modal still `w-80`). |
| R5 hotspot file edited | Low | Med | Change isolated to one modal's input className; no logic/state/tax/order path near it. Not Fast-Lane eligible (R5) → normal gate + self-test + testing_agent. |

## 8. Owner decisions (surface — do not guess)
- **OD-746-01:** fix approach — (a) add `min-w-0` to the input **[recommended, minimal]**; (b) use `w-full` instead of `flex-1`; (c) (a)+`overflow-hidden` guard on the card. Default if no response: **(a)**.
- **OD-746-02 (repro confirmation):** RESOLVED 2026-11-21 — **owner confirms the bug is on the current build** (not a stale client). `testing_agent` will still reproduce + verify the fix post-implementation.

## 9. Verification note
Gate 2 only — no code written. At Gate 3 the plan will carry a Verification Matrix; after implementation, **`testing_agent` (browser)** must reproduce the overflow on the current build and confirm the input sits inside the card at desktop (1920) and mobile (390). Self-inspection/curl do NOT count as verification.

## 10. Handover
```
Gate 2 complete: BUG-746
Code reality: CONFIRMED (flex-1 input, no min-w-0, in w-80 card) · Risk: LOW · 1 file (OrderEntry.jsx L3088)
RC: form-control flex item with default min-width:auto won't shrink → overflows fixed-width card.
Open decisions: OD-746-01 (fix approach, default=min-w-0), OD-746-02 (confirm stale client via QA repro).
Next: PLANNING Gate 3 (Implementation Plan) on owner GO. No app code changed.
```
