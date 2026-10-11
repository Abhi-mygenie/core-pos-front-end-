# BUG-527 — IMPACT ANALYSIS (Gate 2)
## Dashboard CPP: Check-In Discount Missing + Split Button Gray

**Date:** 2026-10-09
**Role:** PLANNING (Gate 2)
**Status:** GATE_2_IMPACT_ANALYSIS
**Sprint:** oct_bug_batch

---

## Code Reality: NONE

```bash
grep -rn "BUG-527" /app/frontend/src/  # 0 results
grep -rn "checkout-room-checkin-discount" /app/frontend/src/  # 0 results
```
No fix exists. Proceeding with full plan.

---

## Conflict Pre-check

| File | Last modifier | Date | Conflict? |
|---|---|---|---|
| `CollectPaymentPanel.jsx` | CR-405-B (L1190), BUG-428 (L1836-1843), BUG-360 (L195-203) | 2026-10-01 / 2026-09-16 | NO — target lines L200, L1843-1844, L3311 are distinct from all prior edits |
| `PmsCheckoutDrawer.jsx` | BUG-386 (L160-161, payload) | 2026-09-09 | NO — BUG-425 formula at L278-283 is unchanged since BUG-425 impl |

No open items in registry touch either file. **No conflicts.**

---

## Risk Classification

**Risk: HIGH**
- `CollectPaymentPanel.jsx` is an **R5 hotspot** (explicit in AGENT_PROMPT_ALPHA R5)
- Touches `roomBalance` (financial, checkout amount) and split disabled check (checkout flow)
- `PmsCheckoutDrawer.jsx` is NOT R5 but touches the same financial formula

---

## Data Flow Trace

### Sub-A — Check-in discount absent + wrong roomBalance

```
API: room_info.room_discount_amount = 1000   → roomInfo.discountAmount = 1000 (L412)
     room_payment_summary.remaining_room_balance = 1600  → remainingRoomBalance = 1600 (L431)

CPP roomBalance memo (L195-203):
  roomBalance = Math.max(0, remainingRoomBalance ?? balancePayment ?? 0)
              = Math.max(0, 1600) = 1600   ← discountAmount never subtracted
                                             ← BREAK POINT A

CPP Room section (L1829-1853):
  Room Charge  ₹3,000 → roomInfo.roomPrice ✓
  Lodging GST +₹100   → roomInfo.gstTax ✓
  [MISSING: Check-in Discount −₹1,000]    ← BREAK POINT B  (roomInfo.discountAmount never read)
  Advance Paid −₹1,500 → roomInfo.advancePayment ✓
  Balance ₹1,600       → roomBalance = 1600 ✗ (should be 600)

effectiveTotal (L734):
  = finalTotal(248) + roomBalance(1600) = 1848  ← downstream effect
```

### Sub-B — Split button gray

```
CPP "Remaining" display (L2937):
  = finalTotal(248) - splitSum(248) = 0  → "Remaining: ₹0.00"  ← food-only (already correct)

CPP split disabled check (L3311):
  splitSum(248) < effectiveTotal(1848)  →  TRUE  →  GRAY  ← BREAK POINT C

After Sub-A fix (roomBalance=600):
  effectiveTotal = 248 + 600 = 848
  splitSum(248) < 848  →  still TRUE  →  still GRAY

Fix needed (E3): split check uses `effectiveTotal - roomBalance` (food + associated, not room)
  = 848 - 600 = 248
  splitSum(248) < 248  →  FALSE  →  ENABLED ✓
```

### PmsCheckoutDrawer path

```
PmsCheckoutDrawer L278-283 (BUG-425 formula):
  remainingRoomBalance = 3000 + 100 - 1500 - 0 = 1600  ← discountAmount(1000) never subtracted
  → Same roomBalance=1600 issue for "C/Out" path from dashboard room tile
```

---

## Exact Target Lines (verified)

| Edit | File | Current line | Confirmed content |
|---|---|---|---|
| E1 | CPP L200 | `Math.max(0, roomInfo.roomPaymentSummary?.remainingRoomBalance ?? roomInfo.balancePayment ?? 0)` | ✓ |
| E2 | CPP L1843-1844 | After `)}` close of Lodging GST block, before `<div className="flex justify-between">` Advance Paid | ✓ |
| E3 | CPP L3311 | `splitPayments.reduce(...) < effectiveTotal` | ✓ |
| E4 | PmsCheckoutDrawer L278-283 | BUG-425 formula: `3000+100-1500-0 = 1600` (no discountAmount) | ✓ |

---

## Downstream Consumers of `roomBalance`

| Consumer | Line | Uses roomBalance for | Impact of fix (600 not 1600) |
|---|---|---|---|
| `effectiveTotal` | L734 | Validation + Grand Total | 248+600=848 (correct) ✓ |
| Sticky Bill Summary header | L1316 | Display | Shows ₹848 (correct) ✓ |
| Room section Balance line | L1852 | Display | Shows ₹600 (correct) ✓ |
| Grand Total Stack | L2660, L2675 | Display | Shows Room ₹600 + Grand ₹848 ✓ |
| Split "Remaining" | L2937 | Display (uses `finalTotal`, NOT `roomBalance`) | Unchanged ✓ |
| Checkout button label | L3325 | Display | Shows "Checkout ₹848" ✓ |
| `paymentData.roomBalance` | L1115 | Backend payload | `fbOnlyTotal = 848-600=248` = same as current 1848-1600=248 ✓ |
| Cash disabled check | L3308 | Cashier must enter ≥effectiveTotal | ≥848 (correct — cashier collects full amount) ✓ |
| Split disabled check | L3311 | Cashier split must cover effectiveTotal | **E3 changes to `effectiveTotal-roomBalance=248`** ✓ |

---

## Backend Payload Impact

With E1 (`roomBalance = 600`):

| Field | Current | After fix | Status |
|---|---|---|---|
| `paymentData.roomBalance` | 1600 | 600 | different |
| `fbOnlyTotal = effectiveTotal − roomBalance` | 1848-1600=248 | 848-600=248 | **SAME** ✓ |
| `payment_amount` = fbOnlyTotal | 248 | 248 | **SAME** ✓ |
| `grant_amount` = fbOnlyTotal | 248 | 248 | **SAME** ✓ |
| `order_amount` (when roomBalance>0) | 248 (emitted) | 248 (emitted, still >0) | **SAME** ✓ |
| `paid_room` | `'yes'` | `'yes'` | **SAME** ✓ |

`payment_amount = fbOnlyTotal = effectiveTotal - roomBalance = 248` is unchanged in both cases. The fix is mathematically safe. No curl probe needed (formula verified).

---

## E3 — Split Threshold: `effectiveTotal - roomBalance` (not `finalTotal`)

The split threshold for E3 is `effectiveTotal - roomBalance`, not `finalTotal`:

- `effectiveTotal - roomBalance = finalTotal + (isRoom && assoc.length > 0 ? associatedTotal : 0)`
- Covers: food + any associated/transferred dine-in orders (both paid via CPP split)
- Excludes: room balance (paid by backend via `paid_room=yes`)

For bonk (no associated orders): `effectiveTotal - roomBalance = 248 - 0 = 248` = `finalTotal` ✓

Edge case — room order WITH transferred orders (e.g. associatedTotal=₹300):
- `effectiveTotal - roomBalance = 248+300 = 548`
- Split must cover food+associated (₹548)
- Room balance settled separately
- Out of scope for BUG-527 but handled correctly by the formula

---

## Scope Lock

**Files WILL change:**
- `src/components/order-entry/CollectPaymentPanel.jsx` (R5) — E1, E2, E3
- `src/components/pms/PmsCheckoutDrawer.jsx` — E4

**Files WILL NOT touch:**
- `OrderEntry.jsx` (R5) — NOT needed; OrderEntry passes raw `roomInfo` and CPP fix handles it ✓
- `orderTransform.js` (R5) — NOT needed; `payment_amount` unchanged ✓
- `frontDeskService.js` — NOT needed
- `FolioCheckoutPanel.jsx` — NOT needed (folio path is separate)
- Any test files

---

## Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | E1: `discountAmount` null/undefined in older orders | LOW | MEDIUM — balance reverts to raw 1600 | `(roomInfo.discountAmount \|\| 0)` guard; nullish coercion ✓ |
| R2 | E3: non-room orders affected by `isRoom` condition | NONE | — | Non-room: `roomBalance=0` so `effectiveTotal-0=effectiveTotal` = unchanged ✓ |
| R3 | E4: PmsCheckoutDrawer discountAmount absent on some room types | LOW | MEDIUM | `(detail.roomInfo.discountAmount ?? 0)` guard ✓ |
| R4 | Split "Remaining" shows ₹0.00 but Grand Total ₹848 visible — cashier might be confused | LOW | LOW — Grand Total still clearly shows ₹848 in sticky header | No mitigation needed; owner accepted OD-BUG527-02 |

---

## Owner Decisions

**None required.** All decisions already locked:
- OD-BUG527-01: Check-in discount shown read-only in Room section ✓
- OD-BUG527-02: Food-only split validation; room settled via `paid_room=yes` ✓

---

## Summary

```
Code Reality: NONE
Conflict: NONE (CPP last modified CR-405-B/BUG-428/BUG-360; PmsDrawer: BUG-386)
Risk: HIGH (R5 hotspot + financial)
Files WILL change: CollectPaymentPanel.jsx (R5, 3 edits) + PmsCheckoutDrawer.jsx (1 edit)
Files WILL NOT touch: OrderEntry.jsx (R5), orderTransform.js (R5), FolioCheckoutPanel.jsx
Backend payload: UNCHANGED (payment_amount = fbOnlyTotal = 248 in both cases)
Owner decisions: NONE (all locked)
Ready for Gate 3 GO → Implementation Plan
```
