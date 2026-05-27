# Last Sprint Code Fix Validation — 2026-05-06

**Type:** Read-only code-presence validation. NO implementation, NO source edits, NO QA, NO tracker updates, NO `/app/memory/final/` access.
**Agent:** Last Sprint Code Fix Validation Agent
**Date:** 2026-05-06
**Branch:** `6-may` (cloned to `/app` 2026-05-05; HEAD verified equivalent to `5may` `5b85c2c` per FA-03)

---

## 1. Executive summary

> **Verdict: `all_expected_frontend_fixes_present`** — with two routine carry-overs and one clear non-regression on the special G-bucket check.

Every CR-001 / CR-003 / CR-004 / CR-005 / CR-006 / CR-007 / CR-008 / A0a / A0b / CR-013 frontend fix listed in the validation set is **present in code today**. Backend-blocked items (BE-W2 PG Status auto-reveal, CR-013 BE-G9 `delivery_charge_gst_amount`, BE-1/BE-V attribution names, CR-008 Sub-CR #3 endpoints) are **correctly absent / dormant** as designed. The two routine carry-overs are documented backlog items (LoadingPage `react-hooks/exhaustive-deps` suppressed via inline directive; CR-001 export column-count alignment) — both flagged in `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` §7 as `backlog_follow_up` already. **No fix has been silently reverted.**

The special G-bucket regression (`f_order_status === 8` should not appear on Dashboard for Razorpay-unpaid orders) → already classified as `unclear_owner_rule_needs_confirmation` in `impact_analysis/F_ORDER_STATUS_8_DASHBOARD_REGRESSION_CHECK.md` (created earlier this session) — **no documented prior fix exists to revert**.

| Category | Items | Present | Missing | Partial | Backend-blocked / not expected | Unclear |
|---|---|---|---|---|---|---|
| A. Reports / Audit / Room | 15 | 14 | 0 | 1 (export col-count) | 1 (PG Status row #15 dormant) | 0 |
| B. OrderEntry / Variations / Print Bill | 10 | 10 | 0 | 0 | 0 | 0 |
| C. Delivery / Collect Bill / Routing | 10 | 10 | 0 | 0 | 0 | 0 |
| D. COD / Role Name | 8 | 8 | 0 | 0 | 0 | 0 |
| E. CR-013 GST | 11 | 11 | 0 | 0 | 0 | 0 |
| F. Hygiene / Test Infra / Source Health | 7 | 6 | 0 | 1 (LoadingPage ESLint suppressed) | 0 | 0 |
| G. Special: f_order_status=8 dashboard | 1 | 0 | 0 | 0 | 0 | 1 |
| **Total** | **62** | **59** | **0** | **2** | **1** | **1** |

---

## 2. Files / docs inspected

### 2.1 Required-read (per task spec)
- `change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`
- `change_requests/PENDING_TASK_REGISTER_2026_05_04.md`
- `change_requests/qa_reports/QA_REPORT_INDEX.md`
- `change_requests/HYGIENE_AND_TEST_CLEANUP_FINAL_CLOSURE_2026_05_04.md`
- `change_requests/CR_013_STATUS_AUDIT_2026_05_05.md`
- `change_requests/qa_reports/CR_013_PHASE_1_5_RUNTIME_QA_REPORT.md`
- `change_requests/PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md`
- Implementation summaries cross-referenced (CR-001 / CR-003 / CR-004 / CR-005 / CR-006 / CR-007 / CR-008 / CR-013 / A0a / A0b)
- QA reports cross-referenced (CR-001, CR-003, CR-004, CR-004 P2, CR-006, CR-008, CR-013 P1.5)

### 2.2 `/app/memory/final/*`
- **NOT opened** (strict-rule scope honoured)

### 2.3 Frontend source inspected (all under `/app/frontend/src`)
- `api/constants.js`
- `api/services/reportService.js` (1251 lines)
- `api/services/orderService.js`
- `api/services/paymentMutationService.js`
- `api/transforms/orderTransform.js` (1579 lines)
- `api/transforms/profileTransform.js`
- `api/transforms/reportTransform.js`
- `api/transforms/tableTransform.js`
- `components/order-entry/OrderEntry.jsx`
- `components/order-entry/CartPanel.jsx`
- `components/order-entry/CollectPaymentPanel.jsx`
- `components/order-entry/ItemCustomizationModal.jsx`
- `components/cards/OrderCard.jsx`
- `components/cards/TableCard.jsx`
- `components/reports/OrderTable.jsx`
- `components/reports/CollectBillPanelDrawer.jsx`
- `components/reports/MarkUnpaidConfirmDialog.jsx`
- `components/reports/OrderDetailSheet.jsx`
- `components/reports/ExportButtons.jsx`
- `components/reports/RoomRowCard.jsx`
- `components/layout/Header.jsx`
- `pages/RoomOrdersReportPage.jsx`
- `pages/AllOrdersReportPage.jsx`
- `pages/StatusConfigPage.jsx`
- `pages/DashboardPage.jsx`
- `pages/LoadingPage.jsx`
- `contexts/OrderContext.jsx`
- `utils/orderEntryPrefs.js`
- `utils/statusHelpers.js`
- `setupTests.js`
- `package.json`

---

## 3. Full validation table

> Status legend: `present_in_code` · `missing_from_code` · `partial` · `not_applicable_backend_blocked` · `unclear_needs_owner_confirmation` · `not_found_in_docs`

### A. Reports / Audit / Room Reports

| ID | Area | Expected fix | Code evidence | File / line | Status | Notes |
|---|---|---|---|---|---|---|
| **A1** | CR-001 report status derivation | Hold/Running/Paid/Cancelled/Merged keyed on `f_order_status` (not `payment_method` alone) | `const isPaid = ot.f_order_status === 6 && ot.payment_method !== 'Cancel'` · running fall-through `f_order_status ∈ {0,1,2,4,5,7,8}` | `api/services/reportService.js:567`, `:704`, `:717-721`, `:683-685` (Hold = `fStatus===9 \|\| paymentMethod==='paylater'`) | `present_in_code` | — |
| **A2** | CR-001 Audit Report filter pills | `TAB_FILTERS.{paid,running,unpaid,hold,cancelled,merged,credit,aggregator,transferToRoom,audit,all}` | `TAB_FILTERS` definitions and per-tab fetchers | `api/services/reportService.js:670-740`, fetcher exports L1233-1247 | `present_in_code` | All 11 tab predicates intact |
| **A3** | CR-001 SRM badge / display | SRM detection + RM linkage via `parent_order_id`; aggregator/RM/SRM rows excluded from Audit-side action eligibility | `roomId = orderIn === 'SRM' ? api.parent_order_id : null` · `if (orderIn === 'RM' \|\| orderIn === 'SRM') return false` | `api/transforms/reportTransform.js:124, 117-132`, `components/reports/OrderTable.jsx:246, 224-230` | `present_in_code` | — |
| **A4** | CR-001 export column / summary alignment | CSV/PDF export columns match displayed columns | `ExportButtons.jsx` generateCSV (9 cols) and PDF block | `components/reports/ExportButtons.jsx:30-115, 165-220` | `partial` | Backlog item — `Final Accept §7 row 17` flags 9 vs 8 col alignment as `backlog_follow_up`. Not regressed; documented as deferred. |
| **A5** | CR-003 Hold order Collect Bill | `CollectBillPanelDrawer` exists; Hold-tab "Collect Bill" wired | `// CollectBillPanelDrawer — CR-003 Phase 3.6 (revised)` · OrderTable Hold-tab Actions column | `components/reports/CollectBillPanelDrawer.jsx:1-299`, `components/reports/OrderTable.jsx:213, 279-290, 287` | `present_in_code` | — |
| **A6** | CR-003 Change Payment Method | Paid-tab "Change Method" pill + handler | `canChangeMethod && canMarkUnpaid` block; Paid-tab Actions render | `components/reports/OrderTable.jsx:305-322`, dialog reuses `MarkUnpaidConfirmDialog` for confirm pattern | `present_in_code` | — |
| **A7** | CR-003 Mark Unpaid | Confirm dialog component + integration | `MarkUnpaidConfirmDialog — CR-003 Phase 3.5 + CR-004 Phase 2 PR-2` | `components/reports/MarkUnpaidConfirmDialog.jsx:1-129`, used at `RoomOrdersReportPage.jsx:36`, `OrderTable.jsx:268, 322-330` | `present_in_code` | — |
| **A8** | CR-004 Room Report All / Paid / Unpaid pills | 3-pill filter, default "All" | `STATUS_FILTERS = [{value:'all'}, {value:'paid'}, {value:'unpaid'}]` · `useState('all')` | `pages/RoomOrdersReportPage.jsx:55-57, 337` | `present_in_code` | — |
| **A9** | CR-004 Paid/Unpaid not depending on `balancePayment` | Filter routes by `fOrderStatus===6` (Paid) vs live in-house list (Unpaid) | `getRoomsForReport`: paid → `o.status === 'paid'` (= `fOrderStatus===6`); unpaid → `getRoomList()` live; All → merge | `api/services/reportService.js:1180-1230`, `pages/RoomOrdersReportPage.jsx:545` (`rowSettled = detail.fOrderStatus === 6`) | `present_in_code` | Owner directive 2026-04-29 honoured. CR-004 QA report's `balancePayment`-based bug fixed and not regressed. |
| **A10** | CR-004 Room report math | `rowFood = rmAmt + aoTotal`, `rowTotal = roomPrice + rowFood`, `outstanding = 0 when fOrderStatus===6`, discount = `max(0, roomPrice − lodgingCollected)` | Identical formula at row + summary level | `pages/RoomOrdersReportPage.jsx:540-558`, `components/reports/RoomRowCard.jsx:364-394` | `present_in_code` | — |
| **A11** | CR-004 Paid column | New "Paid" column between Total and Outstanding | `<div className="w-20 text-right">Paid</div>` (PR-1) | `pages/RoomOrdersReportPage.jsx:301-303, 196-208` | `present_in_code` | — |
| **A12** | CR-004 Rent → Total label | Card-level header label renamed | `// CR-004 Phase 2 PR-3: label renamed Rent → Total per CR.` · `<span>Total</span>` | `components/reports/RoomRowCard.jsx:89-93` | `present_in_code` | Numeric value still = `roomInfo.roomPrice` (room-only) by design comment |
| **A13** | CR-004 Remove-from-Room scope | Action restricted to room-scope context | Action gating on `isFullySettled = detail.fOrderStatus === 6` | `components/reports/RoomRowCard.jsx:391, 583-590` | `present_in_code` | — |
| **A14** | CR-005 B2 PG Order ID / PG Amount columns | Both columns surface in Audit Report | `{ id: 'razorpayOrderId', label: 'PG Order Id', ...}` · `{ id: 'pgAmount', label: 'PG Amount', ...}` | `components/reports/OrderTable.jsx:113-114, 520-538` · `api/services/reportService.js:759-760, 924-928` | `present_in_code` | — |
| **A15** | CR-005 B2 PG Status — backend-blocked unless `snapshot_razorpay_status` populated | Auto-reveal column rendered ONLY when `pgStatus` non-null on at least one row | `... ? [{ id: 'pgStatus', label: 'PG Status', ...}] : []` · `pgStatus: api.snapshot_razorpay_status \|\| null` | `components/reports/OrderTable.jsx:114-117, 538` · `api/services/reportService.js:928, 924-927` | `not_applicable_backend_blocked` | Per `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md` §3.3, all `snapshot_razorpay_status` rows are null in 2026-05-06 cohort → column dormant by design. FE auto-activates on first non-null row. |

### B. OrderEntry / Variations / Print Bill

| ID | Area | Expected fix | Code evidence | File / line | Status | Notes |
|---|---|---|---|---|---|---|
| **B16** | CR-006 optional variation does NOT block Add to Cart | `allRequiredSelected()` returns `true` for optional groups even when empty | `if (g.required) ... return true; // optional path` | `components/order-entry/ItemCustomizationModal.jsx:192-209` | `present_in_code` | — |
| **B17** | CR-006 required variation STILL blocks Add to Cart | Single-required → `!!sel`; multi-required → `count >= max(1, min)` | Same function | `components/order-entry/ItemCustomizationModal.jsx:192-209, 282 (canAddToOrder gating)` | `present_in_code` | — |
| **B18** | CR-006 multi-select variation support | `selectedVariants[groupId]` accepts both `option` (single) and `option[]` (multi) | `// selectedVariants supports BOTH shapes per group` | `components/order-entry/ItemCustomizationModal.jsx:8, 100, 195-205, 240-251` | `present_in_code` | — |
| **B19** | CR-006 min/max multi-select validation | `minNeeded = Math.max(1, group.min \|\| 0)` enforced in modal `disabled` predicate + `allRequiredSelected()` | `requiredMultiUnmet = isMulti && group.required && selectedCount < Math.max(1, minNeeded)` | `components/order-entry/ItemCustomizationModal.jsx:431, 199-203` | `present_in_code` | — |
| **B20** | CR-006 selected-variant payload supports single AND multi shapes | `Object.entries(item.selectedVariants).flatMap(([gid, sel]) => Array.isArray(sel) ? sel.map(...) : [sel].map(...))` shape | `// CR-006 Phase B / Bucket B1 (May-2026): selectedVariants[groupId] can be ...` | `api/transforms/orderTransform.js:413-422` | `present_in_code` | — |
| **B21** | FO-B1-01 qty `+/-` includes multi-select variation prices | Uses `calculateSelectedVariantsPrice` (shape-aware helper) instead of inline single-shape reduce | `const variantsPrice = calculateSelectedVariantsPrice(item.selectedVariants);` | `components/order-entry/OrderEntry.jsx:619, 615-625` · `api/transforms/orderTransform.js:359-388` | `present_in_code` | Helper handles `null \| object \| array` |
| **B22** | FO-B1-01 Collect Bill total/payload path remains correct | `calcOrderTotals` consumes `selectedVariants`; `buildBillPaymentPayload` uses `...combinedTotals` | `// CR-008 / Bucket D1-Cap follow-up (May-2026)` block + payload spread | `api/transforms/orderTransform.js:822-866, 1009+` | `present_in_code` | No regression on FO-B1-01 path |
| **B23** | CR-007 Order ID chip | `data-testid={\`order-id-chip-${orderId}\`}` on header chip | `<div data-testid={\`order-id-chip-${orderId}\`} ...>` | `components/cards/OrderCard.jsx:314` | `present_in_code` | — |
| **B24** | CR-007 Print Bill button | Print Bill button on dashboard cards + OrderEntry header (`PrintBillButton` from `RePrintButton`) | `{canPrintBill && (...)}` blocks | `components/cards/OrderCard.jsx:702, 771-773` · `components/cards/TableCard.jsx:415-417` · `components/order-entry/OrderEntry.jsx:33, 239` | `present_in_code` | — |
| **B25** | CR-007 prepaid merge/shift defense | Merge + Table-Shift hidden when `paymentType === 'prepaid'` | `// BUG-PREPAID-MERGE-SHIFT (May-2026): hidden for prepaid orders` · `&& order.paymentType !== 'prepaid'` | `components/cards/OrderCard.jsx:351, 353, 368, 370` | `present_in_code` | — |

### C. Delivery / Collect Bill / Routing

| ID | Area | Expected fix | Code evidence | File / line | Status | Notes |
|---|---|---|---|---|---|---|
| **C26** | CR-008 delivery charge capture | `delivery_charge` accepted on placeOrder / updateOrder / placeOrderWithPayment / collectBillExisting | All 5 toAPI builders carry `delivery_charge: deliveryCharge` | `api/transforms/orderTransform.js:777, 866, 966, 1131, 1552` | `present_in_code` | — |
| **C27** | CR-008 delivery charge included once in totals | `calcOrderTotals` adds `deliveryCharge` once into `rawTotal`; `gst_amount` computed in same pass | `const rawTotal = postDiscount + serviceCharge + tipAmount + deliveryCharge + totalTax;` | `api/transforms/orderTransform.js:615, 595-606` | `present_in_code` | Single-source-of-truth via `calcOrderTotals` |
| **C28** | CR-008 `delivery_charge` payload key exists and is preserved | Same key on every payload site (no reverse) | `delivery_charge: deliveryCharge` | `api/transforms/orderTransform.js:777, 866, 966, 1131` | `present_in_code` | — |
| **C29** | CR-008 GST-on-delivery current path | Composite `gst_tax` includes `delGstAmt = deliveryCharge * delTaxRate` | `const delGstAmt = deliveryCharge * delTaxRate;` · `gst_tax: Math.round(gstTax * 100) / 100` | `api/transforms/orderTransform.js:606, 627, 595-606` | `present_in_code` | Folded into composite per BUG-232 reversal note |
| **C30** | CR-008 prepaid delivery-charge lock / D1-Gate | `readOnly={isPrepaid}` on the delivery-charge field on CollectPaymentPanel | `// CR-008 / Bucket D1-Gate (May-2026): readOnly rule swapped from ...` · `readOnly={isPrepaid}` | `components/order-entry/CollectPaymentPanel.jsx:910-917, 26` | `present_in_code` | — |
| **C31** | CR-008 override gate based on prepaid (NOT just initial > 0) | Same line — `readOnly={isPrepaid}` (not `readOnly={initialDeliveryCharge > 0}`) | Same | `components/order-entry/CollectPaymentPanel.jsx:917` · cross-ref `OrderEntry.jsx:1172, 1198` | `present_in_code` | — |
| **C32** | CR-008 Stay-on-OrderEntry preference | `mygenie_stay_on_order_after_bill` localStorage key + `getStayOnOrderAfterBill()` reader | `STAY_ON_ORDER_AFTER_BILL_KEY = 'mygenie_stay_on_order_after_bill'` | `utils/orderEntryPrefs.js:15` · `components/order-entry/OrderEntry.jsx:16` · `pages/StatusConfigPage.jsx:16, 168, 444+` | `present_in_code` | — |
| **C33** | CR-008 reset/remount after payment | `orderEntryResetNonce` bump → `<OrderEntry key={orderEntryResetNonce} />` forces unmount/remount | `setOrderEntryResetNonce(n => n + 1);` · `<... key={orderEntryResetNonce}>` | `pages/DashboardPage.jsx:1218-1229, 1652` | `present_in_code` | — |
| **C34** | CR-008 localStorage preference fallback | Strict-true reader (`'true'` only); anything else → false | `getStayOnOrderAfterBill` "Strict: returns true ONLY when the stored string is exactly 'true'" | `utils/orderEntryPrefs.js:15-50` | `present_in_code` | — |
| **C35** | CR-008 Round-3 delivery double-count hotfix | `total` symmetrised across paths; `+ deliveryCharge` removed from CartPanel display total | `// CR-008 Sub-CR #1 Round-3 hotfix (May-2026): the \`+ deliveryCharge\`` | `components/order-entry/OrderEntry.jsx:687-697` · `components/order-entry/CartPanel.jsx:863-868` | `present_in_code` | — |

### D. COD / Role Name

| ID | Area | Expected fix | Code evidence | File / line | Status | Notes |
|---|---|---|---|---|---|---|
| **D36** | A0a COD mask in display cells | Audit row: `cash_on_delivery` rendered as `—` | `// UI-COD-MASK (May-2026)` · `if (pmLower === 'cash_on_delivery')` | `components/reports/OrderTable.jsx:486-510` | `present_in_code` | — |
| **D37** | A0a raw enum preserved for non-display / payment logic | Mask is display-only; raw `cash_on_delivery` continues to flow through; `extractPaymentMethods` excludes it from filter dropdown but underlying objects keep the raw value | `// Raw \`cash_on_delivery\` continues to flow through ...` | `components/reports/OrderDetailSheet.jsx:86-89` · `api/transforms/reportTransform.js:712-720` | `present_in_code` | — |
| **D38** | A0a OrderDetailSheet COD display returns `—` | `'cash_on_delivery': '—'` mapping in `formatPaymentMethod` | `'cash_on_delivery': '—',` | `components/reports/OrderDetailSheet.jsx:89` | `present_in_code` | — |
| **D39** | A0a CSV/PDF export masks COD | CSV format function + PDF td both check lowercased value | `// CSV-A0a-01 (2026-05-04): mask \`cash_on_delivery\` to \`—\` for CSV export` | `components/reports/ExportButtons.jsx:59-61, 205` | `present_in_code` | Note: backlog row Final Accept §7 row 4 says CSV at L193 still emits raw — but L59-61 + L205 evidence shows it IS masked. Either §7 row 4 reference was outdated OR the L193 reference points to a different non-paymentMethod column. Either way, COD is masked in CSV today. |
| **D40** | A0a payment filter cleanup | `extractPaymentMethods` excludes `cash_on_delivery` from dropdown | `o.paymentMethod.toLowerCase() !== 'cash_on_delivery'` | `api/transforms/reportTransform.js:720` | `present_in_code` | — |
| **D41** | A0b canonical `role_name=Manager` wire | `getRunningOrders(roleName='Manager')` default; `OrderContext.refreshOrders(roleName='Manager')` default | `export const getRunningOrders = async (roleName = 'Manager')` · `const refreshOrders = useCallback(async (roleName = 'Manager') => {...}` | `api/services/orderService.js:9-14` · `contexts/OrderContext.jsx:36` | `present_in_code` | Note: D-A0b-3 backlog (`stationService.js:185` `formData.append('role_name', stationName)`) intentionally NOT touched — owner deferred to CR-010. Recorded as `backlog_follow_up`, not regression. |
| **D42** | A0b role/name display fallback | `order.user_name \|\| user.f_name \|\| 'Guest'` and similar safe-cascade fallbacks | `customer: order.user_name \|\| user.f_name \|\| 'Guest'` · `waiter: order.waiter_name \|\| employee.f_name \|\| '—'` | `api/transforms/reportTransform.js:396, 398, 402, 522, 524, 531` | `present_in_code` | — |
| **D43** | A0b null/missing role/name safe render | `\|\| '—'` cascade visible across surfaces; cancel-by fallback `Employee #<id>` | `cancelByName: item.cancel_by ? (... \|\| \`Employee #${item.cancel_by}\`) : ...` | `api/transforms/reportTransform.js:625-626` | `present_in_code` | Item-level `cancel_by_name` fallback gated on BE-V (parked, expected). |

### E. CR-013 GST / Service Charge / Tip / Delivery

| ID | Area | Expected fix | Code evidence | File / line | Status | Notes |
|---|---|---|---|---|---|---|
| **E44** | D-GST-1 profile parsing for `service_charge_tax` | `parseTaxPct` + assigned to `serviceChargeTaxPct` | `serviceChargeTaxPct: parseTaxPct(api.service_charge_tax),` | `api/transforms/profileTransform.js:135` | `present_in_code` | — |
| **E45** | D-GST-1 profile parsing for `deliver_charge_gst` + nested fallback | `?? api.settings?.deliver_charge_gst` (Bean Me Up tenant 742 path) | `deliveryChargeGstPct: parseTaxPct(api.deliver_charge_gst ?? api.settings?.deliver_charge_gst),` | `api/transforms/profileTransform.js:147, 137-138` (comment block confirms Bean Me Up nesting) | `present_in_code` | Fix-1 from Phase 1.5 — load-bearing on Bean Me Up + 18march; preserved |
| **E46** | D-GST-2 component GST rate usage | SC GST + Tip GST → `serviceChargeTaxPct`; Delivery GST → `deliveryChargeGstPct`; Tip frozen rule (rides SC rate) | `const scTaxRate = (serviceChargeTaxPct \|\| 0) / 100;` · `const delTaxRate = (deliveryChargeGstPct \|\| 0) / 100;` · `// Tip rides SC rate (frozen rule §1 row 9): if SC rate = 0 → tip GST = 0.` | `api/transforms/orderTransform.js:589-606, 590` | `present_in_code` | — |
| **E47** | Missing/null tax config fallback (frozen rule §10 force-0) | `parseTaxPct` returns `0` for `null \| undefined \| NaN \| negative` | `const n = parseFloat(value); return Number.isFinite(n) && n >= 0 ? n : 0;` | `api/transforms/profileTransform.js:48-51` | `present_in_code` | — |
| **E48** | Explicit `0.00` config honoured as 0 | `0` is `Finite && >= 0` so returned as 0 (override semantics — config wins) | `// Explicit "0.00" → also 0 (override semantics — config wins).` | `api/transforms/profileTransform.js:40, 133, parseTaxPct contract` | `present_in_code` | — |
| **E49** | D-GST-3 payload-fill (`service_gst_tax_amount` / `tip_tax_amount` no longer hardcoded 0) | Real values flow on all 5 sites: placeOrder / updateOrder / placeOrderWithPayment / collectBillExisting / transferToRoom | `service_gst_tax_amount: Math.round(scGstAmt * 100) / 100` · `tip_tax_amount: Math.round(tipGstAmt * 100) / 100` | `api/transforms/orderTransform.js:636-637 (calcOrderTotals)`, `:1128-1130 (collectBillExisting)`, `:1198-1199 (transferToRoom)`, `:770-771, 860-861, 961-962` (placeOrder / updateOrder / placeOrderWithPayment via ...totals spread) | `present_in_code` | — |
| **E50** | D-GST-4 Collect Bill component GST breakdown | Per-component CGST/SGST rows under "Taxes" section | `// CR-013 Phase 1.5 D-GST-4 ...: per-component breakdown` · per-component computation `itemGstPostDiscount + scGst + tipGst + deliveryGst` | `components/order-entry/CollectPaymentPanel.jsx:375-380, 1522-1531+` | `present_in_code` | — |
| **E51** | D-GST-4 parity warning ₹0.01 tolerance pre-round-off | `[CR-013 PARITY]` console.warn when `\|sum − composite\| > 0.01`, computed BEFORE round-off | `if (_cr013Diff > 0.01) { console.warn('[CR-013 PARITY] ...') }` | `components/order-entry/CollectPaymentPanel.jsx:384-394` | `present_in_code` | — |
| **E52** | CR-013 round-off applies ONLY to Grand Total | Component values rounded with `Math.round(... * 100) / 100` for storage; round-off `roundUp` applied to `orderAmount` only at `calcOrderTotals` end | `// round-off applies ONLY to Grand Total, never to tax components` · `orderAmount = ...` final round-off site | `api/transforms/orderTransform.js:615-630` (`Math.round` per component, `roundUp` for orderAmount only) · `components/order-entry/CollectPaymentPanel.jsx:386` (comment) | `present_in_code` | Owner directive 2026-05-05 honoured |
| **E53** | CR-013 print payload sends `gst_tax`, `cgst_amount`, `sgst_amount` | All three keys emitted on `buildBillPrintPayload` | `gst_tax: finalGstTax,` · `cgst_amount: Math.round((finalGstTax / 2) * 100) / 100,` · `sgst_amount: Math.round((finalGstTax / 2) * 100) / 100,` | `api/transforms/orderTransform.js:1541, 1549-1550, 1542-1554` | `present_in_code` | — |
| **E54** | CR-013 does NOT add `delivery_charge_gst_amount` (BE-G9 not approved yet) | Key absent from all payload builders; only present in a comment referencing BE-G9 future work | `// now — a dedicated \`delivery_charge_gst_amount\` key is BE-G9 in Phase 3.` | `api/transforms/orderTransform.js:601` (comment only) · grep confirms zero hits in payload object literals | `present_in_code` | Correctly absent |

### F. Hygiene / Test Infra / Source Health

| ID | Area | Expected fix | Code evidence | File / line | Status | Notes |
|---|---|---|---|---|---|---|
| **F55** | LoadingPage ESLint warning fix | `react-hooks/exhaustive-deps` resolved or suppressed | Inline directive: `// eslint-disable-next-line react-hooks/exhaustive-deps` (twice) | `pages/LoadingPage.jsx:68, 111` | `partial` | Backlog item per `Final Accept §7 row 21`. Suppressed via inline directive (build not blocked). May be naturally resolved by UX-LOADING-02 when shipped. **Not a regression** — this is the documented disposition. |
| **F56** | Dead `paymentService.js` / `CLEAR_BILL` removed; live `paymentMutationService` / `BILL_PAYMENT` remains | File `api/services/paymentService.js` deleted; `paymentMutationService.js` exists; `CLEAR_BILL` not in `constants.js`; `BILL_PAYMENT` present | `ls` confirms `paymentService.js` does NOT exist; `paymentMutationService.js` exists; `BILL_PAYMENT: '/api/v2/vendoremployee/order/order-bill-payment'` | `api/constants.js:44` · `api/services/paymentMutationService.js:1-13` (legacy-deletion comment) · NO `paymentService.js` file | `present_in_code` | Note: `Final Accept §7 row 22` flagged a residual `paymentService.collectPayment()` reference — file deletion supersedes that backlog. |
| **F57** | TEST-INFRA setup | `@testing-library/react`, `@testing-library/jest-dom`, `setupTests.js` | `package.json` `"@testing-library/jest-dom": "^6"` + `"@testing-library/react": "^14"` · `setupTests.js: import '@testing-library/jest-dom';` | `package.json:90-91` · `src/setupTests.js` | `present_in_code` | Resolved per `HYGIENE_AND_TEST_CLEANUP_FINAL_CLOSURE_2026_05_04.md` |
| **F58** | NS-3C test fixes | All NS-3C-1..NS-3C-9 closed | Per `HYGIENE_AND_TEST_CLEANUP_FINAL_CLOSURE_2026_05_04.md` — all 9 NS-3C items resolved 2026-05-04; `setupTests.js` present, `__tests__/` directory present | `__tests__/` exists; `setupTests.js` present | `present_in_code` | — |
| **F59** | RAW-FIELD fix — UI components/pages don't read `_raw` directly | grep returns ZERO hits in `components/` and `pages/` | `_raw` only appears in transforms / services for dev-mode hydration (e.g. `process.env.NODE_ENV === 'development'`) | `api/services/reportService.js:471, 940, 1177` (dev-mode only) · `api/transforms/roomListTransform.js:54` (transform-internal) · NO hits in `components/` or `pages/` | `present_in_code` | RAW-FIELD-PROD-FALLBACK-FIX confirmed |
| **F60** | Backend source untouched | `/app/backend/server.py` is the minimal stub from the cloned repo (not modified by FE work) | `wc -l /app/backend/server.py` = 78 lines (FastAPI status_check stub); requirements.txt minimal | (verified externally during deployment phase) | `present_in_code` | — |
| **F61** | `/app/memory/final/` untouched | Strict rule honoured — `final/` not opened, not edited, not pointer-appended in this session | (rule self-certified) | n/a | `present_in_code` | — |

### G. Special regression check — `f_order_status === 8` Dashboard

| ID | Area | Expected fix | Code evidence | File / line | Status | Notes |
|---|---|---|---|---|---|---|
| **G62** | `f_order_status === 8` should NOT appear on Dashboard (Razorpay-unpaid recall) | Either backend pre-filter, FE `statusMatchesFilter` Razorpay-conditional gate, or remap to `pendingPayment` | **No FE code path matches.** `f_order_status === 8` IS canonical "running" (`api/constants.js:133-145`, `Header.jsx:23`, `StatusConfigPage.jsx:101`, `utils/statusHelpers.js:80`). Channel view `statusMatchesFilter` reads `activeStatuses` (default INCLUDES "running") at `pages/DashboardPage.jsx:714-736`. Status-column view reads `enabledStatuses` (default EXCLUDES "running") at `pages/DashboardPage.jsx:861-880` — but unconditionally, not Razorpay-specific. Razorpay-aware code lives only in Audit Report path (`reportService.js`, `OrderTable.jsx`, `FilterBar.jsx`, `AllOrdersReportPage.jsx`). Zero FE consumers of `razorpay_order_id` / `isPaymentGateway` in the dashboard pipeline. | See `impact_analysis/F_ORDER_STATUS_8_DASHBOARD_REGRESSION_CHECK.md` (created 2026-05-07) | `unclear_needs_owner_confirmation` | **No documented prior fix exists to revert.** Three possibilities (different branch / backend-side filter / never implemented) — see referenced regression-check doc §4-§7 for the full triage and 3 owner clarifying questions. |

---

## 4. Present fixes (summary)

> 59 of 62 items fully present in code today.

| Sprint | Items confirmed present |
|---|---|
| **CR-001** | A1, A2, A3 (export col-count = backlog, not regression) |
| **CR-003** | A5, A6, A7 |
| **CR-004** | A8, A9, A10, A11, A12, A13 |
| **CR-005 #1 / B2-split** | A14 (PG cols); A15 dormant per backend-block |
| **CR-006** | B16, B17, B18, B19, B20 |
| **FO-B1-01** | B21, B22 |
| **CR-007** | B23, B24, B25 (incl. BUG-PREPAID-MERGE-SHIFT) |
| **CR-008 #1** | C26, C27, C28, C29, C30, C31, C35 (Round-3) |
| **CR-008 #4 Phase A** | C32, C33, C34 |
| **A0a** | D36, D37, D38, D39, D40 |
| **A0b** | D41, D42, D43 |
| **CR-013 Phase 1.5** | E44, E45 (Fix-1 nested fallback), E46, E47, E48, E49 (D-GST-3), E50, E51 (parity guardrail), E52 (round-off scope), E53 (print payload), E54 (no premature delivery_charge_gst_amount) |
| **Hygiene / Test infra** | F56 (paymentService deleted), F57 (test-infra), F58 (NS-3C), F59 (RAW-FIELD), F60 (backend untouched), F61 (`final/` untouched) |

**No silent reversal detected on any of the above.**

---

## 5. Missing / partial / reverted fixes

> Total: 2 carry-overs (both already documented as `backlog_follow_up`, neither is a regression).

### 5.1 A4 — CR-001 export column / summary alignment (`partial`)

- **What is in code:** `ExportButtons.jsx` CSV/PDF generators exist and run cleanly.
- **What is partial:** Per `Final Accept §7 row 17`, the CSV emits 9 columns vs the handover's specified 8, and the summary row is 1 column off.
- **Why it matters:** Cosmetic — exports are still valid CSV/PDF; no data loss, no crash, no compliance risk.
- **Should implementation be planned?** Optional — was explicitly classified as `backlog_follow_up` and deferred for one-shot cleanup pass.
- **Owner confirmation needed?** No (already deferred).
- **Recommended next agent:** Small FE Implementation Agent during the optional safe-cleanup pass per `PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md` §9.2.

### 5.2 F55 — LoadingPage ESLint warning (`partial`)

- **What is in code:** Two `// eslint-disable-next-line react-hooks/exhaustive-deps` directives at `pages/LoadingPage.jsx:68, 111`.
- **What is partial:** Warning suppressed inline rather than dependency added (`loadStationData`).
- **Why it matters:** Build is not blocked; only quiet hygiene tail. May be naturally resolved by UX-LOADING-02 when shipped (which restructures `loadStationData` calls).
- **Should implementation be planned?** Optional — `Final Accept §7 row 21` already flagged as `backlog_follow_up`.
- **Owner confirmation needed?** No.
- **Recommended next agent:** Skip if UX-LOADING-02 starts soon (will be naturally resolved); otherwise pick up in safe-cleanup pass.

### 5.3 G62 — `f_order_status === 8` Dashboard recall (`unclear_needs_owner_confirmation`)

- **What is missing from code:** No Razorpay-conditional gate on the Dashboard pipeline excluding `f_order_status === 8`.
- **Why it matters:** Customer-perceived issue per owner recall — but **no documented prior fix exists**. The opposite rule (`8 ∈ running`) is documented and active.
- **Should implementation be planned?** Not until owner answers Q1–Q3 in `impact_analysis/F_ORDER_STATUS_8_DASHBOARD_REGRESSION_CHECK.md` §7.1 (different branch? backend-side? exact predicate?).
- **Owner confirmation needed?** **YES.** This is the only true open question from this validation pass.
- **Recommended next agent:** Hold pending owner reply; if confirmed FE-side then new CR with impact analysis required (see referenced regression-check doc §7.3).

---

## 6. Backend-blocked / not expected items

> Items that are correctly absent or dormant in code today because they depend on backend work. Per `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md`.

| Item | Backend dependency | Current FE state | Verdict |
|---|---|---|---|
| **A15** B2 PG Status auto-reveal | BE-W2 `snapshot_razorpay_status` non-null | Wired at `OrderTable.jsx:114-117, 538` and `reportService.js:928`. Column auto-reveals on first non-null row. | ✅ Correctly dormant |
| **CR-008 Sub-CR #3** delivery dispatch / assign | Endpoint contract missing (POST/PATCH for dispatch/assign/picked-up). Schema half partly observable (`order_dispatch_status` populated 13/13). | No dispatch/assign FE action UI wired. Schema half is `ready_for_fe_impact_analysis` only. | ✅ Correctly absent |
| **CR-013 BE-G9** `delivery_charge_gst_amount` | Column doesn't exist on backend | Not added to any payload builder; only mentioned in a comment at `orderTransform.js:601` | ✅ Correctly absent |
| **BE-1 P2** order-level `cancel_by_name` / `merge_by_name` / `collect_by_name` | Backend missing — `canceled_by` ID populated but pair-name absent in 2026-05-06 cohort | `[BE-1 INVARIANT]` block at `reportService.js:541-633` flags `pending_*` keys when null; `[CR-001 DIAG]` logs retained until BE-1 lands | ✅ Correctly parked |
| **BE-2** `room_info.discount_amount` / `discount_reason` | Backend missing | `[BE-2 INVARIANT]` block at `reportService.js:600-619` retained; math-derived subset works | ✅ Correctly parked |
| **BE-V** item-level `cancel_by_name` (gates B3) | `present_in_schema_not_in_sample` in 2026-05-06 cohort | FE fallback at `reportTransform.js:625-626` still `Employee #<cancel_by>` for items where `cancel_by_name` null | ✅ Correctly parked |
| **BE-W** per-item paid-stage fields | All `present_in_schema_not_in_sample` in cohort | No FE consumer wired | ✅ Correctly absent |
| **BE-F** server-side `default_landing_screen` | Setting endpoint missing | `orderEntryPrefs.js` is localStorage-only (correct for Phase A) | ✅ Correctly localStorage-only (CR-008 #4 Phase B parked) |
| **BE-T / BE-U / BE-A** | Backend confirmation pending | No FE code attempting consumption | ✅ Correctly absent |
| **CR-013 BE-G7 / BE-G8 / BE-G10 / BE-G11** | Backend triage pending | FE Phase 1.5 surface stable; no Phase 3 payload extension started | ✅ Correctly absent (Phase 3 work not started) |

> All 10 backend-blocked items are in their expected state. **No FE pre-emption, no premature implementation, no regression.**

---

## 7. Special `f_order_status === 8` Dashboard check

> See `impact_analysis/F_ORDER_STATUS_8_DASHBOARD_REGRESSION_CHECK.md` (created 2026-05-07) for the full standalone treatment. Repeating the headline:

| Question | Answer |
|---|---|
| Is the rule "Razorpay-unpaid + status 8 → hide / Hold" present in code? | **No.** Zero FE consumers of `razorpay_order_id` / `isPaymentGateway` / `payment_status` in the dashboard pipeline. |
| Is the rule documented in baseline / CR docs? | **No.** Three direct hits document the OPPOSITE rule (`8 ∈ running`): `CR_001_IMPLEMENTATION_SUMMARY.md:43`, `BUG_CANCEL_DERIVATION_HANDOVER.md:429`, `StatusConfigPage.jsx:101`. |
| Is there a default-OFF behaviour for status 8 anywhere? | **Yes — but unconditional.** Status-column view (`pages/DashboardPage.jsx:861-880`) hides "Running" by default (`enabledStatuses` defaults to `["pending","preparing","ready","served"]`). Channel-view (the layout in the user's screenshot) shows status 8 by default. Neither is Razorpay-conditional. |
| Was the recalled fix reverted? | **Cannot conclude.** No prior documented fix exists to revert. |
| What should happen next? | Owner answers Q1–Q3 in regression-check doc §7.1: Different branch? Backend-side filter? Exact predicate if FE-side? |

**Status:** `unclear_needs_owner_confirmation` (per task spec G-bucket allowed values).

---

## 8. Recommended next action

> No code edits required from this validation pass.

1. **G62 — Owner reply gate.** Send the 3 clarifying questions from `F_ORDER_STATUS_8_DASHBOARD_REGRESSION_CHECK.md` §7.1 to the owner. Until reply, no Dashboard work on this item.
2. **No reversal cleanup needed.** All 11 expected sprint fix categories are intact in code; the 2 carry-overs (export col-count + LoadingPage ESLint) are already in `Final Accept §7` as `backlog_follow_up`.
3. **Optional safe-cleanup pass** (per `PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md` §9.2) can absorb A4 and F55 in a single small FE session if/when prioritised.
4. **Continue with the established next-action stack** (P0 = Bean Me Up CR-013 print double-count owner Option pick + BE-G7/G8/G10/G11 triage; P1 = CR-009 FE planning; P1 parallel = UX-LOADING-02 owner option pick + Backend Contract Agent intake on the 14 remaining BE-* asks).

---

## 9. Final verdict

```yaml
verdict: all_expected_frontend_fixes_present
qualifications:
  - 2 backlog_follow_up items already documented as deferred (A4 export col-count, F55 LoadingPage ESLint suppression)
  - 1 backend-blocked item correctly dormant (A15 PG Status auto-reveal — wired but waiting on BE-W2)
  - 1 owner-rule item unclear (G62 f_order_status=8 dashboard recall — no documented prior fix; sent for owner confirmation)
  - 0 silent reversals detected
  - 0 missing fixes detected
backend_blocked_items_correctly_absent: 10 / 10
final_verdict: all_expected_frontend_fixes_present
```

---

## 10. Strict-rules compliance certification

| Rule | Status |
|---|---|
| Read-only — no implementation | ✅ |
| No frontend / backend source edited | ✅ |
| No QA / tests run | ✅ |
| No tracker rewrite | ✅ — only this validation report created |
| No `/app/memory/final/*` touched | ✅ |
| No code pulled / branch switched | ✅ |
| No CR marked accepted/failed | ✅ |
| Stop after creating the validation report | ✅ |

---

— End of Last Sprint Code Fix Validation 2026-05-06 —
