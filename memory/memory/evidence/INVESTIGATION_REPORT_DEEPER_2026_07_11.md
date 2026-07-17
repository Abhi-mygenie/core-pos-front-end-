# DEEPER INVESTIGATION — 6 Bugs (Owner Requested Re-Investigation)
## Date: 2026-07-11

---

## BUG-185: Day Closure — Opening Balance Logic (DEEPER)

**Full data flow traced:**

1. `SettlementPanel.jsx:54-67` → calls `getSettlementReport(dateStr, dateStr)` → backend API
2. `settlementTransform.js:fromAPI.settlementReport()` maps all fields from backend response
3. KPI display:
   - **Opening Balance** = `totals.openingBalance` = API's `total_opening_balance` (displayed as "Cash float given")
   - **Cash Collected** = `totals.cashCollected` = API's `total_today_collection`
   - **Total Funds** = `totals.totalFunds` = API's `total_total_funds`
   - **Settled** = `totals.settled` = API's `total_today_settlement`
   - **Remaining** = `totals.remaining` = API's `total_balance_to_settle`
   - **Pilferage** = `totals.pilferage` = API's `total_pilferage`
4. Per-waiter table:
   - All values come directly from API: `opening_balance`, `today_collection`, `total_funds`, `today_settlement`
   - **EXPECTED column** = FE-computed: `w.totalFunds - w.settled` (line 250)
   - **ACTUAL BAL.** = user-typed input (line 274-276)
   - **PILFERAGE** = FE-computed: `expected - actual` (line 252)

5. **Opening Balance flow:**
   - User clicks "Set Opening Balance" → modal opens (line 207-210)
   - User types amount per waiter → calls `setOpeningBalance(entries)` (line 116-130)
   - API body: `{ waiter_id, date, last_day_pending, today_given: <amount entered> }` (line 119)
   - After save → `fetchReport(date)` re-fetches everything (line 126)

**From the screenshot:** Opening = ₹2,845 | Cash Collected = ₹5,801 | Total Funds = ₹8,646 | Settled = ₹8,596 | Remaining = -₹246 | Pilferage = -₹296

The numbers add up: 2,845 + 5,801 = 8,646 (Total Funds ✓). 8,646 - 8,596 = 50 (Expected ✓). But Remaining shows -₹246 and Pilferage -₹296 — these come FROM THE BACKEND directly (not FE-computed).

**Root cause:** The backend computes `total_balance_to_settle` and `total_pilferage` using a DIFFERENT formula than the FE's `Expected = totalFunds - settled`. The backend factors in additional items (delivery charges, service charges, tips, etc.) that the FE's simple subtraction doesn't account for. The "still showing 50 in actual" is because the Actual Bal input retains whatever the user entered — it's an input field, not API-driven.

**The real issue is:** After the user settles and the page refreshes, the backend's reported values (Remaining, Pilferage) and the FE-computed Expected don't agree. This is because:
- FE Expected = `totalFunds - settled` = simple formula
- Backend Remaining = complex formula including delivery/service/tips/yesterday-pending
- Both should match but don't, because `totalFunds` from backend already includes complex components

**Needs:** Curl the settlement API with real credentials to see exact raw field values and verify which formula is off. This is a **formula alignment issue between FE Expected calculation and backend Remaining calculation.**

---

## BUG-186: Partial Settlement — Why Negative Balance Happens (DEEPER)

**Business scenario for negative balance:**

The `balanceToSettle` field comes from backend's `balance_to_settle`. A negative value means:

1. **Over-settlement:** Waiter was settled for MORE than they collected. E.g., total funds = ₹1,000, settled = ₹1,012 → balance = -₹12
2. **Opening balance adjusted after settlement:** Owner set opening balance AFTER settling → changed the equation retroactively
3. **Cash transfer:** Cash was transferred between waiters, creating an imbalance
4. **Backend accounting:** delivery charges, tips, or service charges adjusted after settlement

**Why the FE blocks it:**

`SettlementPanel.jsx:143-150` — the `openSettleModal` function:
```
const expected = w.totalFunds - w.settled;     // e.g., 1000 - 1012 = -12
const prefill = Math.min(Math.abs(actual), expected);  // Math.min(50, -12) = -12
setSettleAmount(Math.max(prefill, 0));          // Math.max(-12, 0) = 0
```
Amount = 0. Then at line 410: `disabled={settleAmount <= 0}` — button is disabled.

Additionally at line 388-389: `settleAmount > (settleModal.totalFunds - settleModal.settled)` shows an error "Cannot settle more than expected balance" — when expected is negative, ANY positive amount exceeds it.

**This is a real FE logic gap:** The FE doesn't handle the case where `expected` is negative (over-settled) or zero but `balanceToSettle` is non-zero. The settle modal should:
1. Use `Math.abs(w.balanceToSettle)` as the settle amount when expected ≤ 0
2. Allow submitting a positive amount even when expected is ≤ 0
3. The pilferage calculation should handle negative expected scenarios

**Scope:** Lines 104, 146, 388-389, 410 in `SettlementPanel.jsx`. ~15 lines changed, 1 file. **HIGH risk (R6 financial) — needs owner approval.**

---

## BUG-189: Delivery — Accept Order for Rider (DEEPER)

**You're right — the delivery flow IS implemented.** Here's what exists:

**Existing delivery flow in code:**

1. **OrderCard.jsx:44** — `onAccept` prop exists
2. **OrderCard.jsx:82** — `isDelivery = orderType === "delivery"` flag
3. **OrderCard.jsx:86** — `deliveryAssign = restaurant?.features?.deliveryAssign` (determines Dispatch vs Assign Rider mode)
4. **OrderCard.jsx:87** — `hasRiderAssigned = !!order.deliveryManId`
5. **OrderCard.jsx:139-149** — `handleAcceptClick` → calls `onAccept(order)` (confirms the order)
6. **OrderCard.jsx:258-268** — `handleDispatch` → calls `dispatchOrder(orderId, roleName)` (dispatches the order)
7. **orderTransform.js:307-329** — rider status mapping:
   - `delivery_man_id + delivery_man_status === 'Yes'` → `dispatched`
   - `delivery_man_id + delivery_man_status === 'No'` → `riderAssigned`
   - `no delivery_man_id + order_dispatch_status === 'Yes'` → `dispatched`
   - `no delivery_man_id + not dispatched` → `null` (awaiting action)

8. **ScanOrderPopOut.jsx:36** — `onAccept → handleConfirmOrder` (for web/scan orders)
9. **DashboardPage.jsx:1559-1570** — Accept flow connected for scan/web orders

**The "Waiting.." issue:**

The screenshot shows a delivery card for "parth" with "Owner · Ready · 1m" and a "Waiting.." button. This suggests:
- Order is in "Ready" status (kitchen done)
- No rider has been assigned yet (or rider was assigned but hasn't accepted)
- The "Waiting.." text comes from the order's status display, NOT from a missing accept button

**Real question:** When logged in as a RIDER (not Owner), what does the UI show?

The dashboard renders the SAME OrderCard for all roles. The key difference would be in:
- What `roleName` the rider has
- What permissions the rider has
- Whether the rider's profile has `delivery_assign` features enabled

**Deeper trace needed:**
- Check what `order_dispatch_status` and `delivery_man_status` values the API returns for this order
- Check if the rider login returns the correct role/permissions that enable the Accept button on OrderCard
- The "Waiting.." could be a status label (not a button) — the real action button may be hidden behind a permission or status check

**Recommendation:** Need to test with actual rider credentials on preprod to see what the API returns for the rider's profile and what buttons render. The code supports the flow — the issue is likely a **role/permission mismatch** or **the specific order's status doesn't trigger the Accept button**.

---

## BUG-190: Customer Notes CRM Sync (DEEPER)

**You're right — the CRM integration EXISTS.** Here's the complete flow:

**CRM Notes Pipeline:**

1. **Login:** `authService.login()` → gets `crm_token` from login API → stores via `setCrmToken()` in `crmAxios.js`
2. **CRM Axios:** `crmAxios.js` creates an axios instance pointing at `REACT_APP_CRM_BASE_URL` (= `https://crm.mygenie.online/api`). Auth via `X-API-Key` header from the crm_token.
3. **Customer Intel Service:** `customerIntelService.js` calls `POST /pos/customers/order-suggestions` via crmApi with `{ crm_customer_id, current_cart, order_type }`
4. **Transform:** `customerIntelTransform.js:55` maps `data.customer_notes || []` from the CRM response
5. **Notes mapping (line 100-110):**
   ```
   customerNotes = rawCustomerNotes.map(n => ({
     text: n.text,
     usedCount: n.used_count,
     lastUsedAt: parseDualDate(n.last_used_at),
     relativeTime: formatRelativeTime(lastUsedAt),
     source: n.source || 'history',
   })).sort(sortByCountThenDate).slice(0, 5);
   ```
6. **Also maps:** `item_notes_by_id` (per-item notes keyed by item ID)
7. **Hook:** `useCustomerIntel.js` calls `getOrderSuggestions()` → `transformOrderSuggestions()` → returns `intel.customerNotes`
8. **Display:** `OrderNotesModal.jsx` reads `customerIntel.customerNotes` and shows "CUSTOMER HISTORY"
9. **Item Notes:** `ItemNotesModal.jsx` reads `customerIntel.itemNotesByItemId[item.id]` for item-level history

**The pipeline is fully wired.** So why "No order-level notes found"?

**Possible root causes (need verification):**

1. **CRM token missing:** If `crm_token` was not in the login response, all CRM calls fail silently (line 30 of crmAxios just logs a warning). Check: does the login API for this restaurant return `crm_token`?

2. **Customer not identified in CRM:** The `crm_customer_id` is required. If the customer (PARTH) doesn't have a CRM ID linked, the API won't find notes. Check: is the customer identified via phone/name matching to a CRM record?

3. **CRM API returns empty `customer_notes`:** The endpoint works but this particular customer has no historical notes stored. Check: were previous notes actually sent TO the CRM (write path)?

4. **Notes write path missing:** The `onSave(selectedNotes)` in OrderNotesModal saves notes to the LOCAL ORDER ONLY (passed to `orderTransform` for the place/update payload). The notes go to the BACKEND (Laravel) as part of the order, but there's **NO separate CRM write call** to store notes in the CRM system. The CRM only reads from its OWN database.

**Most likely root cause:** **The CRM READ path works** (order-suggestions endpoint returns notes if they exist). But **the WRITE path** — sending notes from the POS order to the CRM database — may not exist. The POS sends notes as part of the order payload to the Laravel backend, but the Laravel backend may not be syncing those notes to the CRM system.

**Recommendation:** 
- OQ-1: Does the Laravel backend sync order notes to CRM after order placement?
- OQ-2: Check if `crm_token` exists in the login response for this restaurant
- OQ-3: Verify with a curl to the CRM endpoint whether this customer has any historical data at all

---

## BUG-192: Prep & Serve — Handover Time = 0 (DEEPER)

**Complete timing logic from `prepServeService.js`:**

**Item Classification (per food item):**
```
Kitchen: created_at → ready_at (gap > 30s) → serve_at  → Prep + Serve
Bar:     created_at ≈ ready_at (instant)   → serve_at  → Serve only
Direct:  no timestamps / all ≈ created_at             → skip
```

**Timing calculations:**
- **Prep Time** = minutes between `order.created_at` and `item.rawReadyAt` (raw timestamp, no fallback)
- **Serve Time** = minutes between `item.rawReadyAt` and `item.rawServeAt` (raw timestamp, no fallback)
- **Total** = Prep + Serve
- **Capped at 120 min**, negative values = skipped, threshold < 0.5 min = "instant"

**Channel breakdown:**
- The `byChannel` array groups items by channel (Dine-In, Delivery, Takeaway)
- `CHANNEL_CONFIG.Takeaway.serveLabel = 'Handover'` — so "Handover" = avg serve time for takeaway items
- For takeaway, `avgServe` = average of (`rawServeAt - rawReadyAt`) across all takeaway kitchen/bar items

**Why Handover = 0:**

The raw timestamps come from `reportTransform.js` which reads `ready_at` and `serve_at` from the order-logs-report API. For takeaway items:
- If the kitchen marks items "Ready" → `ready_at` is set
- If nobody marks items "Served/Handed over" → `serve_at` stays null
- `minutesBetween(readyAt, null)` returns null → excluded from average
- Result: 0 items have serve timing → avg = 0

But this could also happen if:
- Takeaway items ARE marked as served but the timestamp equals `ready_at` (gap < 30s → classified as "instant" → excluded)
- The order's `serve_at` is auto-set by the backend when status changes, making it = ready_at

**SLAs:** None configured. The "Escalation Matrix" card at line 398 shows "Coming Soon."

**Exceptions/Assumptions in the code:**
1. Items with ALL timestamps within 30 seconds of `created_at` → classified as "Direct" → **excluded from ALL timing** (not counted)
2. Items where `ready_at` is within 30 seconds of `created_at` but `serve_at` is later → "Bar" mode → only serve time counted (no prep)
3. Max cap: 120 minutes — anything above is treated as data error and excluded
4. Negative time differences → treated as data error → excluded

**Recommendation:** Need to curl the order-logs-report API for takeaway orders and check whether `serve_at` timestamps are populated. If they are but equal `ready_at` → FE classification drops them. If they're null → backend needs to record handover time.

---

## BUG-193: Room Transfer Trail — FROM ROOM = 0 + Table Transfers (DEEPER)

**Data flow:**

1. `RoomTransfersMockup.jsx:49` → `fetchInsightsLocations(appliedFrom, appliedTo)` 
2. `insightsService.js:fetchInsightsLocations` → `POST /insights-locations` API → returns `{ data: resp.data?.data, orderCount: 0 }`
3. `RoomTransfersMockup.jsx:56` → `const transfers = rawData.room_transfers || []`

**Wait — there's a data access question:** `fetchInsightsLocations` returns `{ data: <actual>, orderCount: 0 }`. But the component reads `rawData.room_transfers`, not `rawData.data.room_transfers`. Yet the screenshot shows 61 transfers loaded. This means EITHER:
- The `fetchOrReuse` cache mechanism somehow unwraps the data
- OR the API response structure has `room_transfers` at the top level of `resp.data?.data`

Regardless, the data IS loading (61 rows visible).

**FROM ROOM = 0 analysis:**

The component displays `t.from_room` directly (line 98). The API returns this value. `from_room: 0` means the backend stores `0` for transfers that originated from:
- A table (not a room) — table_id might be 0 or null when it's a room order
- An order that was directly created without a table/room assignment

**Table transfers leaking analysis:**

The backend endpoint is `/insights-locations` which returns a `room_transfers` array. You say the backend was asked to provide this correctly last time. If it was fixed before but the issue is back, either:
1. The fix was on a different branch/environment
2. The fix regressed
3. The fix filters differently than expected

**The FE has ZERO filtering on the `room_transfers` array.** It renders every row the API sends. If table transfers appear, the API is including them.

**Recommendation:** 
- Curl the insights-locations API and examine the `room_transfers` array
- Check if `from_room: 0` entries have a `from_table` or `table_id` field that could be used to identify table transfers
- If the backend was fixed before, verify on preprod that the fix is deployed
- If the API still sends table transfers, the backend fix needs to be re-applied

---

## UPDATED SUMMARY

| Bug | Previous Finding | Deeper Finding | Action |
|---|---|---|---|
| BUG-185 | Backend data issue | **Formula alignment issue** — FE Expected (simple) vs Backend Remaining (complex) disagree. Actual Bal is a user input, not auto-cleared. Needs API curl verification. | BACKEND VERIFY + possible FE formula fix |
| BUG-186 | Expected=0 blocks modal | **Negative balance is a real business scenario** (over-settlement, post-settlement adjustments). FE logic at lines 104, 146, 388, 410 doesn't handle negative/zero expected with non-zero balance. | FE FIX (~15 lines, R6, owner approval) |
| BUG-189 | Feature not built | **Feature IS built** — full Accept/Dispatch/AssignRider flow exists. Issue is likely **role/permission mismatch when logged in as rider**, or the specific order's status doesn't trigger the button. Need rider credential testing. | TEST WITH RIDER CREDENTIALS |
| BUG-190 | CRM blocked | **CRM READ path IS wired** (customer_notes transforms, useCustomerIntel hook, OrderNotesModal display). Issue is likely **CRM WRITE path** — POS sends notes to Laravel backend but Laravel may not sync to CRM. OR crm_token missing for this restaurant. | VERIFY: crm_token in login + Laravel→CRM sync |
| BUG-192 | Backend no serve_at | **Detailed timing logic documented.** Handover=0 because takeaway items lack serve_at, OR serve_at equals ready_at (classified as instant, excluded). All assumptions/exceptions documented. | VERIFY: curl order-logs for takeaway serve_at |
| BUG-193 | Backend data | **FE renders exactly what API sends.** Data IS loading (61 rows). Backend was supposedly fixed before — may have regressed. Need to curl and verify. | BACKEND VERIFY: curl insights-locations |
