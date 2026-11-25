# QA Handover — CR-551
**Date:** 2026-11-18
**From:** Implementation Agent (Gate 5a complete)
**To:** QA Agent (Gate 5b)
**Item:** CR-551 — ✎ Edit button on cart items (in-place replace)

---

## 1. Verification Matrix (self-test results)

| # | Edit | File | Verification | Result |
|---|------|------|-------------|:---:|
| V1 | E1 | ItemCustomizationModal.jsx:6 | `buttonLabel` prop with default `'Add to Order'` | ✅ |
| V2 | E2 | ItemCustomizationModal.jsx:755 | `{buttonLabel}` renders — no hardcoded "Add to Order" in button body | ✅ |
| V3 | E3 | CartPanel.jsx:262 | `onEdit`, `isEditLocked`, `isPrepaid` in NewItemRow signature | ✅ |
| V4 | E4 | CartPanel.jsx:302 | Edit button with `data-testid="edit-item-btn-{id}"` | ✅ |
| V5 | E5 | CartPanel.jsx:1353–1355 | 3 new props threaded into NewItemRow render | ✅ |
| V6 | E6 | OrderEntry.jsx:970–985 | `workingCart` block + 3 replacements (5 grep hits) | ✅ |
| V7 | E7 | OrderEntry.jsx:2964 | `onEdit` → `setCustomizationItem({ ...item, _editMode: true })` | ✅ |
| V8 | E8 | OrderEntry.jsx:3031 | `buttonLabel={..._editMode ? 'Save Changes' : 'Add to Order'}` | ✅ |
| V13 | — | — | webpack `compiled with 1 warning` — same pre-existing warning, 0 new | ✅ |

---

## 2. Browser Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| V9 | Edit replaces in place | Add Pasta (Wheat) → ✎ Edit → change to Rice → Save Changes | 1 item (Rice), no duplicate |
| V10 | Customize unchanged | Add Pasta (Wheat) → Customize → change to Rice → Add to Order | 2 items (original Wheat + new Rice line) |
| V11 | Edit button hidden — plain item | Add plain item (no variants/addons) | No ✎ Edit button; Customize visible |
| V12 | Edit button hidden — locked | Scenario with isEditLocked=true (bill printed) | No ✎ Edit button |
| V13 | Modal button text | Tap ✎ Edit | Modal footer says **"Save Changes"** (green) |
| V14 | Modal button text — Customize | Tap Customize | Modal footer says **"Add to Order"** |
| V15 | Edit + merge edge case | Cart: Pasta(Rice)×2 + Pasta(Wheat)×1 → Edit Wheat → Rice → Save | Pasta(Rice)×3 |
| V16 | CR-482 kbd — Ctrl+Enter in Edit mode | Open via ✎ Edit, Ctrl+Enter | Saves correctly (same as button click) |

---

## 3. Regression scope

| Area | Risk | Notes |
|------|------|-------|
| Customize button flow | NONE | Zero changes — `addCustomizedItemToCart` unchanged for `_editMode=false` |
| BUG-246 merge logic | NONE | `workingCart` feeds the same merge code |
| BUG-374 `_cartKey` identity | NONE | Edit uses `_cartKey` to find original; existing pattern |
| CR-482 keyboard nav | NONE | `lastAddedKeyRef` updated same as before; Ctrl+Enter calls same handler |
| BUG-656 edit lock | NONE | `isEditLocked` now gates Edit button — Customize unaffected |

---

## 4. Files changed

| File | Key changes |
|------|------------|
| `src/components/order-entry/ItemCustomizationModal.jsx` | L6, L755 |
| `src/components/order-entry/CartPanel.jsx` | L262, L293–312, L1353–1355 |
| `src/components/order-entry/OrderEntry.jsx` | L970–985, L2964, L3031 |
