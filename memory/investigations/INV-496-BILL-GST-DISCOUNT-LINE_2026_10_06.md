# INV-496 — INVESTIGATION: Bill panel missing discount line, wrong GST display, wrong GST sent to backend (Order #000326)

**Date:** 2026-10-06
**Reporter:** Owner — screenshot + comments
**Role:** INVESTIGATION (no code edits)
**Steps used:** 10/10
**Related:** BUG-494 (GATE_5A_IMPLEMENTED), BUG-492, OD-INV492B-01, OD-494-01
**Evidence:** this file + probe data below

---

## 1. Summary — 3 Separate Problems Found

| # | Problem | Root cause | Classification |
|---|---------|-----------|----------------|
| P1 | Bill has no "Check-in discount" line | BUG-494 plan never added a display line for `room_discount_amount` | FE_DISPLAY_GAP |
| P2 | SGST/CGST show ₹0/₹0; Room balance ₹0 | OD-494-01 (planning agent derivation) was **wrong**: zeroes GST whenever `bp=0`, but advance only covers discounted base — GST on discounted price is still owed | FE_BUG (CODE_ERROR in E-494-6) |
| P3 | Wrong GST sent to backend at check-in AND check-out | (a) CheckInPage sends `gst_tax = GST on full price`, not discounted. (b) FolioCheckoutPanel sends `room_gst_tax = 0` because folio `gst_tax = null` | FE_BUG |

**Confidence:** HIGH — all three confirmed by code trace + API probe.

---

## 2. Probe Evidence — Order #000326 (order_id 1232976)

### Folio (`room_info` from `get-single-order-new`)
| Field | Value |
|-------|-------|
| room_price | ₹6,700 |
| advance_payment | ₹1,375 |
| balance_payment | **₹0** — formula = room_price − discount − advance = 6700−5325−1375 = 0 |
| room_discount_amount | **₹5,325** |
| room_discount_type | Percent |
| room_discount_at | check_in |
| room_discount_detail | `{check_in: {type:Percent, value:80, amount:5325}}` |
| gst_tax | **null** — folio has NO gst_tax field |

### LR charge (from `aiosell/local-reservations`)
| Field | Value |
|-------|-------|
| booking_charge | ₹6,700 |
| sgst | ₹167.5 (2.5% on full ₹6,700) |
| cgst | ₹167.5 (2.5% on full ₹6,700) |
| balance_due | ₹5,660 — LR has no knowledge of the check-in discount |
| advance_payment | ₹1,375 |

---

## 3. Root Cause Analysis — P1: Missing Check-in Discount Line

**What the bill shows today:**
```
Booking amount    ₹6,700
[discount input UI but no rendered discount line]
SGST              ₹0
CGST              ₹0
Already paid      ₹1,375
Room balance      ₹0
```

**What the bill should show:**
```
Booking amount        ₹6,700
Check-in discount    −₹5,325  (80%)      ← MISSING
SGST                  ₹34.38
CGST                  ₹34.38
Already paid         −₹1,375
Room balance          ₹68.75  (or ₹0 — see OD below)
```

**Break point:** BUG-494 E-494-3 only wires `displaySgst/displayCgst/baseBalance` to the existing SGST/CGST/balance lines. It never adds a new "Check-in discount" JSX line.

The folio has `order.roomInfo.discountAmount = 5325` and `order.roomInfo.discountType = 'Percent'` (from `room_discount_amount` and `room_discount_type`). This data is available; it is just not rendered.

**Fix scope (for Planning):** One new `<Line>` element inside `RoomSection` in `FolioCheckoutPanel.jsx`, conditioned on `(baseBalance ?? null) !== null && order?.roomInfo?.discountAmount > 0`.

---

## 4. Root Cause Analysis — P2: Wrong SGST/CGST/Balance Display

**OD-494-01 (derived by planning agent 2026-10-06):**
> "SGST/CGST = ₹0 when baseBalance = 0 (mathematical consistency)"

**Why this derivation was wrong:**

The backend's `balance_payment` formula:
```
balance_payment = room_price − room_discount − advance
                = 6700 − 5325 − 1375 = 0
```
This formula **does not include GST**. `bp = 0` means the advance covered the discounted room's base price — it does NOT mean GST is paid.

GST on the discounted price (₹1,375) = **₹68.75** (SGST ₹34.38 + CGST ₹34.38 at 5% total rate confirmed from LR charge).

The advance of ₹1,375 = discounted price (ex-GST). GST is still owed at checkout.

**Current E-494-6 logic (the bug):**
```javascript
const base = bp === 0 ? 0 : Math.max(0, bp + gst.gstTotal);
return {
  baseBalance: base,                           // bp=0 → 0
  displaySgst: base === 0 ? 0 : gst.sgst,     // 0 ← WRONG
  displayCgst: base === 0 ? 0 : gst.cgst,     // 0 ← WRONG
};
```

**Correct logic:**
```javascript
const base = Math.max(0, bp + gst.gstTotal); // always bp + GST, even when bp=0
return {
  baseBalance: base,                           // = 0 + 68.75 = ₹68.75
  displaySgst: gst.sgst,                       // ₹34.38 — always show when discountedPrice>0
  displayCgst: gst.cgst,                       // ₹34.38
};
```

**Owner Decision Needed (OD-496-01):** When `balance_payment = 0` (advance covers discounted base) and `gst_on_discounted > 0`:
- **Option A:** `baseBalance = gst_on_discounted` (₹68.75) — GST still owed at checkout. Room balance = ₹68.75. Checkout amount = ₹68.75.
- **Option B:** `baseBalance = 0` but `displaySgst/Cgst` still show the GST amounts (informational only; advance is treated as covering GST too). Room balance = ₹0. Checkout = ₹0.

**My recommendation:** Option A — technically correct. The advance of ₹1,375 = discounted room price (ex-GST). GST (₹68.75) is a separate government liability.

---

## 5. Root Cause Analysis — P3: Wrong GST Sent to Backend

### P3a — At Check-in (`CheckInPage.jsx` L301, `pmsService.pmsCheckIn`)

```javascript
// CheckInPage.jsx L301
const gstBase = Number(form.orderAmount); // = ₹6,700 (FULL price, not discounted)
const { gstTotal: gstTax } = computeRoomGst(..., gstBase, ...);
// → gstTax ≈ ₹335 (GST on ₹6,700)
```
Then `pmsCheckIn` sends:
```
gst_tax = ₹335           ← WRONG: should be GST on (₹6,700 − ₹5,325) = ₹68.75
balance_payment = ₹6,700 + ₹335 − ₹1,375 = ₹5,660  ← WRONG
```

**Correct formula:**
```javascript
const discountedBase = Math.max(0, Number(form.orderAmount) - ciRoomDiscountRs); // ₹1,375
const { gstTotal: gstTax } = computeRoomGst(..., discountedBase, ...);
// → gstTax = ₹68.75
```
`ciRoomDiscountRs` is already computed in the component — this is a 1-line change.

### P3b — At Check-out (`FolioCheckoutPanel.jsx` L291-292)

```javascript
const roomGstTax = order.roomInfo?.gstTax ?? 0;  // gst_tax = null in folio → 0
if (roomGstTax > 0) payload.room_gst_tax = roomGstTax;  // NOT sent (0)
```

**Correct logic:**
```javascript
// gst_on_discounted is already computed in the baseBalance useMemo (BUG-494 E-494-6)
const roomGstTax = displaySgst !== null ? (displaySgst + displayCgst) : 0;
if (roomGstTax > 0) payload.room_gst_tax = roomGstTax;
```
`displaySgst` and `displayCgst` are already in scope from E-494-6. This reuses existing computation.

---

## 6. OD-INV492B-01 Revisited

OD-INV492B-01 was locked as: "advance covers GST too — show ₹0 when bp=0."

This was answered based on the mathematical relationship for order #000325 (₹300 advance, ₹300 discounted price), where the owner said "show ₹0."

**However** — the owner's current statement ("GST should show of 1375") directly contradicts OD-INV492B-01.

**Resolution:** OD-INV492B-01 should be **REVISED** — the new owner rule is: GST on discounted price is ALWAYS displayed (and owed) regardless of bp=0. OD-494-01 is also **INVALIDATED**.

---

## 7. Fix Scope (for Planning/BugFix agent — owner OD-496-01 answer needed first)

| # | Change | File | Lines | Risk |
|---|--------|------|-------|------|
| F1 | Add "Check-in discount" display line | FolioCheckoutPanel.jsx | ~2 new JSX lines in RoomSection | LOW |
| F2 | Fix E-494-6 useMemo — remove `bp===0→0` shortcut; always compute `base = bp + gst` | FolioCheckoutPanel.jsx | L264-267 (2 lines) | HIGH (financial display) |
| F3 | Fix checkout `room_gst_tax` — use `displaySgst+displayCgst` instead of `order.roomInfo?.gstTax` | FolioCheckoutPanel.jsx | L291-292 (1 line) | HIGH (backend payment) |
| F4 | Fix check-in `gstBase` — use `form.orderAmount − ciRoomDiscountRs` | CheckInPage.jsx | L301 (1 line) | HIGH (backend check-in) |

**All 4 fixes are in 2 files: FolioCheckoutPanel.jsx + CheckInPage.jsx. No new imports needed.**

---

## 8. Owner Decisions Needed

**OD-496-01:** When advance exactly covers the discounted room price (`bp=0`) but GST on discounted price is still owed, should:
- **Option A:** Show GST amounts + Room balance = `gst_on_discounted`. Guest pays GST at checkout.
- **Option B:** Show GST amounts (informational) + Room balance = ₹0. Advance treated as covering GST too.

*Recommend Option A — technically correct and prevents under-collection of GST.*

**OD-496-02 (supersedes OD-INV492B-01 + OD-494-01):** Confirm: "GST should always be computed and shown on the discounted price, regardless of whether balance_payment is 0."

---

## 9. Credentials Used
- Login: `boi@bang.com` / `Qplazm@10` (RID 69 — The Goan Kitchen)
- Test order: #000326 (order_id 1232976) — Room r4, 6 Oct → 7 Oct, 80% discount at check-in
- Control order: #000325 (order_id 1232973) — 89% discount, same restaurant

---

## 10. Handover to Planning/BugFix
- Root cause: HIGH confidence, confirmed by probe + code trace.
- Planning skip eligible: YES for F2+F3 (≤5 lines, 1-2 files) with owner OD-496-01 answer.
- F1 and F4 also small scope.
- Recommend registering as **BUG-496** + resolving OD-496-01/02 before Gate 2.
