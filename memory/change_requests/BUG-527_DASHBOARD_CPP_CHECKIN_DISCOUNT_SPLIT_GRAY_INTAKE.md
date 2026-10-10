# BUG-527 — INTAKE
## Dashboard CPP: Check-In Discount Missing from Room Section + Split Validation Food-Only

**ID:** BUG-527
**Date:** 2026-10-09
**Registered by:** Agent (Role 1 — INTAKE)
**Sprint:** oct_bug_batch
**Gate:** GATE_1_INTAKE

---

## Evidence

- **Screenshots:** 5 owner screenshots (session 2026-10-09, dashboard path)
  - SS-1: Dashboard room tile showing bonk r4 ₹1,827
  - SS-2: OrderEntry showing Room ₹1,600, Checkout ₹1,827
  - SS-3: CPP Bill Summary ₹1,848 — Room section: Charge ₹3,000 / GST +₹100 / Advance -₹1,500 / Balance ₹1,600 (check-in discount -₹1,000 ABSENT)
  - SS-4: CPP split Cash=200 UPI=48, Remaining ₹0.00, Checkout ₹1,848 GRAY
  - SS-5: Same split, Remaining ₹0.00, Checkout ₹1,848 GRAY
- **Steps to reproduce:** Provided by owner (§3)
- **Curl output:** N/A (frontend display + validation)
- **Source:** OWNER-REPORTED
- **Confidence:** CONFIRMED (root cause traced in `BUG-527_INVESTIGATION_REPORT_V2_2026-10-09.md`)

---

## 1. Classification

| Field | Value |
|---|---|
| **Type** | BUG |
| **Severity** | **P1 — HIGH** |
| **Risk** | HIGH (R5 hotspot + financial checkout) |
| **Area** | PMS → Dashboard → CollectPaymentPanel.jsx (R5) + PmsCheckoutDrawer.jsx |
| **Duplicate check** | **DISTINCT** — BUG-526: folio path (FolioCheckoutPanel, no CPP change); BUG-498: folio check-in discount (FolioCheckoutPanel, already implemented). BUG-527 is dashboard path, requires CPP (R5). |
| **Related items** | RELATED: BUG-526 (same split-gray symptom, folio path); BUG-498 (check-in discount, folio path) |
| **Blast radius** | SMALL-MEDIUM — 2 files, ~10 lines, 1 R5 hotspot (CollectPaymentPanel.jsx) |
| **Hotspot files** | YES — `CollectPaymentPanel.jsx` (R5) |
| **Fast Lane eligible** | NO — R5 hotspot + financial checkout logic |

**Severity rationale:** P1 — dashboard checkout split payment is broken for all room orders that have a check-in discount. No workaround (cashier cannot split food payment; must use single-mode payment for the wrong amount).

---

## 2. Symptom

### Sub-A — Check-in discount absent from CPP Room section (wrong balance displayed)
From dashboard → OrderEntry → CPP → Room section shows:
- Room Charge: ₹3,000 ✓
- Lodging GST: +₹100 ✓
- **Check-in Discount: MISSING** (should show −₹1,000)
- Advance Paid: −₹1,500 ✓
- **Balance: ₹1,600** ✗ (should be ₹600)

The check-in discount (₹1,000) is stored in `roomInfo.discountAmount` (from API `room_discount_amount`) but CPP never reads or displays it. The `roomBalance` memo uses `remainingRoomBalance = 1,600` without subtracting `discountAmount`.

### Sub-B — Split payment button gray (food-only split blocked)
CPP effectiveTotal = food(₹248) + room(₹1,600) = ₹1,848. When cashier uses split to cover food only (Cash=200 + UPI=48 = ₹248), the split disabled check sees `248 < 1,848` → button stays gray. CPP "Remaining: ₹0.00" displays (food-only, correct for food coverage) but contradicts the gray button.

**Owner directive:** Split validation should be food-only (₹248). Room balance (₹600 after discount) is settled by backend via `paid_room=yes`.

---

## 3. Steps to Reproduce

1. Login → Dashboard → Room tab → bonk guest (r4, MG-69-2C201998-53D8-4980-A6A8-B042088BFC9D)
2. Click the room tile → OrderEntry opens (#000361)
3. See "Room ₹1,600" at bottom (should be ₹600)
4. Click "Checkout ₹1,827" → CPP opens
5. Expand Room section: Balance shows ₹1,600, **no Check-in Discount line** (Sub-A)
6. Click Split → By Payment → enter Cash=200, UPI=48 → Remaining=₹0.00
7. **Checkout button GRAY** (Sub-B)

---

## 4. Root Cause (from investigation)

### Sub-A (Balance wrong, no discount line)

**Break Point:** `CollectPaymentPanel.jsx:200`
```js
roomBalance = Math.max(0, roomInfo.roomPaymentSummary?.remainingRoomBalance ?? roomInfo.balancePayment ?? 0)
// = 1600  ← discountAmount (1000) never subtracted
```
`roomInfo.discountAmount = 1000` is available in the prop (from API `room_discount_amount`) but is never read. Room section JSX has no check-in discount line.

**Break Point 2:** `PmsCheckoutDrawer.jsx:278-283` (BUG-425 formula)
```js
remainingRoomBalance = roomPrice(3000) + gstTax(100) - advancePayment(1500) - receiveBalance(0) = 1600
// discountAmount(1000) not subtracted
```

### Sub-B (Split button gray)

**Break Point:** `CollectPaymentPanel.jsx:3311`
```js
(showSplit && splitType === 'payment' && splitPayments.reduce(...) < effectiveTotal)
// splitSum(248) < effectiveTotal(848 after Sub-A fix) → TRUE → DISABLED
```
`effectiveTotal = finalTotal(food=248) + roomBalance`. Split check should use `finalTotal` (food-only) not `effectiveTotal` (food+room).

---

## 5. Owner Decisions — LOCKED

| OD | Decision |
|---|---|
| OD-BUG527-01 | Check-in discount shown read-only in CPP Room section (like Advance Paid). No room discount input or room split legs in dashboard CPP. |
| OD-BUG527-02 | Room Balance = post-discount (₹600). Food-only split validation (₹248 covers the button). Room (₹600) settled by backend `paid_room=yes`. |

---

## 6. Proposed Fix (for Gate 2-3 Planning)

Four edits, 2 files:

| Edit | File | Change | Lines |
|---|---|---|---|
| E1 | `CollectPaymentPanel.jsx` (R5) | `roomBalance` memo: subtract `discountAmount` → 1600-1000=600 | ~2 |
| E2 | `CollectPaymentPanel.jsx` (R5) | Room section JSX: add "Check-in Discount −₹X" line between Lodging GST and Advance Paid | ~6 |
| E3 | `CollectPaymentPanel.jsx` (R5) | Split disabled check (L3311): use `isRoom ? finalTotal : effectiveTotal` | ~1 |
| E4 | `PmsCheckoutDrawer.jsx` | BUG-425 formula: subtract `discountAmount` → 3000+100-1000-1500=600 | ~1 |

Backend payload: unchanged — `payment_amount = fbOnlyTotal = effectiveTotal - roomBalance` = same 248 in both cases (OD-BUG527-01/02 confirmed).

---

## 7. Blast Radius

```bash
grep -rn "remainingRoomBalance\|roomBalance\b" /app/frontend/src/components/order-entry/CollectPaymentPanel.jsx
→ L200 (roomBalance memo) + L1822/1852 (Room section display) + L734 (effectiveTotal) + L3311 (split check) — all in 1 file

grep -n "remainingRoomBalance" /app/frontend/src/components/pms/PmsCheckoutDrawer.jsx
→ L278-283 (BUG-425 formula) — 1 line
```

- **Files:** 2 (`CollectPaymentPanel.jsx` + `PmsCheckoutDrawer.jsx`)
- **Lines:** ~10
- **Hotspot files:** YES — CPP is R5
- **Scope:** SMALL

---

## 8. Intake Summary

```
BUG-527: Dashboard CPP check-in discount missing + split button gray
Type: Bug | Priority: P1 | Risk: HIGH
Area: CollectPaymentPanel.jsx (R5) + PmsCheckoutDrawer.jsx
Sub-A: roomBalance = remainingRoomBalance (1600) − discountAmount (0) = wrong; no discount line in Room section
Sub-B: split check uses effectiveTotal (food+room) not finalTotal (food) → gray
Fix: 4 edits, 2 files, ~10 lines — R5 required, full gate cycle
OD-BUG527-01 LOCKED (check-in discount read-only display)
OD-BUG527-02 LOCKED (food-only split + discounted room balance)
Evidence: 5 owner screenshots + investigation BUG-527_INVESTIGATION_REPORT_V2_2026-10-09.md
Duplicate: DISTINCT (BUG-526 = folio; BUG-498 = folio check-in discount, already done)
Related: BUG-526 (same symptom, folio path)
Blast: SMALL-MEDIUM (2 files, ~10 lines, R5)
Next: Gate 2 Impact Analysis
```
