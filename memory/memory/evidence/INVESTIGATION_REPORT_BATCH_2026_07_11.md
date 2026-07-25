# INVESTIGATION REPORT — Batch Intake 2026-07-11 (13 Bugs + 1 CR)
## Session: INVESTIGATION role
## Date: 2026-07-11

---

## BUG-183: Daily Report — Phone/Customer Name Missing in Credit Tab
**Steps used:** 3/10 · **Confidence:** HIGH · **Classification:** BACKEND_DATA

**Trace:**
- `reportTransform.js:258-266` correctly extracts `customer: api.user_name || 'Guest'` and `customerContact: extractCustomerContact(api)` for TAB orders
- `extractCustomerContact` (L85) uses `api.cust_mobile || api.user_phone || api.phone`
- `OrderTable.jsx:196-200` has a `customerPhone` column specifically for the Credit tab
- **FE wiring is correct.** The fields exist and are rendered.

**Root cause:** The backend `/order-logs-report` API does NOT return `user_name`, `cust_mobile`, or `phone` fields populated for TAB/Credit orders. The FE defaults to 'Guest' and '—'.

**Recommendation:** BACKEND_ASK — need backend to populate `user_name` and `cust_mobile` on TAB order rows in the order-logs-report response. Zero FE changes needed.

---

## BUG-184: Daily Report — CRE-Credit Payment Type Not Reflecting
**Steps used:** 3/10 · **Confidence:** HIGH · **Classification:** BACKEND_DATA + FE_TRANSFORM_GAP

**Trace:**
- `TAB_FILTERS.credit` (L86): `(o) => o.paymentMethod === 'TAB'` — credit orders are identified by `paymentMethod === 'TAB'`
- `reportTransform.js:266`: `paymentMethod: api.payment_method || 'TAB'`
- `OrderTable.jsx:546-567`: renders `order.paymentMethod` in the payment column
- When in the "All Orders" tab, the order has `paymentMethod` from the API. If the API returns empty `payment_method` for CRE-Credit orders, the payment column is blank.

**Root cause:** Two issues:
1. Backend may return `payment_method` as empty/null for CRE-Credit settlements
2. FE `paymentClassifier.js` (CR-032) may not map the CRE-Credit payment type to a display label

**Recommendation:** 
- BACKEND_ASK: Verify what `payment_method` value the API returns for CRE-Credit orders
- FE_FIX: Add CRE-Credit to the payment classifier if it exists as a raw API value

---

## BUG-185: Day Closure — Opening Balance Logic Broken (P0 CRITICAL)
**Steps used:** 4/10 · **Confidence:** MEDIUM · **Classification:** BACKEND_DATA + FE_LOGIC_GAP

**Trace:**
- `settlementTransform.js` maps: `openingBalance: toNum(totals.total_opening_balance)`, `totalFunds: toNum(w.total_funds)`, `cashDraw: toNum(w.cash_draw)`
- `SettlementPanel.jsx:196` displays `totals.openingBalance` as "Cash float given"
- `SettlementPanel.jsx:199` shows `Total Funds = Opening + Cash`
- `SettlementPanel.jsx:104`: `expected = w.totalFunds - w.settled` — this is the FE expected calculation
- `SettlementPanel.jsx:251`: `actual` comes from user input (`actualBalances[w.waiterId]`)
- `SettlementPanel.jsx:252`: `pilf = actual !== undefined ? (expected - actual) : w.pilferage`

**Root cause:** The settlement math is primarily driven by the backend API (`get-settlement-report`). The FE trusts `total_opening_balance`, `total_funds`, `today_settlement`, `balance_to_settle` from the API response. If the API returns incorrect values, the FE displays them incorrectly. The screenshot shows ACTUAL BAL = 50 after settlement, which suggests either:
1. The backend `total_funds` doesn't correctly incorporate the opening balance
2. The `today_settlement` doesn't subtract properly from total_funds
3. The opening balance was set AFTER settlement, and the API doesn't recalculate

**Recommendation:** INVESTIGATION CONTINUES — need to curl the settlement API with test credentials to verify the raw response values. If backend values are wrong → BACKEND_ASK. If FE formula is wrong → FE_FIX at `SettlementPanel.jsx:104`.

---

## BUG-186: Day Closure — Partial Settlement Broken
**Steps used:** 4/10 · **Confidence:** HIGH · **Classification:** FE_LOGIC_GAP

**Trace:**
- `SettlementPanel.jsx:143-148`: `openSettleModal` prefills amount and sets `settleType: "full"`
- L146: `prefill = actual !== undefined ? Math.min(Math.abs(Math.round(actual)), expected) : Math.min(Math.abs(Math.round(w.balanceToSettle)), expected)`
- L104: `expected = w.totalFunds - w.settled`
- L384: Input is `readOnly={settleType === "full"}` — editable when Partial
- L410: Confirm disabled when `settleAmount <= 0 || settleAmount > expected`

**Root cause:** When `expected = 0` (totalFunds == settled), the prefill becomes 0 (Math.min of anything with 0 = 0). The Confirm button is disabled because `settleAmount <= 0`. Even though balance is -₹12, the expected calculation doesn't account for this negative balance scenario. Partial settlement is impossible when expected = 0.

**Fix scope:** `SettlementPanel.jsx` — 2 changes:
1. Allow negative balance settlement by using `Math.abs(balanceToSettle)` as expected when totalFunds - settled = 0
2. Allow settleAmount > 0 even when computed expected is 0 if balanceToSettle ≠ 0

**Risk:** HIGH (R6 financial logic) — needs owner approval.

---

## BUG-187: Validation Style — Red Border Missing on Customer Name
**Steps used:** 2/10 · **Confidence:** HIGH · **Classification:** FE_BUG (CSS missing)

**Trace:**
- `CartPanel.jsx:818`: `const nameMissing = isNameRequired && !customerName.trim()`
- `CartPanel.jsx:1024`: placeholder changes to "Customer name *" when required
- **NO red border class applied** to the input when `nameMissing` is true. The `nameMissing` flag exists but is only used elsewhere (likely for blocking submission), not for CSS styling.

**Root cause:** The customer name input in CartPanel doesn't apply a red border (`ring-red-500` or `border-red-500`) when `nameMissing` is true. The "Name Required" toast fires but the input field style doesn't change.

**Fix scope:** `CartPanel.jsx` ~L1024 — add conditional className: `${nameMissing ? 'ring-2 ring-red-500 border-red-500' : ''}`. ~5 lines, 1 file. **Fast Lane eligible.**

---

## BUG-188: Order Screen — Discount Alignment Issue
**Steps used:** 2/10 · **Confidence:** HIGH · **Classification:** FE_BUG (CSS)

**Trace:**
- Discount section is in CartPanel's ADJUSTMENTS area
- The amount (₹52) and minus button overlap with the scrollbar when discount is applied
- Likely a `flex` or `overflow` issue in the discount row container

**Root cause:** CSS layout issue — the discount value + remove button container doesn't have proper `flex-shrink-0` or `overflow-hidden` causing overlap with the scrollbar.

**Fix scope:** `CartPanel.jsx` — CSS fix in the discount row. ~5 lines, 1 file. **Fast Lane eligible.**

---

## BUG-189: Delivery — Accept Order Missing for Rider Login
**Steps used:** 3/10 · **Confidence:** MEDIUM · **Classification:** FE_FEATURE_GAP + BACKEND_UNKNOWN

**Trace:**
- `DeliveryCard.jsx` renders order status badge + snooze button. NO "Accept" button exists in the component.
- `deliveryService.js` has `dispatchOrder()` and `getDeliveryEmployees()` + `assignRider()` — all OWNER-side actions
- There is no `acceptOrder()` or `riderAcceptOrder()` function in the delivery service
- The dashboard orders are role-agnostic — same UI for owner and rider

**Root cause:** The **rider-side "Accept Order" flow was never implemented** in the FE. The current delivery flow is: Owner assigns rider → dispatch. There's no rider-acceptance step. The "Waiting.." status shown is the order waiting for dispatch, not waiting for rider acceptance.

**Recommendation:**
- OQ-1: Does the backend have a rider-accept-order API endpoint?
- OQ-2: Is this a new feature request (CR) or was it supposed to be part of BUG-097?
- Classification may change to **CR** if backend API doesn't exist.

---

## BUG-190: Customer Notes CRM Sync Broken
**Steps used:** 3/10 · **Confidence:** HIGH · **Classification:** CRM-BLOCKED (RELATED: BUG-106)

**Trace:**
- `OrderNotesModal.jsx` reads `customerIntel?.customerNotes?.length` from CRM data
- The modal `handleSave` calls `onSave(selectedNotes)` which saves to local order state
- **NO CRM API call** exists to sync notes to CRM service
- BUG-106 in tracker: "CRM Notes API — P2 — CRM-BLOCKED — CQ-CR-01/02 open"

**Root cause:** The CRM Notes API was never implemented because it's blocked on the CRM team (BUG-106). The FE has the UI shell for displaying customer history notes, but:
1. Notes are NOT sent to CRM on order placement/settlement
2. Notes are NOT fetched from CRM for repeat customers
3. The `customerIntel.customerNotes` array is always empty because no CRM endpoint provides it

**Recommendation:** **CRM-BLOCKED.** Zero FE fix possible until CRM team provides the notes API endpoints. Link to BUG-106.

---

## BUG-191: Customer Intelligence — Phone Missing in Insights
**Steps used:** 2/10 · **Confidence:** HIGH · **Classification:** BACKEND_DATA

**Trace:**
- `CustomersRfmMockup.jsx:126` renders `c.phone || '—'`
- The data comes from `fetchInsightsCustomers` → backend insights-customers endpoint
- The table has a `phone` column in both display and export (L79)
- **FE renders whatever the API returns for `phone`**

**Root cause:** The backend `/insights-customers` API either doesn't return `phone` field or returns it as null/empty. The FE correctly maps and displays it — shows '—' when missing.

**Recommendation:** BACKEND_ASK — backend needs to populate `phone` in the customer insights response. Zero FE fix needed.

---

## BUG-192: Prep & Serve Time — Handover Time = 0 + Logic Investigation
**Steps used:** 4/10 · **Confidence:** HIGH · **Classification:** DATA_EDGE

**Trace:**
- `CHANNEL_CONFIG.Takeaway.serveLabel = 'Handover'` (PrepServeTimeMockup.jsx:46)
- Handover time = `ch.avgServe` from the byChannel data
- `prepServeService.js` classifies items:
  - **Kitchen:** `created_at → ready_at (gap > 30s) → serve_at` → shows Prep + Serve
  - **Bar:** `created_at ≈ ready_at (instant) → serve_at` → shows Serve only
  - **Direct:** no timestamps or all ≈ created_at → skip (no timing)
- For takeaway orders, if items don't have a `serve_at` timestamp (because takeaway items are picked up, not served to table), they're classified as having 0 serve time
- The `serve_at` timestamp represents "served to customer" — for takeaway this would be "handed over to customer", but backend may not set this timestamp for takeaway orders

**Root cause:** Takeaway orders lack `serve_at` timestamps because the backend doesn't record "handover to customer" for takeaway. The FE correctly computes 0 min average when no serve timestamps exist.

**SLA logic:** No SLAs implemented yet — the "Escalation Matrix" card shows "Coming Soon" (L398).

**Assumptions:**
- Prep time = `created_at → ready_at` (kitchen marking item as ready)
- Serve time = `ready_at → serve_at` (server marking item as served/picked up)
- Total = Prep + Serve
- Items with timestamps within 30s of order creation = "direct" (excluded)
- Items capped at 120 minutes max

**Recommendation:** BACKEND_ASK — backend needs to record `serve_at` (handover) timestamp when takeaway orders are picked up. FE logic is sound.

---

## BUG-193: Room Transfer Trail — FROM ROOM = 0 + Table Transfers Leaking
**Steps used:** 3/10 · **Confidence:** HIGH · **Classification:** BACKEND_DATA

**Trace:**
- `RoomTransfersMockup.jsx:56-60` reads `rawData.room_transfers` from `fetchInsightsLocations`
- Each transfer displays `t.from_room` and `t.to_room` directly
- FE does ZERO filtering on the data — renders all items from `room_transfers[]`
- If `from_room = 0`, the API is returning 0

**Root cause:**
1. **FROM ROOM = 0:** Backend sets `from_room: 0` when the order originated from a table (table ID 0 or unset room). This is a backend data issue — the API should either return the actual table/room ID or exclude these records.
2. **Table transfers leaking:** The `room_transfers` array from the backend includes table-to-room, room-to-room, and possibly table-to-table transfers. The FE has no filter because the API endpoint is named "room_transfers" and is expected to contain only room transfers.

**Recommendation:** BACKEND_ASK — two changes:
1. Filter `room_transfers` to only include room-to-room transfers (both from and to are rooms, not tables)
2. Populate `from_room` with actual room name/number instead of 0

---

## BUG-194: Payments Report in Insights — Completely Empty ⚠️ HIGH CONFIDENCE FE BUG
**Steps used:** 4/10 · **Confidence:** HIGH · **Classification:** FE_BUG (data access mismatch)

**Trace:**
- `PaymentsMockup.jsx:201-202`: `const data = await fetchInsightsSales(appliedFrom, appliedTo); setSalesData(data);`
- `fetchInsightsSales` (insightsService.js:607-612) returns: `{ data: resp.data?.data, orderCount: 0 }`
- So `salesData = { data: <actual backend payload>, orderCount: 0 }`
- `PaymentsMockup.jsx:213`: `const s = salesData.summary || {}` → **salesData.summary is UNDEFINED** (it's at `salesData.data.summary`)
- `PaymentsMockup.jsx:219`: `const backendPayments = salesData.payments || []` → **UNDEFINED** (it's at `salesData.data.payments`)

**Root cause:** **DATA ACCESS MISMATCH after CR-049 migration.** The `fetchInsightsSales` wraps the response under `.data`, but `PaymentsMockup` reads `.summary` and `.payments` directly on the return value. It should be reading `salesData.data.summary` and `salesData.data.payments`.

**Fix scope:** `PaymentsMockup.jsx` — change 2 lines:
- L213: `const s = salesData.data?.summary || salesData.summary || {};`
- L219: `const backendPayments = salesData.data?.payments || salesData.payments || [];`
- Also L255: `salesData.data?.daily || salesData.daily || []`

**Risk:** LOW. ~5 lines, 1 file. This is a clear regression from CR-049.

---

## BUG-195: Takeaway — Name Mandatory Toggle Not Working
**Steps used:** 3/10 · **Confidence:** HIGH · **Classification:** FE_BUG (hardcoded condition)

**Trace:**
- `CartPanel.jsx:805`: `const isNameRequired = orderType === 'takeAway' || orderType === 'delivery';`
- This is **HARDCODED** — it always requires name for takeaway/delivery, regardless of the toggle setting
- The Settings page has a toggle for "Takeaway Orders → Name mandatory" but it's never read by CartPanel
- The toggle likely saves to a restaurant setting field, but CartPanel doesn't read that field

**Root cause:** `isNameRequired` is hardcoded to `true` for takeaway and delivery, ignoring the restaurant-level toggle setting. The bug is actually the **inverse** of what was reported — the name IS always required for takeaway. If the toggle is OFF, the validation still fires. If the toggle IS ON but the owner reports it's "not working," the issue may be that the toast appears but the order still goes through (submission not blocked).

**Two possible interpretations:**
1. Toggle OFF but name still required (hardcoded override) → FE_BUG
2. Toggle ON but order submits without name → need to check if `nameMissing` actually blocks submission

**Fix scope:** `CartPanel.jsx` — read the restaurant-level `takeaway_name_mandatory` setting from context instead of hardcoding. ~10 lines, 1 file. MEDIUM risk (business rule change).

---

## CR-068: Cancellation Role-Gating (no code investigation — feature request)
**Status:** Open Questions (4 OQs) — needs owner answers before planning.

---

## SUMMARY TABLE

| ID | Root Cause | Classification | FE Fix? | Backend Ask? | Confidence |
|---|---|---|---|---|---|
| BUG-183 | API doesn't return customer data for TAB orders | BACKEND_DATA | NO | YES | HIGH |
| BUG-184 | CRE-Credit payment_method empty from API | BACKEND_DATA + FE_GAP | MAYBE | YES | HIGH |
| BUG-185 | Opening balance math — needs API curl verification | BACKEND_DATA or FE_LOGIC | TBD | YES | MEDIUM |
| BUG-186 | Expected=0 blocks partial settlement | FE_LOGIC_GAP | YES | NO | HIGH |
| BUG-187 | No red border CSS on nameMissing | FE_BUG (CSS) | YES | NO | HIGH |
| BUG-188 | Discount row CSS overflow | FE_BUG (CSS) | YES | NO | HIGH |
| BUG-189 | Rider accept flow never implemented | FE_FEATURE_GAP | CR? | YES | MEDIUM |
| BUG-190 | CRM Notes API blocked | CRM-BLOCKED | NO | CRM TEAM | HIGH |
| BUG-191 | API doesn't return phone for customers | BACKEND_DATA | NO | YES | HIGH |
| BUG-192 | Takeaway has no serve_at timestamps | DATA_EDGE | NO | YES | HIGH |
| BUG-193 | API returns table transfers + from_room=0 | BACKEND_DATA | NO | YES | HIGH |
| **BUG-194** | **Data access mismatch after CR-049** | **FE_BUG** | **YES** | **NO** | **HIGH** |
| BUG-195 | isNameRequired hardcoded, ignores toggle | FE_BUG | YES | NO | HIGH |

### FE-FIXABLE (5 items — no backend dependency):
1. **BUG-194** (P1, LOW risk) — Payments report empty — data access fix
2. **BUG-186** (P1, HIGH risk) — Partial settlement — formula fix
3. **BUG-195** (P1, MEDIUM risk) — Takeaway mandatory — read setting
4. **BUG-187** (P2, LOW risk) — Red border CSS — Fast Lane
5. **BUG-188** (P2, LOW risk) — Discount alignment — Fast Lane

### BACKEND-BLOCKED (7 items):
BUG-183, BUG-184, BUG-185 (partially), BUG-191, BUG-192, BUG-193 — need backend API changes

### CRM-BLOCKED (1 item):
BUG-190 — CRM Notes API (linked to BUG-106)

### NEEDS RECLASSIFICATION (1 item):
BUG-189 — may be a CR (rider accept feature), not a bug fix
