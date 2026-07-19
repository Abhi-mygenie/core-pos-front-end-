# POS3.0 BUG-097 + BUG-104 Question Clearance — 2026-05-20

## 1. Purpose

This document captures owner and backend/API question clearance for BUG-097 and BUG-104 only.

This is not implementation.
This is not QA.
No code was changed.
No baseline docs were updated.
No `/app/memory/final/` was updated.

---

## 2. Scope

**In scope:**
- BUG-097 — Delivery Dispatch + Assign Rider
- BUG-104 — Credit / Tab Management Module

**Out of scope:**
All other POS3.0 items.

---

## 3. Inputs Read

### Primary Docs
1. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_097_104_CONTINUATION_PLANNING_2026_05_20.md`
2. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_097_ANALYSIS_2026_05_19.md`
3. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_104_ANALYSIS_2026_05_20.md`

### Supporting Docs (referenced)
4. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_CR_MASTER_PLANNING_2026_05_18.md`
5. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_SESSION_SUMMARY_2026_05_19_20.md`

---

## 4. BUG-097 Owner Answers

| Question ID | Question | Owner Answer | Planning Impact |
|---|---|---|---|
| OQ-097-1a | Should we implement Dispatch-only first, or wait for full flow? | **3 buckets approved.** Bucket 1: Dispatch (own orders). Bucket 2: Assign Rider. Bucket 3: Socket reflection + Reassign. Take approval per bucket. | Implementation will be phased with approval gates between buckets. |
| OQ-097-1b | How does POS determine if restaurant has delivery staff? | **`source === "own"` means NO delivery boys → Dispatch button.** `source !== "own"` (has delivery boys) → Assign button. `delivery-employee-list` also returns available riders. | Button logic is determined by `source` field (`order_in` from backend) on the order object, NOT by a profile flag. Simpler than expected. |
| OQ-097-1c | "Delivered" endpoint — same API #3 or separate? | **Same API #3** (`order-status-update`) with different status values. "Already shared." | No new endpoint needed for "Delivered". Use existing API #3 with appropriate status payload. |
| OQ-097-1d | Where does `source` come from? | Confirmed: `order_in` field on every order object returned by APIs and socket events. Already available in order data. | No additional API call needed to determine source. |

### BUG-097 Owner Clarification — Button Logic (Corrected)

**Previous understanding (from analysis doc):** Button type determined by "has delivery staff" vs "no delivery staff" — mechanism unknown.

**Corrected understanding (from owner):**
- `source === "own"` → **Dispatch** button (cashier delivers, no delivery boys)
- `source !== "own"` → **Assign** button (delivery boys available, use `delivery-employee-list` to get rider list)
- Aggregator orders (`swiggy`, `zomato`) are out of scope — so `source !== "own"` in the context of BUG-097 means orders that have delivery staff

**Note:** The analysis doc §5 stated `source` logic was "inverted" in current code. With this owner clarification, the current code's `source === "own"` check IS the correct field to use — it just needs the correct button label mapping:
- `source === "own"` → **Dispatch** (NOT "Assign")
- `source !== "own"` (non-aggregator) → **Assign** (NOT "Dispatch")

### BUG-097 Approved Implementation Buckets

| Bucket | Scope | APIs Used | Prerequisite |
|---|---|---|---|
| **Bucket 1 — Dispatch** | Own delivery orders (`source === "own"`). Dispatch button → API #3. After dispatch → "Dispatched" state. "Delivered" button → API #3 with different status. | API #3 (order-status-update) | None — fully documented |
| **Bucket 2 — Assign Rider** | Non-own delivery orders (`source !== "own"`). Assign button → API #1 (list riders) → picker modal → API #2 (assign). Card shows rider name + "Assigned" pill. | API #1 (delivery-employee-list), API #2 (delivery-order-assign) | Bucket 1 approval |
| **Bucket 3 — Socket Reflection + Reassign** | Rider accepts → socket → dispatched. Rider rejects → socket → "Reassign" button. Reassign = Bucket 2 flow. | Socket events (names TBD from backend) | Bucket 2 approval |

---

## 5. BUG-097 Backend/API Packet

**Ready to copy and send to backend/API team:**

---

> **BACKEND/API QUESTIONS — BUG-097 (Delivery Dispatch + Assign Rider)**
>
> We have 5 API endpoints documented by owner. Need response shapes and socket event details to proceed with frontend implementation.
>
> ---
>
> **BQ-097-1: `delivery-employee-list` response shape**
> Endpoint: `POST /api/v1/vendoremployee/delivery-employee-list`
> Payload: `{}`
> Question: What is the response shape? We need field names for: rider id, name, phone number, availability/status.
> Required: Example JSON response
> Blocks: Rider picker modal UI layout (Bucket 2)
> Can FE proceed without this? Partially — can build modal skeleton but not data mapping
>
> ---
>
> **BQ-097-2: Socket event for rider ACCEPTS**
> Context: After POS assigns a rider (API #2), the rider accepts from the rider app (API #4). POS needs to reflect this.
> Question: What socket event name fires when a rider accepts? What is the payload shape?
> Required: Socket event name + example payload
> Blocks: Bucket 3 — rider accept → dispatched state reflection
> Can FE proceed without this? Yes for Buckets 1-2. No for Bucket 3.
>
> ---
>
> **BQ-097-3: Socket event for rider REJECTS**
> Context: After POS assigns a rider, the rider rejects from the rider app (API #5). POS needs to show "Reassign" button.
> Question: What socket event name fires when a rider rejects? What is the payload shape?
> Required: Socket event name + example payload
> Blocks: Bucket 3 — rider reject → Reassign flow
> Can FE proceed without this? Yes for Buckets 1-2. No for Bucket 3.
>
> ---
>
> **BQ-097-4: "Delivered" status payload**
> Endpoint: `POST /api/v2/vendoremployee/order/order-status-update` (same as Dispatch API #3)
> Context: Owner confirmed "Delivered" uses the same endpoint as Dispatch, with different status values.
> Question: What are the exact payload fields for marking an order as "Delivered"? Is it `{order_id, order_status: "delivered", role_name}` or different values?
> Required: Exact payload for "Delivered" action
> Blocks: Bucket 1 — terminal delivery action
> Can FE proceed without this? Partially — can implement Dispatch, block on Delivered button
>
> ---
>
> **BQ-097-5: `delivery-order-assign` response shape**
> Endpoint: `POST /api/v1/vendoremployee/delivery-order-assign`
> Payload: `{order_id, delivery_man_id}`
> Question: What does the response look like after successful assignment? Does it return the updated order object, or just a success indicator?
> Required: Example JSON response
> Blocks: Bucket 2 — post-assign UI update (show rider name on card)
> Can FE proceed without this? Partially — can call API but unclear how to update card state
>
> ---
>
> **BQ-097-6: Dispatch (`order-status-update`) response shape**
> Endpoint: `POST /api/v2/vendoremployee/order/order-status-update`
> Payload: `{order_id, order_status: "serve", order_dispatch_status: "Yes", role_name}`
> Question: What does the response look like after successful dispatch? Updated order object or success flag?
> Required: Example JSON response
> Blocks: Bucket 1 — post-dispatch UI update
> Can FE proceed without this? Partially — can call API but unclear how to confirm success in UI

---

## 6. BUG-097 Updated Classification

**Classification: partially_ready_with_backend_questions**

**Rationale:**
- All owner questions are answered
- Bucket 1 (Dispatch-only) may proceed — API #3 endpoint and payload are documented
- **However, 6 backend/API questions remain unanswered (BQ-097-1 through BQ-097-6)**
- Bucket 1 "Delivered" action remains blocked — exact payload pending (BQ-097-4)
- Bucket 2 (Assign Rider) remains **blocked** — needs BQ-097-1 (response shape) and BQ-097-5 (assign response)
- Bucket 3 (Socket Reflection + Reassign) remains **blocked** — needs BQ-097-2 and BQ-097-3 (socket events)
- BUG-097 is **NOT fully ready**. Only Dispatch-only can proceed. The remaining delivery lifecycle (Assign, rider accept/reject, Delivered) is backend-blocked.

**What can proceed:** Dispatch-only (API #3 call + button logic fix + prerequisite transform extension)
**What remains blocked:** Assign Rider, rider accept/reject socket handling, Delivered action, full delivery lifecycle

**Next step:** Send backend/API packet (BQ-097-1 through BQ-097-6). Only Dispatch-only work may begin. All other buckets wait for backend answers.

---

## 7. BUG-104 Owner Answers

| Question ID | Question | Owner Answer | Planning Impact |
|---|---|---|---|
| OQ-104-1 | Is the Phase 1 / Phase 2 split acceptable? Phase 1: list + detail + clearance. Phase 2: reports + WhatsApp + PDF. | **A — Yes, Phase 1 first, then Phase 2.** | Phase 1 scope is frozen: customer credit list, tab detail, bill detail, credit clearance. Reports and sharing deferred. |
| OQ-104-2 | Should Credit module use mobile number (PAY-008) or CRM customer_id? | **A — Mobile number** (keep current PAY-008 behavior). | Data model uses mobile number as unique customer key. No CRM integration needed for Phase 1. Simplifies implementation. |
| OQ-104-3 | What filter options for the "Default" dropdown on Credit List? | **Accepted recommendation:** All / With Balance / Settled. | Filter dropdown: "All" (default), "With Balance" (outstanding > 0), "Settled" (balance = 0). |

### BUG-104 Scope Freeze — Phase 1

| # | Feature | In Phase 1? | Notes |
|---|---|---|---|
| 1 | Credit Management page + route + sidebar entry | **Yes** | Route: `/orders/credit`. Sidebar entry already exists as placeholder. |
| 2 | Customer credit list with search + filter | **Yes** | Search by phone/name/email. Filter: All / With Balance / Settled. Columns: Phone, Name, Total tab (lifetime), Total paid, Balance. |
| 3 | Per-customer tab detail view | **Yes** | SS2: Order Id, Amount, Order Date, Details button. |
| 4 | Bill detail view (single order) | **Yes** | SS3: Item breakdown, Sub Total, Total. Print icon. |
| 5 | Credit clearance with partial payment | **Yes** | SS4: Inline expansion. Payment pills (Cash/Card/UPI per restaurant config). Total payable, Paid input, Balance auto-calc. "Update Credit" button. |
| 6 | Additional columns (lifetime credit, total paid) | **Yes** | Owner-requested in SS1. Depends on API support. |
| 7 | Per-customer report download | **No — Phase 2** | |
| 8 | Multi-customer PDF download | **No — Phase 2** | |
| 9 | WhatsApp share | **No — Phase 2** | |

### BUG-104 Data Model Decision

- **Customer identifier:** Mobile number (PAY-008 rule)
- **No CRM `customer_id` integration** for Phase 1
- Mobile number is the unique key for grouping tab orders per customer
- This is consistent with the existing tab payment method in CollectPaymentPanel

---

## 8. BUG-104 Backend/API Packet

**Ready to copy and send to backend/API team:**

---

> **BACKEND/API QUESTIONS — BUG-104 (Credit / Tab Management Module)**
>
> Owner has approved Phase 1 scope: customer credit list, tab detail, bill detail, credit clearance with partial payment. Mobile number is the customer identifier. We need API documentation to build the frontend.
>
> ---
>
> **BQ-104-1: Credit management API catalog**
> Context: Building a new Credit Management page. Need endpoints for the following actions:
>
> **(a) List credit customers with aggregated balances**
> - Purpose: Main screen (SS1). Show all customers with outstanding credit.
> - Required fields: customer phone, customer name, total tab money (lifetime), total paid, outstanding balance
> - Filters needed: All / With Balance / Settled. Search by phone/name/email.
> - Question: Is there an existing endpoint for this, or does a new one need to be built?
> - Note: Existing `GET /api/v2/vendoremployee/paid-in-tab-order-list` may partially serve — does it return customer-level aggregated balances, or is it a flat list of individual tab orders?
>
> **(b) Customer tab orders by phone**
> - Purpose: Detail view (SS2). Show all tab orders for a specific customer.
> - Required fields: order id, amount, order date
> - Filter: date range
> - Question: Is there an endpoint to fetch tab orders filtered by customer phone number?
>
> **(c) Credit clearance / partial payment**
> - Purpose: Clearance action (SS4). Record a partial or full payment against a customer's outstanding credit.
> - Required payload: customer phone, payment amount, payment method (cash/card/upi)
> - Question: What endpoint should POS call to record credit clearance? What payload is expected? What is the response shape?
>
> Required: API paths + request payloads + example response shapes for all three
> Blocks: All BUG-104 Phase 1 implementation
> Can FE proceed without this? No
>
> ---
>
> **BQ-104-2: `paid-in-tab-order-list` response shape**
> Endpoint: `GET /api/v2/vendoremployee/paid-in-tab-order-list`
> Context: This endpoint already exists in the codebase. We need to understand if it can serve as the data source for the Credit Management main screen, or if a new aggregated endpoint is needed.
> Question: What does this endpoint return? Is it:
> (a) A flat list of individual tab orders? (need to aggregate on FE)
> (b) A customer-grouped list with aggregated balances? (can use directly)
> Required: Example JSON response
> Blocks: BUG-104 main screen data source decision
> Can FE proceed without this? No
>
> ---
>
> **BQ-104-3: Single order detail for bill view**
> Endpoint: `POST /api/v2/vendoremployee/get-single-order-new`
> Context: SS3 (Bill Detail) needs item-level breakdown for a single tab order. We believe the existing `get-single-order-new` endpoint can serve this.
> Question: Does the response include item-level details (item name, quantity, price) for tab orders? Any differences from regular order detail?
> Required: Confirmation + any caveats for tab orders
> Blocks: SS3 bill detail view
> Can FE proceed without this? Partially — can assume existing endpoint works, verify at integration time

---

## 9. BUG-104 Updated Classification

**Classification: blocked_pending_api_catalog**

**Rationale:**
- All owner scope questions are answered
- Phase 1 scope is frozen (list + detail + bill + clearance)
- Data model decision is made (mobile-based, PAY-008)
- Filter options defined (All / With Balance / Settled)
- **But:** API documentation is the critical missing piece
- Cannot begin implementation planning without knowing which endpoints exist, which need to be built, and what their request/response shapes are
- BQ-104-1 (API catalog) is the blocking question
- BQ-104-2 (existing endpoint shape) determines whether FE needs aggregation logic or can use backend-provided aggregates

**Next step:** Send backend/API packet. Once BQ-104-1 and BQ-104-2 are answered, create Phase 1 implementation planning document.

---

## 10. Ready / Blocked Summary

| Item | Updated Status | Can Move To Implementation Planning? | Reason |
|---|---|---|---|
| BUG-097 (overall) | **partially_ready_with_backend_questions** | **Dispatch-only may proceed. Full lifecycle blocked.** | 6 backend/API questions remain unanswered (BQ-097-1 through BQ-097-6). Only Dispatch button API call can proceed. Assign Rider, Delivered action, rider accept/reject socket handling all blocked. |
| BUG-097 Bucket 1 (Dispatch-only) | **dispatch_only_can_proceed** | **Yes — Dispatch button only** | API #3 is documented. Button logic fix can proceed. "Delivered" action blocked (BQ-097-4). |
| BUG-097 Bucket 2 (Assign Rider) | **blocked_pending_backend_api_answers** | **No** | Needs BQ-097-1 (response shape) and BQ-097-5 (assign response). |
| BUG-097 Bucket 3 (Socket + Reassign) | **blocked_pending_backend_api_answers** | **No** | Requires BQ-097-2 and BQ-097-3 (socket event names + payloads). |
| BUG-104 Phase 1 | **blocked_pending_api_catalog** | **No** | Owner scope cleared. Needs BQ-104-1 (API catalog) and BQ-104-2 (existing endpoint shape) before planning. No implementation planning for BUG-104 until API catalog received. |

---

## 11. Final Status

**bug_097_partially_ready_dispatch_only_bug_104_api_blocked**

| Metric | BUG-097 | BUG-104 |
|---|---|---|
| Owner questions | **All cleared** (4 answers) | **All cleared** (3 answers) |
| Implementation buckets | 3 buckets approved | Phase 1 scope frozen |
| Backend/API questions remaining | **6 unanswered** (BQ-097-1 through BQ-097-6) | **3 unanswered** (BQ-104-1 through BQ-104-3) |
| Overall status | **partially_ready_with_backend_questions** | **blocked_pending_api_catalog** |
| Can start implementation? | **Dispatch-only** — remaining lifecycle blocked | **No — API catalog needed** |
| What can proceed | Dispatch button (API #3) + button logic fix + prerequisite transform extension | Nothing |
| What remains blocked | Assign Rider, Delivered action, rider accept/reject socket, full delivery lifecycle | All Phase 1 implementation |
| Button logic resolved? | **Yes** — `source === "own"` → Dispatch, else → Assign | N/A |
| Data model resolved? | N/A | **Yes** — mobile-based (PAY-008) |
| Phase split resolved? | **Yes** — 3 buckets with approval gates | **Yes** — Phase 1 (core) / Phase 2 (reports+sharing) |
| Code changed | NO | NO |
| `/app/memory/final/` updated | NO | NO |
| Baseline updated | NO | NO |
| QA run | NO | NO |

---

---

## 12. Addendum — Backend/API Answers Received (2026-05-20, Late Session)

### BQ-097-1: `delivery-employee-list` Response Shape — ANSWERED ✅

**API called successfully.** Response is a **JSON array** of employee objects:

```json
[
  {
    "id": 1477,
    "f_name": "Captain",
    "l_name": null,
    "phone": null,
    "email": "captain@18march.com",
    "status": true,
    "image": null,
    "employee_role_id": 2116,
    "vendor_id": 500,
    "restaurant_id": 478,
    "is_production": "Yes",
    ...
  }
]
```

**Key fields for rider picker modal:**
| Field | Type | Use |
|---|---|---|
| `id` | number | `delivery_man_id` for assign API |
| `f_name` | string | First name (display) |
| `l_name` | string/null | Last name (display) |
| `phone` | string/null | Phone number (display) |
| `email` | string | Email (secondary display) |
| `status` | boolean | Active/inactive filter |
| `image` | string/null | Avatar (optional) |
| `is_production` | "Yes"/"No" | May filter production-only staff |

**Note:** Response returns ALL employees, not just delivery staff. FE may need to filter or display all. Owner to clarify if filtering needed.

### BQ-097-2: Rider Accept Socket Event — STILL PENDING

Owner response: "we can validate and provide."
**Status: pending — owner will test and share event name.**

### BQ-097-3: Rider Reject Socket Event — STILL PENDING

Owner response: same as BQ-097-2.
**Status: pending — owner will test and share event name.**

### BQ-097-4: "Delivered" Button Action — ANSWERED ✅ (MAJOR CLARIFICATION)

Owner response: **"it collect bill API which is called, button name is delivered"**

**This changes the implementation plan significantly:**
- The "Delivered" button does **NOT** call `order-status-update`
- It calls the **Collect Bill / payment completion API** (the existing settlement flow)
- The button is labeled "Delivered" but the underlying action is **bill collection**
- This means the "Delivered" button should open the existing `CollectPaymentPanel` or trigger the existing collect-bill flow
- **No new API endpoint needed for "Delivered"** — it reuses the existing payment/settlement infrastructure

**Impact on Bucket 1:**
- Dispatch button → API #3 (`order-status-update`) — unchanged
- "Delivered" button → opens Collect Bill flow (existing `CollectPaymentPanel`) — **NOT a new API call**
- This removes BQ-097-4 as a blocker for Bucket 1

### BQ-097-5: `delivery-order-assign` Response Shape — CURL RECEIVED, NOT YET CALLED

Owner shared curl. Requires a valid `order_id` with an active delivery order to test.
**Status: curl documented, response shape pending live test.**

### BQ-097-6: Dispatch `order-status-update` Response Shape — CURL RECEIVED, NOT YET CALLED

Owner shared curl with payload: `{order_id: 868695, order_status: serve, role_name: Manager, order_dispatch_status: Yes}`
**Status: curl documented, response shape pending live test.**

### Updated Blocker Status After Addendum

| Question | Previous Status | Updated Status |
|---|---|---|
| BQ-097-1 (employee-list response) | Pending | **ANSWERED** ✅ |
| BQ-097-2 (rider accept socket) | Pending | **Still pending** — owner will validate |
| BQ-097-3 (rider reject socket) | Pending | **Still pending** — owner will validate |
| BQ-097-4 ("Delivered" action) | Pending | **ANSWERED** ✅ — Collect Bill flow, not status-update |
| BQ-097-5 (assign response) | Pending | **Curl received** — needs live order test |
| BQ-097-6 (dispatch response) | Pending | **Curl received** — needs live order test |

### Updated BUG-097 Classification After Addendum

**Still `partially_ready_with_backend_questions`** — but more items unblocked:

| Bucket | Previous Readiness | Updated Readiness |
|---|---|---|
| Bucket 1 (Dispatch) | Dispatch-only, "Delivered" blocked | **Dispatch unblocked.** "Delivered" = Collect Bill flow (existing infra). |
| Bucket 2 (Assign Rider) | Blocked on BQ-097-1, BQ-097-5 | **BQ-097-1 answered.** Modal data mapping now possible. BQ-097-5 curl received. |
| Bucket 3 (Socket + Reassign) | Blocked on BQ-097-2, BQ-097-3 | **Still blocked** — socket events pending owner validation. |

### Login Credentials Used

Login API: `POST https://preprod.mygenie.online/api/v1/auth/vendoremployee/login`
Credentials: `owner@18march.com` / `Qplazm@10`
Role: Owner (restaurant_id: 478)

---

*— POS3.0 BUG-097 + BUG-104 Question Clearance — 2026-05-20 —*
