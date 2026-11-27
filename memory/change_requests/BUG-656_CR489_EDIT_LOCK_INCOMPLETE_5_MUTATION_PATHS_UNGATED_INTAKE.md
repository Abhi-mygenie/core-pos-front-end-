# BUG-656 — CR-489 Edit Lock Incomplete: 5 Mutation Paths Ungated Inside OrderEntry

**ID:** BUG-656
**Type:** BUG
**Priority:** P0 (security — renders CR-489 lock ineffective; owner-confirmed)
**Risk:** HIGH (R5 hotspot OrderEntry.jsx + CartPanel.jsx, order mutation paths)
**Sprint:** nov_cr_batch
**Registered:** 2026-11-06
**Registered by:** INTAKE agent
**Source:** OWNER-REPORTED (owner tested printed order #021104 on cafe103 — could add items, edit qty, update order)
**Related:** CR-489 (parent — edit-after-print lock), BUG-583 (billPrinted rendering), CR-512 (print confirmation)

---

## Duplicate Check
- **DISTINCT** — not a duplicate. CR-489 is the feature; this bug is about its incomplete implementation.
- **RELATED:** CR-489 (same `isEditLocked` flag, same spec, same files)

---

## Code Reality
**PARTIAL** — `isEditLocked` exists in OrderEntry (L365) but only gates 4 of 9 mutation paths:

| # | Action | Gated? | Where |
|---|--------|:---:|-------|
| 1 | Order cancel | ✅ | OrderEntry L373 `isOrderCancelAllowed` |
| 2 | Item cancel | ✅ | OrderEntry L377 `isItemCancelAllowed` |
| 3 | Shift table | ✅ | OrderEntry L2008 `!isEditLocked` |
| 4 | Merge tables | ✅ | OrderEntry L2020 `!isEditLocked` |
| 5 | **Add items from menu** | ❌ | `addToCart()` L805 — no check |
| 6 | **Edit item quantities** | ❌ | CartPanel `PlacedItemRow` L65 — no check |
| 7 | **Update Order button** | ❌ | CartPanel L1632 `place-order-btn` — no check |
| 8 | **Food Transfer per item** | ❌ | CartPanel L1311 `canFoodTransfer` — no check |
| 9 | **Customer name/phone edit** | ❌ | OrderEntry header inputs — no check |

---

## Evidence

- **Screenshot:** Owner opened printed order #021104 → full menu visible (428 items), qty pencils on all items, "Update Order" button active, "Aloo Paratha" successfully added ("Just now" in cart)
- **Steps to reproduce:**
  1. Login as owner@cafe103.com / Qplazm@10
  2. Order #021104 has `bill_print: "Yes"` (green card, printed)
  3. Click the order card → OrderEntry opens
  4. Click any menu item → item added to cart ❌ (should be blocked)
  5. Click qty pencil → quantity editable ❌ (should be blocked)
  6. Click "Update Order" → order updated ❌ (should be blocked)
- **Confidence:** CONFIRMED (live browser, owner reproduced)

---

## Blast Radius

- **SMALL-MEDIUM** (~2 files: OrderEntry.jsx R5 + CartPanel.jsx)
- `isEditLocked` already exists — just needs wiring to 5 more locations
- No new state, no new props, no API changes

---

## Fix Direction (5 edits)

| # | Gap | File | Fix |
|---|-----|------|-----|
| G-1 | Add items from menu | OrderEntry.jsx `addToCart()` L805 | Early return: `if (isEditLocked) { toast warning; return; }` |
| G-2 | Qty edit | CartPanel.jsx `PlacedItemRow` | Thread `isEditLocked` prop → hide pencil icon |
| G-3 | Update Order button | CartPanel.jsx L1632 | `disabled={isEditLocked}` on `place-order-btn` |
| G-4 | Food Transfer | OrderEntry.jsx → CartPanel | `canFoodTransfer={canFoodTransfer && !isEditLocked}` at L2918/L1311 |
| G-5 | Customer edit | OrderEntry.jsx header inputs | `disabled={isEditLocked}` or `readOnly` |

---

## Risk Classification
- **HIGH** — order mutation, R5 hotspot
- Fast Lane: **NO** (R5 file, >1 file, security-sensitive)
- Process: Full gate flow required

---

## Owner Spec (from CR-489 intake, confirmed 2026-11-05)
> "User WITHOUT the right should NOT be able to do **any operation in the order-taking process** for that order. Only Collect Payment allowed."

Current implementation only blocks cancel/shift/merge — violates the spec by allowing add/edit/update/transfer.
