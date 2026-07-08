# POS2.0 Clean Safe Bug Implementation Plan — 2026-05-17

## 1. Purpose

This document is the **implementation planning artifact** for the clean safe POS2.0 bug bucket identified by the Business Rules vs Bug Analysis Reconciliation (`BUSINESS_RULES_BUG_RECONCILIATION_REPORT_2026_05_17.md`).

It covers planning **only** for the 8 bugs in the clean safe bucket and does **not** touch:

- Source code (no fixes implemented in this run).
- The frozen business rules baseline (`/app/memory/final/BUSINESS_RULES_BASELINE_FINAL.md`).
- The pending freeze register (`BUSINESS_RULES_PENDING_FREEZE_ITEMS_2026_05_15.md`).
- The reconciliation report (`BUSINESS_RULES_BUG_RECONCILIATION_REPORT_2026_05_17.md`).
- The bug tracker statuses.

### Bugs explicitly excluded from this planning run

These three bugs were flagged as "safe" in earlier reconciliation counts but were also identified in the reconciliation report as the top business-rule conflict items:

| Bug | Reason Excluded |
|---|---|
| BUG-075 | Pending-freeze rule TIP-003 — Tip/Tip GST scope vs takeaway/delivery is owner-approved but the corrected rule is not yet promoted into the frozen baseline. Tip applicability is a business-rule reversal that the reconciliation report flags as one of the highest-risk pending-freeze items. |
| BUG-079 | Pending-freeze rule POLL-002 — One-miss removal threshold is owner-approved but the rule is not yet promoted; existing code/comments still encode the 2-miss anti-rule. Polling-removal safety is high-risk and requires combined comments/tests/constant change against POLL-002. |
| BUG-080 | Pending-freeze rule PAY-003 — `partial_payments` must respect configured restaurant modes only; out-of-scope tab/credit caveat needs explicit recording before implementation. |

### Bugs explicitly not allowed in this planning run

Owner/backend-blocked bugs (per reconciliation report Section 13):

- BUG-082, BUG-083, BUG-084, BUG-085 (block_implementation_planning bucket — GST/delivery/scan socket contract blocked on backend confirmation).
- BUG-050, BUG-052, BUG-053, BUG-056, BUG-057, BUG-058, BUG-059, BUG-060, BUG-061, BUG-063, BUG-064, BUG-065, BUG-066, BUG-067, BUG-069, BUG-072, BUG-074, BUG-078 (blocked on owner decision or backend contract).
- BUG-076, BUG-077, BUG-081, BUG-086 (duplicates / already-resolved).

---

## 2. Inputs Read

### 2.1 Repo / clone

- **Repo URL:** `https://github.com/Abhi-mygenie/core-pos-front-end-.git`
- **Branch:** `17-may`
- **Commit hash after fresh clone:** `862f413bbd1b0d70ac1adec42de74c2054d61c36`
- **Clone time (UTC):** `2026-05-16T19:19:20Z`
- **`/app` wiped before clone:** Yes
- **Working tree clean after clone:** Yes
- **Code edits made during planning:** None

### 2.2 Baseline docs read (Section 2 mandatory order)

- `/app/memory/final/FINAL_DOCS_APPROVAL_STATUS.md`
- `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md`
- `/app/memory/final/MODULE_DECISIONS_FINAL.md`
- `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md`
- `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md`
- `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md`
- `/app/memory/final/BUSINESS_RULES_BASELINE_FINAL.md`

### 2.3 Overlay / sprint docs read

- `/app/memory/change_requests/BASELINE_RECONCILIATION_REPORT_2026_05_04.md`
- `/app/memory/change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`
- `/app/memory/change_requests/PENDING_TASK_REGISTER_2026_05_04.md`
- `/app/memory/change_requests/PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md`
- `/app/memory/change_requests/BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md`
- `/app/memory/change_requests/LAST_SPRINT_CODE_FIX_VALIDATION_2026_05_06.md`

### 2.4 Business rules reconciliation docs read

- `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULES_PENDING_FREEZE_ITEMS_2026_05_15.md`
- `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULES_BUG_RECONCILIATION_REPORT_2026_05_17.md`

### 2.5 Bug impact analysis read

- `/app/memory/bugs/POS2_0_BUG_IMPACT_ANALYSIS.md`
  (Specifically the bug sections for BUG-051, BUG-054, BUG-055, BUG-062, BUG-068, BUG-070, BUG-071, BUG-073.)

### 2.6 Code inspected (read-only, for planning evidence)

- `/app/frontend/src/api/transforms/orderTransform.js`
  (`calcOrderTotals` L585-680; `placeOrderWithPayment` L1001-1122; `updateOrder` L896-994; `collectBillExisting` L1130-1299.)
- `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx`
  (Tax recompute L520-590; discounts builder L685-720; To-Room button L1952-1966.)
- `/app/frontend/src/components/order-entry/CartPanel.jsx`
  (Customizations render L55-110.)
- `/app/frontend/src/components/order-entry/OrderEntry.jsx`
  (Order-ID chip L1110-1122.)
- `/app/frontend/src/components/cards/OrderCard.jsx`
  (`orderId` derivation L74; print/settle/cancel toasts L138, L157; chip L308-320.)
- `/app/frontend/src/pages/DashboardPage.jsx`
  (`tables` memo L515-625; `allRoomsList` L635-670; `channelData` L673-819.)
- `/app/frontend/src/api/socket/socketService.js`
  (`_setupConnectionHandlers` L225-280; status listener bus L286-310.)
- `/app/frontend/src/__tests__/api/transforms/qa_subtotal_delivery_validation.test.js`
  (`order_amount` / `round_up` assertions L67, L111, L140, L166, L327-351.)

---

## 3. Scope

### 3.1 Included Bugs

| Bug | Reason Included | Reconciliation Status | Planning Notes |
|---|---|---|---|
| BUG-051 | Round-off rule reversal already captured in pending freeze (ROUND-001); single-locus change. | safe_for_implementation_planning | High regression risk: touches `orderTransform.js` (calcOrderTotals) + `CollectPaymentPanel.jsx` (live UI). Two pinned test files need re-baseline. Owner sign-off on policy reversal already recorded in pending freeze; backend re-alignment confirmation should be captured as a planning note. |
| BUG-054 | VAT discount proration mirrors frozen TAX-003 + TOTALS-002 (VAT follows GST math). Pure FE bug; analysis conclusive from code. | matches_frozen_business_rule | Touches same two files as BUG-051. VAT-only / VAT-mixed restaurants are the impact set. No SC/Tip/Delivery VAT change (those remain GST-only). |
| BUG-055 | Frontend payload parity gap between `placeOrderWithPayment` and `collectBillExisting`; no business-rule conflict. | safe_for_implementation_planning | Touches `orderTransform.js:1080-1085` only (prepaid place+pay payload). Backend echo behavior should be captured but is not blocking. Extension to `updateOrder` (L939-993) confirmed by code as missing — must be planned together. |
| BUG-062 | UI gate only: hide "To Room" for takeaway/delivery. No frozen-rule conflict. | safe_for_implementation_planning | Single-condition change in `CollectPaymentPanel.jsx:1953`. Walk-in eligibility for room transfer is preserved unless owner says otherwise. |
| BUG-068 | Reconnect rehydration is additive to frozen POLL-001 / POLL-004 (safety-net polling) and additive to socket runtime. | safe_for_implementation_planning | New status listener in `socketService.js` triggers `getRunningOrders` refetch + dedupe-merge into `OrderContext`. Must avoid duplicate orders. |
| BUG-070 | Presentation-only area grouping in Table View (rooms) and Channel View. No business-rule conflict. | safe_for_implementation_planning | Touches `DashboardPage.jsx` (`allRoomsList`, `channelData`) and `ChannelColumnsLayout` / `ChannelColumn` to support sectioned rendering. Order View intentionally untouched. |
| BUG-071 | Display-only DB-ID-vs-restaurant-order-number audit. Payload `order_id` unchanged. | safe_for_implementation_planning | Multi-surface grep audit required first. `data-testid` keys must keep DB `orderId`. `restaurant_order_id` / `orderNumber` is the display source. |
| BUG-073 | Tiny CartPanel render-gate fix for empty customization wrapper. No business-rule conflict. | safe_for_implementation_planning | Single-line condition change in `CartPanel.jsx:65`. Partial customizations (size only / addons only) must still render. |

### 3.2 Excluded Bugs (high-risk pending-freeze items)

| Bug | Reason Excluded | Required Next Step |
|---|---|---|
| BUG-075 | Pending-freeze rule TIP-003 (Tip/Tip GST on takeaway/delivery). The corrected rule is owner-approved but still in the pending-freeze register, not in the frozen baseline. Reconciliation report flagged this as a high-risk business-rule reversal that needs a coordinated UI + payload + print + reprint zero-tip path with explicit regression coverage. | Plan separately under a TIP-003 alignment bucket once pending-freeze gate criteria (code + QA + owner reconfirm) are clarified. |
| BUG-079 | Pending-freeze rule POLL-002 (one-miss removal threshold). Owner-approved correction; existing code/comments encode the 2-miss anti-rule. Polling-removal safety is high regression because Hold/open-order short-circuits must remain intact. | Plan separately under a POLL-002 alignment bucket; coordinate constant + comment + pinned test changes together. |
| BUG-080 | Pending-freeze rule PAY-003 (`partial_payments` filtered to configured payment modes). Owner-approved correction; explicit tab/credit out-of-scope caveat must be documented; out-of-scope tab/credit must remain unchanged. | Plan separately under a PAY-003 alignment bucket with tab/credit caveat recorded explicitly. |

### 3.3 Excluded categories (not in this planning run)

- All bugs in reconciliation Section 13 with blocker type `Backend contract` (BUG-052, BUG-058, BUG-060, BUG-063, BUG-064, BUG-065, BUG-072, BUG-082, BUG-083, BUG-084, BUG-085).
- All bugs in reconciliation Section 13 with blocker type `Owner decision` (BUG-050, BUG-053, BUG-056, BUG-057, BUG-059, BUG-061, BUG-066, BUG-067, BUG-069, BUG-074, BUG-078).
- All duplicates / already-resolved (BUG-076, BUG-077, BUG-081, BUG-086).

---

## 4. Code Touch Map

| Bug | Primary Module / Flow | Likely Files To Touch | Files To Inspect Only | API / Payload / State Involvement | Risk |
|---|---|---|---|---|---|
| BUG-051 | Module 4 — Order Entry / Cart / Payment (round-off) | `frontend/src/api/transforms/orderTransform.js` (L655-661 + comment block), `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (L579-585 + comment block), `frontend/src/__tests__/api/transforms/qa_subtotal_delivery_validation.test.js` (L67, L111, L140, L166, L327-351 — re-baseline), `frontend/src/__tests__/api/transforms/orderTransformFinancials.test.js` (any round-off assertions) | `frontend/src/api/services/orderService.js` (consumer of payloads), `frontend/src/components/cards/OrderCard.jsx` (consumer of order.amount) | Payload keys changed: `order_amount`, `round_up` (string) on place-order, update-order, place+pay, transfer-to-room, and Collect Bill payloads. UI `finalTotal` / `roundOff` change. Cash quick-pills next-multiple computation downstream of `effectiveTotal`. | HIGH — hotspot files; financial; touches 4 payment flows + tests. |
| BUG-054 | Module 4 — VAT proration on item-level discount | `frontend/src/api/transforms/orderTransform.js` (L649-651, L670 — add `vatTax * (1 - discountRatio)`), `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (L575 — apply `(1 - discountRatio)` to `vat`) | `frontend/src/api/transforms/__tests__/*` for any existing CR-VAT-COLLECT coverage; `frontend/src/components/reports/CollectBillPanelDrawer.jsx` (display only) | Payload key changed: `vat_tax` on place-order, update-order, place+pay, and Collect Bill payloads. UI VAT row changes. | HIGH — same hotspot files as BUG-051; financial; impacts VAT-only / VAT-mixed restaurants only when discount > 0. |
| BUG-055 | Module 4 — Prepaid Place+Pay payload parity | `frontend/src/api/transforms/orderTransform.js` (L1080-1085 add `order_discount_type: discounts.orderDiscountType \|\| ''`; mirror in `updateOrder` L959-964 if applicable per scope decision) | `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (L702 — already supplies the value) | Payload key added: `order_discount_type` on `placeOrderWithPayment` (and `updateOrder` if extended). No UI change. | LOW-MEDIUM — single payload addition; downstream backend echo behavior should be confirmed but is not blocking. |
| BUG-062 | Module 5 / Module 4 — To Room button visibility on Collect Payment | `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (L1953 — append `&& (orderType === 'dineIn' \|\| orderType === 'walkIn')`) | `frontend/src/config/paymentMethods.js` (L85-94, L188-217 — confirm no separate gating path) | No payload change. UI render gate only. | LOW — single condition; isolated; no financial impact. |
| BUG-068 | Module 7 — Realtime Socket reconnect | `frontend/src/api/socket/socketService.js` (extend `_setStatus` listener or add reconnect status hook), `frontend/src/api/socket/useSocketEvents.js` (subscribe to status; trigger `getRunningOrders`), `frontend/src/contexts/OrderContext.jsx` (add `mergeOrdersFromRefetch` helper if needed for dedupe semantics) | `frontend/src/api/services/orderService.js` (`getRunningOrders` — existing endpoint), `frontend/src/components/dashboard/ScanOrderPopOut.jsx` (popup predicate — must re-evaluate after refetch) | New behavior: HTTP GET running-order-list on RECONNECTING → CONNECTED transition. State write into `OrderContext` via dedupe-merge. No payload change. | MEDIUM — socket subsystem; dedupe must be airtight to avoid duplicate orders. |
| BUG-070 | Module 3 — Dashboard Table View + Channel View area grouping | `frontend/src/pages/DashboardPage.jsx` (`allRoomsList` L635-670 → add section grouping; `channelData` L778-816 → expose `sections` per channel where applicable), `frontend/src/components/dashboard/ChannelColumnsLayout.jsx`, `frontend/src/components/dashboard/ChannelColumn.jsx` (render section headers) | `frontend/src/api/transforms/tableTransform.js` (confirm rooms also carry `sectionName`); `frontend/src/components/dashboard/StatusViewLayout.jsx` (no-op — Status View is out of scope) | No payload change. No socket change. UI render shape change. | MEDIUM — DashboardPage is a hotspot file; memoization must be careful; empty-section behavior must be defined. |
| BUG-071 | Module 3 / 4 / 10 — Display ID audit (DB ID vs restaurant_order_id) | `frontend/src/components/cards/OrderCard.jsx` (L138 toast, L318 chip — switch to `order.orderNumber`), `frontend/src/components/order-entry/OrderEntry.jsx` (L1119 chip — use `effectiveTable?.orderNumber \|\| placedOrderNumber`), `frontend/src/components/cards/TableCard.jsx` (any human-visible `orderId`), `frontend/src/components/reports/OrderTable.jsx` / `OrderDetailSheet.jsx` (audit report display surfaces). Toast strings inside OrderCard for `handlePrintKot`, `handleSettlePrepaid`, `handleCancelOrder` should be reviewed for display-vs-identifier separation. | `frontend/src/api/transforms/orderTransform.js` (`buildBillPrintPayload` already emits `restaurant_order_id` correctly L1635-1636); `data-testid` selectors across the repo (must NOT change). | No payload change. No socket change. Pure UI string change. `orderId` (DB) preserved for `data-testid`, API calls, and internal identifiers. | LOW-MEDIUM — broad audit scope; must avoid regressing `data-testid` selectors and brand-new pre-engage cards. |
| BUG-073 | Module 4 — Cart panel customization wrapper | `frontend/src/components/order-entry/CartPanel.jsx` (L65 — change `item.customizations && !isCancelled` to also require `(size \|\| variants?.length \|\| addons?.length)`) | `frontend/src/components/order-entry/ItemCustomizationModal.jsx` (no change; capture flow unaffected); `frontend/src/components/cards/OrderCard.jsx` (L520 — already correct, included for parity reference). | No payload change. No socket change. UI render gate only. | LOW — single-line conditional. |

---

## 5. Implementation Buckets

Bugs are grouped by shared file/module surface AND shared regression risk profile. Cross-bucket file overlap is acknowledged where it exists (e.g. CollectPaymentPanel.jsx appears in Bucket 1 and Bucket 2 but in non-overlapping logical sections — L520-590 vs L1953).

### Bucket 1 — Financial Cluster (orderTransform + CollectPaymentPanel financial section)

| Field | Detail |
|---|---|
| Bugs Included | BUG-051, BUG-054, BUG-055 |
| Primary Flow | Order Entry / Cart / Payment financial pipeline — place-order, update-order, place+pay (prepaid), collect-bill (postpaid). |
| Likely Files To Touch | `frontend/src/api/transforms/orderTransform.js` (`calcOrderTotals` L585-680; `placeOrderWithPayment` L1050-1110; optionally `updateOrder` L939-994 for BUG-055 extension); `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (L520-590 — VAT proration + round-off rule + comment block); `frontend/src/__tests__/api/transforms/qa_subtotal_delivery_validation.test.js` (L67, L111, L140, L166, L327-351 — re-baseline `order_amount` and `round_up` assertions to the always-ceil rule); `frontend/src/__tests__/api/transforms/orderTransformFinancials.test.js` (any other affected round-off / VAT assertions); add a VAT-discount-proration test case for BUG-054. |
| Files To Avoid | `frontend/src/api/transforms/profileTransform.js` (no profile config read in this bucket — that is BUG-052, which is blocked). `frontend/src/api/services/orderService.js` (consumer of payloads — no change). `frontend/src/components/cards/OrderCard.jsx` financial logic (handlers may toast `Order #${orderId}` but that is BUG-071's surface, not financial). Anything in `roomService.js` / `paymentService.js`. |
| Business Rules To Preserve | Frozen TAX-001 / TAX-002 / TAX-003 / TAX-005 / TAX-008; frozen SC-001 / SC-002 / SC-003 / SC-006; frozen TIP-001 / TIP-002 (do NOT apply BUG-075 scope change here); frozen ROUND-002 (round-off applies only to Grand Total — keep component values un-rounded); frozen TOTALS-001 / TOTALS-002; frozen PAY-001 / PAY-002 / PAY-004 / PAY-007 / PAY-008. |
| Implementation Summary | (a) BUG-051 — replace fractional-based round-off with `Math.ceil(rawTotal)` at both `orderTransform.js:657-661` and `CollectPaymentPanel.jsx:581-584`; update the L579-580 / L655-656 comment blocks to record the policy reversal of BUG-009 and a pointer to pending-freeze ROUND-001. Round-off scope (Grand Total only) remains unchanged. (b) BUG-054 — multiply `vatTax`/`vat` by `(1 - discountRatio)` at `orderTransform.js:649-651` (before the `gstTax` re-aggregation) and at `CollectPaymentPanel.jsx:575` (assign `taxTotals.vat * (1 - discountRatio)` to `vat`). Preserve the existing "SC / Tip / Delivery tax math intentionally untouched" guardrail. (c) BUG-055 — add `order_discount_type: discounts.orderDiscountType \|\| ''` to the `placeOrderWithPayment` payload at `orderTransform.js:1080-1085`, mirroring the `collectBillExisting` shape at L1273. Extend the same field to `updateOrder` (`orderTransform.js:939-981`) per parity recommendation in the impact analysis. (d) Re-baseline the affected tests; add a new VAT-with-discount assertion case (e.g., subtotal post-discount × VAT% must match the `vat_tax` payload). |
| Sequence | (1) BUG-051 — round-off rule reversal (smallest financial delta per call, simplest test re-baseline). (2) BUG-054 — VAT proration (independent math, but uses the same `calcOrderTotals` flow). (3) BUG-055 — payload-key addition (mechanical; landed last so financial regression suite is already stable). |
| Regression Risk | HIGH — touches two hotspot files (`orderTransform.js`, `CollectPaymentPanel.jsx`). Risks: (a) round-off rule reversal changes `order_amount` on every order with a non-integer raw total — payload audit + paid-amount reports may move; (b) cash quick-pills next-multiple logic feeds off `effectiveTotal` (CollectPaymentPanel:2196) so behavior shifts in lock-step; (c) VAT proration affects only VAT-only / VAT-mixed restaurants with discount > 0 — guard for VAT-zero / discount-zero paths to stay numerically identical; (d) `order_discount_type` addition changes prepaid backend echo behavior — depends on backend either accepting silently or persisting the new key (planning note: backend re-alignment confirmation recommended). |
| QA Assertions | (a) `Math.ceil(105.05)` and `Math.ceil(105.15)` both yield 106; `round_up` shows "0.95" and "0.85" respectively in payload. (b) Already-integer totals (e.g., 100.00) emit `order_amount=100`, `round_up="0.00"`. (c) VAT-only ₹1000 item at 5% with ₹10 order discount: `vat_tax = 50 * (990/1000) = 49.5` (assuming order-level discount mode). (d) VAT-zero items × discount path → `vat_tax = 0` unchanged. (e) Prepaid Place+Pay payload now contains `order_discount_type` = `'Percent'` / `'Amount'` / `''` matching the Collect Bill payload. (f) Update-order payload contains `order_discount_type` (if extension scope accepted). (g) Round-off scope remains Grand Total only — component values (`service_gst_tax_amount`, `tip_tax_amount`, `gst_tax`, `vat_tax`, `service_tax`) keep 2-decimal precision and are not ceil-rounded. (h) Existing tests in `qa_subtotal_delivery_validation.test.js` re-baselined; pre-existing `order_amount` (2353 → 2354, etc.) updated to ceil-rule values; algebraic invariance test (L327-351) still passes with `roundUpSigned >= 0`. |
| Independent? | Internally tightly coupled (same files; same test re-baseline). Externally independent of other buckets — does not need Bucket 2/3/4 to land first. |
| Recommended Priority | P1 — high regression but high business impact (revenue-affecting). |

### Bucket 2 — Order Entry / Cart UI Render Gates

| Field | Detail |
|---|---|
| Bugs Included | BUG-062, BUG-073 |
| Primary Flow | Order Entry / Cart workspace — visible buttons and lines on Collect Payment + Cart panel. |
| Likely Files To Touch | `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (L1953 — `&& (orderType === 'dineIn' \|\| orderType === 'walkIn')`); `frontend/src/components/order-entry/CartPanel.jsx` (L65 — extend gate to require non-empty customization content). |
| Files To Avoid | Anywhere in `orderTransform.js`, `profileTransform.js`, `roomService.js`, `paymentService.js`. Do not modify To-Room call site (`setPaymentMethod("transferToRoom")` on L1955); only the render gate. Do not change `ItemCustomizationModal.jsx` capture flow. |
| Business Rules To Preserve | Frozen ROOM-001 (room report totals — untouched); current dine-in / walk-in / room To-Room eligibility (preserved); customization capture flow (preserved; only the empty-render-wrapper changes). |
| Implementation Summary | (a) BUG-062 — extend `CollectPaymentPanel.jsx:1953` render condition to also require `(orderType === 'dineIn' \|\| orderType === 'walkIn')`. Takeaway, delivery, and room-children orders no longer see the "To Room" button. (b) BUG-073 — change `CartPanel.jsx:65` gate from `item.customizations && !isCancelled` to `item.customizations && !isCancelled && (item.customizations.size \|\| item.customizations.variants?.length > 0 \|\| item.customizations.addons?.length > 0)`. Empty wrapper no longer renders. |
| Sequence | Either order works — independent fixes. Recommended: BUG-073 first (single-line; lowest risk), then BUG-062 (single condition addition). |
| Regression Risk | LOW — both are render-gate-only; no payload, no socket, no financial logic. Risk surfaces: (a) BUG-062 — confirm walk-in remains room-eligible (matches current architecture per impact analysis); (b) BUG-073 — confirm partial customizations (size only / addons only / size + addons but no variants) still render correctly. |
| QA Assertions | (a) Takeaway order on Collect Payment — "To Room" button is hidden. (b) Delivery order on Collect Payment — "To Room" button is hidden. (c) Dine-in / walk-in postpaid order — "To Room" button is visible and clickable. (d) Customizable item added without selecting any variation/add-on — no empty line under item name in cart. (e) Item with size-only customization — size line still appears. (f) Item with addons-only customization — addons line still appears. (g) Cancelled items remain unaffected (strikethrough preserved; no empty wrapper). |
| Independent? | Yes — both bugs are isolated UI gates; no cross-bucket dependency. |
| Recommended Priority | P0 — smallest risk, highest visibility, quick win. |

### Bucket 3 — Dashboard Presentation (area grouping + ID display audit)

| Field | Detail |
|---|---|
| Bugs Included | BUG-070, BUG-071 |
| Primary Flow | Dashboard rendering — Table View (rooms group) + Channel View; cross-surface human-visible order ID. |
| Likely Files To Touch | `frontend/src/pages/DashboardPage.jsx` (`allRoomsList` L635-670 → section-grouped shape; `channelData` L778-816 → expose `sections` per channel where applicable); `frontend/src/components/dashboard/ChannelColumnsLayout.jsx` (sectioned render); `frontend/src/components/dashboard/ChannelColumn.jsx` (sectioned render); `frontend/src/components/cards/OrderCard.jsx` (L138 toast, L318 chip — display `order.orderNumber` instead of `orderId`); `frontend/src/components/order-entry/OrderEntry.jsx` (L1119 chip — `effectiveTable?.orderNumber \|\| placedOrderNumber`); `frontend/src/components/cards/TableCard.jsx` (audit any human-visible `orderId`); `frontend/src/components/reports/OrderTable.jsx` and `OrderDetailSheet.jsx` (audit any human-visible `orderId`). |
| Files To Avoid | `frontend/src/api/transforms/orderTransform.js` (`buildBillPrintPayload` L1635-1636 already correct; do NOT change `order_id` payload key). Any file using `orderId` as a `data-testid` key (must remain on the DB ID for test selector stability). `paymentService.js`, `roomService.js`. Order View rendering pieces (BUG-070 explicitly excludes Order View per intake). |
| Business Rules To Preserve | Frozen DASH-001 / DASH-002 / DASH-003 (channel/status view stability — `platformMatches` and `statusMatchesFilter` decisions must remain intact). Frozen ROOM-001 (room data shape — no change to `computeRoomCardAmount`). Payload-side `order_id` must remain the DB ID per BUG-032 closure note. |
| Implementation Summary | (a) BUG-070 — extend `allRoomsList` to group by section in the same pattern as the existing `tables` memo (`hasSections` branch on `sectionName`); extend `channelData.dineIn.items` and `channelData.room.items` to expose an optional `sections` map for sectioned rendering. Update `ChannelColumn` / `ChannelColumnsLayout` to render section headers when `sections` is provided. Order View is intentionally not changed. (b) BUG-071 — first, do a grep-based audit (e.g., `grep -rn "#\\\${orderId}\|#{orderId}\|Order #\\\${orderId}\|Order #{orderId}" frontend/src/`) to enumerate every human-visible surface. Replace `orderId` with `order.orderNumber` (or equivalent display field) only where the surface is human-facing. Preserve `orderId` everywhere it acts as a DB key (data-testid, payload, service call). Fallback: when `orderNumber` is missing on a brand-new pre-engage order, prefer the existing behavior (render nothing or hide chip) — do NOT regress test selectors. |
| Sequence | (1) BUG-070 first — the area grouping change is more structural and easier to validate visually before touching wide surfaces. (2) BUG-071 after — once the area-grouping surfaces are stable, audit and rewrite display strings. |
| Regression Risk | MEDIUM — `DashboardPage.jsx` is a hotspot file (Module 3 orchestration); section grouping must be memoized correctly. Channel View stability rule (CR May-2026) must remain intact. ID audit must avoid: (a) changing `data-testid` selectors (would break test suite); (b) changing payload `order_id`; (c) regressing brand-new pre-engage card behavior. |
| QA Assertions | (a) Table View — rooms now appear grouped by area in the same way tables already do. (b) Table View — when no sections are defined, rooms fall back to a single "Default" section identical to today. (c) Channel View (Dine-In column) — area headers appear above tables, mirroring Table View grouping. (d) Channel View (Room column) — area headers appear above rooms. (e) Order View — no area grouping (rendering unchanged). (f) Sort order of sections is consistent across views. (g) Card chip — displays `#<restaurant_order_id>` (e.g., `#1234`) instead of `#<db_id>` (e.g., `#886123`). (h) Card toast (Bill request / Settle / Cancel) — uses the restaurant-order-id string in the user-facing message. (i) OrderEntry header chip — uses restaurant-order-id. (j) Audit Report row chip — uses restaurant-order-id. (k) `data-testid="order-id-chip-${orderId}"` (and similar testid keys) still resolves to the DB ID for selectors. (l) Print bill payload `order_id` still emits DB ID; `restaurant_order_id` still emits user-facing ID. (m) Brand-new pre-engage card (orderNumber not yet assigned) gracefully hides the chip or renders the documented fallback. |
| Independent? | Yes — independent of Buckets 1, 2, 4. Within the bucket, BUG-070 and BUG-071 do not share files (DashboardPage / ChannelColumn vs OrderCard / OrderEntry / report files), so they can proceed in parallel but should land in the order recommended above for predictable testing. |
| Recommended Priority | P1 — visible UX; broad-but-low-risk audit; no financial side effect. |

### Bucket 4 — Socket Reconnect Rehydration

| Field | Detail |
|---|---|
| Bugs Included | BUG-068 |
| Primary Flow | Realtime socket lifecycle — reconnect rehydration of missed Scan & Order events. |
| Likely Files To Touch | `frontend/src/api/socket/socketService.js` (add a public reconnect-status hook or extend the existing `statusListeners` set to expose RECONNECTING → CONNECTED transitions); `frontend/src/api/socket/useSocketEvents.js` (subscribe to that status; on transition, call `getRunningOrders`); `frontend/src/contexts/OrderContext.jsx` (add a dedupe-merge helper such as `replaceOrAddOrder` if not present; ensure existing `addOrder` does not produce duplicates when called with an existing order ID). |
| Files To Avoid | `frontend/src/api/socket/socketEvents.js` (event names/constants — must not be renamed); `frontend/src/api/socket/socketHandlers.js` (event handler logic — should remain handler-driven; rehydration is HTTP-driven, separate path); `frontend/src/api/services/orderService.js` (`getRunningOrders` is reused as-is — do not change endpoint or shape). Do not change polling behavior (frozen POLL-001 / POLL-004) — this rehydration runs only on reconnect, not on a timer. |
| Business Rules To Preserve | Frozen POLL-001 (60s safety-net poll) / POLL-004 (open-order-skip during edit) — leave the polling subsystem untouched. Frozen DASH-001 (Hold orders never on main running dashboard) — refetch must not surface Hold (status-8) onto the running dashboard. Frozen BOOT-001 — refetch reuses the bootstrap-time `getRunningOrders` semantics and should not break first-login order. Engage locks (TableContext) — should NOT be re-set on rehydration. |
| Implementation Summary | (a) Extend `socketService.js` so any `statusListeners` callback receives the old/new status pair (already partially exposed at L286-310 via the `oldStatus → newStatus` log). (b) In `useSocketEvents.js`, subscribe to status changes; on transition where `oldStatus === RECONNECTING && newStatus === CONNECTED`, call `getRunningOrders` and pass the result into a dedupe-merge writer on `OrderContext`. Optional debounce / minimum-disconnect-duration threshold to avoid flapping refetches. (c) `OrderContext` dedupe-merge: for each order in the refetch, if `order.orderId` already exists in `orders[]`, prefer the latest payload (or merge by timestamp); otherwise add. Engage locks must be ignored by the merger. (d) ScanOrderPopOut popup predicate (L52-54) will re-evaluate naturally once `OrderContext` updates. |
| Sequence | Single-bug bucket. Implement core listener wire-up first; add dedupe-merge helper; smoke-test reconnect after disconnect. |
| Regression Risk | MEDIUM — socket subsystem touches Module 7 + Module 13. Risks: (a) duplicate orders if dedupe-merge has a bug (highest concern); (b) flapping reconnects causing repeated heavy refetches (mitigation: debounce); (c) engage locks accidentally cleared (must explicitly skip in merger); (d) Hold-status orders re-appearing on the running dashboard (mitigation: rely on existing context-level status filtering — do not bypass it). |
| QA Assertions | (a) Disconnect socket (e.g., toggle network) while a Scan & Order arrives → reconnect → Scan & Order popup appears without page refresh. (b) Disconnect for < 1s (rapid blip) → either no refetch (if debounced) or single refetch only — never duplicate orders. (c) Order already present in `OrderContext` is updated, not duplicated. (d) Engage lock state preserved across reconnect. (e) Hold (status-8) orders do not appear on running dashboard after reconnect. (f) Existing polling (POLL-001) still functions unchanged after reconnect. (g) Initial bootstrap (BOOT-001) unaffected. |
| Independent? | Yes — does not depend on Buckets 1, 2, 3. May be implemented in parallel with Bucket 2. |
| Recommended Priority | P1 — operational reliability fix; isolated subsystem. |

---

## 6. Per-Bug Implementation Planning

### BUG-051 — Round-off rule reversal (always-ceil)

#### Current Analysis Summary
`orderTransform.js:655-661` and `CollectPaymentPanel.jsx:579-585` both encode the BUG-009 "old-POS-parity" rule: `fractional > 0.10 ? ceil : floor`. Owner reversal per pending-freeze ROUND-001 requires always-ceil.

#### Business Rule Check
- Frozen ROUND-002 (round-off applies only to Grand Total) — preserved.
- Pending-freeze ROUND-001 — implementation target.
- No direct frozen-rule breach.

#### Files To Change

| File | Planned Change | Reason |
|---|---|---|
| `frontend/src/api/transforms/orderTransform.js` | Replace L657-661 with `Math.ceil(rawTotal)`; rewrite L655-656 comment to record policy reversal of BUG-009 and pointer to pending-freeze ROUND-001. | Single source of truth for payload-time round-off. |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | Replace L581-584 with `Math.ceil(rawFinalTotal)`; rewrite L579-580 comment. | Live UI mirror used for `effectiveTotal` and cash quick-pills. |
| `frontend/src/__tests__/api/transforms/qa_subtotal_delivery_validation.test.js` | Update `order_amount` assertions at L67, L111, L140, L166; update Bucket-5 invariance (L327-351) to assume `roundUpSigned >= 0`. | Pinned baseline of BUG-009 — must be re-baselined to always-ceil. |
| `frontend/src/__tests__/api/transforms/orderTransformFinancials.test.js` | Update any other affected round-off assertions. | Same reason. |

#### Files To Inspect But Not Change

| File | Reason |
|---|---|
| `frontend/src/api/services/orderService.js` | Consumer of payloads; no logic change. |
| `frontend/src/components/cards/OrderCard.jsx` | Consumer of `order.amount`; no change. |
| `frontend/src/api/transforms/profileTransform.js` | Profile-driven round-off config is BUG-052 (blocked). Do not touch in this bucket. |

#### Implementation Steps
1. Update `orderTransform.js:655-661` to `const orderAmount = rawTotal > 0 ? Math.ceil(rawTotal) : 0;`. Remove the `fractional` intermediate.
2. Update `CollectPaymentPanel.jsx:579-585` similarly.
3. Rewrite both comment blocks to record: "BUG-051 / ROUND-001: always-ceil round-off, replacing BUG-009 fractional rule. Pending-freeze rule until promoted into BUSINESS_RULES_BASELINE_FINAL.md."
4. Re-baseline pinned tests in `qa_subtotal_delivery_validation.test.js` to the new `order_amount` values (likely `2353 → 2354` etc.) and update the algebraic invariance assertion to use signed `>= 0` round-off.
5. Add a regression test asserting `Math.ceil(105.05) === 106 && Math.ceil(105.15) === 106` via two end-to-end payload cases.

#### API / Payload / Socket / State Impact
- Payload keys `order_amount` and `round_up` change on every order with a non-integer raw total in: place-order, update-order, place+pay, transfer-to-room, collect-bill. No new keys.
- No socket impact.
- Live UI `finalTotal` / `roundOff` recomputed at render. `effectiveTotal` and cash quick-pills move in lock-step.

#### Regression Risks
- Already-integer totals: `Math.ceil` of an integer is the integer; behavior unchanged.
- Refund/negative paths: code already guards with `rawTotal > 0`; preserved.
- Backend re-alignment: backend may independently re-apply BUG-009 rule, causing UI ↔ backend diff until backend coordinates. Capture as planning note in the implementation handover packet.

#### QA Assertions Required
- ₹105.05 → `order_amount = 106`, `round_up = "0.95"`.
- ₹105.15 → `order_amount = 106`, `round_up = "0.85"`.
- ₹100.00 → `order_amount = 100`, `round_up = "0.00"`.
- Existing CR-013 component-sum vs composite GST parity warning still does not fire post-change.

#### Acceptance Criteria
- Pinned test files pass with the new baseline values.
- Manual ₹105.05 and ₹105.15 orders settle to ₹106.
- No regression in print bill totals (manual print and Collect Bill print produce the same `order_amount`).

#### Planning Status
`ready_for_implementation`

---

### BUG-054 — VAT proration on item-level discount

#### Current Analysis Summary
`orderTransform.js:649-651,670` and `CollectPaymentPanel.jsx:575` do not prorate `vatTax`/`vat` by `(1 - discountRatio)` even though GST is correctly prorated.

#### Business Rule Check
- Frozen TAX-003 (VAT uses same tax formula as GST) — implementation alignment.
- Frozen TOTALS-002 (Subtotal pre-tax with discount) — preserved.
- No direct frozen-rule breach.

#### Files To Change

| File | Planned Change | Reason |
|---|---|---|
| `frontend/src/api/transforms/orderTransform.js` | At L649-651, compute `const vatTaxPostDiscount = vatTax * (1 - discountRatio);` and use it in subsequent aggregation (L653, L670). | Payload `vat_tax` is the canonical persisted value. |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | At L575, change `const vat = taxTotals.vat;` to `const vat = taxTotals.vat * (1 - discountRatio);`. | Live UI VAT row drives the displayed Bill Summary value used in `rawFinalTotal`. |

#### Files To Inspect But Not Change

| File | Reason |
|---|---|
| `frontend/src/components/reports/CollectBillPanelDrawer.jsx` | Display only — consumes pre-existing `vat_tax` field. |
| `frontend/src/api/transforms/__tests__/orderTransformFinancials.test.js` | Add a test case for VAT-only with discount; do not modify existing GST assertions. |

#### Implementation Steps
1. Inspect `orderTransform.js:585-680` once to confirm `vatTax` is summed pre-discount in the GST-mixed path.
2. Introduce `vatTaxPostDiscount = vatTax * (1 - discountRatio)`.
3. Use `vatTaxPostDiscount` in `totalTax`, `rawTotal`, and the return value `vat_tax`.
4. Mirror at `CollectPaymentPanel.jsx:575`.
5. Add a unit test: ₹1000 item at 5% VAT, ₹10 order discount → `vat_tax = 49.5`.
6. Verify VAT-zero items × discount path remains `vat_tax = 0` (guard against division-by-zero — `discountRatio = 0` when subtotal is 0).

#### API / Payload / Socket / State Impact
- Payload key `vat_tax` changes on VAT-bearing orders with discount > 0. No new keys.
- No socket impact.

#### Regression Risks
- VAT-only restaurants (UAE / foreign markets) — only path with material change.
- GST-only restaurants — unchanged (no `taxTotals.vat`).
- SC / Tip / Delivery tax math — explicitly untouched per existing guardrail comment.

#### QA Assertions Required
- VAT-only ₹1000 item with 0 discount → `vat_tax = 50` (unchanged).
- VAT-only ₹1000 item with ₹100 order discount → `vat_tax = 45` (post-discount).
- VAT-mixed-with-GST orders with discount → both `gst_tax` and `vat_tax` proportionally prorated.

#### Acceptance Criteria
- Existing CR-VAT-COLLECT tests still pass.
- New VAT-with-discount test passes.
- Manual bill print shows VAT row prorated under discount.

#### Planning Status
`ready_for_implementation`

---

### BUG-055 — Prepaid Place+Pay `order_discount_type` payload parity

#### Current Analysis Summary
`placeOrderWithPayment` (orderTransform.js:1050-1109) omits `order_discount_type` while `collectBillExisting` (orderTransform.js:1273) emits it. `updateOrder` (orderTransform.js:939-981) also omits it. The discount-builder in `CollectPaymentPanel.jsx:702` already supplies the value.

#### Business Rule Check
- No frozen-rule conflict.
- Module 4 future-change rule: identify whether affects place-order/update-order/collect-bill — all three.

#### Files To Change

| File | Planned Change | Reason |
|---|---|---|
| `frontend/src/api/transforms/orderTransform.js` | At L1080-1085 (placeOrderWithPayment), add `order_discount_type: discounts.orderDiscountType \|\| ''`. At L959-964 (updateOrder), add the same key (mirrors collectBillExisting at L1273). | Payload parity across all order-creation/update flows. |

#### Files To Inspect But Not Change

| File | Reason |
|---|---|
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | L702 already supplies `orderDiscountType` — no change. |
| `frontend/src/api/transforms/orderTransform.js` `collectBillExisting` (L1273) | Reference implementation — do not modify. |

#### Implementation Steps
1. Add `order_discount_type: discounts.orderDiscountType \|\| ''` after the existing `order_discount` key in `placeOrderWithPayment` payload.
2. Add the same key after the existing `order_discount` key in `updateOrder` payload.
3. Add a payload-parity test asserting all three payloads include `order_discount_type` with `'Percent'` / `'Amount'` / `''` values when respective discount types are set.

#### API / Payload / Socket / State Impact
- Payload key `order_discount_type` added to `place-order` (v2 multipart) and `update-place-order` (json) endpoints.
- No socket change.
- No UI change.

#### Regression Risks
- Backend ingestion: if backend was already defaulting silently, behavior moves from "default" to "explicit value". Capture as planning note: confirm backend echo on next runtime smoke.
- Update-order extension: confirmed safe by code (CollectPaymentPanel already supplies value).

#### QA Assertions Required
- Prepaid Place+Pay with `Percent` discount type → payload `order_discount_type === 'Percent'`.
- Prepaid Place+Pay with `Amount` discount type → payload `order_discount_type === 'Amount'`.
- Prepaid Place+Pay with no discount → payload `order_discount_type === ''`.
- Update-order payload matches the same shape.

#### Acceptance Criteria
- All three payloads emit the key identically.
- Pinned tests pass; new parity test passes.

#### Planning Status
`ready_for_implementation`

---

### BUG-062 — Hide "To Room" button for takeaway/delivery on Collect Payment

#### Current Analysis Summary
`CollectPaymentPanel.jsx:1953` renders "To Room" whenever `!isRoom && hasRooms && hasPlacedItems`. Takeaway / delivery orders satisfy all three.

#### Business Rule Check
- No frozen-rule conflict.
- Module 5 + Module 4 — touches Rooms UI but no payload change.

#### Files To Change

| File | Planned Change | Reason |
|---|---|---|
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | At L1953, change `{!isRoom && hasRooms && hasPlacedItems && (` to `{!isRoom && hasRooms && hasPlacedItems && (orderType === 'dineIn' \|\| orderType === 'walkIn') && (`. | Add explicit order-type gate. |

#### Files To Inspect But Not Change

| File | Reason |
|---|---|
| `frontend/src/config/paymentMethods.js` | L85-94 + L188-217 already filter on `requiresRooms / hasRooms`; no orderType filter present. No change needed; only the inline button gate is the visibility decision. |

#### Implementation Steps
1. Extend the render condition at L1953.
2. Confirm `orderType` prop is in scope (it is — used elsewhere in the panel).
3. Add data-testid integrity check (`payment-transfer-room-btn` still rendered for dine-in/walk-in only).

#### API / Payload / Socket / State Impact
- None.

#### Regression Risks
- Walk-in: preserved as room-eligible.
- Room-children orders: `!isRoom` is already false for them — unaffected.

#### QA Assertions Required
- Takeaway + room available → button hidden.
- Delivery + room available → button hidden.
- Dine-in + room available → button visible.
- Walk-in + room available → button visible.
- Room-child order → button hidden (unchanged).

#### Acceptance Criteria
- Button visible only on dine-in / walk-in postpaid orders with rooms available.

#### Planning Status
`ready_for_implementation`

---

### BUG-068 — Socket reconnect rehydration for missed Scan & Order events

#### Current Analysis Summary
`socketService.js:255-280` updates connection status but does not trigger a re-fetch of running orders. Missed `scan-new-order` events during disconnect are lost until full page refresh.

#### Business Rule Check
- Frozen POLL-001 / POLL-004 — preserved (polling unchanged).
- Frozen BOOT-001 — `getRunningOrders` is the same endpoint used at boot; preserved.
- No direct frozen-rule conflict; behavior is additive.

#### Files To Change

| File | Planned Change | Reason |
|---|---|---|
| `frontend/src/api/socket/socketService.js` | Ensure `_setStatus` emits `(newStatus, reconnectAttempts, oldStatus)` to listeners. (Today it emits `(newStatus, reconnectAttempts)` per L293-295.) | Allows external code to detect specifically RECONNECTING → CONNECTED transitions. |
| `frontend/src/api/socket/useSocketEvents.js` | Subscribe to socket status; on RECONNECTING → CONNECTED, call `getRunningOrders` and pass to OrderContext dedupe-merge. | Owner of the rehydration trigger. |
| `frontend/src/contexts/OrderContext.jsx` | Add a `mergeRunningOrders(orders)` helper that updates existing orders by `orderId` and adds new ones, skipping engage-lock side effects. | Centralizes dedupe semantics. |

#### Files To Inspect But Not Change

| File | Reason |
|---|---|
| `frontend/src/api/services/orderService.js` | `getRunningOrders` is reused as-is. |
| `frontend/src/api/socket/socketHandlers.js` | Event handlers untouched. |
| `frontend/src/components/dashboard/ScanOrderPopOut.jsx` | Popup predicate re-evaluates automatically once OrderContext updates. |
| `frontend/src/hooks/useOrderPollingReconciliation.js` | Polling (POLL-001 / POLL-004) — must NOT be changed. |

#### Implementation Steps
1. Extend `socketService._setStatus` to pass `oldStatus` to status listeners (or, equivalently, capture the previous status in `useSocketEvents` before the new one is applied).
2. In `useSocketEvents`, register a status listener that, on `oldStatus === RECONNECTING && newStatus === CONNECTED`, invokes `orderService.getRunningOrders()` then `OrderContext.mergeRunningOrders(result)`.
3. Add an optional debounce / minimum-disconnect-duration threshold (e.g., 1500 ms) to avoid refetch on micro-blips.
4. In `OrderContext`, add `mergeRunningOrders` that maps existing orders by `orderId`, updates in-place where present, and pushes new ones; explicitly skip engage-lock state.

#### API / Payload / Socket / State Impact
- New HTTP GET on socket reconnect — same endpoint as boot.
- No payload contract change.
- No socket event contract change.
- OrderContext receives dedupe-merge writes; ScanOrderPopOut popup re-evaluates from context.

#### Regression Risks
- Duplicate orders — primary risk (mitigation: dedupe by `orderId`).
- Engage locks accidentally cleared — must be explicitly skipped.
- Hold (status-8) orders re-appearing on running dashboard — mitigated by relying on existing context-level status filtering.
- Flapping reconnects — mitigated by debounce.
- Performance — refetch is heavy; debounce prevents flooding.

#### QA Assertions Required
- Disconnect socket; while disconnected, simulate `scan-new-order` server-side; reconnect → popup appears without page refresh.
- Disconnect for < 1.5s (micro-blip) → no refetch (or single refetch only).
- Order already in OrderContext receives an update from refetch — no duplicate row.
- Engage lock state preserved across reconnect.
- Hold orders not surfaced on running dashboard.
- POLL-001 still runs every 60s after reconnect.
- BOOT-001 first-login sequence unchanged.

#### Acceptance Criteria
- Missed Scan & Order popup appears after reconnect, no refresh needed.
- No duplicate orders in OrderContext.
- Polling/booting behavior unchanged.

#### Planning Status
`ready_for_implementation`

---

### BUG-070 — Area grouping for rooms in Table View + area grouping in Channel View

#### Current Analysis Summary
`DashboardPage.jsx:520-625` groups non-room tables by section. `DashboardPage.jsx:635-670` (`allRoomsList`) emits a flat list without section grouping. `channelData` (L778-816) provides flat items per channel.

#### Business Rule Check
- No frozen-rule conflict.
- Frozen DASH-001 / DASH-002 / DASH-003 — preserved.
- Module 3 known impact area: "channel/status rendering".

#### Files To Change

| File | Planned Change | Reason |
|---|---|---|
| `frontend/src/pages/DashboardPage.jsx` | Refactor `allRoomsList` (L635-670) to mirror the `tables`-by-section grouping pattern. Refactor `channelData.dineIn.items` and `channelData.room.items` (L778-816) to expose an optional `sections` map. | Centralized data shape for sectioned views. |
| `frontend/src/components/dashboard/ChannelColumnsLayout.jsx` | Accept and render section headers when `sections` is provided. | Sectioned channel rendering. |
| `frontend/src/components/dashboard/ChannelColumn.jsx` | Accept and render section headers when `sections` is provided. | Sectioned channel rendering. |

#### Files To Inspect But Not Change

| File | Reason |
|---|---|
| `frontend/src/api/transforms/tableTransform.js` | Confirm rooms carry `sectionName`; if not, fall back to a single "Default" section consistent with non-room behavior. |
| `frontend/src/components/dashboard/StatusViewLayout.jsx` | Status View is out of scope. |

#### Implementation Steps
1. In `allRoomsList`, replicate the `hasSections` branch from the `tables` memo: group rooms by `sectionName` when any room has one, else flat.
2. In `channelData`, attach a `sections` map to `dineIn` and `room` (and optionally `delivery` / `takeAway` if rooms are not applicable). Preserve existing `items` for backwards compatibility.
3. Update `ChannelColumnsLayout` and `ChannelColumn` to render section headers when `sections` is non-empty; fall back to flat render otherwise.
4. Define empty-section behavior: hide empty sections by default (consistent with current "tables with no orders" behavior).
5. Memoize the sectioned shape carefully to avoid recompute storms on socket events.

#### API / Payload / Socket / State Impact
- None.

#### Regression Risks
- Performance — incorrect memoization could cause repeated re-renders.
- Channel View stability rule (CR May-2026) — must not drop cards on status flip; only the rendering shape changes.
- Order View is intentionally untouched.

#### QA Assertions Required
- Rooms grouped by section in Table View.
- Non-sectioned rooms fall back to a single "Default" section.
- Channel View Dine-In and Room columns show section headers.
- Order View remains flat (unchanged).
- Section sort order is stable across renders.

#### Acceptance Criteria
- Visual area grouping works in Table View (rooms) and Channel View (dineIn, room).
- No regression to status pulse counters / Header counter behavior.

#### Planning Status
`ready_for_implementation`

---

### BUG-071 — DB ID vs `restaurant_order_id` display audit

#### Current Analysis Summary
At least three places still show DB IDs: `OrderCard.jsx:138` (toast), `OrderCard.jsx:318` (chip), `OrderEntry.jsx:1119` (chip). `CollectPaymentPanel.jsx:792` is correct (uses `orderNumber`). Print payload at `orderTransform.js:1635-1636` emits both keys correctly. BUG-032 closure (smoke 2026-05-12) covered the earlier header surface but not these.

#### Business Rule Check
- No frozen-rule conflict.
- Payload `order_id` must remain the DB ID (frozen contract); only display strings change.

#### Files To Change

| File | Planned Change | Reason |
|---|---|---|
| `frontend/src/components/cards/OrderCard.jsx` | L138 toast and L318 chip → use `order.orderNumber` for display (preserve `orderId` for `data-testid` and service calls at L134, L156, L266). Audit other toast strings (handlePrintKot, handleSettlePrepaid, handleCancelOrder) for display-vs-identifier separation. | Card-level human-visible display. |
| `frontend/src/components/order-entry/OrderEntry.jsx` | L1119 chip → use `effectiveTable?.orderNumber \|\| placedOrderNumber` (or similar; confirm the actual `placedOrderNumber` variable name exists; otherwise add a derived value from context). Preserve `data-testid` at L1115 using the DB ID. | OrderEntry header chip. |
| `frontend/src/components/cards/TableCard.jsx` | Audit human-visible `orderId` displays; replace with `orderNumber` equivalents where present. | Card-level display. |
| `frontend/src/components/reports/OrderTable.jsx` | Audit row ID display; replace with `restaurant_order_id` if currently using `order_id`. | Audit Report display. |
| `frontend/src/components/reports/OrderDetailSheet.jsx` | Same audit. | Detail sheet display. |

#### Files To Inspect But Not Change

| File | Reason |
|---|---|
| `frontend/src/api/transforms/orderTransform.js` | `buildBillPrintPayload` already emits both `order_id` (DB) and `restaurant_order_id` (user-facing); do NOT change. |
| All `data-testid` attributes across the repo | Must remain on the DB `orderId` for test selector stability. |
| `frontend/src/api/services/orderService.js`, `roomService.js`, `paymentService.js` | All API calls must continue to use the DB `orderId`. |

#### Implementation Steps
1. Run a grep-based audit: `grep -rn "#\\\${orderId}\|#{orderId}\|Order #\\\${orderId}\|Order #{orderId}\|Order #' + orderId" frontend/src/` to enumerate every human-visible surface. (Allow `data-testid="order-id-chip-${orderId}"` and similar testid strings to remain on the DB ID.)
2. For each match, classify as human-visible (replace) or identifier (preserve).
3. Define and apply a fallback policy when `orderNumber` is empty (likely: hide the chip / show a placeholder) — match the existing OrderCard behavior at L312 (already renders only when `orderId` is set; equivalent gate should apply to `orderNumber`).
4. Update unit-test snapshots only where display strings appear; do not touch test selectors using `data-testid`.

#### API / Payload / Socket / State Impact
- None. Payload `order_id` unchanged.

#### Regression Risks
- Breaking `data-testid` selectors — strictly avoid.
- Brand-new pre-engage orders without `orderNumber` — must render a graceful fallback (hide chip or stable placeholder).
- Audit Report mid-row consumers — verify any `order_id` text shown in row hover / detail view.

#### QA Assertions Required
- Card chip and toast → user-facing ID (e.g., `#1234`).
- OrderEntry header chip → user-facing ID.
- Audit Report row → user-facing ID.
- `data-testid="order-id-chip-${orderId}"` (and similar) still resolves to DB ID for selectors.
- Print payload `order_id` still emits DB ID; `restaurant_order_id` still emits user-facing ID.
- Brand-new pre-engage card with empty `orderNumber` — graceful fallback.

#### Acceptance Criteria
- All human-visible surfaces show restaurant order number.
- No `data-testid` regressions.
- Payload integrity preserved.

#### Planning Status
`ready_for_implementation` (with explicit grep-audit step before code edits).

---

### BUG-073 — Empty customization wrapper line in cart

#### Current Analysis Summary
`CartPanel.jsx:65` renders the customization wrapper `<div>` whenever `item.customizations` is truthy, even when `size`, `variants`, and `addons` are all empty. `OrderCard.jsx:520` is already correct (uses `detailsStr && (...)`).

#### Business Rule Check
- No frozen-rule conflict.
- Module 4 — pure UI render gate.

#### Files To Change

| File | Planned Change | Reason |
|---|---|---|
| `frontend/src/components/order-entry/CartPanel.jsx` | At L65, change `{item.customizations && !isCancelled && (` to `{item.customizations && !isCancelled && (item.customizations.size \|\| item.customizations.variants?.length > 0 \|\| item.customizations.addons?.length > 0) && (`. | Suppress empty wrapper. |

#### Files To Inspect But Not Change

| File | Reason |
|---|---|
| `frontend/src/components/order-entry/ItemCustomizationModal.jsx` | Capture flow unchanged. |
| `frontend/src/components/cards/OrderCard.jsx` | L520 already correct. |

#### Implementation Steps
1. Update the render gate at L65.
2. Manually verify partial customization rendering (size only, addons only, etc.).

#### API / Payload / Socket / State Impact
- None.

#### Regression Risks
- Partial customizations must still render.

#### QA Assertions Required
- Customizable item with no selection → no empty wrapper line.
- Item with size only → size line renders.
- Item with addons only → addons line renders.
- Item with size + variants + addons → all three render.
- Cancelled customizable item → existing behavior unchanged.

#### Acceptance Criteria
- No empty `<div>` under cart items with empty customizations.

#### Planning Status
`ready_for_implementation`

---

## 7. Cross-Bucket Regression Risks

| Risk | Affected Buckets | Mitigation |
|---|---|---|
| Hotspot file overlap (`CollectPaymentPanel.jsx`) | Bucket 1 (L520-590 financial), Bucket 2 (L1953 UI gate), potentially Bucket 3 (no overlap if BUG-071 audit confines to OrderCard/OrderEntry/reports) | Logical sections are non-overlapping. Bucket 1 and Bucket 2 can land in either order; recommend Bucket 2 first as warm-up. |
| Hotspot file overlap (`orderTransform.js`) | Bucket 1 only — all changes confined. | None. |
| Hotspot file overlap (`DashboardPage.jsx`) | Bucket 3 only. | Memoize sectioned shapes carefully; preserve channel-view stability rule. |
| Test re-baseline coupling | Bucket 1 — re-baselines `qa_subtotal_delivery_validation.test.js` and `orderTransformFinancials.test.js` | Bucket 1 lands as a single PR/handoff; do not split round-off and VAT into separate baseline updates. |
| Print bill parity | Buckets 1 (financial output), 3 (display IDs) | Manual print and Collect Bill print must produce the same `order_amount` and the same human-visible IDs. |
| `data-testid` regressions | Bucket 3 (BUG-071 audit) | Strictly preserve `data-testid` strings using DB `orderId`. |
| Dashboard hotspot (Module 3) overlap with Channel View stability rule | Bucket 3 (BUG-070) | Do not change `platformMatches` / `statusMatchesFilter` logic; only add sectioned rendering. |
| OrderContext mutation safety | Bucket 4 (BUG-068 dedupe-merge) | Centralize via a new helper; do not bypass existing reducers. |

---

## 8. QA Plan For Implementation Agent Handoff

| Bucket | Bug | Test Flow | Expected Result | Evidence Required |
|---|---|---|---|---|
| 1 | BUG-051 | Pay ₹105.05 dine-in order | `order_amount=106`, `round_up="0.95"` in payload; UI Grand Total = ₹106. | Payload sample + screenshot of Collect Bill. |
| 1 | BUG-051 | Pay ₹105.15 dine-in order | `order_amount=106`, `round_up="0.85"`; UI Grand Total = ₹106. | Payload sample + screenshot. |
| 1 | BUG-051 | Pay ₹100.00 dine-in (already integer) | `order_amount=100`, `round_up="0.00"`. | Payload sample. |
| 1 | BUG-051 | Cash quick-pills next-multiple on ₹105.05 order | Pills suggest ₹110 / ₹120 / etc., consistent with new `effectiveTotal`. | Screenshot of Collect Bill. |
| 1 | BUG-054 | VAT-only ₹1000 item with ₹100 order discount | `vat_tax=45` (5% × ₹900). | Payload sample. |
| 1 | BUG-054 | VAT-only ₹1000 item with 0 discount | `vat_tax=50` (unchanged). | Payload sample. |
| 1 | BUG-054 | VAT-mixed-with-GST + discount | Both `gst_tax` and `vat_tax` proportionally prorated. | Payload sample + bill comparison. |
| 1 | BUG-055 | Prepaid Place+Pay with Percent discount | Payload `order_discount_type='Percent'`. | Network tab capture. |
| 1 | BUG-055 | Prepaid Place+Pay with Amount discount | Payload `order_discount_type='Amount'`. | Network tab capture. |
| 1 | BUG-055 | Update order with discount | Payload `order_discount_type` present (matches collect-bill). | Network tab capture. |
| 2 | BUG-062 | Takeaway order on Collect Payment | "To Room" button hidden. | Screenshot. |
| 2 | BUG-062 | Delivery order on Collect Payment | "To Room" button hidden. | Screenshot. |
| 2 | BUG-062 | Dine-in / walk-in on Collect Payment | "To Room" button visible and clickable. | Screenshot. |
| 2 | BUG-073 | Add customizable item without selecting any variation | No empty line under item name in cart. | Screenshot. |
| 2 | BUG-073 | Add customizable item with size only | Size line renders. | Screenshot. |
| 2 | BUG-073 | Add customizable item with addons only | Addons line renders. | Screenshot. |
| 3 | BUG-070 | Table View with multiple area sections (tables + rooms) | Rooms grouped under their respective sections. | Screenshot. |
| 3 | BUG-070 | Channel View Dine-In and Room columns | Area headers visible above tables and rooms. | Screenshot. |
| 3 | BUG-070 | Order View | Flat rendering unchanged. | Screenshot. |
| 3 | BUG-071 | Dashboard card chip | Displays restaurant_order_id (e.g., `#1234`), not DB ID (e.g., `#886123`). | Screenshot. |
| 3 | BUG-071 | Card toast (Bill request / Settle / Cancel) | Uses restaurant_order_id in the user-facing message. | Screenshot. |
| 3 | BUG-071 | OrderEntry header chip | Uses restaurant_order_id. | Screenshot. |
| 3 | BUG-071 | Audit Report row | Uses restaurant_order_id. | Screenshot. |
| 3 | BUG-071 | Test selectors via `data-testid` | Still resolve to DB `orderId`. | Test run output. |
| 4 | BUG-068 | Disconnect socket; simulate `scan-new-order`; reconnect | Popup appears without page refresh. | Network log + screenshot. |
| 4 | BUG-068 | Rapid socket blip (<1.5s) | No duplicate refetch; no duplicate orders. | Network log. |
| 4 | BUG-068 | Engage-lock state across reconnect | Lock preserved. | Console state inspection. |
| 4 | BUG-068 | Hold (status-8) order across reconnect | Not surfaced on running dashboard. | Screenshot. |
| 4 | BUG-068 | POLL-001 60s safety-net poll | Continues to run unchanged. | Network log. |

---

## 9. Implementation Order Recommendation

Recommended sequence — lowest risk to highest risk, with isolated subsystems before financial cluster:

1. **Bucket 2** (BUG-062, BUG-073) — Order Entry / Cart UI render gates. Lowest risk. Acts as a warm-up to validate planning fidelity and CI/QA pipeline.
2. **Bucket 3** (BUG-070, BUG-071) — Dashboard presentation. Low-to-medium risk, broad audit scope (especially BUG-071). Builds confidence in surface-wide refactors before the financial cluster.
3. **Bucket 4** (BUG-068) — Socket reconnect rehydration. Medium risk, isolated subsystem. Lands as a single coherent change; QA exercises socket behavior in isolation.
4. **Bucket 1** (BUG-051, BUG-054, BUG-055) — Financial cluster. Highest risk; lands last so all prior buckets are stabilized and unrelated regressions are easy to localize. Test re-baseline lands inside this bucket.

Rationale:
- Buckets 2 and 3 have no financial side effects and can be QA'd quickly.
- Bucket 4 is isolated to the socket layer and does not interact with financial code paths.
- Bucket 1 changes payload keys (`order_amount`, `round_up`, `vat_tax`, `order_discount_type`) that downstream reports and audit consumers may inspect; placing it last reduces the chance of a financial regression masking a UI-only fix.
- Bucket 1 also requires explicit owner acknowledgment of the BUG-009 → ROUND-001 policy reversal and a backend re-alignment confirmation note. Landing it last allows time to capture that confirmation.

---

## 10. Files Not To Touch

| File / Path | Reason |
|---|---|
| `/app/memory/final/BUSINESS_RULES_BASELINE_FINAL.md` | Frozen baseline — do not modify until promotion criteria are met. |
| `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md` | Frozen baseline. |
| `/app/memory/final/MODULE_DECISIONS_FINAL.md` | Frozen baseline. |
| `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md` | Frozen baseline. |
| `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md` | Frozen baseline. |
| `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md` | Frozen baseline. |
| `/app/memory/final/FINAL_DOCS_APPROVAL_STATUS.md` | Frozen baseline. |
| `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULES_PENDING_FREEZE_ITEMS_2026_05_15.md` | Pending-freeze register — owner-controlled; do not amend. |
| `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULES_BUG_RECONCILIATION_REPORT_2026_05_17.md` | Reconciliation report — historical record. |
| `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULES_BASELINE_CREATION_REPORT_2026_05_15.md` | Historical baseline-creation record. |
| `/app/memory/bugs/POS2_0_BUG_IMPACT_ANALYSIS.md` | Bug impact analysis source — historical record. |
| `frontend/src/api/transforms/profileTransform.js` (round-off / GST config sections) | BUG-052 territory (blocked on backend). Round-off configuration must not be wired in this bucket. |
| `frontend/src/hooks/useOrderPollingReconciliation.js` | Polling threshold is BUG-079 / POLL-002 (excluded). Do not change. |
| All TIP-003 surfaces (tip applicability on takeaway/delivery) | BUG-075 (excluded). |
| All PAY-003 surfaces (`partial_payments` filtering by enabled modes) | BUG-080 (excluded). |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` tip / partial_payments builders | Owned by BUG-075 / BUG-080 (excluded). |
| All delivery-GST `delivery_charge_gst_amount` payload changes | BUG-083 (blocked on backend). |
| All per-component CGST/SGST payload changes | BUG-084 (blocked on backend). |
| All print-template GST breakdown changes | BUG-085 (blocked on backend). |
| All room-print payload field additions | BUG-063 / BUG-065 (blocked on backend / OD-02). |
| All `order-shifted-room` socket-event handling | BUG-060 (blocked on backend). |
| Login / Remember Me policy | BUG-074 (blocked on owner). |
| Preset-discount picker UI | BUG-056 (blocked on owner UX). |
| Prepaid Print Bill surfaces | BUG-057 (blocked on owner UX). |
| Historical Audit Print Bill | BUG-059 (blocked on owner UX). |
| Notes taxonomy (room_note / table_note / item_note) | BUG-072 (blocked on backend + owner). |
| Sound vs render sequencing | BUG-069 (blocked on owner architecture choice). |
| Station-view readiness rule | BUG-067 (blocked on owner). |
| Room check-in time visibility | BUG-061 (blocked on owner). |
| Manual bill reprint source-of-truth after cancellation | BUG-050 (blocked on owner evidence). |
| Hardcoded GST percentage in brackets | BUG-053 (blocked on owner screenshot — current code already matches spec for item rows). |
| Transfer modal room-exclusion | BUG-066 (blocked on owner repro). |
| Prepaid Hold collect-bill endpoint | BUG-058 (blocked on backend). |
| CRM timeout UX | BUG-078 (blocked on owner UX). |
| Scan socket `order_from` / index 4 contract | BUG-082 (blocked on backend). |
| Round-off profile config | BUG-052 (blocked on backend). |
| Bug tracker / `BUG_TEMPLATE.md` row statuses | Not modified in this planning run unless explicitly instructed. |

---

## 11. Handoff To Implementation Agent

The implementation agent should treat the following as its working scope:

### Bugs to implement
- **Bucket 1 — Financial cluster:** BUG-051, BUG-054, BUG-055.
- **Bucket 2 — UI render gates:** BUG-062, BUG-073.
- **Bucket 3 — Dashboard presentation:** BUG-070, BUG-071.
- **Bucket 4 — Socket reconnect rehydration:** BUG-068.

### Recommended order
1. Bucket 2 (warm-up; lowest risk).
2. Bucket 3 (presentation; medium risk).
3. Bucket 4 (socket; isolated subsystem).
4. Bucket 1 (financial cluster; highest risk; lands last).

### Files likely touched (consolidated)
- `frontend/src/api/transforms/orderTransform.js`
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx`
- `frontend/src/components/order-entry/CartPanel.jsx`
- `frontend/src/components/order-entry/OrderEntry.jsx`
- `frontend/src/components/cards/OrderCard.jsx`
- `frontend/src/components/cards/TableCard.jsx`
- `frontend/src/components/reports/OrderTable.jsx`
- `frontend/src/components/reports/OrderDetailSheet.jsx`
- `frontend/src/pages/DashboardPage.jsx`
- `frontend/src/components/dashboard/ChannelColumnsLayout.jsx`
- `frontend/src/components/dashboard/ChannelColumn.jsx`
- `frontend/src/api/socket/socketService.js`
- `frontend/src/api/socket/useSocketEvents.js`
- `frontend/src/contexts/OrderContext.jsx`
- `frontend/src/__tests__/api/transforms/qa_subtotal_delivery_validation.test.js`
- `frontend/src/__tests__/api/transforms/orderTransformFinancials.test.js`

### Files NOT to touch (must respect)
- All paths in Section 10.
- All bugs flagged blocked / pending owner or backend (Section 3.2 and 3.3).

### QA expectations
- All buckets must pass Section 8 QA assertions before being marked complete.
- Bucket 1 must include backend re-alignment confirmation note for the round-off rule reversal.
- Bucket 4 must include explicit dedupe-correctness assertions to prevent duplicate orders.
- Bucket 3 must include `data-testid` selector audit (no regressions).

### Excluded from this scope
- BUG-075, BUG-079, BUG-080 (pending-freeze alignment items — planned separately).
- BUG-082, BUG-083, BUG-084, BUG-085 (block_implementation_planning).
- All other owner/backend-blocked bugs (see Section 3.3).

---

## 12. Final Status

`clean_safe_bug_implementation_plan_created`
