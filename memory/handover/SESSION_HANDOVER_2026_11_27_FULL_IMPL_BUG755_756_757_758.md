# Session Handover — 2026-11-27 — Full Implementation Session
## BUG-755 · BUG-756 · BUG-756-B · BUG-757 · BUG-758

```
Role for next agent : Boot AGENT_PROMPT_ALPHA → then follow phases below
Date written        : 2026-11-27
Written by          : E1 (Emergent agent)
Primary doc         : /app/memory/control/AGENT_PROMPT_ALPHA.md
Sprint              : dec_sprint
Branch pushed       : ultimate-fix (HEAD = this commit)
Registry            : 1204 items — BUG-755/756/756-B/757/758 all at GATE_5A_IMPLEMENTED
```

---

## 0. BOOT SEQUENCE (MANDATORY)

```
1. READ this file in full
2. READ /app/memory/control/AGENT_PROMPT_ALPHA.md
3. PRESENT to owner:
   "Last session (2026-11-27): Implemented 5 bugs — BUG-755 (dashboard room amount),
    BUG-756 (Print Bill 403), BUG-756-B (Print Bill 'No order data' + wrong printOrder
    signature), BUG-757 (nights not calculating), BUG-758 (item times showing hours not days).
    All 5 at GATE_5A_IMPLEMENTED. All pushed to ultimate-fix. No QA done yet.
    5 Audit CRs (CR-563–567) waiting at Gate 1."
4. ASK owner which phase to start
```

---

## 1. ENVIRONMENT

| Item | Value |
|------|-------|
| App URL (preview) | `https://genie-core-pos-2--0px7nr5e.preview.emergentagent.com` |
| Backend | `https://preprod.mygenie.online` |
| Branch | `ultimate-fix` (HEAD = this commit) |
| Frontend | Running port 3000, supervisor-managed, `craco start` |
| Webpack | Compiled successfully — 1 pre-existing `allDays` warning only |

---

## 2. EVERYTHING DONE THIS SESSION

### Phase 1 — Fresh Deployment

- Deployed branch `ultimate-fix` from `https://github.com/Abhi-mygenie/core-pos-front-end-.git`
- Synced `frontend/` → `/app/frontend/`, synced memory dir (3698+ files)
- Installed dependencies (`yarn install --frozen-lockfile`), frontend running HTTP 200
- All env vars + secrets (Firebase, VAPID, Maps, CRM) set

### Phase 2 — BUG-755: Dashboard Room Amount Mismatch (Gate 4 IMPLEMENTED)

**Symptom:** Room tile in Table View shows ₹473; same room in Order View shows ₹126.

**Root cause:** `ChannelColumn.jsx` L346 — `const order = item.order || item` extracts raw order
(food-only amount), discarding `item.amount = computeRoomCardAmount(order)` (food + room balance).
TableCard uses `item.amount` correctly; OrderCard receives stripped `order.amount`.

**Fix applied:** `src/components/dashboard/ChannelColumn.jsx` L346
```javascript
// BEFORE:
const order = item.order || item;

// AFTER:
// BUG-755: for room items, use enriched amount (computeRoomCardAmount)
const order = item.isRoom && item.amount != null
  ? { ...(item.order || item), amount: item.amount }
  : (item.order || item);
```

**QA result (testing agent):** VERIFIED FIXED — 23 rooms tested, all amounts match in both views.

**Files changed:** `src/components/dashboard/ChannelColumn.jsx`
**Gate:** GATE_5A_IMPLEMENTED 2026-11-27

---

### Phase 3 — BUG-756: Print Bill 403 for PayLater (Gate 4 IMPLEMENTED)

**Symptom:** Clicking "Print Bill" on a PayLater order from Order Report Beta returns 403:
`{"errors":[{"code":"order_id","message":"The order id for the request is missing."}]}`

**Root cause:** `CollectBillPanelDrawer.jsx` L276 — passes `onPrintBill={onPrintBill ?? null}` to CPP
without injecting `order.id`. CPP's `overrides` object contains financial values only (no `order_id`).
`handlePrintBillFromBeta(overrides)` tries `row?.order_id || row?.id` → both undefined → sends `{}` → 403.

**Fix applied:** `src/components/reports/CollectBillPanelDrawer.jsx` L276
```javascript
// BEFORE:
onPrintBill={onPrintBill ?? null}

// AFTER:
// BUG-756: inject order.id into CPP overrides before forwarding to external handler
onPrintBill={
  onPrintBill
    ? (overrides) => onPrintBill({ ...overrides, id: order?.id, order_id: order?.id })
    : null
}
```

**QA result (testing agent):** 403 CONFIRMED GONE — `get-single-order-new` now returns HTTP 200.
"No order data" appeared as secondary issue → led to BUG-756-B investigation.

**Files changed:** `src/components/reports/CollectBillPanelDrawer.jsx`
**Gate:** GATE_5A_IMPLEMENTED 2026-11-27

---

### Phase 4 — BUG-756-B: Print Bill "No order data" (Full gate cycle — IMPLEMENTED)

**Symptom:** After BUG-756 fix removed the 403, "Print failed: No order data" toast appears.
Screenshot shows Network tab: HTTP 200 with full order data in `orders[0]`. Print still fails.

**Investigation (Role 6):** `/app/memory/investigations/BUG-756-B_INVESTIGATION_REPORT_2026_11_27.md`

**Root cause:** TWO bugs in `handlePrintBillFromBeta` (OrderReportBetaPage.jsx), both introduced in
CR-503 and masked by the BUG-756 403:

**Bug A — Wrong response unwrap (L436):**
```javascript
// BROKEN: looks for resp.data.DATA — doesn't exist
const raw = resp.data?.data;   // → undefined always → "No order data"

// API actually returns: { "orders": [{ id: 1579197, order_amount: 109, ... }] }
// Correct (mirror of handleReprint, same file L390-396):
const ordersArr = resp.data?.orders;
const raw =
  (ordersArr && !Array.isArray(ordersArr) ? ordersArr?.order_details_order : null) ||
  resp.data?.order_details_order ||
  (Array.isArray(ordersArr) && ordersArr.length > 0 ? ordersArr[0] : null) ||
  (ordersArr && !Array.isArray(ordersArr) ? ordersArr : null) ||
  resp.data || null;
```

**Bug B — Wrong printOrder signature (L440):**
```javascript
// BROKEN: items as orderId, agents as printType → NaN order_id + KOT branch
await printOrder(items, printerAgents || [], { orderType: ..., orderId: ... });

// CORRECT (all 14 other call sites use this signature):
await printOrder(row?.order_id || row?.id, 'bill', null, order, 0, {}, printerAgents || []);
```

**Why only this function:** 14 other `printOrder` call sites all use the correct signature.
`handlePrintBillFromBeta` was written without the correct pattern and was never tested because BUG-756's
403 prevented it from running past the API call.

**Backend response evidence:**
Screenshot captured: `get-single-order-new` returns `{ orders: [{ id: 1579197, restaurant_order_id: "000105", order_amount: 109, ... }] }`
Evidence saved: `/app/memory/evidence/BUG-758/` (see investigation report)

**Fix applied:** `src/pages/reports-module/OrderReportBetaPage.jsx` L432-462
Full replacement of `handlePrintBillFromBeta` body — mirroring `handleReprint` (same file L383-412).

**Files changed:** `src/pages/reports-module/OrderReportBetaPage.jsx`
**Gate:** GATE_5A_IMPLEMENTED 2026-11-27
**IA doc:** `impact/BUG-756-B_IMPACT_ANALYSIS.md`
**Plan doc:** `plans/BUG-756-B_IMPLEMENTATION_PLAN.md`
**Investigation:** `investigations/BUG-756-B_INVESTIGATION_REPORT_2026_11_27.md`

---

### Phase 5 — BUG-757: Nights Not Auto-Calculating (Gate 4 IMPLEMENTED)

**Symptom:** In Dashboard RoomCheckInModal, setting a checkout date does not update the Nights field.
Nights stays at 1 regardless of checkout date → wrong `balancePayment` submitted to backend.

**Root cause:** `RoomCheckInModal.jsx` L1347 — checkout `onChange` calls `setManualCheckout(true)` and
`setCheckoutDate(e.target.value)` but NEVER calls `setNights()`. Auto-sync effect (L452-464) is blocked
once `manualCheckout=true`. Financial impact: backend receives 1-night `balancePayment` even for 3-night stay.

**OD-757-01 = Option A (LOCKED):** Keep `manualCheckout=true` after checkout edit; checkout date locks;
nights re-derives from checkin→checkout diff.

**Fix applied:** Two edits in `src/components/modals/RoomCheckInModal.jsx`

**E1 (L1347) — checkout onChange:**
```javascript
// BUG-757 E1: sync nights to date diff when checkout date changes
onChange={(e) => {
  setManualCheckout(true);
  setCheckoutDate(e.target.value);
  if (e.target.value && checkinDate) {
    const n = Math.max(1, Math.round(
      (new Date(e.target.value + 'T00:00:00') - new Date(checkinDate + 'T00:00:00')) / 86400000
    ));
    setNights(n);
  }
  if (e.target.value) clearErr('checkout');
}}
```

**E2 (L1314) — checkin onChange (required by OD-757-01=A):**
```javascript
// BUG-757 E2: re-derive nights when checkout is locked (OD-757-01=A)
onChange={(e) => {
  setCheckinDate(e.target.value);
  if (e.target.value && manualCheckout && checkoutDate) {
    const n = Math.max(1, Math.round(
      (new Date(checkoutDate + 'T00:00:00') - new Date(e.target.value + 'T00:00:00')) / 86400000
    ));
    setNights(n);
  }
  if (e.target.value) clearErr('checkin');
}}
```

**QA result (testing agent):** Code fix verified present. UI test blocked — `bookingDetails` flag OFF
for palmhouse.com (RID 541). Needs account with `bookingDetails=true` (try owner@palmforest.com).

**Files changed:** `src/components/modals/RoomCheckInModal.jsx`
**Gate:** GATE_5A_IMPLEMENTED 2026-11-27
**Investigation:** `investigations/BUG-757_INVESTIGATION_REPORT_2026_11_27_NIGHTS_NOT_CALCULATED.md`

---

### Phase 6 — BUG-758: Order View Item Times Show Raw Hours (Full gate cycle — IMPLEMENTED)

**Symptom:** Order View Order Card item-level times show `Serve: 119h 47m`, `Total: 2222h 26m`.
Order-level dots correctly show `● 3d`, `● 92d`. Numbers are correct — purely a formatting issue.

**Investigation (Role 6):** Completed via code trace only (10/10 confidence, no curl probe needed).

**Root cause:** `formatElapsed()` in `OrderCard.jsx` (L18) caps at hours — no `days` branch.
`formatDuration()` in `TableCard.jsx` (L28, used for order-level dots) correctly converts ≥24h → days.

**Number verification:**
- `Total: 440h 59m` → 440 ÷ 24 = **18d 8h** → order dot shows `18d` ✅
- `Total: 2222h 26m` → 2222 ÷ 24 = **92d 14h** → order dot shows `92d` ✅
- `Serve: 119h 47m` → 119 ÷ 24 = **4d 23h** ✅

**Fix applied:** `src/components/cards/OrderCard.jsx` L17-30
```javascript
// BEFORE (caps at hours):
const formatElapsed = (ms) => {
  ...
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

// AFTER (adds days branch — mirrors TableCard.formatDuration):
// BUG-758: add days branch — mirrors TableCard.formatDuration for consistency
const formatElapsed = (ms) => {
  ...
  const days = Math.floor(h / 24);
  if (days > 0) {
    const remH = h % 24;
    return remH > 0 ? `${days}d ${remH}h` : `${days}d`;
  }
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};
```

**Logic self-test:** 10/10 cases PASS (Python verification).
All 4 call sites (L808/L813/L891/L894) auto-fixed — no call site changes needed.

**Files changed:** `src/components/cards/OrderCard.jsx`
**Gate:** GATE_5A_IMPLEMENTED 2026-11-27
**IA doc:** `impact/BUG-758_IMPACT_ANALYSIS.md`
**Plan doc:** `plans/BUG-758_IMPLEMENTATION_PLAN.md`

---

## 3. ALL ARTIFACTS THIS SESSION

### Source Files Changed (5)

| File | Bug(s) | Lines changed |
|------|--------|--------------|
| `src/components/dashboard/ChannelColumn.jsx` | BUG-755 | L346-350 |
| `src/components/reports/CollectBillPanelDrawer.jsx` | BUG-756 | L276-284 |
| `src/pages/reports-module/OrderReportBetaPage.jsx` | BUG-756-B | L432-462 |
| `src/components/modals/RoomCheckInModal.jsx` | BUG-757 | L1314-1323, L1356-1365 |
| `src/components/cards/OrderCard.jsx` | BUG-758 | L17-30 |

### Investigation Reports

| File | For |
|------|-----|
| `investigations/BUG-756_INVESTIGATION_REPORT_2026_11_27_PRINT_BILL_403.md` | BUG-756 — 403 root cause |
| `investigations/BUG-756-B_INVESTIGATION_REPORT_2026_11_27.md` | BUG-756-B — wrong unwrap + wrong signature |
| `investigations/BUG-757_INVESTIGATION_REPORT_2026_11_27_NIGHTS_NOT_CALCULATED.md` | BUG-757 — nights calculation |

### Impact Analysis Docs

| File | For |
|------|-----|
| `impact/BUG-756-B_IMPACT_ANALYSIS.md` | BUG-756-B |
| `impact/BUG-758_IMPACT_ANALYSIS.md` | BUG-758 |

### Implementation Plans

| File | For | Lines |
|------|-----|-------|
| `plans/BUG-755_IMPLEMENTATION_PLAN.md` | BUG-755 | ChannelColumn.jsx ~3 lines |
| `plans/BUG-756_IMPLEMENTATION_PLAN.md` | BUG-756 | CollectBillPanelDrawer.jsx ~8 lines |
| `plans/BUG-756-B_IMPLEMENTATION_PLAN.md` | BUG-756-B | OrderReportBetaPage.jsx ~19 lines |
| `plans/BUG-757_IMPLEMENTATION_PLAN.md` | BUG-757 | RoomCheckInModal.jsx ~12 lines |
| `plans/BUG-758_IMPLEMENTATION_PLAN.md` | BUG-758 | OrderCard.jsx ~4 lines |

### QA Handovers

| File | For |
|------|-----|
| `handover/QA_HANDOVER_BUG756B_2026_11_27.md` | BUG-756-B |
| `handover/QA_HANDOVER_BUG758_2026_11_27.md` | BUG-758 |

### Evidence

| Path | For |
|------|-----|
| `evidence/BUG-758/analysis.py` | BUG-758 — number verification script |
| `evidence/screenshot1.png` | BUG-758 — owner screenshot (item-level hours vs order dots) |

---

## 4. REGISTRY STATE AFTER THIS SESSION

| ID | Status | Risk | File(s) |
|----|--------|------|---------|
| BUG-755 | GATE_5A_IMPLEMENTED 2026-11-27 | HIGH | ChannelColumn.jsx |
| BUG-756 | GATE_5A_IMPLEMENTED 2026-11-27 | LOW | CollectBillPanelDrawer.jsx |
| BUG-756-B | GATE_5A_IMPLEMENTED 2026-11-27 | HIGH | OrderReportBetaPage.jsx |
| BUG-757 | GATE_5A_IMPLEMENTED 2026-11-27 | MEDIUM | RoomCheckInModal.jsx |
| BUG-758 | GATE_5A_IMPLEMENTED 2026-11-27 | LOW | OrderCard.jsx |
| CR-563–567 | GATE_1_INTAKE | MEDIUM | AuditLogMockup.jsx (not started) |

**Total registry items: 1204**
**Max BUG ID: BUG-758** | **Max CR ID: CR-567**

---

## 5. WHAT NEXT AGENT MUST DO

### Immediate: QA Gate 5b for all 5 bugs

| ID | QA Steps | Account needed | Blocker? |
|----|----------|----------------|----------|
| **BUG-755** | Dashboard → Order View → find room tile → switch Table/Order view → amounts match | owner@palmhouse.com / Qplazm@10 | None |
| **BUG-756** | Order Beta → Collect on PayLater → Print Bill → no 403 | pms@macha.com / Qplazm@10 | None |
| **BUG-756-B** | Order Beta → Collect on PayLater → Print Bill → no "No order data" → bill prints | pms@macha.com / Qplazm@10 | Need PayLater order with active printer |
| **BUG-757** | Dashboard → check-in modal → set checkout 3d away → Nights = 3 | Account with bookingDetails=true (palmforest?) | bookingDetails flag must be ON |
| **BUG-758** | Dashboard → Order View → long-open served order → item times show "4d 23h" not "119h 47m" | owner@palmhouse.com / Qplazm@10 | None — palmhouse has stale served orders |

### Backlog: 5 Audit CRs at Gate 1

| ID | Title | Next step |
|----|-------|-----------|
| CR-563 | Interactive Risk Filter Bands | Gate 2 IA — owner GO needed |
| CR-564 | High-Risk Cancellations extra columns | Gate 2 IA — probe backend |
| CR-565 | Leakage After Unpaid extra columns | Gate 2 IA — probe backend |
| CR-566 | Global Filters + Sorting | Gate 2 IA |
| CR-567 | Expandable Order Activity Logs | Gate 2 IA — probe backend |

---

## 6. TEST CREDENTIALS

| Alias | Email | Password | RID | Used for |
|-------|-------|----------|-----|---------|
| OWNER_PALMHOUSE | owner@palmhouse.com | Qplazm@10 | 541 | BUG-755, BUG-758 QA |
| PMS_MACHA | pms@macha.com | Qplazm@10 | 69 | BUG-756/756-B QA (pos-uat.mygenie.online) |
| OWNER_PALMFOREST | owner@palmforest.com | [user-provided] | ~420 | BUG-757 QA (bookingDetails=true) |
| OWNER_RUBY | owner@ruby.com | Qplazm@10 | — | BUG-709 (make_unpaid after cancel) |
| OWNER_CAFE103 | owner@cafe103.com | Qplazm@10 | 644 | CR-564/565 backend probe |

---

## 7. RECOMMENDED NEXT SESSION FLOW

```
Step 1  → Owner confirms QA GO for BUG-755/756/756-B/758 (all no-blocker)
Step 2  → QA agent tests V1–V5 for each bug using test accounts above
Step 3  → For BUG-757: confirm which account has bookingDetails=true; run QA
Step 4  → Owner confirms Gate 2 GO for CR-563–567 (Audit Report enhancements)
Step 5  → Planning agent runs Gate 2 IA for CR-563–567 batch
Step 6  → Owner smoke on ultimate-fix branch
```

---

## 8. FILE PATHS QUICK REFERENCE

| Artifact | Path |
|----------|------|
| Agent system prompt | `/app/memory/control/AGENT_PROMPT_ALPHA.md` |
| Registry | `/app/memory/control/registry.json` |
| BUG Tracker | `/app/memory/control/BUG_TRACKER.md` |
| BUG-755 plan | `plans/BUG-755_IMPLEMENTATION_PLAN.md` |
| BUG-756 plan | `plans/BUG-756_IMPLEMENTATION_PLAN.md` |
| BUG-756-B investigation | `investigations/BUG-756-B_INVESTIGATION_REPORT_2026_11_27.md` |
| BUG-756-B plan | `plans/BUG-756-B_IMPLEMENTATION_PLAN.md` |
| BUG-757 investigation | `investigations/BUG-757_INVESTIGATION_REPORT_2026_11_27_NIGHTS_NOT_CALCULATED.md` |
| BUG-757 plan | `plans/BUG-757_IMPLEMENTATION_PLAN.md` |
| BUG-758 plan | `plans/BUG-758_IMPLEMENTATION_PLAN.md` |
| Audit CR batch intake | `change_requests/BATCH_INTAKE_2026_11_27_AUDIT_REPORT_ENHANCEMENTS_CR563_567.md` |

---

## 9. OPEN QUESTIONS

| Item | Detail |
|------|--------|
| BUG-757 QA account | Which restaurant has `bookingDetails=true`? Owner@palmforest masked — owner to confirm |
| BUG-756-B live print | Printer agent config needed on pms@macha.com (RID 69) to fully confirm bill prints |
| BUG-709 | make_unpaid after cancel — AWAITING_OWNER_UI_CONFIRM on owner@ruby.com |
| CR-542, BUG-705 | Plans ready, Gate 4 GO from owner pending |
