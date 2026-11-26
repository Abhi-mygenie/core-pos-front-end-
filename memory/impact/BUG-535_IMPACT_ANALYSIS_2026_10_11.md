# BUG-535 — Impact Analysis (Gate 2)

**Item:** BUG-535 — FolioCheckoutPanel: `discountedPrice * nights` Causes Wrong GST Slab → Room Balance ₹14,504 Instead of ₹11,020
**Date:** 2026-10-11
**Role:** PLANNING (Gate 2 — Impact Analysis only)
**Code Reality:** NONE — fix not applied (confirmed by grep; `* nights` at L248 + L253 confirmed present)
**Conflict Pre-Check:** See §Conflict
**Backend status:** DEPLOYED ✓ — `charge.booking_charge` now returns rack value after extension (per BACKEND_BRIEF_BUG535)

---

## 1. Summary

`FolioCheckoutPanel.jsx` useMemo at L238–263 computes `baseBalance` (room balance for checkout bill), `displaySgst`, `displayCgst`, and `maxCheckoutDiscount`.

Inside this useMemo (L246–253):

```js
const discountedPrice = Math.max(0, bc - discountAmt);
// bc = rack booking_charge (TOTAL for all nights), e.g. ₹12,400 (2 nights × ₹6,200/night post-discount)
// discountedPrice = ₹12,400  ← this is already the FULL stay total

// L248 — BUG:
const gst = computeRoomGst(roomGstApplicable, roomGstSlabs, discountedPrice * nights, nights, 1);
//                                                           ↑ discountedPrice already = total, * nights double-counts

// L253 — BUG:
const gstRate = ... ? gst.gstTotal / (discountedPrice * nights) : 0;
//                                     ↑ same double-count in denominator
```

`computeRoomGst` internally computes `nightlyUnit = totalAmount / nights`. When `totalAmount = discountedPrice * nights`, the nights cancel out: `nightlyUnit = discountedPrice` (the FULL total, not per-night). For 2 nights this means `nightlyUnit = ₹12,400` instead of the correct ₹6,200 — triggering the **18% GST slab** (>₹7,500 threshold) instead of **5%**.

**This bug was latent for 1-night bookings** (`* 1` = no-op). Extension to 2 nights exposes it.

---

## 2. Contract (from `extend_stay_charge_fe.md` + `computeRoomGst` signature)

```
computeRoomGst(applicable, slabs, totalAmount, nights, roomCount)
  → nightlyUnit = totalAmount / roomCount / nights
  → applies slab per nightlyUnit
```

`discountedPrice` = post-discount total for ALL nights (e.g. ₹12,400 for 2 nights).
Passing `discountedPrice * nights` → nightlyUnit = discountedPrice (not per-night) → **wrong slab**.
Passing `discountedPrice` directly → nightlyUnit = ₹6,200 → **correct slab**.

---

## 3. Data Flow Trace

```
GET /api/v2/vendoremployee/pos/local-reservations (after BE deploy)
  → row.charge.booking_charge = ₹13,400  (RACK, 2 nights × ₹6,700)  ← BE fix confirmed deployed
  → row.charge.nights = 2

FolioCheckoutPanel.jsx useMemo (L238-263):
  bc          = ₹13,400   (row.charge.booking_charge — rack, from BE fix ✓)
  discountAmt = ₹1,000    (order.roomInfo.discountAmount)
  nights      = 2         (row.charge.nights)
  bp          = ₹10,400   (order.roomInfo.balancePayment)
  advance     = ₹2,500    (row.charge.advance_payment = ₹2,000 check-in + ₹500 GST on adv)

  discountedPrice = ₹13,400 − ₹1,000 = ₹12,400  ← total for 2 nights (correct)

  L248 — CURRENT (BUG):
    computeRoomGst(applicable, slabs, ₹12,400 × 2 = ₹24,800, nights=2, 1)
    → nightlyUnit = ₹24,800 / 2 = ₹12,400  ← WRONG (per-night should be ₹6,200)
    → slab: 18% (exceeds ₹7,500)
    → gstTotal = ₹4,464

  L248 — FIXED:
    computeRoomGst(applicable, slabs, ₹12,400, nights=2, 1)
    → nightlyUnit = ₹12,400 / 2 = ₹6,200  ← CORRECT
    → slab: 5%
    → gstTotal = ₹620

  base = bp + gstTotal

  CURRENT: base = ₹10,400 + ₹4,464 = ₹14,864  ← wrong (was ₹14,504 before BE fix)
  FIXED:   base = ₹10,400 + ₹620   = ₹11,020  ← correct ✓

  L253 — CURRENT (BUG):
    gstRate = ₹4,464 / (₹12,400 × 2) = ₹4,464 / ₹24,800 = 0.18
    → maxCheckoutDiscount = base − floor(advance × 0.18)   ← wrong rate

  L253 — FIXED:
    gstRate = ₹620 / ₹12,400 = 0.05
    → maxCheckoutDiscount = base − floor(advance × 0.05)   ← correct rate
```

**Break point:** L248 and L253 in the `baseBalance` useMemo — `* nights` multiplier on `discountedPrice` when `discountedPrice` is already the total-stay amount.

---

## 4. Three-State Simulation (from Investigation, arithmetically verified)

| State | BE bc | discountedPrice | nightlyUnit | Slab | GST | Base balance |
|---|---|---|---|---|---|---|
| Before BE+FE fix | ₹12,400 (discounted) | ₹11,400 (double-discount) | ₹11,400 | 18% | ₹4,104 | **₹14,504** ✗ |
| BE fix only (current state before FE fix) | ₹13,400 (rack) | ₹12,400 | ₹12,400 | 18% | ₹4,464 | **₹14,864** ✗ |
| Both FE + BE fix | ₹13,400 (rack) | ₹12,400 | ₹6,200 | 5% | ₹620 | **₹11,020** ✓ |

**Current state (BE deployed, FE not yet fixed):** base = ₹14,864. Cashier now sees ₹14,864 instead of ₹14,504. Both are wrong.

---

## 5. Why InHouse Balance Column Is Unaffected

`pmsService.js` reads `ri.room_price` (rack, from `room_info`) — never reads `charge.booking_charge`. Its `nightlyUnit` path does NOT have the `* nights` bug. This is why the balance column already shows ₹11,020 correctly and is NOT touched by this fix.

---

## 6. Affected File

| File | Path | R5? | Change |
|---|---|---|---|
| `FolioCheckoutPanel.jsx` | `src/components/pms/frontdesk/FolioCheckoutPanel.jsx` | NO | L248: remove `* nights`; L253: remove `* nights` from denominator |

**Total:** 1 file · 2 lines changed · NOT R5.

---

## 7. Exact Edits

### Edit 1 — L248: remove `* nights` from `computeRoomGst` call

**Current:**
```js
      ? computeRoomGst(roomGstApplicable, roomGstSlabs, discountedPrice * nights, nights, 1)
```
**After:**
```js
      ? computeRoomGst(roomGstApplicable, roomGstSlabs, discountedPrice, nights, 1)          // BUG-535: discountedPrice is total-stay; nights handled inside computeRoomGst
```

### Edit 2 — L253: remove `* nights` from `gstRate` denominator

**Current:**
```js
      ? gst.gstTotal / (discountedPrice * nights) : 0;                          // BUG-517
```
**After:**
```js
      ? gst.gstTotal / discountedPrice : 0;                                     // BUG-517, BUG-535: discountedPrice is total-stay
```

---

## 8. 1-Night Regression Check

For `nights = 1`:
- `discountedPrice * nights` = `discountedPrice * 1` = `discountedPrice` (no-op)
- After fix: `discountedPrice` (same value)
- **Zero change** for all existing 1-night bookings. Zero regression risk.

---

## 9. Impact on `maxCheckoutDiscount`

`maxCheckoutDiscount` feeds the cap on any additional room discount a cashier can apply at checkout:
```js
const maxCheckout = Math.max(0, base − Math.floor(advance × gstRate));
```

With the fix:
- `gstRate = 0.05` (correct) → `advance × gstRate` is correctly smaller → `maxCheckout` is slightly larger (less restrictive cap, but correct)
- Current (broken): `gstRate = 0.18` → over-restricts the cap for multi-night bookings

This is a correction, not a regression. The old cap was too tight for multi-night discounted bookings.

---

## 10. Conflict Pre-Check

| Conflict | Detail |
|---|---|
| **BUG-526** | L413-418 — different block (split condition). NOT touching L238-263 useMemo. Parallel-safe. |
| **BUG-527** | Multiple lines in FolioCheckoutPanel — all in different blocks (E1-E3 for roomBalance/CPP/split). NOT touching L238-263. Parallel-safe. |
| **BUG-524** | L54 + L74 — RoomSection maxPct/maxPctParent. Different block. Parallel-safe. |
| **BUG-517** | Added the useMemo at L238. This IS the block being fixed. BUG-517 is GATE_5A_IMPLEMENTED (QA not yet done per dashboard). Fix is purely subtractive (remove `* nights`); does not alter logic structure or variable names. **SAFE — additive-only to BUG-517's intent.** |
| Any other open item on L238-263? | NO — confirmed by registry + FILE_OWNERSHIP scan. |

---

## 11. Risk Classification

| Field | Value |
|---|---|
| **Risk** | HIGH (wrong checkout balance shown to cashier — ₹14,864 instead of ₹11,020 for current state) |
| **Trigger** | Financial calculation bug, wrong GST slab, wrong `maxCheckoutDiscount` cap |
| **Fast Lane** | NO — financial calculation. Full gate required (Gate 3 + Gate 4 GO). |
| **Backend co-deploy** | BE already deployed ✓. FE fix can proceed independently. |

---

## 12. Files WILL change

```
src/components/pms/frontdesk/FolioCheckoutPanel.jsx  (L248, L253)
```

## Files WILL NOT touch

```
ExtendStayForm.jsx · InHousePanel.jsx · DeparturesPanel.jsx
pmsService.js · frontDeskService.js · roomGstCalculator.js
CollectPaymentPanel.jsx (R5) · orderTransform.js (R5) · any other file
```

---

## 13. Owner Decisions

| # | Question | Recommendation |
|---|---|---|
| OD-535-02 | After BE fix, folio currently shows ₹14,864. Should FE fix be deployed ASAP (no feature flag), since BE is already live and the intermediate state ₹14,864 is still wrong? | YES (recommended) — deploy FE fix immediately. No feature flag needed. |

OD-535-01 (backend co-deploy timing) is now **RESOLVED** — BE deployed on 2026-10-11.

---

## 14. Verification Matrix (seeds Gate 3)

| # | Check | Method |
|---|---|---|
| V1 | Discounted 2-night booking (bonk r4 post-extension): folio shows SGST ₹310 · CGST ₹310 · Room balance ₹11,020 | Browser — open Bill after extend + Done |
| V2 | 1-night booking (non-extended, any room): folio balances unchanged vs pre-fix | Browser — spot-check 2 different 1-night orders |
| V3 | Non-discounted 2-night booking: folio shows correct GST (no double-count introduced) | Browser — extend non-discounted room, open Bill |
| V4 | InHouse balance column still shows ₹11,020 (pmsService path unchanged) | Browser — InHouse panel row |
| V5 | `maxCheckoutDiscount` correct for 2-night: cap = ₹11,020 − floor(advance × 0.05) | DevTools — inspect computed useMemo value |
| V6 | `computeRoomGst` unit test with nights=2, discountedPrice=₹12,400: gstTotal=₹620, sgst=cgst=₹310 | Jest — `roomGstCalculator` test or ad-hoc |
| V7 | Webpack compiles with 0 new warnings | `yarn start` log |

---

## 15. Registry Checklist (Post-Code — for Implementation agent)

```
- [ ] registry.json: BUG-535 → status: IMPLEMENTED, sprint_key: oct_bug_batch
- [ ] BUG_TRACKER.md: row updated (remove "BE co-deploy required" note — BE deployed)
- [ ] FILE_OWNERSHIP.md: FolioCheckoutPanel.jsx BUG-535 row added (L248 + L253)
- [ ] Code markers: // BUG-535 on both changed lines
```
