# POS3.0 Sprint — Bug Impact Analysis (ADDENDUM: BUG-103 through BUG-108)

**Sprint:** pos3.0
**Normalized Sprint Name:** POS3_0
**Addendum Date:** 2026-05-18
**Repo:** https://github.com/Abhi-mygenie/core-pos-front-end-.git
**Branch:** 18-may-pos3.0
**Addendum Scope:** 6 new bugs (BUG-103 through BUG-108) added to BUG_TEMPLATE.md by owner

---

## Docs Read (Same Baseline as Main Analysis)
All final docs, overlay docs, POS2.0 closure docs, POS3.0 requirement docs — same reading order as the main analysis document.

## Baseline Conflicts Found
None.

---

# BUG-103 Impact Analysis

## Source
Intake Bug: /app/memory/BUG_TEMPLATE.md (lines 7394–7450)
Sprint: pos3.0
Evidence Folder: No separate evidence folder found
Final Docs Folder: /app/memory/final
Google Sheet Status Before Analysis: Not provided

## User Reported Issue
The "Cash Received" number input field on the Collect Payment screen shows native browser up/down arrow buttons (spinner). These need to be removed. Likely applies to other number inputs across the POS.

## Evidence Reviewed
- Intake entry in BUG_TEMPLATE.md
- Owner screenshot reference (Collect Payment screen with visible spinner)
- Code: CollectPaymentPanel.jsx — all `type="number"` inputs inspected

## Module Mapping
Primary Module: Order Entry / Cart / Payment Workflow (Module 4)
Downstream Impacted Modules: None
Module decision reference: MODULE_DECISIONS_FINAL.md §4 (Order Entry)

## Affected Route / Page
`/dashboard` — embedded in Collect Payment Panel

## Affected Screen / Flow
Collect Payment → Cash selected → "Cash Received" input → visible ▲▼ spinner buttons

## Affected Code Areas

| File | Reason |
| --- | --- |
| `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` L2249-2260 | Cash Received input — `type="number"` WITHOUT spinner-hiding CSS |
| `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` L943 | Discount input — `type="number"` WITHOUT spinner-hiding CSS |
| `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` L1056 | Wallet amount input — WITHOUT spinner-hiding CSS |
| `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` L1107 | Tip input — WITH spinner-hiding CSS (already fixed) |
| `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` L1138 | Delivery charge input — WITH spinner-hiding CSS (already fixed) |
| `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` L1409 | Compact discount input — WITHOUT spinner-hiding CSS |
| `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` L1490 | Compact wallet input — WITHOUT spinner-hiding CSS |
| `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` L2080 | Split payment amount input — WITHOUT spinner-hiding CSS |
| `/app/frontend/src/index.css` or `/app/frontend/src/App.css` | No global spinner-hiding rule exists |

## API Review
No direct API involvement found.

## Socket / Realtime Review
No direct socket involvement found.

## State / Data Flow
Pure CSS/styling issue — no data flow impact.

## Relevant Final Documentation
None specifically — this is a UI polish issue.

## Current Code Behavior
**Inconsistent spinner hiding across `type="number"` inputs:**
- **With** spinner-hiding CSS (Tailwind utility classes): Tip input (L1117), Delivery charge input (L1168) — these have `[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`
- **Without** spinner-hiding CSS: Cash Received (L2250), Discount (L943), Wallet (L1056), Compact discount (L1409), Compact wallet (L1490), Split payment (L2080)

The fix was partially applied to some inputs (tip, delivery charge) but not consistently to all number inputs.

## Expected Behavior
All `type="number"` inputs across POS should hide native browser spinner buttons. Clean input appearance.

## Root Cause Hypothesis
**Confirmed:** Inconsistent application of spinner-hiding CSS. Some inputs have the Tailwind utility classes, others don't. Best fix: either add the classes to all number inputs individually, or add a global CSS rule in `index.css` targeting `input[type=number]`.

Label: **frontend mapping issue** (CSS inconsistency)

## Regression Risk Areas
- None — pure CSS change, no behavioral impact
- Verify number inputs still accept numeric keyboard input correctly

## Docs / Code Mismatch
No mismatch.

## Open Questions / Missing Information
None — root cause is clear. Two implementation options:
1. **Global CSS rule** in `index.css` — one-time fix for all number inputs
2. **Per-input Tailwind classes** — matches existing pattern on tip/delivery inputs

## User Interaction Required
Not required

## Analysis Verdict
Frontend bug (CSS inconsistency)

## Analysis Outcome
Analysis Complete

## Ready For Next Stage?
Yes

## Next Step
Bug Implementation Planning Agent. Recommended: global CSS rule for simplicity and consistency.

---

# BUG-104 Impact Analysis

## Source
Intake Bug: /app/memory/BUG_TEMPLATE.md (lines 7453–7508)
Sprint: pos3.0
Evidence Folder: No separate evidence folder found
Final Docs Folder: /app/memory/final
Google Sheet Status Before Analysis: Not provided

## User Reported Issue
The complete Credit / Tab Management module is not implemented in the current POS. This is a new module CR that needs to be built. Full scope, screens, flows, and API requirements to be discussed during impact analysis.

## Evidence Reviewed
- Intake entry in BUG_TEMPLATE.md
- Code: CollectPaymentPanel.jsx L375-376 — `isTabPayment` existing logic (tab = credit payment method)
- Code: constants.js L71 — `REPORT_CREDIT_ORDERS: '/api/v2/vendoremployee/paid-in-tab-order-list'` (credit orders report endpoint exists)
- Code: CollectPaymentPanel.jsx — credit/tab settlement exists within Collect Bill flow (`payment_status: 'success'`, customer name + mobile sent)
- BUSINESS_RULES_BASELINE_FINAL.md PAY-008: "TAB / Credit settlement sends customer name + mobile only; no `customer_id` is sent. The mobile number is the unique key."

## Module Mapping
Primary Module: **New Module — Credit / Tab Management** (does not exist in MODULE_DECISIONS_FINAL.md)
Downstream Impacted Modules: Order Entry / Payment (Module 4), Dashboard (Module 3), Reports (Module 10), Customer / CRM (Module 6)
Module decision reference: No existing module — this is a new module CR

## Affected Route / Page
New route needed (e.g., `/credit-management` or embedded panel in dashboard)

## Affected Screen / Flow
**Existing tab/credit behavior (partial):**
1. Collect Bill → select "Credit" / "Tab" payment → enter customer name + mobile → settle order
2. Credit Orders Report → view tab/credit orders list
3. No dedicated management module for: viewing outstanding credit, settling individual tabs, customer credit history, credit limits, bulk settlement

**Expected new module (scope TBD by owner):**
- View all open credit/tab balances per customer
- Settle individual or multiple tabs
- Customer credit history
- Credit limits management
- Credit aging / overdue tracking
- Integration with CRM customer records

## Affected Code Areas

| File | Reason |
| --- | --- |
| New files needed | Entire module — pages, components, services, transforms |
| `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` | Existing tab/credit payment flow — may need enhancement |
| `/app/frontend/src/api/constants.js` L71 | Existing credit report endpoint |
| `/app/frontend/src/api/services/reportService.js` | Credit orders report service — may need enhancement |
| `/app/frontend/src/App.js` | New route registration |
| `/app/frontend/src/components/layout/Sidebar.jsx` | New sidebar entry |

## API Review
- Existing: `GET /api/v2/vendoremployee/paid-in-tab-order-list` — credit orders list
- New APIs needed (unknown): credit balance per customer, settle tab, credit history, credit limits
- **BLOCKED:** Full API documentation needed from backend

## Socket / Realtime Review
- May need socket events for real-time credit balance updates
- Unknown scope — depends on module design

## State / Data Flow
Entirely new state management needed. May require a new Context or leverage existing OrderContext + CustomerContext.

## Relevant Final Documentation
- BUSINESS_RULES_BASELINE_FINAL.md PAY-008: TAB/Credit settlement rules (customer name + mobile, no customer_id)
- MODULE_DECISIONS_FINAL.md: No existing module for credit management
- ARCHITECTURE_DECISIONS_FINAL.md Rule FA-04: Only routed pages and explicit runtime panels count as implemented modules

## Current Code Behavior
- Tab/credit payment exists as a payment METHOD within Collect Bill (not a standalone module)
- Credit orders report exists for viewing tab orders
- No management/settlement/history module exists

## Expected Behavior
A complete Credit / Tab Management module — full scope to be defined with owner.

## Root Cause Hypothesis
Not a bug — this is a **new module Change Request**. The existing tab/credit payment method works correctly; this CR adds a management layer on top.

Label: **N/A — New Module CR**

## Regression Risk Areas
- Existing tab/credit payment flow (must not break)
- Credit orders report (must not break)
- Payment payload shape for tab orders
- Customer/CRM linkage

## Docs / Code Mismatch
No mismatch.

## Open Questions / Missing Information
1. **BLOCKING:** What screens/flows does the owner envision?
2. **BLOCKING:** What backend APIs exist or need to be built?
3. Should this integrate with CRM (BUG-108 coupon/loyalty/wallet)?
4. Credit limits — per-customer or per-restaurant?
5. Settlement — individual or bulk?
6. Reporting — separate credit report or extend existing?

## User Interaction Required
Required — Owner must define full module scope, screens, flows, and API requirements.

## Analysis Verdict
N/A — New Module CR (not a bug)

## Analysis Outcome
Analysis Complete with Clarification Required

## Ready For Next Stage?
No

## Next Step
Owner clarification first — full module scope definition needed before implementation planning.

---

# BUG-105 Impact Analysis

## Source
Intake Bug: /app/memory/BUG_TEMPLATE.md (lines 7511–7566)
Sprint: pos3.0
Evidence Folder: No separate evidence folder found
Final Docs Folder: /app/memory/final
Google Sheet Status Before Analysis: Not provided

## User Reported Issue
The complete Settlement module is not implemented in the current POS. This is a new module CR that needs to be built. Full scope to be discussed during impact analysis.

## Evidence Reviewed
- Intake entry in BUG_TEMPLATE.md
- Code: reportService.js L387 — "DAILY SALES REPORT (For Order Summary & TAB Settlement Stats)" — partial settlement data in reports
- Code: FilterBar.jsx L302 — "TAB Settlement - Removed as per user request" — some settlement UI was previously removed
- Code: No dedicated settlement page/route exists in App.js

## Module Mapping
Primary Module: **New Module — Settlement** (does not exist in MODULE_DECISIONS_FINAL.md)
Downstream Impacted Modules: Reports (Module 10), Dashboard (Module 3), Auth/Session (Module 1 — shift-based auth)
Module decision reference: No existing module — this is a new module CR

## Affected Route / Page
New route needed (e.g., `/settlement`)

## Affected Screen / Flow
**Existing settlement-related behavior (minimal):**
1. Daily Sales Report has some settlement statistics
2. TAB Settlement section was previously removed from FilterBar
3. No dedicated end-of-day or shift-based settlement flow

**Expected new module (scope TBD by owner):**
- End-of-day or shift-based cash reconciliation
- Payment method breakdown (cash, card, UPI, tab, etc.)
- Expected vs actual cash count
- Shift open/close workflow
- Settlement report generation
- Discrepancy tracking

## Affected Code Areas

| File | Reason |
| --- | --- |
| New files needed | Entire module — pages, components, services |
| `/app/frontend/src/App.js` | New route registration |
| `/app/frontend/src/components/layout/Sidebar.jsx` | New sidebar entry |
| `/app/frontend/src/api/services/reportService.js` | May need enhancement for settlement data |
| `/app/frontend/src/api/constants.js` | New endpoint constants |

## API Review
- Existing: Daily Sales Report API has some payment breakdown data
- New APIs needed (unknown): shift open/close, cash count submission, settlement summary, discrepancy report
- **BLOCKED:** Full API documentation needed from backend

## Socket / Realtime Review
Unknown scope — may need real-time shift status updates.

## State / Data Flow
Entirely new state management needed. May be page-local (like reports) or require a new Context for shift state.

## Relevant Final Documentation
- MODULE_DECISIONS_FINAL.md §10: Reports module — settlement data partially overlaps
- ARCHITECTURE_DECISIONS_FINAL.md Rule MC-06: Report aggregation belongs to backend APIs

## Current Code Behavior
No settlement module exists. Some settlement statistics appear in the Daily Sales Report.

## Expected Behavior
A complete Settlement module — full scope to be defined with owner.

## Root Cause Hypothesis
Not a bug — this is a **new module Change Request**.

Label: **N/A — New Module CR**

## Regression Risk Areas
- Daily Sales Report (must not break existing settlement stats)
- Shift/auth management (if shift-based settlement is implemented)

## Docs / Code Mismatch
No mismatch.

## Open Questions / Missing Information
1. **BLOCKING:** What screens/flows does the owner envision?
2. **BLOCKING:** What backend APIs exist or need to be built?
3. Is this shift-based or end-of-day-based?
4. Who can perform settlement (role/permission)?
5. Should settlement lock further orders until next shift opens?

## User Interaction Required
Required — Owner must define full module scope.

## Analysis Verdict
N/A — New Module CR (not a bug)

## Analysis Outcome
Analysis Complete with Clarification Required

## Ready For Next Stage?
No

## Next Step
Owner clarification first — full module scope definition needed.

---

# BUG-106 Impact Analysis

## Source
Intake Bug: /app/memory/BUG_TEMPLATE.md (lines 7569–7625)
Sprint: pos3.0
Evidence Folder: No separate evidence folder found
Final Docs Folder: /app/memory/final
Google Sheet Status Before Analysis: Not provided

## User Reported Issue
The CRM has item-level notes and order-level notes associated with customers, but the POS does not pull or display these notes. When a customer is selected, relevant notes should be visible to the cashier.

## Evidence Reviewed
- Intake entry in BUG_TEMPLATE.md
- Code: customerService.js — no notes-related API functions exist
- Code: CRM API endpoints in constants.js — no notes endpoint defined
- Code: OrderEntry.jsx — customer selection flow exists but no notes display

## Module Mapping
Primary Module: Customer / CRM Integration (Module 6)
Downstream Impacted Modules: Order Entry (Module 4), Rooms / Room Check-In (Module 5)
Module decision reference: MODULE_DECISIONS_FINAL.md §6 (CRM)

## Affected Route / Page
`/dashboard` — embedded in Order Entry customer panel

## Affected Screen / Flow
1. Customer selected from CRM search (order entry or room check-in)
2. Currently: name, phone, email displayed
3. Target: Also display item-level notes (e.g., "no onion") and order-level notes (e.g., "VIP — comp dessert")

## Affected Code Areas

| File | Reason |
| --- | --- |
| `/app/frontend/src/api/services/customerService.js` | Needs new API function to fetch CRM notes |
| `/app/frontend/src/api/constants.js` | Needs new CRM notes endpoint |
| `/app/frontend/src/components/order-entry/OrderEntry.jsx` | Needs notes display after customer selection |
| `/app/frontend/src/components/modals/RoomCheckInModal.jsx` | May need notes display for room check-in |
| New component (e.g., `CustomerNotesPanel.jsx`) | Display widget for CRM notes |

## API Review
- **BLOCKED:** CRM notes API endpoint unknown
- Need: endpoint path, request format, response shape
- Notes may come from customer detail endpoint or a separate endpoint

## Socket / Realtime Review
No direct socket involvement found.

## State / Data Flow
Customer selection → CRM notes API call → notes data stored in component state → displayed in UI panel/widget

## Relevant Final Documentation
- MODULE_DECISIONS_FINAL.md §6: CRM module
- OPEN_QUESTIONS_FINAL_RESOLUTION.md OQ-06: CRM required by default

## Current Code Behavior
No CRM notes integration exists. `customerService.js` has search, lookup, create, update, address functions — no notes function.

## Expected Behavior
When a customer is selected, item-level and order-level notes from CRM are fetched and displayed to the cashier during order entry.

## Root Cause Hypothesis
Not a bug — this is a **new CRM integration CR**. The CRM notes API is not integrated.

Label: **N/A — New Feature CR (CRM integration)**

## Regression Risk Areas
- Customer selection flow (must not slow down or break)
- Order entry performance (additional API call)

## Docs / Code Mismatch
No mismatch.

## Open Questions / Missing Information
1. **BLOCKING:** What is the CRM API endpoint for notes?
2. **BLOCKING:** What is the response shape (item-level vs order-level structure)?
3. Where in the UI should notes appear (sidebar, popup, inline)?
4. Read-only or editable from POS?

## User Interaction Required
Required — CRM API endpoint and UI placement needed.

## Analysis Verdict
N/A — New Feature CR (CRM integration)

## Analysis Outcome
Analysis Complete with Clarification Required

## Ready For Next Stage?
No

## Next Step
Owner clarification first — CRM API details and UI design needed. Should be analyzed together with BUG-107 (same CRM data layer).

---

# BUG-107 Impact Analysis

## Source
Intake Bug: /app/memory/BUG_TEMPLATE.md (lines 7628–7692)
Sprint: pos3.0
Evidence Folder: No separate evidence folder found
Final Docs Folder: /app/memory/final
Google Sheet Status Before Analysis: Not provided

## User Reported Issue
The POS should display cross-selling and upselling information from CRM when a customer is selected: top 5 favorites, last order, visit history, frequency, and behavioral insights.

## Evidence Reviewed
- Intake entry in BUG_TEMPLATE.md
- Code: customerService.js — no favorites/insights/history API functions
- Code: CRM endpoints in constants.js — no insights endpoint defined

## Module Mapping
Primary Module: Customer / CRM Integration (Module 6)
Downstream Impacted Modules: Order Entry (Module 4), Menu (Module 12)
Module decision reference: MODULE_DECISIONS_FINAL.md §6 (CRM)

## Affected Route / Page
`/dashboard` — embedded in Order Entry customer panel

## Affected Screen / Flow
1. Customer selected from CRM
2. POS displays: top 5 favorites, last order details, last visit date, visit frequency
3. Staff uses this for personalized recommendations
4. Optional: favorite items are one-tap addable to cart

## Affected Code Areas

| File | Reason |
| --- | --- |
| `/app/frontend/src/api/services/customerService.js` | Needs new API functions for insights/history |
| `/app/frontend/src/api/constants.js` | Needs new CRM insights endpoints |
| `/app/frontend/src/components/order-entry/OrderEntry.jsx` | Needs insights display panel |
| New component (e.g., `CustomerInsightsPanel.jsx`) | Display widget for favorites, history, etc. |

## API Review
- **BLOCKED:** CRM insights API endpoints unknown
- Need: customer behavior data endpoints, response shapes
- May require multiple API calls (favorites, order history, visit stats)

## Socket / Realtime Review
No direct socket involvement found.

## State / Data Flow
Customer selection → CRM insights API call(s) → insights data → displayed in new UI panel → optional: favorite item tap → add to cart

## Relevant Final Documentation
- MODULE_DECISIONS_FINAL.md §6: CRM module

## Current Code Behavior
No CRM insights/favorites/history integration exists.

## Expected Behavior
Customer insights panel showing favorites, last order, visit history when a customer is selected from CRM.

## Root Cause Hypothesis
Not a bug — this is a **new CRM feature CR**. No integration exists.

Label: **N/A — New Feature CR (CRM intelligence)**

## Regression Risk Areas
- Customer selection flow performance
- Order entry UI real estate (new panel must not crowd existing UI)

## Docs / Code Mismatch
No mismatch.

## Open Questions / Missing Information
1. **BLOCKING:** What CRM API endpoints provide customer behavior data?
2. **BLOCKING:** What specific data points are available?
3. Where in the UI should this be shown?
4. Should favorite items be one-tap addable to cart?

## User Interaction Required
Required — CRM API capabilities and UI design needed. Analyze together with BUG-106.

## Analysis Verdict
N/A — New Feature CR (CRM intelligence)

## Analysis Outcome
Analysis Complete with Clarification Required

## Ready For Next Stage?
No

## Next Step
Owner clarification first — CRM API capabilities and UI design. Analyze with BUG-106 as a CRM integration cluster.

---

# BUG-108 Impact Analysis

## Source
Intake Bug: /app/memory/BUG_TEMPLATE.md (lines 7695–7758)
Sprint: pos3.0
Evidence Folder: No separate evidence folder found
Final Docs Folder: /app/memory/final
Google Sheet Status Before Analysis: Not provided

## User Reported Issue
The POS does not integrate with CRM for coupon codes, loyalty points, or wallet balance. These three features need real CRM API integration within the Collect Payment flow.

## Evidence Reviewed
- Intake entry in BUG_TEMPLATE.md
- Code: CollectPaymentPanel.jsx — **UI elements already exist but use local/mock data:**
  - L249-250: `useLoyalty`, `useWallet` state toggles
  - L253-254: `couponCode`, `couponError` state
  - L502-506: `loyaltyDiscount` calculation from `customer.loyaltyPoints`
  - L513-516: `walletDiscount` calculation from `customer.walletBalance`
  - L641-662: Coupon validation against `customer.coupons` and `generalCoupons` (local data)
  - L717-723: Coupon/loyalty/wallet values in payment payload
  - L765: `discount_amount` groups non-loyalty/non-wallet discounts
  - L1017-1027, L1044-1064: Loyalty/wallet toggle UI with balance display
- Code: customerService.js — no coupon/loyalty/wallet API functions
- Note: BUG-015 previously gated these UI elements behind feature flags

## Module Mapping
Primary Module: Order Entry / Cart / Payment Workflow (Module 4) + Customer / CRM (Module 6)
Downstream Impacted Modules: Dashboard (Module 3), Reports (Module 10)
Module decision reference: MODULE_DECISIONS_FINAL.md §4 (Order Entry), §6 (CRM)

## Affected Route / Page
`/dashboard` — embedded in Collect Payment Panel

## Affected Screen / Flow
**Existing (local/mock):**
1. Collect Bill → Loyalty toggle exists (uses `customer.loyaltyPoints` — local data)
2. Collect Bill → Wallet toggle exists (uses `customer.walletBalance` — local data)
3. Collect Bill → Coupon input exists (validates against local `customer.coupons` array)
4. These values flow into payment payload but are NOT backed by real CRM API calls

**Target (CRM-integrated):**
1. Customer selected → fetch real loyalty balance from CRM API
2. Customer selected → fetch real wallet balance from CRM API
3. Coupon entered → validate against CRM API (not local array)
4. After payment → deduct loyalty points via CRM API
5. After payment → debit wallet via CRM API
6. After payment → mark coupon as used via CRM API

## Affected Code Areas

| File | Reason |
| --- | --- |
| `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` L249-254, L502-517, L641-662, L717-723, L1017-1064 | Existing UI + local logic — needs CRM API backing |
| `/app/frontend/src/api/services/customerService.js` | Needs new functions: fetchLoyaltyBalance, fetchWalletBalance, validateCoupon, redeemLoyalty, debitWallet, useCoupon |
| `/app/frontend/src/api/constants.js` | Needs new CRM endpoint constants |
| `/app/frontend/src/api/crmAxios.js` | CRM API layer — already set up |
| `/app/frontend/src/api/transforms/orderTransform.js` L717-723 | Payment payload already includes coupon/loyalty/wallet fields — may need adjustment for CRM response format |

## API Review
- **BLOCKING:** CRM API endpoints unknown for:
  - Coupon validation: `POST /pos/validate-coupon` or similar
  - Loyalty balance: `GET /pos/customers/{id}/loyalty` or similar
  - Wallet balance: `GET /pos/customers/{id}/wallet` or similar
  - Loyalty redemption: `POST /pos/customers/{id}/redeem-loyalty` or similar
  - Wallet debit: `POST /pos/customers/{id}/debit-wallet` or similar
  - Coupon usage: `POST /pos/mark-coupon-used` or similar
- Existing payment payload already has fields for `couponDiscount`, `couponTitle`, `couponType`, `loyaltyPoints`, `walletBalance` — these just need real CRM data instead of local data

## Socket / Realtime Review
No direct socket involvement found.

## State / Data Flow
Current: Customer selected → local `customer.loyaltyPoints` / `customer.walletBalance` / `customer.coupons` used (mock/incomplete data)
Target: Customer selected → CRM API calls for real balances → UI displays real data → payment deducts via CRM API

## Relevant Final Documentation
- MODULE_DECISIONS_FINAL.md §4: Order Entry — financial rule changes require caution
- MODULE_DECISIONS_FINAL.md §6: CRM module
- BUSINESS_RULES_BASELINE_FINAL.md: No rules for coupon/loyalty/wallet (not yet baselined)

## Current Code Behavior
UI exists and is functional with local/mock data:
- Loyalty: toggle on → `customer.loyaltyPoints` used as discount cap → deducted from bill
- Wallet: toggle on → `customer.walletBalance` used as discount cap → deducted from bill
- Coupon: code entered → validated against local `customer.coupons` array → discount applied
- All values flow into payment payload correctly
- **But none of these call real CRM APIs** — they rely on whatever `customer` object contains from the initial customer fetch

## Expected Behavior
- Real CRM API integration for coupon validation, loyalty balance, wallet balance
- Real-time balance fetching when customer is selected
- Post-payment deduction/marking via CRM API
- Error handling for insufficient balance, invalid coupon, API failure

## Root Cause Hypothesis
Not a bug — this is a **new CRM payment integration CR**. The UI scaffolding exists but is not backed by real CRM APIs. The existing local logic is a placeholder.

Label: **N/A — New Feature CR (CRM payment integration)**

## Regression Risk Areas
- **HIGH:** Existing bill calculation (coupon/loyalty/wallet already factor into totals)
- **HIGH:** Payment payload shape (already includes these fields)
- **HIGH:** Split payment interaction with coupon/loyalty/wallet
- Existing discount logic (manual + preset + coupon — mutual exclusivity rules)
- Feature flag state (BUG-015 gated these UI elements)

## Docs / Code Mismatch
No mismatch — the existing placeholder logic is intentional.

## Open Questions / Missing Information
1. **BLOCKING:** What are the CRM API endpoints for coupon/loyalty/wallet?
2. **BLOCKING:** Request/response payload shapes?
3. Can multiple discounts combine (e.g., coupon + loyalty + wallet)?
4. How does coupon discount interact with existing discount logic (manual/preset)?
5. Should redemption happen at place-order or collect-bill time?
6. Related to BUG-015 — should feature flags be removed or kept as toggles?

## User Interaction Required
Required — CRM API documentation needed for all three integrations.

## Analysis Verdict
N/A — New Feature CR (CRM payment integration)

## Analysis Outcome
Analysis Complete with Clarification Required

## Ready For Next Stage?
No

## Next Step
Owner clarification first — CRM API endpoints and payment combination rules. Related to BUG-106/107 — all share the CRM API layer and should be planned together.

---

# Updated Cross-Bug Summary (All 22 Bugs)

## Bug vs CR Classification

### BUGS (Fixes to existing behavior) — Bug Fix Sprint

| # | Bug ID | Title | Priority | Owner | Ready? |
|---|---|---|---|---|---|
| 1 | BUG-087 | PayLater PAID Badge Shows Incorrectly | P0 | Joint | No — backend contract |
| 2 | BUG-088 | Room Transfer v2 Endpoint + Socket Migration | P1 | Joint | No — backend confirmation |
| 3 | BUG-089 | Eliminate Redundant API Calls on update-food-status | P1 | Frontend | **Yes** |
| 4 | BUG-090 | CRM customer_id Not Stored on Room Orders | P2 | Backend | No — backend confirmation |
| 5 | BUG-091 | CRM Search API Returns Duplicate Entries | P2 | Backend | **Yes** |
| 6 | BUG-092 | Phone Format Contract Undefined for Room Check-In | P2 | Backend | No — backend clarification |
| 7 | BUG-093 | Room Check-In Date Missing in API Response | P3 | Backend | **Yes** |
| 8 | BUG-094 | Delivery-Assign-Order Socket Missing Payload | P3 | Joint | No — backend confirmation |
| 9 | BUG-095 | Socket Handler + Dead Code Cleanup | P2 | Frontend | **Yes** (blocked by 088+089) |
| 10 | BUG-100 | Remove Duplicate Local Toast Notifications | P1 | Frontend | **Yes** |
| 11 | BUG-101 | Print Template GST Display Slot | P3 | Backend | No — backend verification |
| 12 | BUG-102 | Mark Served/Ready Button Disabled 20-30s | P0 | Frontend | **Yes** |
| 13 | BUG-103 | Remove Up/Down Arrow from Number Inputs | P2 | Frontend | **Yes** |

**Total Bugs: 13**
**Ready for implementation: 7**
**Blocked on backend: 6**

---

### CHANGE REQUESTS (New features / modules / enhancements) — CR Sprint

| # | Bug ID | Title | Priority | Owner | Ready? | Size |
|---|---|---|---|---|---|---|
| 1 | BUG-096 | Realtime FE Updates for Menu + Hold/Unpaid Orders | P1 | Frontend | No — awaiting event names | Medium |
| 2 | BUG-097 | Delivery Dispatch + Assign Delivery Boy | P1 | Frontend | No — awaiting API docs | Medium |
| 3 | BUG-098 | Use Restaurant Profile CRM Key Instead of Env | P1 | Joint | No — backend confirmation | Small |
| 4 | BUG-099 | QSR / Cafe Quick Billing UX Optimization | P1 | Frontend | **Yes** | Large |
| 5 | BUG-104 | Credit / Tab Management Module | P1 | Joint | No — scope TBD | **XL (New Module)** |
| 6 | BUG-105 | Settlement Module | P1 | Joint | No — scope TBD | **XL (New Module)** |
| 7 | BUG-106 | CRM Notes Integration | P2 | Joint | No — API TBD | Medium |
| 8 | BUG-107 | CRM Cross-Sell / Upsell Insights | P2 | Joint | No — API TBD | Medium |
| 9 | BUG-108 | CRM Coupon / Loyalty / Wallet Integration | P1 | Joint | No — API TBD | Large |

**Total CRs: 9**
**Ready for implementation: 1** (BUG-099)
**Blocked on owner/backend: 8**

---

## Recommended Sprint Planning

### Bug Fix Sprint (Priority Order)

| Bucket | Bugs | Action |
|---|---|---|
| **Bucket A: FE Quick Wins (Ship Now)** | BUG-102 (P0), BUG-089 (P1), BUG-100 (P1), BUG-103 (P2) | No dependencies — implement immediately |
| **Bucket B: Backend-Blocked Critical** | BUG-087 (P0), BUG-088 (P1) | Send questions to backend NOW; implement after response |
| **Bucket C: Backend-Blocked Normal** | BUG-090, BUG-091, BUG-092, BUG-093, BUG-094, BUG-101 | Backend team handles or clarifies |
| **Bucket D: Sequential Cleanup** | BUG-095 (P2) | After BUG-088 + BUG-089 land |

### CR Sprint (Priority Order)

| Bucket | CRs | Action |
|---|---|---|
| **Bucket E: Ready CRs** | BUG-099 (P1, QSR billing) | Can start UX analysis immediately |
| **Bucket F: Awaiting Docs** | BUG-096, BUG-097, BUG-098 | Owner/backend documentation needed |
| **Bucket G: CRM Integration Cluster** | BUG-106, BUG-107, BUG-108 | All need CRM API docs — plan together |
| **Bucket H: New Modules (XL)** | BUG-104, BUG-105 | Owner scope definition sessions needed first |

---

## Confirmation

- **No code was changed.** Analysis-only.
- **`/app/memory/final/` was not updated.**
- **`/app/memory/BUG_TEMPLATE.md` was replaced** with owner-uploaded version (added BUG-103 through BUG-108).
- Files created/updated:
  - `/app/memory/bugs/POS3_0_BUG_IMPACT_ANALYSIS_ADDENDUM.md` (this file)
  - Original analysis: `/app/memory/bugs/POS3_0_BUG_IMPACT_ANALYSIS.md` (unchanged)

---

*— POS3.0 Bug Impact Analysis Addendum — 2026-05-18 —*
