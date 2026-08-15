# POS2.0 Wave 1 Owner Approval Plan — 2026-05-17

## 1. Purpose

This document is created **before any code edits** and requires explicit owner approval before implementation begins. Each Wave 1 bug is described in plain English with the exact proposed fix, files to modify, risks, and QA checks.

No code has been changed. No implementation has started.

---

## 2. Repo / Commit

| Field | Value |
|---|---|
| Repo URL | https://github.com/Abhi-mygenie/core-pos-front-end-.git |
| Branch | `17-may-planner` |
| Commit hash | `bc16bc3` |
| Working tree status | Clean (after reset to origin) |
| Clone time (UTC) | 2026-05-17 06:26 |

---

## 3. Inputs Read

**Baseline docs (all 7):**
- `FINAL_DOCS_APPROVAL_STATUS.md`
- `ARCHITECTURE_DECISIONS_FINAL.md`
- `MODULE_DECISIONS_FINAL.md`
- `CHANGE_REQUEST_PLAYBOOK.md`
- `IMPLEMENTATION_AGENT_RULES.md`
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md`
- `BUSINESS_RULES_BASELINE_FINAL.md`

**Overlay docs (all 6):**
- `BASELINE_RECONCILIATION_REPORT_2026_05_04.md`
- `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`
- `PENDING_TASK_REGISTER_2026_05_04.md`
- `PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md`
- `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md`
- `LAST_SPRINT_CODE_FIX_VALIDATION_2026_05_06.md`

**Business rules / reconciliation docs (2):**
- `BUSINESS_RULES_PENDING_FREEZE_ITEMS_2026_05_15.md`
- `BUSINESS_RULES_BUG_RECONCILIATION_REPORT_2026_05_17.md`

**Phase planning docs (all 8):**
- `POS2_0_CLEAN_SAFE_BUG_IMPLEMENTATION_PLAN_2026_05_17.md`
- `POS2_0_OWNER_DECISION_BUG_PLANNING_2026_05_17.md`
- `POS2_0_PHASE_2_OWNER_DECISION_CAPTURE_2026_05_17.md`
- `POS2_0_BACKEND_SOURCE_OF_TRUTH_BUG_PLANNING_2026_05_17.md`
- `POS2_0_PHASE_3_BACKEND_OWNER_QUESTION_CAPTURE_2026_05_17.md`
- `POS2_0_PHASE_3_OPEN_QUESTION_COMPLETION_ADDENDUM_2026_05_17.md`
- `POS2_0_REMAINING_BLOCKED_BUG_PLANNING_2026_05_17.md`

**Master plan docs (2):**
- `POS2_0_MASTER_IMPLEMENTATION_PLAN_2026_05_17.md`
- `POS2_0_MASTER_PLAN_AUDIT_AND_CORRECTION_2026_05_17.md`

**Bug impact analysis:**
- `POS2_0_BUG_IMPACT_ANALYSIS.md`

**Code files inspected:**
- `CollectPaymentPanel.jsx` (L1948-1966 — To Room button)
- `CartPanel.jsx` (L60-80 — customization rendering)
- `TransferFoodModal.jsx` (L1-40 — destination filter)
- `StatusConfigPage.jsx` (L335-345, L755-800 — station toggle)
- `useOrderPollingReconciliation.js` (L1-50 — polling threshold)
- `customerService.js` (L20-50 — CRM lookup error handling)
- `crmAxios.js` (full file — timeout config, error interceptor)
- `OrderCard.jsx` (L405-445, L489-530 — note rendering)
- `orderTransform.js` (L130, L272 — note field mapping)

---

## 4. Wave 1 Bugs Proposed For Implementation

| Bug | Plain English Issue | Proposed Fix | Files To Modify | Risk | Approval Status |
|---|---|---|---|---|---|
| BUG-062 | "To Room" payment button shows for takeaway/delivery orders | Add orderType check so To Room only shows for dineIn/walkIn | `CollectPaymentPanel.jsx` | LOW | pending_owner_approval |
| BUG-073 | Empty customization line appears in cart when item has no size/variants/addons | Add content check before rendering customization wrapper | `CartPanel.jsx` | LOW | pending_owner_approval |
| BUG-066 | Food transfer destination list includes rooms (rooms have orderType=dineIn) | Add `!o.isRoom` exclusion to transfer destination filter | `TransferFoodModal.jsx` | LOW | pending_owner_approval |
| BUG-067 | Station View toggle is clickable even when no stations exist in bootstrap | Disable toggle + show tooltip when availableStations is empty | `StatusConfigPage.jsx` | LOW | pending_owner_approval |
| BUG-079 | Orders take 2 missed polls (~120s) to be removed instead of 1 (~60s) | Change `REMOVAL_MISS_THRESHOLD` from 2 to 1 + update comments | `useOrderPollingReconciliation.js` | LOW | pending_owner_approval |
| BUG-078 | CRM timeout errors are silently swallowed — cashier gets no feedback | Add toast on CRM timeout; distinguish from "not found"; allow manual proceed | `customerService.js` | LOW-MEDIUM | pending_owner_approval |
| BUG-072 | Order card only shows order-level note — item notes visible inside items but table/room notes may be missing | Mirror the order-screen note format: ensure orderNote + item notes are visible on order card | `OrderCard.jsx` | LOW | pending_owner_approval |

---

## 5. Per-Bug Approval Details

---

### BUG-062 — Hide "To Room" Button for Takeaway/Delivery

#### What is wrong in plain English
When a cashier opens the Collect Payment screen for a takeaway or delivery order, the "To Room" transfer button is still visible. This button should only appear for dine-in and walk-in orders since transferring a takeaway/delivery to a room makes no sense.

#### What I will change
Add an `orderType` condition to the To Room button's render gate. Currently it checks `!isRoom && hasRooms && hasPlacedItems`. I will add `&& (orderType === 'dineIn' || orderType === 'walkIn')` so the button only appears for dine-in and walk-in orders.

#### Files I will modify

| File | What will change | Why this file |
|---|---|---|
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | Add orderType condition at L1953 render gate | This is where the To Room button is rendered |

#### Code area / function / component
`CollectPaymentPanel` component, JSX section at line 1953 (To Room button render gate).

#### What I will NOT touch
- Payment logic, payload builders, split bill, room transfer execution logic
- No other buttons in the payment method row
- No changes to the `transferToRoom` handler itself

#### Business rule protected
No frozen business rule conflict. This is a straightforward UI gate addition.

#### Risk
**LOW** — Single condition addition to a render gate. No financial/payload/API impact.

#### QA check after implementation
- Takeaway order → To Room button hidden
- Delivery order → To Room button hidden
- Dine-in order with rooms available → To Room button visible
- Walk-in order with rooms available → To Room button visible
- Room order → To Room button already hidden (existing `!isRoom` gate)

#### Approval needed

Owner approval required before implementation.

Options:
A. Approve this bug for implementation
B. Do not implement this bug
C. Modify the approach
D. Need clarification first

---

### BUG-073 — Empty Customization Wrapper Fix

#### What is wrong in plain English
When an item in the cart has a `customizations` object but it's empty (no size, no variants, no addons), an empty green-colored line still renders below the item name. This looks like a visual glitch.

#### What I will change
Add a content check to the customization render gate at line 65. Currently it checks `item.customizations && !isCancelled`. I will add a sub-check: `(item.customizations.size || item.customizations.variants?.length > 0 || item.customizations.addons?.length > 0)` so the wrapper only renders when there's actual content to show.

#### Files I will modify

| File | What will change | Why this file |
|---|---|---|
| `frontend/src/components/order-entry/CartPanel.jsx` | Add content-presence check at L65 render gate | This is where the customization line renders |

#### Code area / function / component
`CartPanel` component, JSX cart item rendering section, line 65.

#### What I will NOT touch
- The fallback rendering at L73 (existing API orders without `customizations`)
- The order-placed item rendering section at L192 (same pattern exists — should also be checked)
- Cart quantity/price calculations
- Item customization modal logic

#### Business rule protected
No frozen business rule affected. Display-only fix.

#### Risk
**LOW** — Additive render condition. Zero payload/financial impact.

#### QA check after implementation
- Item with size + variants → customization line shows correctly
- Item with only addons → customization line shows correctly
- Item with empty customizations object (no size, no variants, no addons) → no empty line
- Item without customizations property → no line (existing behavior)
- Cancelled item → no customization line (existing behavior)

#### Approval needed

Owner approval required before implementation.

Options:
A. Approve this bug for implementation
B. Do not implement this bug
C. Modify the approach
D. Need clarification first

---

### BUG-066 — Food Transfer Exclude Rooms from Destination List

#### What is wrong in plain English
When a cashier transfers a food item from the order screen, the destination list should only show dine-in tables and walk-in orders. However, room orders have `orderType === 'dineIn'`, which means they pass the current filter and appear as transfer destinations. Rooms should be excluded.

#### What I will change
Add `&& !o.isRoom` to the destination filter at line 19 of `TransferFoodModal.jsx`. This ensures room orders are excluded even though they have `orderType === 'dineIn'`.

#### Files I will modify

| File | What will change | Why this file |
|---|---|---|
| `frontend/src/components/order-entry/TransferFoodModal.jsx` | Add `&& !o.isRoom` to filter at L19 | This is the food transfer destination filter |

#### Code area / function / component
`TransferFoodModal` component, `occupiedOrders` useMemo at line 16-22.

#### What I will NOT touch
- Transfer execution logic (`onTransfer` callback)
- Area grouping logic
- Search/filter UI
- ShiftTableModal or MergeTableModal (separate modals)

#### Business rule protected
No frozen business rule conflict. Preserves room module boundaries (Module 5).

#### Risk
**LOW** — Single condition addition to a filter. No financial/payload impact.

#### QA check after implementation
- Food transfer modal → room orders NOT in destination list
- Food transfer modal → regular dine-in tables still visible
- Food transfer modal → walk-in orders still visible
- Food transfer modal → takeaway/delivery already excluded (existing filter)
- Food transfer modal → prepaid orders already excluded (existing filter)

#### Approval needed

Owner approval required before implementation.

Options:
A. Approve this bug for implementation
B. Do not implement this bug
C. Modify the approach
D. Need clarification first

---

### BUG-067 — Station View Toggle Disabled When No Stations

#### What is wrong in plain English
On the Status Config page, the Station View toggle button is always clickable, even when the restaurant has no stations configured. This confuses operators who enable it and see nothing on the dashboard.

#### What I will change
Disable the Station View toggle button when `availableStations.length === 0`. Add a tooltip or helper text explaining "No stations configured" when disabled. If already enabled and stations become empty, the toggle should auto-revert to disabled on next save.

#### Files I will modify

| File | What will change | Why this file |
|---|---|---|
| `frontend/src/pages/StatusConfigPage.jsx` | Add `disabled` prop to toggle button (L767-780) + tooltip when no stations | This is where the Station View toggle is rendered |

#### Code area / function / component
`StatusConfigPage` component, Station View Configuration section (L755-800), specifically the toggle button at L767-780.

#### What I will NOT touch
- Station data fetching/bootstrap logic
- Station panel rendering on dashboard
- Station context state management
- Other StatusConfigPage sections (statuses, channels, layout)

#### Business rule protected
BOOT-002 (station progress visible) preserved. No frozen rule conflict.

#### Risk
**LOW** — UI-only disable condition. No data flow or payload changes.

#### QA check after implementation
- Restaurant with no stations → toggle disabled + helper text visible
- Restaurant with stations → toggle enabled and clickable
- Enable station view → stations appear on dashboard (existing behavior)
- Disable station view → stations hidden on dashboard (existing behavior)

#### Approval needed

Owner approval required before implementation.

Options:
A. Approve this bug for implementation
B. Do not implement this bug
C. Modify the approach
D. Need clarification first

---

### BUG-079 — Polling Threshold: 1-Miss Removal

#### What is wrong in plain English
When a server removes an order (e.g., it gets paid/cancelled), the polling reconciliation hook currently requires the order to be missing from **two consecutive** polls (~120 seconds) before removing it from the dashboard. The owner wants it removed after **one** missed poll (~60 seconds).

#### What I will change
Change the constant `REMOVAL_MISS_THRESHOLD` from `2` to `1` at line 34 of `useOrderPollingReconciliation.js`. Update the comment at line 13 ("Two consecutive missing polls") to "One missing poll". Update the comment at line 34 ("two consecutive misses") to "one miss".

#### Files I will modify

| File | What will change | Why this file |
|---|---|---|
| `frontend/src/hooks/useOrderPollingReconciliation.js` | Change `REMOVAL_MISS_THRESHOLD = 2` to `1` + update comments at L13, L34 | This is the polling reconciliation hook with the threshold constant |

#### Code area / function / component
`useOrderPollingReconciliation` hook, constants section at line 34, comment at line 13.

#### What I will NOT touch
- Poll interval (stays 60s)
- Hold order protection (fOrderStatus === 9 skip)
- Engaged order skip logic
- Socket event handling
- The fingerprint comparison logic

#### Business rule protected
Frozen POLL-001 (60s silent background poll) and POLL-004 (open-order skip) both preserved. The threshold itself was never frozen — it's in pending-freeze POLL-002.

#### Risk
**LOW** — Single constant change. Owner has accepted the trade-off (faster removal = slightly higher chance of momentary false-positive removal if a server delay causes one missed response, but socket will re-add immediately).

#### QA check after implementation
- Remove order server-side → disappears from dashboard after ~60s (1 poll)
- Order open in Order Entry → not removed by polling (POLL-004 preserved)
- Hold orders (fOrderStatus 9) → not removed by polling
- Socket still primary → orders appear/update in real-time without waiting for poll

#### Approval needed

Owner approval required before implementation.

Options:
A. Approve this bug for implementation
B. Do not implement this bug
C. Modify the approach
D. Need clarification first

---

### BUG-078 — CRM Timeout Error Visibility

#### What is wrong in plain English
When the CRM system times out (15-second timeout configured in `crmAxios.js`), the customer lookup silently fails — the cashier sees no error message and doesn't know why the customer search came back empty. The owner wants a visible toast notification on timeout, with the ability to proceed manually (enter customer details or create new).

#### What I will change
In `customerService.js`, inside the `lookupCustomer` function's catch block (L46-48), detect timeout errors (`error.code === 'ECONNABORTED'`) vs genuine "not found" responses. On timeout: throw a special error or return a sentinel value that the calling component (OrderEntry/CustomerModal) can use to show a toast like "CRM timeout — you can proceed manually or try again". The "not found" path continues to return `null` as before (which already allows the manual/new customer path).

#### Files I will modify

| File | What will change | Why this file |
|---|---|---|
| `frontend/src/api/services/customerService.js` | Add timeout detection in `lookupCustomer` catch block (L46-48) + propagate timeout signal | CRM customer lookup service |

Note: The calling component (e.g., `OrderEntry.jsx` or `CustomerModal.jsx`) may need a small change to handle the timeout signal and show a toast. I will identify the exact caller during implementation and keep changes minimal.

#### Code area / function / component
`customerService.lookupCustomer` function (L40-49). Possibly `CustomerModal.jsx` or `OrderEntry.jsx` for toast display.

#### What I will NOT touch
- CRM timeout value (stays 15s in `crmAxios.js`)
- Other CRM functions (search, create, update, address)
- CRM API key configuration
- Payment flow or order placement

#### Business rule protected
No frozen business rule conflict. Pending-freeze PAY-009 captures this direction.

#### Risk
**LOW-MEDIUM** — Needs to detect error type correctly and propagate to UI. The toast must not block the cashier from proceeding. Risk of misidentifying a network error as timeout — mitigated by checking `error.code`.

#### QA check after implementation
- CRM timeout (simulate slow network) → toast shows "CRM timeout" message
- CRM "not found" (valid phone, no customer) → no toast, null returned, manual entry allowed
- CRM success → customer returned normally
- After timeout toast → cashier can still proceed to enter customer manually or create new
- No retry button (per owner direction)

#### Approval needed

Owner approval required before implementation.

Options:
A. Approve this bug for implementation
B. Do not implement this bug
C. Modify the approach
D. Need clarification first

---

### BUG-072 — Notes Display on Order Card

#### What is wrong in plain English
The order card on the dashboard currently shows the order-level note (`orderNote`) and item-level notes inline in the item list. However, the owner wants the card to mirror the order-screen note display format, ensuring all note types are visible and consistently formatted.

#### What I will change
Verify and enhance note rendering on `OrderCard.jsx`:
1. **Order note** — already displayed at L426-436 (header row 3). Confirm format matches order screen.
2. **Item notes** — already displayed inline at L526-530. Confirm visibility.
3. **Any missing note fields** (table_note, room_note if they exist in the data model) — add if the transform provides them.

The master plan audit correction specifies: "Mirror the existing order-screen note format on the order card." The current code already shows orderNote and item notes. I will verify completeness and add any missing note category. No backend field invention — only display what's already in the transformed order data.

#### Files I will modify

| File | What will change | Why this file |
|---|---|---|
| `frontend/src/components/cards/OrderCard.jsx` | Verify/enhance note rendering to mirror order-screen format | This is the dashboard order card component |

#### Code area / function / component
`OrderCard` component, header section (L425-436 for orderNote) and item rendering section (L526-530 for item notes).

#### What I will NOT touch
- Note editing modals (OrderNotesModal, ItemNotesModal)
- Note fields in orderTransform.js (existing mapping)
- Payment/financial logic on OrderCard
- Other card components (TableCard, DeliveryCard)

#### Business rule protected
No frozen business rule affected. Display-only change.

#### Risk
**LOW** — Additive display lines only. No payload or financial impact.

#### QA check after implementation
- Order with order note → note visible on card header
- Order with item notes → notes visible inline with items
- Order with no notes → no extra empty lines
- Note format on card matches note format on order screen (OrderEntry)

#### Approval needed

Owner approval required before implementation.

Options:
A. Approve this bug for implementation
B. Do not implement this bug
C. Modify the approach
D. Need clarification first

---

## 6. Recommended Implementation Order

1. **BUG-073** — Cart empty customization fix (smallest, self-contained)
2. **BUG-062** — To Room button hide for takeaway/delivery
3. **BUG-066** — Food transfer exclude rooms
4. **BUG-067** — Station toggle disable when no stations
5. **BUG-079** — Polling threshold 1-miss
6. **BUG-078** — CRM timeout toast
7. **BUG-072** — Notes on order card

Rationale: Start with lowest-risk single-line changes, finish with the two bugs that touch more areas (CRM error handling, notes display).

---

## 7. Approval Summary

| Bug | Approval Needed | Owner Decision |
|---|---|---|
| BUG-062 | Yes — To Room hide for takeaway/delivery | |
| BUG-073 | Yes — Empty customization wrapper fix | |
| BUG-066 | Yes — Food transfer exclude rooms | |
| BUG-067 | Yes — Station toggle disable when no stations | |
| BUG-079 | Yes — Polling 1-miss threshold | |
| BUG-078 | Yes — CRM timeout toast visibility | |
| BUG-072 | Yes — Notes display on order card | |

---

## 8. Final Status

`wave_1_owner_approval_plan_created_pending_approval`

- No code was changed
- No files were edited
- No `/app/memory/final/` was updated
- No pending freeze docs were updated
- Only this approval plan document was created
