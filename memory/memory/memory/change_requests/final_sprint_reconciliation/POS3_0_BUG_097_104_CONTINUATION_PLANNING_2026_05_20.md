# POS3.0 BUG-097 + BUG-104 Continuation Planning — 2026-05-20

## 1. Purpose

This document plans next-step readiness only for BUG-097 and BUG-104.

This is not implementation.
This is not QA.
No code was changed.
No baseline docs were updated.
No `/app/memory/final/` was updated.

---

## 2. Scope

**In scope:**
- BUG-097 — Delivery Dispatch + Assign Delivery Boy API Integration
- BUG-104 — Credit / Tab Management Module

**Out of scope:**
All other POS3.0 bugs and CRs.

---

## 3. Inputs Read

### Primary Analysis Docs
1. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_097_ANALYSIS_2026_05_19.md`
2. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_104_ANALYSIS_2026_05_20.md`

### Supporting Context Docs
3. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_CR_MASTER_PLANNING_2026_05_18.md`
4. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_SESSION_SUMMARY_2026_05_19_20.md`
5. `/app/memory/bugs/POS3_0_BUG_IMPACT_ANALYSIS.md` (BUG-097 section)
6. `/app/memory/bugs/POS3_0_BUG_IMPACT_ANALYSIS_ADDENDUM.md` (BUG-104 section)

---

## 4. Executive Summary

| Item | Current Status | Planning Readiness | Main Blocker | Recommended Next Step |
|---|---|---|---|---|
| BUG-097 | Analysis complete. 5 API endpoints documented by owner. 4 open questions. | **ready_with_backend_api_constraints** | 4 unanswered questions (delivery staff detection, socket events, API response shapes, "Delivered" endpoint) | Answer 4 open questions → create implementation plan |
| BUG-104 | Analysis updated with 4 owner screenshots. Scope substantially clarified. 5 open questions. | **owner_scope_session_needed** | API documentation missing for all management actions. CRM integration decision pending. Reports feature complexity unscoped. | Owner answers 5 scope questions + backend provides API catalog → then implementation plan |

---

## 5. BUG-097 Planning Details

### 5.1 Requirement Summary

Delivery orders on the POS dashboard have placeholder buttons (`console.log`) for **Dispatch** and **Assign Rider**. Backend APIs are reportedly ready. POS needs real API integration for both actions, including a rider picker modal for the Assign flow.

**Scope boundary:** Own orders only. Aggregator orders (Swiggy/Zomato) are out of scope.

### 5.2 Current Known API Readiness

Five endpoints are **owner-documented** (analysis doc §3):

| # | Action | Endpoint | Payload | Who Triggers |
|---|---|---|---|---|
| 1 | List delivery persons | `POST /api/v1/vendoremployee/delivery-employee-list` | `{}` | Cashier (POS) |
| 2 | Assign rider to order | `POST /api/v1/vendoremployee/delivery-order-assign` | `{order_id, delivery_man_id}` | Cashier (POS) |
| 3 | Dispatch (self-deliver) | `POST /api/v2/vendoremployee/order/order-status-update` | `{order_id, order_status: "serve", order_dispatch_status: "Yes", role_name}` | Cashier (POS) |
| 4 | Rider accepts | `POST /api/v2/vendoremployee/order/order-status-update` | `{order_id, order_status: "serve", delivery_man_status: "Yes", role_name}` | Rider (rider app — NOT POS) |
| 5 | Rider rejects | `POST /api/v1/vendoremployee/delivery-order-cancel` | `{order_id, delivery_man_id}` | Rider (rider app — NOT POS) |

**POS only calls APIs #1, #2, and #3.** APIs #4 and #5 are rider-app actions. POS reflects their outcomes via socket events.

### 5.3 UI / Actions Needed

| UI Element | Description | Complexity |
|---|---|---|
| **Dispatch button** | Direct action on DeliveryCard. Calls API #3. No modal. | Low |
| **Assign button** | Opens rider picker modal. Calls API #1 for list, then API #2 to assign. | Medium |
| **Rider picker modal** | New component. Shows list of delivery persons from API #1. Select → confirm → API #2. | Medium |
| **Assigned state display** | Rider name + "Assigned" pill on card. Already partially exists in DeliveryCard L102-135. | Low |
| **Reassign button** | Appears after rider rejects. Same flow as Assign. | Low (reuse) |
| **Delivered button** | Marks order as delivered after dispatch. **Endpoint unknown.** | Blocked |

### 5.4 Delivery Order Lifecycle (POS Perspective)

```
Flow A — Dispatch (no delivery staff):
  Order Ready → [Dispatch button] → API #3 → Dispatched → [Delivered button] → Done

Flow B — Assign Rider (has delivery staff):
  Order Ready → [Assign button] → API #1 (list) → Picker modal → Select rider → API #2 (assign)
                                                                        │
                                                       ┌────────────────┼────────────────┐
                                                       │                                 │
                                                 Rider ACCEPTS                     Rider REJECTS
                                                 (rider app, API #4)               (rider app, API #5)
                                                       │                                 │
                                                       ▼                                 ▼
                                                  Dispatched                         [Reassign button]
                                                  (via socket)                       (same as Assign)
                                                       │
                                                       ▼
                                                  [Delivered] → Done
```

### 5.5 DeliveryCard State Machine

| Order Status | Rider State | Button | Action |
|---|---|---|---|
| `ready` | No delivery staff | **Dispatch** | API #3 |
| `ready` | Has delivery staff, unassigned | **Assign** | API #1 → modal → API #2 |
| `ready` | Rider rejected | **Reassign** | API #1 → modal → API #2 |
| any | Rider assigned, pending accept | No button (waiting) | Rider section shows name + "Assigned" pill |
| any | Rider accepted | — | Moves to `dispatched` via socket |
| `dispatched` | — | **Delivered** | Mark complete (endpoint unknown) |
| `delivered` | — | **Done** (label) | Terminal |

### 5.6 Button Logic Correction

Current code at DeliveryCard.jsx L190-196 uses `source === "own"` to determine button type. Per owner clarification:
- **Has delivery staff → "Assign"**
- **No delivery staff → "Dispatch"**

The current `source === "own"` logic is inverted/incorrect. The correct signal is whether the restaurant has delivery staff — determined either by:
- A profile flag (unknown if exists), OR
- Calling `delivery-employee-list` and checking if list is empty

### 5.7 Existing Code Inventory

| File | What Exists | What's Missing |
|---|---|---|
| `DeliveryCard.jsx` L190-196 | Placeholder button with `console.log` | Real API calls |
| `DeliveryCard.jsx` L102-135 | Rider section — renders `order.rider`, `order.riderPhone`, `riderStatus` pill | Already works if data is present |
| `DeliveryCard.jsx` L200-210 | Dispatched → Delivered → Done button chain | Placeholder `console.log` |
| `statusHelpers.js` L129 | `RIDER_STATUS_CONFIG`: lookingForRider, riderAssigned, riderReached | May need "rejected" status |
| `socketHandlers.js` L593 | `handleDeliveryAssignOrder` — fetches order via API | Works but redundant API call (BUG-094 scope) |
| `api/constants.js` | — | Missing endpoint constants for all 5 APIs |
| `orderService.js` | — | Missing service functions for dispatch/assign/list |

### 5.8 Socket / Realtime Needs

- Rider accept: POS must reflect via socket event → order moves to `dispatched`
- Rider reject: POS must reflect via socket event → button becomes "Reassign"
- **Open question:** Which socket event fires for rider accept/reject? Is it `update-order-status`, `delivery-assign-order`, or a different event?

### 5.9 Role/Permission Needs

- Dispatch and Assign actions are triggered by the **Cashier** role on POS
- No special permission gate mentioned by owner
- `role_name` is part of the dispatch payload (API #3) — must come from logged-in user context

### 5.10 Dependencies

| Dependency | Status |
|---|---|
| 5 API endpoints documented | **Done** |
| API response shapes (list, assign, dispatch) | **Unknown** |
| Socket event names for rider accept/reject | **Unknown** |
| "Delivered" mark-complete endpoint | **Unknown** |
| Delivery staff detection mechanism | **Unknown** |
| BUG-094 (delivery-assign-order socket payload) | Related but separate scope |

### 5.11 Open Questions (from Analysis Doc §9)

| # | Question | Status | Blocking? |
|---|---|---|---|
| Q-097-1 | How does POS know if restaurant has delivery staff? Empty `delivery-employee-list` = no staff? Or a profile flag? | **Unanswered** | Yes — determines Dispatch vs Assign button logic |
| Q-097-2 | What socket event fires when rider accepts/rejects? Is it `update-order-status` or `delivery-assign-order`? | **Unanswered** | Yes — determines how POS reflects rider decisions |
| Q-097-3 | What does `delivery-employee-list` response look like? (field names: id, name, phone, status) | **Unanswered** | Yes — determines rider picker modal layout |
| Q-097-4 | "Delivered" button — which API endpoint marks delivery complete? | **Unanswered** | Yes — determines terminal delivery action |

### 5.12 Implementation Wave (If Questions Answered)

If all 4 questions are answered, BUG-097 can proceed to **implementation planning** as a **Medium-sized CR** in Wave CR-B.

**Recommended implementation sequence:**
1. Add endpoint constants to `constants.js`
2. Create service functions in `orderService.js` (or new `deliveryService.js`)
3. Implement Dispatch button → API #3 call → success handling
4. Implement rider picker modal (new component: `AssignRiderModal.jsx`)
5. Implement Assign button → API #1 → modal → API #2 → success handling
6. Wire socket events for rider accept/reject → state updates
7. Implement "Delivered" button (after endpoint confirmed)
8. Fix button logic (replace `source === "own"` with delivery staff detection)
9. Add "rejected" status to `RIDER_STATUS_CONFIG` if needed

**Estimated effort:** 3-5 implementation sessions (excluding waiting for Q&A)

### 5.13 Planning Status

**ready_with_backend_api_constraints**

The 5 core API endpoints are known. The delivery flow is fully mapped. The existing code structure is understood. However, 4 open questions (response shapes, socket events, delivery staff detection, delivered endpoint) must be answered before confident implementation can begin. These are backend/API questions, not owner scope questions.

---

## 6. BUG-104 Planning Details

### 6.1 Requirement Summary

Build a complete **Credit / Tab Management module** — a new page/route in the POS allowing cashiers to view, manage, and settle customer credit balances. Currently, tab/credit exists only as a **payment method** within Collect Bill (PAY-008: customer name + mobile, no `customer_id`). The new module adds a **management layer** on top.

### 6.2 Screenshots / Context Summary

Owner provided **4 screenshots from the old POS** (documented in analysis doc §2):

| Screen | Description | Key Elements |
|---|---|---|
| **SS1 — Customer Credit List** | Main screen. Table of customers with outstanding credit. | Phone, Name, Balance columns. Download/WhatsApp/Edit icons per row. Search + filter dropdown. Global download icon. **Owner addition:** Total tab money (lifetime), Total paid, Balance columns. |
| **SS2 — Customer Tab Detail** | Clicking a customer shows their tab orders. | Serial No, Order Id, Amount, Order Date, Details button. Print icon. All/date filter. |
| **SS3 — Bill Detail** | Single order breakdown. | Order ID, item line (name + qty + price), Sub Total, Total (orange). Print icon. |
| **SS4 — Credit Clearance** | Inline expansion on main list. Partial payment supported. | Payment method pills (Cash/Card/UPI — respects restaurant config). Total payable, Paid (editable input), Balance (auto-calculated). "Update Credit" button. |

### 6.3 Module Boundary

This is a **combined Credit/Tab Management** module (not separate Credit and Tab modules). "Credit" and "Tab" are used interchangeably — a tab order IS a credit order (deferred payment).

**What this module IS:**
- Customer credit balance list + search + filter
- Per-customer tab order detail view
- Single order bill detail view
- Partial credit clearance with payment method selection
- Per-customer and multi-customer report download (PDF, date-ranged)
- WhatsApp statement sharing

**What this module is NOT:**
- Credit limit management (not in screenshots — unclear if needed)
- Credit approval workflow (not in screenshots)
- Automated overdue/aging tracking (not in screenshots)

### 6.4 MVP Scope Candidate (Phase 1)

Based on the 4 screenshots, the minimum viable module is:

| # | Feature | Screenshot | MVP? |
|---|---|---|---|
| 1 | Credit Management page + route + sidebar entry | — | **Yes** |
| 2 | Customer credit list with search + filter | SS1 | **Yes** |
| 3 | Per-customer tab detail view (orders on credit) | SS2 | **Yes** |
| 4 | Bill detail view (single order breakdown) | SS3 | **Yes** |
| 5 | Credit clearance — payment pills + partial payment | SS4 | **Yes** |
| 6 | Per-customer report download (date range, opening/closing credit) | Owner-described | Phase 2 |
| 7 | Multi-customer PDF download | Owner-described | Phase 2 |
| 8 | WhatsApp share (statement) | SS1 icon | Phase 2 |
| 9 | Additional columns: lifetime credit, total paid | Owner request | **Yes** (if API supports) |

**Phase 1 = Features 1-5 + 9** (core CRUD management)
**Phase 2 = Features 6-8** (reports + sharing)

### 6.5 Phase 1 vs Later

| Phase | Features | Rationale |
|---|---|---|
| **Phase 1** | Customer list, tab detail, bill detail, credit clearance | Core management capability. Allows cashiers to view and settle credit. |
| **Phase 2** | Per-customer report download (date-ranged PDF with opening/closing credit) | Requires backend report generation or complex FE PDF generation. Lower urgency. |
| **Phase 2** | Multi-customer bulk PDF export | High complexity (multi-section PDF). Depends on Phase 2 single-customer report. |
| **Phase 2** | WhatsApp share | Low complexity but depends on delivery mechanism (client-side `wa.me` vs backend API). |

### 6.6 Key Design Decisions from Screenshots

1. Credit clearance is **inline** (expands on the main list row) — not a separate page
2. Payment methods for clearance respect **restaurant config** (Cash / Card / UPI pills)
3. **Partial payment** supported (Paid input ≠ Total payable, Balance auto-calculated)
4. Customer identifier = **phone number** (consistent with PAY-008 baseline rule)
5. Reports are **downloadable PDFs** with date range (Day / Week / Month / Custom)
6. Multi-customer PDF is a **bulk export** (select multiple → single PDF)

### 6.7 Overlap with BUG-105 (Settlement Module)

| Area | BUG-104 (Credit) | BUG-105 (Settlement) | Overlap |
|---|---|---|---|
| Credit balance clearance | **Yes** — clear individual customer credit | May include credit totals in settlement | Low |
| Payment method tracking | Clearance payment method (Cash/Card/UPI) | Shift/day payment method breakdown | Data overlap (credit clearance payments should appear in settlement) |
| Report generation | Credit reports per customer | Settlement reports per shift/day | May share report infrastructure |
| Tab order data | Uses `paid-in-tab-order-list` endpoint | May summarize tab settlement totals | Data source overlap |

**Recommendation:** Build BUG-104 first. BUG-105 can consume credit clearance data from BUG-104's API layer. No tight coupling needed, but the data flows overlap.

### 6.8 APIs Needed

| # | API | Purpose | Status |
|---|---|---|---|
| 1 | List credit customers with balances | SS1 main screen data | **Unknown** — may be `paid-in-tab-order-list` or a new grouped endpoint |
| 2 | Customer tab orders (by phone/customer) | SS2 detail view | **Unknown** |
| 3 | Single order detail | SS3 bill detail | May use existing `get-single-order-new` |
| 4 | Update credit / partial payment | SS4 clearance action | **Unknown** |
| 5 | Download report (date range, per customer) | Report feature | **Unknown** |
| 6 | Download multi-customer PDF | Bulk report | **Unknown** |

**Existing endpoints that may partially serve:**
- `GET /api/v2/vendoremployee/paid-in-tab-order-list` — credit orders report (exists in `constants.js` L71, `reportService.js` L161-169)
- `POST /api/v2/vendoremployee/get-single-order-new` — single order detail (exists)

### 6.9 Existing Code Foundation

| Item | Where | Status |
|---|---|---|
| Sidebar entry "Credit/Tab" | `Sidebar.jsx` L45: `{ id: "credit", label: "Credit/Tab", path: "/orders/credit" }` | Exists — placeholder |
| Route | `App.js` | **Missing** — no route registered |
| Tab as payment method | `CollectPaymentPanel.jsx` | Working — select Credit/Tab → enter customer name + mobile → settle |
| Credit orders report endpoint | `constants.js` L71 | Exists |
| `fetchCreditOrders` service | `reportService.js` L161-169 | Exists |
| Business rule PAY-008 | Baseline | Tab sends customer name + mobile only, no `customer_id`. Mobile = unique key. |

### 6.10 Dependencies

| Dependency | Status |
|---|---|
| Owner screenshots | **Received** (4 screens) |
| Module scope definition | **Substantially clear** from screenshots |
| API documentation for management actions | **Missing** — biggest blocker |
| CRM `customer_id` integration decision | **Unanswered** (OQ-CR-05) |
| Report generation mechanism (backend vs FE) | **Unanswered** |
| Existing `paid-in-tab-order-list` response shape | **Not verified** — may or may not serve as the main data source |

### 6.11 Open Questions (from Analysis Doc §7 + Planning)

| # | Question | Status | Blocking? |
|---|---|---|---|
| Q-104-1 | What APIs exist for credit management? (list customers, update credit, reports) | **Unanswered** | Yes — blocks all implementation |
| Q-104-2 | Should Credit module use CRM `customer_id` or remain mobile-based (PAY-008)? | **Unanswered** | Partially — affects data model but Phase 1 can use mobile |
| Q-104-3 | What does the "Default" filter dropdown on SS1 contain? (All / Paid / Unpaid / Overdue?) | **Unanswered** | No — can default to "All" |
| Q-104-4 | WhatsApp share — is this a backend API or client-side `wa.me` link? | **Unanswered** | No — Phase 2 feature |
| Q-104-5 | Multi-customer PDF — is this generated by backend or FE? | **Unanswered** | No — Phase 2 feature |

### 6.12 Recommended Next Step

**Owner scope session** to answer Q-104-1 and Q-104-2. Then backend/API team provides endpoint documentation. Once APIs are known, implementation planning can begin for Phase 1.

Phase 1 implementation effort is estimated as **Large** (new page + 4-5 components + 2-3 service functions + route + potentially new API endpoints). Phase 2 adds **Medium** effort (reports + WhatsApp).

### 6.13 Planning Status

**owner_scope_session_needed**

The 4 screenshots substantially define the UI. The module boundary is clear. Phase 1 vs Phase 2 split is proposed. However, the **API catalog** is the critical missing piece. Q-104-1 must be answered before implementation planning can begin. Q-104-2 (CRM integration) should be answered to make the right data model decision, but Phase 1 can proceed with mobile-based identification (PAY-008 rule) as a default.

---

## 7. Owner Questions To Clear

| Question ID | Item | Question | Options / Required Evidence | Blocks |
|---|---|---|---|---|
| OQ-097-1 | BUG-097 | How does POS determine if a restaurant has delivery staff? | A. Call `delivery-employee-list` — empty = no staff, B. Profile flag/field, C. Restaurant config setting | BUG-097 Dispatch vs Assign button logic |
| OQ-104-1 | BUG-104 | Should the Credit module use CRM `customer_id` (linking to BUG-108) or remain mobile-number-based (current PAY-008 rule) for Phase 1? | A. Keep mobile-based (Phase 1 default), B. CRM `customer_id`-based (requires CRM integration), C. Mobile-based with future CRM migration path | BUG-104 data model. Non-blocking if default to Option A. |
| OQ-104-2 | BUG-104 | Is the Phase 1 / Phase 2 split acceptable? Phase 1: list + detail + clearance. Phase 2: reports + WhatsApp + multi-PDF. | A. Accept split, B. Reports must be in Phase 1, C. Different split | BUG-104 implementation scope |
| OQ-104-3 | BUG-104 | What filter options should the "Default" dropdown on the Credit List screen contain? | A. All / With Balance / Fully Paid, B. All / Ascending / Descending by balance, C. Other | Non-blocking — default to "All" |

---

## 8. Backend/API Questions To Send

| Question ID | Item | Backend/API Question | Required Evidence | Blocks |
|---|---|---|---|---|
| BQ-097-1 | BUG-097 | What is the response shape of `POST /api/v1/vendoremployee/delivery-employee-list`? (Field names: id, name, phone, status, availability) | Example JSON response | BUG-097 rider picker modal layout |
| BQ-097-2 | BUG-097 | What socket event fires when a rider accepts an assigned order? Event name + payload shape. | Socket event name + example payload | BUG-097 rider accept state reflection |
| BQ-097-3 | BUG-097 | What socket event fires when a rider rejects an assigned order? Event name + payload shape. | Socket event name + example payload | BUG-097 rider reject → Reassign flow |
| BQ-097-4 | BUG-097 | Which API endpoint marks a delivery order as "Delivered" (final completion)? | Endpoint path + payload | BUG-097 terminal action |
| BQ-097-5 | BUG-097 | What is the response shape of `POST /api/v1/vendoremployee/delivery-order-assign`? (Success indicator, updated order data?) | Example JSON response | BUG-097 post-assign UI update |
| BQ-097-6 | BUG-097 | What is the response shape of `POST /api/v2/vendoremployee/order/order-status-update` when used for dispatch? | Example JSON response | BUG-097 post-dispatch UI update |
| BQ-104-1 | BUG-104 | What backend APIs exist or need to be built for credit management? Specifically: (a) List credit customers with balances, (b) Customer tab orders by phone, (c) Update credit / partial payment clearance, (d) Credit report download with date range | API catalog with paths + payloads + responses | BUG-104 all implementation |
| BQ-104-2 | BUG-104 | Does the existing `GET /api/v2/vendoremployee/paid-in-tab-order-list` endpoint return customer-level aggregated balances, or is it a flat list of tab orders? | Example response shape | BUG-104 main screen data source |
| BQ-104-3 | BUG-104 | For credit clearance (partial payment), what endpoint should POS call to record the payment? What payload is expected? (payment_method, amount, customer phone, etc.) | Endpoint path + payload schema | BUG-104 clearance implementation |

---

## 9. Recommended Next Actions

### If BUG-097 Questions Are Answered

1. **Create implementation planning document** with detailed file-by-file change spec
2. **Implementation sequence:**
   - Session 1: Endpoint constants + service functions + Dispatch button integration
   - Session 2: Rider picker modal component + Assign button integration
   - Session 3: Socket event wiring for rider accept/reject + Reassign flow
   - Session 4: "Delivered" button + button logic correction (delivery staff detection) + QA
3. **Size:** Medium — 3-4 implementation sessions
4. **No owner scope session needed** — scope is fully defined by the delivery flow and API contracts

### If BUG-097 Questions Are NOT Answered

1. **Cannot proceed to implementation planning** for socket events and "Delivered" endpoint
2. **Can partially proceed:** Dispatch button (API #3 is fully documented) and rider picker modal (API #1 endpoint known, response shape unknown but can build basic list UI)
3. **Send BQ-097-1 through BQ-097-6 to backend team** and wait for responses

### If BUG-104 Scope Is Approved (Phase 1/2 Split)

1. **Wait for BQ-104-1 through BQ-104-3** (API documentation)
2. **Once APIs are known:** create implementation planning document with:
   - New route registration in `App.js`
   - New page component `CreditManagementPage.jsx`
   - Sub-components: `CreditCustomerList`, `CreditCustomerDetail`, `CreditBillDetail`, `CreditClearancePanel`
   - New service file `creditService.js`
   - New endpoint constants
3. **Phase 1 estimated size:** Large — 4-6 implementation sessions
4. **Phase 2 estimated size:** Medium — 2-3 additional sessions

### If BUG-104 Needs Owner Scope Session

1. **Run owner scope session** with OQ-104-1 through OQ-104-3
2. **Key decision:** CRM `customer_id` vs mobile-based. Recommend mobile-based for Phase 1 (PAY-008 continuity).
3. **After scope approval:** proceed to API documentation request (BQ-104-1 through BQ-104-3)
4. **After API docs received:** create implementation planning document

---

## 10. Final Status

**bug_097_ready_bug_104_needs_scope_session**

| Metric | BUG-097 | BUG-104 |
|---|---|---|
| Analysis status | Complete | Complete (updated with screenshots) |
| API endpoints known | 5 endpoints documented | 1 existing endpoint, 3-5 unknown |
| Open questions | 4 (backend/API) | 5 (1 owner scope + 4 backend/API) |
| Planning readiness | **ready_with_backend_api_constraints** | **owner_scope_session_needed** |
| Owner questions to clear | 1 (OQ-097-1) | 3 (OQ-104-1, OQ-104-2, OQ-104-3) |
| Backend/API questions to send | 6 (BQ-097-1 through BQ-097-6) | 3 (BQ-104-1 through BQ-104-3) |
| Estimated implementation size | Medium (3-4 sessions) | Large (4-6 sessions Phase 1) |
| Can partially start? | Yes — Dispatch button is fully documented | No — API catalog is prerequisite |
| Code changed | NO | NO |
| `/app/memory/final/` updated | NO | NO |
| Baseline updated | NO | NO |
| QA run | NO | NO |

---

*— POS3.0 BUG-097 + BUG-104 Continuation Planning — 2026-05-20 —*
