# INV-CHECKOUT-PHASE — INVESTIGATION REPORT
# Checkout Phase: VAT label / room discount cap / both-split cap / layout

**Date:** 2026-10-08
**Agent:** INVESTIGATION
**Trigger:** Owner reports 4 issues in checkout (FolioCheckoutPanel) + related questions on discount cap formula
**URL tested:** `https://react-app-deploy-20.preview.emergentagent.com/pms/front-desk-v2?tab=departures`
**Steps used:** 7/10

---

## 1. Summary

| Issue | Classification | Confidence | Planning skip? |
|---|---|---|---|
| A: "vat test" shows "GST 22%" label (should say "VAT") | FE_BUG | HIGH | YES (≤10 lines, 2 files, no hotspot) — owner approve |
| B: Room discount % formula wrong (% of baseBalance, should be % of bc) | FE_BUG | HIGH | NO (R6 financial, 3 edit sites) |
| C: 'Both' discount — display inconsistent with payload; no per-side cap | FE_BUG | HIGH (BUG-499 GATE_5A gap) | NO (R6 financial, multiple sites) |
| D: Layout — room discount controls on LEFT, user wants LEFT = summary only | FE_UX / DESIGN | HIGH | NO (multi-file restructure, R6) |

---

## 2. Hypotheses Tested

| # | Hypothesis | Test | Steps | Result |
|---|---|---|---|---|
| H1 | folioTransform doesn't capture `tax_type` → "GST" hardcoded in label | grep folioTransform L135 + FolioCheckoutPanel L193 | Steps 1-2 | **CONFIRMED** |
| H2 | roomDiscountRs % applied to `baseBalance` not `bc` → at maxPct=20% gives ₹120 not ₹600 | grep L47 + L261 + L313 | Step 5 | **CONFIRMED** |
| H3 | 'Both' split: display shows capped room amount (₹600) but payload sends half only (₹400) | trace roomDiscountRs vs roomHalfRs in handlePaid | Step 6 | **CONFIRMED** (BUG-499 gap) |
| H4 | Room discount controls (interactive) on LEFT panel, should be RIGHT only | Read full FolioCheckoutPanel structure L364-409 | Step 1 | **CONFIRMED** |

---

## 3. Issue A — VAT label shows "GST" (FE_BUG)

### Data Flow Trace

```
folioTransform.js L111-141:
  fd = d.food_details || {}
  gstPct = parseFloat(fd.tax) || 0       ← reads rate only, NOT tax_type
  return {
    gstPercent: gstPct,                   ← always called "gst" regardless of VAT/GST
    // taxType: fd.tax_type NOT returned  ← BREAK POINT
  }

FolioCheckoutPanel.jsx L193 (Statement):
  orders.map(o => <Line label={`${o.name} × ${o.qty}${o.gstPercent ? ' · GST ${o.gstPercent}%' : ''}`} />)
  //                                          ^^^
  //                  hardcoded "GST" — no check of o.taxType
  //                  "vat test × 1 · GST 22%" ← SHOWN (WRONG)
  //                  Should show: "vat test × 1 · VAT 22%"
```

### Evidence

- `orderTransform.js` L1904: `const taxType = (item.food_details?.tax_type || 'GST').toUpperCase()` — correctly distinguishes GST/VAT
- `orderTransform.js` L1907: `if (taxType === 'VAT') { vat_tax += taxAmt; }` — correct handling
- `folioTransform.js` L121: `const gstPct = parseFloat(fd.tax) || 0;` — reads rate but NOT `fd.tax_type`
- `folioTransform.js` L135: `gstPercent: gstPct` — no `taxType` field in returned object
- `FolioCheckoutPanel.jsx` L193: hardcodes `· GST ${o.gstPercent}%`

### Fix (for PLANNING):

```
File 1: folioTransform.js L135 — add taxType field:
  taxType: (fd.tax_type || 'GST').toUpperCase(),  // NEW

File 2: FolioCheckoutPanel.jsx L193 — use taxType:
  label={`${o.name} × ${o.qty}${o.gstPercent ? ` · ${o.taxType === 'VAT' ? 'VAT' : 'GST'} ${o.gstPercent}%` : ''}`}
```

**Planning skip eligible: YES** (2 files, ~3 lines, no hotspot, display only — NOT financial formula)
**Owner must approve skip.**

---

## 4. Issue B — Room discount % formula wrong (FE_BUG)

### Root Cause

`maxPct` is correctly computed as the maximum % of booking charge that equals remaining balance:
```js
// RoomSection L52-57:
maxPct = floor(min(baseBalance, bc) / bc × 100)
// Example: floor(min(600, 3000) / 3000 × 100) = floor(20%) = 20
```

This means "20% of bc = 3000 equals balance = 600".

But `roomDiscountRs` (the ACTUAL discount amount) applies % to `baseBalance`, not `bc`:
```js
// RoomSection L47:     floor(baseBalance × pct / 100)
// FolioCheckoutPanel L261:  floor(baseBalance × pct / 100)
// handlePaid L313:     floor(baseBalance × (pct/2) / 100)

// At maxPct=20%:
// CURRENT:  floor(600 × 20/100) = floor(120) = ₹120   ← WRONG
// CORRECT:  floor(3000 × 20/100) = floor(600) = ₹600  ← should be full balance
```

### Numerical Proof

| Input | Expected (% of bc) | Actual (% of baseBalance) | Error |
|---|---|---|---|
| 20% | floor(3000×0.20)=₹600 | floor(600×0.20)=₹120 | −₹480 under-discounts |
| 10% | floor(3000×0.10)=₹300 | floor(600×0.10)=₹60 | −₹240 under-discounts |

**User impact:** Staff enters 20% discount expecting ₹600 off, gets only ₹120 off.

### Answer to Owner's Question

> "we should not give discount more than balance due — paid so far × gst slab (.05 or .18) right?"

YES. The correct **max room discount = baseBalance** (= bp + gstTotal where bp = balance_payment from folio, gstTotal = computed GST on discounted price). This is already the Amount-mode cap (correct). The % formula needs to apply the percentage to `bc` (booking charge) capped at `baseBalance`, NOT to `baseBalance` directly.

The balance_due correctly includes GST:
- `baseBalance = bp + gstTotal = 500 + 100 = 600` for bonk (5% slab on ₹2,000 effective room)

### Fix Scope (for PLANNING):

```
FolioCheckoutPanel.jsx — 3 edit sites:
  RoomSection L47:     floor(bc * roomDiscount / 100) capped at baseBalance
  Parent L261:         floor(bc * roomDiscount / 100) capped at baseBalance
  handlePaid L313:     floor(bc * (roomDiscount/2) / 100) capped at baseBalance/2
  (bc = Number(c.booking_charge || 0) — already available in all 3 scopes via row.charge)
```

**Risk: CRITICAL (R6 — financial)** → Full gate cycle, no planning skip.

---

## 5. Issue C — 'Both' discount: display inconsistent with payload; per-side cap missing (FE_BUG)

### BUG-499 Context

BUG-499 is at GATE_5A_IMPLEMENTED. The fix attempted a 50/50 split but left a gap: the display formula and the payload formula use DIFFERENT room amounts.

### Root Cause — Three-way Mismatch

```
Scenario: roomApplyTo='both', Amount ₹800, baseBalance=600, fnbTotal=400

DISPLAY (RoomSection L44-50):
  roomDiscountRs = min(floor(800), 600) = 600  ← shown as room discount
  → UI displays: "Room discount: −₹600"

DISPLAY (Statement L200, foodDiscountRs L286):
  foodDiscountRs = floor(800/2) = 400           ← shown as F&B discount
  → UI displays: "F&B (50% split) discount: −₹400"

  Total displayed = ₹600 + ₹400 = ₹1,000

PAYLOAD (handlePaid L311-316):
  roomHalfRs = floor(800/2) = 400               ← NOT capped at room's available balance
  payload.room_discount = 400

  payload.payment_amount -= foodDiscountRs=400  ← food half also uncapped
  Total sent to backend = ₹400 + ₹400 = ₹800

MISMATCH: Display ₹1000 ≠ Payload ₹800
GUEST SHOWN: Room balance ₹0 (display: 600-600=0)
GUEST ACTUALLY PAYS: Room still owes ₹200 (backend gets 400, not 600)
```

### Correct Formula for 'Both' with Caps

The equal-split doesn't work when one side is bounded. Correct approach:
1. Compute effective room half = min(floor(discount/2), baseBalance)
2. Compute effective food half = min(floor(discount/2), fnbTotal)
3. Both display and payload must use these same capped halves
4. `roomDiscountRs` display must also match payload (currently shows uncapped full baseBalance)

### Relationship to Owner's Question

> "equal divide will not applicable always when capping is there - which is missing currently"

**Confirmed.** When room cap < half OR food cap < half, the 50/50 split silently gives different amounts than what's displayed. The fix must apply consistent capping on both sides in BOTH display and payload.

**Risk: CRITICAL (R6 — financial)** → Full gate cycle. Related to BUG-499 (already registered).

---

## 6. Issue D — Layout: Room discount controls on LEFT, should be RIGHT only (FE_UX)

### Current Layout

```
fd-bill-grid (two columns)
├── bill-left: Statement component
│   ├── RoomSection  ← INTERACTIVE: Room/Both/F&B selector, Amount/% input,
│   │                               Split room payment toggle, SGST, CGST, Room balance
│   └── Room orders, Transferred (read-only)
└── bill-right: CollectPaymentPanel
    └── F&B: Discount, Coupon, Service Charge, Tip, Payment methods (interactive)
```

### User's Requirement

```
bill-left  = dynamic summary only (read-only):
  Booking amount, Check-in discount, Room discount line (read-only),
  SGST, CGST, Already paid, Room balance, Room orders, Transferred

bill-right = ALL operations:
  Room discount controls (Room/Both/F&B, Amount/%, reason, Split)
  + CollectPaymentPanel (F&B discount, coupon, payment methods)
```

### Scope (for PLANNING)

This requires moving `RoomSection` discount controls out of `Statement` (left) into the `bill-right` div alongside `CollectPaymentPanel`. A read-only `RoomSection` or separate `RoomSummary` component would remain on the left.

Affects: `FolioCheckoutPanel.jsx` restructure, ~50 lines JSX moved. `Statement`/`RoomSection` props reduced. No financial formula change — only JSX position change.

**Risk: HIGH** (UX/layout change touches room billing display; full gate cycle needed)
**Planning skip: NO** (50+ lines, structural change, owner must confirm exact layout spec)

---

## 7. Data Flow Trace — Complete Checkout Path

```
Bill button click → FolioCheckoutPanel.jsx → getFolio(row.orderId)
  → folioTransform.fromFolioAPI:
      roomOrders[i].gstPercent = fd.tax  // Issue A: taxType NOT captured
      roomOrders[i].taxType = fd.tax_type  // MISSING — causes "GST" hardcode

baseBalance computation (L238-256):
  bp = order.roomInfo.balancePayment  // folio: room rent remaining (no GST)
  discountedPrice = bc - discountAmt  // booking_charge - check-in discount
  gst = computeRoomGst(slabs, discountedPrice)  // correct GST on discounted base
  baseBalance = bp + gst.gstTotal     // = 600 ✓ (this is the correct balance)

roomDiscountRs % computation (L47, L261):
  CURRENT: floor(baseBalance × pct/100)  // Issue B: wrong base
  CORRECT: floor(bc × pct/100) capped at baseBalance

'Both' split display vs payload (Issue C):
  Display (RoomSection L44-50): min(roomDiscount, baseBalance) = 600 for ₹800 input
  Payload (handlePaid L314):    floor(roomDiscount/2) = 400 for ₹800 input
  → MISMATCH

Layout (Issue D):
  Statement (left) L182-204: RoomSection with all interactive discount controls
  User wants these moved to bill-right alongside CollectPaymentPanel
```

---

## 8. Evidence Artifacts

Saved to: `/app/memory/evidence/INV-CHECKOUT-PHASE-2026-10-08/`

| Issue | File | Lines |
|---|---|---|
| A: no taxType field | `folioTransform.js` | L121-135 |
| A: hardcoded "GST" | `FolioCheckoutPanel.jsx` | L193 |
| B: wrong % base | `FolioCheckoutPanel.jsx` | L47, L261, L313 |
| C: split mismatch | `FolioCheckoutPanel.jsx` | L44-50 vs L311-316 |
| D: layout | `FolioCheckoutPanel.jsx` | L364-409 |

---

## 9. Recommendations

| Issue | Type | Recommendation | Risk | Skip? |
|---|---|---|---|---|
| A | FE_FIX | 1 line `folioTransform.js` + 1 line `FolioCheckoutPanel.jsx` | LOW (display only) | YES (owner approve) |
| B | FE_FIX | `roomDiscountRs`: change base from `baseBalance` to `bc` at 3 sites in FolioCheckoutPanel.jsx | CRITICAL (R6) | NO |
| C | FE_FIX | Fix 'both' split to use capped halves in both display AND payload | CRITICAL (R6) | NO |
| D | FE_UX | Move RoomSection controls to bill-right; left = read-only summary | HIGH (structural) | NO |

---

## 10. Retroactive Candidates

- **BUG-499 (GATE_5A_IMPLEMENTED)**: Issue C is a gap in BUG-499's fix. The 50/50 split was implemented but the display/payload mismatch and per-side cap were not addressed. Recommend registering a new BUG for the gap, or re-opening BUG-499 Sub-B.

---

## Handover to Next

```
Root causes confirmed, HIGH confidence, 7/10 steps.

Issue A: folioTransform.js missing taxType field + FolioCheckoutPanel hardcoded "GST"
  → Fast Lane eligible. Owner approve → fix 2 files ~3 lines.

Issue B: roomDiscountRs % applies to baseBalance not bc (booking_charge)
  → PLANNING Gate 2+3 → Gate 4 GO → IMPLEMENTATION (R6)

Issue C: 'Both' discount — RoomSection display uses capped full amount (₹600)
  but handlePaid sends uncapped half (₹400). BUG-499 implementation gap.
  → PLANNING Gate 2+3 → Gate 4 GO → IMPLEMENTATION (R6)

Issue D: Room discount controls on left, user wants right-only layout
  → Owner confirms spec → PLANNING → IMPLEMENTATION

Owner question "max discount = balance_due": YES — Amount mode cap = baseBalance (₹600).
  % mode cap formula IS wrong (Issue B) — see fix above.

Report: investigations/INV-CHECKOUT-PHASE-2026-10-08.md
```
