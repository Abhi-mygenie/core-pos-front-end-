# Session Handover — 2026-09-16 (Full PMS Sprint Session)

```
Written:          2026-09-16
Session status:   CLOSED — Deployment + Memory sync + Planning + Implementation + Investigation + Intake complete
Workspace:        /app (branch: 16sep — frontend-only React app connecting to preprod.mygenie.online)
Preview URL:      https://8932d38e-0915-4af5-96dd-517b41b76b92.preview.emergentagent.com
Registry:         685 items
Webpack:          compiled with 1 warning (pre-existing ESLint exhaustive-deps, unrelated files)
```

---

## §0 — Next Agent Boot Sequence (MANDATORY)

```
1. Read this handover IN FULL
2. Read /app/memory/control/AGENT_PROMPT_ALPHA.md → role decision tree
3. Read /app/memory/control/CONTROL_DASHBOARD.md → current state
4. Read /app/memory/control/BUG_TRACKER.md → all active bugs
5. Read /app/memory/control/FILE_OWNERSHIP.md → conflict check before any edit
6. Verify environment: tail -5 /var/log/supervisor/frontend.out.log → "webpack compiled with 1 warning"
```

---

## §1 — Session Summary

This session covered the full cycle for a PMS sprint:
- **Deployed** the existing repo (`core-pos-front-end`) into `/app`
- **Memory sync** from remote repo (682 files restored)
- **Planning (Gates 2+3)** for BUG-419 through BUG-425
- **Implementation (Gate 5a)** for all 7 bugs (Batch A/B/C)
- **Investigation** of 3 new balance/GST gaps found in live testing
- **Intake (Gate 1)** for BUG-426, BUG-427, BUG-428

---

## §2 — Implemented This Session (Gate 5a — Awaiting QA)

All 7 bugs are implemented and webpack-clean. **None have Gate 5b QA yet.**

| ID | Title | File(s) Changed | Risk |
|----|-------|----------------|------|
| **BUG-419** | Corp/B2B checkbox moved below Guest Name, before Room Assignment | `CheckInPage.jsx` | LOW |
| **BUG-420** | Walk-in CRM docs: text badges → image tiles with click-to-open | `CheckInPage.jsx` | MEDIUM |
| **BUG-421** | In-House balance: room-only → room+GST−advance−received (parallel folio calls Step 3) | `pmsService.js` | HIGH |
| **BUG-422** | Old modal `balancePayment` now includes GST (`room + gstTax - advance`) | `RoomCheckInModal.jsx` | CRITICAL |
| **BUG-423** | Folio Room Balance: live formula `roomPrice + gstTax − advance − received` | `GuestFolioPage.jsx` | CRITICAL |
| **BUG-424** | Folio: new Room Orders section (LHS) with items, qty, rate, GST expand | `folioTransform.js` + `GuestFolioPage.jsx` | MEDIUM |
| **BUG-425** | PmsCheckoutDrawer ROOM balance: override `remainingRoomBalance` with live GST formula | `PmsCheckoutDrawer.jsx` | HIGH |

**QA handover doc:** `/app/memory/handover/QA_HANDOVER_BATCHA_BUG422_423_424_425_2026_09_16.md`

---

## §3 — Newly Registered (Gate 1 — Need Planning + Implementation + QA)

| ID | Title | Area | Risk | All ODs? |
|----|-------|------|------|----------|
| **BUG-426** | In-House balance missing transferred F&B + room orders with GST | `pmsService.js` | HIGH | ✅ All locked |
| **BUG-427** | Folio Total Balance Due excludes room orders (post-GST) | `folioTransform.js` + `GuestFolioPage.jsx` | CRITICAL | ✅ All locked |
| **BUG-428** | Checkout ROOM breakdown missing Lodging GST line (R5 hotspot) | `CollectPaymentPanel.jsx` | MEDIUM | ✅ All locked (OD-428-02: show only if gstTax > 0) |

---

## §4 — Key Owner Decisions Locked (All Bugs)

### BUG-419
- OD-419-01: Corp/B2B after Name/Phone, before Room Assignment ✅

### BUG-420
- OD-420-01: Image tiles + click to open (new tab) ✅
- OD-420-02: Re-upload optional when docs on file ✅

### BUG-421
- OD-421-01: Balance = room_price + GST − advance − received ✅
- OD-421-02: Parallel folio calls acceptable; note as future improvement ✅

### BUG-422
- OD-422-01: Old modal balance_payment MUST include GST (same as new CheckInPage) ✅

### BUG-423
- OD-423-01: Always compute fresh: roomPrice + gstTax − advance − received ✅
- OD-423-02: Total Balance Due = Room Balance + F&B Posted ✅

### BUG-424
- OD-424-01: Row click → expand GST inline (no navigation) ✅
- OD-424-02: Item-level GST shows if configured; ₹0.00 if not ✅

### BUG-425
- OD-425-01: Fix inside PmsCheckoutDrawer only (Path A — don't touch CollectPaymentPanel) ✅
- OD-425-02: All 6 test scenarios must pass ✅

### BUG-426
- OD-426-01: Include transferred F&B + room orders with item GST in In-House balance ✅
- OD-426-02: Config caveat (roomGstApplicable inaccessible in service) — document as known limitation ✅

### BUG-427
- OD-427-01: Total Balance Due = room + transferred F&B + room orders (post-GST) = ₹1,624 ✅
- OD-427-02: Room Orders section total uses post-GST; row display stays pre-tax with expand ✅
- OD-427-03: F&B Posted tile to include room orders total ✅

### BUG-428
- OD-428-01: Add Lodging GST line to checkout ROOM breakdown ✅
- OD-428-02: Show only when `roomInfo.gstTax > 0` ✅

---

## §5 — Files Changed This Session

| File | Bugs | What changed |
|------|------|-------------|
| `src/pages/pms/CheckInPage.jsx` | BUG-419, BUG-420 | Corp/B2B reordered; CRM doc tiles |
| `src/api/services/pmsService.js` | BUG-421 | Step 3 parallel folio calls with Map + formula |
| `src/components/modals/RoomCheckInModal.jsx` | BUG-422 | gstTax useMemo + balancePayment includes GST |
| `src/pages/pms/GuestFolioPage.jsx` | BUG-423, BUG-424 | roomBalance formula; Room Orders section |
| `src/api/transforms/folioTransform.js` | BUG-424 | roomOrders mapping from raw.orderDetails[] |
| `src/components/pms/PmsCheckoutDrawer.jsx` | BUG-425 | roomInfo override with computed remainingRoomBalance |

---

## §6 — Next Agent Instructions

### Priority 1 — Planning + Implementation for BUG-426, BUG-427, BUG-428

**BUG-426** (`pmsService.js` Step 3):
- Add transferred F&B total: `sum(raw.associated_order_list[].order_amount)`
- Add room orders total with GST: loop `raw.orderDetails[]`, skip check-in marker (`food_details.name === 'check in'`), skip cancelled (`food_status === 'cancelled'`), compute per item: if `food_details.tax_calc === 'Inclusive'` extract GST from price, else add GST on top. Sum all line totals.
- `row.balance = roomBalance + transferredTotal + roomOrdersTotal`
- Add code comment: `// KNOWN LIMITATION: roomGstApplicable setting not accessible here — food item GST may be over-counted when this flag is false`
- All data in same already-fetched SINGLE_ORDER_NEW response (no new API call)

**BUG-427** (`folioTransform.js` + `GuestFolioPage.jsx`):
- `folioTransform.js`: add `totalAmount: Math.round((amt + gstAmt) * 100) / 100` to each roomOrder item
- `GuestFolioPage.jsx`:
  - Room Orders section total: `folio.roomOrders.reduce((s,r) => s + r.totalAmount, 0)` (use totalAmount)
  - Compute `roomOrdersTotal = folio.roomOrders?.reduce((s,r) => s + (r.totalAmount ?? r.amount), 0) ?? 0`
  - F&B Posted tile: `fnbTotal + roomOrdersTotal` (or show separately as two tiles — owner has not specified; CHECK at Gate 2)
  - Total Balance Due: `roomBalance + fnbTotal + roomOrdersTotal`

**BUG-428** (`CollectPaymentPanel.jsx` — R5 HOTSPOT):
- Add one conditional JSX line between Room Charge and Advance Paid:
  ```jsx
  {(roomInfo.gstTax > 0) && (
    <div className="flex justify-between">
      <span>Lodging GST</span>
      <span>+₹{(roomInfo.gstTax).toLocaleString()}</span>
    </div>
  )}
  ```
- Gate 2 must include R5 regression checklist
- Must verify non-room checkout flows are unaffected (dine-in, delivery, split-bill, walk-in)

### Priority 2 — QA for BUG-419 through BUG-425 (Gate 5b)

Use QA handover at: `/app/memory/handover/QA_HANDOVER_BATCHA_BUG422_423_424_425_2026_09_16.md`

**Test credentials:** `/app/memory/test_credentials.md`
**Test guest reference:** "test gst" (r1, order #000069, #1232408) — room ₹1,000, GST ₹50, advance ₹100

**Validated correct grand total:** ₹1,624 = Room Balance ₹950 + Transferred F&B ₹418 + Room Orders post-GST ₹256

Key test scenarios per bug:
- BUG-422: old modal network payload → `balance_payment = room + gst - advance`
- BUG-423: folio Room Balance = ₹1,050 for parth (no advance), ₹950 for test gst (₹100 advance)
- BUG-424: Room Orders section appears on LHS; items show; row click expands GST; empty state works
- BUG-425: checkout drawer ROOM line = ₹950 (not ₹1,000); Grand Total = ₹1,624
- BUG-419: Corp/B2B appears below Guest Name, before Room Assignment (walk-in form)
- BUG-420: walk-in form shows image tiles for returning guest docs (not text labels)
- BUG-421: In-House balance column = ₹950 (room only at this stage — BUG-426 extends this)

### Priority 3 — Cross-module dependency check during QA

The QA agent must explicitly check the following dependencies before marking any item clean:

| Dependency | Risk | What to check |
|------------|------|---------------|
| BUG-422 stored value vs BUG-423 display | CRITICAL | Folio should compute correct balance regardless of stored balance_payment. Verify for both old-modal and new-CheckInPage guests. |
| BUG-421 balance vs BUG-426 (not yet implemented) | HIGH | BUG-421 sets room-only balance. BUG-426 will extend it. Don't regress BUG-421. |
| BUG-424 roomOrders vs BUG-427 (not yet implemented) | CRITICAL | BUG-424 shows section but doesn't count it in Total Balance Due. BUG-427 fixes that. Flag clearly in QA report. |
| BUG-425 checkout amount vs BUG-428 (not yet implemented) | MEDIUM | Checkout amount ₹1,624 is correct. BUG-428 adds GST line to breakdown only (no amount change). |
| BUG-425 Path A override vs CollectPaymentPanel | HIGH | Verify non-room orders (dine-in, delivery) unaffected — PmsCheckoutDrawer only passes roomInfo when `detail.isRoom === true`. |

### Priority 4 — PMS Module Regression

After individual QA passes, run full PMS regression covering:
1. Check-in (old modal + new CheckInPage + walk-in)
2. In-House Guests page (load, balance, KPI strip, Refresh)
3. Guest Folio (room charges, F&B sections, Total Balance Due, Check Out button)
4. Checkout drawer (ROOM breakdown, Grand Total, payment methods)
5. Extend Stay (no regression from BUG-421/BUG-425 changes)
6. Non-PMS flows: dine-in order checkout (CollectPaymentPanel unchanged for non-room)

---

## §7 — Open Items / Flags for Next Agent

| Flag | Detail |
|------|--------|
| OD-427 F&B Posted tile design | Owner hasn't specified: should tile show transferred + room orders combined (₹674) or two separate tiles? Confirm at Gate 2 before implementing BUG-427. |
| BUG-428 R5 regression | CollectPaymentPanel is a hotspot. Gate 2 plan must include explicit regression checklist for non-room flows. |
| BUG-426 config limitation | `roomGstApplicable` flag cannot be checked in pmsService. Document in code comment. No code workaround needed. |
| BUG-424 ↔ BUG-427 | BUG-424 is GATE_5A_IMPLEMENTED showing room orders section. BUG-427 needs to EXTEND the existing BUG-424 implementation (add totalAmount field + wire into Total Balance Due). Read BUG-424 implementation before planning BUG-427 to avoid overwriting. |

---

## §8 — Artifact Paths

| Artifact | Path |
|----------|------|
| QA Handover (Batch A) | `/app/memory/handover/QA_HANDOVER_BATCHA_BUG422_423_424_425_2026_09_16.md` |
| Investigation (balance gaps) | `/app/memory/investigations/INVESTIGATION_2026_09_16_BALANCE_GST_GAPS.md` |
| Investigation (folio/checkout G1-G4) | `/app/memory/investigations/INVESTIGATION_2026_09_16_FOLIO_CHECKOUT_GAPS.md` |
| BUG-426 intake | `/app/memory/change_requests/BUG-426_INHOUSE_BALANCE_MISSING_FNB_ROOM_ORDERS_INTAKE.md` |
| BUG-427 intake | `/app/memory/change_requests/BUG-427_FOLIO_TOTAL_BALANCE_DUE_MISSING_ROOM_ORDERS_INTAKE.md` |
| BUG-428 intake | `/app/memory/change_requests/BUG-428_CHECKOUT_ROOM_BREAKDOWN_MISSING_GST_LINE_INTAKE.md` |
| BUG-419–425 plans | `/app/memory/plans/BUG-4XX_IMPLEMENTATION_PLAN.md` (one per bug) |
| This handover | `/app/memory/handover/SESSION_HANDOVER_2026_09_16_FULL_SESSION.md` |

---

## §9 — Registry Status at Session Close

| ID | Status |
|----|--------|
| BUG-419 | GATE_5A_IMPLEMENTED |
| BUG-420 | GATE_5A_IMPLEMENTED |
| BUG-421 | GATE_5A_IMPLEMENTED |
| BUG-422 | GATE_5A_IMPLEMENTED |
| BUG-423 | GATE_5A_IMPLEMENTED |
| BUG-424 | GATE_5A_IMPLEMENTED |
| BUG-425 | GATE_5A_IMPLEMENTED |
| BUG-426 | INTAKE (Gate 1) |
| BUG-427 | INTAKE (Gate 1) |
| BUG-428 | INTAKE (Gate 1) |
