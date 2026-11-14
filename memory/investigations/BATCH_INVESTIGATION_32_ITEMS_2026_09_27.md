# Batch Investigation — 32 Owner-Reported Items
**Date:** 2026-09-27
**Role:** INVESTIGATION (no code changes)
**Sprint:** `oct_bug_batch` (BUGs) · `oct_cr_batch` (CRs)
**Registered:** BUG-466 → BUG-483 (18 bugs) · CR-391 → CR-404 (14 CRs)

---

## PRIORITY ITEMS — Deep Investigation

---

### BUG-482 — Duplicate Payment Entries on Re-settlement [#31]
**Owner's rule:** *"Making an order Unpaid must reverse/invalidate the previous settlement allocation; re-settlement must not append another active payment allocation."*

**Classification:** BACKEND_BUG  
**Confidence:** HIGH  
**FE involvement:** NONE — FE correctly calls `POST make-order-unpaid` via `paymentMutationService.makeOrderUnpaid()`

**Data flow trace:**
```
User clicks "Make Unpaid"
  → paymentMutationService.makeOrderUnpaid(orderId)
  → POST /api/v2/vendoremployee/make-order-unpaid  { order_id }
  → Backend flips order.payment_status = 'unpaid'
  → ❌ Backend does NOT reverse/void existing payment_allocations rows

User re-settles via Old POS
  → POST collect-bill / settle-order  { payment_method, amount }
  → Backend APPENDS new payment_allocation row
  → Result: 2 payment rows for same order (₹160 + ₹160 = ₹320)
```

**Root cause:** Backend `make-order-unpaid` endpoint only flips `payment_status` — it does not delete or void the previous `payment_allocations` records. Re-settlement then adds a second allocation row on top.

**Next step:** BACKEND BRIEF — backend must:
1. On `make-order-unpaid`: void/reverse all existing payment allocation records for that order
2. On re-settlement: create fresh allocation (no accumulation)
3. Optional FE guard: show warning "This will reverse the previous settlement" before calling make-unpaid

**File:** `backend_briefs/BACKEND_BRIEF_BUG482_DUPLICATE_SETTLEMENT_2026_09_27.md` (to be filed)

---

### BUG-467 — Historical Order Data Disappeared on 14 Aug [#5]
**Classification:** BACKEND_BUG | DATA_ISSUE  
**Confidence:** LOW (no backend probe possible without credentials)

**Hypotheses:**
| # | Hypothesis | Test method | Status |
|---|---|---|---|
| H1 | Date filter in report defaulted to wrong range | Check if FE persists date range in localStorage | NEEDS CHECK |
| H2 | Backend query/database issue — data not returned | Probe `order-logs-report` with explicit Aug 14 date range | BLOCKED — needs backend access |
| H3 | API pagination cap — only returning last N orders | Check if `limit` param was too low | MEDIUM suspicion |

**FE code check:**
```bash
grep -n "localStorage\|dateRange\|startDate\|endDate" /app/frontend/src/pages/AllOrdersReportPage.jsx
```
→ FE does persist date filters via InsightsCacheContext — if cache held a stale date range (e.g. "today" on Aug 14), it would show only that day's orders.

**Root cause (suspected):** BACKEND_BUG or DATA_ISSUE — Aug 14 data may have been a database/query anomaly. FE cache could have contributed if date range was cached as "Aug 14".

**Next step:** Backend probe — `GET /api/v2/vendoremployee/order-logs-report?start_date=2026-08-01&end_date=2026-08-31` to confirm data is present in backend. If data exists → FE date filter issue. If absent → backend/data team.

---

### BUG-481 — Prepaid → Unpaid → Re-settle = Cash_On_Delivery [#30]
**Classification:** BACKEND_BUG  
**Confidence:** MEDIUM

**Data flow trace:**
```
Prepaid order arrives → payment_status: 'prepaid' / payment_method: 'Online'
User: Make Unpaid → POST make-order-unpaid
Backend flips to unpaid

User re-settles in Old POS:
  → Old POS calls its own settlement endpoint (NOT the New POS `collectBill`)
  → Old POS settlement may not carry forward original payment_method
  → Backend assigns default: 'Cash_On_Delivery'
  → Result: order.payment_method = 'Cash_On_Delivery'
```

**Root cause (suspected):** Old POS settlement endpoint uses a fallback default of `Cash_On_Delivery` when no payment method is explicitly provided. Alternatively, `make-order-unpaid` clears the payment method field, and Old POS re-settle defaults to COD.

**Next step:** Backend probe — call `make-order-unpaid` on a test prepaid order, then inspect the order record before and after re-settlement. Check what payment method Old POS sends in its settlement payload. Filed as BACKEND_BRIEF.

---

### BUG-466 — Old KOT Printed for New Swiggy Order [#1]
**Classification:** PRINTER_AGENT_BUG | BACKEND_BUG (likely not FE)  
**Confidence:** MEDIUM

**Data flow trace:**
```
Swiggy order arrives on aggregator platform
  → Backend receives order via Swiggy webhook
  → Backend saves order with print_kot: 'Yes' (or existing KOT content)
  → Socket: aggregator_order_{rid} → handleAggregatorNewOrder()
  → FE adds order to dashboard (no print trigger from FE side)
  → Printer Agent polls for pending KOTs
  → PA finds order with print_kot:'Yes' — prints KOT
  → KOT content = what backend stored (may be STALE item list from Swiggy)
```

**Key observation:** FE `handleAggregatorNewOrder` does NOT directly trigger KOT printing. Print is driven by Printer Agent polling. The "old KOT" likely means the KOT content contains items from a previous version of the Swiggy order (e.g. order was modified on Swiggy platform but webhook sent updated order with old KOT payload).

**Root cause (suspected):** Backend stores KOT content at order creation time from Swiggy webhook. If Swiggy modifies the order before POS receives it, or if there's a race condition between order creation and KOT generation, the KOT content may be stale.

**Next step:** Backend probe — check `get-single-order-new` for a recently received Swiggy order: compare `order_details` items vs what the KOT printed. Also check if Swiggy sends order-update webhooks after initial creation.

---

### BUG-470 — Waiter Edit Permission Bypass [#10]
**Classification:** FE_BUG — CONFIRMED  
**Confidence:** HIGH

**Code evidence:**
```javascript
// OrderEntry.jsx L327-335 — ALL defined permission keys:
const canCancelOrder  = hasPermission('order_cancel');
const canCancelItem   = hasPermission('food');
const canShiftTable   = hasPermission('transfer_table');
const canMergeOrder   = hasPermission('merge_table');
const canFoodTransfer = hasPermission('food_transfer');
const canCustomerManage = hasPermission('customer_management');
const canBill         = hasPermission('bill');
const canDiscount     = hasPermission('discount');
const canPrintBill    = hasPermission('print_icon');

// ❌ NO permission key for: edit order / add item / remove item / change qty
```

**Root cause:** `updateQuantity()` and add-to-cart functions in OrderEntry.jsx have no permission gate. Any logged-in user (including waiters) can edit order contents.

**Planning skip eligible:** YES — LOW risk, 1 file (OrderEntry.jsx), simple `hasPermission('edit_order')` guard on qty +/- and add-item handlers. **Owner must confirm: what is the exact permission key name for edit order?**

**Next step:** Owner Decision needed — confirm permission key name (`edit_order`? `update_order`? `order_edit`?) → then Planning agent can write a plan.

---

### BUG-471/472 — Inventory Deduction Wrong for Converted Items [#12/#13]
**Classification:** BACKEND_BUG (likely) | FE investigation needed  
**Confidence:** MEDIUM

**Data flow trace:**
```
Item: "Coffee Powder" — display: packets, base: grams, conversion: 1 pkt = 500g
Order placed: 2 packets of Coffee Powder

FE builds order payload:
  → placeOrder / buildPlaceOrderPayload in orderTransform.js
  → sends: { food_id, qty: 2, unit: 'packet' } (or similar)

Backend receives order:
  → deducts inventory by qty=2 in 'packet' unit
  → BUT inventory is stored in grams
  → Backend should convert: 2 packets × 500g = 1000g deducted
  → BUG: if backend deducts 2 packets directly → only 2g deducted (wrong)
     OR:  if frontend sends qty in display units without specifying unit → backend defaults to base unit
```

**Related work:** CR-387/BUG-459 fixed stock AUDIT and SMART PURCHASE display-unit payload. But order-time consumption (the deduction when an order is placed) may use a separate code path that was not updated.

**Next step:** 
1. Check `orderTransform.js` → `buildPlaceOrderPayload` for how converted items are sent
2. Probe `POST place-order` for a converted item — check `order_details` payload
3. Check backend inventory deduction logic for aggregator vs dine-in orders

---

## ALL 32 ITEMS — Classification & Next Steps

### CRITICAL / P0 — Must Fix Immediately

| ID | # | Title | Classification | FE Involved | Next Step |
|---|---|---|---|---|---|
| BUG-482 | #31 | Duplicate payment entries on re-settlement | **BACKEND_BUG** | NO | Backend Brief — void allocations on make-unpaid |
| BUG-467 | #5 | Historical data disappeared 14 Aug | **BACKEND_BUG \| DATA_ISSUE** | LOW | Backend probe with date range |

### HIGH / P1 — Fix This Sprint

| ID | # | Title | Classification | FE Involved | Next Step |
|---|---|---|---|---|---|
| BUG-466 | #1 | Old KOT for Swiggy | PRINTER_AGENT_BUG \| BACKEND | NO | Backend probe — KOT content vs Swiggy order items |
| BUG-470 | #10 | Waiter edit permission bypass | **FE_BUG (CONFIRMED)** | YES | Owner confirms permission key → Planning skip eligible |
| BUG-471 | #12 | Inventory deduction wrong — converted items | BACKEND_BUG | PARTIAL | Probe order payload + backend deduction logic |
| BUG-472 | #13 | Consumption in wrong unit | BACKEND_BUG | PARTIAL | Same as BUG-471 |
| BUG-481 | #30 | Prepaid → Unpaid → COD | BACKEND_BUG | NO | Backend probe — Old POS re-settle payment method |
| BUG-475 | #21 | Prepaid invisible — auto-settlement | BACKEND_BUG \| CONFIG | LOW | Check auto_settle_prepaid config + backend |
| BUG-476 | #22 | Direct Print kills Bill+KOT | PRINTER_AGENT_BUG | NO | PA team — Direct Print mode regression |
| BUG-480 | #28 | Cancel After Serve not available | CONFIG_ISSUE \| FE | YES | Check canCancelOrder permission + cancel_after_serve setting |
| BUG-483 | #32 | Dashboard graph Function Error | FE_BUG \| DATA | YES | Need runtime error trace from browser console |
| BUG-477 | #24 | Incorrect system time → outlet closed | ENV_ISSUE \| FE | YES | Check if operating hours uses device clock or API |

### MEDIUM / P2 — Next Sprint

| ID | # | Title | Classification | Next Step |
|---|---|---|---|---|
| BUG-468 | #6 | Bill not printing iPhone | PRINTER_AGENT \| iOS | PA team + check WebSocket iOS compatibility |
| BUG-469 | #7 | Dual PA employee ID resets | PRINTER_AGENT | PA team — employee ID storage keying |
| BUG-473 | #19 | Stock Out/In issue | UNKNOWN | Owner provides repro steps + expected vs actual |
| BUG-478 | #25 | PA token expires | BACKEND \| PA | Backend — token TTL + refresh for PA |
| BUG-479 | #27 | Customer name missing after PA update | FE \| PA | Check CRM endpoint called by PA vs app |

### LOW / P2-P3 — Backlog

| ID | # | Title | Classification | Next Step |
|---|---|---|---|---|
| BUG-474 | #20 | PA Windows 7 incompatibility | SUPPORT | PA team — Electron version compatibility |

---

## CRs — Registered, Awaiting Gate 2

| ID | # | Title | Risk | Priority |
|---|---|---|---|---|
| CR-391 | #2 | Room settlement veg/non-veg split | MEDIUM | P2 |
| CR-392 | #3 | Discount on transferred room orders | HIGH | P2 |
| CR-393 | #4 | Configurable GST food vs room | **CRITICAL** | P2 |
| CR-394 | #8 | Backward GST for Open Items | HIGH | P2 |
| CR-395 | #9 | Order-wise KOT | MEDIUM | P2 |
| CR-396 | #11 | Waiter order taking with permission scope | HIGH | P2 |
| CR-397 | #14 | Add stock in packets, store in grams | HIGH | P2 |
| CR-398 | #15 | Food inactive timing Old POS | LOW | P3 |
| CR-399 | #16 | Aggregator item cancellation flow | HIGH | P2 |
| CR-400 | #17 | Popular Food inactive by default | LOW | P3 |
| CR-401 | #18 | Expense Notes Old POS | LOW | P3 |
| CR-402 | #23 | Opening balance in Settlement Report | HIGH | P2 |
| CR-403 | #26 | Desktop shortcut for PA | LOW | P3 |
| CR-404 | #29 | Menu restructuring + add-on grouping | MEDIUM | P2 |

---

## Items NOT in FE codebase — Escalate to Other Teams

| ID | # | Route to |
|---|---|---|
| BUG-482 | #31 | **Backend team** — reverse settlement allocations on make-unpaid |
| BUG-467 | #5 | **Backend / DBA team** — Aug 14 data probe |
| BUG-481 | #30 | **Backend team** — Old POS re-settle payment method default |
| BUG-475 | #21 | **Backend / Config team** — auto-settle prepaid config |
| BUG-466 | #1 | **Backend + Printer Agent team** — KOT content on Swiggy order |
| BUG-476 | #22 | **Printer Agent team** — Direct Print regression |
| BUG-469 | #7 | **Printer Agent team** — employee ID config persistence |
| BUG-468 | #6 | **Printer Agent team** — iOS print support |
| BUG-474 | #20 | **Printer Agent team** — Windows 7 support |
| BUG-478 | #25 | **Printer Agent + Backend team** — token TTL/refresh |
| CR-403 | #26 | **Printer Agent / Installer team** — desktop shortcut |

---

## Open Questions Needed from Owner Before Planning

| # | Question | Items blocked |
|---|---|---|
| Q1 | What is the exact permission key name for "edit order"? (`edit_order`? `order_edit`?) | BUG-470 Planning |
| Q2 | For BUG-473 (#19 Stock Out/In) — what exact steps trigger the issue and what is expected vs actual? | BUG-473 Investigation |
| Q3 | For BUG-483 (#32 graph error) — can you share the browser console error message? | BUG-483 investigation |
| Q4 | For CR-393 (#4 GST config) — is this per-property setting or per-order-type? What are the GST rules? | CR-393 Planning |
| Q5 | For CR-397 (#14 add stock in packets) — is this the same fix needed for BUG-471 deduction, or a separate stock-add flow? | CR-397 scope |

---

## Retroactive Candidates
- BUG-471/472 are closely related to BUG-459 (stock audit) and CR-387 (smart purchase). Check if those fixes cover the consumption path too, or if a new fix is needed.
- BUG-470 (edit permission) may partially overlap with CR-396 (waiter scope). Separate: 470 is a missing guard, 396 is a new scoped permission feature.
