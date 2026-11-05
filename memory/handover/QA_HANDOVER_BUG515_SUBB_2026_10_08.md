# QA HANDOVER — BUG-515 Sub-B
# In-House / Departures expanded row: discount pipeline bridge complete

**Date:** 2026-10-08
**Item:** BUG-515 (Sub-B)
**Files changed:**
- `src/api/services/frontDeskService.js` — E-5 (joinRowBalances +5 discount fields)
- `src/components/pms/frontdesk/InHousePanel.jsx` — E-6 (renderExpansion merge)
- `src/components/pms/frontdesk/DeparturesPanel.jsx` — E-7 (renderExpansion merge, OD-515-04=a)

---

## 1. Self-Test Results (Verification Matrix)

| # | Edit | Verification | Result |
|---|---|---|---|
| V-1 | E-5 discount fields | `grep -n "roomDiscountAmount.*null.*BUG-515" frontDeskService.js` | ✅ L149-153 (×5) |
| V-2 | E-5 existing fields intact | `grep -n "room: g\.roomBalance\|fnb: g\.roomOrders\|transferred:"` | ✅ L146-148 present |
| V-3 | E-6 merge in InHousePanel | `grep -n "enrichedRow\|BUG-515 Sub-B" InHousePanel.jsx` | ✅ L23/L27/L31/L32 |
| V-4 | E-7 merge in DeparturesPanel | `grep -n "enrichedRow\|BUG-515 Sub-B" DeparturesPanel.jsx` | ✅ L42/L46/L50/L51 |
| V-5 | compile | webpack compiled with 1 warning (pre-existing SettlementReportMockup.jsx) | ✅ 0 NEW warnings |

**Self-test: 5/5 PASS**

---

## 2. Test Cases

### TC-515B-1 — CRITICAL: bonk expanded row shows post-discount values (In-House)

**Booking:** MG-69-2C201998-53D8-4980-A6A8-B042088BFC9D (bonk)
**Data:** rack=₹3,000 · discount=₹1,000 · GST on ₹2,000 (5%)=₹100 · paid=₹1,500

**Steps:**
1. Login as `owner@thegoankitchen.com` / `Qplazm@10`
2. Navigate to `/pms/front-desk-v2?tab=inhouse`
3. Locate bonk row (room r4, suite)
4. Click row to expand (expandedKind='detail')
5. Read both sections

**Expected:**
- Section 1 label: "BOOKING RATE" (grey uppercase)
- Section 1: Booking (incl. GST) = ₹3,150 · Paid so far = ₹1,500 · SGST = ₹75 · CGST = ₹75
- No "Balance due" in Section 1
- Section 2 label: "AFTER CHECK-IN DISCOUNT (−₹1,000)" (green uppercase)
- Section 2: Effective total = ₹2,100 · Balance due = ₹600 (green) · SGST = ₹50 · CGST = ₹50

**Was (bug):** Single-section layout with rack values only — no Section 1 label, no Section 2

---

### TC-515B-2 — No-discount row unchanged

**Steps:**
1. In-House tab → expand any booking with NO check-in discount

**Expected:**
- Single section (no "Booking rate" label, no Section 2)
- Same layout as before fix: Booking/Paid/SGST/CGST/Balance due
- Balance due = charge.balance_due (rack, same as before)

---

### TC-515B-3 — Sort key correctness

**Steps:**
1. In-House tab → click Balance column header to sort

**Expected:**
- bonk row ranks at ₹600 position in sort order, not ₹1,650

---

### TC-515B-4 — balances still loading (graceful degradation)

**Steps:**
1. On hard-refresh (balances loading state), quickly expand bonk row before balances resolve
2. Observe Section 2

**Expected:**
- Single section only while balances load (graceful — `balances=undefined` → `b=undefined` → `enrichedRow=row`)
- No crash, no broken layout

---

### TC-515B-5 — Departures tab parity (OD-515-04=a)

**Steps:**
1. Navigate to Departures tab
2. If bonk (or any guest with check-in discount) is in Departures today, expand the row (expandedKind='detail')

**Expected:**
- Same two-section layout as In-House
- Note: if no discounted guest is in departures, TC-515B-5 is NOT COVERABLE today — note as data gap, not a failure

---

### TC-515B-REG-1 — Bill button not affected (E-6 path guard)

**Steps:**
1. In-House tab → click "Bill" button on bonk row (expandedKind='bill')
2. FolioCheckoutPanel should open

**Expected:** FolioCheckoutPanel opens normally — E-6 bill path unchanged

---

### TC-515B-REG-2 — Extend button not affected (E-6 path guard)

**Steps:**
1. In-House tab → click "Extend" button (expandedKind='extend')
2. ExtendStayForm should open

**Expected:** ExtendStayForm opens normally — E-6 extend path unchanged

---

### TC-515B-REG-3 — Balance column Sub-A still correct

**Steps:**
1. In-House tab → check Balance column value for bonk row (no expansion needed)

**Expected:** Balance column = ₹600 (Sub-A, unchanged — E-5 additive only, `display` field still present)

---

## 3. Regression Tests

| # | What to verify | Why |
|---|---|---|
| R-1 | `balanceOf(balances)(r)` still reads `.display` correctly | E-5 added fields but `.display` is unchanged via `...roundBalance(...)` spread |
| R-2 | InHousePanel renders without crash on page load | `() => (...)` → `() => { ... }` JSX transformation compile-clean |
| R-3 | DeparturesPanel renders without crash | Same JSX transformation on L42 |
| R-4 | Non-discounted rows in both panels show single section | `(null ?? 0) > 0 = false` → `enrichedRow = row` identity |

---

## 4. Registry Sync Confirmation

```
Registry synced: YES
Items: BUG-515
Status: GATE_5A_IMPLEMENTED (Sub-B pipeline bridge complete)
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
| Test booking | bonk · MG-69-2C201998-53D8-4980-A6A8-B042088BFC9D · RID 69 |
| No-discount booking | Any other in-house booking at The Goan Kitchen |

**Note:** bonk must still be in-house for TC-515B-1 to run. TC-515B-4 requires a fresh hard-refresh. TC-515B-5 needs a departing guest with discount today.
