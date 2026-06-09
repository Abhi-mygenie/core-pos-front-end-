# CR-001: Fix Status Derivation + Filter Structure in All Orders Report (Paylater/Hold misclassification, wrong fallback, and Channel/Platform/Status filter correction)

## Status
- cr_approved_for_planning

## Approval
- Approved by user on 2026-04-28. Approval phrase: "approved / freeze all".

## Raw User Request
- On the All Orders tab of the Audit Report, the STATUS column shows paid / unpaid / cancelled / etc. Issues raised by the user:
  1. The default fallback to `paid` (when no rule matches) is wrong.
  2. Paylater (Hold) orders are showing under the Unpaid tab and/or with `unpaid` status. They must be classified as Hold only.
  3. User confirmed that paylater orders carry `f_order_status === 9` (backend "Pending Payment" code) and that this should be the canonical trigger for Hold.
  4. User confirmed that when no rule matches, the order should be routed to the Audit tab (so the Audit tab is the catch-all for any order in the sequence that does not fall into any specific tab).
  5. **Amendment (2026-04-28):** The Audit Report filter bar (`Status`, `Payment`, `Channel`, `Platform`) has semantic errors:
      - `Status` filter is missing `On Hold`.
      - `Channel` filter is missing `Delivery` and `Takeaway` and must contain only order/service channels: Dine-in, Delivery, Takeaway, Room.
      - `Platform` filter is currently disabled ("Coming soon"). It must be enabled and contain `POS` and `Web` (source of order), with values supplied by the backend.
      - Current code mixes POS/Web (which are platforms) with channels in places — the correction separates them: **Platform = source (POS, Web), Channel = type (Dine-in, Delivery, Takeaway, Room).**
  6. **Amendment (2026-04-28, room scope):** The Audit Report must show **ONLY table orders**. All room orders (`order_in === 'RM'`, `order_in === 'SRM'`, and `payment_method === 'ROOM'`) must be REMOVED from every tab of this report and will move to a separate PMS-like view tracked in **CR-004**.
      - Consequence: `Channel` filter must NOT contain a `Room` value (corrected list: `Dine-in / Takeaway / Delivery`).
      - Consequence: `Transferred` tab becomes empty and is removed from the tab list (OQ-Room-1).
      - Consequence: `roomTransfer` key removed from `statusBreakdown`.
      - Consequence: Because room and table orders share the same numeric order-ID series (user-confirmed), room orders must be filtered out **before** gap detection (`insertMissingOrders` + missing-count calc in `AllOrdersReportPage.jsx`) to avoid false "missing" flags.
  7. **Amendment (2026-04-28, payment gateway filter):** Add a checkbox-style top-level filter on the Audit Report filter bar to filter orders that came via the Razorpay payment gateway. Detection rule: an order is "from payment gateway" when the backend field `razorpay_order_id` has a non-empty value; otherwise it is a non-gateway order. "Top level — nothing else changes" — the checkbox sits alongside Status / Payment / Channel / Platform filters; no other tab or column behavior is altered.

## Request Type
- behavior change (defect in status derivation + tab filter logic in Reports module, Audit tab scope extension, **and filter bar structure correction — Status / Channel / Platform**)

## Business Context
- The All Orders tab is used for daily audit / reconciliation. Incorrect STATUS badges and overlap between Hold and Unpaid tabs cause operator confusion, may mis-report unpaid dues, and mis-classify Hold (pending-payment) orders as regular unpaid receivables.
- A silent `paid` fallback hides edge cases so missed-payment rows can be mistaken for successfully collected ones. Unmatched orders must instead surface in the Audit tab so operators can reconcile them explicitly.

## Current Behavior
- File: `frontend/src/api/services/reportService.js` → `getOrderLogsReport()` (lines ~389–491).
- Status is derived from three raw fields: `payment_method`, `payment_status`, `f_order_status`, plus `order_in`.
- Current priority rules (first match wins):
  1. `payment_method === 'Cancel'` → `cancelled`
  2. `payment_method === 'Merge'` OR `payment_status === 'Merge'` → `merged`
  3. `payment_method === 'TAB'` → `credit`
  4. `payment_method === 'ROOM'` OR `order_in === 'SRM'` → `transferred`
  5. `payment_status === 'unpaid'` → `unpaid`
  6. `f_order_status === 6` → `paid`
  7. Default (no match) → `paid` ← **silent wrong fallback**
- There is NO rule for paylater / Hold / `f_order_status === 9`. A paylater order with `payment_status === 'unpaid'` hits rule #5 and is tagged `unpaid`.
- `pages/AllOrdersReportPage.jsx → TAB_FILTERS`:
  - `hold: (o) => o.paymentMethod?.toLowerCase() === 'paylater'`
  - `unpaid` filter does NOT exclude paylater, so paylater orders appear under both On Hold tab AND Unpaid tab.
  - `audit: (o) => o._isMissing === true` — currently only missing-order-ID placeholders, not real unmatched orders.

## Evidence From Code That `f_order_status === 9` = Pending Payment / Hold
- `frontend/src/pages/StatusConfigPage.jsx` line 95: `{ id: "pendingPayment", fOrderStatus: 9, label: "Pending Pay", description: "Awaiting payment" }`
- `frontend/src/api/constants.js` line 159: `{ id: 9, fOrderStatus: 9, name: 'Pending Payment', key: 'pendingPayment' }`
- `frontend/src/components/layout/Header.jsx` line 25: `{ id: "pendingPayment", fOrderStatus: 9, label: "Pending Pay" }`
- `frontend/src/utils/statusHelpers.js` line 81: `pendingPayment: 6, // fOrderStatus 9 — awaiting payment`
- Conclusion: `f_order_status === 9` is the canonical backend signal for Pending Payment / Hold / paylater.

## Expected Behavior
- Any order with `f_order_status === 9` OR `payment_method === 'paylater'` (case-insensitive) must be classified as `hold`:
  - STATUS column badge = `Hold`
  - Routed only to the On Hold tab
  - Never appears in the Unpaid tab
- When none of the known priority rules match an order, the order is classified as `audit`:
  - Shown in the Audit tab (in addition to the existing missing-order-ID placeholders from gap detection)
  - Counted in the Audit tab badge/count
  - Not shown under any other specific tab
  - Visible on the All tab with a badge indicating it needs audit review
- No order ever silently defaults to `paid`.

## Confirmed Scope
- CS-1: In `reportService.js::getOrderLogsReport`, add a new priority rule **before** the `payment_status === 'unpaid'` rule:
  - If `f_order_status === 9` OR `payment_method?.toLowerCase() === 'paylater'` → `hold`
- CS-2: In the same function, replace the silent default `paid` fallback with `audit`. Any order that does not match rules 1–6 gets status `audit`.
- CS-3: In `AllOrdersReportPage.jsx::TAB_FILTERS.unpaid`, explicitly exclude paylater / Hold:
  - `if (o.paymentMethod?.toLowerCase() === 'paylater') return false;`
  - `if (o.fOrderStatus === 9) return false;`
- CS-4: In `AllOrdersReportPage.jsx::TAB_FILTERS.audit`, extend the filter so that, in addition to the existing `_isMissing === true` placeholders, real orders with `status === 'audit'` are also included.
- CS-5: Update the Audit tab count and indicator so it reflects: `missingCount + unmatchedOrdersCount`. The red/green indicator behavior (red when > 0, green when 0) stays the same — now it will also turn red when unmatched orders exist.
- CS-6: Add `hold` to the All-tab `statusBreakdown` object in `AllOrdersReportPage.jsx` (lines ~253–264). Add `audit` count too so the totals reconcile.
- CS-7: Ensure `status: 'audit'` has a corresponding badge label and style in `components/reports/OrderTable.jsx` (`getStatusBadgeStyle`, `getStatusLabel`). If not already present, add it (suggested styling: amber/yellow or similar neutral-warning tone — visually distinct from `missing` red and `running` yellow-fill).
- CS-8: No change in behavior for Paid / Cancelled / Credit / Merged / Transferred / Aggregator tabs.
- CS-9: For the edge case `paylater + payment_status === 'paid'`, the order stays in Hold (method-first rule — confirmed by user).

### Filter Bar Amendment (added 2026-04-28)
- **CS-10 (Status filter):** In `frontend/src/components/reports/FilterBar.jsx → STATUS_FILTER_OPTIONS` (currently lines 84–91), add a new option `{ value: 'hold', label: 'On Hold' }`. Also ensure the filter works with orders carrying `status === 'hold'` from CR-001's derivation fix.
- **CS-11 (Channel filter):** In `FilterBar.jsx → CHANNEL_OPTIONS` (currently lines 105–108), replace the current list `[dinein, room]` with the full list (CORRECTED 2026-04-28 — removes `Room`, adds `Aggregator`):
  - `{ value: 'dinein', label: 'Dine-in' }`
  - `{ value: 'takeaway', label: 'Takeaway' }`
  - `{ value: 'delivery', label: 'Delivery' }`
  - `{ value: 'aggregator', label: 'Aggregator' }`
  - Channel `room` is NOT present — rooms are removed from the Audit Report per CS-16 and CR-004.
  - Aggregator rows are identified by `order_in ∈ ['zomato', 'swiggy']` (existing rule in `TAB_FILTERS.aggregator`).
- **CS-12 (Platform filter):** In `FilterBar.jsx` (currently line 185–193), remove `disabled={true}` and the `disabledTooltip="Coming soon"` so the Platform filter is enabled. Keep `PLATFORM_OPTIONS` as `[pos, web]`. The dropdown options stay the frontend constant (UI labels) while the filter value sourced on each order comes from the backend-supplied `platform` field (see OQ-F2 for backend field name).
- **CS-13 (Channel vs Platform separation — wiring — CORRECTED 2026-04-28 v2):** **`order_type` is the backend field for CHANNEL (dinein / takeaway / delivery / room), NOT Platform.** Platform comes from a separate backend key — **name to be provided by user (pending OQ-F2).** The corrections required:
  - `reportService.js::getOrderLogsReport` must read `order_type` and normalize it into the `channel` field on the transformed object, with mapping values: `dinein`, `takeaway`, `delivery`, `room`. This matches the partial mapping already present in `reportTransform.js::cancelledOrder` (lines 209–211).
  - `reportService.js::getOrderLogsReport` must read the (TBD) platform backend key and populate `platform` on the transformed object with values `pos` / `web`.
  - `AllOrdersReportPage.jsx` — `filters.channel` application (lines ~238–243) must be replaced with a match against the normalized `channel` field. The current mapping of `channel === 'room'` to `orderIn ∈ [RM, SRM]` + `paymentMethod === 'ROOM'` must be re-evaluated after user answers OQ-F6 (RM/SRM business-logic clarification).
  - `AllOrdersReportPage.jsx` — `filters.platform` application must be added (it currently does nothing because the filter is disabled). Match against the normalized `platform` field.
  - Final authoritative mapping is pending OQ-F1 (full `order_type` → channel value list), OQ-F2 (platform backend key name + values), and OQ-F6 (RM/SRM handling).
- **CS-14 (Channel/Platform mutual exclusion):** The Channel filter must NEVER contain `POS` or `Web` values, and the Platform filter must NEVER contain Dine-in / Delivery / Takeaway / Room values. They are two independent filters that can be combined (AND-ed).
- **CS-15 (Platform data dependency):** The `platform` field on each order must be populated by the backend and surfaced via `getOrderLogsReport` (it is currently set to `null` in `reportTransform.js` — see GAP-002 note). The exact backend field name is pending OQ-F2.

### Room-Orders Removal (added 2026-04-28)
- **CS-16 (Global room exclusion):** All room orders must be removed from every tab of the Audit Report. "Room order" = any order where at least one is true:
  - `order_in === 'RM'`
  - `order_in === 'SRM'`
  - `payment_method === 'ROOM'`
- **CS-17 (Apply exclusion before every tab filter):** In `AllOrdersReportPage.jsx`, the exclusion from CS-16 must be applied as a global pre-filter to `allOrders` before running the tab-specific `TAB_FILTERS`. This is cleaner than editing each tab filter individually and prevents future regressions.
- **CS-18 (Apply exclusion before gap detection):** Because user confirmed that room orders and table orders share the same numeric order-ID series, the gap-detection logic in `AllOrdersReportPage.jsx` (lines 152–188) and `OrderTable.jsx::insertMissingOrders` must operate on the **post-exclusion** list. Room-order IDs must never appear as "missing" on the Audit tab.
- **CS-19 (Delete Transferred tab from ALL_ORDERS_TABS):** Remove the `transferred` entry from the tab list in `AllOrdersReportPage.jsx` (line ~32). Also remove the `transferred` key from `TAB_FILTERS` (lines 62–67) and from `STATUS_FILTER_OPTIONS` in `FilterBar.jsx` if present.
- **CS-20 (Channel filter correction):** Remove `Room` from `CHANNEL_OPTIONS`. Corrected list: `[Dine-in, Takeaway, Delivery]`. This supersedes CS-11.
- **CS-21 (statusBreakdown cleanup):** Remove the `roomTransfer` entry from the All-tab `statusBreakdown` computation and pills (`FilterBar.jsx::STATUS_CONFIG` line 127).
- **CS-22 (No change to data endpoint):** `ORDER_LOGS_REPORT` endpoint continues to return room + table orders. The exclusion is frontend-only. Room orders remain available to CR-004.

### Payment-Gateway (Razorpay) Filter (added 2026-04-28)
- **CS-23 (New filter — tri-state pill/radio):** Add a new tri-state filter control on the Audit Report filter bar, placed alongside the existing Status / Payment / Channel / Platform filters (top-level filter bar area). Control shows three pill/radio options:
  - `All` (default) — no filter applied
  - `Gateway (PG)` — only orders where `razorpay_order_id` is a non-empty value
  - `Non-Gateway (Non-PG)` — only orders where `razorpay_order_id` is empty / null / missing
  Label text for the whole control: "Payment Gateway" (per OQ-PG1 default).
- **CS-24 (Filter behavior — tri-state):** The three options are mutually exclusive. Default is `All`. A user can switch between them with one click.
- **CS-25 (Data plumbing):** `reportService.js::getOrderLogsReport` must read `razorpay_order_id` from the raw backend order payload and expose it as a field on the transformed order object (e.g., `razorpayOrderId`). A derived boolean `isPaymentGateway = Boolean(razorpayOrderId)` should be attached to each order for efficient filter evaluation.
- **CS-26 (Filter application):** The checkbox filter is applied as a post-tab filter in `AllOrdersReportPage.jsx` (same layer as existing `filters.channel`, `filters.platform`, etc.) — it can combine with any tab selection and any other filter.
- **CS-27 (Nothing else changes):** No change to tab list, summary bar, status derivation, column structure, exports, or PDF/CSV format beyond the additional filter being respected in the exported data set.
- **CS-28 (No status-column change):** Orders matching the Payment-Gateway filter do NOT get a separate status badge; status derivation (Paid / Unpaid / Hold / Cancelled / etc.) is unchanged. The filter is purely a narrowing lens.

## Out of Scope
- Backend API change (no change to `payment_method`, `payment_status`, `f_order_status`).
- Aggregator (Zomato/Swiggy) status badge — deferred (OQ-3).
- Unifying the two parallel logics (status derivation in `reportService.js` vs tab filtering in `AllOrdersReportPage.jsx`) into a single source of truth — tracked separately as **CR-002**.
- Any change to the `On Hold` endpoint itself (ISSUE-001 noted in `reportTransform.js` is not addressed here).
- Any change to gap-detection (Running / Missing) logic on the Audit tab.
- Any change to running-order or aggregator flows.
- Any change to Reports aggregation ownership (OD-01 / OQ-07 in FINAL_DOCS_APPROVAL_STATUS.md).

## Affected User Roles
- Restaurant admin
- Cashier
- Owner
- Super admin (Not confirmed whether super admin uses same audit report view)

## Affected Modules / Screens
- Module: **Reports / Audit / Summary Module** (per `/app/memory/final/MODULE_DECISIONS_FINAL.md` section 10).
- Page: `/reports/audit` (Audit Report → All Orders tab)
- Files likely touched:
  - `frontend/src/api/services/reportService.js` (`getOrderLogsReport`, priority rules ~lines 428–447, **and new `channel`/`platform` normalization for CS-13/CS-15**)
  - `frontend/src/pages/AllOrdersReportPage.jsx` (`TAB_FILTERS.unpaid`, `TAB_FILTERS.audit`, audit-tab count, audit-tab red/green indicator, `statusBreakdown`, **channel filter wiring ~lines 238–243**)
  - `frontend/src/components/reports/OrderTable.jsx` (`getStatusBadgeStyle`, `getStatusLabel` — add `audit` entry if missing)
  - `frontend/src/components/reports/FilterBar.jsx` (**`STATUS_FILTER_OPTIONS`, `CHANNEL_OPTIONS`, Platform filter enablement — CS-10, CS-11, CS-12**)
- Reference files (read only, not modified): `frontend/src/api/transforms/reportTransform.js`, `frontend/src/pages/StatusConfigPage.jsx`, `frontend/src/api/constants.js`, `frontend/src/utils/statusHelpers.js`, `frontend/src/components/layout/Header.jsx`

## Affected Order Types / Channels
- Dine-in: Yes
- Takeaway: Yes
- Delivery: Not confirmed (delivery rarely uses paylater — confirm with product if ever)
- Room (RM): No (SRM/RM handled by Transferred rule which runs before the new Hold rule)
- Scan & Order: Not confirmed
- Aggregator (Zomato/Swiggy): No (dedicated aggregator status is out of scope — OQ-3)

## Admin / Settings Impact
- Not applicable — no new settings required.

## API Impact
- API change needed: No
- Existing API usable: Yes (`API_ENDPOINTS.ORDER_LOGS_REPORT`, same payload)
- Notes: Frontend-only derivation + filter fix.

## Socket Impact
- No socket change. Report is HTTP-fetched.

## Data / Payload Impact
- New fields needed: No
- Existing fields used: `payment_method`, `payment_status`, `f_order_status`, `order_in`
- `getOrderLogsReport` already sets `fOrderStatus` on the transformed object, so `TAB_FILTERS.unpaid` can read `o.fOrderStatus` directly.

## Printing / KOT / Bill Impact
- No impact.

## Reporting / Analytics Impact
- Impact: Yes (positive — Hold vs Unpaid counts become accurate, Audit surfaces unmatched rows).
- Paylater rows currently double-counted under Unpaid will move to Hold only.
- `statusBreakdown` on All tab includes `hold` and `audit` (CS-6).
- Audit tab badge may turn red more often (expected — it now reflects both missing IDs and unmatched orders).
- PDF and CSV exports inherit corrected classification.

## Backward Compatibility
- No migration. Historical orders re-render with corrected classification on next fetch.
- No change to stored backend data.

## Edge Cases
- EC-1: `payment_method === 'paylater'` AND `payment_status === 'unpaid'` → Hold (confirmed).
- EC-2: `payment_method === 'paylater'` AND `payment_status === 'paid'` → Hold (confirmed: method-first).
- EC-3: `f_order_status === 9` AND `payment_method` missing → Hold (covered by `f_order_status === 9` trigger).
- EC-4: Case sensitivity of `payment_method` — must use `.toLowerCase()` for paylater comparison consistently.
- EC-5: No rule match → `audit` (badge + Audit tab routing).
- EC-6: Aggregator order with `payment_status === 'unpaid'` — Aggregator tab routing stays via existing `orderIn ∈ [zomato, swiggy]` filter; the status-derivation rules must still route it away from `audit`. Resolution: the Aggregator check in `TAB_FILTERS.aggregator` already happens at UI layer; at data layer, such an order will get either `paid` (if `f_order_status === 6`) or `unpaid` (if `payment_status === 'unpaid'`), which is acceptable until OQ-3 is addressed.
- EC-7: Missing-order-ID placeholders (`_isMissing === true`) must continue to appear in Audit tab exactly as today; the new "unmatched orders" additions must not replace them.

## Assumptions
- A-1: `'paylater'` in `payment_method` and the numeric code `9` in `f_order_status` represent the same Hold / Pending-Payment state.
- A-2: STATUS column should mirror the tab into which a row is routed.
- A-3: Reports module is presentation-only per OD-01 / OQ-07.
- A-4: The Audit tab can extend its semantics from "missing order IDs only" to "missing IDs + unmatched real orders" without breaking its red/green indicator contract (both conditions are anomalies operators should review).

## Open Questions
| Question | Why It Matters | Status |
| --- | --- | --- |
| OQ-1: Handling of unmatched orders | Answered: Routed to Audit tab. | Answered |
| OQ-2: paylater + payment_status === 'paid' | Answered: Always Hold. | Answered |
| OQ-3: Aggregator dedicated status badge | Deferred to future phase. | Answered — Deferred |
| OQ-4: Add `hold` to `statusBreakdown` | Answered: Yes. | Answered |
| OQ-5: Unify status + tab logic into single source of truth | Tracked separately as CR-002, to be picked up after CR-001 is merged. | Answered — Deferred to CR-002 |
| **OQ-F1 (ANSWERED 2026-04-28): Channel allowed values from `order_type`.** Values: `'take_away'` → **Takeaway**, `'delivery'` → **Delivery**, `'dinein'` → **Dine-in**. No `room` value in `order_type` (room orders are excluded at a higher level per CR-001 room-removal scope). | Closed. | Answered |
| **OQ-F2 (ANSWERED 2026-04-28): Platform backend key name.** Key = `order_from`. Allowed values: `pos` and `web` (case-sensitivity and exact values TBD during implementation — frontend will lowercase-compare safely). | Closed. | Answered |
| **OQ-F3 (ANSWERED 2026-04-28): Status filter additions.** Only add `On Hold`. Do NOT touch Aggregator or Audit in the Status filter dropdown. | Closed per user direction. | Answered |
| **OQ-F4 (ANSWERED 2026-04-28): Channel filter for Aggregator orders.** Answer: **Aggregator is a separate Channel value** (not merged under Delivery). Channel filter options become: `Dine-in, Takeaway, Delivery, Aggregator` (still no `Room`). Aggregator-sourced orders (Zomato/Swiggy) filter by this new value. | Clean separation. | Answered |
| **OQ-F5 (ANSWERED 2026-04-28): Channel backend field name.** `order_type` is the channel key. | Closed. | Answered |
| **OQ-F6 (ANSWERED 2026-04-28): RM/SRM business logic.** Resolution: **remove all room orders from the Audit Report entirely.** The Audit Report shows only table orders. Room orders move to CR-004 (Room Orders PMS View). See CS-16 through CS-22. | Closed. | Answered |
| **OQ-Room-1 (NON-BLOCKING): Should the `Transferred` tab shell be kept as a placeholder for a future non-room transfer use-case, or deleted?** Recommended: delete (no non-room transfer scenarios exist today). | Tab list hygiene. | Open — recommended: delete. |
| **OQ-Room-2 (BLOCKING — backend): Gap detection after room-order exclusion.** User confirmed room and table orders share the same numeric ID series. The gap-detection logic must filter out room orders **before** computing "missing" IDs, otherwise every room order will show as missing on the Audit tab. This CR's CS-18 addresses it on the frontend. Backend verification requested: can backend optionally return a `is_room_order` boolean or equivalent flag on each order so the frontend has a single-source signal instead of deriving from three fields (`order_in`, `payment_method`)? (Nice-to-have; CS-18 works without it.) | Cleaner implementation. | Open — nice-to-have |
| **OQ-PG1 (non-blocking — payment-gateway filter): Checkbox label text.** Options: `"Payment Gateway"`, `"Online Payments"`, `"Razorpay"`, or something else. Defaults to `"Payment Gateway"` unless user overrides. | UX wording. | Open — default: "Payment Gateway" |
| **OQ-PG2 (ANSWERED 2026-04-28): Backend already returns `razorpay_order_id`.** `ORDER_LOGS_REPORT` endpoint already emits the field. This CR is pure frontend work. | Closed. | Answered |
| **OQ-PG3 (ANSWERED 2026-04-28): Filter state — tri-state.** Three options: `All` (default) / `Gateway (PG)` / `Non-Gateway (Non-PG)`. Rendered as pill/radio buttons (not a single checkbox). An order is `Gateway` when `razorpay_order_id` is a non-empty value; `Non-Gateway` when it is empty/null/missing. | Closed. | Answered |
| **OQ-PG4 (non-blocking — payment-gateway filter): Other gateway fields.** Is Razorpay the only integrated gateway, or are there others (Stripe, PayU, etc.) whose presence should also flip the filter? If others exist with different field names, a unified `isPaymentGateway` flag on the backend would be cleaner. | Future-proofing. | Open — default assumption: only Razorpay for now |

## User Decisions
| Decision | User Answer | Date |
| --- | --- | --- |
| Fallback to `paid` is wrong; must be removed | Confirmed | 2026-04-28 |
| Unmatched orders route to Audit tab (catch-all) | Confirmed | 2026-04-28 |
| Paylater (Hold) must NOT show under Unpaid | Confirmed | 2026-04-28 |
| Paylater is tied to `f_order_status === 9` | Confirmed and verified in code | 2026-04-28 |
| paylater + payment_status = paid → Hold (not Paid) | Confirmed | 2026-04-28 |
| Add `hold` to statusBreakdown on All tab | Confirmed | 2026-04-28 |
| Aggregator status badge | Deferred to future phase | 2026-04-28 |
| Unification refactor of status + tab logic | Tracked separately as CR-002 | 2026-04-28 |
| Filter bar amendment: Status to include `On Hold` | Confirmed | 2026-04-28 |
| Filter bar amendment: Channel to be `Dine-in / Takeaway / Delivery / Room` (no POS/Web) | Confirmed | 2026-04-28 |
| Filter bar amendment: Platform to be `POS / Web`, enabled, value from backend | Confirmed | 2026-04-28 |
| Filter bar amendment: Clear semantic separation — Platform = source, Channel = type | Confirmed | 2026-04-28 |
| `order_type` is the Platform source (not Channel) | Confirmed — corrected in CS-13 | 2026-04-28 |
| Channel backend key is a separate field (name pending) | Confirmed — tracked in OQ-F5 | 2026-04-28 |
| Platform and Channel values both come from backend (frontend just renders them) | Confirmed | 2026-04-28 |
| Channel backend key is `order_type` (corrected from v1) | Confirmed | 2026-04-28 |
| Platform backend key is a separate field (name pending — user will share later) | Confirmed | 2026-04-28 |
| Status filter: ONLY add `On Hold`. Do NOT touch Aggregator or Audit in the Status dropdown | Confirmed | 2026-04-28 |
| Audit Report shows ONLY table orders. All room orders (`RM`, `SRM`, `payment_method === 'ROOM'`) removed from this report | Confirmed | 2026-04-28 |
| Room orders move to a new PMS-like view — tracked as CR-004 | Confirmed | 2026-04-28 |
| Room and table orders share the same numeric order-ID series | Confirmed by user | 2026-04-28 |
| Channel filter: remove `Room`; corrected list = `[Dine-in, Takeaway, Delivery]` | Confirmed | 2026-04-28 |
| Transferred tab deleted (empty after room exclusion) | Confirmed (recommendation to proceed) | 2026-04-28 |
| Payment Gateway filter: add a checkbox on the Audit Report top-level filter bar to filter orders where `razorpay_order_id` has a non-empty value | Confirmed | 2026-04-28 |
| Gateway filter "top-level — nothing else changes" — no change to tabs, columns, status derivation, or exports | Confirmed | 2026-04-28 |
| Channel values from `order_type`: `take_away / delivery / dinein` | Confirmed | 2026-04-28 |
| Platform backend key = `order_from`; values `pos` / `web` | Confirmed | 2026-04-28 |
| Backend already returns `razorpay_order_id` on `ORDER_LOGS_REPORT` → gateway filter is pure frontend work | Confirmed | 2026-04-28 |
| Channel filter includes `Aggregator` as a separate value (not merged under Delivery) | Confirmed | 2026-04-28 |
| Payment Gateway filter is tri-state: All / Gateway (PG) / Non-Gateway (Non-PG) | Confirmed | 2026-04-28 |

## Risks / Dependencies
- R-1: `reportService.js` is a high-regression-risk hotspot (CHANGE_REQUEST_PLAYBOOK step 8) — edits must be narrow.
- R-2: Tab counts across `paid`, `unpaid`, `hold`, `audit`, `statusBreakdown` must reconcile to total orders after the fix.
- R-3: Export (PDF/CSV) consumers rely on the same derived `status` — verify exports after change.
- R-4: `hold` already exists in `OrderTable.jsx → getStatusBadgeStyle / getStatusLabel`. `audit` needs to be added (small label/style change).
- R-5: Audit tab indicator (red/green) now reacts to both `missingCount` and `unmatchedOrdersCount`. Must verify indicator still turns green when both are 0.
- D-1: None blocking after user answers on OQ-1 and OQ-5.
- D-2: CR-002 (unification refactor) must be implemented after CR-001.

## Suggested Phase
- Phase 1: CS-1 … CS-9 (full fix, now).
- Future Phase: CR-002 (unification), OQ-3 (Aggregator status badge).

## Acceptance Criteria
| # | Acceptance Criteria |
| --- | --- |
| 1 | Any order with `f_order_status === 9` OR `payment_method` equal to `paylater` (case-insensitive) shows status badge `Hold` and appears only under the On Hold tab. |
| 2 | On the Unpaid tab, no paylater / `f_order_status === 9` order appears. |
| 3 | On the On Hold tab, all paylater / `f_order_status === 9` orders from the selected business-day window appear. |
| 4 | Any order that matches none of the priority rules (Cancel / Merge / TAB / ROOM or SRM / unpaid / paid / hold) shows status badge `Audit` and is included in the Audit tab. |
| 5 | The Audit tab continues to show missing-order-ID placeholders from gap detection AND now additionally shows real unmatched orders. Both are counted in the Audit tab badge. |
| 6 | The Audit tab red/green indicator is red when `missingCount + unmatchedOrdersCount > 0` and green when both are 0. |
| 7 | The silent `paid` default fallback is removed from `reportService.js`. |
| 8 | `statusBreakdown` on the All tab includes `hold` and `audit` entries, and totals reconcile to the total visible order count. |
| 9 | Tab-count totals reconcile: total = paid + cancelled + credit + hold + merged + unpaid + transferred + aggregator + audit (unmatched) + running (gap) + missing (gap), for the active filter set. |
| 10 | No change in behavior for: Paid, Cancelled, Credit, Merged, Transferred, Aggregator tabs. |
| 11 | PDF and CSV exports reflect the corrected classification. |
| 12 | No API endpoint, payload, or socket change. |
| 13 | No regression on `/reports/audit` route load, date picker, sidebar, or side-sheet drill-down. |
| 14 | `Status` filter dropdown contains `On Hold` (plus whatever is decided in OQ-F3) and, when selected, correctly shows only orders with `status === 'hold'`. |
| 15 | `Channel` filter dropdown contains exactly `Dine-in`, `Takeaway`, `Delivery`, `Room` — no `POS` / `Web` values. Selecting each filters the table to the matching orders based on the normalized `channel` field. |
| 16 | `Platform` filter is enabled (no "Coming soon" tooltip). Dropdown contains exactly `POS` and `Web`. Selecting each filters the table based on the backend-supplied `platform` field. |
| 17 | Channel and Platform filters are mutually exclusive in content (no overlap) and can be combined (AND-ed) with each other and with Status / Payment filters. |
| 18 | When backend `platform` value is missing for an order, the order is excluded from results when any Platform filter is active (or the behavior decided in final clarification — pending OQ-F2 resolution). |
| 19 | No order with `order_in ∈ [RM, SRM]` or `payment_method === 'ROOM'` appears in any tab of the Audit Report (All, Paid, Cancelled, Credit, Hold, Merged, Unpaid, Aggregator, Audit). |
| 20 | Gap detection on the Audit tab does NOT flag room-order IDs as missing. Room-order IDs are filtered from the sequence before the gap calculation runs. |
| 21 | `Transferred` tab is removed from the tab list. |
| 22 | `Channel` filter dropdown contains exactly `Dine-in, Takeaway, Delivery` (no `Room`). |
| 23 | `statusBreakdown` on the All tab does NOT contain a `roomTransfer` key. |
| 24 | `ORDER_LOGS_REPORT` endpoint and its payload are unchanged. Exclusion is applied frontend-side only. |
| 25 | A new "Payment Gateway" tri-state filter appears in the filter bar with three options: All (default) / Gateway / Non-Gateway. |
| 26 | When `Gateway` is selected, the order table shows only orders whose `razorpay_order_id` is a non-empty value. When `Non-Gateway` is selected, the table shows only orders where `razorpay_order_id` is empty / null / missing. When `All` is selected (default), no gateway-based filter is applied. |
| 27 | The gateway filter combines correctly with any tab selection and with the Status / Payment / Channel / Platform filters (AND-ed). |
| 28 | PDF/CSV exports honor the gateway filter when an option other than `All` is active. |
| 29 | No change to tab list, status derivation, status badges, column headers, summary bar labels, or audit/missing-count logic due to the gateway filter. |

## References Read
- /app/memory/final/CHANGE_REQUEST_PLAYBOOK.md
- /app/memory/final/FINAL_DOCS_APPROVAL_STATUS.md
- /app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md (baseline only)
- /app/memory/final/MODULE_DECISIONS_FINAL.md (section 10 Reports)
- /app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md (OD-01 / OQ-07 noted)
- Source: /app/frontend/src/pages/AllOrdersReportPage.jsx
- Source: /app/frontend/src/api/services/reportService.js
- Source: /app/frontend/src/api/transforms/reportTransform.js
- Source: /app/frontend/src/components/reports/OrderTable.jsx
- Source: /app/frontend/src/pages/StatusConfigPage.jsx
- Source: /app/frontend/src/api/constants.js
- Source: /app/frontend/src/utils/statusHelpers.js
- Source: /app/frontend/src/components/layout/Header.jsx
- Source: /app/frontend/src/components/reports/FilterBar.jsx (filter bar amendment — CS-10, CS-11, CS-12)
- Related CR: /app/memory/change_requests/CR_002_unify_status_and_tab_logic.md

## Ready for Next Agent?
- Yes — all blocking OQs answered. Awaiting explicit approval word ("approved" / "freeze this"). Non-blocking OQs (OQ-Room-1 delete-Transferred-tab-placeholder with recommended default, OQ-Room-2 backend is_room_order flag as nice-to-have) do not block approval.

## Next Agent
- Change Request Impact Analysis Agent
