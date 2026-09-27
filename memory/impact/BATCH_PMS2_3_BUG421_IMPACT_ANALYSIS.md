# Impact Analysis — BATCH-PMS2-3
## BUG-421: In-House Page Balance Column Shows Booking Total, Not Outstanding Balance

**Gate:** 2 — Impact Analysis
**Date:** 2026-09-16
**Role:** PLANNING
**Code Reality:** CONFIRMED BUG — wrong field used, correct field requires additional API step

---

## Conflict Pre-Check

| File | Other open items touching same file | Risk |
|---|---|---|
| `pmsService.js` | BUG-396 (GATE_5B_QA_PASS — closed), BUG-386 (GATE_5B_QA_PASS — closed), BUG-378 (IMPLEMENTED — closed) | SAFE — all prior work closed |
| `InHouseGuestsPage.jsx` | CR-360 (GATE_5B_QA_PASS — closed) | SAFE |

No active conflicts.

---

## Data Flow Trace

### Step 1 — Current (broken) path
```
pmsService.getInHouseGuests() — Step 2 enrichment (L57-68):

  GET /aiosell/local-reservations
  → reservations filtered by operational_status === 'in_house'
  → join: rooms[0].order_id === row.parentOrderId
  → row.balance = match.res.amount_after_tax   ← WRONG FIELD

InHouseGuestsPage.jsx L164:
  {row.balance != null ? `₹${Number(row.balance).toLocaleString()}` : '—'}
  → shows ₹1,000 for all guests (= amount_after_tax = booking total)
```

### Step 2 — Why it is wrong: live probe evidence

Probe: `evidence/INV-PMS-ENH/probe_12_lr_view_values.json`
In-house guest (booking.com, order 1232218, checked_in_at: 2026-09-04):
```
amount_after_tax: 13922.28    ← booking total — WHAT WE CURRENTLY SHOW
advance_payment:  None         ← null in LR response ← cannot subtract this
balance_payment:  None         ← null in LR response ← cannot use this
```

**Confirmed:** For actual in-house guests, `local-reservations.balance_payment` and `advance_payment` are `None`. Option of using LR fields directly is **not viable**.

The correct outstanding balance lives only in the POS order:
`POST /get-single-order-new { order_id }` → `room_info.balance_payment` + `room_info.gst_tax` + `room_info.advance_payment` + `room_info.receive_balance`

These are the same fields used by the BUG-423 FE formula: `room_price + gst_tax − advance_payment − receive_balance`.

---

## Fix Options

### Option A — Parallel per-row order fetch *(Recommended)*
After current Step 1+2, add **Step 3**: for every row that has a `parentOrderId`, call `get-single-order-new` in parallel. Derive balance using the BUG-423 formula.

```
// Step 3 (new) — fetch order detail per row in parallel
const withOrderIds = rows.filter(r => r.parentOrderId);
const orderResults = await Promise.allSettled(
  withOrderIds.map(r =>
    api.post(SINGLE_ORDER_NEW, { order_id: r.parentOrderId })
  )
);
orderResults.forEach((result, i) => {
  if (result.status === 'fulfilled') {
    const ri = result.value?.data?.orders?.order_details_order?.room_info ?? {};
    const roomPrice      = parseFloat(ri.room_price)       || 0;
    const gstTax         = parseFloat(ri.gst_tax)          || 0;
    const advancePaid    = parseFloat(ri.advance_payment)  || 0;
    const received       = parseFloat(ri.receive_balance)  || 0;
    // BUG-421: same formula as BUG-423 GuestFolioPage
    withOrderIds[i].balance = Math.max(0, roomPrice + gstTax - advancePaid - received);
  }
  // On failure: row.balance stays null → renders '—' (graceful degradation)
});
```

**Pros:** 100% accurate. Self-consistent with BUG-423 folio formula. Handles advances + GST + partial payments.
**Cons:** N extra API calls on page load (N = number of in-house guests, typically 2–15).

### Option B — Lazy balance (no extra calls)
Keep showing "—" in balance column. Replace "View Bill" link with tooltip: "Tap to see current balance." User must open folio for exact figure.

**Pros:** No extra API calls.
**Cons:** Balance column becomes useless. Defeats the purpose of the in-house overview.

### Option C — Use LR `amount_after_tax - advance` (not viable)
`advance_payment` is `None` in LR for in-house guests. **Ruled out by live probe.**

---

## Recommended Approach: Option A

**Files in scope:**

| File | Change | Lines |
|---|---|---|
| `pmsService.js` | Add Step 3 after current enrichment loop. Import `api` and `API_ENDPOINTS.SINGLE_ORDER_NEW`. | ~20 new lines after L68 |
| `InHouseGuestsPage.jsx` | Add loading state for balance column while Step 3 resolves. Show skeleton "…" per row until balance loaded. | ~10 lines |

**Formula consistency:** BUG-421 uses the SAME formula as BUG-423 (`room_price + gst_tax − advance_payment − receive_balance`). This guarantees the in-house page balance matches the folio page balance exactly.

---

## Verification Matrix

| Edit # | File | Change | How to Verify |
|---|---|---|---|
| E1 | `pmsService.js` | Step 3 parallel fetch → balance from room_info | In-house page: joli (r5, adv ₹100) shows ₹920, not ₹1,000 |
| E2 | `InHouseGuestsPage.jsx` | Loading skeleton per row | Brief "…" in balance column on page open, then resolves to ₹920 |
| R1 | Both | Walk-in guests (no order_id) still show "—" | Walk-in with no AIOSELL reservation: balance column = "—" (no crash) |
| R2 | Both | Page still loads if Step 3 API fails | Mock network error on one order → that row shows "—", others show correct |
| R3 | Both | KPI "Outstanding Balance" strip updates | KPI tile shows ₹920 × N guests (correct sum) |

---

## Post-Code Registry Checklist (for Implementation agent)
```
- [ ] registry.json: BUG-421 → status: IMPLEMENTED, sprint_key: pos_pms_2
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: pmsService.js (BUG-421), InHouseGuestsPage.jsx (BUG-421)
- [ ] Code markers: // BUG-421 in each modified file
```

---

## Open Owner Decisions

| OD | Question | Blocking? |
|---|---|---|
| **OD-421-01** | Balance formula = `room_price + gst_tax − advance − received` (same as folio, includes GST) — confirm? | YES — formula |
| **OD-421-02** | Page load makes one API call per in-house guest to get the accurate balance — acceptable? (typically 2–15 calls) | YES — approach |

*If OD-421-02 = NO → use Option B (show "—", user opens folio for balance).*
