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

## 8. Intake Summary (Original — E1-E4 IMPLEMENTED 2026-10-10)

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
Status: E1-E4 GATE_5A_IMPLEMENTED 2026-10-10
```

---

## 9. SCOPE REVISION — 2026-10-10 (INTAKE addendum)

**Trigger:** Post-implementation testing confirmed E1-E4 PASS in CPP/PmsDrawer. Owner reports SS-1 (Dashboard tile ₹1,827) and SS-2 (OrderEntry Room ₹1,600) STILL showing pre-discount values. These symptoms were in the ORIGINAL intake but the investigation traced only as far as CPP and missed two upstream call-sites.

**Duplicate check:** BUG-528 (registered 2026-10-10) = DUPLICATE — same root, same fix pattern. CLOSED → absorbed into BUG-527 addendum.

### Additional Break-Points (F1–F4)

**SS-1 root cause — `DashboardPage.jsx:53-55` (R5)**
```js
// computeRoomCardAmount — called to populate room tile total
const roomBal = Math.max(0,
  Number(order?.roomInfo?.roomPaymentSummary?.remainingRoomBalance
    ?? order?.roomInfo?.balancePayment) || 0);
// MISSING: - (order?.roomInfo?.discountAmount || 0)
// Result: roomBal = 1600 → tile total = food(200)+gst(27)+room(1600) = 1827 ✗
```

**SS-2 root cause — `CartPanel.jsx` (NOT R5) — 3 locations**
```js
// F2: roomBalance useMemo (L457-463) — feeds effectiveTotal
const roomBalance = Math.max(0, null ?? remainingRoomBalance ?? balancePayment ?? 0)
// MISSING: - (roomInfo.discountAmount || 0)

// F3: Room display (L1482) — data-testid="cart-room-balance"
₹{(roomSummaryOverride?.remainingRoomBalance ?? remainingRoomBalance ?? balancePayment ?? 0)}
// MISSING: - (roomInfo.discountAmount || 0)

// F4: Checkout button total (L1609)
total + associatedTotal + Math.max(0, roomSummaryOverride?.remainingRoomBalance ?? remainingRoomBalance ?? balancePayment ?? 0)
// MISSING: - (roomInfo?.discountAmount || 0)
```

**`discountAmount` availability:** Confirmed — `orderTransform.js:412` maps `room_discount_amount → discountAmount`. Available in `order.roomInfo` (DashboardPage) and `roomInfo` prop (CartPanel).

### Revised Fix Scope

| Edit | File | R5? | Lines | Status |
|------|------|-----|-------|--------|
| E1 | CollectPaymentPanel.jsx | YES | ~2 | ✅ IMPLEMENTED |
| E2 | CollectPaymentPanel.jsx | YES | ~6 | ✅ IMPLEMENTED |
| E3 | CollectPaymentPanel.jsx | YES | ~1 | ✅ IMPLEMENTED |
| E4 | PmsCheckoutDrawer.jsx | NO | ~1 | ✅ IMPLEMENTED |
| **F1** | **DashboardPage.jsx (R5)** | **YES** | **~2** | **GATE_3_PLAN_COMPLETE — awaiting Gate 4 GO** |
| **F2** | **CartPanel.jsx** | **NO** | **~3** | **GATE_3_PLAN_COMPLETE — awaiting Gate 4 GO** |
| **F3** | **CartPanel.jsx** | **NO** | **~1** | **GATE_3_PLAN_COMPLETE — awaiting Gate 4 GO** |
| **F4** | **CartPanel.jsx** | **NO** | **~1** | **GATE_3_PLAN_COMPLETE — awaiting Gate 4 GO** |

**Total remaining:** 2 files, ~7 lines. DashboardPage.jsx = R5.

### ODs — unchanged (LOCKED)
OD-BUG527-01 + OD-BUG527-02 still apply. No new owner decisions needed — F1-F4 are same pattern/intent as E1.

### Evidence
- **Original:** SS-1, SS-2 in §Evidence above — Dashboard tile ₹1,827, OrderEntry Room ₹1,600
- **New (post-impl test):** `/app/test_reports/iteration_1.json` (2026-10-10) — confirmed F1/F2 FAIL, E1-E4 PASS

```
Intake revision complete: BUG-527
Classification: BUG, P1, HIGH
Scope expanded: +2 files (DashboardPage R5 + CartPanel), +4 locations, ~7 lines
Code reality (F1-F4): NONE (not yet implemented)
Duplicate: BUG-528 → CLOSED (absorbed here)
Blast radius revised: 4 files total, ~17 lines, 2 R5 files
Evidence: original 5 screenshots + iteration_1.json confirms failures
Plan: plans/BUG-527_REVISED_IMPLEMENTATION_PLAN_F1F4_2026_10_10.md
Next: Gate 4 GO → IMPLEMENTATION (F1-F4)
```
