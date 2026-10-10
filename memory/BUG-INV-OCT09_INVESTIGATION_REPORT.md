# INVESTIGATION REPORT — 4 Issues (2026-10-09 Session)
## Role 6 — INVESTIGATION (ALPHA v0.7)

```
Date:            2026-10-09
Trigger:         Owner report — 4 issues on room folio checkout
Items:           BUG-525 (cap bypass), checkout btn missing, discount block position, balance column mismatch
Steps used:      10 / 10
Code changed:    NONE (investigation only)
```

---

## 1. Summary

| Issue | Root Cause | Classification | Confidence |
|---|---|---|---|
| BUG-525: "lower amount still checkout" | PLAN_GAP — only over-balance blocked; under-balance (legs < balance) proceeds | PLAN_GAP | HIGH |
| Checkout btn not appearing | FE_BUG — CSS `overflow:hidden` + `h-full` on CPP clips Pay button when RoomDiscountControls above it | FE_BUG | HIGH |
| Discount block position awkward | Same root cause as above — BUG-519 placed controls above CPP but height constraint wasn't updated | FE_BUG | HIGH |
| Balance ₹827 vs ₹848 discrepancy | DATA_EDGE — InHouse list API `charge.balance_due` (₹827) and folio API `order.amount + baseBalance` (₹848) use different food-total computations. ₹21 gap = likely service charge in order.amount | DATA_EDGE | MEDIUM |

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|---|---|---|---|---|
| H1a | BUG-525 stale closure — `roomSplitOverBalance` missing from `handlePaid` dep array | Code trace (FolioCheckoutPanel.jsx L341) | 1 | **ELIMINATED** — `roomSplitLegs` + `roomSplitEnabled` + `baseBalance` + `roomDiscountInfoRs` are all in dep array; `roomSplitOverBalance` is derived from these; re-render updates it before `handlePaid` re-creates | FolioCheckoutPanel.jsx L341 |
| H1b | BUG-525 PLAN_GAP — under-balance (legs < balance) not blocked | Code trace of `roomSplitOverBalance` useMemo | 2 | **CONFIRMED** — `return effectiveBalance > 0 && roomSplitTotal > effectiveBalance` only fires for OVER-balance; legs = ₹80+₹90=₹170 vs balance ₹600 → roomSplitOverBalance=false → handlePaid proceeds | FolioCheckoutPanel.jsx L285-289 |
| H2a | Checkout btn clipped — `.frontdesk-bill { overflow:hidden; height:560px }` + Room Discount Controls above CPP + CPP `h-full`=560px → total > 560px → Pay btn hidden | Code trace (frontdesk.css + FolioCheckoutPanel.jsx structure) | 3 | **CONFIRMED** — `.frontdesk-bill { width:440px; height:560px; overflow:hidden }`. CPP has `flex flex-col h-full`. RoomDiscountControls section (100-180px) sits ABOVE CPP inside bill-right; CPP starts at y≈100-180 and extends 560px → bottom clips beyond 560px boundary | frontdesk.css L29, CollectPaymentPanel.jsx L1254 |
| H3a | Discount block position = same root cause as H2a | Code reading | 4 | **CONFIRMED** — BUG-519 placed RoomDiscountControls at top of `.bill-right` in `<div data-testid="bill-room-controls">` OUTSIDE CPP; CSS height not updated to accommodate | FolioCheckoutPanel.jsx L369-381 |
| H4a | Balance ₹827 (InHouse column) vs ₹848 (CPP) = different API computations | Code trace (InHousePanel, DeparturesPanel, GuestTable, frontDeskService) | 5 | **CONFIRMED (medium)** — InHouse balance = `charge.balance_due` from InHouse list API = ₹827; CPP bill summary = `order.amount + baseBalance` from folio API = ₹248 + ₹600 = ₹848; ₹21 food-total gap | InHousePanel.jsx L16, DeparturesPanel.jsx L24, CPP L1316, FolioCheckoutPanel.jsx L391-400 |
| H4b | ₹21 difference = service charge included in `order.amount` but not in InHouse `charge.balance_due` | Code trace + mathematical analysis | 6 | **SUSPECTED (medium)** — screenshots show vat test ₹122 + gst test ₹105 = ₹227 food items displayed; `order.amount` = ₹248 = ₹227 + ₹21; SC at ~9.25% on ₹227 ≈ ₹21; cannot confirm without curl (preprod returns 404 on singleOrderNew) | Screenshots #3/#4 showing Statement vs CPP total |

---

## 3. Data Flow Trace

### Issue 1 — BUG-525 Under-Balance

```
User enables split → sets legs: cash=80, upi=90 → roomSplitLegs=[{mode:'cash',amount:'80'},{mode:'upi',amount:'90'}]
roomSplitTotal = 80+90 = 170
effectiveBalance = max(0, baseBalance - roomDiscountInfoRs) = max(0, 600-0) = 600
roomSplitOverBalance = 170 > 600 → false   ← NO ALERT, NO BLOCK
User clicks Pay → handlePaid fires
  if (roomSplitOverBalance) … → false → SKIP
  handlePaid proceeds → payBill called with partial_payments_room=[{cash:80},{upi:90}]
RESULT: Checkout with under-paid room split legs (₹170 vs ₹600 balance) — backend may accept
```

### Issue 2+3 — CPP Pay Button Clipped

```
.frontdesk-bill = { height: 560px; overflow: hidden }
  ┣ <div data-testid="bill-room-controls"> RoomDiscountControls (~100-180px) </div>
  ┣ roomDiscountInfo note (conditional ~20px)
  ┗ <Suspense> <CollectPaymentPanel className="flex flex-col h-full"> </Suspense>
                                                            ↑
                                               h-full = 560px (parent height)
                                               Starts at y=100+
                                               Extends to y=660+ → CLIPPED at 560px
                                               Pay button is at bottom of CPP → NOT VISIBLE

When split = On + 2 legs: RoomDiscountControls ≈ 180px
CPP Pay button at y ≈ 100 + 560 - 76 (btn height) = y=584 → clips at 560px → HIDDEN
```

### Issue 4 — Balance Discrepancy

```
InHouse list API:
  charge.balance_due = 827  (backend-computed full balance for column display)
  → includes room + food, but uses InHouse list API's computation

Folio API (singleOrderNew):
  order.amount = 248  (food total, possibly includes SC)
  order.roomInfo.balancePayment = 600  (room balance)
  → baseBalance = 600 (folio-computed)
  → CPP bill summary = order.amount(248) + baseBalance(600) = 848

BREAK POINT: InHouse food computation (227) ≠ folio food computation (248)
SUSPECTED CAUSE: SC (~₹21) in order.amount but not in charge.balance_due food portion
```

---

## 4. Evidence Artifacts

- Code trace: `FolioCheckoutPanel.jsx` L285-289 (roomSplitOverBalance), L369-381 (RoomDiscountControls placement)
- CSS trace: `frontdesk.css` L29 (`.frontdesk-bill { height:560px; overflow:hidden }`)
- CPP trace: `CollectPaymentPanel.jsx` L1254 (`flex flex-col h-full`), L3300-3327 (Pay button)
- Balance data: InHousePanel.jsx L16, DeparturesPanel.jsx L24, GuestTable.jsx L133
- Curl probe: preprod/api/v1/order/singleOrderNew → 404 (endpoint may differ in preprod routing)

---

## 5. Recommendations

### Issue 1 — BUG-525 Under-Balance (PLAN_GAP)
**Classification:** PLAN_GAP
**Fix:** Add under-balance check to `roomSplitOverBalance` useMemo:
```js
// Current (only over-balance):
return effectiveBalance > 0 && roomSplitTotal > effectiveBalance;
// Proposed (both over AND under):
return effectiveBalance > 0 && roomSplitTotal !== effectiveBalance;
```
**OR** keep as soft-warning (not a hard block) for under-balance to allow partial payment.
**Scope:** 1 file (FolioCheckoutPanel.jsx), 1 line in useMemo + 1 line in alert text
**Planning skip:** NOT eligible — financial/billing logic (R6); full gate cycle needed
**Risk:** HIGH (checkout/billing)
**Owner decision needed:** OD-BUG525-02 — Should legs total BLOCK (hard) or WARN (soft) when < room balance? Or allow under-balance?

### Issue 2+3 — CPP Pay Button Clipped + Discount Position (FE_BUG)
**Classification:** FE_BUG (CSS layout)
**Fix:**
1. `frontdesk.css`: Add `display:flex; flex-direction:column;` to `.frontdesk-bill`
2. `FolioCheckoutPanel.jsx`: Wrap the `<Suspense>` in a `<div className="flex-1 min-h-0 overflow-hidden">` so CPP fills remaining space after room controls
**Scope:** 2 files (FolioCheckoutPanel.jsx + frontdesk.css), ~3 lines each
**Planning skip:** ELIGIBLE — layout only, not financial logic, 2 files, ≤10 lines; **owner must approve**
**Risk:** MEDIUM (checkout visibility restored)

### Issue 4 — Balance ₹827 vs ₹848 (DATA_EDGE)
**Classification:** DATA_EDGE (likely) / BACKEND_BUG (possible)
**Root cause:** `order.amount` from folio API includes ₹21 SC; InHouse `charge.balance_due` excludes it
**Recommended action:**
1. Backend investigation: confirm whether `charge.balance_due` includes SC or not
2. If `order.amount` over-counts: do NOT pass SC in `total` prop OR strip SC from `order.amount` in FolioCheckoutPanel
3. If `charge.balance_due` under-counts: pass corrected balance to InHouse column
**Scope:** BACKEND_ASK first; frontend fix may follow
**Planning skip:** NOT eligible — requires API investigation + financial total change
**Risk:** CRITICAL (displayed balance inconsistency confuses cashiers)

---

## 6. Planning Skip Eligibility Summary

| Issue | Planning Skip? | Reason |
|---|---|---|
| BUG-525 under-balance | NO | Financial/checkout logic (R6) |
| Checkout btn + position | YES (owner approve) | Layout only, ≤10 lines, 2 files, non-financial |
| Balance ₹827 vs ₹848 | NO | API contract + financial total change |

---

## Handover

```
Root cause summary:
  Issue 1 (BUG-525): PLAN_GAP — under-balance split not blocked. Confidence: HIGH.
  Issue 2+3 (btn+position): FE_BUG — overflow:hidden+h-full clips CPP Pay btn. Confidence: HIGH.
  Issue 4 (₹827 vs ₹848): DATA_EDGE — InHouse vs folio food-total discrepancy (₹21, likely SC). Confidence: MEDIUM.

FE fix needed:
  Issue 1: YES — 1 file, financial → full Planning gate
  Issue 2+3: YES — 2 files, layout only → planning skip eligible (owner approve)
  Issue 4: BACKEND_ASK first, then FE fix if needed

Backend ask:
  Issue 4: Confirm if charge.balance_due (InHouse list) includes SC; and if order.amount (singleOrderNew) includes SC for room food orders.

Owner decisions needed:
  OD-BUG525-02: Under-balance split legs — BLOCK hard / WARN soft / allow?

Retroactive candidates: NONE
Report at: /app/memory/BUG-INV-OCT09_INVESTIGATION_REPORT.md
```
