# BUG-527 — Implementation Plan (Gate 3)
## Dashboard CPP: Check-In Discount Missing from Room Section + Split Button Gray

**Date:** 2026-10-09
**Risk:** HIGH
**Impact Analysis:** `impact/BUG-527_IMPACT_ANALYSIS.md`
**OD-BUG527-01 LOCKED:** Check-in discount shown read-only in CPP Room section
**OD-BUG527-02 LOCKED:** Food-only split validation; room settled by backend `paid_room=yes`

---

## Scope Lock

**Files WILL change:**
- `src/components/order-entry/CollectPaymentPanel.jsx` — E1, E2, E3 (3 edits, R5)
- `src/components/pms/PmsCheckoutDrawer.jsx` — E4 (1 edit)

**Files WILL NOT touch:**
- `OrderEntry.jsx` (R5) — NOT needed; passes raw `roomInfo`; CPP fix handles it
- `orderTransform.js` (R5) — NOT needed; `payment_amount = fbOnlyTotal` unchanged
- `FolioCheckoutPanel.jsx` — folio path is separate (BUG-526/BUG-498)
- `frontDeskService.js` — NOT needed
- Any test files

---

## Edits

### E1 — `CollectPaymentPanel.jsx` L200: subtract `discountAmount` from `roomBalance`

**Current L200:**
```js
      ? Math.max(0, roomInfo.roomPaymentSummary?.remainingRoomBalance ?? roomInfo.balancePayment ?? 0)
```

**New L200:**
```js
      ? Math.max(0, (roomInfo.roomPaymentSummary?.remainingRoomBalance ?? roomInfo.balancePayment ?? 0) - (roomInfo.discountAmount || 0)) // BUG-527: subtract check-in discount so balance reflects post-discount value
```

**Effect:** `roomBalance = 1600 - 1000 = 600` ✓

**Dep array (L202):** `[isRoom, roomInfo]` — **unchanged**. `discountAmount` is a property of `roomInfo`; any change to `roomInfo` re-triggers the memo. ✓

---

### E2 — `CollectPaymentPanel.jsx` L1843: insert check-in discount line

**Current L1843–1844:**
```jsx
                  )}
                  <div className="flex justify-between">
```
*(closing brace of Lodging GST block → immediately Advance Paid)*

**New L1843–1851:**
```jsx
                  )}
                  {/* BUG-527: check-in discount read-only line — mirrors Lodging GST conditional pattern (OD-BUG527-01) */}
                  {(roomInfo.discountAmount || 0) > 0 && (
                    <div className="flex justify-between" data-testid="checkout-room-checkin-discount">
                      <span style={{ color: COLORS.grayText }}>Check-in Discount</span>
                      <span style={{ color: COLORS.darkText }}>−₹{(roomInfo.discountAmount || 0).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
```

**Effect:** Room section displays: Room Charge ₹3,000 → Lodging GST +₹100 → **Check-in Discount −₹1,000** → Advance Paid −₹1,500 → Balance ₹600 ✓

---

### E3 — `CollectPaymentPanel.jsx` L3311: split threshold = `effectiveTotal − roomBalance`

**Current L3311:**
```js
            (showSplit && splitType === 'payment' && splitPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0) < effectiveTotal) ||
```

**New L3311:**
```js
            (showSplit && splitType === 'payment' && splitPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0) < (isRoom ? effectiveTotal - roomBalance : effectiveTotal)) || // BUG-527: room orders — split covers food+associated; room settled via paid_room=yes
```

**Effect:**
- `isRoom=true`: threshold = `effectiveTotal(848) - roomBalance(600) = 248` → `splitSum(248) < 248` = false → **enabled** ✓
- `isRoom=false`: threshold = `effectiveTotal` (unchanged for all non-room orders) ✓
- With associated orders: threshold = `food + associated` (not room) — correct per backend contract

**Variables in scope at L3311:** `isRoom` (prop L38), `effectiveTotal` (L731), `roomBalance` (L195) ✓

---

### E4 — `PmsCheckoutDrawer.jsx` L278-283: subtract `discountAmount` from BUG-425 formula

**Current L278-283:**
```js
                  remainingRoomBalance: Math.max(0,
                    (detail.roomInfo.roomPrice       ?? 0) +
                    (detail.roomInfo.gstTax          ?? 0) -
                    (detail.roomInfo.advancePayment  ?? 0) -
                    (detail.roomInfo.receiveBalance  ?? 0)
                  ),
```

**New L278-284:**
```js
                  remainingRoomBalance: Math.max(0,
                    (detail.roomInfo.roomPrice       ?? 0) +
                    (detail.roomInfo.gstTax          ?? 0) -
                    (detail.roomInfo.discountAmount  ?? 0) - // BUG-527: subtract check-in discount (mirrors E1 roomBalance fix)
                    (detail.roomInfo.advancePayment  ?? 0) -
                    (detail.roomInfo.receiveBalance  ?? 0)
                  ),
```

**Effect:** PmsCheckoutDrawer roomBalance = 3000+100-1000-1500-0 = 600 ✓

---

## Execution Order

```
E4 (PmsCheckoutDrawer — independent file) — can run parallel with all CPP edits
E1 (CPP roomBalance memo)                — must run first among CPP edits (E3 reads roomBalance)
E2 (CPP Room section JSX)               — parallel-safe with E1, E3
E3 (CPP split disabled check)           — runs after E1 (reads updated roomBalance concept; variables already in scope)
```

Practical order: E1 → E2 + E3 in same block → E4 in same block (different file).

---

## Verification Matrix

| Edit | File | How to verify | Automated? |
|---|---|---|---|
| E1 (code) | CPP L200 | `grep -n "discountAmount" CollectPaymentPanel.jsx` → hit at L200 with `roomBalance` memo | YES |
| E2 (code) | CPP L1843+ | `grep -n "checkout-room-checkin-discount" CollectPaymentPanel.jsx` → found | YES |
| E3 (code) | CPP L3311 | `grep -n "effectiveTotal - roomBalance" CollectPaymentPanel.jsx` → found at split check | YES |
| E4 (code) | PmsCheckoutDrawer L279 | `grep -n "discountAmount" PmsCheckoutDrawer.jsx` → found in formula | YES |
| V1 — Room section shows check-in discount | Browser | bonk → OrderEntry → Checkout → expand Room section → "Check-in Discount −₹1,000" line visible between GST and Advance | NO |
| V2 — Room balance = ₹600 | Browser | Same → Room section → Balance = ₹600 (not ₹1,600) | NO |
| V3 — Grand Total = ₹848 | Browser | Same → Bill Summary header = ₹848; Grand Total stack = Food ₹248 + Room ₹600 = ₹848 | NO |
| V4 — Split button enabled | Browser | bonk → CPP → Split → Cash=200, UPI=48 → Remaining ₹0.00 → Checkout ₹848 button **enabled** | NO |
| V5 — PmsDrawer: C/Out room balance | Browser | bonk → Dashboard tile → C/Out → Room section Balance = ₹600 | NO |
| V6 — Non-room order unaffected | Browser | Non-room order → Split → amounts must still cover full food total (effectiveTotal = finalTotal for non-room) | NO |
| V7 — Compile | webpack | 0 new warnings | YES |

---

## Post-Code Registry Checklist

```
□ 1. registry.json: BUG-527 → status: GATE_5A_IMPLEMENTED, sprint_key: oct_bug_batch
□ 2. BUG_TRACKER.md: BUG-527 row → GATE_5A_IMPLEMENTED
□ 3. FILE_OWNERSHIP.md: CollectPaymentPanel.jsx + PmsCheckoutDrawer.jsx → BUG-527, 2026-10-09
□ 4. Code markers: // BUG-527 comment in all 4 edited locations ✓ (in plan above)
□ 5. Compile check: webpack 0 new warnings
```

---

## QA Handover Seed

| # | Test | Steps | Expected | data-testid |
|---|---|---|---|---|
| TC-527-1 | Check-in discount line shows | bonk → OrderEntry #000361 → Checkout → expand Room ▾ | "Check-in Discount" row shows −₹1,000 | `checkout-room-checkin-discount` |
| TC-527-2 | Room balance = ₹600 | Same | Balance row shows ₹600 (not ₹1,600) | `checkout-room-balance` (header) |
| TC-527-3 | Grand Total = ₹848 | Same | Bill Summary header = ₹848; Grand Total stack: Food ₹248 + Room ₹600 = ₹848 | `bill-summary-header`, `bill-grand-total` |
| TC-527-4 | Split enabled at food total | CPP → Split → Cash=200 UPI=48 | Remaining ₹0.00; Checkout ₹848 **green and clickable** | `complete-payment-btn` |
| TC-527-5 | PmsCheckoutDrawer: C/Out path | Dashboard room tile bonk → C/Out → Room section | Balance = ₹600; check-in discount line shown | `checkout-room-checkin-discount` |
| TC-527-6 | No check-in discount: room at full price | Guest with no check-in discount | No "Check-in Discount" line; Balance = full rack balance | `checkout-room-checkin-discount` absent |
| TC-527-7 | Non-room order split unaffected | Dashboard → non-room order → CPP split | Split must cover full food total (no regression) | `complete-payment-btn` |
