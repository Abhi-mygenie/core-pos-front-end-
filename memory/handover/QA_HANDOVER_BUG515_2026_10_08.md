# QA HANDOVER — BUG-515
# In-House row balance + expanded row: rack GST replaced with computed effective GST

**Date:** 2026-10-08
**Item:** BUG-515
**Files changed:**
- `src/api/services/pmsService.js` — E-1a/b/c (import + signature + formula + enrichment)
- `src/api/services/frontDeskService.js` — E-2 (getRowBalances +roomGstSlabs)
- `src/pages/pms/FrontDeskWorkstationPage.jsx` — E-3 (+roomGstSlabs from checkInFlags)
- `src/components/pms/frontdesk/GuestTable.jsx` — E-4a (RowExpansionStub) + E-4b (sort)

---

## 1. Self-Test Results (Verification Matrix)

| # | Edit | Verification | Result |
|---|---|---|---|
| V-1 | E-1a import | `grep -n "computeRoomGst" pmsService.js` | ✅ L12 |
| V-2 | E-1b signature | `grep -n "roomGstSlabs.*getInHouseGuests"` | ✅ L39 |
| V-3 | E-1c formula | `grep -n "effectiveGst\|discountRs"` | ✅ L113-122 |
| V-4 | E-1c enrich | `grep -n "row.roomDiscountAmount\|effectiveBalanceDue"` | ✅ L166-172 |
| V-5 | E-2 | `grep -n "roomGstSlabs" frontDeskService.js` | ✅ L147-148 |
| V-6 | E-3 | `grep -n "roomGstSlabs.*checkInFlags"` | ✅ L102 |
| V-7 | E-4a | `grep -n "hasDiscount\|After check-in"` | ✅ L160+L185 |
| V-8 | E-4b | `grep -n "effectiveBalanceDue.*charge"` | ✅ L133 |
| V-9 | compile | `tail frontend.out.log` | ✅ "Compiled successfully" 0 new warnings |

---

## 2. Test Cases

### TC-515-1 — CRITICAL: bonk row balance = ₹600

**Booking:** MG-69-2C201998-53D8-4980-A6A8-B042088BFC9D (bonk)
**Data:** bc=₹3,000 · discount=₹1,000 · paid=₹1,500 · expected balance=₹600

**Steps:**
1. Open `/pms/front-desk-v2?tab=inhouse`
2. Locate bonk row (room r4)
3. Check Balance column value

**Expected:** ₹600 (was ₹650)

---

### TC-515-2 — Expanded row Section 1 (Booking rate)

**Steps:**
1. Click bonk row to expand
2. Check "Booking rate" section (top)

**Expected:**
- Label: "BOOKING RATE" (grey uppercase)
- Booking (incl. GST): ₹3,150
- Paid so far: ₹1,500
- SGST: ₹75, CGST: ₹75
- No "Balance due" in this section (moved to Section 2)

---

### TC-515-3 — Expanded row Section 2 (After discount)

**Steps:**
1. bonk row expanded
2. Check "After check-in discount" section (bottom)

**Expected:**
- Label: "AFTER CHECK-IN DISCOUNT (−₹1,000)" (green uppercase)
- Effective total: ₹2,100
- Balance due: ₹600 (green text)
- SGST: ₹50, CGST: ₹50

---

### TC-515-4 — No-discount booking unchanged

**Steps:**
1. Expand any in-house booking with NO check-in discount
2. Verify layout is unchanged

**Expected:**
- No "Booking rate" label
- No Section 2
- Same grid as before: Booking/Paid so far/SGST/CGST/Balance due

---

### TC-515-5 — Sort key correctness (OD-515-03=a)

**Steps:**
1. Click Balance column header to sort
2. Verify bonk (₹600) is sorted by effective value not rack (₹1,650)

**Expected:** bonk ranks at ₹600 in sort order, not ₹1,650

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---|---|
| R-1 | InHousePanel renders without crash | RowExpansionStub rewritten |
| R-2 | DeparturesPanel balance column unaffected | Shares `getInHouseGuests` — check no-discount departure shows correct balance |
| R-3 | `balanceOf(null)(r)` fallback works | Test file `phase3.cr385.test.jsx L47` — should still return `r.charge.balance_due` when `balances=null` |
| R-4 | BUG-493 bp=0 path intact | When `bp=0` → `roomBalance=0` → `effectiveBalanceDue=0` → no discount section shown (discountRs only enriches when > 0) |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Items: BUG-515
Status: GATE_5A_IMPLEMENTED
Sprint: oct_bug_batch
EXIT GATE: ALL 5 PASSED
```

---

## 5. Credentials + Environment

| Item | Value |
|---|---|
| App URL | `https://core-pos-front-5.preview.emergentagent.com` |
| In-House tab | `…/pms/front-desk-v2?tab=inhouse` |
| Preprod API | `https://preprod.mygenie.online/` |
| Login | `owner@thegoankitchen.com` / `Qplazm@10` |
| Test booking | bonk · MG-69-2C201998-53D8-4980-A6A8-B042088BFC9D · order 1233012 |
| Restaurant | RID 69 (The Goan Kitchen) |

**Note:** bonk booking must still be in-house for TC-515-1 through TC-515-5 to run.
TC-515-4 can use any other in-house booking with no check-in discount.
