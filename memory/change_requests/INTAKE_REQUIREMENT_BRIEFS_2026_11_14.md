# Intake Requirement Briefs — 2026-11-14

Open intake items: **112**. Each brief = registry record + full requirement text from the intake doc + open questions.
Items marked **REQUIREMENT NOT CAPTURED** have no intake doc — owner must describe the requirement.

Draft batch order: A → B (sequential, shared payment/cancel hotspots) · D after A · C, E, F, G, H parallel · I tracking-only.

---

# BATCH A — Cancellation, Complimentary & Permissions (14 items)

## CR-493 — Cancellation Reason Mandatory on Every Cancellation (Order + Item Level)

- Type: CR · Area: Menu / Order Entry · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE — 3 ODs open. Next: PLANNING Gate 2-3.
- Registry notes: Every cancel must require reason from backend reasons list. CANCELLATION_REASONS endpoint exists, used in insights, enforcement inconsistent. Related: BUG-440 (empty reasons dropdown). Dependency: CR-494 extends this. PRIORITY UPGRADED P1→P0 (2026-11-12, batch intake).
- Intake doc: `change_requests/17_CR-493_CANCELLATION_REASON_MANDATORY_INTAKE.md`
- **Classification:** CR
- **Severity:** P1 — HIGH (accountability: cancellations without reasons can't be audited)
- **Risk:** HIGH (touches order cancel flow, reports, printing — R5 hotspot)

### Description

When an order or item is cancelled, the staff should be REQUIRED to select a cancellation reason from the backend-provided reasons list (`/api/v1/vendoremployee/cancellation-reasons`). Currently, the cancellation flow may allow cancellation without selecting a reason, or the reason selection is not enforced consistently across all cancel paths (order cancel, item cancel, after-serve cancel).

**Expected behavior:** Every cancellation (order-level and item-level) must require a reason selection from the dropdown before the cancel action can proceed. The reason should be sent in the API payload and visible in reports.

**Current behavior:** Cancellation reasons API exists and is consumed in insights/reports, but enforcement at the point of cancellation may be inconsistent. BUG-440 (Cancel Dialog Reasons Empty) suggests the reasons dropdown was empty in some flows.

---

### Evidence

- **Source:** OWNER-REPORTED
- **Steps to reproduce:** Cancel an order or item → check if reason is mandatory
- **Confidence:** SUSPECTED (cancellation_reasons API exists at `constants.js:111`, used in insights but enforcement at cancel point needs verification)

---

### Blast Radius

- `cancelOrder` / `cancel` referenced in ~40+ lines across ~8 files
- Hotspot files touched: YES — `DashboardPage.jsx` (cancel handler), `OrderEntry.jsx`, `orderTransform.js` (R5)
- Estimated scope: MEDIUM (3-5 files, ~20-30 lines)

---

### Open Questions

- **OD-493-01:** Should the reason be mandatory for BOTH order-level and item-level cancellations, or only order-level?
- **OD-493-02:** Should the reason dropdown also allow a free-text "Other" option with a notes field?
- **OD-493-03:** Is this related to BUG-440 (empty reasons dropdown)? Should BUG-440 be fixed as a prerequisite?

## BUG-674 — Order-Level Cancellation Dialog Missing Notes / Additional Notes Field

- Type: BUG · Area: Menu / Order Entry · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: Order-level cancel dialog has no notes field. Audit gap. Add notes field to dialog and API payload.
- Intake doc: `change_requests/03_BUG-674_ORDER_LEVEL_CANCEL_DIALOG_MISSING_NOTES_INTAKE.md`

### 1. Description

The **order-level cancellation dialog** is missing an "Additional Notes" free-text field. When cancelling an entire order, only a Cancellation Reason dropdown appears — there is no way to record a free-text note explaining the cancellation.

**Previous misclassification:** On first intake (2026-11-12 session 1), this item was incorrectly logged as an "observation that notes already exist." Owner has now confirmed: **order-level cancel dialog does NOT have a notes field.**

**Current behaviour:** Order-level cancel dialog = Cancellation Reason dropdown only. No notes/free-text field.

**Expected behaviour:** Order-level cancel dialog should include an "Additional Notes" (free-text) field, identical to the notes field visible in the item-level cancel dialog.

---

### 4. Evidence

- **Source:** OWNER-REPORTED + clarified on 2026-11-12 (second pass)
- **Screenshot:** provided — order-level cancel dialog shows Reason dropdown + "Additional Notes (Optional)" area in screenshot — wait, the screenshot may show item-level. Owner confirmed order-level is MISSING notes.
- **Confidence:** CONFIRMED by owner

---

### 5. Blast Radius

- Order-level cancellation dialog / modal in `OrderEntry.jsx` (R5) — add notes textarea
- Cancel API payload — add `notes` field to order-cancel call
- **Estimated scope:** SMALL-MEDIUM (1–2 files, R5)

---

### 6. Open Questions

- OD-674-01: Should the notes field be "Additional Notes (Optional)" matching item-cancel, or mandatory (see CR-493)?
- OD-674-02: Does the backend order-cancel endpoint already accept/store a `notes`/`cancellation_note` field?

---

## BUG-670 — Item-Wise Cancellation Missing Notes / Additional Notes Field

- Type: BUG · Area: Menu / Order Entry · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: Item-cancel dialog has no notes field. Parity gap with BUG-674. Cancel dialog + API payload.
- Intake doc: `change_requests/19_BUG-670_ITEM_CANCEL_MISSING_NOTES_FIELD_INTAKE.md`

### 1. Description

When cancelling at the **order level**, an "Additional Notes (Optional)" text field appears in the cancellation dialog. However, when cancelling at the **item level** (individual item cancellation), the notes field is missing from the item cancellation dialog.

**Current behaviour:** 
- Order-level cancel: Cancellation Reason dropdown + "Additional Notes (Optional)" field ✅
- Item-level cancel: Cancellation Reason dropdown only — **no notes field** ❌

**Expected behaviour:** Item-level cancellation should also include an "Additional Notes" field (matching order-level cancellation UX).

---

### 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Screenshot:** provided — "Cancel m" dialog showing Cancellation Reason dropdown + "Additional Notes (Optional)" at order level; no item-cancel dialog screenshot but described
- **Confidence:** CONFIRMED

---

### 6. Blast Radius

- Item cancellation dialog component in `OrderEntry.jsx` or separate cancel modal (R5)
- Cancel API payload — add `notes` field to item cancel call
- **Estimated scope:** SMALL-MEDIUM (1–2 files)

---

## CR-492 — Runtime Complementary Should Be Rights-Based (complementary_food role)

- Type: CR · Area: Permissions / Security · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE — 3 ODs open (OD-492-01/02/03). Next: PLANNING Gate 2-3.
- Registry notes: Only employees with complementary_food permission should mark items as comp at runtime. hasPermission() pattern exists for cancel but NOT for comp. Related: CR-058, CR-104, BUG-298/299. Dependency: CR-495 depends on this. PRIORITY UPGRADED P1→P0 (2026-11-12, batch intake).
- Intake doc: `change_requests/CR-492_COMPLEMENTARY_RIGHTS_BASED_ROLE_GATING_INTAKE.md`
- **Classification:** CR
- **Severity:** P1 — HIGH (permission bypass: any staff can mark items complementary without authorization)
- **Risk:** CRITICAL (touches order flow, billing, discount logic — R5 hotspot files)

### Description

Currently, runtime complementary marking (marking items as complimentary during order-taking) is available to ALL staff regardless of their role. The backend will pass a role/permission key `complementary_food` that should gate this feature — only employees with `complementary_food` permission should be able to mark items as complementary at runtime.

**Expected behavior:** The "Mark Complementary" action in OrderEntry/CollectPaymentPanel should be visible/enabled ONLY when the logged-in employee has the `complementary_food` permission (passed from backend as part of the role/permissions payload).

**Current behavior:** Any staff member can mark items as complementary — no permission check exists in the frontend.

---

### Evidence

- **Source:** OWNER-REPORTED
- **Steps to reproduce:** Log in as any employee → add items to order → mark as complementary → succeeds regardless of role
- **Confidence:** CONFIRMED (code-traced: no `complementary_food` permission check in complementary flow)

---

### Blast Radius

- `is_complementary` referenced in ~25 lines across ~6 files
- Hotspot files touched: YES — `orderTransform.js` (R5), `CollectPaymentPanel.jsx` (R5), `OrderEntry.jsx` (R5)
- Estimated scope: MEDIUM (3-5 files, ~15-25 lines)

---

### Open Questions

- **OD-492-01:** When `complementary_food` permission is absent, should the complementary toggle be HIDDEN or DISABLED (greyed out with tooltip)?
- **OD-492-02:** Does the `complementary_food` permission key come from the same `permissions[]` array in login response, or is it a separate restaurant setting?
- **OD-492-03:** Should the gating apply to BOTH item-level comp (CR-104 flow) AND order-level comp (CR-058 flow)?

## CR-494 — Cancellation Rights: Min Amount Threshold + Manager PIN for Higher Values

- Type: CR · Area: Permissions / Security · Priority: P0 · Assignee: Gyan · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE — BACKEND DEPENDENCY (PIN endpoint + threshold settings). 5 ODs open.
- Registry notes: Below threshold: normal cancel. Above: manager PIN required. No amount check or PIN flow exists in FE. BACKEND must provide PIN endpoint + threshold in settings. Extends CR-493 (reason + threshold + PIN).
- Intake doc: `change_requests/CR-494_CANCELLATION_AMOUNT_THRESHOLD_PIN_INTAKE.md`
- **Classification:** CR
- **Severity:** P1 — HIGH (money loss prevention: high-value cancellations need authorization)
- **Risk:** CRITICAL (touches order cancel flow, permissions, billing — R5 hotspots)

### Description

Cancellation should be tiered based on order amount:
1. **Below a configurable minimum amount:** Staff with `order_cancel` permission can cancel freely (current behavior).
2. **Above the minimum amount:** A manager/owner PIN is required to authorize the cancellation.

This prevents unauthorized high-value cancellations by junior staff. The threshold amount and PIN mechanism need to be configurable per restaurant.

**Expected behavior:**
- Staff cancels order worth <= threshold → normal cancel flow (with reason per CR-493)
- Staff cancels order worth > threshold → PIN entry dialog appears → only proceeds with valid manager PIN
- PIN is verified against backend (not stored in frontend)

**Current behavior:** Any staff with `order_cancel` permission can cancel any order regardless of amount. No PIN or amount-based gating exists.

---

### Evidence

- **Source:** OWNER-REPORTED
- **Steps to reproduce:** Staff cancels a high-value order → no additional authorization required
- **Confidence:** CONFIRMED (code-traced: `hasPermission('order_cancel')` is the only gate — no amount check, no PIN flow)

---

### Blast Radius

- Cancel flow: `DashboardPage.jsx` (L1359 cancelOrder handler), `ChannelColumn.jsx`, `OrderCard.jsx`
- Hotspot files touched: YES — `DashboardPage.jsx`, `OrderEntry.jsx` (R5)
- New component needed: PIN entry dialog
- Backend dependency: PIN verification endpoint + threshold config in settings
- Estimated scope: LARGE (5+ files, ~60-80 lines + new PIN dialog component)

---

### Open Questions

- **OD-494-01:** What is the default minimum amount threshold? (e.g., Rs 500, Rs 1000?)
- **OD-494-02:** Is the PIN a restaurant-level PIN (shared) or per-manager individual PINs?
- **OD-494-03:** Should the PIN verification happen against the backend API, or is it a locally-stored settings value?
- **OD-494-04:** Does this apply to item-level cancellations too, or only full order cancellations?
- **OD-494-05:** BACKEND DEPENDENCY — Does a PIN verification endpoint exist? Does the threshold setting exist in restaurant settings?

## CR-529 — Password / OTP Guard for Cancel, Discount, and Complementary Actions

- Type: CR · Area: Permissions / Security · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: PIN/OTP guard before high-impact actions. Touches cancel flow, payment/discount R5, complementary gating.
- Intake doc: `change_requests/24_CR-529_PASSWORD_OTP_GUARD_CANCEL_DISCOUNT_COMPLEMENTARY_INTAKE.md`

### 1. Description

Owner wants a **password or OTP confirmation step** before staff can perform sensitive operations:

1. **Cancel** an order or item
2. Apply a **Discount**
3. Mark an item as **Complementary**

This is a broader protection gate than CR-494 (which covers cancel amount threshold + manager PIN for high-value cancellations only).

**Current behaviour:** Any staff member with the relevant permission can cancel, apply discounts, or mark items complementary without any additional confirmation beyond their normal login.

**Expected behaviour:** When a staff member initiates cancel/discount/complementary, a PIN or OTP prompt appears. Only after correct entry does the action proceed. Possibly configurable per action type.

---

### 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Confidence:** CONFIRMED

---

### 5. Blast Radius

- Cancel flow in `OrderEntry.jsx` (R5) — add PIN prompt
- Discount flow in `CollectPaymentPanel.jsx` (R5) — add PIN prompt
- Complementary flow — add PIN prompt
- New PIN/OTP dialog component
- Backend: may need manager PIN verification endpoint
- **Estimated scope:** LARGE (4+ files, R5 × 2, backend dependency possible)

---

### 6. Open Questions

- OD-529-01: Is this a fixed 4-digit manager PIN (like CR-494) or a dynamic OTP (SMS/email)?
- OD-529-02: Which of the three actions (cancel/discount/complementary) should be gated — all three, or configurable per restaurant?
- OD-529-03: Should CR-494 and CR-529 be merged or implemented as separate but coordinated features?

---

## CR-515 — Order Beta: Staff Rights for Reprint and Collect Pay-Later

- Type: CR · Area: Permissions / Security · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: Staff can trigger reprints and collect pay-later unintentionally. Needs permissions system update and Order Beta page fix.
- Intake doc: `change_requests/02_CR-515_ORDER_BETA_STAFF_REPRINT_COLLECT_PAYLATER_RIGHTS_INTAKE.md`

### 1. Description

Owner wants to show Order Beta (all-orders report) to staff, but currently there is no rights/permission control for the two key action buttons on that page — **Reprint** and **Collect (Pay-Later)**. All logged-in users who can access Order Beta can also trigger reprints and settle pay-later orders, which the owner wants to restrict.

**Current behaviour:** Order Beta page exposes Reprint and Collect Payment buttons to all users regardless of role/permissions. No gating exists for these two actions.

**Expected behaviour:** 
- Two new permission toggles (or reuse of existing rights): `reprint_bill` and `collect_paylater_order`
- Staff without the right see the buttons disabled or hidden on the Order Beta page
- Owner/manager retain full access

---

### 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Screenshot:** not provided specifically for this item
- **Confidence:** CONFIRMED

---

### 5. Blast Radius

- `OrderReportBetaPage.jsx` or `AllOrdersReportPage.jsx` — gate Reprint + Collect buttons
- Permissions service / `hasPermission()` hook — add new permission keys
- Backend: may need new permission module IDs (backend dependency TBD)
- **Estimated scope:** SMALL-MEDIUM (2–3 files)

---

### 6. Open Questions

- OD-515-01: Should these be new permission keys or reuse existing `reprint` / `collect_payment` rights already in the system?
- OD-515-02: If no permission, should buttons be (a) hidden or (b) visible but disabled?
- OD-515-03: Does backend need to deliver new module IDs in the permissions/settings API?

---

## CR-495 — Complementary Marking Only for Rooms with Breakfast Meal Plan

- Type: CR · Area: PMS / Rooms · Priority: P0 · Assignee: Parth · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE — DEPENDS ON CR-492. 4 ODs open.
- Registry notes: Comp only for rooms booked with breakfast/meal plan, not Room Only. mealPlan exists in transforms but NOT checked in comp flow. Double gate: CR-492 permission + meal plan.
- Intake doc: `change_requests/CR-495_COMPLEMENTARY_ONLY_ROOMS_WITH_BREAKFAST_INTAKE.md`
- **Classification:** CR
- **Severity:** P1 — HIGH (prevents revenue leakage: comp food should only be for breakfast-included bookings)
- **Risk:** HIGH (touches order flow + PMS integration, cross-module logic)

### Description

When marking food items as complementary for room orders ("To Room" flow), the complementary option should ONLY be available for rooms whose booking includes a breakfast/meal plan. Rooms booked without breakfast should not have the option to mark food as complementary.

**Expected behavior:**
- Room booked with breakfast meal plan → comp marking allowed for food items
- Room booked without breakfast (Room Only) → comp marking NOT available / disabled
- The check should use the `mealPlan` field from booking data (already available via `aiosellTransform.js` and `folioTransform.js`)

**Current behavior:** Complementary marking is available for all room orders regardless of the room's meal plan. Any room order can have items marked as comp.

---

### Evidence

- **Source:** OWNER-REPORTED
- **Steps to reproduce:** Book a room WITHOUT breakfast → order food "To Room" → mark as complementary → succeeds (should not)
- **Confidence:** SUSPECTED (code-traced: `mealPlan` exists in transforms but is NOT checked in comp flow)

---

### Blast Radius

- Comp flow: `CollectPaymentPanel.jsx` (R5), `orderTransform.js` (R5)
- Room data: `OrderEntry.jsx` (table/room context), `pmsService.js`
- Need to thread `mealPlan` from room/booking data to the comp gating logic
- Estimated scope: MEDIUM (3-4 files, ~20-30 lines)

---

### Open Questions

- **OD-495-01:** Which meal plans qualify for complementary? Only "Breakfast" or also "Half Board" / "Full Board"?
- **OD-495-02:** Should the check be based on the `mealPlan` field from local-reservations API, or a simpler boolean from settings?
- **OD-495-03:** For walk-in rooms (no booking via channel manager), how is meal plan determined?
- **OD-495-04:** DEPENDS ON CR-492 (complementary_food permission) — should both gates apply (permission AND meal plan)?

## CR-496 — After-Serve Cancellation: In-App Notification to Manager/Owner

- Type: CR · Area: Aggregator / Sockets · Priority: P0 · Assignee: Gyan · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE — BACKEND DEPENDENCY (after-serve cancel event). 3 ODs open.
- Registry notes: When served item cancelled, alert manager/owner via in-app notification. No code for this trigger exists. Backend must differentiate after-serve cancel events.
- Intake doc: `change_requests/CR-496_AFTER_SERVE_CANCELLATION_IN_APP_NOTIFICATION_INTAKE.md`
- **Classification:** CR
- **Severity:** P1 — HIGH (awareness: managers need to know when served items are cancelled)
- **Risk:** MEDIUM (notification/UI layer, no billing logic change)

### Description

When a food item is cancelled AFTER it has been served (`status: served` → cancelled), an in-app notification should be triggered to alert the manager/owner. This is critical for loss prevention — served items being cancelled means food was already prepared and potentially consumed.

**Expected behavior:**
- Item cancelled after serve → in-app notification sent to configured recipients (manager/owner)
- Notification should include: order ID, item name, table/room, who cancelled, reason
- Notification appears in the POS notification panel/bell icon (existing notification UI)

**Current behavior:** No special notification for after-serve cancellations. The cancellation happens silently — only visible in reports after the fact.

---

### Evidence

- **Source:** OWNER-REPORTED
- **Steps to reproduce:** Serve an item → cancel the served item → no notification appears for managers
- **Confidence:** CONFIRMED (code-traced: no special notification logic for post-serve cancellations)

---

### Blast Radius

- Cancel handler: `DashboardPage.jsx` L1359 (needs to detect post-serve cancel)
- Notification system: socket emit or FCM trigger
- Notification UI: existing bell icon / notification panel
- Estimated scope: MEDIUM (3-4 files, ~25-35 lines)
- **BACKEND DEPENDENCY:** Backend needs to emit a socket event or FCM push for after-serve cancellations

---

### Open Questions

- **OD-496-01:** Should this be a SOCKET notification (real-time in POS) or FCM push notification (also reaches mobile)?
- **OD-496-02:** Who receives the notification — all managers, the owner only, or configurable per employee (ties to CR-443)?
- **OD-496-03:** BACKEND DEPENDENCY — Does the backend currently differentiate "after-serve cancel" from "before-serve cancel" in the API/socket event?

## CR-058 — Order-level "Mark Order Complimentary" action + mandatory discount note

- Type: CR · Area: Payments / Coupons / Credit · Priority: P1 · Assignee: UNASSIGNED · Client: NOT SET
- Status: INTAKE — PARKED (2026-08-22, deferred by owner. OQ-1 through OQ-8 unanswered. Do not plan or implement until owner explicitly resumes.)
- Registry notes: R6 CRITICAL. Order-level comp: flip all items + mandatory note. SUBSUMES BUG-145 (owner ruling 2026-07-04). 8 owner rulings required at Planning. Full E2E money regression required.

**REQUIREMENT NOT CAPTURED** — no intake doc. Owner to describe: what is wrong / what is wanted, which screen, which client, expected result.

### What the tracker / investigations already say

- `control/BUG_TRACKER.md`: | BUG-145 | Discount Type dropdown — "Complimentary" option missing | P1 | **HIGH** | **CLOSED — SUBSUMED by CR-058** | — | Owner ruling 2026-07-04: replaced by order-level Mark-Order-Complimentary action |
- `control/CR_REGISTRY.md`: ||| **CR-058** | **Order-level "Mark Order Complimentary" action + mandatory discount note.** Flips every active item to comp in one step, prompts for reason/authorising manager, rolls up into existing Comp bucket in Discount Report. **SUBSUMES BUG-145** (dropdown-based approach). R6 HIGH — 8 owner rulings required at Planning; full E2E money regression. | **INTAKE (2026-07-04).** | `CollectPaymentPanel.jsx`, `orderTransform.js`, optionally `OrderCard.jsx` |
- `control/CR_REGISTRY.md`: | **CR-071** | **App-Wide Role Gating / Permission Consumer Wiring (Migration Phase 3 — DEFERRED).** Consume existing `AuthContext.hasPermission()` across ~30 files: Sidebar sub-items, R5 hotspots (OrderCard/CartPanel/OrderEntry/CollectPaymentPanel/TableCard), all Reports, Menu Mgmt (bulk edit/delete/price), Credit/Settlement/Expense CRUD, Settings tiles. `PermissionGate.jsx` already shipped in CR-069. NO new endpoints. NO new UI screens. Deferred behind CR-057 (Menu No-Tax) + CR-058 (Order Comp
- `control/CR_REGISTRY.md`: | **CR-104** | Item-level complementary reason — mandatory note when marking food as comp. Backend needs `complementary_reason` field per order_details line item. RELATED to CR-058 (order-level comp — separate scope). | **P2** | MEDIUM | **INTAKE — BACKEND-BLOCKED** | 0-1 | 3 files: `OrderEntry.jsx` (R5), `CollectPaymentPanel.jsx` (R5), `orderTransform.js`. Backend brief appended to `BACKEND_BLOCKERS_BRIEF_2026_07_22.html`. |
- `control/CR_REGISTRY.md`: | **CR-137** | **Optional `discount_for` Field in Order Payload.** When operator applies a discount, they can optionally enter a reason (e.g. "staff", "event"). Field sent as `discount_for` in place-order, update-order, placeOrderWithPayment, and collectBillExisting payloads. Field is currently always `null` in backend responses — never sent by FE. UI: optional free-text input in CollectPaymentPanel discount section. Order Ledger "Discount For" column will read actual API value. **Owner directiv

## CR-445 — One-Click Complimentary Button in Payment Flow + Complimentary Tracking

- Type: CR · Area: Payments/Coupons/Credit · Priority: - · Assignee: Gyan · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: from TT-007, TT-008
- Intake doc: `change_requests/CR-445_ONE_CLICK_COMPLIMENTARY_BUTTON_INTAKE.md`
- **Severity:** P2  **Risk:** MEDIUM  **Status:** GATE_1_INTAKE_COMPLETE

### Description

When a 100% complimentary discount is configured in the restaurant's discount settings, instead of the staff member having to select it from the payment method dropdown, show a dedicated one-click "Complimentary" button directly in the payment flow. Paired with: a tracking system showing the total number of complimentary orders/services given.

### Evidence

- Source: OWNER-REPORTED via TT-007 + TT-008
- Confidence: CONFIRMED
- Screenshot: not provided

### Blast radius

MEDIUM — CollectPaymentPanel.jsx (R5) + possibly restaurantSettingsTransform.js + a new complimentary counter display. ~3–4 files.

## CR-071 — App-Wide Role Gating / Permission Consumer Wiring (Migration Phase 3 — DEFERRED)

- Type: CR · Area: Permissions / Security · Priority: P1 · Assignee: UNASSIGNED · Client: NOT SET
- Status: INTAKE — DEFERRED (post CR-057 + CR-058 close, and CR-069 ship)

**REQUIREMENT NOT CAPTURED** — no intake doc. Owner to describe: what is wrong / what is wanted, which screen, which client, expected result.

### What the tracker / investigations already say

- `control/CR_REGISTRY.md`: | **CR-069** | **Employee Management + Role Management (Migration Wave 1).** Originally split into 3 phases (CR-069/070/071). Owner approved building Employee CRUD + Role CRUD together in Wave 1 (2 PRs). 14 files shipped (11 new + 3 modified, ~1,500 lines). Inline editable employee grid, rich 6-column role table with coverage bars, 8 business-function permission editor (52 permissions). All 18 OQs resolved. Mockup frozen 2026-07-15. **SUBSUMES `OG-CR041-EMPLOYEE-MGMT` + `CR-070`.** Wave 2 (consu
- `control/CR_REGISTRY.md`: | **CR-071** | **App-Wide Role Gating / Permission Consumer Wiring (Migration Phase 3 — DEFERRED).** Consume existing `AuthContext.hasPermission()` across ~30 files: Sidebar sub-items, R5 hotspots (OrderCard/CartPanel/OrderEntry/CollectPaymentPanel/TableCard), all Reports, Menu Mgmt (bulk edit/delete/price), Credit/Settlement/Expense CRUD, Settings tiles. `PermissionGate.jsx` already shipped in CR-069. NO new endpoints. NO new UI screens. Deferred behind CR-057 (Menu No-Tax) + CR-058 (Order Comp
- `control/CR_REGISTRY.md`: | 1 | **registry.json synced** from `settle` → local | CR-069, CR-070, CR-071 now registered locally (were missing — `15-july` branched before Feb 15 registration) |
- `control/CR_REGISTRY.md`: | Title | B2B Customer CRM Wiring — Read + Write + Auto-Populate from CRM v2 Contract (CR-071/CR-072 CRM) |

## CR-372-B — Security: Add ProtectedRoute to 23 Unguarded Routes (App.js only)

- Type: CR · Area: Permissions / Security · Priority: P3 · Assignee: Abhishek · Client: NOT SET
- Status: INTAKE
- Registry notes: INVESTIGATION 2026-10-14: ~90% done. 86 ProtectedRoute usages in App.js; all core routes guarded. Remaining: preview sub-routes in reports-module (order-ledger/preview, kitchen-ops/preview, room-orders/preview) are unguarded but mockup-only. Low risk. Can close with targeted Gate 2-3 for preview routes.
- Intake doc: `change_requests/CR-372-B_SECURITY_ROUTE_GUARDING_APP_JS_INTAKE.md`

### 1. Summary

Wrap 23 unguarded React routes in `App.js` with `<ProtectedRoute>`. This is the only fix from CR-372 that touches `frontend/src/`. Separated into its own gate cycle because it is a source code change requiring Gate 2 → Gate 4 GO → Implementation → QA.

---

### 2. Scope — F-SEC-03

**File:** `src/App.js` — the only file that changes.

### 4. Evidence

- **Screenshot:** not provided (routing change — login redirect would be the test; no pre-fix screenshot needed)
- **Steps to reproduce:** `grep -n "Route path" /app/frontend/src/App.js | grep -v ProtectedRoute` → returns 25 unprotected routes; minus 2 intentionally public = 23 unguarded routes confirmed
- **Curl output:** not applicable (frontend routing — no API curl)
- **Source:** AGENT-DISCOVERED — CR-372 parent intake (2026-09-08); OD-CR372-01 locked; route list verified from `App.js` grep; `control/PUBLIC_ROUTES.md` created with authoritative 2-route list
- **Confidence:** CONFIRMED — 23 unguarded routes verified by live grep 2026-09-08

---

### 7. Blast Radius

- Files: `src/App.js` (23 line-level wraps)
- Hotspot files: NO (App.js is routing; not in R5 financial list)
- Scope: SMALL (1 file, mechanical pattern)
- Downstream: users on those 23 routes will be redirected to login if not authenticated

---

### 8. Owner Decisions

All answered via OD-CR372-01. Route list locked. No new decisions needed.

---

## CR-443 — Employee-Level Notification Mapping Dashboard

- Type: CR · Area: Permissions/Security · Priority: P0 · Assignee: Gyan · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: from TT-001, TT-003
- Intake doc: `change_requests/CR-443_EMPLOYEE_NOTIFICATION_MAPPING_DASHBOARD_INTAKE.md`
- **Severity:** P1  **Risk:** HIGH  **Status:** GATE_1_INTAKE_COMPLETE

### Description

New feature: employee-level notification preference dashboard. Staff can choose which real-time events they want to be notified about. Three trigger events in scope: (1) order cancellation, (2) order made unpaid, (3) payment method changed on an order. This is NOT in Local Settings (restaurant-wide) — it is per-employee, each staff member manages their own notification subscriptions.

### Evidence

- Source: OWNER-REPORTED via TT-001 (Tech Tasks sheet)
- Confidence: CONFIRMED
- Screenshot: not provided

### Blast radius

MEDIUM — new settings screen/panel + backend endpoint for per-employee prefs + NotificationContext read of prefs at play time. ~4–6 files.

---

# BATCH B — Payments, Credit & GST (17 items)

## BUG-671 — Unable to Mark Partial-Payment Orders as Unpaid

- Type: BUG · Area: Payments / Coupons / Credit · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: Partial-payment orders cannot be reversed to unpaid. Payment reversal, credit flow, partial payment state.
- Intake doc: `change_requests/25_BUG-671_UNPAID_PARTIAL_PAYMENT_ORDER_REPORT_INTAKE.md`

### 1. Description

In the Order Report (New POS / Order Beta), when an order has a **partial payment**, the system does not allow marking it as "Unpaid" (reversing the payment to credit/pay-later status). This is a missing or broken flow for partially-paid orders.

**Current behaviour:** For orders with partial payment, the "Unpaid" / "Change Payment Method" action either does not appear or fails to work correctly, preventing the reversal of partial payments back to unpaid status.

**Expected behaviour:** Partially-paid orders should be reversible to "Unpaid" or "Credit" status from the Order Report, consistent with how fully-paid orders can be reversed.

---

### 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Confidence:** CONFIRMED (owner reported as bug)

---

### 6. Blast Radius

- `AllOrdersReportPage.jsx` or `OrderReportBetaPage.jsx` — unpaid button condition
- Payment service — partial payment reversal API
- **Estimated scope:** SMALL-MEDIUM (1–2 files)

---

## BUG-672 — Prepaid Order Unable to Move to Credit

- Type: BUG · Area: Payments / Coupons / Credit · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: Prepaid orders stuck — cannot transition to credit payment. Payment status transitions, credit system.
- Intake doc: `change_requests/26_BUG-672_PREPAID_ORDER_UNABLE_TO_CREDIT_INTAKE.md`

### 1. Description

**Prepaid orders** (orders marked as prepaid at the time of placing) cannot be moved to the **Credit** (pay-later) system. The option to send a prepaid order to credit is missing.

**Current behaviour:** Prepaid orders have no "Move to Credit" or "Make Credit/Unpaid" option. They are locked to their prepaid status.

**Expected behaviour:** A prepaid order should be movable to Credit status (e.g. if the prepayment needs to be reversed or the customer requests credit instead).

---

### 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Confidence:** CONFIRMED

---

### 6. Blast Radius

- Order action panel / `OrderCard.jsx` — prepaid order credit option
- Credit service — `addToCredit` API call with prepaid order
- Backend: confirm prepaid → credit transition is supported
- **Estimated scope:** SMALL-MEDIUM (1–2 FE files, backend dependency TBD)

---

## CR-514 — Payment: Optional Transaction ID / Reference Field per Payment Method

- Type: CR · Area: Payments / Coupons / Credit · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: Add optional transaction ID/reference field per payment method on CollectPaymentPanel. R5 hotspot, payment payload change.
- Intake doc: `change_requests/01_CR-514_PAYMENT_TRANSACTION_ID_FIELD_INTAKE.md`

### 1. Description

Owner requests a configurable text field on the payment method panel that lets cashiers enter a transaction reference (e.g. UPI transaction ID, bank transfer reference, card approval code, cheque number). The field should be:
- Available per payment method (at minimum UPI, Card, Bank Transfer; optionally all)
- Configurable as **mandatory** or **optional** per method (restaurant setting)
- Stored and visible in Order Report / Order Beta detail view

**Current behaviour:** No free-text reference field exists in the payment panel. Cashiers cannot record a transaction reference at settlement time.

**Expected behaviour:** A labelled input (e.g. "Transaction ID" or "Reference") appears below the amount for selected payment methods. If configured mandatory, the Pay button is disabled until a value is entered.

---

### 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Screenshot:** provided — payment method panel (Cash/UPI/Card/Split/Credit/To Room visible)
- **Steps to reproduce:** Open any order → Collect Payment → select UPI — no reference field
- **Confidence:** CONFIRMED (owner described requirement clearly)

---

### 5. Blast Radius

- `CollectPaymentPanel.jsx` (R5) — primary UI changes (~20–30 lines new input + validation)
- `orderTransform.js` (R5) — extend payment payload with `transaction_ref` field
- `AllOrdersReportPage.jsx` or `OrderReportBetaPage.jsx` — show ref in order detail
- Backend: needs to store + return `transaction_ref` per payment method (backend dependency TBD)
- **Estimated scope:** MEDIUM (3–4 files, 2 R5 hotspots)
- **Hotspot files:** YES — CollectPaymentPanel.jsx, orderTransform.js

---

### 6. Open Questions

- OD-514-01: Which payment methods should show the field? (a) UPI + Card + Bank Transfer only (b) all methods including Cash (c) configurable per restaurant
- OD-514-02: Is mandatory/optional controlled per-restaurant in settings or hardcoded?
- OD-514-03: Backend confirmation needed — will `transaction_ref` be stored and returned in order APIs?

---

## CR-522 — Reconcile Amount Range Should Be Customizable Per Restaurant

- Type: CR · Area: Payments / Coupons / Credit · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: ±3% reconcile range hardcoded. Add restaurant-level setting. Touches CollectPaymentPanel R5.
- Intake doc: `change_requests/15_CR-522_RECONCILE_AMOUNT_RANGE_CUSTOMIZABLE_INTAKE.md`

### 1. Description

The "Received Amount" panel (CR-483) allows a ±% variance on the payment amount (currently shows "±3% allowed (₹143.56 – ₹152.44)" based on a 3% default). The owner wants this reconciliation range to be **configurable per restaurant** rather than a fixed 3%.

**Current behaviour:** The reconcile/tolerance range is hardcoded at ±3% (or derived from a fixed restaurant setting). Restaurants cannot set their own acceptable variance range.

**Expected behaviour:** Restaurants can configure the reconciliation tolerance percentage (e.g. 1%, 2%, 3%, 5%) from the Settings page. The payment panel displays the range based on the configured value.

---

### 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Screenshot:** provided — payment panel showing "±3% allowed (₹143.56 – ₹152.44)"
- **Confidence:** CONFIRMED

---

### 5. Blast Radius

- `CollectPaymentPanel.jsx` (R5) — read configured % instead of hardcoded 3%
- Settings page — new input for reconcile tolerance %
- `profileTransform.js` or `restaurantSettingsTransform.js` — map new setting field
- Backend: needs to store + return the configured % (backend dependency)
- **Estimated scope:** MEDIUM (3–4 files, R5)

---

### 6. Open Questions

- OD-522-01: What is the input format? (a) A free-entry % field (b) A dropdown with preset options like 1%/2%/3%/5%/10%
- OD-522-02: Does the backend already support a `reconcile_tolerance_pct` setting, or is it hardcoded there too?

---

## CR-526 — Credit Management: Remove / Void Unpaid Order

- Type: CR · Area: Payments / Coupons / Credit · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: No way to clear bad debts or erroneously created credit entries. Add remove/void action on Credit Management.
- Intake doc: `change_requests/21_CR-526_CREDIT_REMOVE_UNPAID_ORDER_INTAKE.md`

### 1. Description

Owner wants the ability to **remove an unpaid order from the Credit Management** list. Currently, once an order lands in credit (pay-later), there is no way to remove or mark it as "void/removed" if the customer doesn't pay or the order needs to be cleared without payment.

**Current behaviour:** Unpaid orders in Credit Management can only be collected (paid) or remain indefinitely. There is no "remove" or "write off" action.

**Expected behaviour:** An authorized user (manager/owner role) can remove an unpaid order from the credit list, with an optional reason. The removed order should be tracked in an audit log.

---

### 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Confidence:** CONFIRMED

---

### 5. Blast Radius

- `CreditManagementPage.jsx` — add remove/void action
- Credit service — new API call or status update
- Backend: needs `void-credit-order` or similar endpoint
- **Estimated scope:** MEDIUM (2–3 files, backend dependency)

---

### 6. Open Questions

- OD-526-01: Should "remove" be role-gated (manager/owner only)?
- OD-526-02: Should removed orders appear in a separate "Removed" tab or disappear entirely?
- OD-526-03: Does the backend have a "void" or "remove" credit endpoint?

---

## CR-527 — Credit Management: Filter Orders by Same Phone Number with Different Names

- Type: CR · Area: Payments / Coupons / Credit · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: Credit list filter: same phone number showing different names. Display/filter only, no payment logic.
- Intake doc: `change_requests/22_CR-527_CREDIT_FILTER_SAME_PHONE_DIFF_NAME_INTAKE.md`

### 1. Description

Owner wants to filter Credit Management orders where the **same phone number** appears under **different customer names**. This helps identify and reconcile cases where the same customer used multiple names during different visits, all under the same phone number.

**Current behaviour:** Credit Management has basic filters (by name, by date, etc.) but no specific filter to group/show orders where the same phone number has been used with different names.

**Expected behaviour:** A filter option in Credit Management that shows all credit orders with the same phone number grouped together, even if different names were provided, so the owner can identify and reconcile such cases.

---

### 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Confidence:** CONFIRMED

---

### 5. Blast Radius

- `CreditManagementPage.jsx` — add filter/group-by-phone view
- Credit service / data transform — group by phone
- **Estimated scope:** SMALL-MEDIUM (1–2 files)

---

### 6. Open Questions

- OD-527-01: Should this be a (a) filter chip showing "same phone, multiple names" or (b) a grouped view by phone number?
- OD-527-02: Does the credit API return `phone` for all entries, or only for entries where a customer was explicitly linked?

---

## CR-536 — Prana Restaurant: 3 Pending Features — GST in Credit Payment, Address Field, UPI ID in Credit

- Type: CR · Area: Payments / Coupons / Credit · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: 3 features for Prana restaurant: (1) GST number field in credit/TAB payment, (2) Address field in credit, (3) UPI ID in credit. Note: BUG-668 covers UPI ID in printer agent (separate issue). These 3 may be split into separate CRs at Gate 2.

**REQUIREMENT NOT CAPTURED** — no intake doc. Owner to describe: what is wrong / what is wanted, which screen, which client, expected result.

### What the tracker / investigations already say

- `control/CR_REGISTRY.md`: | **CR-536** | Prana: 3 Pending Features — GST number in credit payment, address field in credit, UPI ID in credit. May split into 3 CRs at Gate 2. Source: TT-050. | **P1** | **HIGH** | **GATE_1_INTAKE_COMPLETE 2026-11-12** — Distinct from BUG-668 (UPI in printer agent). Sprint: nov_cr_batch. Next: Gate 2. | `CollectPaymentPanel.jsx` (R5) · credit flow |

## CR-517 — Advance Payment for Bulk / Scheduled Orders

- Type: CR · Area: Payments / Coupons / Credit · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: Support advance payment collection for bulk/scheduled orders.
- Intake doc: `change_requests/05_CR-517_ADVANCE_PAYMENT_BULK_SCHEDULED_ORDERS_INTAKE.md`

### 1. Description

Owner wants to support **bulk/catering orders** with an advance partial payment workflow:

1. Customer places an order for a future date/time (scheduled order)
2. Cashier takes a partial **advance payment** at the time of booking
3. The remaining balance is paid after delivery/service

**Current behaviour:** No advance/deposit payment mechanism exists for regular POS orders. Orders are either fully paid at collect-bill or added to credit. There is no way to record a partial advance and schedule the order for a future date.

**Expected behaviour:**
- Create a "Scheduled Order" with a future delivery date/time
- Accept a partial advance amount (less than total bill)
- Record the advance amount and remaining balance
- At delivery time, the remaining amount can be collected

---

### 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Confidence:** REPORTED (no screenshot provided)

---

### 5. Blast Radius

- New UI: "Bulk/Catering Order" flow or "Scheduled Order" panel
- `CollectPaymentPanel.jsx` (R5) — partial advance collection
- `orderTransform.js` (R5) — new order type/status
- Backend: needs new APIs or order type support (significant dependency)
- **Estimated scope:** LARGE (6+ files, backend dependency)

---

### 6. Open Questions

- OD-517-01: Is this a new order type (Bulk/Catering) or an enhancement to existing order types?
- OD-517-02: Where does the scheduled date picker appear?
- OD-517-03: Is the advance amount a fixed value or a percentage of the total?
- OD-517-04: Backend dependency — does backend support advance payment for POS orders?
- OD-517-05: Does this integrate with the existing Credit system or is it a separate flow?

---

## BUG-607 — Item-Level GST Not Working in New POS

- Type: BUG · Area: Payments/Coupons/Credit · Priority: P0 · Assignee: Gyan · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: from TT-027
- Intake doc: `change_requests/BUG-607_ITEM_LEVEL_GST_NOT_WORKING_NEW_POS_INTAKE.md`
- **Severity:** P1  **Risk:** HIGH  **Status:** GATE_1_INTAKE_COMPLETE

### Description

Item-level GST is not working in the new POS. GST calculated or displayed per item is incorrect — either not computing, not displaying, or sending wrong values to backend.

### Evidence

- Source: OWNER-REPORTED via TT-027 (Tech Tasks sheet) + direct report
- Confidence: CONFIRMED (owner reported)
- Screenshot: not provided

### Blast radius

MEDIUM — orderTransform.js (R5-adjacent) + CartPanel.jsx (R5) + CollectPaymentPanel.jsx (R5) + possibly productTransform.js. ~3–4 files, all hotspot-adjacent.

## CR-394 — Backward GST calculation required for Open Items

- Type: CR · Area: Payments / Coupons / Credit · Priority: P0 · Assignee: Gyan · Client: NOT SET
- Status: GATE_1_INTAKE
- Registry notes: Open/custom items need backward (inclusive) GST calculation — extract GST from entered price instead of adding on top.
- Intake doc: `change_requests/CR-394_BACKWARD_GST_OPEN_ITEMS_INTAKE.md`
- **Source:** OWNER-REPORTED 2026-09-27 (batch intake)

### Requirement

For **Open/Custom Items** (items entered manually), the GST calculation should support **backward/inclusive mode**: the entered price is treated as **GST-inclusive**, and the GST amount is extracted from it rather than added on top.

Example: Price entered = ₹118, GST 18% → Base = ₹100, GST = ₹18 (not Base = ₹118, GST = ₹21.24).

---

### Open Questions — OWNER WILL ANSWER LATER

- OD-394-01: Should backward GST be the default for all open items, or a toggle per item?
- OD-394-02: Does the backend already support `tax_calc: 'Inclusive'` for custom items?
- OD-394-03: Which screen — AddCustomItemModal or a different entry point?

---

## BUG-475 — Prepaid orders not visible — Auto Settlement settles them automatically

- Type: BUG · Area: Payments / Coupons / Credit · Priority: P0 · Assignee: Gyan · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: Prepaid orders auto-settled before user can see them. Likely a backend auto-settlement config or socket-triggered early settlement. Need to check auto_settle_prepaid setting and socket flow.
- Intake doc: `change_requests/BUG-475_PREPAID_ORDERS_INVISIBLE_AUTO_SETTLEMENT_INTAKE.md`
- **Source:** OWNER-REPORTED 2026-09-27 (batch intake)
- **Related:** BUG-481 (Prepaid→Unpaid→COD, different angle)

### Description

**Prepaid orders** (e.g. online payments, Swiggy prepaid) are being **automatically settled** by the system before staff can see or interact with them on the dashboard. The orders are invisible on the running orders screen.

---

### Evidence

| Item | Detail |
|---|---|
| Source | OWNER-REPORTED |
| Screenshot | Not provided |
| Steps to reproduce | OWNER WILL PROVIDE LATER |
| Confidence | REPORTED |

---

### Blast Radius

- Backend: HIGH — auto-settle config or backend hook
- FE: LOW — FE displays what backend provides; if order is already settled, it won’t show on running orders
- Scope: MEDIUM (all prepaid orders)

---

### Open Questions — OWNER WILL ANSWER LATER

- OD-475-01: Is this a restaurant-level setting (auto_settle_prepaid)? Was it recently changed?
- OD-475-02: Which type of prepaid orders — aggregator (Swiggy/Zomato) or QR/online payment?
- OD-475-03: Are the orders visible in the Audit/All Orders report after they disappear from dashboard?
- OD-475-04: Is this a new behaviour or has it always happened?

---

## BUG-118 — Nth-item coupon / BOGO coupon not working

- Type: bug · Area: Payments / Coupons / Credit · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: INTAKE

**REQUIREMENT NOT CAPTURED** — no intake doc. Owner to describe: what is wrong / what is wanted, which screen, which client, expected result.

### What the tracker / investigations already say

- `control/BUG_TRACKER.md`: | **BUG-118** | **Nth-item coupon code and BOGO coupon code — some features not working, needs testing** | **P1** | **INTAKE** | **POS 4.0** | **FE investigation needed** |

## CR-126 — Backdated Billing Date — User-selectable billing date on order punch (backend-config gated)

- Type: CR · Area: Payments / Coupons / Credit · Priority: P3 · Assignee: Abhishek · Client: NOT SET
- Status: INTAKE
- Registry notes: INTAKE ONLY. User can set billing date (incl. backdate) during order punch. Backend configuration controls feature availability. No implementation yet.

**REQUIREMENT NOT CAPTURED** — no intake doc. Owner to describe: what is wrong / what is wanted, which screen, which client, expected result.

## CR-425 — Wallet recharge functionality

- Type: CR · Area: Payments / Coupons / Credit · Priority: P3 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE

**REQUIREMENT NOT CAPTURED** — no intake doc. Owner to describe: what is wrong / what is wanted, which screen, which client, expected result.

### What the tracker / investigations already say

- `control/CR_REGISTRY.md`: **CURRENT 2026-10-15 — BATCH INTAKE (20 new + 7 updates):** BUG-542 (Old POS graphs incorrect P1), BUG-548 (Old POS summary graphs P1), BUG-553 (Old POS Android ringer P1), BUG-543 (auto vs manual print rounding P1), BUG-554 (unstable connection print duplicate/fail P1), BUG-544 (PMS Coming Soon sidebar P1), BUG-545 (Remove Item Report = Coming Soon P1), BUG-546 (Split Bill label in Order Report P1), BUG-549 (Average Sales Monthly incorrect P1), BUG-547 (doughnut chart = 0 P1), BUG-550 (App Info

## CR-438 — E-Invoice Upload to Govt GST Portal for B2B Customers

- Type: CR · Area: Billing / GST / B2B · Priority: P1 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: IRN generation via IRP for B2B customers. RELATED: CR-431 (download link), CR-116 (GSTIN capture). OD-438-01: backend vs FE responsibility. OD-438-02: trigger point.
- Intake doc: `change_requests/CR-438_EINVOICE_GOVT_GST_PORTAL_B2B_INTAKE.md`
- **Risk:** HIGH

### Description

For B2B customers (with GSTIN), the generated invoice needs to be submitted/uploaded to the government GST portal (IRP — Invoice Registration Portal) to obtain an IRN (Invoice Reference Number) and QR code. This is a legal compliance requirement for B2B transactions above a certain threshold.

---

### Evidence

- Source: OWNER-REPORTED
- Confidence: REPORTED
- Legal requirement: GST e-invoicing mandatory for businesses above turnover threshold

---

### Blast Radius (estimate)

- `CollectPaymentPanel.jsx` (R5) — trigger submission on collect bill
- `orderTransform.js` (R5) — include IRN/QR in bill payload
- Possibly new API service for IRP call
- Estimated scope: LARGE (3–5 files, multiple R5)

---

## CR-447 — Razorpay Enterprise Partnership Migration

- Type: CR · Area: Payments/Coupons/Credit · Priority: P1 · Assignee: Gyan · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: from TT-017, TT-022
- Intake doc: `change_requests/CR-447_RAZORPAY_ENTERPRISE_PARTNERSHIP_INTAKE.md`
- **Severity:** P1  **Risk:** HIGH  **Status:** GATE_1_INTAKE_COMPLETE

### Description

Move Razorpay integration from current setup to an enterprise partnership arrangement. This is primarily a backend change — the Razorpay account, API keys, and settlement flow need to be migrated to the enterprise partner model. FE impact TBD after backend scopes the change.

### Evidence

- Source: OWNER-REPORTED via TT-017 + TT-022
- Confidence: CONFIRMED
- Screenshot: not provided

### Blast radius

UNKNOWN until backend scopes — potentially HIGH (payment flow, settlement, reconciliation).

## CR-520 — Wallet Configuration in New CRM

- Type: CR · Area: CRM / Customer Intelligence · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: Wallet configuration unavailable in New CRM. Touches CRM integration, payment flow, customer data.
- Intake doc: `change_requests/11_CR-520_WALLET_CONFIGURATION_NEW_CRM_INTAKE.md`

### 1. Description

The transition to the New CRM has broken the existing wallet module. Wallet configuration (top-up settings, wallet balance management, redemption rules) is no longer accessible or functioning because it was part of the old CRM integration which is no longer active.

**Current behaviour:** Old wallet module is not working with New CRM. Wallet configuration and operations are unavailable or broken.

**Expected behaviour:** Wallet configuration and all wallet operations (configure wallet, view/edit customer wallet balances, top-up rules, redemption settings) are fully accessible through the New CRM integration.

---

### 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Confidence:** CONFIRMED (owner stated old module not functioning due to New CRM transition)

---

### 5. Blast Radius

- CRM service layer — wallet config API endpoints
- Wallet UI components (wherever they currently live)
- `CollectPaymentPanel.jsx` (R5) — if wallet is a payment method
- Backend/CRM: New CRM API endpoints for wallet management (significant dependency)
- **Estimated scope:** LARGE (backend dependency, multiple UI components)

---

### 6. Open Questions

- OD-520-01: Which CRM API endpoints support wallet config in the New CRM? (needs backend/CRM team input)
- OD-520-02: What wallet operations are needed? (a) View balance only (b) Top-up (c) Full config (limits/rules/redemption)
- OD-520-03: Is the wallet accessible from the POS UI, the CRM portal, or both?

---

---

# BATCH C — Order Beta Report & Reports (23 items)

## BUG-605 — Order Report Beta: Make Unpaid / Change Payment Method Buttons Not Working

- Type: BUG · Area: Reports/Analytics · Priority: P0 · Assignee: Gyan · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: from TT-002 | Excel Item #3 (Unpaid Button) is a DUPLICATE of this bug.
- Intake doc: `change_requests/BUG-605_ORDER_REPORT_BETA_BUTTONS_NOT_WORKING_INTAKE.md`
- **Severity:** P1  **Risk:** HIGH  **Status:** GATE_1_INTAKE_COMPLETE

### Description

In Order Report Beta (OrderReportBetaPage), the action buttons — "Make Unpaid", "Change Payment Method", and similar — are not working. Clicking them has no effect or throws an error.

### Evidence

- Source: OWNER-REPORTED via TT-002
- Confidence: CONFIRMED (owner reported)
- Screenshot: not provided

### Blast radius

SMALL — OrderReportBetaPage.jsx primarily. Possibly reportService.js.

## CR-503 — Order Beta: Pay Later - Print Bill and Collect Payment Actions

- Type: CR · Area: Reports / Analytics · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE — 3 ODs open. Next: PLANNING.
- Registry notes: Excel Item #1. Add Print Bill + Collect Payment actions for Pay Later orders. Extends CR-003 Actions pattern. Related: BUG-605 (buttons not working).
- Intake doc: `change_requests/CR-503_ORDER_BETA_PAY_LATER_PRINT_COLLECT_ACTIONS_INTAKE.md`
- **Classification:** CR
- **Severity:** P1 — HIGH (operational: Pay Later orders stuck without action buttons)
- **Risk:** HIGH (touches Actions column, payment status mutation — R5 OrderTable.jsx)
- **Source:** Order Beta Report Enhancement Requirements Excel (Item #1)

### Description

Orders marked as "Pay Later" (Tab) need accessible **Print Bill** and **Collect Payment** buttons in the Actions column of the Order Beta report. On successful collection, automatically update payment status from Unpaid → Paid.

**Expected behavior:**
- Pay Later orders show "Print Bill" and "Collect" buttons in Actions column
- Clicking "Collect" opens the payment collection flow
- On successful payment, status updates from Unpaid → Paid in the report
- Print Bill generates the bill for the pending order

**Current behavior:** Pay Later orders lack accessible action buttons in the Order Beta report to print or collect payment.

---

### Evidence

- **Source:** OWNER-REPORTED (Excel requirement)
- **Screenshot:** Attached Order Beta report screenshot shows Tab orders (e.g., #023219) with no Collect action
- **Confidence:** CONFIRMED

---

### Blast Radius

- `OrderTable.jsx` (R5, 947 lines) — Actions column rendering + eligibility
- `OrderReportBetaPage.jsx` (815 lines) — handler callbacks
- `reportService.js` (890 lines) — payment mutation API
- Estimated scope: MEDIUM (3 files, ~30-40 lines)

### Open Questions

- **OD-503-01:** Should "Collect" open the same CollectPaymentPanel used in order-taking, or a simplified payment dialog?
- **OD-503-02:** After collection, should the order move to the "Settled" tab automatically?

## CR-504 — Order Beta: Table Section-wise Filter

- Type: CR · Area: Reports / Analytics · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE — 2 ODs open.
- Registry notes: Excel Item #2. Add filter dropdown for table sections (e.g. Ground Floor, Terrace). Parallel with CR-506.
- Intake doc: `change_requests/CR-504_ORDER_BETA_TABLE_SECTION_FILTER_INTAKE.md`
- **Classification:** CR
- **Severity:** P2 — MEDIUM (filtering convenience for multi-section restaurants)
- **Risk:** MEDIUM (new filter in FilterBar, no billing/payment logic)
- **Source:** Order Beta Report Enhancement Requirements Excel (Item #2)

### Description

Add a **Section dropdown** filter to the Order Beta report. Sections are configured during table creation (e.g., "Outdoor", "AC Hall", "Rooftop"). Selecting a section shows only orders from tables assigned to that section. Newly created sections should appear automatically without manual setup.

**Expected behavior:**
- New dropdown filter "Section" in the filter bar
- Populated automatically from all sections configured during table creation
- Selecting a section filters orders to only those from tables in that section
- Works alongside existing filters (Pay Type, Payment, Channel, etc.)
- New sections appear without manual configuration

**Current behavior:** No section filter exists. FilterBar has: Pay Type, Payment, Channel, Platform, Punched By, Collected By, Status, PG filters.

---

### Evidence

- **Source:** OWNER-REPORTED (Excel requirement)
- **Screenshot:** Filter bar visible — no Section dropdown
- **Confidence:** CONFIRMED

---

### Blast Radius

- `FilterBar.jsx` — add Section dropdown
- `OrderReportBetaPage.jsx` — filter state + API query param
- `reportService.js` — pass section filter to API (or client-side filter)
- Estimated scope: MEDIUM (3 files, ~25-35 lines)

### Open Questions

- **OD-504-01:** Is section data available in the order API response, or does it need a separate API call to fetch table→section mapping?
- **OD-504-02:** Should this filter be available on ALL tabs or only "All Orders" and specific tabs?

## CR-505 — Order Beta: Partial Payment Split + Payment-wise Totals

- Type: CR · Area: Reports / Analytics · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE — 4 ODs open. Financial display (R6).
- Registry notes: Excel Item #4. Show per-mode split for partial payments + payment-wise header totals. No double-counting. Related: BUG-272 (partial payment breakdown), BUG-645 (payment filter wrong amount).
- Intake doc: `change_requests/CR-505_ORDER_BETA_PARTIAL_PAYMENT_SPLIT_TOTALS_INTAKE.md`
- **Classification:** CR
- **Severity:** P1 — HIGH (financial accuracy: partial payments not reflected in totals)
- **Risk:** CRITICAL (touches payment calculations, report totals — financial logic)
- **Source:** Order Beta Report Enhancement Requirements Excel (Item #4)

### Description

Partial payments are not fully represented in the payment-mode breakdown and report-level Payment filter totals. Each payment mode's total (Cash, UPI, Card, etc.) must include amounts from partially paid orders — not just fully settled bills.

**Expected behavior:**
- For partially paid orders (e.g., ₹300 Cash + ₹200 UPI), each mode's collected amount is shown
- Payment filter totals: Cash total = cash from fully paid + cash from partially paid orders
- Same logic for UPI, Card, and other payment modes
- No double-counting across modes
- Count actual collected amounts, not only fully settled bills

**Current behavior:** Partial payments not reflected in payment-mode breakdown. Filter totals may only count fully settled orders.

**Implementation note from Excel:** "Payment-mode totals should reflect actual amounts collected through each mode, including partial payments. Avoid double-counting a payment across report totals."

---

### Evidence

- **Source:** OWNER-REPORTED (Excel requirement)
- **Screenshot:** Shows "Split Bill" and "Partial" payment statuses in the report
- **Confidence:** CONFIRMED

---

### Blast Radius

- `reportService.js` (890 lines) — payment totals calculation
- `OrderReportBetaPage.jsx` (815 lines) — summary cards / grand total
- `FilterBar.jsx` — payment filter interaction
- Hotspot: `reportService.js` — financial calculations
- Estimated scope: MEDIUM (2-3 files, ~30-40 lines)

### Open Questions

- **OD-505-01:** For a ₹500 order paid ₹300 Cash + ₹200 UPI: does the "Cash" filter show this order (since it has a cash component), or only orders fully paid by cash?
- **OD-505-02:** How should the Payment filter interact with partial orders — show all orders that have ANY of the selected payment mode, or only orders where that mode is the primary?

## CR-506 — Order Beta: Room Number Filter

- Type: CR · Area: Reports / Analytics · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE — 2 ODs open.
- Registry notes: Excel Item #5. Add filter dropdown for room numbers. Parallel with CR-504.
- Intake doc: `change_requests/CR-506_ORDER_BETA_ROOM_NUMBER_FILTER_INTAKE.md`
- **Classification:** CR
- **Severity:** P2 — MEDIUM (filtering convenience for room-service operations)
- **Risk:** MEDIUM (new filter, no billing/payment logic)
- **Source:** Order Beta Report Enhancement Requirements Excel (Item #5)

### Description

Add a **Room Number** dropdown filter to the Order Beta report. Populated with available room numbers. Selecting a room shows only orders associated with that room. Should work alongside existing report filters.

**Expected behavior:**
- New "Room" dropdown in the filter bar
- Populated with rooms that have orders in the selected date range (or all configured rooms)
- Selecting a room filters to orders linked to that room
- Works alongside all other filters

**Current behavior:** No room filter exists in the Order Beta report.

---

### Evidence

- **Source:** OWNER-REPORTED (Excel requirement)
- **Confidence:** CONFIRMED

---

### Blast Radius

- `FilterBar.jsx` — add Room dropdown
- `OrderReportBetaPage.jsx` — filter state + room list extraction from orders
- Estimated scope: SMALL (2 files, ~20-25 lines)

### Open Questions

- **OD-506-01:** Should the room list be populated from the orders in the current date range, or from all configured rooms?
- **OD-506-02:** Should this filter appear only when room-service orders exist, or always?

## CR-507 — Order Beta: Separate Table # and Room # Columns

- Type: CR · Area: Reports / Analytics · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE — 1 OD open.
- Registry notes: Excel Item #6. Split combined Table/Room column into separate Table # and Room # columns.
- Intake doc: `change_requests/CR-507_ORDER_BETA_SEPARATE_TABLE_ROOM_COLUMNS_INTAKE.md`
- **Classification:** CR
- **Severity:** P2 — MEDIUM (data visibility: users need to see which table/room each order belongs to)
- **Risk:** LOW (additive columns, no existing logic modified)
- **Source:** Order Beta Report Enhancement Requirements Excel (Item #6)

### Description

Add separate **Table Number** and **Room Number** columns to the Order Beta report table. Dine-in orders show table number; room-service orders show room number in the appropriate column. Do not combine table and room details into one column.

**Expected behavior:**
- New "Table #" column for dine-in orders
- New "Room #" column for room-service orders
- Each column shows the relevant identifier; blank/dash for non-applicable order types
- Order #023216 (Dinein) → Table # shows "4", Room # blank
- Room service order → Room # shows "201", Table # blank

**Current behavior:** Report shows Order#, Time, Platform, Type, Waiter, Items, Amount, GST, Service, Payment, Status, Actions. No Table or Room column.

---

### Evidence

- **Source:** OWNER-REPORTED (Excel requirement + screenshot)
- **Confidence:** CONFIRMED (screenshot shows no Table/Room columns)

---

### Blast Radius

- `OrderTable.jsx` (R5, 947 lines) — `getColumns()` + cell renderer
- `reportService.js` — ensure table/room data is in transformed response
- Estimated scope: SMALL (1-2 files, ~15-20 lines)

### Open Questions

- **OD-507-01:** Should these columns appear on ALL tabs or only specific ones?
- **OD-507-02:** Column position — after Type? After Waiter? Before Amount?

## CR-508 — Order Beta: Total Cancelled Revenue Metric

- Type: CR · Area: Reports / Analytics · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE — 2 ODs open.
- Registry notes: Excel Item #7. Add cancelled revenue KPI to header. Respects selected date range.
- Intake doc: `change_requests/CR-508_ORDER_BETA_TOTAL_CANCELLED_REVENUE_INTAKE.md`
- **Classification:** CR
- **Severity:** P1 — HIGH (financial visibility: owner needs to see money lost to cancellations)
- **Risk:** MEDIUM (new summary metric, uses existing data)
- **Source:** Order Beta Report Enhancement Requirements Excel (Item #7)

### Description

Add a **Total Cancelled Revenue** metric to the Order Beta report summary that sums the bill value of fully cancelled orders within the selected date range. Exclude cancelled individual items from otherwise active orders — only count orders where the entire order was cancelled.

**Expected behavior:**
- New "Cancelled Revenue" metric in the summary section (alongside Total Sales, Paid Revenue, etc.)
- Sums bill value of fully cancelled orders only
- Respects the selected date range
- Item-level cancellations in active orders are excluded

**Current behavior:** Report shows "Cancelled: 2" count in the tab but NO revenue value. Grand Total section has Total Sales, Paid Revenue, Order Revenue but no cancelled revenue metric.

---

### Evidence

- **Source:** OWNER-REPORTED (Excel requirement + screenshot)
- **Screenshot:** "Cancelled: 2" visible but with ₹0 amounts, no revenue metric
- **Confidence:** CONFIRMED

---

### Blast Radius

- `OrderReportBetaPage.jsx` (815 lines) — summary cards section
- `reportService.js` — cancelled revenue may already be computed
- Estimated scope: SMALL (1-2 files, ~10-15 lines)

### Open Questions

- **OD-508-01:** Should this metric appear in the top summary cards (alongside Total Orders, Paid Orders) or only in the Grand Total footer?
- **OD-508-02:** Should it split into Pre-Serve vs Post-Serve cancelled revenue, or just one total?

## CR-509 — Order Beta: Order Details Drill-Down + Activity Logs

- Type: CR · Area: Reports / Analytics · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE — 5 ODs open. Largest item — unblocks CR-510 + CR-511.
- Registry notes: Excel Item #8. Full order details sheet + chronological activity log (append-only, employee + timestamp). Dependency: CR-510 and CR-511 depend on this.
- Intake doc: `change_requests/CR-509_ORDER_BETA_ORDER_DETAILS_ACTIVITY_LOGS_INTAKE.md`
- **Classification:** CR
- **Severity:** P1 — HIGH (operational audit: full order transparency needed)
- **Risk:** HIGH (major new feature — Order Details view + Activity Logs)
- **Source:** Order Beta Report Enhancement Requirements Excel (Item #8)

### Description

Two features accessible from the Actions column in Order Beta report:

### Evidence

- **Source:** OWNER-REPORTED (Excel requirement)
- **Confidence:** CONFIRMED

---

### Blast Radius

- `OrderDetailSheet.jsx` (965 lines) — major enhancement
- `OrderTable.jsx` (R5) — Actions column button
- `reportService.js` / `constants.js` — API calls for logs
- Possibly new `OrderActivityLog` component
- Estimated scope: LARGE (3-4 files, ~150-200 lines)

### Open Questions

- **OD-509-01:** Does the `get-single-order-new` endpoint (referenced in OrderDetailSheet L2) return all the fields needed (variations, add-ons, payment breakdown)?
- **OD-509-02:** Does the `order-logs-report` endpoint return per-order activity history, or is it a different report format?
- **OD-509-03:** Should Order Details and Activity Logs be separate tabs within the sheet, or separate buttons in Actions?

## CR-510 — Order Beta: Aggregator Item Details (Variations/Add-ons in Drill-Down)

- Type: CR · Area: Reports / Analytics · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE — depends on CR-509. 2 ODs open.
- Registry notes: Excel Item #9. Show aggregator item variations and add-ons in the order details sheet. Related: BUG-601 (variations silently dropped). Depends on CR-509.
- Intake doc: `change_requests/CR-510_ORDER_BETA_AGGREGATOR_ITEM_DETAILS_INTAKE.md`
- **Classification:** CR
- **Severity:** P1 — HIGH (aggregator order visibility: full item config needed for dispute resolution)
- **Risk:** MEDIUM (extends OrderDetailSheet for aggregator orders)
- **Source:** Order Beta Report Enhancement Requirements Excel (Item #9)

### Description

Inside the Order Details view (CR-509), for aggregator orders (Swiggy, Zomato, and other supported platforms), display the full item-level configuration:
- Item names and quantities
- Selected variations (size, type, etc.)
- Selected add-ons
- Respective prices for each

This is NOT extra columns in the main report table — it's within the Order Details drill-down sheet.

**Expected behavior:** Open an aggregator order's details → see items with their variations, add-ons, and prices, same level of detail as POS orders.

**Current behavior:** Aggregator order details may not expose full item configuration. BUG-601 (variations/addons silently dropped) suggests data loss during order flow.

---

### Evidence

- **Source:** OWNER-REPORTED (Excel requirement)
- **Confidence:** SUSPECTED (needs verification of aggregator order data structure in detail API)

---

### Blast Radius

- `OrderDetailSheet.jsx` (965 lines) — aggregator item rendering
- Aggregator transforms — data availability
- Estimated scope: SMALL-MEDIUM (1-2 files, ~20-30 lines if data is available)

### Open Questions

- **OD-510-01:** Does the `get-single-order-new` API return variation/addon details for aggregator orders?
- **OD-510-02:** Is BUG-601 a prerequisite — if variation/addon data is lost during ingestion, this CR can't display it?

## CR-511 — Order Beta: Aggregator Complete Amount Breakdown (Customer vs Platform)

- Type: CR · Area: Reports / Analytics · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE — depends on CR-509. 3 ODs open.
- Registry notes: Excel Item #10. Customer-facing amounts vs platform commissions in aggregator orders. Depends on CR-509.
- Intake doc: `change_requests/CR-511_ORDER_BETA_AGGREGATOR_AMOUNT_BREAKDOWN_INTAKE.md`
- **Classification:** CR
- **Severity:** P1 — HIGH (financial transparency: aggregator order financials need full breakdown)
- **Risk:** MEDIUM (extends OrderDetailSheet financial section)
- **Source:** Order Beta Report Enhancement Requirements Excel (Item #10)

### Description

Inside the Order Details view (CR-509), for aggregator orders, show a complete financial breakdown:
- Item subtotal
- Item-level discounts
- Order-level discounts
- Additional charges (packaging, delivery, etc.) where applicable
- Taxes
- Final order amount

Platform commissions, deductions, and settlement adjustments should be kept separate from the customer-facing order amount if those are in scope.

**Expected behavior:** Open an aggregator order's details → see full financial breakdown that reconciles to the displayed final amount. Platform deductions not mixed into customer-facing values.

**Current behavior:** Only final amount visible for aggregator orders, no component breakdown.

**Implementation note from Excel:** "Show customer-facing order amount components. Keep platform commissions, deductions and settlement adjustments separate if included in scope."

---

### Evidence

- **Source:** OWNER-REPORTED (Excel requirement)
- **Confidence:** SUSPECTED (needs verification of aggregator financial data in API)

---

### Blast Radius

- `OrderDetailSheet.jsx` (965 lines) — financial breakdown section
- `reportService.js` or aggregator transforms — data mapping
- Estimated scope: SMALL-MEDIUM (1-2 files, ~25-35 lines)

### Open Questions

- **OD-511-01:** Does the API return aggregator-specific financial fields (platform commission, packaging charges, etc.)?
- **OD-511-02:** Should platform commissions be shown at all, or only the customer-facing breakdown?
- **OD-511-03:** For Swiggy vs Zomato, are the financial field names different (requiring separate transforms)?

## CR-532 — Order Beta Report: GST Audit Tab / View

- Type: CR · Area: Reports / Analytics · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: Tax compliance/audit requirement. GST breakout per order in Order Beta reports. Backend dependency.
- Intake doc: `change_requests/30_CR-532_ORDER_BETA_GST_AUDIT_INTAKE.md`

### 1. Description

Owner wants a **GST Audit** tab or section within the Order Beta report that shows the GST (CGST + SGST + total tax) breakdown per order, filterable by date range, for tax compliance and audit purposes.

**Current behaviour:** Order Beta report shows order totals and payment details but does not have a dedicated GST breakdown view for audit purposes.

**Expected behaviour:** A GST audit view within Order Beta (or as a separate tab) showing:
- Per-order: CGST, SGST, Total Tax, Taxable Amount, Grand Total
- Summary row: Total CGST / SGST / Tax for the filtered period
- Filterable by date range (day / week / month / custom)
- Export option (Excel/PDF)

---

### 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 revised batch)
- **Confidence:** CONFIRMED

---

### 5. Blast Radius

- Order Beta report page (`AllOrdersReportPage.jsx` or `OrderReportBetaPage.jsx`) — add GST tab/section
- `reportService.js` — new data fetch or extend existing order data with GST fields
- Backend: confirm GST fields (cgst, sgst, total_tax, taxable_amount) in `ORDER_REPORT_BETA_COMBINED` API — backend dependency
- **Estimated scope:** MEDIUM (2–3 FE files, backend confirm required)

---

### 6. Open Questions

- OD-532-01: Should GST audit be a **new tab** in Order Beta or a **toggle/column group** within the existing table?
- OD-532-02: Line-item level GST breakdown, or order-level totals only?
- OD-532-03: Export to Excel/PDF needed for the GST audit view?
- OD-532-04: Does the backend `ORDER_REPORT_BETA_COMBINED` API already return `cgst`, `sgst`, `total_gst` per order?

---

## CR-528 — Report: Order Edit and Cancel Operations After Bill Print

- Type: CR · Area: Reports / Analytics · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: New report for edits/cancels post-bill-print. Backend dependency. Audit/compliance gap.
- Intake doc: `change_requests/23_CR-528_REPORT_ORDER_EDIT_CANCEL_AFTER_BILL_PRINT_INTAKE.md`

### 1. Description

Owner wants a dedicated **audit report** that shows all orders that were **edited** or **cancelled** after a bill was printed. This is a fraud/audit control feature — once a bill is printed, any changes to the order should be tracked and reportable.

**Current behaviour:** No dedicated report exists for post-bill-print edits or cancellations. Such actions may be tracked in activity logs but are not surfaced as a report.

**Expected behaviour:** A report page (or section within an existing report) showing:
- Orders where items were added/removed **after bill was printed**
- Orders cancelled after bill print
- Columns: Order ID, Table/Type, Original amount, Modified amount, Editor name, Edit time, Original print time

---

### 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Confidence:** CONFIRMED

---

### 5. Blast Radius

- New report page (e.g. `EditCancelAuditPage.jsx`) — or section in existing reports
- `reportService.js` — new API fetch
- Backend: needs endpoint returning post-print edit/cancel events (significant dependency)
- **Estimated scope:** MEDIUM-LARGE (2–3 FE files, backend dependency)

---

### 6. Open Questions

- OD-528-01: Does the backend track/store edit/cancel events after bill print, or does this need to be built from scratch?
- OD-528-02: Should this be a standalone report page or a tab within Order Beta / All Orders report?
- OD-528-03: Date range, restaurant filter, and export (PDF/Excel) needed?

---

## CR-524 — Cancellation Report: Punch Time and Cancellation Duration Columns

- Type: CR · Area: Reports / Analytics · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: Add punch time and duration columns to cancellation report. Report page + transform change.
- Intake doc: `change_requests/18_CR-524_CANCELLATION_REPORT_PUNCH_TIME_DURATION_INTAKE.md`

### 1. Description

The owner wants the cancellation report to include two new time-based columns:

1. **Punch Time** — the time the item/order was originally placed (order creation time)
2. **Cancellation Duration** — the elapsed time between punch time and cancellation time (how long the order/item was active before cancellation)

**Current behaviour:** The cancellation report shows cancelled items/orders but does not display when the order was first placed (punch time) or how long it took to cancel.

**Expected behaviour:** New columns "Punch Time" and "Cancellation Duration" in the cancellation insights/report page.

---

### 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Confidence:** REPORTED (no screenshot)

---

### 5. Blast Radius

- Cancellation report page (InsightsCancellations or similar) — add 2 new columns
- Report transform / `reportService.js` — map `created_at` / `cancel_time` fields
- Backend: confirm `created_at` and `cancel_time`/`cancelled_at` are available in the cancellation API response
- **Estimated scope:** SMALL-MEDIUM (1–2 files + backend confirm)

---

### 6. Open Questions

- OD-524-01: Does the backend cancellation API return `created_at` (punch time) and `cancelled_at` (cancellation time) for each cancelled item?
- OD-524-02: Should "Cancellation Duration" be shown as (a) HH:MM:SS (b) minutes only (c) human-readable (e.g. "3 mins 20 secs")?

---

## BUG-675 — BUG-629 Fix Not Working: 'definition pending' Text Still Showing in Settlement

- Type: BUG · Area: Reports / Analytics · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: BUG-629 marked QA-pass but 'definition pending' still visible. May be deployment issue or conditional render. Investigate before fixing.
- Intake doc: `change_requests/31_BUG-675_BUG629_FIX_NOT_WORKING_DEFINITION_PENDING_INTAKE.md`

### 1. Description

**BUG-629** (Settlement 'Cash Collected' KPI subtitle shows "Total sale: ₹X · definition pending") was implemented (2026-11-05) and marked `GATE_5B_QA_PASS` on 2026-11-08. However, the owner reports the fix is **not reflected** — the "definition pending" dev artifact text is **still visible** in the Settlement page.

**Current behaviour:** Settlement page still shows "definition pending ⓘ" or "Total sale: ₹X · definition pending" under the Cash Collected KPI subtitle, despite BUG-629 being marked fixed and QA-passed.

**Expected behaviour:** The "definition pending" text is fully removed across all three settlement files, as was the stated fix for BUG-629.

---

### 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Screenshot:** not provided
- **Confidence:** CONFIRMED by owner

---

### 6. Blast Radius

- `src/components/panels/SettlementPanel.jsx`
- `src/pages/SettlementPage.jsx`
- `src/pages/SettlementMockup.jsx`
- **Estimated scope:** SMALL (3 files already identified, same as BUG-629)

---

### 8. Open Questions

- OD-675-01: Is this a deployment issue (fix not deployed) or a code issue (wrong file/conditional path missed)?
- OD-675-02: Is the text appearing on the live preprod URL or only on the owner's local device?

---

## CR-444 — Revenue Report: Sales + All Discounts + All Cancellations + Actual Revenue

- Type: CR · Area: Reports/Analytics · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: from TT-004
- Intake doc: `change_requests/CR-444_REVENUE_REPORT_SALES_DISCOUNTS_CANCELLATIONS_INTAKE.md`
- **Severity:** P1  **Risk:** MEDIUM  **Status:** GATE_1_INTAKE_COMPLETE

### Description

New report module: a combined revenue view showing sales, all types of discounts, all types of cancellations, and actual revenue. Owner will define the full column/metric spec after intake. Scope to be discussed further before Gate 2.

### Evidence

- Source: OWNER-REPORTED via TT-004
- Confidence: CONFIRMED (owner reported, detail TBD)
- Screenshot: not provided

### Blast radius

MEDIUM — new report page + reportService endpoint + Sidebar entry. ~4–5 files.

## CR-497 — Daily and Weekly Crisp Summary (Revenue, Orders, Cancellations, Payment Split, Top Items)

- Type: CR · Area: Reports / Analytics · Priority: P0 · Assignee: Gyan · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE — 5 ODs open.
- Registry notes: Quick at-a-glance view. Daily Report + insights exist but no crisp summary. PARTIAL code reality — existing report infrastructure reusable.
- Intake doc: `change_requests/CR-497_DAILY_WEEKLY_CRISP_SUMMARY_INTAKE.md`
- **Classification:** CR
- **Severity:** P1 — HIGH (operational visibility: owner needs at-a-glance business performance)
- **Risk:** MEDIUM (new report/dashboard feature, no existing logic modified)

### Description

A crisp daily and weekly summary view that gives the restaurant owner/manager a quick at-a-glance overview of business performance. This should be concise — not a full analytics dashboard, but key numbers that matter.

**Expected behavior:**
- **Daily Summary:** Total revenue, total orders, average order value, cancellations count + value, top 5 items, payment method breakdown (Cash/Card/UPI), comp orders count
- **Weekly Summary:** Same KPIs aggregated for the week, day-over-day trend, best/worst day comparison
- Accessible from dashboard or sidebar
- Printable / shareable (ties to CR-424 WhatsApp/Email reports)

**Current behavior:** Daily Report exists but is detailed/complex. No crisp summary view. Insights pages are analytics-heavy. Owner needs a quick "how did today go?" answer.

---

### Evidence

- **Source:** OWNER-REPORTED
- **Steps to reproduce:** N/A (new feature)
- **Confidence:** N/A

---

### Blast Radius

- New component/page (no existing code modified)
- Data from existing APIs (orders, settlement, products)
- Sidebar entry (if standalone page)
- Estimated scope: LARGE (new page + service + transforms, 5+ files, ~200+ lines)

---

### Open Questions

- **OD-497-01:** Should this be a new page in the sidebar, or a summary card on the existing dashboard?
- **OD-497-02:** What KPIs are mandatory for the daily summary? (Revenue, orders, cancellations, comp, payment split — anything else?)
- **OD-497-03:** Should the weekly summary be a separate view or a toggle on the same page?
- **OD-497-04:** Should it support date selection (view summary for any past day/week)?
- **OD-497-05:** BACKEND DEPENDENCY — Is there a dedicated summary API, or should the FE aggregate from existing endpoints?

## CR-537 — Item-Wise Hourly Sales Report — Custom report to track item sales on hourly basis for comparison

- Type: CR · Area: Reports / Analytics · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: New report screen showing each food item's sales broken down by hour. Useful for comparing peak vs off-peak item performance. Backend API dependency likely.

**REQUIREMENT NOT CAPTURED** — no intake doc. Owner to describe: what is wrong / what is wanted, which screen, which client, expected result.

### What the tracker / investigations already say

- `control/CR_REGISTRY.md`: | **CR-537** | Item-Wise Hourly Sales Report — new report showing each item's sales per hour for peak/off-peak comparison. Source: TT-071. | **P1** | **MEDIUM** | **GATE_1_INTAKE_COMPLETE 2026-11-12** — Backend API dependency likely. Sprint: nov_cr_batch. Next: Gate 2. | New report page |

## CR-539 — Weekly Café Cancellation Export — Spreadsheet of weekly café cancellation numbers including order details

- Type: CR · Area: Reports / Analytics · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: DISTINCT from CR-497 (Daily/Weekly Revenue Summary). This is specifically a data export/spreadsheet of weekly cancellation numbers per café including order-level details. May require Excel/CSV export functionality.

**REQUIREMENT NOT CAPTURED** — no intake doc. Owner to describe: what is wrong / what is wanted, which screen, which client, expected result.

### What the tracker / investigations already say

- `control/CR_REGISTRY.md`: | **CR-539** | Weekly Café Cancellation Export — spreadsheet/export of weekly cancellation numbers per café including order details. DISTINCT from CR-497. Source: TT-078. | **P1** | **LOW** | **GATE_1_INTAKE_COMPLETE 2026-11-12** — Excel/CSV export. Sprint: nov_cr_batch. Next: Gate 2. | Cancellation report · export |

## CR-138 — Dual Excel Download — Add Backend Excel Endpoint to CR-136 Screens

- Type: CR · Area: Reports / Analytics · Priority: P0 · Assignee: Gyan · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: Backend aggregation IS available via fetchInsightsItems (insights-items endpoint already has variation+addon breakdown in drill.variations/addons). Fix: migrate VariationAddonMockup from order-logs FE agg to insights-items. Re-titled: migrate VariationAddon to backend aggregation.

**REQUIREMENT NOT CAPTURED** — no intake doc. Owner to describe: what is wrong / what is wanted, which screen, which client, expected result.

### What the tracker / investigations already say

- `control/BUG_TRACKER.md`: - CR-138, CR-164, CR-422, CR-423 → GATE_1_INTAKE_COMPLETE (ready for Planning)
- `control/CR_REGISTRY.md`: ### 2026-08-12 Dual Excel Download — CR-136 Amendment (CR-138)
- `control/CR_REGISTRY.md`: | **ID** | CR-138 |
- `control/CR_REGISTRY.md`: | **CR-138** | **Dual Excel Download — Add Backend Excel Endpoint to CR-136 Item Sales + Variation/Addon Screens.** Investigation (INV-CR136-EXCEL_2026_08_12) confirmed backend endpoint `POST /api/v1/vendoremployee/top-food-variation-sales-report-download` is LIVE — returns `{ download_url }` → `.xlsx` with 3 sheets (Food Sales + Variation Sales + Addon Sales) in one file. Owner decision: **keep BOTH** FE Excel + backend Excel — add "Server Excel" as second download option on both screens. FE Ex
- `investigations/REPORTS_BATCH_INVESTIGATION_2026_10_17.md`: ## CR-423, CR-138, CR-422, CR-424, CR-164
- `investigations/REPORTS_BATCH_INVESTIGATION_2026_10_17.md`: ## CR-138 — Variation & Addon Report — Backend Aggregation Already Available

## CR-050 — Insights Dashboard: Quarterly Comparison View (Q1 vs Q2 revenue card)

- Type: cr · Area: Reports / Analytics · Priority: P3 · Assignee: Abhishek · Client: NOT SET
- Status: INTAKE COMPLETE — registered for future sprint

**REQUIREMENT NOT CAPTURED** — no intake doc. Owner to describe: what is wrong / what is wanted, which screen, which client, expected result.

## BUG-192 — Prep & Serve Time — Handover time showing 0 + full logic investigation

- Type: BUG · Area: Reports / Analytics · Priority: P0 · Assignee: Gyan · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: FE code correct. Shows 0/dash when backend does not populate ready_at/serve_at. Only works for restaurants using per-item KOT marking. Backend brief needed to confirm KOT timestamp population per restaurant.

**REQUIREMENT NOT CAPTURED** — no intake doc. Owner to describe: what is wrong / what is wanted, which screen, which client, expected result.

### What the tracker / investigations already say

- `control/BUG_TRACKER.md`: **Last Updated:** 2026-10-19 (FULL SESSION CLOSE) — **BUG-353 GATE_5A_IMPLEMENTED** (7 files: 5 report caps 60/365→730 + reportService chunking + OrderReportBeta progress spinner). **BUG-595 GATE_5A_IMPLEMENTED** (1 line: `liveOrder?.orderDiscountJson` in OrderEntry:1954 — reactive CPP discount). **BUG-597 GATE_5A_IMPLEMENTED** (4 files: SW skipWaiting+claim + SwUpdateBanner + ErrorBoundary ChunkLoadError guard). **NEXT BATCH (10 items, all P0, GATE_1_INTAKE_COMPLETE):** BUG-190, BUG-192, BUG-32
- `control/BUG_TRACKER.md`: - BUG-192 → GATE_1_INTAKE_COMPLETE (KOT timestamps needed from backend; FE correct)
- `investigations/P0_UNBLOCK_INVESTIGATION_REPORT_2026_11_06.md`: | BUG-192 | KOT timestamps | `ready_at`/`serve_at` not in any handover |
- `investigations/REPORTS_BATCH_INVESTIGATION_2026_10_17.md`: ## BUG-040, BUG-041, BUG-354, BUG-353, BUG-408, BUG-409, BUG-192, BUG-467, BUG-486, BUG-547
- `investigations/REPORTS_BATCH_INVESTIGATION_2026_10_17.md`: ## BUG-192 — Prep & Serve Time Shows Handover as 0

## CR-424 — Send Day-End / reports by WhatsApp, Email and SMS

- Type: CR · Area: Reports / Analytics · Priority: P1 · Assignee: Gyan · Client: NOT SET
- Status: GATE_1_INTAKE
- Registry notes: DEFERRED — big CR. Owner to provide BSP API details for WhatsApp channel. Email confirmed needed. Scope: per-report send action + email template + WhatsApp BSP integration.

**REQUIREMENT NOT CAPTURED** — no intake doc. Owner to describe: what is wrong / what is wanted, which screen, which client, expected result.

### What the tracker / investigations already say

- `control/BUG_TRACKER.md`: - CR-424 → DEFERRED (BSP API spec needed)
- `control/CR_REGISTRY.md`: **CURRENT 2026-10-19 — PRIORITY UPGRADES (4 CRs — owner directive).** CR-393 P2→P0, CR-423 P2→P0, CR-424 P2→P1, CR-426 P2→P0. Code Reality: all GATE_1_INTAKE confirmed accurate. CR-423 Cancellations `enabled:false` on both download buttons — confirmed open. registry.json updated.
- `control/CR_REGISTRY.md`: **CURRENT 2026-10-15 — BATCH INTAKE (20 new + 7 updates):** BUG-542 (Old POS graphs incorrect P1), BUG-548 (Old POS summary graphs P1), BUG-553 (Old POS Android ringer P1), BUG-543 (auto vs manual print rounding P1), BUG-554 (unstable connection print duplicate/fail P1), BUG-544 (PMS Coming Soon sidebar P1), BUG-545 (Remove Item Report = Coming Soon P1), BUG-546 (Split Bill label in Order Report P1), BUG-549 (Average Sales Monthly incorrect P1), BUG-547 (doughnut chart = 0 P1), BUG-550 (App Info
- `investigations/REPORTS_BATCH_INVESTIGATION_2026_10_17.md`: ## CR-423, CR-138, CR-422, CR-424, CR-164
- `investigations/REPORTS_BATCH_INVESTIGATION_2026_10_17.md`: ## CR-424 — Send Reports via WhatsApp/Email/SMS

## CR-446 — WhatsApp / Email Report Subscription Module with Per-Report Pricing

- Type: CR · Area: Settings/Config · Priority: - · Assignee: Gyan · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: from TT-014
- Intake doc: `change_requests/CR-446_WHATSAPP_EMAIL_REPORT_SUBSCRIPTION_MODULE_INTAKE.md`
- **Severity:** P2  **Risk:** HIGH  **Status:** GATE_1_INTAKE_COMPLETE

### Description

New module where restaurant users can choose which automated reports they want delivered via WhatsApp or Email. Each WhatsApp report type is charged individually (pricing TBD by owner after intake). Email delivery may be free. Owner will provide the list of available report options after intake.

### Evidence

- Source: OWNER-REPORTED via TT-014
- Confidence: CONFIRMED (full spec TBD after intake)
- Screenshot: not provided

### Blast radius

LARGE — new module: subscription settings page + billing/payment integration per report type + backend APIs for subscription + WhatsApp delivery. ~6–10 files.

---

# BATCH D — Dashboard, Order Entry & Order Cards (15 items)

## CR-518 — Walk-In: Separate Tab on Dashboard (like Takeaway and Delivery)

- Type: CR · Area: Menu / Order Entry · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: Walk-In orders should have own tab like Takeaway/Delivery. Touches DashboardPage R5.
- Intake doc: `change_requests/06_CR-518_WALKIN_SEPARATE_TAB_INTAKE.md`

### 1. Description

The dashboard currently shows separate column-based tabs/sections for **Dine-In**, **Takeaway**, and **Delivery**. Owner wants **Walk-In** orders to have their own dedicated tab/section, separate from Dine-In.

**Current behaviour:** Walk-In orders appear inside the Dine-In section (or are mixed with Dine-In). There is no dedicated Walk-In column/tab on the dashboard.

**Expected behaviour:** A separate "Walk-In" tab/column appears on the dashboard, similar to Takeaway and Delivery, showing only Walk-In type orders.

---

### 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Screenshot:** provided — dashboard showing Dine-In (65 orders) and Delivery (1 order) columns
- **Confidence:** CONFIRMED

---

### 5. Blast Radius

- `DashboardPage.jsx` (R5) — add Walk-In as a separate order type column
- `ChannelColumnsLayout.jsx` / `ChannelColumn.jsx` — render new column
- `orderTransform.js` (R5) — ensure Walk-In order_type is distinguishable
- **Estimated scope:** MEDIUM (3–4 files, R5 hotspot)

---

### 6. Open Questions

- OD-518-01: Should Walk-In be a completely new column type, or a filter chip within the existing dashboard?
- OD-518-02: Does the backend order_type already distinguish Walk-In from Dine-In, or does this need a new order_type value?
- OD-518-03: Which order types map to "Walk-In" vs "Dine-In" from the backend `order_type` field?

---

## CR-525 — After Bill Print: Replace KOT and Bill Buttons with Collect Bill Button

- Type: CR · Area: Menu / Order Entry · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: After bill printed, replace KOT/Bill buttons with Collect Bill. Touches OrderCard R5, bill-print state, CR-489.
- Intake doc: `change_requests/20_CR-525_AFTER_BILL_PRINT_REPLACE_KOT_BILL_WITH_COLLECT_INTAKE.md`

### 1. Description

After a bill is printed, the order card/footer still shows the **KOT** and **Bill** action buttons. The owner wants these to be replaced with a single **"Collect Bill"** button once the bill has been printed, so that the next logical action is immediately prominent.

**Current behaviour:** After bill print, the order card footer continues to show KOT and Bill buttons unchanged. The Collect Payment action is not surfaced directly on the card.

**Expected behaviour:** Once `billPrinted = true` (CR-512 signal), the KOT and Bill buttons on the order card are replaced by (or the Bill button changes to) a "Collect Bill" button that opens the payment/collect panel directly.

---

### 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Screenshot:** provided — table card showing KOT + Bill buttons; annotated by owner
- **Confidence:** CONFIRMED

---

### 5. Blast Radius

- `OrderCard.jsx` (R5) — conditional button rendering based on `billPrinted`
- `TableCard.jsx` — may also need similar treatment
- **Estimated scope:** SMALL-MEDIUM (1–2 files, R5)

---

### 6. Open Questions

- OD-525-01: Should both KOT and Bill be replaced, or only the Bill button changes to "Collect Bill"?
- OD-525-02: If order is edited after bill print (CR-489 allows with permission), should KOT/Bill reappear?
- OD-525-03: "Collect Bill" button — should it open the full CPP panel directly or trigger the existing collect-bill flow?

---

## CR-521 — Color Effect After Bill Print: Make It More Attractive

- Type: CR · Area: Menu / Order Entry · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: Enhance color effect after bill print. CSS-only, cosmetic. Fast Lane eligible.
- Intake doc: `change_requests/14_CR-521_COLOR_EFFECT_AFTER_BILL_PRINT_ENHANCEMENT_INTAKE.md`

### 1. Description

Owner wants the visual color-change animation/effect that occurs after a bill is printed to be more visually attractive and noticeable. The current implementation (green border via CR-512 / BUG-583) is functional but subtle.

**Current behaviour:** After bill print, the order card shows a green solid border (CR-512 GATE_5A_IMPLEMENTED). The transition is functional but visually plain.

**Expected behaviour:** A more polished, attractive visual effect — could include a smoother color transition animation, a more prominent visual treatment, a brief flash or pulse animation, or a more distinctly different card appearance after printing.

---

### 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Screenshot:** provided — table card showing "Bill" button (before print); green card effect already deployed
- **Confidence:** CONFIRMED

---

### 5. Blast Radius

- `TableCard.jsx` / `OrderCard.jsx` — animation/CSS change
- `index.css` or Tailwind config — potential animation class
- **Estimated scope:** SMALL (1–2 files, CSS only)

---

### 6. Open Questions

- OD-521-01: What specific effect is desired? (a) Pulse/glow animation on the border (b) Full background colour flash (c) A brief checkmark overlay (d) Owner to describe or provide reference

---

## CR-523 — Link Customer to Order After Placing (Without Completing/Updating)

- Type: CR · Area: Menu / Order Entry · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: Allow linking customer to placed order without triggering full order update. Touches order flow, customer modal.
- Intake doc: `change_requests/16_CR-523_LINK_CUSTOMER_AFTER_ORDER_WITHOUT_UPDATE_INTAKE.md`

### 1. Description

Currently, when a customer is linked to an order, it typically requires either placing the order initially with a customer, or updating/completing the order to attach a customer. The owner wants to be able to **link (or change) the customer on an existing placed order** without having to Update or Complete the order first.

**Current behaviour:** Linking a customer to an existing order may require an order update action. The customer modal appears but saving it may trigger an order update, which is not always desired mid-service.

**Expected behaviour:** Staff can open the Customer modal on any active order and save a customer link **without** triggering an order update or completion flow. The customer association is applied silently in the background.

---

### 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Screenshot:** provided — Customer Details modal showing mahi2 customer with 0 visits, Bronze tier
- **Confidence:** CONFIRMED

---

### 5. Blast Radius

- `OrderEntry.jsx` (R5) — customer modal save path
- Customer modal component — save action
- `orderService.js` — `updateCustomer` or separate CRM customer-link endpoint
- **Estimated scope:** SMALL-MEDIUM (2–3 files)

---

### 6. Open Questions

- OD-523-01: Does the backend have a dedicated "link customer to order" endpoint separate from "update order"?
- OD-523-02: Should the customer link be saved immediately (silent API call) or queued until next order action?

---

## BUG-673 — Keyboard Navigation: First Alphabetical Food Auto-Selected on Short Code Search

- Type: BUG · Area: Menu / Order Entry · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: Keyboard shortcode search auto-selects wrong item. R5 OrderEntry.jsx, CR-482 hotspot.
- Intake doc: `change_requests/27_BUG-673_KEYBOARD_NAV_AUTO_SELECT_SHORTCODE_SEARCH_INTAKE.md`

### 1. Description

When searching for food using a **short code** in the Order Entry page (keyboard navigation mode), the **first food item in alphabetical order gets auto-selected**. When the user presses Enter to confirm, the unintended alphabetically-first food item is added to the cart instead of the intended search result.

**Current behaviour:** Typing a short code in the search box → first alphabetical item gets auto-highlighted/selected → pressing Enter adds wrong item to cart.

**Expected behaviour:** Short code search should navigate to the matching item only. No auto-selection should occur until the user explicitly navigates to and confirms a specific item.

---

### 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Confidence:** CONFIRMED

---

### 6. Blast Radius

- `OrderEntry.jsx` (R5) — keyboard search / shortcode input handler
- Possibly `CategoryPanel.jsx` or item grid focus management
- **Estimated scope:** SMALL-MEDIUM (1–2 files, R5)

---

## BUG-667 — Sidebar: Restaurant Name Overflows When Name Is Too Long

- Type: BUG · Area: Other · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: Restaurant name overflows sidebar into dashboard. CSS/layout fix only. Fast Lane eligible with owner approval.
- Intake doc: `change_requests/08_BUG-667_SIDEBAR_RESTAURANT_NAME_OVERFLOW_INTAKE.md`

### 1. Description

At the bottom of the sidebar, the restaurant name is displayed. When the restaurant name is too long, it **overflows outside the sidebar container** into the dashboard/main content area rather than truncating or wrapping correctly.

**Current behaviour:** Long restaurant names overflow the sidebar bottom section visually.

**Expected behaviour:** Long restaurant names should be truncated with an ellipsis (`…`) or wrap cleanly within the sidebar bounds without overflowing.

---

### 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Screenshot:** not provided but described clearly
- **Confidence:** CONFIRMED

---

### 6. Blast Radius

- `Sidebar.jsx` — 1 file, 1–2 lines (add `truncate` or `overflow-hidden max-w-full`)
- **Estimated scope:** SMALL (1 file, Fast Lane eligible)

---

## CR-516 — PMS: Separate Check-In Button on Dashboard

- Type: CR · Area: PMS / Rooms · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: Add dedicated Check-In button on dashboard (R5 hotspot DashboardPage, PMS check-in flow, routing).
- Intake doc: `change_requests/04_CR-516_CHECKIN_BUTTON_DASHBOARD_INTAKE.md`

### 1. Description

Currently the PMS check-in can only be initiated from the Order View (order-entry page) for a room order. The owner wants a **dedicated "Check In" button on the dashboard** that is accessible without opening an order, allowing front-desk staff to quickly initiate check-in from the main view.

**Current behaviour:** Check-in can only be performed from within an open order on the PMS order-entry/folio screen. No direct check-in action exists on the dashboard.

**Expected behaviour:** A "Check In" button (or action) is visible on the dashboard — either on the room/PMS card, in the header actions area, or as a quick-action button — that opens the check-in flow directly without needing to open an existing order first.

---

### 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Screenshot:** provided — dashboard showing dine-in and delivery columns (no check-in button visible)
- **Confidence:** CONFIRMED

---

### 5. Blast Radius

- `DashboardPage.jsx` (R5) — add button/action entry point
- `CheckInPage.jsx` or `CheckInForm.jsx` — ensure can be opened without pre-existing order context
- Possibly `Sidebar.jsx` or header area
- **Estimated scope:** MEDIUM (2–3 files, R5 hotspot)

---

### 6. Open Questions

- OD-516-01: Where should the button appear? (a) On each room card on the PMS dashboard (b) In the header/toolbar as a global "New Check-In" button (c) Quick-access button floating near the PMS section
- OD-516-02: Does this require a new booking to exist, or should it allow walk-in check-in without a prior booking?

---

## BUG-669 — Add-On Creation Requires Price: Cannot Create Without Entering Amount

- Type: BUG · Area: Menu / Order Entry · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: Add-on creation forces price entry. Should allow ₹0. Validation logic change in menu management.
- Intake doc: `change_requests/12_BUG-669_ADDON_CREATION_REQUIRES_PRICE_INTAKE.md`

### 1. Description

When adding a new add-on in Menu Management, the system **requires a price to be entered** before the add-on can be saved. Users cannot create an add-on with ₹0 or no price — they must enter a non-zero amount on initial creation, then edit it afterwards to change the price.

**Current behaviour:** Add-on creation form requires a price amount before save. Attempting to save without a price (or with ₹0) is blocked.

**Expected behaviour:** Price should be optional during add-on creation. Users should be able to create an add-on without entering a price (default to ₹0 or null), and set/edit the price later.

---

### 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Confidence:** CONFIRMED

---

### 6. Blast Radius

- Menu Management add-on creation component (likely `MenuManagementPage.jsx` or add-on form sub-component)
- Validation logic for add-on price field (~2–5 lines)
- **Estimated scope:** SMALL (1–2 files)

---

## CR-441 — Order Card: Show Prep Time as Timeline Instead of Prep Text

- Type: CR · Area: Menu / Order Entry · Priority: P3 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: Visual timeline/progress on Preparing cards. OD-441-01: expected prep time source. OD-441-02: visual format.
- Intake doc: `change_requests/CR-441_ORDER_CARD_PREP_TIME_TIMELINE_INTAKE.md`
- **Risk:** LOW

### Description

On order cards in the Preparing column, instead of showing a static "Prep" label or text, display a visual **timeline/progress bar** showing how long the order has been in prep relative to the expected prep time. Staff can instantly see at a glance whether an order is on time or overdue.

---

### Blast Radius (estimate)

- `src/components/cards/OrderCard.jsx` — visual update to Preparing state UI
- Possibly `src/components/cards/TableCard.jsx` — if applies to table view too
- Estimated scope: SMALL (1–2 files, not R5)

---

## BUG-594 — Kitchen View Enable/Disable Toggle Not Visible in Settings (localStorage cache)

- Type: BUG · Area: Dashboard / Settings / localStorage · Priority: P2 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: Toggle for kitchen view not appearing. Suspected localStorage key conflict or conditional render gate. OD-594-01: which page. OD-594-02: localStorage key name.
- Intake doc: `change_requests/BUG-594_KITCHEN_VIEW_TOGGLE_LOCALSTORAGE_CACHE_INTAKE.md`
- **Risk:** LOW

### Description

When navigating to settings to enable or disable the Kitchen View (KDS view on the dashboard), the toggle option is not visible. The setting exists in localStorage but the UI does not surface the toggle correctly. Suspected cause: a localStorage key conflict or a conditional rendering gate that hides the toggle based on a stale/incorrect cached value.

---

### Evidence

- Source: OWNER-REPORTED
- Confidence: REPORTED — exact screen where toggle should appear TBC

---

### Blast Radius

- `src/pages/StatusConfigPage.jsx` — most likely location for the toggle
- `src/pages/DashboardPage.jsx` (R5) — possible read site
- Estimated scope: SMALL (1–2 files)

---

## CR-439 — Default Screen Selection for User

- Type: CR · Area: Auth / Settings / Navigation · Priority: P2 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: Per-user default screen after login. OD-439-01: backend vs localStorage. OD-439-04: backend field availability.
- Intake doc: `change_requests/CR-439_DEFAULT_SCREEN_USER_SELECTION_INTAKE.md`
- **Risk:** LOW

### Description

Each user (employee) should be able to select their default/home screen — the screen they land on after login and when they press the home button. Different roles have different primary screens (e.g. cashier → Dashboard, manager → Reports, kitchen staff → KDS).

---

### Blast Radius (estimate)

- `src/api/transforms/authTransform.js` — map `default_screen` field
- `src/pages/LoadingPage.jsx` (R5) — redirect to default screen after boot
- Settings/Profile page — UI to set preference
- Estimated scope: MEDIUM (2–3 files, 1 R5)

---

## CR-437 — New Settings Keys Including Menu Master

- Type: CR · Area: Settings / Profile · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: Audit and map all new backend settings keys. OD-437-01: full key list from backend. OD-437-03: what is Menu Master endpoint.
- Intake doc: `change_requests/CR-437_NEW_SETTINGS_KEYS_MENU_MASTER_INTAKE.md`
- **Risk:** MEDIUM

### Description

All new settings keys from the backend — including the Menu Master key — need to be mapped in the frontend so they are available to relevant screens. Currently new keys added on the backend may not be read by the FE profile/settings transform, causing features gated by these keys to not activate.

---

### Blast Radius (estimate)

- `src/api/transforms/restaurantSettingsTransform.js` — primary mapping file
- Screens that consume the new keys (TBD after OD-437-01 answered)
- Estimated scope: SMALL–MEDIUM (1–3 files)

---

## BUG-609 — CRM search dropdown flashes on order re-open (edit/collect-bill)

- Type: BUG · Area: CRM / Customer · Priority: P2 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: 2026-10-22: Intake. CartPanel L879 isCustomerSelected=false when order restored with phone-only (no id, empty name) → search fires → dropdown flashes. FE fix: 1 line. Related BUG-593.
- Intake doc: `change_requests/BUG-609_CRM_DROPDOWN_FLASH_ON_REOPEN_INTAKE.md`
- **Risk:** LOW
- **Source:** INVESTIGATION (BUG-593 session)

### Description

When a cashier re-opens an existing order (edit or collect-bill), the CRM customer search dropdown flashes briefly showing the customer as a suggestion. This happens because `isCustomerSelected` evaluates to `false` when the customer state is restored from order data with no `id` and empty `name` — triggering the search effect. The dropdown auto-closes once the async CRM enrichment completes (~1-2s).

### Evidence

- Owner screenshot: dropdown showing "abhishek jain / 7505242126" on order re-open
- Reproduced during BUG-593 investigation

### Blast Radius

SMALL — CartPanel.jsx L879, 1 line

## CR-404 — Menu restructuring — proper grouping of add-ons

- Type: CR · Area: Menu / Order Entry · Priority: - · Assignee: Parth · Client: NOT SET
- Status: GATE_1_INTAKE
- Registry notes: Menu needs restructuring with better add-on grouping. Requires Menu Management UI changes and potentially backend category/addon schema changes.
- Intake doc: `change_requests/CR-404_MENU_RESTRUCTURING_ADDON_GROUPING_INTAKE.md`
- **Source:** OWNER-REPORTED 2026-09-27 (batch intake)

### Requirement

The **menu structure** needs to be **restructured** with proper **grouping of add-ons**: add-ons should be organised under clear groups/categories rather than being a flat list, making it easier for staff and customers to understand customisation options.

---

### Open Questions — OWNER WILL ANSWER LATER

- OD-404-01: What does the desired add-on group structure look like? (e.g. “Sauces”, “Extras”, “Sizes”)
- OD-404-02: Does the backend already support add-on groups/categories?
- OD-404-03: Should groups be shown in Order Entry customer-facing view, kitchen-facing, or both?
- OD-404-04: Is this a backend schema change (add-on groups table) or purely FE display grouping?
- OD-404-05: What screens are affected — Menu Management, Bulk Editor, Order Entry, KOT?

---

## CR-376-FU-C — Per-restaurant server-side active menu default (follow-up to CR-376)

- Type: CR · Area: Menu / Order Entry · Priority: - · Assignee: UNASSIGNED · Client: NOT SET
- Status: GATE 1 — INTAKE COMPLETE (2026-09-25). BLOCKED: awaiting CR-376 Gate 6 + backend team.
- Registry notes: P3 HIGH. Registered per owner P5 decision. Backend API contract change required. Full planning needed.
- Intake doc: `change_requests/CR-376-FU-C_SERVER_SIDE_ACTIVE_MENU_INTAKE.md`
- **Source:** OWNER-REQUESTED (P5 decision, 2026-09-25)

### Owner Requirement

CR-376 stores the active menu per-device in localStorage. For restaurants with many POS stations, each device requires manual Local Settings configuration after deployment.

Enhancement: backend serves a `default_active_menu_type` per restaurant (set by owner in backend admin). On first boot (no localStorage override), POS uses the server default automatically. Local device override still available.

---

### Step 2 — Evidence

| Field | Value |
|---|---|
| **Source** | OWNER-REQUESTED (P5 precondition, 2026-09-25) |
| **Confidence** | SUSPECTED — no API probe run yet. Backend team must confirm profile API field availability. |
| **Screenshot** | N/A |
| **Steps to reproduce (gap)** | 1. Deploy CR-376 to a restaurant with 10 stations. 2. Each station must manually visit Local Settings and pick the correct menu. 3. If missed, station shows OD-376-06 empty-state until fixed. |
| **Backend ask (needed at Gate 2)** | Does `GET /api/v1/vendoremployee/profile` support a `default_active_menu_type` field? If not, what contract change is needed? |

---

### Step 3 — Blast Radius

| Metric | Value |
|---|---|
| FE files to change | 3–4: `activeMenuPrefs.js` (read fallback), `LoadingPage.jsx` (hotspot — boot hydration), `authService.js` or new util, `activeMenuPrefs.js` (conditional logic) |
| Backend files | 1+ (profile API, admin settings) — BACKEND TEAM OWNED |
| Hotspot files | YES — `LoadingPage.jsx` is R5 |
| Scope | LARGE — backend involvement + hotspot + boot flow |
| Open owner questions | OQ-C1: Per-restaurant default (same all stations) OR per-station server-side? OQ-C2: Local override trumps server default, or vice versa? OQ-C3: Backend team available this sprint? |

---

---

# BATCH E — Scan Order & Aggregator / Sockets (6 items)

## BUG-676 — Scan Order Edit — No Ringer, No Popup for New Items Added

- Type: BUG · Area: Aggregator / Sockets · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: New items added to confirmed scan orders get no ringer or popup. NotificationContext, ScanOrderPopOut, socket events.
- Intake doc: `change_requests/32_BUG-676_SCAN_ORDER_EDIT_NO_RINGER_NO_POPUP_INTAKE.md`

### 1. Description

When a **new** scan/confirm order arrives, the ringer plays and the confirmation pop-up appears correctly. However, when an **existing confirmed order is edited** (new items added by the customer via the scan & order portal), the update arrives silently — **no ringer plays and no confirmation pop-up appears**. The new items simply get added to the order without any notification to the POS operator.

**Current behaviour:**
- New scan order → ringer plays + ScanOrderPopOut pop-up appears ✅
- Edit to existing order (new items added) → silent, no ringer, no pop-up ❌

**Expected behaviour:** When new items are added to an existing confirmed scan/web order, the POS should:
1. Play the confirmation ringer
2. Show the confirmation pop-up (or a notification) so staff know the order has been updated

---

### 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12)
- **Code note:** `NotificationContext.jsx:22` maps `item_added` sound type but FCM/socket for edit-order events likely uses a different payload type that is not currently triggering the full confirm-order ringer + pop-up flow
- **Confidence:** CONFIRMED

---

### 6. Blast Radius

- `src/contexts/NotificationContext.jsx` — extend confirm-order ringer logic for edit events
- `src/components/dashboard/ScanOrderPopOut.jsx` — handle edit-order notification display
- `src/hooks/useOrderPollingReconciliation.js` — may need to track order edits
- **Estimated scope:** MEDIUM (2–3 files, socket/notification logic)

---

### 7. Open Questions

- OD-676-01: Should the edit-order ringer use the same confirm_order sound, or a distinct "order updated" tone?
- OD-676-02: Should the pop-up show the full confirmation flow (accept/reject) or just an informational alert (dismiss only)?
- OD-676-03: Does the backend socket event for edit-order carry a distinguishable `type` or `event_name` field to detect it?

---

## CR-533 — Scan Order Popup: Minimize to YTC Tab

- Type: CR · Area: Aggregator / Sockets · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: Scan order popup blocks workflow. Add minimize-to-YTC option. ScanOrderPopOut, DashboardPage R5, YTC queue state.
- Intake doc: `change_requests/33_CR-533_SCAN_ORDER_POPUP_MINIMIZE_TO_YTC_TAB_INTAKE.md`

### 1. Description

The scan/confirm order pop-up (`ScanOrderPopOut`) appears as a full-screen or large overlay when a new web/scan order arrives. The owner wants to be able to **minimise** this pop-up — and when minimised, the pending order should appear visibly in the **"Yet To Confirm" (YTC)** tab/section on the dashboard so staff can action it later without the popup blocking their view.

**Current behaviour:** The pop-up appears and can only be dismissed by accepting/rejecting the order or snoozed. There is no minimize-to-YTC-tab option; minimised/snoozed orders may not be clearly visible in the dashboard YTC section.

**Expected behaviour:**
1. A "Minimise" button on the confirmation pop-up
2. On minimise, the pop-up closes and the order is prominently shown in the YTC tab on the dashboard
3. The YTC tab counter/badge updates immediately to reflect the pending order

---

### 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12)
- **Confidence:** CONFIRMED

---

### 5. Blast Radius

- `src/components/dashboard/ScanOrderPopOut.jsx` — add Minimize button + minimise handler
- `src/pages/DashboardPage.jsx` (R5) — ensure YTC section shows minimised orders prominently
- YTC counter / `PlatformCounterChip` — badge update on minimise
- **Estimated scope:** MEDIUM (2–3 files, R5)

---

### 6. Open Questions

- OD-533-01: Where exactly is the YTC section on the dashboard — is it a tab in the "YTC" column or a chip/filter on the header?
- OD-533-02: Should minimised orders have a visual distinction in the YTC list (e.g. a "New - Pending Review" badge)?
- OD-533-03: Should snoozed orders (existing snooze feature) also appear in the YTC tab, or only explicitly minimised ones?

---

## CR-534 — Scan Order Popup: Missing Customer Name, Phone, Info

- Type: CR · Area: Aggregator / Sockets · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: Scan order popup missing customer name, phone, and order info. Information density improvement.
- Intake doc: `change_requests/34_CR-534_SCAN_ORDER_POPUP_MISSING_CUSTOMER_INFO_INTAKE.md`

### 1. Description

The scan/confirm order confirmation pop-up (`ScanOrderPopOut`) is missing key customer and order information. The owner needs to see **customer name, phone number, and other useful order details** directly in the pop-up so they can make a confident accept/reject decision without opening the order.

**Current behaviour:** The pop-up shows customer name and phone only when available (`activeOrder.customerName`, `activeOrder.phone` — conditionally rendered). Other useful info such as order type, table/section, item count, special instructions, estimated amount, etc. may be missing or not prominently displayed.

**Expected behaviour:** The confirmation pop-up should prominently show:
- Customer name and phone number (always, or clearly show "Walk-in / Anonymous" when unavailable)
- Order type (Dine-In / Takeaway / Delivery)
- Table number / section (for dine-in)
- Delivery address (for delivery)
- Item count + brief item list
- Special instructions / order notes
- Order amount / estimated total

---

### 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12)
- **Confidence:** CONFIRMED

---

### 5. Blast Radius

- `src/components/dashboard/ScanOrderPopOut.jsx` — add info fields to the pop-up display
- `src/api/transforms/orderTransform.js` (R5) — confirm all required fields are mapped from socket/API data
- **Estimated scope:** SMALL-MEDIUM (1–2 files)

---

### 6. Open Questions

- OD-534-01: Which fields should be **mandatory** in the pop-up vs **shown when available**?
- OD-534-02: Is the order amount / item list available in the socket payload at the time the pop-up appears, or only after a full order fetch?
- OD-534-03: Preferred layout — compact single row per field, or a structured card with sections (customer section + order section)?

---

## CR-399 — Zomato and Swiggy orders — food/item cancellation flow

- Type: CR · Area: Aggregator / Sockets · Priority: - · Assignee: Parth · Client: NOT SET
- Status: GATE_1_INTAKE
- Registry notes: No item-level cancellation flow for aggregator orders. Need to add cancel-item action for Swiggy/Zomato orders with appropriate backend endpoint call.
- Intake doc: `change_requests/CR-399_AGGREGATOR_ITEM_CANCELLATION_FLOW_INTAKE.md`
- **Source:** OWNER-REPORTED 2026-09-27 (batch intake)

### Requirement

For **Zomato and Swiggy** orders, allow **individual item cancellation** from the POS. Currently there is no cancellation flow for aggregator order items. Staff need to be able to mark items as cancelled (e.g. out of stock) and notify the customer.

---

### Open Questions — OWNER WILL ANSWER LATER

- OD-399-01: Does Swiggy/Zomato API support item-level cancellation callbacks from POS?
- OD-399-02: Should cancellation notify the customer automatically, or only update POS records?
- OD-399-03: Can the whole aggregator order be cancelled, or only individual items?
- OD-399-04: Is there a backend endpoint already for this (`cancel-aggregator-item`?)?

---

## CR-375 — Aggregator Menu: Bulk Delete Capability in BulkEditor

- Type: CR · Area: Aggregator / Sockets · Priority: - · Assignee: Parth · Client: NOT SET
- Status: INTAKE — BLOCKED (backend brief filed)
- Registry notes: INVESTIGATION 2026-10-14: Non-aggregator bulk delete shipped under CR-159 (BulkEditor.jsx L253 — non-Aggregator only). CR-375 needs aggregator-menu bulk delete specifically. Still open + backend brief filed.
- Intake doc: `change_requests/CR-375_AGGREGATOR_BULK_DELETE_CAPABILITY_INTAKE.md`
- **Source:** OWNER-REPORTED UX gap + AGENT-CONFIRMED-IN-CODE + BACKEND LIMITATION
- **Related investigation:** `/app/memory/investigations/INV-MENU-BULK-FILTER-GAP_INVESTIGATION_REPORT_2026_09_11.md`

### Owner Requirement (verbatim)

> "In aggregator menu bulk option is not there in bulk edit."

(Interpreted as: bulk delete / checkbox selection is absent in BulkEditor when viewing Aggregator menu, per code investigation confirming `showBulkDelete = menuType !== 'Aggregator'`)

---

### Description

When the user is in Aggregator menu and opens Bulk Edit mode, the following are hidden by a hard FE guard:
- Row checkboxes
- "Select All" header checkbox
- Selection banner ("N items selected")
- "Delete Selected" button and dialog

This was an intentional decision in CR-159 because the backend `/delete-bulk` endpoint at the time only supported `food_for: Normal|Party|Premium`, not `Aggregator`.

---

### Frontend Scope (after backend unblock)

| Item | Detail |
|------|--------|
| **File** | `BulkEditor.jsx` (1 file only) |
| **Change** | Remove `menuType !== 'Aggregator'` guard on `showBulkDelete` |
| **Service** | If Path A: `deleteFoodBulk` already passes `foodFor` — just needs backend support |
| **Lines estimate** | ~5 lines (remove guard, possibly add Aggregator-specific warning on delete confirm) |

---

### Evidence

- **Source:** Owner-reported (2026-09-11 session)
- **Confidence:** CONFIRMED (agent verified in code)
- **Code evidence:** `BulkEditor.jsx:395–396` — `showBulkDelete = menuType !== 'Aggregator'`
- **Service evidence:** `menuManagementService.js:106–112` — endpoint comment explicitly excludes Aggregator

---

### Blast Radius

| Metric | Value |
|--------|-------|
| Files to change (FE) | 1 (`BulkEditor.jsx`) |
| Backend work | YES (required first) |
| Lines to change (FE) | ~5 |
| Hotspot files | NO |
| Financial / billing | NO |

**Blast radius: SMALL (FE) + BACKEND DEPENDENCY**

---

### Owner Decisions (open)

| OD | Question | Default (agent suggestion) |
|----|----------|--------------------------|
| OD-375-01 | Prefer Path A (backend extends `/delete-bulk`) or Path B (FE sequential loop using `deleteFood`)? | Path A — cleaner, atomic. Path B is a workaround with unknown risks. |
| OD-375-02 | Should a warning be added on the delete confirm dialog for Aggregator items (e.g., "This will also remove the item from Swiggy/Zomato platforms")? | YES — Aggregator delete has real-world platform impact |

---

## CR-535 — Auto-Populate Webhooks in Store — Implement automatic webhook population to prevent manual configuration errors

- Type: CR · Area: Other / Configuration · Priority: P0 · Assignee: Parth · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE — details to be refined
- Registry notes: Auto-populate webhooks in store to prevent manual config errors. Details/scope to be provided by owner before Gate 2.

**REQUIREMENT NOT CAPTURED** — no intake doc. Owner to describe: what is wrong / what is wanted, which screen, which client, expected result.

### What the tracker / investigations already say

- `control/CR_REGISTRY.md`: | **CR-535** | Auto-Populate Webhooks in Store — automatic webhook population to prevent manual config errors. Details/scope TBD before Gate 2. Source: TT-045. | **P1** | **MEDIUM** | **GATE_1_INTAKE_COMPLETE 2026-11-12** — Details to be refined. Assignee: Parth. Sprint: nov_cr_batch. Next: Owner to provide scope → Gate 2. | TBD |

---

# BATCH F — Inventory & Recipes (10 items)

## CR-519 — Inventory: Update Stock Without Recording a Purchase

- Type: CR · Area: Inventory / Stock · Priority: P0 · Assignee: Parth · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: Allow stock updates without a purchase record. New API call, inventory logic change.
- Intake doc: `change_requests/07_CR-519_UPDATE_STOCK_WITHOUT_RECORDING_PURCHASE_INTAKE.md`

### 1. Description

Currently, every stock update in the POS Inventory module is recorded as a **purchase transaction** (goes into purchase history). The owner wants an option to adjust/update stock quantities **without** creating a purchase record — for example, when correcting stock counts, handling returns, or manually reconciling physical stock.

**Current behaviour:** All stock additions go through `add-purchase` API, which records a purchase entry in the system every time. There is no way to update stock without creating a purchase record.

**Expected behaviour:** A new "Stock Adjustment" or "Update Stock Only" option that:
- Adjusts the inventory quantity
- Does NOT create a purchase record
- May optionally accept an adjustment reason/note
- Distinct from the existing "Receive Inventory" (purchase) flow

---

### 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Confidence:** CONFIRMED

---

### 5. Blast Radius

- `InventoryReceivePage.jsx` or `StockAuditPanel.jsx` — UI for new adjustment flow
- `inventoryService.js` — new API call (potentially `add-stock` vs `add-purchase`)
- Backend dependency: needs a separate `add-stock` endpoint or `add-purchase` with `is_purchase=false` flag
- **Estimated scope:** MEDIUM (2–3 files, backend dependency)

---

### 6. Open Questions

- OD-519-01: Does backend already have a separate `add-stock` / `stock-adjustment` endpoint distinct from `add-purchase`?
- OD-519-02: Where should this appear in the UI — (a) a new button on the existing "Receive Inventory" page (b) a separate "Stock Adjustment" page (c) a toggle on the existing form?
- OD-519-03: Should adjusted quantities appear in the purchase report or a separate adjustment log?

---

## CR-530 — Recipe: Create New Ingredients Inline During Recipe Making

- Type: CR · Area: Inventory / Stock · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: Create new ingredients without leaving recipe screen. Inline creation flow, inventory service call.
- Intake doc: `change_requests/28_CR-530_RECIPE_CREATE_NEW_INGREDIENT_INLINE_INTAKE.md`

### 1. Description

When creating or editing a recipe, the user can currently only select from **existing ingredients** in the inventory. If a new ingredient is needed that doesn't exist yet, the user must exit the recipe editor, go to the Inventory Setup, add the ingredient there, then return to recipe making.

**Current behaviour:** Recipe editor shows an ingredients dropdown/search from the existing inventory list. No inline "Create New Ingredient" option.

**Expected behaviour:** An inline "+ Create New Ingredient" option or quick-add modal within the Recipe editor, allowing the user to create a new ingredient without leaving the recipe creation flow.

---

### 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Confidence:** CONFIRMED

---

### 5. Blast Radius

- `RecipeManagementPage.jsx` or `RecipeManagementPanel.jsx` — inline create button
- `inventoryService.js` — create ingredient API call
- Possibly a new `QuickAddIngredientModal.jsx` component
- **Estimated scope:** SMALL-MEDIUM (2–3 files)

---

### 6. Open Questions

- OD-530-01: Inline quick-add (name + unit only) or full ingredient creation form?
- OD-530-02: After creating, should the new ingredient be automatically selected in the recipe row?

---

## CR-531 — Recipe: Ingredients List Should Show Category

- Type: CR · Area: Inventory / Stock · Priority: P0 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: Show ingredient category in recipe ingredients list. Display-only. Fast Lane eligible.
- Intake doc: `change_requests/29_CR-531_RECIPE_INGREDIENTS_SHOW_CATEGORY_INTAKE.md`

### 1. Description

When viewing or selecting ingredients during recipe creation, the ingredient list does not show the **ingredient's category** (e.g. "Dairy", "Spices", "Vegetables"). The owner wants the category to be visible alongside each ingredient name so that staff can quickly find and differentiate ingredients with similar names.

**Current behaviour:** Ingredient search/list in the recipe editor shows ingredient name (and possibly unit) but no category.

**Expected behaviour:** Each ingredient in the recipe list/dropdown shows its category alongside the name — e.g. "Butter (Dairy)" or a subtle category label.

---

### 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Confidence:** CONFIRMED

---

### 5. Blast Radius

- `RecipeManagementPage.jsx` or ingredient picker component — add category to display
- `inventoryTransform.js` — ensure `category` field is mapped from API response
- **Estimated scope:** SMALL (1–2 files)

---

### 6. Open Questions

- OD-531-01: Does the ingredient API response include a `category` field for each ingredient?
- OD-531-02: Show category as (a) "(Category)" suffix in ingredient name (b) a small badge/chip (c) grouped by category in the dropdown?

---

## CR-498 — Recipe Correction Workflow (Edit with Before/After Tracking + Optional Retroactive Stock Adjustment)

- Type: CR · Area: Inventory / Stock · Priority: P0 · Assignee: Parth · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE — BACKEND DEPENDENCY. 4 ODs open.
- Registry notes: Recipe CRUD exists, no 'correction' workflow with change tracking or retroactive adjustment. Related: BUG-457, BUG-459. Dependency: CR-499 depends on this.
- Intake doc: `change_requests/CR-498_RECIPE_CORRECTION_WORKFLOW_INTAKE.md`
- **Classification:** CR
- **Severity:** P1 — HIGH (inventory accuracy: incorrect recipes lead to wrong stock deductions)
- **Risk:** HIGH (touches inventory, recipe management, stock calculations)

### Description

A workflow for correcting recipes after they have been set up and are in use. When a recipe has wrong ingredient quantities or wrong ingredients, the correction should:
1. Allow editing the recipe (ingredients + quantities)
2. Track what was changed (before vs after)
3. Optionally trigger a stock reconciliation/adjustment for past orders affected by the incorrect recipe

**Expected behavior:**
- Navigate to recipe management → select recipe → edit ingredients/quantities
- System shows "before" and "after" comparison
- Option to apply correction retroactively or only for future orders
- Change logged for audit trail

**Current behavior:** Recipe editing exists in `RecipeBulkEditor` and `RecipeManagementPanel`, but there is no formal "correction" workflow with before/after tracking or retroactive adjustment capability.

---

### Evidence

- **Source:** OWNER-REPORTED
- **Steps to reproduce:** N/A (new workflow)
- **Confidence:** N/A

---

### Blast Radius

- Recipe service: `recipeService.js`
- Recipe UI: `RecipeBulkEditor.jsx`, `RecipeManagementPanel.jsx`
- Possibly new comparison component
- Inventory transforms if retroactive adjustment is needed
- Estimated scope: LARGE (4+ files, ~100+ lines for comparison UI + tracking)

---

### Open Questions

- **OD-498-01:** Should recipe corrections be logged with a reason (similar to stock audit adjustments)?
- **OD-498-02:** Should there be a "before vs after" comparison view, or just allow direct editing?
- **OD-498-03:** Should corrections trigger retroactive stock adjustments for past orders?
- **OD-498-04:** BACKEND DEPENDENCY — Does the backend support recipe versioning or change tracking?

## CR-499 — Final Audit After Recipe Correction (Stock vs Expected, Flag Discrepancies)

- Type: CR · Area: Inventory / Stock · Priority: P0 · Assignee: Parth · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE — DEPENDS ON CR-498. BACKEND DEPENDENCY. 4 ODs open.
- Registry notes: Post-correction stock verification. StockAuditPanel exists, no recipe-correction-triggered audit. Related: BUG-457, BUG-459.
- Intake doc: `change_requests/CR-499_FINAL_AUDIT_AFTER_RECIPE_CORRECTION_INTAKE.md`
- **Classification:** CR
- **Severity:** P1 — HIGH (inventory integrity: recipe corrections need verification before closing)
- **Risk:** HIGH (touches stock audit, inventory reconciliation)

### Description

After a recipe correction (CR-498) is applied, a final audit step should be triggered to verify that:
1. The corrected recipe now produces accurate stock deductions
2. Current stock levels are reconciled against the corrected recipe quantities
3. Any discrepancies from the old (incorrect) recipe period are documented

This is a post-correction verification step — like a "closing audit" that confirms the correction was applied correctly and stock is now accurate.

**Expected behavior:**
- After CR-498 recipe correction is saved → system offers a "Run Audit" option
- Audit compares: current physical stock vs expected stock (based on corrected recipe + order history)
- Discrepancies highlighted with suggested adjustments
- Audit result saved for records

**Current behavior:** Stock Audit exists (`StockAuditPanel.jsx`) but is a general-purpose audit. No audit specifically tied to recipe corrections. No "post-correction verification" flow.

---

### Evidence

- **Source:** OWNER-REPORTED
- **Steps to reproduce:** N/A (new feature, dependent on CR-498)
- **Confidence:** N/A

---

### Blast Radius

- Stock audit: `StockAuditPanel.jsx`, `inventoryTransform.js`
- Recipe service: `recipeService.js` (trigger point)
- Possibly new audit summary component
- Estimated scope: LARGE (4+ files, ~80-120 lines)

---

### Open Questions

- **OD-499-01:** Should the audit be MANDATORY after every recipe correction, or optional (offered as a prompt)?
- **OD-499-02:** Should the audit compare against the corrected recipe only, or also show the impact of the old (incorrect) recipe?
- **OD-499-03:** Should discrepancies result in automatic stock adjustments, or require manual approval?
- **OD-499-04:** BACKEND DEPENDENCY — Can the backend provide order history with ingredient breakdown for a given period?

## CR-436 — Inventory: Out-of-Stock Auto-Disable via Backend Key

- Type: CR · Area: Inventory / Order Entry · Priority: P0 · Assignee: Parth · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: Backend key per item controls auto-disable when OOS. OD-436-01: backend field name. OD-436-02: real-time vs refresh. OD-436-03: visual treatment. OD-436-04: scope (menu items only vs ingredients).
- Intake doc: `change_requests/CR-436_INVENTORY_OUTOFSTOCK_DISABLE_BACKEND_KEY_INTAKE.md`
- **Risk:** HIGH

### Description

Need a backend-driven key per menu item that controls whether the item is automatically disabled on the POS when it goes out of stock. When stock is replenished and the key changes, the item should re-enable automatically — no manual intervention required.

**Expected behaviour:**
- Backend sends a flag per product (e.g. `stock_disabled: true/false`) in the products/menu API
- When `stock_disabled = true` → item appears greyed out / unavailable on Order Entry
- When stock is updated and `stock_disabled = false` → item re-enables automatically (via next data refresh or socket)

---

### Evidence

- Source: OWNER-REPORTED
- Confidence: REPORTED — exact backend field name TBC

---

### Blast Radius (estimate)

- `src/api/transforms/menuManagementTransform.js` or `productTransform.js` — map new field
- `src/components/order-entry/OrderEntry.jsx` (R5) — gate item display/availability
- Possibly `LoadingPage.jsx` (R5) — product boot load
- Estimated scope: MEDIUM (3–4 files, 1 R5)

---

## CR-154 — Settings Flags for Inventory as Central Inventory

- Type: CR · Area: Inventory / Stock · Priority: P0 · Assignee: Parth · Client: NOT SET
- Status: INTAKE

**REQUIREMENT NOT CAPTURED** — no intake doc. Owner to describe: what is wrong / what is wanted, which screen, which client, expected result.

## CR-151 — Sub Recipe Excel Upload

- Type: CR · Area: Inventory / Stock · Priority: P2 · Assignee: Parth · Client: NOT SET
- Status: INTAKE

**REQUIREMENT NOT CAPTURED** — no intake doc. Owner to describe: what is wrong / what is wanted, which screen, which client, expected result.

## CR-421 — Inventory — Purchase Order route / workflow required

- Type: CR · Area: Inventory / Stock · Priority: - · Assignee: Parth · Client: NOT SET
- Status: GATE_1_INTAKE

**REQUIREMENT NOT CAPTURED** — no intake doc. Owner to describe: what is wrong / what is wanted, which screen, which client, expected result.

### What the tracker / investigations already say

- `control/CR_REGISTRY.md`: **CURRENT 2026-10-15 — BATCH INTAKE FINAL (23 new items registered):** BUG-556 (Auto bill prints "Unpaid" when payment done, Printing P1), BUG-557 (Delivery Assign option missing when config=Delivered, Order Entry P1), CR-427 (Move Loyalty/Coupon/E-Invoice/WhatsApp config from CRM to POS via CRM API, CRM P1). Plus previously registered batch: BUG-542/548/553 (Old POS), BUG-543/554 (Printing), BUG-544 (PMS), BUG-545/546/549 (Reports), BUG-547 (Dashboard), BUG-550/551 (Auth+Sidebar), BUG-552/555 (
- `control/CR_REGISTRY.md`: **CURRENT 2026-10-15 — BATCH INTAKE (20 new + 7 updates):** BUG-542 (Old POS graphs incorrect P1), BUG-548 (Old POS summary graphs P1), BUG-553 (Old POS Android ringer P1), BUG-543 (auto vs manual print rounding P1), BUG-554 (unstable connection print duplicate/fail P1), BUG-544 (PMS Coming Soon sidebar P1), BUG-545 (Remove Item Report = Coming Soon P1), BUG-546 (Split Bill label in Order Report P1), BUG-549 (Average Sales Monthly incorrect P1), BUG-547 (doughnut chart = 0 P1), BUG-550 (App Info

## CR-538 — Sutra: Multi-Bag and Station Level Features

- Type: CR · Area: Order Entry · Priority: P0 · Assignee: Parth · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE — details to be refined
- Registry notes: Multi-bag and station level features for Sutra restaurant. Exact scope (multiple packaging bags per order, kitchen station routing, or other) to be defined before Gate 2.

**REQUIREMENT NOT CAPTURED** — no intake doc. Owner to describe: what is wrong / what is wanted, which screen, which client, expected result.

### What the tracker / investigations already say

- `control/CR_REGISTRY.md`: | **CR-538** | Sutra: Multi-Bag and Station Level Features — scope TBD (multiple bags per order, kitchen station routing). Source: TT-074. | **P1** | **MEDIUM** | **GATE_1_INTAKE_COMPLETE 2026-11-12** — Assignee: Parth. Scope to be defined before Gate 2. Sprint: nov_cr_batch. | TBD |

---

# BATCH G — PMS / Rooms (7 items)

## BUG-193 — Room Transfer Trail — showing table transfers + FROM ROOM showing 0 (INVESTIGATION)

- Type: BUG · Area: PMS / Rooms · Priority: P0 · Assignee: Parth · Client: NOT SET
- Status: INTAKE

**REQUIREMENT NOT CAPTURED** — no intake doc. Owner to describe: what is wrong / what is wanted, which screen, which client, expected result.

## CR-391 — Room settlement — show payment details and allow veg/non-veg charge separation

- Type: CR · Area: PMS / Rooms · Priority: - · Assignee: Parth · Client: NOT SET
- Status: GATE_1_INTAKE
- Registry notes: During room settlement, display itemised payment breakdown and allow owner to split charges between veg and non-veg items.
- Intake doc: `change_requests/CR-391_ROOM_SETTLEMENT_VEG_NONVEG_CHARGE_SEPARATION_INTAKE.md`
- **Source:** OWNER-REPORTED 2026-09-27 (batch intake)

### Requirement

During **room settlement**, the system should:
1. Display detailed payment breakdown (amounts per payment method, advance, balance)
2. Allow charges to be **separated between vegetarian and non-vegetarian items** for properties that need this split for billing/tax purposes

---

### Open Questions — OWNER WILL ANSWER LATER

- OD-391-01: Is veg/non-veg split for display only, or does it affect GST calculation?
- OD-391-02: Which screen — Folio, PmsCheckoutDrawer, or Front Desk Bill tab?
- OD-391-03: Is this required for specific restaurant types (e.g. Jain properties)?
- OD-391-04: Does the backend already tag items as veg/non-veg, or does FE need to derive this?

---

## CR-361 — PMS — Room Assignment on Tape Chart (pre-arrival mapping to physical rooms)

- Type: CR · Area: PMS / Rooms · Priority: P1 · Assignee: Parth · Client: NOT SET
- Status: INTAKE — BACKEND-BLOCKED
- Intake doc: `change_requests/CR-361_PMS_ROOM_ASSIGNMENT_TAPE_CHART_INTAKE.md`
- **Source:** AGENT-DISCOVERED (post-CR-358 enhancement list, `SESSION_HANDOVER_2026_09_04_CR358_P3QA_P4IMPL_REGRESSION.md`) — owner-selected 2026-09-04
- **Related:** CR-358-P4 (Tape Chart S2 — hosts the disabled button), CR-358-P2 (CheckInPage room picker), BUG-380 (occupied rooms in picker), OG-PMS-013 (board soft-allocation vs LR — filed this session)

### Description

OTA bookings (booking.com etc.) arrive with a **room type** only (locked decision Q5). The tape chart lists them under "Unassigned Bookings" with a disabled **Assign Room** button. Front-desk staff need to map each booking to a physical room *before* arrival (day-before planning, upgrades, adjacent rooms for groups), so the block appears on the correct room row and the Check-In form is pre-filled.

### Expected behaviour

1. `Assign Room` enabled for every unassigned pending reservation line.
2. Click → picker listing local rooms **of the booking's room type** (from `getBookableRooms()`), each showing availability for the booking's date range (no overlap with assigned/in-house lines on the tape chart), occupied rooms greyed (BUG-380 pattern).
3. Confirm → backend persists `restaurant_table_id` on the reservation room line → tape chart refetches → block moves from Unassigned to the room row (kind `pending`).
4. Re-assign / Unassign allowed while the line is `pending` (popover actions). Not allowed once `checked_in`.
5. CheckInPage (`?booking_id=`) pre-fills the assigned room (already reads `restaurantTableId` via `fromPendingArrival`).
6. Multi-room bookings: assign per room line.

### Current behaviour

Button disabled; assignment only possible at check-in (`user-group-check-in room_id[]`) or at direct-booking creation (`direct-reservation rooms[].restaurant_table_id`).

---

### Evidence

- Screenshot: not provided (feature request)
- Steps to reproduce: Login → Rooms & Reservations → Reservations → scroll to "Unassigned Bookings (7)" → `Assign Room` is disabled (`title="Coming in Phase 5"`)
- Curl output: `/app/memory/evidence/INV-PMS-ENH/probe_07_discovery_routes.txt` — `assign-room`, `reservation-assign-room`, `local-reservations/{id}/assign-room`, `local-reservations/{id}`, `reservations/{id}`, `reservation/{id}` all **404**
- Data: `probe_01_local_reservations.json` — 7 pending lines with `restaurant_table_id: null` (5 Direct, 2 booking.com)
- Investigation: `/app/memory/PMS_ENHANCEMENTS_FEASIBILITY_INVESTIGATION.md` §2 E1
- Source: AGENT-DISCOVERED
- Confidence: CONFIRMED (endpoint absence live-verified; UI state code-verified)

---

### Open Questions (Owner Decisions)

| OD | Question | Options |
|---|---|---|
| OD-361-01 | Should staff be able to override the room type (assign an "executive" booking to a "suite" room = upgrade)? | a) No — same type only · b) Yes with reason text (Q2 pattern) |
| OD-361-02 | Who is authoritative when tape chart and status board disagree until backend fixes soft-allocation? | a) Tape chart (LR) · b) Board |
| OD-361-03 | Show unassigned count badge on Front Desk (S1) as a nudge? | yes / no |
| OD-361-04 | Auto-assign suggestion (first free room of type) — one-click? | yes / no (v2) |

---

### Files (expected — to be confirmed at Gate 2)

| File | Change |
|---|---|
| `api/constants.js` | +1 endpoint `ASSIGN_ROOM` |
| `api/services/pmsService.js` | +`assignRoom(reservationId, lineId, tableId)`, +`getAssignableRooms(res, ops)` (type filter + overlap check, pure/testable) |
| `pages/pms/ReservationsPage.jsx` | enable button, open picker, refetch; popover "Re-assign / Unassign" |
| `components/pms/AssignRoomPicker.jsx` (NEW) | room list dialog |

Files NOT touched: CheckInPage.jsx (already prefills), CollectPaymentPanel.jsx, OrderEntry.jsx, App.js.

---

## CR-367 — PMS — WhatsApp / SMS Guest Notifications (confirmation, check-in instructions, checkout reminder)

- Type: CR · Area: PMS / Rooms · Priority: P2 · Assignee: Parth · Client: NOT SET
- Status: INTAKE — BACKEND-BLOCKED
- Intake doc: `change_requests/CR-367_PMS_WHATSAPP_SMS_GUEST_NOTIFICATIONS_INTAKE.md`
- **Source:** AGENT-DISCOVERED (post-CR-358 enhancement list; templates pre-approved in CR-358 intake §9) — owner-selected 2026-09-04
- **Related:** CR-017 (WhatsApp Payment Link — only existing outbound WhatsApp path, order-bound), CR-358 intake §9 (message templates), BACKEND_BRIEF_CR358 §3 (self check-in link APIs B-03/04/05 — backend replied "Omit, Phase 2"), BUG-092 (phone format E.164 vs 10-digit), CR-078 CRM (guest phone source), `REACT_APP_CRM_API_KEYS` truncated (P1 config)

### Description

Guests should automatically receive: (1) booking confirmation when a Direct/phone booking is saved, (2) check-in instructions / room-ready message when a room is assigned (CR-361) or on arrival day, (3) checkout reminder on departure day, (4) balance-due payment link (existing CR-017 flow reused). Reduces no-shows and front-desk calls.

### Expected behaviour

| Trigger | Message (CR-358 intake §9 templates) | Channel | Mode |
|---|---|---|---|
| `createDirectReservation()` success | Booking confirmation (name, hotel, dates, nights, room type, balance due, self-CI link *if* S5 ever ships) | WhatsApp → SMS fallback | automatic (toggle) |
| Room assigned (CR-361) / arrival day 09:00 | "Your room is ready — Room N" / check-in instructions (address, timings, ID required) | WhatsApp/SMS | automatic (scheduler) or manual "Send" |
| Departure day 08:00 (in-house, checkout = today) | Checkout reminder + balance | WhatsApp/SMS | scheduler |
| Balance due (in-house, unpaid) | Payment link | existing `razor-pay/payment-link` | manual (already exists on OrderCard; expose in Folio) |
| Any | Manual resend from Arrivals / Folio with preview | WhatsApp/SMS | manual |
| Settings (Channel Manager → Notifications tab) | per-trigger on/off, hotel address/wifi/reception fields, template preview, delivery log | FE + backend config | — |
| Delivery log | per reservation: sent_at, channel, status (queued/sent/delivered/failed) | backend | — |

### Current behaviour

Nothing is sent to guests except the manual Razorpay payment link (needs an order → not possible for pending bookings).

---

### Evidence

- Curl: `probe_10_pos_side_routes.txt` — `send-whatsapp`, `whatsapp/send`, `send-sms`, `notification/send`, `guest-notification`, `aiosell/send-notification`, `aiosell/notify-guest` → **404**; `razor-pay/payment-link` → 405 GET / POST 404 *"No query results for model Order"* (order-bound)
- Backend position: `backend_replies/ques3_reply_2026_09_03.md` OD-P3-08 — "Omit. S5 / GAP-06 is Phase 2. No public token APIs."
- Data: `local-reservations.guest.phone/email` present for OTA rows, **null** for several sandbox Direct rows → needs phone required at New Booking (currently optional?) — Gate 2 to verify `NewBookingPage` validation
- Investigation: `PMS_ENHANCEMENTS_FEASIBILITY_INVESTIGATION.md` §2 E7
- Source: AGENT-DISCOVERED · Confidence: CONFIRMED (backend absence live-verified)

---

### Open Questions (Owner Decisions)

| OD | Question | Options |
|---|---|---|
| OD-367-01 | Consent: capture opt-in at New Booking? OTA guests — rely on OTA consent? | opt-in field / assume |
| OD-367-02 | Provider & budget owner for WhatsApp/SMS per message | existing BSP / new |
| OD-367-03 | Which triggers are on by default? | confirmation only / all |
| OD-367-04 | Include self check-in link (requires S5 backend) or plain instructions in v1? | plain / wait for S5 |
| OD-367-05 | Language(s) of templates | EN / EN+HI / per-restaurant |
| OD-367-06 | Phone normalisation rule (10-digit → +91) — reuse BUG-092 decision? | yes / configurable country code |

---

### Files (expected)

| File | Change |
|---|---|
| `api/services/notificationService.js` (NEW) | send / settings / log |
| `api/transforms/notificationTransform.js` (NEW) | |
| `api/constants.js` | +endpoints |
| `components/pms/SendGuestMessageDialog.jsx` (NEW) | preview + send + log |
| `pages/pms/NewBookingPage.jsx` | post-save auto-send hook (if FE-triggered) + phone required |
| `pages/pms/ArrivalsPage.jsx`, `DeparturesPage.jsx`, `GuestFolioPage.jsx` (CR-364) | "Message guest" action |
| `pages/pms/ChannelManagerPage.jsx` | Notifications settings tab |

Files NOT touched: paymentLinkService.js (reused), WhatsAppPaymentModal.jsx, OrderCard.jsx, CollectPaymentPanel.jsx.

---

## CR-381 — PMS — Laundry Management (linen queue, stock levels, dirty→clean processing, settings)

- Type: CR · Area: PMS / Rooms · Priority: - · Assignee: Parth · Client: NOT SET
- Status: INTAKE — Gate 2 pending OD-381-01 (standalone vs sub-tab) + CR-365 Gate 2 completion
- Intake doc: `change_requests/CR-381_PMS_LAUNDRY_MANAGEMENT_INTAKE.md`
- **Source:** AGENT-DISCOVERED — backend reply 2026-09-13 shipped full laundry sub-module endpoints outside original CR-365 scope
- **Related:** CR-365 (HK Workflow — checklist `laundry_issue`/`laundry_collect` actions push items into laundry queue; CR-381 is the downstream processor of that queue)

### Description

When housekeeping completes a room checklist with `laundry_issue` or `laundry_collect` actions, those linen items enter a **laundry queue** on the backend. Currently there is no FE screen to:
- See what dirty linen is waiting to be processed
- Know current clean stock levels
- Mark dirty items as cleaned and returned to stock
- Configure laundry settings (default assignee)

Backend has fully shipped the laundry model as part of the HK backend brief reply.

### Expected behaviour

| Capability | Detail |
|---|---|
| **Laundry queue** `/pms/laundry` | List of dirty items pending processing (per room, item type, qty). Filter by status (`pending`, `processed`). |
| **Stock view** | Current clean linen stock levels (item, count, unit). |
| **Process action** | Select queue items → mark dirty→clean (updates stock). Bulk: process all pending in one tap. |
| **Settings** | Default laundry assignee (staff member who processes laundry). |

### Current behaviour

No FE laundry screen exists. Checklist `laundry_issue`/`laundry_collect` actions post to backend but result is invisible to POS staff.

---

### Evidence

- **Backend endpoints confirmed live** in `evidence/INV-BE-REPLY-2026-09-13/be_reply_raw_2026_09_13.md`:

```
GET  /api/v2/vendoremployee/aiosell/laundry/settings       → laundry config
PUT  /api/v2/vendoremployee/aiosell/laundry/settings       → update (default_assignee_id)
GET  /api/v2/vendoremployee/aiosell/laundry/queue?status=  → dirty items pending
GET  /api/v2/vendoremployee/aiosell/laundry/stock          → clean stock levels
POST /api/v2/vendoremployee/aiosell/laundry/process        → mark dirty → clean
     body: { queue_item_ids: [1,2], assignee_id: 15 }
     (omit queue_item_ids to process all pending)
```

- **Assignees:** `GET /employee/employees-list` (filter client-side, same as CR-365)
- **Source:** AGENT-DISCOVERED from BE reply · **Confidence:** CONFIRMED

---

### Open Owner Decisions

| OD | Question | Options |
|---|---|---|
| **OD-381-01** | Route placement: standalone `/pms/laundry` page OR sub-tab inside CR-365 HK page `/pms/housekeeping`? | a) Standalone page (own sidebar child) · b) Sub-tab inside HK page |
| **OD-381-02** | Process action permission: all staff or manager/owner only? | all POS users / owner+manager only |
| **OD-381-03** | Should `process` action require selecting specific queue items, or always process all pending in one tap? | a) Select items (granular) · b) Process all (quick) · c) Both |

> **Note:** OD-381-01 determines whether `Sidebar.jsx` and `App.js` changes are needed (standalone) or this is absorbed into CR-365's HK page scope (sub-tab). Gate 2 can start once OD-381-01 is answered.

---

## CR-364-PRINT — PMS — Guest Folio Print Template (rtype=RM branch, ~60-field payload extension)

- Type: CR · Area: PMS / Rooms · Priority: P2 · Assignee: UNASSIGNED · Client: NOT SET
- Status: INTAKE — BACKEND-BLOCKED (Q-364P-01/08/09/10/13/15 unanswered). Parked until BE answers print questions. No FE work until order-temp-store behaviour + rtype=RM template confirmed.
- Intake doc: `change_requests/CR-364-PRINT_PMS_FOLIO_PRINT_TEMPLATE_INTAKE.md`
- **Source:** SCOPE SPLIT from CR-364 (2026-09-14) — print path deferred to keep CR-364 data-path planning clean
- **Related:** CR-364 (parent data path) · OD-364-02 (print = PMS folio via `rtype='RM'` — R6 owner sign-off required before live) · `orderTransform.js:buildBillPrintPayload` (R5 hotspot) · BACKEND_BRIEF_CR364_FOLIO_PRINT_2026_09_16.md (9 blocks, 15 questions)

### Description

When a hotel guest checks out, staff need to print a **PMS Guest Folio** — a document distinct from a standard F&B bill. It shows:
- Room header (guest name, room no, check-in/out, nights, channel, meal plan)
- Room charges line(s) with per-night breakdown
- GST on lodging
- All payments received (advance, interim, checkout) with dates and modes
- F&B posted to room (settled associated orders with item summary)
- Balance due / zero-balance confirmation
- Hotel branding + GST registration number

Today, `buildBillPrintPayload` sends `rtype='RM'` but the payload lacks the room-specific fields above. The print template server-side applies a generic F&B bill layout regardless of `rtype`.

---

### Scope

**FE scope (this CR):**
- Extend `buildBillPrintPayload` in `orderTransform.js` to populate ~20 PMS-specific fields when `order.isRoom === true`
- Fields sourced from existing `order.roomInfo`, `order.roomPaymentSummary`, `order.associatedOrders` — **no new API calls**
- All field values pass through as-is — **no arithmetic (R6)**

**Server-side scope (backend task — gated on BE answers):**
- `order-temp-store` accepts the extended payload
- Print template branches on `rtype='RM'` to render the PMS folio layout
- This is outside FE scope; FE passes every field and whatever backend ignores simply won't print (OD-364-02)

**Out of scope for v1:**
- Per-night room charge expansion (Q-364P-03 deferred)
- Dated payment history ledger per line (B-364-01 partial)
- Regulatory HSN/SAC codes (Q-364P-11 deferred)
- Reprint counter / folio_no (Q-364P-09 deferred)

---

### Evidence

- `orderTransform.js:L2216` — `rtype: order.isRoom ? 'RM' : 'TB'` already in payload (code reality PARTIAL)
- `src/api/transforms/__tests__/req3-room-bill-print.test.js` — existing test verifies `rtype='RM'` for room orders
- `orderTransform.js:L1839` — comment references hotel folio and `order-temp-store` endpoint
- Backend brief: `/app/memory/backend_briefs/BACKEND_BRIEF_CR364_FOLIO_PRINT_2026_09_16.md` — 9 blocks, ~60 keys, 15 Q
- Source: SCOPE SPLIT · Confidence: CONFIRMED (FE side); UNCONFIRMED (BE template side)

---

### Files (expected — FE only)

| File | Change | Hotspot? |
|---|---|---|
| `src/api/transforms/orderTransform.js` | Extend `buildBillPrintPayload` (+~30 lines) — add PMS fields when `order.isRoom === true` | **YES (R5)** |

Files NOT touched: `GuestFolioPage.jsx`, `folioTransform.js`, `pmsService.js`, `App.js`, `CollectPaymentPanel.jsx`, `PmsCheckoutDrawer.jsx`

---

## CR-384 — Channel Manager — Add default rateplan selector per room (supports rate auto-fill at booking)

- Type: CR · Area: PMS / Rooms · Priority: P2 · Assignee: Parth · Client: NOT SET
- Status: INTAKE — GATE 1 — BACKEND-BLOCKED (Change 1 + Change 2 both confirmed backend tasks)
- Registry notes: Both changes confirmed as backend tasks 2026-09-15. Change 1: POST /room-mapping must persist aiosell_rateplan_code. Change 2: GET /rooms must return room_code_defaults object. FE cannot proceed until both ship.

**REQUIREMENT NOT CAPTURED** — no intake doc. Owner to describe: what is wrong / what is wanted, which screen, which client, expected result.

### What the tracker / investigations already say

- `control/CR_REGISTRY.md`: **Last Updated:** 2026-09-15 — **CR-382 PARKED (OD-382-01: PARK). CR-383 PARKED (OD-383-01: PARK). BUG-409 PARKED (OD-409-01: PARK). CR-384 registered (BACKEND-BLOCKED — BACKEND_BRIEF_RATE_AUTOFILL). Registry: 673 items.**

---

# BATCH H — Backend-Blocked Performance & Data (6 items)

## BUG-610 — Menu Management: Bulk Editor + Card View slow to load (424 items, 616KB payload)

- Type: BUG · Area: Menu / Order Entry · Priority: P2 · Assignee: Gyan · Client: NOT SET
- Status: GATE_1_INTAKE_BACKEND_BLOCKED
- Registry notes: 2026-10-22: Intake. foods-list returns 616KB/2.8s for 424 items. Backend: lighter endpoint needed. FE: virtual scrolling in BulkEditor.
- Intake doc: `change_requests/BUG-610_MENU_MANAGEMENT_SLOW_LOAD_INTAKE.md`
- **Risk:** LOW
- **Source:** OWNER-REPORTED + INVESTIGATION

### Description

Menu Management (both Bulk Editor and Card View) takes 3+ seconds to load for restaurants with large menus. Cafe103 has 424 items — the `foods-list` API returns 616 KB in 2.8s. The FE then renders all 424 items into the DOM at once.

### Evidence (API probe, Cafe103, 2026-10-22)

| API | Time | Size |
|-----|:---:|:---:|
| `foods-list?food_for=Normal` | **2.84s** | **616 KB** |
| `categories` | 1.12s | 12 KB |
| `addon-list` | 1.10s | 1 KB |

Each item averages ~1.5 KB including full variation arrays, addon details, and image URLs.

### Blast Radius

SMALL-MEDIUM — BulkEditor.jsx (virtual scroll), backend foods-list endpoint

## BUG-611 — Inventory Dashboard (Stock Intelligence) stuck on loading skeletons — stock-inventory 2s+

- Type: BUG · Area: Inventory · Priority: P2 · Assignee: Parth · Client: NOT SET
- Status: GATE_1_INTAKE_BACKEND_BLOCKED
- Registry notes: 2026-10-22: Intake. stock-inventory API takes 2.07s for 36KB. Backend query optimization needed. FE loading states correct.
- Intake doc: `change_requests/BUG-611_INVENTORY_DASHBOARD_SLOW_LOAD_INTAKE.md`
- **Risk:** LOW
- **Source:** OWNER-REPORTED + INVESTIGATION

### Description

The Inventory Dashboard (`/inventory-dashboard`) Stock Intelligence page shows skeleton loading placeholders for extended periods. The `stock-inventory` API takes 2+ seconds to respond.

### Evidence (API probe, Cafe103, 2026-10-22)

| API | Time | Size |
|-----|:---:|:---:|
| `get-inventory-master` | 0.98s | 28 KB |
| `stock-inventory` | **2.07s** | 36 KB |

FE shows loading skeletons correctly — it's waiting for backend data.

### Blast Radius

NONE on FE — purely backend query performance.

## BUG-612 — Reports slow for long date ranges (year+) — backend query performance

- Type: BUG · Area: Reports / Analytics · Priority: P2 · Assignee: Gyan · Client: NOT SET
- Status: GATE_1_INTAKE_BACKEND_BLOCKED
- Registry notes: 2026-10-22: Intake. Year+ date ranges cause slow reports. FE chunking exists (BUG-353) for Order Report Beta. Backend query optimization needed for all report endpoints.
- Intake doc: `change_requests/BUG-612_REPORTS_SLOW_LONG_DATE_RANGES_INTAKE.md`
- **Risk:** LOW
- **Source:** OWNER-REPORTED + INVESTIGATION

### Description

Multiple report pages become very slow when selecting date ranges of a year or more. The FE already implements chunking for Order Report Beta (BUG-353: `_splitBetaDateRange`), but the underlying backend queries are the bottleneck.

### Evidence

- Owner reports: "lot of reports specially if we select for year or more"
- API probe: Order logs endpoint returned 403 (couldn't measure), Cancellations 365-day returned 0.6s (acceptable for Goan Kitchen but may be worse on high-volume restaurants)
- FE chunking already exists for Order Report Beta

### Blast Radius

Backend query layer. FE impact minimal.

## BUG-613 — Login boot slow — Products API bottleneck (2.4s / 616KB)

- Type: BUG · Area: Other · Priority: P2 · Assignee: Gyan · Client: NOT SET
- Status: GATE_1_INTAKE_BACKEND_BLOCKED
- Registry notes: 2026-10-22: Intake. Products API is boot bottleneck: 2.36s/616KB. Backend: lighter boot endpoint. FE: could defer full product load. Related BUG-610 (same endpoint, different context).
- Intake doc: `change_requests/BUG-613_LOGIN_BOOT_SLOW_PRODUCTS_API_INTAKE.md`
- **Risk:** LOW
- **Source:** OWNER-REPORTED + INVESTIGATION

### Description

When a restaurant logs in, the boot/loading screen takes 5+ seconds. The Products API (`foods-list`) is the bottleneck in the 8-API boot sequence, taking 2.4s and returning 616 KB for Cafe103's 424 items.

### Evidence (Boot sequence timing, Cafe103, 2026-10-22)

| API | Time | Size |
|-----|:---:|:---:|
| Login | 0.69s | 1 KB |
| Profile | 1.23s | 14 KB |
| Tables | 0.76s | 32 KB |
| Running Orders | 1.09s | 84 KB |
| **Products (Normal)** | **2.36s** | **616 KB** |
| Products (Aggregator) | 0.87s | 65 B |
| Popular Foods | 0.53s | — |

Products is the slowest API in the boot sequence. All 8 APIs run in Phase 1.

### Blast Radius

Backend endpoint + FE LoadingPage.jsx / product transform.

## BUG-630 — Item Sales Ledger 'Net Sales' definition wrong — includes GST/VAT/SC, should be after discount only (backend sends wrong total_sales)

- Type: BUG · Area: Reports · Priority: P0 · Assignee: Gyan · Client: NOT SET
- Status: GATE_1_INTAKE_BACKEND_BLOCKED
- Registry notes: BACKEND issue. Net Sales KPI shows ₹13,61,162 which is MORE than Gross Revenue ₹13,33,222 because backend total_sales includes GST+VAT+SC. Standard Net Sales = Gross - Discount (should be ₹12,96,586). Backend must send correct net figure excluding tax. FE label 'after disc+GST' is technically accurate for what backend sends but the definition itself is wrong. | 2026-10-31: Backend brief: backend_briefs/BACKEND_BRIEF_BUG-630_NET_SALES_2026_10_31.md
- Intake doc: `backend_briefs/BACKEND_BRIEF_BUG-630_NET_SALES_2026_10_31.md`

### Summary

- Issue: Item Sales Ledger `total_sales` field includes GST + VAT + Service Charge — "Net Sales" KPI shows higher value than "Gross Revenue"
- Classification: DATA_ISSUE
- Frontend impact: "NET SALES ₹13,61,162" displayed as larger than "GROSS REVENUE ₹13,33,222" — confusing for restaurant owners
- Priority/Risk: P1 / MEDIUM

### The Problem

FE computes:
```
Gross Revenue = item_price + variation_price + addon_price = ₹13,33,222
```

Backend sends:
```
total_sales = ₹13,61,162.42  (includes GST + VAT + Service Charge)
```

Math:
```
Gross Revenue:    ₹13,33,222.00
Discount:            ₹36,636.29
Gross - Discount: ₹12,96,585.71
total_sales:      ₹13,61,162.42  (₹64,576.71 MORE — that's GST+VAT+SC)
```

### Expected

`total_sales` should be the **net sales — amount before taxes:**
```
net_sales = item_price + variation_price + addon_price − discount
          = Gross Revenue − Discount
          = Net Sales (before GST, VAT, Service Charge)
```

This must EXCLUDE GST, VAT, and Service Charge. Net Sales must always be ≤ Gross Revenue.

Currently backend sends: `Gross − Discount + GST + VAT + SC` (total billed with tax)
Should send:             `Gross − Discount` (net sales before tax)

## CR-469 — When restaurant is created, POS should auto-login on CRM via API and store token

- Type: CR · Area: CRM / Customer · Priority: P0 · Assignee: Gyan · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: 2026-10-22: from TT-040. High priority per owner. New restaurant setup must auto-create CRM session and store token so customer features work immediately.

**REQUIREMENT NOT CAPTURED** — no intake doc. Owner to describe: what is wrong / what is wanted, which screen, which client, expected result.

---

# BATCH I — Printer Agent (Piyush / PA team) (12 items)

## BUG-469 — Dual Printer Agent — Bill Content employee ID resets after refresh

- Type: BUG · Area: Printing / Printer Agent · Priority: - · Assignee: Piyush · Client: NOT SET
- Status: GATE_1_INTAKE
- Registry notes: With 2 Printer Agents installed, second agent employee-ID config resets on refresh. May be localStorage keyed by agent index not agent ID.
- Intake doc: `change_requests/BUG-469_DUAL_PRINTER_AGENT_EMPLOYEE_ID_RESETS_INTAKE.md`
- **Source:** OWNER-REPORTED 2026-09-27 (batch intake)

### Description

When **two Printer Agents** are installed, the **Bill Content** employee configuration only properly supports one employee ID. The second Printer Agent requires manual employee ID changes after each page refresh — the value does not persist.

---

### Evidence

| Item | Detail |
|---|---|
| Source | OWNER-REPORTED |
| Screenshot | Not provided |
| Steps to reproduce | OWNER WILL PROVIDE LATER |
| Confidence | REPORTED |

---

### Blast Radius

- FE: MEDIUM — printer config storage (likely keyed by agent index, not agent ID)
- Scope: SMALL (dual-PA setup only)

---

### Open Questions — OWNER WILL ANSWER LATER

- OD-469-01: Is the employee ID stored per-agent or globally?
- OD-469-02: Does the first agent's employee ID also reset, or only the second?
- OD-469-03: Which localStorage key is being reset?

---

## BUG-474 — Printer Agent cannot be updated on Windows 7

- Type: BUG · Area: Printing / Printer Agent · Priority: - · Assignee: Piyush · Client: NOT SET
- Status: GATE_1_INTAKE
- Registry notes: Windows 7 compatibility issue with Printer Agent update. Likely Electron/auto-update requires Windows 8+. Escalate to Printer Agent team.
- Intake doc: `change_requests/BUG-474_PRINTER_AGENT_WINDOWS7_UPDATE_FAILS_INTAKE.md`
- **Source:** OWNER-REPORTED 2026-09-27 (batch intake)

### Description

The **Printer Agent** application cannot be updated on machines running **Windows 7**. The update process fails or is incompatible.

---

### Evidence

| Item | Detail |
|---|---|
| Source | OWNER-REPORTED |
| Screenshot | Not provided |
| Steps to reproduce | OWNER WILL PROVIDE LATER |
| Confidence | REPORTED |

---

### Blast Radius

- FE: NONE
- Printer Agent team: MEDIUM
- Scope: SMALL (Windows 7 machines only)

---

### Open Questions — OWNER WILL ANSWER LATER

- OD-474-01: What Printer Agent version is installed? What version is it trying to update to?
- OD-474-02: What error message appears during update?
- OD-474-03: How many machines are affected?

---

## BUG-476 — Printer Agent set to Direct Print — Bill and KOT both stopped printing

- Type: BUG · Area: Printing / Printer Agent · Priority: P0 · Assignee: Piyush · Client: NOT SET
- Status: GATE_1_INTAKE
- Registry notes: After switching to Direct Print mode in Printer Agent, both Bill and KOT stopped printing entirely. Likely Direct Print requires different config (IP/port) that was not set, or Direct Print mode has a regression.
- Intake doc: `change_requests/BUG-476_PRINTER_AGENT_DIRECT_PRINT_KILLS_BILL_KOT_INTAKE.md`
- **Source:** OWNER-REPORTED 2026-09-27 (batch intake)

### Description

After changing **Printer Agent setting to Direct Print mode**, both **Bill printing and KOT printing stopped working entirely**. Reverting the config or re-configuring has not been described yet.

---

### Evidence

| Item | Detail |
|---|---|
| Source | OWNER-REPORTED |
| Screenshot | Not provided |
| Steps to reproduce | OWNER WILL PROVIDE LATER |
| Confidence | REPORTED |

---

### Blast Radius

- FE: NONE
- Printer Agent: HIGH — Direct Print mode regression
- Scope: SMALL (one config change broke all printing)

---

### Open Questions — OWNER WILL ANSWER LATER

- OD-476-01: What PA version was this on? Was Direct Print ever working before?
- OD-476-02: Does the PA show any error in its logs?
- OD-476-03: What printer model/protocol — USB, network, or Bluetooth?
- OD-476-04: Was this on the same machine or a new setup?

---

## BUG-479 — Customer name missing after Printer Agent update — phone lookup returns nothing

- Type: BUG · Area: Printing / Printer Agent · Priority: - · Assignee: Piyush · Client: NOT SET
- Status: GATE_1_INTAKE
- Registry notes: After PA update, customer phone lookup in PA fails. Same number works in app. Likely PA is calling a stale CRM endpoint or PA does not inherit updated CRM auth token.
- Intake doc: `change_requests/BUG-479_CUSTOMER_NAME_MISSING_AFTER_PA_UPDATE_INTAKE.md`
- **Source:** OWNER-REPORTED 2026-09-27 (batch intake)

### Description

After a **Printer Agent update**, entering a customer phone number in the PA does **not retrieve the customer name**. The same phone number entered in the app (browser POS) correctly retrieves the customer. The PA's CRM lookup appears to have broken post-update.

---

### Evidence

| Item | Detail |
|---|---|
| Source | OWNER-REPORTED |
| Screenshot | Not provided |
| Steps to reproduce | OWNER WILL PROVIDE LATER |
| Confidence | REPORTED |

---

### Open Questions — OWNER WILL ANSWER LATER

- OD-479-01: Which PA version was this introduced in?
- OD-479-02: Does the PA show an error or just return empty?
- OD-479-03: Is the PA using a different API base URL for CRM after the update?

---

## BUG-554 — Unstable connection — Printer Agent: bill/KOT prints fail, duplicate, or delay

- Type: BUG · Area: Printing / Printer Agent · Priority: P0 · Assignee: Piyush · Client: NOT SET
- Status: GATE_1_INTAKE

**REQUIREMENT NOT CAPTURED** — no intake doc. Owner to describe: what is wrong / what is wanted, which screen, which client, expected result.

### What the tracker / investigations already say

- `control/CR_REGISTRY.md`: **CURRENT 2026-10-15 — BATCH INTAKE (20 new + 7 updates):** BUG-542 (Old POS graphs incorrect P1), BUG-548 (Old POS summary graphs P1), BUG-553 (Old POS Android ringer P1), BUG-543 (auto vs manual print rounding P1), BUG-554 (unstable connection print duplicate/fail P1), BUG-544 (PMS Coming Soon sidebar P1), BUG-545 (Remove Item Report = Coming Soon P1), BUG-546 (Split Bill label in Order Report P1), BUG-549 (Average Sales Monthly incorrect P1), BUG-547 (doughnut chart = 0 P1), BUG-550 (App Info

## BUG-668 — UPI ID Update Not Reflecting Until Printer Agent Refresh

- Type: BUG · Area: Printing / Printer Agent · Priority: P0 · Assignee: Piyush · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE
- Registry notes: Wrong UPI ID on bills until printer agent refresh. Printer agent communication + settings propagation issue.
- Intake doc: `change_requests/09_BUG-668_UPI_ID_NOT_REFLECTING_PRINTER_AGENT_INTAKE.md`

### 1. Description

When the UPI ID is updated in the POS settings, the change is not reflected in the printer agent (and presumably on printed bills) until the printer agent is manually refreshed/restarted.

**Current behaviour:** UPI ID change is saved in settings, but the printer agent continues using the old UPI ID until it is manually refreshed. This causes incorrect UPI IDs on printed bills.

**Expected behaviour:** UPI ID change should propagate to the printer agent immediately (or the printer agent should fetch the latest settings on each print job) without requiring a manual refresh.

---

### 4. Evidence

- **Source:** OWNER-REPORTED (2026-11-12 batch)
- **Confidence:** CONFIRMED

---

### 6. Blast Radius

- Settings update flow — may need to notify printer agent after UPI ID change
- Printer Agent integration (separate service — may be a Printer Agent bug not FE)
- **Estimated scope:** SMALL-MEDIUM (1–2 files, possibly Printer Agent team responsibility)

---

### 8. Open Questions

- OQ-668-01: Is this a FE issue (not pushing update), a Printer Agent issue (not fetching on change), or backend (not broadcasting)?
- Investigation needed before planning

---

## BUG-345 — Printer Style Tab: Row Labels Show Generic Row 1/2/3/4 Instead of Field Names

- Type: BUG · Area: Printing / Printer Agent · Priority: P2 · Assignee: Piyush · Client: NOT SET
- Status: INTAKE
- Registry notes: | RENUMBERED from BUG-333 → BUG-345 2026-08-22 (duplicate ID collision resolved — canonical BUG-333 entry kept for: New Order Always Opens as Walk-In (handleAddOrder )

**REQUIREMENT NOT CAPTURED** — no intake doc. Owner to describe: what is wrong / what is wanted, which screen, which client, expected result.

## CR-152 — Test Connection for LAN Printer

- Type: CR · Area: Printing / Printer Agent · Priority: P2 · Assignee: Piyush · Client: NOT SET
- Status: INTAKE

**REQUIREMENT NOT CAPTURED** — no intake doc. Owner to describe: what is wrong / what is wanted, which screen, which client, expected result.

### What the tracker / investigations already say

- `control/CR_REGISTRY.md`: | **CR-168** | **Printer Agent: Test Print Job + Live Printer Status.** `PrintersTab.jsx:273-276` has two disabled stubs — "Status — Coming soon" (grey dot) + "Test Print — Coming soon" (disabled button). This CR wires them up: Part A = live connectivity status indicator per printer (green/red/grey dot). Part B = working Test Print button that sends a real test print job through the printer agent. No financial logic. API endpoint unknown — OQ-1 must be answered at Gate 2. Code reality: PARTIAL (

## CR-168 — Printer Agent: Test Print Job + Live Printer Status (wire up Coming Soon stubs)

- Type: CR · Area: Printing / Printer Agent · Priority: P2 · Assignee: Piyush · Client: NOT SET
- Status: INTAKE

**REQUIREMENT NOT CAPTURED** — no intake doc. Owner to describe: what is wrong / what is wanted, which screen, which client, expected result.

### What the tracker / investigations already say

- `control/CR_REGISTRY.md`: ### 2026-08-18 Intake — CR-168, CR-169 (Printer Setup: Missing CRs)
- `control/CR_REGISTRY.md`: | **CR-168** | **Printer Agent: Test Print Job + Live Printer Status.** `PrintersTab.jsx:273-276` has two disabled stubs — "Status — Coming soon" (grey dot) + "Test Print — Coming soon" (disabled button). This CR wires them up: Part A = live connectivity status indicator per printer (green/red/grey dot). Part B = working Test Print button that sends a real test print job through the printer agent. No financial logic. API endpoint unknown — OQ-1 must be answered at Gate 2. Code reality: PARTIAL (

## CR-403 — Desktop shortcut for Printer Agent application

- Type: CR · Area: Printing / Printer Agent · Priority: - · Assignee: Piyush · Client: NOT SET
- Status: GATE_1_INTAKE
- Registry notes: Printer Agent installer should create desktop shortcut. Support/Installer team task — not FE.
- Intake doc: `change_requests/CR-403_DESKTOP_SHORTCUT_PRINTER_AGENT_INTAKE.md`
- **Source:** OWNER-REPORTED 2026-09-27 (batch intake)

### Requirement

The **Printer Agent installer** should automatically create a **desktop shortcut** so staff can easily launch the application without searching through the file system.

---

### Open Questions — OWNER WILL ANSWER LATER

- OD-403-01: Windows only, or also Mac/Linux?
- OD-403-02: Should the shortcut be created in a specific location (Desktop, Taskbar, Start Menu)?

---

## CR-500 — iPhone WiFi Printing Support (Printer Agent Team — Tracking Only)

- Type: CR · Area: Printing / Printer Agent · Priority: P0 · Assignee: Piyush · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE — TRACKING ONLY. Printer Agent team owns implementation.
- Registry notes: No POS FE code needed. Registered for visibility/tracking. Printer Agent team implements. Related: BUG-468.
- Intake doc: `change_requests/CR-500_IPHONE_WIFI_PRINTING_INTAKE.md`
- **Classification:** CR
- **Severity:** P1 — HIGH
- **Risk:** MEDIUM (Printer Agent team scope — FE tracking only)

### Description

Enable WiFi printing from iPhone devices. This involves the Printer Agent / printing infrastructure supporting iOS devices connecting over WiFi to print bills and KOTs.

**Expected behavior:** Users on iPhones can print bills/KOTs via WiFi-connected printers through the Printer Agent.

**Current behavior:** WiFi printing infrastructure exists (`wifi_printer_ip`, `wifi_printer_name` in `printerAgentSelector.js` and `stationConfigTransform.js`), but iPhone-specific WiFi printing support is incomplete or not working.

---

### Evidence

- **Source:** OWNER-REPORTED
- **Confidence:** REPORTED (unverified — Printer Agent team scope)

---

### Blast Radius

- **FE scope: NONE (tracking only)** — Printer Agent team handles implementation
- Estimated scope: N/A for POS frontend

---

### Open Questions

- None — Printer Agent team owns implementation. FE tracks for visibility only.

## CR-501 — On Update Order: Running Order Print in KOT (Printer Agent Team — Tracking Only)

- Type: CR · Area: Printing / Printer Agent · Priority: P0 · Assignee: Piyush · Client: NOT SET
- Status: GATE_1_INTAKE_COMPLETE — TRACKING ONLY. Printer Agent team owns implementation.
- Registry notes: No POS FE code needed. Registered for visibility/tracking. Printer Agent team implements. Related: CR-395.
- Intake doc: `change_requests/CR-501_UPDATE_ORDER_RUNNING_ORDER_KOT_PRINT_INTAKE.md`
- **Classification:** CR
- **Severity:** P1 — HIGH
- **Risk:** MEDIUM (Printer Agent team scope — FE tracking only)

### Description

When an order is updated (items added/modified to a running order), the KOT (Kitchen Order Ticket) should print showing the running order state — i.e., the full current order or the delta of changes, as per kitchen workflow requirements.

**Expected behavior:** On order update, a KOT is printed reflecting the running order changes so the kitchen has accurate, up-to-date item information.

**Current behavior:** KOT printing on update exists in `orderTransform.js` (L1177-1271, `CR-POS2-003-REOPEN-A`) with station-based printer agent routing. The update KOT currently sends only newly-added lines. The CR may require printing the full running order state or additional context.

---

### Evidence

- **Source:** OWNER-REPORTED
- **Confidence:** REPORTED (Printer Agent team scope)

---

### Blast Radius

- **FE scope: NONE (tracking only)** — Printer Agent team handles implementation
- Estimated scope: N/A for POS frontend

---

### Open Questions

- None — Printer Agent team owns implementation. FE tracks for visibility only.

---

# BATCH J — Tooling (1 items)

## CR-369 — Write AGENT_PROMPT_ALPHA_v0.8.md

- Type: CR · Area: Tooling / Control Layer · Priority: P3 · Assignee: Abhishek · Client: NOT SET
- Status: INTAKE
- Intake doc: `change_requests/CR-369_AGENT_PROMPT_ALPHA_V08_WRITE_INTAKE.md`

### 1. Summary

Write the new agent rulebook `control/AGENT_PROMPT_ALPHA_v0.8.md` based on the 10-gap analysis and all 6 owner decisions (D1–D6) captured in `control/AGENT_PROMPT_GAP_ANALYSIS_v0.8.md`. v0.7 stays untouched. v0.8 is a NEW file (~350 additive lines). Goes **live only after CR-368 is CLOSED** (D3-b).

---

### 2. Scope

Write `control/AGENT_PROMPT_ALPHA_v0.8.md` with the following additions over v0.7:

| Section | Covers | Gap |
|---|---|---|
| § MODE STATE MACHINE | Mode list + declaration format + transition table + `TRANSITION: X→Y APPROVED` token | GAP-01, D5 |
| § SCOPE LOCK | First-response scope declaration + mid-session change protocol | GAP-09 |
| § BOOT PREFLIGHT (STEP -0.5) | 6 required checks before role work; BLOCKED-INPUT protocol | GAP-03 |
| § MISSING-INPUT PROTOCOL (MIP) | REQUIRED/OPTIONAL tags; HALT/ASK/ASSUME-AND-FLAG options | GAP-03 |
| § CONFIDENCE LABELS | HIGH/MEDIUM/LOW + generalisation sample-statement rule | GAP-02 |
| § GATE 5c REGRESSION | Full baseline run; applies to MEDIUM+ risk or R5/R6 files only (D2-b) | GAP-04 |
| § REGRESSION_BASELINE contract | Canonical Jest command + expected summary + known-failure allow-list | GAP-04 |
| Role deltas — INVESTIGATION | Confidence labels; no-register rule for MEDIUM/LOW findings | GAP-02 |
| Role deltas — IMPLEMENTATION | Exit Gate item 6 (baseline run); forbidden IMPLEMENT→QA same session (D1-a) | GAP-04, D1 |
| Role deltas — QA | Machine-evidence rule; import-from-src rule; independence enforcement (D1-a) | GAP-05 |
| Rule R26 Production Surface | `public/` allow-list; `.bak` ban; `PUBLIC_ROUTES.md` justification | GAP-07 |
| Rule R27 Canonical enums | `sync_registry.py` as only permitted registry update method (D4-a) | GAP-06 |
| Rule R28 Confidence labels | Mirrors § CONFIDENCE LABELS for inline reference | GAP-02 |
| § UNIVERSAL FINAL-RESPONSE FOOTER | `MODE · ITEM · GATE · REGRESSION · BLOCKED-INPUTS · ASSUMPTIONS · SCOPE DELTA · NEXT MODE` | GAP-10 |
| § ENV & CREDENTIALS | Points to `ENV_REGISTRY.md` + `test_credentials.md`; Boot Preflight fails if missing | GAP-08 |
| § REMEDIATION QUEUE | Baseline remediation order from `PROJECT_BASELINE_2026_09.md` §9 baked in (D6-yes) | D6 |
| § CHANGELOG v0.8 | Summary of all changes from v0.7 | — |

---

### 4. Evidence

- **Screenshot:** not provided (doc-only CR — no UI screenshot applicable)
- **Steps to reproduce:** not applicable — this is a doc creation task, not a reproducible defect
- **Curl output:** not applicable
- **Source:** AGENT-DISCOVERED — decisions D1–D6 captured 2026-09-08; gap analysis at `control/AGENT_PROMPT_GAP_ANALYSIS_v0.8.md`
- **Confidence:** CONFIRMED — all 6 owner decisions locked; gap analysis complete; blocked only on CR-368

---

### 7. Blast Radius

- Files: `control/AGENT_PROMPT_ALPHA_v0.8.md` (NEW, ~350 lines)
- Hotspot files: NO
- Scope: SMALL (1 new file)
- Downstream: activates new agent behaviour for all future sessions

---

### 8. Owner Decisions

All 6 already answered (D1–D6). No open questions.

---

---

# BATCH Z — Unbatched (1 items)

## CR-427 — Move Loyalty, Coupon Code, E-Invoice and WhatsApp configuration from CRM to POS via CRM API

- Type: CR · Area: CRM / Customer Intelligence · Priority: P3 · Assignee: Abhishek · Client: NOT SET
- Status: GATE_1_INTAKE

**REQUIREMENT NOT CAPTURED** — no intake doc. Owner to describe: what is wrong / what is wanted, which screen, which client, expected result.

### What the tracker / investigations already say

- `control/CR_REGISTRY.md`: **CURRENT 2026-10-15 — BATCH INTAKE FINAL (23 new items registered):** BUG-556 (Auto bill prints "Unpaid" when payment done, Printing P1), BUG-557 (Delivery Assign option missing when config=Delivered, Order Entry P1), CR-427 (Move Loyalty/Coupon/E-Invoice/WhatsApp config from CRM to POS via CRM API, CRM P1). Plus previously registered batch: BUG-542/548/553 (Old POS), BUG-543/554 (Printing), BUG-544 (PMS), BUG-545/546/549 (Reports), BUG-547 (Dashboard), BUG-550/551 (Auth+Sidebar), BUG-552/555 (

---

## Items with no requirement captured (25)

CR-058, CR-071, CR-536, BUG-118, CR-126, CR-425, CR-537, CR-539, CR-138, CR-050, BUG-192, CR-424, CR-535, CR-154, CR-151, CR-421, CR-538, BUG-193, CR-384, CR-469, BUG-554, BUG-345, CR-152, CR-168, CR-427
