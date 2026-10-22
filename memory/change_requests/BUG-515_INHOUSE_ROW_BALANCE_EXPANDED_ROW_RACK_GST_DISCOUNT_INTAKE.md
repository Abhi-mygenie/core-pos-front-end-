# BUG-515 — INTAKE DOC

**ID:** BUG-515
**Date:** 2026-10-08
**Status:** GATE_1_INTAKE
**Registered by:** INTAKE agent (owner-reported + agent-verified via live API probes)
**Source:** OWNER-REPORTED — bonk booking MG-69-2C201998-53D8-4980-A6A8-B042088BFC9D
**Confidence:** CONFIRMED (live API probed, code traced end-to-end)

---

## Title

In-House row balance and expanded row show rack-rate GST values when check-in discount applied — `chargeGst` proxy uses booking snapshot (rack) instead of computed post-discount GST; `RowExpansionStub` reads `row.charge.*` (booking snapshot) exclusively

---

## Description

### Owner's scenario (bonk booking, 8 Oct 2026)

```
Room rent:         ₹3,000
Discount at CI:    ₹1,000   (applied via front-desk-v2 check-in form)
Booking advance:   ₹1,000   (paid at booking)
Check-in collect:  ₹500    (paid at check-in)
Total paid:        ₹1,500

Correct arithmetic:
  effective_room = 3000 − 1000 = 2000
  GST (5%):       2000 × 5% = 100  →  SGST = 50, CGST = 50
  total_incl_GST  = 2100
  balance_due     = 2100 − 1500 = 600
```

### What the UI actually shows

| Field | Shown | Expected | Wrong? |
|---|---|---|---|
| Row balance (table column) | **₹650** | ₹600 | ❌ +₹50 |
| Expanded: Booking (incl. GST) | **₹3,150** | ₹2,100 | ❌ rack rate |
| Expanded: Paid so far | ₹1,500 | ₹1,500 | ✓ |
| Expanded: SGST | **₹75** | ₹50 | ❌ rack |
| Expanded: CGST | **₹75** | ₹50 | ❌ rack |
| Expanded: Balance due | **₹1,650** | ₹600 | ❌ rack-based |

---

## Code Reality

**PARTIAL** — the issue is in code introduced by BUG-491/BUG-493 as a workaround. No missing features — the wrong formula and wrong data source are both actively in use.

### Sub-issue A — Row balance (`pmsService.js L112-114`)

```js
// pmsService.js L112-114 — BUG-493 OD-493-01 Option B introduced this workaround
const chargeGst = Number(row.charge?.sgst ?? 0) + Number(row.charge?.cgst ?? 0);
//              = 75 + 75 = 150   ← RACK values from LR booking snapshot
const roomBalance = bp != null
    ? (bp === 0 ? 0 : Math.max(0, bp + chargeGst))
//                              ↑ 500 + 150 = 650   (WRONG — should be 500 + 100)
```

The workaround was needed because `ri.gst_tax` is absent from `room_info` (confirmed by live probe: `room_info` keys = `['room_price', 'advance_payment', 'balance_payment', 'room_discount_amount', ...]` — no `gst_tax`).

The correct fix: compute `effectiveGst = computeRoomGst(roomGstSlabs, ri.room_price − ri.room_discount_amount, charge.nights, 1).gstTotal = 100`. `roomGstSlabs` is NOT currently passed to `getInHouseGuests()` — this is the key missing link.

### Sub-issue B — Expanded row display (`GuestTable.jsx L167-171`)

```jsx
// RowExpansionStub — reads exclusively from row.charge.* (booking snapshot)
{fmtINR(row.charge?.total_with_gst)}  // = 3150 (rack — never updated for discount)
{fmtINR(row.charge?.sgst)}            // = 75   (rack)
{fmtINR(row.charge?.cgst)}            // = 75   (rack)
{fmtINR(row.charge?.balance_due)}     // = 1650 (rack total − paid)
```

The backend does NOT update `charge.total_with_gst`, `charge.sgst`, `charge.cgst`, or `charge.balance_due` when a check-in discount is applied. Only `charge.advance_payment` is updated.

The data needed to compute post-discount display values IS available from `room_info` (`ri.room_price = 3000`, `ri.room_discount_amount = 1000`) but is NOT stored on `row` during Step 3, so `RowExpansionStub` has no access to it.

---

## Live API Proof (probes 2026-10-08)

### Probe 1 — LR charge (booking snapshot)

```
GET /api/v2/vendoremployee/aiosell/local-reservations
Booking: MG-69-2C201998-53D8-4980-A6A8-B042088BFC9D

charge.rate_per_night:  3000   (rack)
charge.nights:          1      ← available for GST computation!
charge.sgst:            75     (rack)
charge.cgst:            75     (rack)
charge.total_with_gst:  3150   (rack)
charge.advance_payment: 1500   ← CORRECT (backend updates payments)
charge.balance_due:     1650   (3150−1500, rack-based)

rooms[0].room_discount_amount: None  ← NOT in LR rooms
rooms[0].order_id:             1233012
```

### Probe 2 — Order room_info (folio)

```
POST /api/v2/vendoremployee/get-single-order-new { order_id: 1233012 }

room_info.room_price:          3000.00
room_info.gst_tax:             [FIELD ABSENT — not in response keys]
room_info.advance_payment:     1500.00
room_info.balance_payment:     500.00  ← room balance without GST: 2000−1500=500
room_info.room_discount_amount: 1000.00 ← CORRECT
room_info.room_discount_at:    check_in

room_info ALL keys: ['room_price','advance_payment','balance_payment',
  'room_discount_amount','room_discount_type','room_discount_reason',
  'room_discount_at','room_discount_detail']
  NOTE: 'gst_tax' is completely absent.
```

Evidence saved: `evidence/INV-BONK-BUG515-2026-10-08/`

---

## Duplicate Check

| ID | Relation | Status |
|---|---|---|
| **BUG-491 Sub-A** | RELATED — introduced the `bp + chargeGst` workaround because `ri.gst_tax` absent | GATE_5A_IMPLEMENTED |
| **BUG-493** | RELATED — introduced `row.charge` enrichment in Step 2; provides `chargeGst` data | GATE_5A_IMPLEMENTED |
| **BUG-494** | RELATED — fixed same rack-value problem in `FolioCheckoutPanel` | GATE_5A_IMPLEMENTED |
| **BUG-515** | **DISTINCT** — new symptom: `chargeGst` proxy wrong for discounted in-house rows; `RowExpansionStub` not covered by BUG-494 | NEW |

---

## Severity & Risk

- **Severity: P1 — HIGH**
  - Balance column wrong for all discounted in-house bookings
  - Staff may ask guest for wrong amount (₹650 vs ₹600)
  - Expanded row completely misleading (shows rack ₹3,150 instead of ₹2,100)
  - Workaround: click "Bill" which shows correct FolioCheckoutPanel
- **Risk: CRITICAL** (R6 — financial display directly affecting billing decisions)
- **Fast Lane: NO** — multi-file, financial (R6), and `roomGstSlabs` parameter propagation required
- **Sprint:** oct_bug_batch

**Severity rubric check:** Feature broken (wrong balance shown), workaround exists (Bill button) → P1 HIGH. Agent classifies as P1. Owner to confirm or override.

---

## Blast Radius

```bash
grep -rn "chargeGst\|getInHouseGuests\|RowExpansionStub\|getRowBalances\|useRowBalances" \
  /app/frontend/src --include="*.js" --include="*.jsx" | grep -v test | wc -l
# → 20 references across 5 files
```

**Files WILL change (planning estimates):**

| File | Sub-issue | Change type |
|---|---|---|
| `src/api/services/pmsService.js` | A + B | Import `computeRoomGst`; add `roomGstSlabs` param; compute `effectiveGst`; enrich `row.roomDiscountAmount` + `row.effectiveGst` etc |
| `src/api/services/frontDeskService.js` | A | Forward `roomGstSlabs` through `getRowBalances()` |
| `src/pages/pms/FrontDeskWorkstationPage.jsx` | A | Add `roomGstSlabs` to `useRowBalances` opts |
| `src/components/pms/frontdesk/GuestTable.jsx` | B | `RowExpansionStub` reads enriched `row.*` when discount > 0 |

**Hotspot files touched:** NONE (none in R5 list)
**Blast: MEDIUM** (4 files, ~20 lines, financial formula touch in pmsService.js)

---

## Open Owner Decisions

### OD-515-01 — `roomGstSlabs` propagation strategy (Sub-issue A)

`computeRoomGst()` needs `roomGstSlabs` to compute `effectiveGst`. Currently NOT passed to `getInHouseGuests()`.

**Option a (recommended):** Add `roomGstSlabs` as a new parameter alongside existing `roomGstApplicable`, propagate through `getRowBalances()` → `useRowBalances` → `FrontDeskWorkstationPage.jsx`. Same pattern as `roomGstApplicable` which already flows through all these.

**Option b:** Derive GST rate from `charge.booking_charge` + `charge.sgst` + `charge.cgst` as a proxy: `gstRate = chargeGst / booking_charge`. Risk: **wrong for slab-crossing discounts** (e.g., ₹8,000 rack at 18%, after ₹1,500 discount → ₹6,500 at 5% — proxy gives 18%, correct is 5%). **NOT RECOMMENDED.**

**Recommended: Option a**

### OD-515-02 — What to show in expanded row when discount > 0 (Sub-issue B)

**Option a (recommended):** Show **post-discount** values when `row.roomDiscountAmount > 0`:
  - "Booking (incl. GST)" → `effectiveTotal` (₹2,100)
  - "SGST" → `effectiveSgst` (₹50)
  - "CGST" → `effectiveCgst` (₹50)
  - "Balance due" → `effectiveBalanceDue` (₹600)
  - "Paid so far" → `charge.advance_payment` (₹1,500) — unchanged ✓

**Option b:** Keep rack values but add a "Discount applied: ₹1,000" info line below. Simpler but user must subtract manually.

**Option c:** Show both — rack values + a collapse/expand discount breakdown.

**Recommended: Option a** (cleanest, matches what owner expects per scenario description)

---

## Fix Direction (pending ODs)

### Sub-issue A — Balance formula (pmsService.js)

```js
// Step 3 — replace chargeGst with computed effectiveGst:
const discountRs   = Number(ri.room_discount_amount ?? 0);
const effectiveRoom = Math.max(0, rp - discountRs);
const nights       = row.charge?.nights ?? 1;
const effectiveGst = discountRs > 0 && roomGstApplicable && roomGstSlabs
    ? computeRoomGst(true, roomGstSlabs, effectiveRoom, nights, 1).gstTotal
    : chargeGst;  // fallback: no discount → rack values still correct
const roomBalance = bp != null
    ? (bp === 0 ? 0 : Math.max(0, bp + effectiveGst))
    : ...
```

New param: `getInHouseGuests({ roomGstApplicable, roomGstSlabs })` → propagate through 3 files.

### Sub-issue B — Expanded row (pmsService.js Step 3 + GuestTable.jsx)

In Step 3, enrich `row`:
```js
if (discountRs > 0) {
    row.roomDiscountAmount = discountRs;
    row.effectiveGst       = effectiveGst;
    row.effectiveSgst      = effectiveGst / 2;
    row.effectiveCgst      = effectiveGst / 2;
}
```

In `RowExpansionStub`, use `row.roomDiscountAmount > 0` to switch to post-discount display.

---

## Next

Owner to answer:
- **OD-515-01:** Option a or b for `roomGstSlabs` propagation?
- **OD-515-02:** Option a, b, or c for expanded row display?

→ **Gate 2 GO → PLANNING (Impact Analysis)**
