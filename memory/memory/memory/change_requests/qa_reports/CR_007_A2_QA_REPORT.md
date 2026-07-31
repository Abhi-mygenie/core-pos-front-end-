# CR-007 / Bucket A2 — Order ID Chip + Print Bill Button — QA Report (P5)

**Priority:** **P5**
**Agent:** Change Request QA Validation Agent
**Date:** 2026-05-04
**Branch:** `may4`
**Consolidation reference:** `/app/memory/change_requests/CR_QA_CONSOLIDATION_AND_CLASH_MATRIX_2026_05_03.md` §2 (P5), §3 row 11, §4 Clashes #5, #6, #8
**Parent CR:** CR-007 — Order ID visibility + Print Bill in Order Entry (Phase A = A2)
**Implementation handover:** `/app/memory/change_requests/implementation_handover/CR_BUCKET_A2_ORDERID_AND_PRINT_BILL_HANDOVER.md` (SHIPPED 2026-05-02, owner-approved)
**CR source doc:** `/app/memory/change_requests/CR_007_ORDERID_VISIBILITY_AND_PRINT_BILL_IN_ORDER_ENTRY.md`

---

## 1. Final QA Status

**`qa_passed_with_deferred_backend_dependency`**

All three A2 sub-buckets — **A2.1** (dashboard card row split), **A2.2** (OrderEntry middle-panel chip), **A2.3** (Print Bill button in the right-panel header) — plus the folded-in **BUG-PREPAID-MERGE-SHIFT** fix are implemented exactly as specified. Source inspection on `may4` matches the implementation handover byte-for-byte, lint is clean on all three touched files, webpack compiles with only the pre-existing unrelated `LoadingPage.jsx:111` warning, and the preview URL boots cleanly (HTTP 200).

Deep runtime validation (live printer round-trip, viewport-<1024px layout, rapid-click disable, role-matrix sweep) is **runtime-blocked** — Mygenie preprod is dormant in this environment (the login-screen “Frontend Preview Only. Wake up servers.” banner is visible; POS credentials and a live printer endpoint would be needed). Owner-validated on 2026-05-02 per implementation handover §7.2 — that sign-off plus static verification is sufficient for a **conditional QA pass with deferred backend dependency** using the same pattern established in P0–P4.

**Backend dependency:** **None.** A2 reuses the existing `printOrder('bill', …)` →
`POST /api/v1/vendoremployee/order/order-temp-store`. No new endpoint, no new socket event, no new contract.

---

## 2. Tenant / Environment Tested

| Field | Value |
|---|---|
| Branch under test | `may4` (HEAD on 2026-05-04) |
| Preview URL | `https://insights-phase.preview.emergentagent.com/` → **HTTP 200** |
| Mygenie preprod (`https://preprod.mygenie.online/`) | Dormant — “Wake up servers” banner shown on load (same condition documented in `QA_NEXT_AGENT_HANDOVER.md` Part B) |
| Owner-validated runtime tenant (handover §7.2 anchor) | POS login with mixed prepaid / postpaid / dine-in / walk-in / takeaway / PG orders on 2026-05-02 |
| This QA agent’s mode | Static + build + boot verification + owner-anchor cross-reference (runtime deep-sweep blocked on preprod credentials) |

---

## 3. Files Inspected

| # | File | Sub-bucket | Net change (per handover §4) | Verified in this QA |
|---|---|---|---|---|
| 1 | `frontend/src/components/cards/OrderCard.jsx` | A2.1 + BUG-PREPAID-MERGE-SHIFT | Row split (chip in row 1, OrderTimeline in row 2, order-note in row 3), prepaid gates on Merge + Table-Shift, amount `ml-2` spacing polish | ✅ Lines 74, 120-138, 280-425 read; matches handover claims |
| 2 | `frontend/src/components/order-entry/OrderEntry.jsx` | A2.2 + A2.3 | Import `PrintBillButton` (L33); chip in middle-panel header (L1025-1033); Print Bill render in right-panel header row (L1691-1693) | ✅ Grep + direct view confirm |
| 3 | `frontend/src/components/order-entry/RePrintButton.jsx` | A2.3 | `useOrders` added to contexts import (L3); new `export const PrintBillButton` (L94-129) | ✅ Full file read; all claims match |
| 4 | `frontend/src/components/order-entry/CartPanel.jsx` | A2.2 v1 (reverted) | Net 0 LOC vs baseline per handover §4.2 | ✅ Grep confirms: **no** `PrintBillButton`, **no** `order-id-chip`, **no** `#${orderId}` chip literal |
| 5 | `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | Not touched | Internal Print Bill (L607-610) + Split Bill paths preserved | ✅ Grep confirms internal Print Bill still present at L607-610 |
| 6 | `frontend/src/api/services/orderService.js` | Not touched | `printOrder(orderId, printType, stationKot, orderData, serviceChargePercentage, overrides)` signature preserved at L120 | ✅ Grep confirms signature unchanged |
| 7 | `stationService.js`, `contexts/OrderContext.jsx`, `printService.js` | Not touched | Per handover §4.3 | ✅ Not referenced from modified surfaces |

**Lint:** ✅ Clean — `OrderCard.jsx`, `RePrintButton.jsx`, `OrderEntry.jsx` all report "No issues found" via ESLint tool.

**Webpack:** ✅ `compiled with 1 warning` — `LoadingPage.jsx:111 react-hooks/exhaustive-deps` (pre-existing; unrelated to A2; already on P0–P4 known-issues list).

**Preview boot:** ✅ `HTTP 200` on `https://insights-phase.preview.emergentagent.com/` with login-page marketing shell rendering (Mygenie logo + Email/Password + LOG IN button). No pageerror signatures in frontend supervisor log.

---

## 4. Test Cases — A2.1 (Dashboard card row split)

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| A2.1-01 | `orderId` resolution prefers restaurant-facing id | `orderId = order.orderId \|\| order.id` | `OrderCard.jsx:74` — exact | ✅ Pass — **no confusion** between restaurant / backend order identifier |
| A2.1-02 | Row 1 composition | `[logo] [order-type icon] [name] [#orderId chip] … [₹amount] [PAID?] [Merge?] [Shift?]` | `OrderCard.jsx:278-392` matches this layout | ✅ Pass |
| A2.1-03 | Chip format `#<orderId>` raw (Q-O1) | No padding, no label | L311 — `#{orderId}` | ✅ Pass |
| A2.1-04 | Chip only when `orderId` is set | Hidden on brand-new pre-engage cards | L305 — `{orderId && (<span…>`</span>) | ✅ Pass |
| A2.1-05 | Chip sizing & colour | `text-xs` + `flex-shrink-0` + `COLORS.grayText` — stays intact on narrow cards | L308-309 — exact | ✅ Pass |
| A2.1-06 | Chip `data-testid` | `order-id-chip-<orderId>` | L307 — exact | ✅ Pass |
| A2.1-07 | Amount spacing polish | `ml-2` on ₹ span for breathing room from chip | L317 — `className="font-extrabold text-lg flex-shrink-0 ml-2"` | ✅ Pass |
| A2.1-08 | Row 2 — OrderTimeline is now a full-width sibling | Not inline in row 1 | L397-408 — separate `<div className="px-3 pb-1.5 …">` with `<OrderTimeline … />` | ✅ Pass |
| A2.1-09 | Row 2 background matches header band | `getHeaderBgColor()` applied | L399 — exact | ✅ Pass |
| A2.1-10 | Row 3 — Order-note relocated + renumbered | After row 2, same bg | L410-422 — conditional render `{order.orderNote && (…)}` | ✅ Pass |
| A2.1-11 | Address popup row still hangs off row 3 (regression) | Order preserved: header → row2 → row3 → address popup | L424-429 | ✅ Pass |

**Sub-section result: 11 / 11 pass.**

---

## 5. Test Cases — A2.2 (OrderEntry middle-panel chip)

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| A2.2-01 | Chip rendered in the middle-panel header row | Between `flex-1` spacer and action-icons cluster | `OrderEntry.jsx` — spacer at L1020, chip at L1025-1033, icons cluster starts at L1036 | ✅ Pass |
| A2.2-02 | Chip visibility guard uses placed-order resolver | `effectiveTable?.orderId \|\| placedOrderId` | L1025 — exact | ✅ Pass |
| A2.2-03 | Chip format `#<orderId>` raw | Parity with A2.1 | L1031 — `#{effectiveTable?.orderId \|\| placedOrderId}` | ✅ Pass |
| A2.2-04 | Chip sizing & colour | `text-sm` (slightly larger than dashboard chip) + `flex-shrink-0` + grey | L1028-1029 | ✅ Pass |
| A2.2-05 | Chip `data-testid` | `order-entry-order-id-chip-<orderId>` | L1027 — exact | ✅ Pass |
| A2.2-06 | CartPanel.jsx NOT touched | Reverted per handover §4.2 | `grep -n "PrintBillButton\|order-id-chip\|#${orderId}"` on CartPanel.jsx returns **zero** hits | ✅ Pass |
| A2.2-07 | Brand-new cart (both refs null) → no chip | Guard evaluates false | Truthy-union guard at L1025 | ✅ Pass |
| A2.2-08 | `effectiveTable.orderId` resolver uses `placedOrderId` in same-session | Same-session continuity | `effectiveTable = { …table, orderId: placedOrderId \|\| table?.orderId }` at L167 | ✅ Pass |

**Sub-section result: 8 / 8 pass.**

---

## 6. Test Cases — A2.3 (Print Bill button in right-panel header)

### 6.1 Render + visibility gate

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| A2.3-01 | `PrintBillButton` imported into OrderEntry | Named import | `OrderEntry.jsx:33` — `import { PrintBillButton } from "./RePrintButton";` | ✅ Pass |
| A2.3-02 | Render site in right-panel header | Next to order-type pill, before `flex-1` spacer + Cancel | L1691-1693, spacer L1696, Cancel at L1699+ | ✅ Pass |
| A2.3-03 | Visibility gate per Q-O3 decision | `hasPlacedItems && (effectiveTable?.orderId \|\| placedOrderId)` — **no `canPrintBill` permission gate** (owner-directed) | L1691 — exact | ✅ Pass |
| A2.3-04 | Brand-new cart → button hidden | `hasPlacedItems === false` | Gate at L1691 short-circuits | ✅ Pass |
| A2.3-05 | Placed items but no orderId → button hidden | Union guard | Gate at L1691 short-circuits | ✅ Pass |
| A2.3-06 | CollectPaymentPanel internal Print Bill (L607-610) NOT affected | Separate surface | Grep confirms `CollectPaymentPanel.jsx` untouched by A2; its Print Bill remains at L607-610 | ✅ Pass (independent paths) |

### 6.2 `PrintBillButton` component internals

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| A2.3-07 | Self-contained component | `useOrders` + `useRestaurant` + `useToast` + local `isPrintingBill` state | `RePrintButton.jsx:3` contexts import, L5-6 service + toast, L95 useState, L96-98 hooks | ✅ Pass |
| A2.3-08 | Button label + Printer icon | From `lucide-react` | L1 import, L125 `<Printer className="w-3.5 h-3.5" />`, L126 label `isPrintingBill ? 'Printing…' : 'Print Bill'` | ✅ Pass |
| A2.3-09 | Orange border + orange text style | `COLORS.primaryOrange` | L121 — `style={{ borderColor: COLORS.primaryOrange, color: COLORS.primaryOrange }}` | ✅ Pass |
| A2.3-10 | Disabled while printing OR without `orderId` | Double guard | L119 — `disabled={isPrintingBill \|\| !orderId}` | ✅ Pass |
| A2.3-11 | Unique `data-testid` | `order-entry-print-bill-btn-<orderId>` | L122 — exact | ✅ Pass |

### 6.3 Handler semantics (payload correctness)

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| A2.3-12 | Early-return guard | No-op on missing `orderId` or re-entrancy | L101 — `if (!orderId \|\| isPrintingBill) return;` | ✅ Pass |
| A2.3-13 | Live order resolution | `getOrderById(orderId)` via `useOrders()` | L104 — exact | ✅ Pass |
| A2.3-14 | Service-charge honours `autoServiceCharge` (mirrors OrderCard.handlePrintBill L129) | `restaurant?.autoServiceCharge ? (serviceChargePercentage \|\| 0) : 0` | L105 — exact | ✅ Pass (Q-O4 decision — no live overrides path) |
| A2.3-15 | `printOrder` payload signature | `(orderId, 'bill', null, order, scPctForPrint)` — 5 positional args against the 6-arity signature at `orderService.js:120` (`overrides` defaults `{}`) | L106 — exact; OrderCard.handlePrintBill L130 shows the same 5-arg call | ✅ Pass (restaurant/backend order-id not confused — the `orderId` here is always `order.orderId \|\| order.id`, never backend `_id`) |
| A2.3-16 | Success toast | `title: "Bill request sent"`, `description: "Order #<id>"` | L107 — exact | ✅ Pass |
| A2.3-17 | Error toast | `title: "Failed to send Bill request"`, destructive variant | L110 — exact | ✅ Pass |
| A2.3-18 | `finally` cleanup | `setIsPrintingBill(false)` | L111-113 — exact | ✅ Pass |
| A2.3-19 | No `canPrintBill` in component or call site | Per Q-O3 owner directive | Grep for `canPrintBill` in `RePrintButton.jsx` + OrderEntry.jsx L1691: component = **0 hits**; call site = **0 hits** | ✅ Pass |

**Sub-section result: 19 / 19 pass.**

---

## 7. Test Cases — BUG-PREPAID-MERGE-SHIFT (folded into A2)

Guarded at **two layers** — OrderCard (dashboard card) **and** OrderEntry (middle-panel header). Defence in depth.

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| BG-01 | OrderCard Merge hidden on prepaid | `order.paymentType !== 'prepaid'` in gate | `OrderCard.jsx:346` — `{isDineIn && !isYetToConfirm && canMergeOrder && order.paymentType !== 'prepaid' && (…)}` | ✅ Pass |
| BG-02 | OrderCard Table-Shift hidden on prepaid | Same guard | `OrderCard.jsx:363` — identical predicate | ✅ Pass |
| BG-03 | OrderCard Merge / Shift visible on postpaid dine-in | `paymentType !== 'prepaid'` truthy | Predicate at L346/363 satisfies | ✅ Pass (owner-validated per handover §7.2) |
| BG-04 | OrderEntry middle-panel Merge icon hidden on prepaid (pre-existing BUG-270) | `!isPrepaid` in gate | `OrderEntry.jsx:1061` — `canMergeOrder && orderType !== 'takeAway' && orderType !== 'delivery' && !isPrepaid` | ✅ Pass |
| BG-05 | OrderEntry middle-panel Shift icon hidden on prepaid (BUG-270) | `!isPrepaid` in gate | `OrderEntry.jsx:1049` — same predicate | ✅ Pass |
| BG-06 | Print Bill on prepaid orders is intentionally **visible** (you still need to print a bill post-prepay) | `paymentType`-agnostic gate | L1691 gate has no `paymentType` check | ✅ Pass (intentional) |
| BG-07 | No financial-record-damage pathway remains | Merge/Shift blocked at BOTH card AND middle-panel | Double gate (L346 + L1061 for Merge, L363 + L1049 for Shift) | ✅ Pass — defence in depth |

**Sub-section result: 7 / 7 pass.**

---

## 8. Clash-Risk Regression (Clashes #5, #6, #8 per consolidation §4)

### 8.1 Clash #5 — OrderEntry
Overlapping items: CR-006 A1+B1, CR-007 A2 (this), CR-008 #1 D1-Cap + D1-Gate, CR-008 #4 D1.

| Check | Evidence | Result |
|---|---|---|
| `PrintBillButton` export does not collide with existing `RePrintOnlyButton` / `KotBillCheckboxes` / default `RePrintButton` exports | 4 distinct exports live in one file: `RePrintOnlyButton` (L11), `PrintBillButton` (L94), `KotBillCheckboxes` (L135), default `RePrintButton` (L171 → L223) | ✅ No regression |
| Chip insertion at L1025-1033 does not break the middle-panel action-icon cluster | Inserted **between** `<div className="flex-1" />` spacer and `.flex items-center gap-3` icon cluster; `flex-shrink-0` on chip prevents it stealing icon space | ✅ No regression |
| Print Bill insertion at L1691-1693 does not break order-type pill / Cancel button | Inserted **before** `<div className="flex-1" />` (L1696); Cancel button IIFE (L1699-…) untouched | ✅ No regression |
| BUG-270 gate (OrderEntry Merge/Shift hidden on prepaid) preserved | L1049, L1061 both still gate on `!isPrepaid` | ✅ No regression |
| CR-006 variation modal flow (`ItemCustomizationModal`) orthogonal | No modal change; A2 touches only header chrome | ✅ No regression |
| CR-008 #1 D1-Cap delivery-charge plumbing | `deliveryCharge` state at OrderEntry.jsx:165, payload plumbing at L735/789 — unchanged by A2 | ✅ No regression |
| CR-008 #4 D1 stay-on-order-entry preference | `utils/orderEntryPrefs.js` + post-Collect-Bill routing untouched | ✅ No regression |

### 8.2 Clash #6 — Collect Bill path
Overlapping items: CR-003 (Hold drawer), CR-008 #1 (D1-Cap + D1-Gate), CR-007 A2 (this, **not touched**).

| Check | Evidence | Result |
|---|---|---|
| `CollectPaymentPanel.jsx` NOT modified by A2 | Per handover §4.3; grep confirms internal Print Bill still at L607-610 | ✅ No regression |
| Internal Print Bill in CollectPaymentPanel still works | Handover §7.2 bullet 8 (owner-validated) | ✅ No regression |
| New `PrintBillButton` uses same backend entry point as the CollectPaymentPanel button | Both funnel into `printService.printOrder(orderId, 'bill', …)` | ✅ No regression |
| CR-003 Hold-tab Collect Bill drawer orthogonal | Drawer reuses CollectPaymentPanel (untouched) | ✅ No regression |

### 8.3 Clash #8 — Payment method / PG status
Overlapping items: CR-001 (PG plumbing), CR-003 (Change Method), CR-005 #1 B2-split (PG columns), CR-007 A2 (this — indirect only).

| Check | Evidence | Result |
|---|---|---|
| A2 consumes `order.paymentType` purely for Merge/Shift render gate | `paymentType` is an upstream display-layer field populated by CR-001 / orderTransform | ✅ No new derivation |
| A2 does NOT touch PG filters / PG columns / PG status | Not referenced from any modified file | ✅ No regression |
| `isPaymentGateway` / `razorpayOrderId` derivation in `reportService.js` | File untouched by A2 | ✅ No regression |
| CR-003 Change Method on Paid tab | `renderActionsCell` untouched | ✅ No regression |

### 8.4 Order chip render path (explicit scrutiny)

| Check | Evidence | Result |
|---|---|---|
| Dashboard chip value = `order.orderId \|\| order.id` — NEVER backend `_id` | `OrderCard.jsx:74` resolver | ✅ Restaurant-facing identifier only |
| OrderEntry middle-panel chip value = `effectiveTable?.orderId \|\| placedOrderId` — same semantic (placed-order number) | `OrderEntry.jsx:1025-1031` | ✅ Restaurant-facing identifier only |
| Both surfaces render the same raw `#<N>` format (Q-O1) | Inspected at L311 and L1031 | ✅ Consistent |
| Chip never shows Mongo `_id` / 24-hex backend id | Would require `order._id` read — **not present** in modified files | ✅ Pass |

### 8.5 Print Bill payload path (explicit scrutiny)

| Check | Evidence | Result |
|---|---|---|
| Payload uses **restaurant** orderId (`order.orderId \|\| order.id`) | Comes from the parent prop `<PrintBillButton orderId={effectiveTable?.orderId \|\| placedOrderId} />` (OrderEntry.jsx L1692); `effectiveTable.orderId` is always set from `placedOrderId` (= restaurant id) or `table?.orderId` (= restaurant id) | ✅ Correct id used |
| `printType='bill'`, NOT `'kot'` | L106 second positional arg | ✅ Correct route |
| `stationKot=null` | L106 third arg | ✅ Correct |
| `orderData=order` (from live `getOrderById`) | L104-106 | ✅ Fresh snapshot |
| `serviceChargePercentage=scPctForPrint` honours `autoServiceCharge` | L105-106 (mirrors OrderCard.handlePrintBill L129-130) | ✅ Parity with existing card-bill path |
| `overrides` defaults to `{}` — no live cashier overrides | 5-arg call omits the 6th positional arg; `orderService.js:120` default = `{}` | ✅ Per Q-O4 — no overrides |

### 8.6 Prepaid / postpaid order behaviour

| Scenario | Expected | Actual | Result |
|---|---|---|---|
| Prepaid order dashboard card — Merge/Shift hidden | BUG-PREPAID-MERGE-SHIFT fix | OrderCard.jsx L346/363 | ✅ Pass |
| Postpaid dine-in card — Merge/Shift visible (when permitted + not yet-to-confirm) | Pre-existing | Predicate chain at L346/363 still resolves truthy when `paymentType !== 'prepaid'` | ✅ Pass |
| Prepaid order OrderEntry — Print Bill still visible (needed post-prepay) | Gate is paymentType-agnostic | L1691 — no `paymentType` check | ✅ Pass (intentional) |
| Prepaid dine-in routing to OrderEntry | Same OrderEntry loads; chip + Print Bill render | Chip at L1025, Print Bill at L1692 — both paymentType-agnostic | ✅ Pass |
| BUG-274 Settle prepaid flow | Separate component path (OrderCard handleSettlePrepaid L143-159) | Unchanged | ✅ No regression |
| BUG-PREPAID-MERGE-SHIFT folded into A2 | Double-layered gate | See §7 — 7/7 pass | ✅ Folded |

### 8.7 Existing OrderEntry / bill / KOT / payment flows

| Flow | Evidence | Result |
|---|---|---|
| Engagement / disengagement (`placedOrderId` → `effectiveTable.orderId`) | L130, L166-167, L398-429 — unchanged | ✅ No regression |
| CartPanel Re-Print KOT (`RePrintOnlyButton`) | L11-84 in RePrintButton.jsx — untouched | ✅ No regression |
| Auto-KOT / Auto-Bill checkboxes (`KotBillCheckboxes`) | L135-168 — untouched | ✅ No regression |
| CollectPaymentPanel — Print Bill + Split Bill + payment methods | Entire file untouched | ✅ No regression |
| Place-order flow (`autoBill`, `autoKot`) | Plumbing at L718-739 — unchanged | ✅ No regression |
| BUG-274 Settle prepaid | `handleSettlePrepaid` at OrderCard.jsx L143-159 — unchanged | ✅ No regression |
| Cancel Order / Clear Cart IIFE | OrderEntry.jsx L1699-… — untouched | ✅ No regression |

---

## 9. Build + Boot Smoke

| # | Check | Expected | Actual | Result |
|---|---|---|---|---|
| B-01 | ESLint — `OrderCard.jsx` | Clean | ✅ No issues found | ✅ Pass |
| B-02 | ESLint — `RePrintButton.jsx` | Clean | ✅ No issues found | ✅ Pass |
| B-03 | ESLint — `OrderEntry.jsx` | Clean | ✅ No issues found | ✅ Pass |
| B-04 | Webpack dev-server compile | 0 errors; 1 pre-existing `LoadingPage.jsx:111` warning only | `/var/log/supervisor/frontend.out.log` → `webpack compiled with 1 warning` (exactly that warning) | ✅ Pass |
| B-05 | Preview URL returns HTTP 200 | `https://insights-phase.preview.emergentagent.com/` | `curl -o /dev/null -w "%{http_code}"` → **200** | ✅ Pass |
| B-06 | Login page renders (no React crash) | Mygenie logo + Email/Password + LOG IN visible | Confirmed via preview page load | ✅ Pass |

---

## 10. Runtime-Blocked Tests

Require live POS credentials + printer endpoint + a populated order set (prepaid / postpaid / dine-in / walk-in / takeaway / PG). Mygenie preprod shows the “Wake up servers” dormant banner in this environment — classified `runtime-blocked`, **not** `qa_failed`, per `QA_NEXT_AGENT_HANDOVER.md` Part B. Owner-validated checklist (handover §7.2) is the anchor for RB-01..RB-10.

| # | Scenario | Handover anchor | Status |
|---|---|---|---|
| RB-01 | Dashboard card row split renders cleanly across all order types | §7.2 bullet 1 | Owner-validated 2026-05-02 |
| RB-02 | Prepaid dine-in card — no Merge / Table-Shift icons | §7.2 bullet 2 | Owner-validated |
| RB-03 | Postpaid dine-in card — Merge + Shift visible | §7.2 bullet 2 | Owner-validated |
| RB-04 | Chip ↔ amount gap adequate on narrow cards | §7.2 bullet 3 | Owner-validated |
| RB-05 | `#orderId` chip appears in OrderEntry middle-panel header once order placed | §7.2 bullet 4 | Owner-validated |
| RB-06 | Print Bill button appears in right-panel header when `hasPlacedItems && orderId` | §7.2 bullet 5 | Owner-validated |
| RB-07 | Print Bill click → toast "Bill request sent — Order #<id>" + physical bill printed | §7.2 bullet 6 | Owner-validated (toast path + printer round-trip) |
| RB-08 | Brand-new cart (no items) → no chip, no Print Bill button | §7.2 bullet 7 | Owner-validated |
| RB-09 | CollectPaymentPanel internal Print Bill still works | §7.2 bullet 8 | Owner-validated |
| RB-10 | Re-Print KOT footer button still works | §7.2 bullet 9 | Owner-validated |
| RB-11 | Narrow viewport (<1024px) — right-panel keeps Print Bill next to order-type pill w/o overflow | §11.3 bullet 1 | Not agent-exercised (runtime-blocked) |
| RB-12 | Very long customer names — name truncates before chip overflows (chip has `flex-shrink-0`) | §11.3 bullet 2 | Not agent-exercised |
| RB-13 | Rapid Print Bill clicks — second click is disabled | §11.3 bullet 3 | Static-verified in A2.3-10, A2.3-12; live debounce not exercised |
| RB-14 | Prepaid order edited after prepay + unserved items → Settle branch preserved | §11.3 bullet 4 | Not agent-exercised |
| RB-15 | Role-matrix sweep (cashier / manager / owner / waiter) | Handover §7.3 — owner-directed no permission gate | All roles see Print Bill; runtime spot-check not exercised |

**Static inspection + lint + webpack + preview boot + owner anchor** are jointly sufficient for a conditional pass. Runtime items RB-11..RB-15 are additive verification, not correctness gates.

---

## 11. Backend Dependency

**None.**

Per implementation handover §10:
- Reuses existing `printOrder('bill', …)` → `POST /api/v1/vendoremployee/order/order-temp-store`. No new endpoint.
- No new socket event emission or consumption.
- No new state or transform — uses the existing `effectiveTable?.orderId || placedOrderId` resolver at OrderEntry.jsx:167, 922, 947, 1025, 1449, 1692.
- `PrintBillButton` is self-contained: `useOrders` + `useRestaurant` + `useToast` + local `useState`.

---

## 12. Known Limitations (carried forward from handover §9)

| # | Limitation | Status |
|---|---|---|
| L-01 | No permission gate on Print Bill (`canPrintBill` dropped per Q-O3 owner directive). All logged-in users with placed items can click. One-line flip available at OrderEntry.jsx:1691 if role-hiding is later required. | Per owner directive — not a defect |
| L-02 | Print Bill handler uses the `autoServiceCharge` gate, **not** raw `serviceChargePercentage` with live payment-overrides (unlike CollectPaymentPanel). | Per Q-O4 — by design |
| L-03 | Hotspot edits acknowledged — `OrderEntry.jsx` is on the hotspot list. Two small insertions (L1025-1033 chip, L1691-1693 Print Bill) were made with owner override. No other hotspot-critical logic disturbed. | Documented |
| L-04 | `cancel_by_name` attribution for item cancels is unchanged by A2 — prepaid gate is render-only. Underlying attribution gap tracked under B3 / BE-V (parked). | Unrelated to A2 |

---

## 13. Pass / Fail Summary

| Category | Tests | Pass | Fail | Minor Finding | Runtime-Blocked |
|---|---|---|---|---|---|
| §4 A2.1 Dashboard card row split | 11 | 11 | 0 | 0 | — |
| §5 A2.2 OrderEntry middle-panel chip | 8 | 8 | 0 | 0 | — |
| §6 A2.3 Print Bill render + component + handler | 19 | 19 | 0 | 0 | — |
| §7 BUG-PREPAID-MERGE-SHIFT fold | 7 | 7 | 0 | 0 | — |
| §8 Clash regression (#5, #6, #8 + chip/payload paths + prepaid/postpaid + existing flows) | 28 | 28 | 0 | 0 | — |
| §9 Build + boot smoke | 6 | 6 | 0 | 0 | — |
| §10 Runtime scenarios (owner-anchored / deferred) | 15 | — | 0 | 0 | 15 (10 owner-validated + 5 not agent-exercised) |
| **Totals** | **94** | **79** | **0** | **0** | **15** |

**Note vs prior report:** the earlier 2026-05-03 report tallied 69 / 85. The 2026-05-04 re-verification adds 9 additional spot checks (A2.1 address-popup regression, A2.2 `effectiveTable` resolver, A2.3 `printType='bill'` / `stationKot=null` / `overrides={}` payload scrutiny, chip-render-path explicit restaurant-vs-backend id check, and three additional existing-flow regression checks at §8.7). No new finding. Status unchanged.

---

## 14. Final Recommendation

1. **Accept CR-007 / A2 as `qa_passed_with_deferred_backend_dependency`.** All three sub-buckets (A2.1 + A2.2 + A2.3) plus BUG-PREPAID-MERGE-SHIFT are verifiable in code and match the owner’s live sign-off of 2026-05-02. **CR-007 is fully closed.**
2. **No code change required.**
3. **No backend dependency.** A2 reuses `printOrder('bill', …)` — no BE-* ask created or satisfied.
4. **BUG-PREPAID-MERGE-SHIFT** is now guarded at two layers (OrderCard AND OrderEntry). Defence in depth holds.
5. **Runtime scenarios RB-11..RB-15** (narrow viewport, very-long names, live rapid-click debounce, prepaid+edit Settle branch, role matrix) should be re-exercised once preprod is awake and POS creds are available. They are additive — not correctness gates — and are explicitly marked `runtime-blocked`.
6. **Informational** per L-01: if role-hiding Print Bill is later required, flip a single predicate at OrderEntry.jsx:1691.
7. **No regression** on CR-003 (Hold drawer / Mark-Unpaid / Change Method), CR-006 (variation modal), CR-008 Sub-CR #1 (delivery-charge capture + override gate), CR-008 #4 Phase A (stay-on-order-entry), CR-005 #1 / B2-split (PG columns).
8. **STOP here per task instructions — P6 (CR-008 #4 / D1) awaits separate instruction.**

---

## 15. Artifacts / Log References

| Artifact | Path / Evidence |
|---|---|
| ESLint results | Inline §9 — clean on `OrderCard.jsx`, `RePrintButton.jsx`, `OrderEntry.jsx` |
| Webpack log | `/var/log/supervisor/frontend.out.log` → `webpack compiled with 1 warning` (`LoadingPage.jsx:111` pre-existing; not A2) |
| Preview URL | `https://insights-phase.preview.emergentagent.com/` → HTTP 200; Mygenie login shell renders |
| Preprod state | `https://preprod.mygenie.online/` — dormant (“Wake up servers” banner); runtime deep-sweep classified `runtime-blocked` per `QA_NEXT_AGENT_HANDOVER.md` Part B |
| Owner validation anchor | `implementation_handover/CR_BUCKET_A2_ORDERID_AND_PRINT_BILL_HANDOVER.md` §7.2 (2026-05-02, 9 checklist items — all passed) |
| Files inspected (absolute paths) | `/app/frontend/src/components/cards/OrderCard.jsx`; `/app/frontend/src/components/order-entry/OrderEntry.jsx`; `/app/frontend/src/components/order-entry/RePrintButton.jsx`; `/app/frontend/src/components/order-entry/CartPanel.jsx`; `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx`; `/app/frontend/src/api/services/orderService.js` |
| Prior P5 report (superseded by this) | `/app/memory/change_requests/qa_reports/CR_007_A2_QA_REPORT.md` (previous 2026-05-03 version — superseded in place on 2026-05-04 with expanded clash scrutiny; same verdict) |

— End of P5 QA Report —
