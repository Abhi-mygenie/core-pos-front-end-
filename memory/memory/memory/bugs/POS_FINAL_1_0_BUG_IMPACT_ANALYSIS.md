# POS_FINAL_1_0 — Bug Impact Analysis

| Field | Value |
| --- | --- |
| Sprint | `pos_final_1.0` |
| Analysis Date / Time (UTC) | 2026-05-11 16:07 |
| Repo URL | https://github.com/Abhi-mygenie/core-pos-front-end-.git |
| Branch | `12-may-bugs` |
| HEAD Commit | `22bedc3` — "Auto-generated changes" |
| `/app` Strategy | Wiped local `/app`, fresh `--branch 12-may-bugs --depth 1` clone |
| Bug Intake Source | `/app/memory/BUG_TEMPLATE.md` (Sprint Intake Batch — pos_final_1.0, BUG-037 → BUG-047) |
| Code Changes Made | **NONE** — analysis-only |
| `/app/memory/final/` Updated | **NO** |

## Docs Read (in mandatory order — Step 2)

### Baseline (final)
- `/app/memory/final/FINAL_DOCS_APPROVAL_STATUS.md`
- `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md`
- `/app/memory/final/MODULE_DECISIONS_FINAL.md`
- `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md`
- `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md`
- `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md`
- `/app/memory/final/FINAL_DOCS_SUMMARY.md`

### Accepted Overlay Docs (change_requests)
- `BASELINE_RECONCILIATION_REPORT_2026_05_04.md`
- `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`
- `PENDING_TASK_REGISTER_2026_05_04.md`
- `PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md`
- `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md`
- `LAST_SPRINT_CODE_FIX_VALIDATION_2026_05_06.md`

### Bug Intake
- `/app/memory/BUG_TEMPLATE.md` — Sprint Intake Batch (lines 3183–3909) for BUG-037 → BUG-047.

### Code Inspected (sprint-scope only)
- `frontend/src/api/constants.js` (`F_ORDER_STATUS_API`, `STATUS_COLUMNS`)
- `frontend/src/api/services/orderService.js` (`confirmOrder`)
- `frontend/src/api/services/customerService.js` (CRM `customerLookup`)
- `frontend/src/api/services/reportService.js` (audit row builder, lines 880–948)
- `frontend/src/api/transforms/profileTransform.js` (`defaultOrderStatus`, lines 195–220)
- `frontend/src/api/transforms/orderTransform.js` (`collectBillExisting`, partial_payments, lines 1015–1060)
- `frontend/src/api/transforms/reportTransform.js` (audit `tax` shape, lines 80–110)
- `frontend/src/api/socket/socketHandlers.js` (`handleUpdateOrder`, `syncTableStatus`, `handleUpdateTable`)
- `frontend/src/contexts/OrderContext.jsx` (`orderItemsByTableId`, `removeOrder`)
- `frontend/src/contexts/NotificationContext.jsx`
- `frontend/src/utils/toneMapper.js`, `utils/soundManager.js`
- `frontend/src/pages/DashboardPage.jsx` (`handleConfirmOrder`, `handleCancelOrderFromCard`, `tables` memo, `ScanOrderPopOut` wiring)
- `frontend/src/pages/RoomOrdersReportPage.jsx`
- `frontend/src/components/dashboard/ScanOrderPopOut.jsx`
- `frontend/src/components/order-entry/OrderEntry.jsx` (`total` derivation L644–698, `deliveryCharge` state)
- `frontend/src/components/order-entry/CartPanel.jsx` (delivery-charge inline input L711–742)
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (`deliveryChargeInput` L162–166, totals L350–432, Credit/TAB block L2070–2130, Pay button L2185–2210)
- `frontend/src/components/cards/DineInCard.jsx`
- `frontend/src/components/reports/CollectBillPanelDrawer.jsx`
- `frontend/src/components/reports/RoomRowCard.jsx`
- `frontend/src/components/reports/ExportButtons.jsx` (CSV L38–109, PDF L129–228)

## Baseline Conflict Summary

No direct conflict found between baseline + overlays and the sprint bug scope. Two sprint bugs (BUG-039, BUG-046) intersect with CR-008 / CR-013 decisions and BUG-019 (Apr-2026) — flagged in the per-bug analyses below. No baseline change requested as part of this analysis.

---

# BUG-037 Impact Analysis

## Source
- Intake Bug: `/app/memory/BUG_TEMPLATE.md` lines 3189–3253
- Evidence Folder: No separate evidence folder found
- Final Docs Folder: `/app/memory/final`
- Google Sheet Status Before Analysis: Not provided

## User Reported Issue
When the restaurant's **default order configuration is set to "Delivered"**, confirming a Scan & Order from the new POS Dashboard fails / does not transition. Intake explicitly flags possible relationship to BUG-011 (closed-direction HTTP 500 on delivery scan confirm).

## Evidence Reviewed
- Intake entry (BUG-037)
- BUG-011 history & analysis (`/app/memory/bugs/BUG_ANALYSIS_011.md` — referenced)
- Source files: `api/constants.js`, `api/services/orderService.js`, `api/transforms/profileTransform.js`, `pages/DashboardPage.jsx`

## Module Mapping
- Primary Module: **Dashboard → Scan & Order → Confirm (Yet-to-Confirm) action**
- Downstream Impacted Modules: Order Status pipeline, OrderContext socket processing (`update-order-paid`), Profile/Vendor profile loader (`defaultOrderStatus` mapping)
- Module decision reference: `MODULE_DECISIONS_FINAL.md` — Dashboard YTC flow + Profile defaults

## Affected Route / Page
- `/` (Dashboard root). YTC tile is embedded in `DashboardPage.jsx` channel/status columns; pop-out via `ScanOrderPopOut`.

## Affected Screen / Flow
1. Profile API returns `def_ord_status` representing a value the restaurant configured as "Delivered".
2. `profileTransform.js:206` maps it via `F_ORDER_STATUS_API[api.def_ord_status]` → result stored as `defaultOrderStatus` on `RestaurantContext`.
3. User clicks Accept on a scan order (DashboardPage L1216 `handleConfirmOrder` → `confirmOrder(orderId, role, defaultOrderStatus)`).
4. `orderService.confirmOrder` (L63) PUTs to `CONFIRM_ORDER` with payload built from `toAPI.updateOrderStatus(orderId, role, orderStatus)`.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/api/constants.js` (L133–157) | `F_ORDER_STATUS` / `F_ORDER_STATUS_API` mapping table. **No `delivered` key exists** in either map. |
| `frontend/src/api/transforms/profileTransform.js` (L206) | `defaultOrderStatus: F_ORDER_STATUS_API[api.def_ord_status] \|\| null` — silently falls back to `null` for an unrecognised value. |
| `frontend/src/api/services/orderService.js` (L63–67) | `confirmOrder(orderId, roleName, orderStatus = 'paid')` — default parameter is `'paid'`, so a `null`/`undefined` `defaultOrderStatus` from `handleConfirmOrder` will turn into `'paid'`. |
| `frontend/src/pages/DashboardPage.jsx` (L1216–1229) | `handleConfirmOrder` passes `defaultOrderStatus` (possibly `null`) into `confirmOrder`. |

## API Review
- Endpoint: `API_ENDPOINTS.CONFIRM_ORDER` (waiter-dinein-order-status-update).
- Payload builder: `orderTransform.toAPI.updateOrderStatus(orderId, role, orderStatus)` — `orderStatus` becomes part of the payload.
- Response consumer: handler ignores response body; socket events (`order-engage`, `update-order-paid`) carry the state change.
- API contract risk: **HIGH** — when default config is "Delivered", FE almost certainly sends `paid` (fallback) or `null`/missing. Backend appears to reject this transition for a scan/prepaid order (matches BUG-011 HTTP 500 BadMethodCallException signature).

## Socket / Realtime Review
- No direct socket emit on confirm; result delivered via `update-order-paid` / `update-order` socket frames consumed by `handleUpdateOrder`.
- If API errors, no socket frame arrives → YTC card stays in `yetToConfirm` (matches intake symptom).

## State / Data Flow
Profile (def_ord_status) → `profileTransform` → `restaurant.defaultOrderStatus` → DashboardPage `handleConfirmOrder` → `confirmOrder` PUT → backend rejects → no socket frame → UI stale.

## Relevant Final Documentation
- `MODULE_DECISIONS_FINAL.md` — Dashboard YTC pipeline.
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md` — references YTC confirm contract.
- Final docs do **not** define a "delivered" key in `F_ORDER_STATUS_API`. No final-doc conflict per se, but the mapping table appears incomplete for the configuration the restaurant is using.

## Current Code Behavior
- `F_ORDER_STATUS_API` covers status codes 1, 2, 3, 5, 6, 7, 8, 9, 10. Status 4 explicitly reserved. There is **no value mapping to `"delivered"`**.
- For any `def_ord_status` not in the table, `defaultOrderStatus = null`.
- `confirmOrder(..., null)` then uses the default parameter `'paid'` (orderService L63), so the API receives `order_status: 'paid'` for a yet-to-confirm scan order.
- Backend may reject "yetToConfirm → paid" jump for a delivery-typed prepaid scan order (matches BUG-011's HTTP 500 signature on delivery scan confirm).

## Expected Behavior
- When default config is "Delivered", confirming a scan order should transition the order to the equivalent delivery-confirmed state (the same way other defaults work). Either:
  - `F_ORDER_STATUS_API` must include a `"delivered"` mapping (numeric code TBD by backend contract), OR
  - The FE must not pass an unrecognised default status to `confirmOrder` (route to a safe default like `'preparing'`).

## Root Cause Hypothesis (high-confidence)
**Frontend mapping issue + payload-construction issue.** `F_ORDER_STATUS_API` does not contain the numeric code that backend uses for "delivered" → `defaultOrderStatus` resolves to `null` → `confirmOrder` falls back to `'paid'`, which backend rejects for a YTC scan order. Strong overlap with BUG-011 (same delivery-scoped confirm-500 symptom).

## Regression Risk Areas
- Any flow that depends on `defaultOrderStatus` (YTC Accept buttons on every channel column / pop-out / status column / OrderCard).
- Possible side-effects on `defaultOrderStatus`-consuming side-paths if a new `"delivered"` mapping is added without aligning backend expectations.

## Docs / Code Mismatch
- `F_ORDER_STATUS` / `F_ORDER_STATUS_API` mapping table is not enumerated in `ARCHITECTURE_DECISIONS_FINAL.md` for the new "delivered" config — needs alignment with backend contract.
- Potential docs update needed after implementation validation.

## Open Questions / Missing Information
- The numeric code backend uses for "delivered" in `def_ord_status`.
- Backend response body / HTTP status returned when FE sends `order_status: 'paid'` for a delivery YTC.
- Whether BUG-011 and BUG-037 share the same backend root cause (BadMethodCallException) or only the same FE mapping defect.

## User Interaction Required
**Required** — needs:
1. Backend confirmation of the `def_ord_status` numeric value for "delivered" and the expected `order_status` literal in the confirm payload.
2. A network trace from the failing confirm call to confirm whether it is the same 500 as BUG-011.

## Analysis Verdict
- **Frontend mapping issue (primary)** — `F_ORDER_STATUS_API` incomplete.
- Possibly **API contract issue (secondary)** if backend uses a literal the FE never sends.

## Analysis Outcome
**Analysis Complete with Clarification Required** — strong FE root-cause hypothesis; backend contract confirmation needed to size the fix (single mapping entry vs. broader contract).

## Ready For Next Stage?
No — needs owner / backend confirmation first.

## Next Step
Owner / backend clarification first (confirm `def_ord_status` numeric for "delivered" + expected `order_status` literal), then Bug Implementation Planning Agent.

---

# BUG-038 Impact Analysis

## Source
- Intake Bug: `/app/memory/BUG_TEMPLATE.md` lines 3256–3318
- Evidence Folder: No separate evidence folder found
- Google Sheet Status Before Analysis: Not provided

## User Reported Issue
When **Credit / TAB** is selected as the payment method in Collect Bill, the customer details (name, mobile, etc.) are **not auto-populated** from CRM. Adjacent ticket BUG-003 (Credit Name "Walk-In" auto-fill) was the inverse direction.

## Evidence Reviewed
- Intake entry (BUG-038)
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (Credit/TAB block L2070–2130)
- `frontend/src/api/services/customerService.js` (`customerLookup`)

## Module Mapping
- Primary Module: **Billing → Collect Bill → Credit/TAB payment block → CRM linkage**
- Downstream Impacted Modules: CRM customer lookup API consumer, order payload customer fields (`cust_name`, `cust_mobile`, `cust_membership_id`)
- Module decision reference: `MODULE_DECISIONS_FINAL.md` — Billing / Collect Bill section; CRM linkage is referenced under Customer module decisions.

## Affected Route / Page
- Embedded inside `CollectPaymentPanel` (opened over `OrderEntry`). No standalone route.

## Affected Screen / Flow
1. User clicks Collect Bill on a placed order.
2. User selects Credit / TAB payment method.
3. Credit/TAB renders two plain text inputs: **Customer Name** (`tabName`) and **Phone Number** (`tabPhone`).
4. Typing the phone or name does **not** trigger any CRM lookup — the field state is local-only.
5. On Pay, `tabName` / `tabPhone` flow into the BILL_PAYMENT payload as plain strings; no CRM customer id (`cust_membership_id`) gets attached.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (~L2070–2130) | Credit/TAB block renders only two unbound text inputs (`tabName`, `tabPhone`). **No `onBlur`/`onChange` triggers a CRM lookup**, no `searchCustomers` call wired. |
| `frontend/src/api/services/customerService.js` (~L45) | `customerLookup` consumer exists and is used elsewhere (delivery / customer modal), but **not invoked** from the credit/TAB block. |
| `frontend/src/components/order-entry/CustomerModal.jsx` | CRM search exists here (used by other flows); the Credit/TAB block does not surface this modal. |

## API Review
- CRM endpoint: `customerLookup` (already in `customerService.js`).
- Payload builders: `orderTransform.toAPI.collectBillExisting` writes `cust_name` / `cust_mobile` / `cust_membership_id` — but for Credit, these come from `tabName` / `tabPhone` only; `cust_membership_id` is left blank.
- Soft-fail / hard-fail: payment **succeeds** without CRM linkage; no error surfaced.
- API contract risk: low for the bill itself; **high for downstream credit-aging / outstanding-credit reports** that need a CRM customer id.

## Socket / Realtime Review
No direct socket involvement found.

## State / Data Flow
Credit/TAB block local state (`tabName`, `tabPhone`) → `handlePayment` → `collectBillExisting` payload → backend (without CRM linkage / membership id).

## Relevant Final Documentation
- `MODULE_DECISIONS_FINAL.md` — Customer / CRM module: lookup-by-mobile contract documented.
- Final docs reference CRM auto-populate for Delivery and Customer modal flows, but do not explicitly require it for Credit/TAB. **Likely a missing requirement, not a regression.**

## Current Code Behavior
- Credit/TAB inputs are plain free-text. No customer-picker, no CRM search, no auto-populate trigger.

## Expected Behavior
- Typing the mobile number (or selecting from a customer picker) in the Credit/TAB block should look up the CRM customer by mobile, auto-populate the name field, and link `cust_membership_id` into the payload so credit balance / outstanding is tracked against the right CRM record.

## Root Cause Hypothesis (high-confidence)
**Frontend wiring gap** — the CRM customer-lookup integration that exists for delivery / customer-modal flows was never added to the Credit/TAB block. Inputs are local-state-only.

## Regression Risk Areas
- Existing Credit/TAB payments captured without `cust_membership_id` (data backfill not in scope here).
- Other places that use the existing CustomerModal — risk is **low** if we add lookup without altering the existing modal.
- BUG-003 (Credit Name "Walk-In" auto-fill, closed) — must verify the fix for BUG-003 does not regress when CRM auto-populate is added (don't auto-fill "Walk-In" when a CRM hit exists).

## Docs / Code Mismatch
- No explicit final-doc requirement for Credit/TAB CRM auto-populate. Owner should clarify whether (a) full CRM auto-populate, (b) name-only after mobile match, or (c) only when operator opens a customer picker. **Potential docs update needed** to capture the requirement.

## Open Questions / Missing Information
- Exact trigger expected (on mobile entry → lookup; on customer-picker open; both).
- Which CRM fields must auto-populate (name only / name + address + outstanding credit / full profile).
- Whether failure-to-match should fall back to free-text capture (likely yes — owner to confirm).

## User Interaction Required
**Required** — owner must specify the exact trigger and field set before implementation planning.

## Analysis Verdict
- **Frontend bug** (wiring gap). Not a backend defect.

## Analysis Outcome
**Analysis Complete with Clarification Required**

## Ready For Next Stage?
No — owner clarification needed for the exact contract (trigger + field set).

## Next Step
Owner clarification first → then Bug Implementation Planning Agent.

---

# BUG-039 Impact Analysis

## Source
- Intake Bug: `/app/memory/BUG_TEMPLATE.md` lines 3322–3384
- Evidence Folder: No separate evidence folder found
- Final Docs Folder: `/app/memory/final`
- Google Sheet Status Before Analysis: Not provided

## User Reported Issue
On the Audit Report detail view for a **delivery order**, the delivery charge value is being shown / classified under the **Tax** column / bucket instead of as a separate Delivery Charge value. Inflates tax figures and hides the standalone delivery charge.

## Evidence Reviewed
- Intake entry (BUG-039)
- `frontend/src/api/services/reportService.js` (audit row builder L880–948)
- `frontend/src/api/transforms/reportTransform.js` (audit `tax` shape)
- CR-013 docs (Phase 1.5 D-GST-1/2/3 — delivery GST encoding inside `gst_tax`)

## Module Mapping
- Primary Module: **Reports → Audit Report (detail view) → Delivery Orders**
- Downstream Impacted Modules: Audit CSV / PDF export builder (BUG-040, BUG-041 also touch this transform).
- Module decision reference: `MODULE_DECISIONS_FINAL.md` — Reports → Audit; `ARCHITECTURE_DECISIONS_FINAL.md` CR-013 (delivery GST encoded inside composite `gst_tax`).

## Affected Route / Page
- `AllOrdersReportPage.jsx` → Audit tab (detail view via row expand / `OrderDetailSheet`).

## Affected Screen / Flow
1. Audit report fetches `getOrderLogsReport` (or backend audit endpoint).
2. Each row is mapped via `reportService.js` audit builder (L880–948).
3. `tax` is computed as `gst_tax + vat_tax + service_tax`.
4. **No separate `deliveryCharge` column** is produced on the audit row. The Delivery Charge value never appears in its own column.
5. Per CR-013 Phase 1.5 D-GST-3, backend's `gst_tax` is a **composite** that includes delivery's GST component (`delGstAmt = deliveryCharge × delTaxRate`) — by design.
6. If backend additionally folds the **principal delivery charge amount** (not just its GST) into `gst_tax` for delivery rows, FE will display the inflated number under Tax → matches the bug report.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/api/services/reportService.js` (L937) | Audit row `tax` = `gst_tax + vat_tax + service_tax`. **No separate `deliveryCharge` field on the row.** |
| `frontend/src/api/transforms/reportTransform.js` (L93–110, detail view) | Audit row shape — does not surface `delivery_charge` from the API. |
| `frontend/src/components/reports/OrderTable.jsx`, `OrderDetailSheet.jsx` | Columns reference `order.tax` only — there is no column or detail row keyed on delivery charge for the audit view. |

## API Review
- Endpoint: `getOrderLogsReport` / audit list endpoint. `api.gst_tax`, `api.vat_tax`, `api.service_tax`, `api.delivery_charge` are the relevant keys.
- Response consumers: audit row builder L880–948; CSV/PDF export consumers.
- API contract risk: **HIGH** — depends on what backend writes into `gst_tax` for delivery orders. Per CR-013 D-GST-3 backend should encode only `delGstAmt`. If it writes `delivery_charge + delGstAmt`, the inflation is on the backend side.

## Socket / Realtime Review
No direct socket involvement found.

## State / Data Flow
Audit API → `reportService` row builder → `tax` (composite incl. delivery GST) → `OrderTable` / `OrderDetailSheet` / `ExportButtons` (CSV+PDF).

## Relevant Final Documentation
- `CR-013_FROZEN_BUSINESS_LOGIC.md` (§1 row 10, §4) — delivery GST goes inside composite `gst_tax`. Principal `delivery_charge` should remain a **separate** financial component (rides in payment_amount / final total, **not** inside `gst_tax`).
- Final docs **support** owner's expected behavior: delivery charge should appear as its own bucket; only its GST may merge into `gst_tax`.

## Current Code Behavior
- FE audit row never reads `api.delivery_charge` — drops it on the floor.
- `tax` displayed = `gst_tax + vat_tax + service_tax`. If backend's `gst_tax` is properly limited to GST components, "tax shows delivery charge" cannot be FE-only — it would require the backend to be writing the principal delivery amount into `gst_tax`.

## Expected Behavior
- The audit detail must show **Delivery Charge** as a separate column / value. **Tax** must contain only GST + VAT + Service Tax (with GST-on-delivery folded into `gst_tax` per CR-013 D-GST-3, which is acceptable).

## Root Cause Hypothesis (high-confidence)
**Two compounding issues:**
1. **Frontend mapping issue** — audit row builder does not expose `delivery_charge` as a standalone field. The audit detail cannot render it even if backend ships it.
2. **Backend response/contract risk** — if backend writes the principal `delivery_charge` value into `gst_tax` (rather than only `delGstAmt`), tax will be inflated regardless of FE. Needs an actual audit API response sample to confirm direction.

## Regression Risk Areas
- CSV / PDF audit exports (BUG-040, BUG-041) — fixing the FE row shape benefits both.
- Other places that read `order.tax` from the audit row (`OrderTable.jsx` columns, summary cards) — must not break when a separate `deliveryCharge` is added.

## Docs / Code Mismatch
- CR-013 says delivery GST goes inside `gst_tax`. Final docs are silent on where the **principal** delivery charge lives in the audit row. **Potential docs update needed** to make this explicit after backend confirmation.

## Open Questions / Missing Information
- A sample audit API response for a delivery order (one with `delivery_charge > 0` and an expected `gst_tax`) to confirm whether backend folds principal into `gst_tax`.
- A screenshot of the current audit detail showing the inflated Tax cell.
- Owner-confirmed destination column name (e.g., `Delivery Charge` vs `Other Charges`).

## User Interaction Required
**Required** — needs:
1. One sample audit-API response (preferably with `delivery_charge > 0`).
2. Confirmation of the expected column name (`Delivery Charge`) and whether it should appear on the on-screen audit table or only in the detail / exports.

## Analysis Verdict
- **API contract issue (likely primary)** + **Frontend mapping issue (definite secondary)**.

## Analysis Outcome
**Analysis Complete with Clarification Required**

## Ready For Next Stage?
No — backend response sample required before sizing the fix (FE-only vs FE+BE).

## Next Step
Backend confirmation first → then Bug Implementation Planning Agent.

---

# BUG-040 Impact Analysis

## Source
- Intake Bug: `/app/memory/BUG_TEMPLATE.md` lines 3387–3448
- Evidence Folder: No separate evidence folder found
- Google Sheet Status Before Analysis: Not provided

## User Reported Issue
The Audit Report **Excel / CSV** export does not follow the format provided by the owner. The exported file's column ordering / column set / headers / grouping deviate from the agreed format. Owner referenced a "provided format" but **did not attach** the reference file in this message.

## Evidence Reviewed
- Intake entry (BUG-040)
- `frontend/src/components/reports/ExportButtons.jsx` (CSV generator L38–109)
- Final docs (no audit CSV/PDF format spec located)

## Module Mapping
- Primary Module: **Reports → Audit Report → Export (CSV / Excel)**
- Downstream Impacted Modules: PDF export (BUG-041 shares the column-shape concern), Audit row transform (BUG-039 — adds a `deliveryCharge` field).
- Module decision reference: Not located — final docs do not contain a fixed Audit Excel / CSV format.

## Affected Route / Page
- Audit Report tab → Export → CSV button (`ExportButtons.jsx`).

## Affected Screen / Flow
1. User opens Audit tab on `AllOrdersReportPage.jsx`.
2. Clicks Export → CSV.
3. `generateCSV(orders, tabId, selectedDate)` builds a flat 8-column table:
   `Order # | Date/Time | Customer | Table No | Punched By | Actioned By | Payment Method | Payment Type | Amount`.
4. Cancelled / Aggregator tabs splice in 2 extra cols. **Audit tab uses base columns unchanged** — no audit-specific columns (Bill Date, GST breakdown, HSN, tax slabs, delivery charge, etc.).
5. Single sheet, no grouping, no per-order-type sections.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/components/reports/ExportButtons.jsx` (L38–109) | `generateCSV` defines the audit CSV column set. **Audit-tab branch missing** — only `cancelled` and `aggregator` get tab-specific columns. |
| `frontend/src/api/services/reportService.js` (L880–948) | Source data for the audit rows — currently doesn't surface several fields a real audit export would need (delivery_charge, HSN, GST breakdown, bill date / business date separation). |

## API Review
- Same audit endpoint as BUG-039 — same gaps in field exposure (delivery_charge missing).
- Risk that the "provided format" requires fields the audit endpoint currently doesn't ship.

## Socket / Realtime Review
No socket involvement.

## State / Data Flow
Audit rows from `reportService` → `ExportButtons.generateCSV` → CSV blob → download.

## Relevant Final Documentation
- No final doc fixes the audit Excel / CSV format. Owner must supply the target format file.

## Current Code Behavior
- Audit CSV produced is a flat 8-column dump using the base column set — no audit-specific shape.

## Expected Behavior
- CSV / Excel must match the owner-provided format exactly: same columns, same order, same headers, same currency / date formatting, same row grouping.

## Root Cause Hypothesis (high-confidence)
**Report/export logic issue** — `generateCSV` does not branch on `tabId === 'audit'`, so the audit export inherits the base column set. Some required audit fields may also be missing from `reportService` audit row builder (overlaps with BUG-039).

## Regression Risk Areas
- Non-audit CSV exports (Paid / Cancelled / All / Aggregator / etc.) — must NOT regress when an audit-specific branch is added.
- Audit on-screen table — only if we move new fields into the row builder; column gating should keep them invisible on-screen unless owner explicitly wants them visible.

## Docs / Code Mismatch
- **Blocked**: no provided target format in repo or final docs.
- Potential docs update needed: capture the agreed audit CSV/Excel column spec in `MODULE_DECISIONS_FINAL.md` (Reports → Audit Export) after owner provides it.

## Open Questions / Missing Information
- **The provided target format file (Excel / CSV / column spec) must be attached.** Without it, gap analysis cannot be completed.
- Whether Excel and CSV share the same shape, or Excel needs `.xlsx` formatting (currently the FE only generates CSV — there is no Excel-specific generator).
- Currency formatting (₹ / "INR" / no symbol), date format, header casing.

## User Interaction Required
**Required** — owner must attach the reference format file before implementation planning can begin.

## Analysis Verdict
- **Report/export bug** (CSV column-shape gap). Possibly also a **frontend gap** (no native `.xlsx` generator — only CSV today).

## Analysis Outcome
**Blocked — Missing Critical Evidence** (provided target format file).

## Ready For Next Stage?
No — needs the target format file from owner.

## Next Step
Owner clarification first (attach the provided target format) → then Bug Implementation Planning Agent.

---

# BUG-041 Impact Analysis

## Source
- Intake Bug: `/app/memory/BUG_TEMPLATE.md` lines 3451–3512
- Evidence Folder: No separate evidence folder found
- Google Sheet Status Before Analysis: Not provided

## User Reported Issue
Audit Report **PDF download** has mixed / misaligned rows. Rows from different order groups appear interleaved or in the wrong section; overall row-rendering logic needs review and refinement.

## Evidence Reviewed
- Intake entry (BUG-041)
- `frontend/src/components/reports/ExportButtons.jsx` (PDF generator L129–228)

## Module Mapping
- Primary Module: **Reports → Audit Report → Export (PDF)**
- Downstream Impacted Modules: CSV export (BUG-040) shares the same column-shape concern; audit row builder (BUG-039).
- Module decision reference: Not located in final docs.

## Affected Route / Page
- Audit Report tab → Export → PDF button (`ExportButtons.jsx`).

## Affected Screen / Flow
1. User clicks Export → PDF.
2. `generatePDF` builds a single HTML document with:
   - Header (title + date)
   - Summary cards (Total Orders / Total Amount / Avg Order Value)
   - **One flat `<table>` with 8 fixed columns** (Order # / Time / Customer / Table No / Punched By / Actioned By / Payment / Amount).
   - No per-section grouping, no section headers, no manual page breaks, no column width hints.
3. `window.open('','_blank').print()` is invoked.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/components/reports/ExportButtons.jsx` (L129–228) | `generatePDF` builds a flat 8-column table with no grouping, no section breaks, no audit-specific layout. With many rows + multi-page output, browser print engines may break rows mid-cell or rearrange order, producing the "mixed / misaligned" symptom. |
| `frontend/src/api/services/reportService.js` (L880–948) | Audit row source — currently lacks fields a real audit PDF would need (mirrors BUG-039 / BUG-040). |

## API Review
- Same audit endpoint as BUG-039/040. Same field-exposure gaps.

## Socket / Realtime Review
No socket involvement.

## State / Data Flow
Audit rows from `reportService` → `ExportButtons.generatePDF` → HTML string → new window → `window.print()`.

## Relevant Final Documentation
- No final doc fixes the audit PDF format. Owner-provided spec required.

## Current Code Behavior
- PDF is a single flat table relying entirely on the browser's print engine for pagination. Long datasets, varying row heights, and lack of `page-break-inside: avoid` on `<tr>` rules cause:
  - rows visually splitting across pages,
  - section headers (currently absent) being implicitly missed,
  - column widths reflowing across pages.

## Expected Behavior
- Consistent column alignment across pages, correct grouping (by order type / section / date as per spec), clean page breaks, stable column widths.

## Root Cause Hypothesis (high-confidence)
**Report/export logic issue** — `generatePDF` does not implement grouping, section headers, or page-break controls. The "mixed/misaligned" symptom is the natural consequence of a single flat browser-printed table with default CSS.

## Regression Risk Areas
- Other tabs (Paid / Cancelled / etc.) using `generatePDF` — must not regress when audit-specific branching is added.
- On-screen audit table — must not break if new fields are added to the row builder for the PDF.

## Docs / Code Mismatch
- No documented grouping rules. **Potential docs update needed** after owner provides the spec (capture in `MODULE_DECISIONS_FINAL.md` Reports → Audit Export).

## Open Questions / Missing Information
- A sample of the misaligned PDF (download / screenshot) so we can attribute "mixed" to (a) section-grouping gap, (b) column-width reflow, or (c) row split across pages.
- Owner's expected grouping rules (by date / by order type / by waiter / by tab).
- Whether owner wants a server-rendered PDF (e.g., via backend) vs the current browser-print approach.

## User Interaction Required
**Required** — owner should attach a sample misaligned PDF + the expected grouping rules.

## Analysis Verdict
- **Report/export bug** (PDF layout / grouping gap).

## Analysis Outcome
**Analysis Complete with Clarification Required**

## Ready For Next Stage?
No — needs owner sample + grouping rules.

## Next Step
Owner clarification first → then Bug Implementation Planning Agent.

---

# BUG-042 Impact Analysis

## Source
- Intake Bug: `/app/memory/BUG_TEMPLATE.md` lines 3515–3578
- Evidence Folder: No separate evidence folder found
- Google Sheet Status Before Analysis: Not provided

## User Reported Issue
Attempting to collect payment for a **Hold order** using the **UPI** payment method fails. Other methods (per intake context) appear to work; UPI specifically fails for held orders.

## Evidence Reviewed
- Intake entry (BUG-042)
- `frontend/src/components/reports/CollectBillPanelDrawer.jsx` (full file)
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (Pay-button validation L2185–2210, partial_payments builder L1015–1060)
- `frontend/src/api/transforms/orderTransform.js` (`collectBillExisting`)

## Module Mapping
- Primary Module: **Reports → Audit Report → Hold tab → Collect Bill** + Billing / Collect Payment / UPI
- Downstream Impacted Modules: Order state pipeline (paid socket processing), Hold tab optimistic removal in `AllOrdersReportPage.jsx`.
- Module decision reference: CR-003 Phase 3.6 (Hold-tab Collect Bill via `CollectBillPanelDrawer`).

## Affected Route / Page
- `AllOrdersReportPage.jsx` → Hold tab → row's Collect pill → `CollectBillPanelDrawer` (right-side drawer) → `CollectPaymentPanel` embedded inside.

## Affected Screen / Flow
1. User clicks Collect on a Hold-tab row.
2. `CollectBillPanelDrawer` POSTs to `SINGLE_ORDER_NEW`, transforms via `orderFromAPI.order`, stamps all items as `placed: true`, feeds into `CollectPaymentPanel`.
3. User picks UPI as payment method.
4. Click Pay → `handlePayment` builds payload via `orderToAPI.collectBillExisting` → POST to `BILL_PAYMENT`.
5. `transaction_id` is empty for UPI (only `card` mode wires `cardTxnId`).
6. Failure: backend may reject UPI without a transaction_id, OR the held-order detail's `cartItems` shape produces a malformed partial_payments block, OR `placed: true` stamping doesn't fully restore the dashboard contract.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/components/reports/CollectBillPanelDrawer.jsx` (L160–196) | Pay handler — uses the same `collectBillExisting` builder. No UPI-specific guard. Stamps `placed: true` on all items. |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (L2185–2210) | Pay-button disable rules — no UPI-specific validation (card needs 4-digit, cash needs ≥ effectiveTotal, tab needs name + 10-digit phone; **UPI has none**). |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (L535) | `transactionId: paymentMethod === 'card' ? cardTxnId : ''` — UPI always sends empty transaction_id. |
| `frontend/src/api/transforms/orderTransform.js` (L1015–1060) | `partial_payments` for single-mode UPI = `[{cash:0},{card:0},{upi:finalTotal}]` with `transaction_id: ''`. |

## API Review
- Endpoint: `API_ENDPOINTS.BILL_PAYMENT`.
- Payload: same builder for cash / card / UPI / split.
- Soft-fail / hard-fail: drawer's `handlePaymentComplete` catches exceptions and surfaces via `onCollectError` → drawer stays open. So a backend reject would be visible to user but no auto-recovery.
- API contract risk: **HIGH** — backend likely requires a non-empty `transaction_id` for UPI on the Hold/BILL_PAYMENT path (parity with how Cash/Card go through the dashboard flow). Or backend rejects the partial_payments shape for held orders specifically.

## Socket / Realtime Review
- On success: backend emits `update-order-paid` → `handleUpdateOrder` removes order from OrderContext (`isTerminal = true`).
- No socket involvement in the failure path; drawer relies on HTTP response.

## State / Data Flow
Hold tab row → drawer fetch (`SINGLE_ORDER_NEW`) → `orderFromAPI.order` → `CollectPaymentPanel` (in-drawer) → user picks UPI → `handlePayment` → `collectBillExisting` payload (with `transaction_id: ''`) → POST `BILL_PAYMENT` → backend rejects → toast / drawer stays open.

## Relevant Final Documentation
- `MODULE_DECISIONS_FINAL.md` — Hold-tab Collect Bill (CR-003 Phase 3.6) is documented; UPI specifically not called out.
- Final docs do not mandate a UPI transaction_id requirement.

## Current Code Behavior
- UPI Pay button is enabled with no transaction_id; payload sent with empty `transaction_id` for UPI mode.
- For dashboard Collect Bill (non-hold) the same shape is sent → owner's report implies this works for non-hold; that itself is unverified here but accepted from intake.

## Expected Behavior
- Held orders must collect with UPI successfully, identically to a non-held order.

## Root Cause Hypothesis (high-confidence)
Two candidate causes, owner network trace needed to disambiguate:
1. **Backend response/contract issue** — backend may require a non-empty `transaction_id` for UPI on the Hold path, or may treat the held order's previous payment state as a conflicting partial payment.
2. **Payload-construction issue (secondary)** — the `cartItems` from `orderFromAPI.order` stamped with `placed: true` may carry residual fields (e.g., `partial_payments` already attached to the order) that conflict with the new BILL_PAYMENT payload's partial_payments block.

## Regression Risk Areas
- Dashboard Cash / Card / split-payment paths (must not regress).
- BUG-042's adjacent siblings: BUG-PREPAID-SETTLE (handleUpdateOrder removal on `paid` state) — must continue to clear the order after success.

## Docs / Code Mismatch
- Final docs do not call out a UPI `transaction_id` requirement. **Potential docs update needed** after the actual contract is confirmed.

## Open Questions / Missing Information
- Exact backend response body / HTTP status returned when UPI is attempted on a held order.
- Whether non-hold UPI works on this branch (owner says yes; needs confirmation via reproduction).
- Whether partial UPI (split combinations) also fail.

## User Interaction Required
**Required** — network trace + API response for one failing UPI-on-hold attempt is essential to distinguish the two candidate root causes.

## Analysis Verdict
- **API contract issue (likely primary)** — confirmation pending.
- **Payment flow bug** classification overall (FE + backend).

## Analysis Outcome
**Analysis Complete with Clarification Required**

## Ready For Next Stage?
No — needs network trace + backend confirmation.

## Next Step
Owner clarification first (network trace) → backend confirmation → Bug Implementation Planning Agent.

---

# BUG-043 Impact Analysis

## Source
- Intake Bug: `/app/memory/BUG_TEMPLATE.md` lines 3581–3640
- Evidence Folder: No separate evidence folder found
- Google Sheet Status Before Analysis: Not provided

## User Reported Issue
Room Orders Report wrongly shows a **Discount** column / value where it should not — either the column should not exist in the Room Orders Report or the value is misclassified.

## Evidence Reviewed
- Intake entry (BUG-043)
- `frontend/src/pages/RoomOrdersReportPage.jsx`
- `frontend/src/components/reports/RoomRowCard.jsx` (Discount cell L508–534, derivation L380–415)

## Module Mapping
- Primary Module: **Reports → Room Orders Report**
- Downstream Impacted Modules: None — Room Orders Report is a leaf report.
- Module decision reference: BE-2 §4.1 (Discount column wired 2026-05-01 in RoomRowCard).

## Affected Route / Page
- `/reports/rooms` (Room Orders Report) via `RoomOrdersReportPage.jsx`.

## Affected Screen / Flow
1. Page loads room rows from `getRoomsForReport` (under `getOrderLogsReport`, filtered to `order_in === 'RM'`).
2. Each `RoomRowCard` fetches per-row detail via `getSingleOrderRoom`.
3. `numbers.discount` is computed:
   - `explicitDiscount = parseFloat(ri.discountAmount) || 0`
   - `derivedDiscount = isFullySettled ? max(0, rent - lodgingCollected) : 0`
   - `discount = explicitDiscount > 0 ? explicitDiscount : derivedDiscount`
4. Rendered in a fixed-width column (L515–534), only when `discount > 0`.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/components/reports/RoomRowCard.jsx` (L380–415) | Discount derivation — uses `(rent - lodgingCollected)` as an under-collection proxy. Will fire for any room where actual cash collected is less than billed rent (legit discount or accounting drift). |
| `frontend/src/components/reports/RoomRowCard.jsx` (L515–534) | Discount column cell. Renders amber number when `discount > 0`. |
| `frontend/src/pages/RoomOrdersReportPage.jsx` | Page header / column labels. Confirms Discount is visible on-screen for Room Orders Report. |

## API Review
- Endpoint: `getSingleOrderRoom` (per-row detail) — supplies `discount_amount`, `room_price`, `advance`, `receive_balance`, `balance`.
- Soft-fail / hard-fail: discount derivation falls back gracefully on missing fields (NaN → 0).
- API contract risk: low (FE-derivation is in scope).

## Socket / Realtime Review
No socket involvement.

## State / Data Flow
Detail API → `RoomRowCard.numbers` memo (discount derivation) → rendered cell.

## Relevant Final Documentation
- `MODULE_DECISIONS_FINAL.md` — Room Orders Report taxonomy. BE-2 §4.1 references Discount column wiring.
- Owner's bug claims the Discount column is **wrong for Room Orders** — either definition or visibility.

## Current Code Behavior
- Discount is rendered when `discount > 0` (`explicit` from backend OR `derived under-collection` for fully-settled rooms).
- For partially settled / in-house rooms, only explicit backend `discount_amount` would surface; derived is 0.

## Expected Behavior
Either:
- (a) Remove Discount column entirely from the Room Orders Report, OR
- (b) Recompute Discount with a tighter, owner-approved formula that excludes under-collection / accounting drift.

Owner must confirm direction.

## Root Cause Hypothesis (high-confidence)
**Report/export logic issue** (FE-derivation). Discount column was added per BE-2 §4.1 with an "under-collection ≈ discount" assumption that the operator does not accept as a real discount.

## Regression Risk Areas
- Other room-derived numbers (`paid`, `outstanding`) share the same `lodgingCollected` calc — must not regress when discount calc is removed / tightened.
- Audit / Paid tabs that consume `room_price` separately.

## Docs / Code Mismatch
- BE-2 §4.1 doc states the Discount column is intended for "lodging discount or under-collection." Owner now says this should not appear or should be corrected. **Potential docs update needed** after owner confirms direction.

## Open Questions / Missing Information
- Owner direction: remove the column vs. correct the formula.
- A screenshot of the wrong values for a known-good room.
- Whether the same defect appears in any room-orders export (currently the Room Orders Report has no export wired — Phase 4.6 deferred).

## User Interaction Required
**Required** — owner direction (remove vs. fix) is the single blocker.

## Analysis Verdict
- **Report/export bug** (column definition / derivation).

## Analysis Outcome
**Analysis Complete with Clarification Required**

## Ready For Next Stage?
No — needs owner direction.

## Next Step
Owner clarification first → then Bug Implementation Planning Agent.

---

# BUG-044 Impact Analysis

## Source
- Intake Bug: `/app/memory/BUG_TEMPLATE.md` lines 3643–3704
- Evidence Folder: No separate evidence folder found
- Google Sheet Status Before Analysis: Not provided

## User Reported Issue
After a table is freed (order complete / cancelled / moved), the table tile **still shows the old order's items** until manual page refresh.

## Evidence Reviewed
- Intake entry (BUG-044)
- `frontend/src/api/socket/socketHandlers.js` (`handleUpdateOrder` L229–305, `handleUpdateOrderStatus` L382–415, `handleUpdateTable` L512–540, `syncTableStatus` L113–131)
- `frontend/src/contexts/OrderContext.jsx` (`orderItemsByTableId` L295–330, `removeOrder` action)
- `frontend/src/pages/DashboardPage.jsx` (table memo L498–540)
- `frontend/src/components/cards/DineInCard.jsx` (L11–26 — order data lookup)

## Module Mapping
- Primary Module: **Dashboard → Tables grid → Socket-driven state sync**
- Downstream Impacted Modules: OrderContext, TableContext, OrderEntry re-engage flow.
- Module decision reference: `ARCHITECTURE_DECISIONS_FINAL.md` — Socket-driven realtime state.

## Affected Route / Page
- `/` (Dashboard).

## Affected Screen / Flow
1. Order placed on a table → `handleNewOrder` adds to context, `syncTableStatus` engages table.
2. Order paid / cancelled → `handleUpdateOrder` (or `handleUpdateOrderStatus`) detects `isTerminal = (status === 'cancelled' || status === 'paid')` → `removeOrder(orderId)` + `syncTableStatus(order, updateTableStatus, 'available')`.
3. `DashboardPage.tables` memo derives table tiles from `apiTables` + `getOrdersByTableId(t.tableId)`.
4. `DineInCard` looks up `orderItemsByTableId[table.tableId]` and finds the order by `table.orderId`. If found → items rendered; if not → falls back to empty default.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/api/socket/socketHandlers.js` (L268–289) | Removal predicate keyed on `order.status === 'cancelled' \|\| 'paid'`. If backend sends a terminal event but `order.status` is not yet rewritten to one of these strings (e.g., `served` with `f_order_status = 6` or a paid-but-status-mismatched frame), `removeOrder` is **not** called → order stays in context. |
| `frontend/src/api/socket/socketHandlers.js` (L512–540) | `handleUpdateTable` updates `tableStatus` but does **not** remove orders for that table. If only the table-free socket arrives (no matching order-update frame), order stays in context → tile shows items. |
| `frontend/src/contexts/OrderContext.jsx` (L295–330) | `orderItemsByTableId` is recomputed on every `orders` change; if order isn't removed, it persists in the map. |
| `frontend/src/pages/DashboardPage.jsx` (L498–540) | `tables` memo: if `getOrdersByTableId` returns the stale order, the tile renders `tableOrders.map(...)` with the old order's items. |

## API Review
No direct REST involvement in the failure path; everything routes through sockets.

## Socket / Realtime Review
- Events involved:
  - `update-order` / `update-order-paid` / `update-order-source` / `update-order-target` → `handleUpdateOrder`.
  - `update-order-status` → `handleUpdateOrderStatus`.
  - `update-table` → `handleUpdateTable`.
- State sync behavior: terminal removal happens **only** when `order.status` is `'cancelled'` or `'paid'`. `handleUpdateTable` never removes orders.
- Socket risk: **HIGH** — if backend frees a table without emitting a matching terminal order event, the order remains. Some terminal flows on payment paths through the audit / Hold tab Collect Bill (CR-003) emit `BILL_PAYMENT` HTTP success but rely on backend socket emission for client-side cleanup; if that socket has a different shape or arrives late, FE shows stale items until page refresh re-fetches orders from REST.

## State / Data Flow
Socket → handler → OrderContext mutations → memoized `orderItemsByTableId` → DineInCard items. Failure path: order not removed from context → items visible until a fresh REST refresh.

## Relevant Final Documentation
- `ARCHITECTURE_DECISIONS_FINAL.md` — socket-driven realtime contract. Final docs require terminal-status removal but do not specify a derived "if table became available, drop residual orders" rule.

## Current Code Behavior
- Order removal requires a terminal-status order frame (not a table-status frame).
- No safety-net: there is no derivation in `tables` memo that drops orders if `t.isOccupied === false` (table marked free by backend) — it relies on `getOrdersByTableId` returning empty.

## Expected Behavior
- The moment the table is freed, the tile must reflect the free state immediately. Either backend always emits a matching terminal order frame, OR the FE adds a safety net that drops residual orders for a table that just transitioned to `available`.

## Root Cause Hypothesis (high-confidence)
**Socket/state sync bug.** FE relies on a terminal order frame to drop residual orders, but at least one closure path (probably the BILL_PAYMENT-on-Hold path or the cancel-while-served path) frees the table without delivering a matching terminal order frame in time. Without a derived clean-up rule, stale orders remain in `orderItemsByTableId` until manual refresh.

## Regression Risk Areas
- Split-orders (multi-order-per-table) — a safety-net must NOT drop a sibling split order that's still active on the same table.
- Re-engage flow — clearing an order before re-engage arrives could cause flicker.
- Walk-in orders / room orders — their cleanup paths differ.

## Docs / Code Mismatch
- Final docs require terminal socket events for cleanup; the code matches. Owner-reported behavior implies either backend doesn't always emit, or the FE removal predicate is too strict (e.g., only paid/cancelled — does not cover other terminal states like `merged`).

## Open Questions / Missing Information
- Confirm which order-closure path (complete / cancel / move / transfer / merged / hold-collect) reproduces the stale state.
- Screen recording showing the symptom + the open Network/Sockets tab (to determine: missing socket vs received-but-ignored).

## User Interaction Required
**Not required** — strong hypothesis already formed; owner reproduction recording would refine the fix scope but is not blocking initial implementation planning.

## Analysis Verdict
- **Socket/state sync bug** (with possible backend emission gap depending on closure path).

## Analysis Outcome
**Analysis Complete** — high-confidence hypothesis.

## Ready For Next Stage?
Yes — Implementation Planning can begin. Final fix scope (FE safety-net only vs FE + backend emission alignment) depends on owner reproduction, but planning can start from FE safety-net.

## Next Step
Bug Implementation Planning Agent (FE-only safety-net hypothesis; backend confirmation can run in parallel).

---

# BUG-045 Impact Analysis

## Source
- Intake Bug: `/app/memory/BUG_TEMPLATE.md` lines 3708–3778
- Evidence Folder: No separate evidence folder found
- Google Sheet Status Before Analysis: Not provided

## User Reported Issue
The new Web / Scan & Order incoming-order popup has three sub-defects:
1. **View Order** does nothing.
2. **Reject** does nothing.
3. Item price inside popup shows **₹0.00**.

## Evidence Reviewed
- Intake entry (BUG-045)
- `frontend/src/components/dashboard/ScanOrderPopOut.jsx` (full file)
- `frontend/src/pages/DashboardPage.jsx` wiring (L1463–1471, `handleConfirmOrder` L1216, `handleCancelOrderFromCard` L1429, `handleTableClick` L1267)

## Module Mapping
- Primary Module: **Dashboard → Scan & Order → POS2-002 Phase 4 Pop-out**
- Downstream Impacted Modules: CancelOrderModal (used by Reject), OrderEntry (opened by View), confirmOrder pipeline (Accept — shared with BUG-037).
- Module decision reference: POS2-002 Phase 4 (May-2026, ScanOrderPopOut documented in `/app/memory/final/`).

## Affected Route / Page
- `/` (Dashboard) — pop-out renders over the dashboard.

## Affected Screen / Flow
- Pop-out renders when `orders` contains a `yetToConfirm` web/scan order.
- Buttons (Snooze / View / Reject / Accept) each wire to handlers passed in props from `DashboardPage` (L1463–1471).

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/components/dashboard/ScanOrderPopOut.jsx` (L244–275) | `handleViewClick` / `handleRejectClick` / `handleAcceptClick` build a `tableEntry`-shaped object (`buildTableEntryFromOrder`) and invoke the prop handler. **Reject passes the raw `order`** (not the tableEntry); View / Accept pass `entry || order`. |
| `frontend/src/components/dashboard/ScanOrderPopOut.jsx` (L397–421) | Item price rendering: `{Number(it?.total ?? it?.amount ?? 0).toFixed(2)}`. If items shipped by socket carry `price` / `totalPrice` / `food_amount` (instead of `total` / `amount`), the displayed value is **₹0.00**. |
| `frontend/src/pages/DashboardPage.jsx` (L1267 — `handleTableClick`) | Used as the View handler. Expects a `tableEntry` shape with `tableId`. Web orders have **no `tableId`**; depending on early-return rules inside `handleTableClick`, View may no-op silently. |
| `frontend/src/pages/DashboardPage.jsx` (L1429 — `handleCancelOrderFromCard`) | Used as Reject handler. Reads `order.tableId` to build `tableEntry`. For web orders without a `tableId`, the resulting `tableEntry.id = 'order-<orderId>'`; that should still open CancelOrderModal — but if the **`onReject` button does not visually respond**, the issue is upstream (handler not firing) or downstream (modal not opening due to a different early-return). Comment at DashboardPage L430–431 explicitly notes "`handleTableClick` has an early return" for non-eligible cases — likely culprit for View. |
| `frontend/src/components/dashboard/ScanOrderPopOut.jsx` (`buildTableEntryFromOrder`) | Builds the tableEntry shape; sets `tableId` from `order.tableId` which is missing for web orders. Downstream `handleTableClick` may early-return on `!table.tableId` or on `!isTableEditable`. |

## API Review
- View / Reject do not call APIs themselves; they open modals / re-engage flows.
- Item price mapping is FE-only (transform of incoming socket payload).

## Socket / Realtime Review
- The web-order incoming payload feeds into OrderContext via `handleNewOrder` / `handleScanNewOrder` / new-order channel.
- Socket risk: if items' `total` / `amount` are not populated on the incoming web-order frame (only `price`, `qty`, `food_amount`), the popup's `it?.total ?? it?.amount ?? 0` cascade returns 0.

## State / Data Flow
Incoming web order socket → `orderFromAPI` transform → OrderContext → `ScanOrderPopOut` reads `orders` → renders items via `total ?? amount ?? 0`. Buttons invoke `DashboardPage` handlers, which expect a tableEntry shape with valid `tableId`.

## Relevant Final Documentation
- `MODULE_DECISIONS_FINAL.md` POS2-002 Phase 4 section: Pop-out reuses dashboard handlers verbatim. Implies handlers must accept the web-order shape; current early-returns in `handleTableClick` are not aligned with that.

## Current Code Behavior
- **View Order**: invokes `onEdit(entry || order)` → `handleTableClick(tableEntry)`. For a web order with `tableId === 0`, `handleTableClick`'s early-return rules (DashboardPage comment L430–431) likely short-circuit before opening OrderEntry. **Result: button click no-ops.**
- **Reject**: invokes `onReject(order)` → `handleCancelOrderFromCard(order)` → builds tableEntry and calls `setCancelOrderEntry(tableEntry)`. The modal opens on `cancelOrderEntry` state. This **should work** — if it doesn't, candidate causes are (a) `order.orderId` not present on the pop-out's `activeOrder` shape, (b) `CancelOrderModal` itself has its own guard that doesn't render for non-dineIn orders. Need owner reproduction to disambiguate.
- **Item price ₹0.00**: caused by missing `total` / `amount` on web-order items in the OrderContext shape. The order transform may write line totals to `totalPrice` / `linePrice` / `food_amount` instead of `total` / `amount`.

## Expected Behavior
- View should open the order detail view (OrderEntry) for the incoming web order.
- Reject should open CancelOrderModal and on confirm reject the order.
- Item price must reflect actual line price.

## Root Cause Hypothesis (high-confidence)
**Three localized frontend bugs in the pop-out + its handler integration:**
1. **View Order — Frontend mapping issue.** `handleTableClick` has early-returns keyed on tableId/eligibility that block web orders (no `tableId`).
2. **Reject — Frontend mapping issue (probable).** `handleCancelOrderFromCard` builds a tableEntry that works, but CancelOrderModal may guard on dine-in path. Owner reproduction needed to confirm.
3. **Item price ₹0.00 — Frontend mapping issue (high-confidence).** Pop-out reads `it.total ?? it.amount`, but the web-order item shape in OrderContext is likely `{price, qty, totalPrice}` — neither `total` nor `amount` populated. Falls through to 0.

## Regression Risk Areas
- Dashboard channel/status columns that also use `handleTableClick` for web orders (DashboardPage L1740/1768) — must not regress when web-order handling is added.
- `handleConfirmOrder` (Accept) — shared with BUG-037; both bugs touch the same pop-out.
- CancelOrderModal usage from other surfaces (OrderCard cancel paths).

## Docs / Code Mismatch
- POS2-002 Phase 4 says "REUSES existing handlers verbatim" — current implementation does reuse them, but the handlers were never adapted for web orders. **Potential docs update needed** to document the adaptation rules.

## Open Questions / Missing Information
- Screenshot of the popup showing the ₹0.00 line.
- Network / console trace when clicking View / Reject to confirm whether the handler fires at all.
- Sample web-order socket payload to confirm which item-level keys are populated (`total` vs `totalPrice` vs `food_amount`).

## User Interaction Required
**Not required** — strong hypothesis for all three sub-defects. Owner repro would confirm whether Reject actually fires its handler (no-op vs modal-guard) but planning can begin without it.

## Analysis Verdict
- **Frontend mapping issue** (three sub-defects in the same component).

## Analysis Outcome
**Analysis Complete** — high-confidence hypothesis.

## Ready For Next Stage?
Yes — Implementation Planning can begin.

## Next Step
Bug Implementation Planning Agent. Recommend splitting into 3 sub-tickets (View / Reject / Price) since the underlying defects are independent.

---

# BUG-045 — REVISED IMPACT ANALYSIS (Addendum, 2026-05-11)

## Why this addendum exists
Owner reviewed the live pop-up on 2026-05-11 (two screenshots: a walk-in 6-item order showing all line ₹0.00, and a delivery 1-item order labelled "Delivery · Delivery address on file"). Several additional gaps surfaced beyond the three sub-defects in the original intake. Owner confirmed direction for each. **Scope is widened**; the original analysis (View / Reject / ₹0.00) is preserved above but is now insufficient — this addendum supersedes it for planning purposes.

## Source
- Owner messages 2026-05-11 with two screenshots:
  - Screenshot 1: walk-in order #002465, ₹256.00, 6 items, all item rows ₹0.00, "Dine-In · —".
  - Screenshot 2: delivery order #002471, ₹135.00, 1 item, "Delivery · Delivery address on file", customer + phone shown.
- Owner decisions captured in the same thread.

## Updated User-Reported Issues
The pop-up does not give the cashier enough information to confidently Accept or Reject an incoming web order. Specifically:

1. **45c — Item price shows ₹0.00 on every line** (original).
2. **45a — View Order action does nothing** (original).
3. **45b — Reject action does nothing** (original).
4. **45d (NEW) — Add-ons are not shown under each item.**
5. **45e (NEW) — Variations are not shown under each item.**
6. **45f (NEW) — Item-level notes are not shown.**
7. **45g (NEW) — Order-level note is not shown.**
8. **45h (NEW) — Delivery orders show a placeholder string ("Delivery address on file") instead of the actual delivery address (line 1, city, pincode).**
9. **45i (NEW) — Delivery orders do not show the delivery charge value, nor the payment status (Prepaid vs COD).**
10. **45j (NEW) — Dine-In QR orders should show Section + Table Number; behavior with missing fields TBC.**
11. **45k (NEW) — Take-away orders should show customer name + phone (currently they do show this; verify on a real take-away order).**
12. **45l (NEW) — A "Paid" / Prepaid badge (same visual treatment as dashboard order cards) is missing from the pop-up.**
13. **45m (NEW) — Quantity prefix ("2×", "3×") is missing on item lines** (root cause shared with 45c — field key mismatch `quantity` vs canonical `qty`).

## Owner-Confirmed Direction (verbatim consolidation)
- **Q1 (Show variations + add-ons in pop-up)** → **Option B** — show as sub-lines under each item. Owner: "option B is fine but … functionality is not working" (i.e. owner wants it, today it's absent). The trailing "q1 a" in the same message is read as a typo given the surrounding detailed instruction; owner to correct if otherwise.
- **Q2 (Prev / Next when only one order)** → **Option B** — hide entirely when queue size = 1, show only when 2 or more orders are waiting.
- **Q3 (View Order button role)** → **Keep as-is, no change.**
- **Q4 (Order-type info to show)** — owner-confirmed per-type field list:
  - **Delivery**: customer name + phone + delivery address line 1 + city / pincode + payment status (Prepaid / COD) + delivery charge — **all required**.
  - **Take-away**: customer name + phone.
  - **Dine-In (QR)**: Section + Table number + customer name + phone if given.
- **Q5 (Dine-In QR with missing table fields)** — owner noted the walk-in screenshot was a walk-in, not a true QR dine-in. **Still want a check**: if a true QR dine-in order arrives without `tableNumber` / `tableSectionName` populated, confirm whether backend ships those fields on the YTC payload. Likely needs backend confirmation (separate ticket).
- **Cross-cutting**: All item-level notes, order-level note, add-ons, variations must be visible in the pop-up. A Prepaid badge identical to the dashboard cards must appear when payment is prepaid.

## Evidence Reviewed (additional)
- Screenshot 1 (walk-in #002465): confirms 45c + 45m (₹0.00 + no qty prefix); confirms 45g (no order note even though order would normally carry one); confirms walk-in shows customer-style empty location string.
- Screenshot 2 (delivery #002471): confirms 45h (placeholder), 45i (no charge / status), 45l (no Paid badge despite likely-prepaid).
- `frontend/src/api/transforms/orderTransform.js` (L106–148, L258–280): order item shape (`qty`, `price`, `unitPrice`, `variation`, `addOns`, `notes`) + order shape (`deliveryAddress`, `deliveryCharge`, `paymentType`, `paymentMethod`, `orderNote`, `tableNumber`, `tableSectionName`).
- `frontend/src/components/dashboard/ScanOrderPopOut.jsx`: confirmed item line render reads only `it.name`, `it.quantity` (wrong key), `it.total ?? it.amount` (wrong keys) — never reads `it.variation`, `it.addOns`, `it.notes`.
- `frontend/src/components/cards/OrderCard.jsx` (L329–330): existing `PAID` badge pattern that can be lifted into the pop-up:
  ```
  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
        style={{ backgroundColor: '#E8F5E9', color: COLORS.primaryGreen }}>PAID</span>
  ```
  Reuse predicate: `order.paymentType === 'prepaid' && order.fOrderStatus !== 8`.

## Updated Module Mapping
- Primary Module: **Dashboard → Scan & Order → POS2-002 Phase 4 Pop-out (`ScanOrderPopOut.jsx`)**
- Downstream Impacted Modules: none new (still self-contained presentation).

## Updated Affected Code Areas

| File | Reason / Sub-defect served |
| --- | --- |
| `frontend/src/components/dashboard/ScanOrderPopOut.jsx` (item list region, ~L397–421) | 45c + 45m (line price + qty prefix); 45d + 45e (add-ons + variations as sub-lines); 45f (item notes). |
| `frontend/src/components/dashboard/ScanOrderPopOut.jsx` (header / sub-header region, ~L375–395) | 45h + 45i (delivery line: address line 1 + city/pincode + payment status + delivery charge); 45l (Prepaid badge); 45g (order note shown under header). 45j + 45k (per-order-type rendering branch). |
| `frontend/src/components/dashboard/ScanOrderPopOut.jsx` (Prev / Next region, ~L424–449) | 45 nav (hide entirely when `queue.length <= 1`). |
| `frontend/src/components/dashboard/ScanOrderPopOut.jsx` (backdrop / z-index + new `suppressed` prop) | 45a + 45b (original — preserved from earlier plan). |
| `frontend/src/pages/DashboardPage.jsx` (`<ScanOrderPopOut/>` instance) | Pass `suppressed={Boolean(orderEntryType) \|\| Boolean(cancelOrderEntry)}` so the pop-up hides while OrderEntry / Cancel modal is open. |
| `frontend/src/components/cards/OrderCard.jsx` (Prepaid badge reference only, L329–330) | Read-only — reuse same visual; no changes to OrderCard. |

## Field-Mapping Reference (already shipped to FE by `orderTransform`)
- **Per item** — `name`, `qty`, `unitPrice` (× qty = line total), `variation` (array; each item has `name`, optional price), `addOns` (array; each has `name`, optional `price`), `notes` (string — item-level), `isComplementary` / `isComplementaryRuntime` (for legitimate ₹0 cases).
- **Per order** — `orderType`, `orderNumber` (`#002471`), `amount`, `customer` / `customerName`, `phone`, `tableSectionName`, `tableNumber`, `deliveryAddress` (object: `contact_person_name`, `contact_person_number`, `address_type`, `address`, `pincode`, `formatted`, `floor`, `road`, `house`), `deliveryCharge` (number), `paymentType` (`prepaid` / others), `paymentMethod` (`cash`, `card`, `upi`, `cash_on_delivery`, etc.), `orderNote` (string — order-level), `fOrderStatus`.

## API / Socket Review (unchanged from earlier)
- **No new endpoints needed.** All required fields are already produced by the existing `orderTransform.fromAPI.order` consumer.
- **One backend confirmation outstanding** (carry-over from Q5): for true QR dine-in YTC orders, confirm that `delivery_address` is null AND that `restaurantTable.table_number` + `restaurantTable.section_name` are populated. Today's transform reads `api.restaurantTable` for these — needs a single sample QR-dine-in YTC payload to confirm.

## Updated Root Cause Hypothesis
- **45a + 45b** — Frontend presentation issue (z-index stacking).
- **45c + 45m** — Frontend mapping issue (wrong field keys on item render).
- **45d + 45e + 45f + 45g** — Frontend feature gap (data is present, pop-up never renders it).
- **45h + 45i** — Frontend feature gap (delivery section is hard-coded to a placeholder string).
- **45j** — Frontend per-order-type branch needs to read `tableSectionName` + `tableNumber` (already on the data) and degrade gracefully to "—" only when both are absent. Backend confirmation needed for true QR-dine-in shape.
- **45k** — Frontend gap (take-away currently shows the word "Takeaway" but not customer/phone explicitly inside the location line; customer block above the items list already shows name + phone — verify on a real take-away).
- **45l** — Frontend feature gap (Prepaid badge present on cards, missing in pop-up).

Net classification: **single frontend-only file (`ScanOrderPopOut.jsx`) feature gap + presentation bug**. No backend change required for any of 45a–45l other than the QR-dine-in shape confirmation (45j).

## Updated Regression Risk Areas
- Pop-up height grows once add-ons / variations / notes / delivery address are rendered → existing max-height (`lg:max-h-[85vh]`) and the scrolling items container (`max-h-[28vh]`) may need a small re-tune. Owner already wants a comprehensive view, so this is acceptable.
- Tablet / small-viewport (full-screen) layout: more content per order means the cashier may need to scroll on small devices. No layout-engine change planned — vertical scroll already exists.
- Snooze / Prev / Next handlers — untouched.
- Accept / Reject / View handlers — untouched.

## Updated Open Questions / Missing Information
- A sample socket payload for a **true QR dine-in YTC web order** (to confirm `restaurantTable.table_number` + `restaurantTable.section_name` shipment). Owner can defer this to a separate backend-confirm note; the FE will read whatever keys are present and degrade to "—" otherwise.

## Updated User Interaction Required
**Not required.** All needed owner decisions are now captured. The QR-dine-in payload check is a parallel ask that does not block implementation of every other sub-defect.

## Updated Analysis Verdict
- **Frontend feature gap + presentation bug** (single file: `ScanOrderPopOut.jsx`).

## Updated Analysis Outcome
**Analysis Complete** — comprehensive hypothesis with owner-confirmed scope.

## Updated Ready For Next Stage?
Yes — Implementation Planning can begin (and should refresh the BUG-045 section in the Bucket-1 plan to match this widened scope).

## Updated Next Step
- Refresh BUG-045 section in `/app/memory/bugs/POS_FINAL_1_0_BUG_IMPLEMENTATION_PLAN_BUCKET_1.md` to incorporate sub-defects 45d–45n + the owner-confirmed per-type field list + the PAID badge + the explicit reuse map.
- No backend-confirm sub-task is needed for 45j (resolved — transform already maps `tableNumber` + `tableSectionName` from `restaurantTable`).

---

# BUG-045 — Reuse Map + Final Field Confirmations (Addendum 2, 2026-05-11)

Triggered by owner's follow-up: (1) notes / delivery instructions also need to surface, (2) `table_number` + `section_name` already arrive via `orderTransform` — agreed, (3) no new code if existing patterns can be reused.

## Confirmed: Every needed field is already mapped in `orderTransform`

| Field | Source on order/item | Confirmed at |
| --- | --- | --- |
| `tableNumber` | `restaurantTable.table_no` | `orderTransform.js:195` |
| `tableSectionName` | `restaurantTable.title` | `orderTransform.js:196` |
| `orderNote` (order-level) | `api.order_note` | `orderTransform.js:272` |
| `notes` per item (item-level) | `detail.food_level_notes` | `orderTransform.js:130` |
| `variation` per item | `detail.variation` | `orderTransform.js:128` |
| `addOns` per item | `detail.add_ons` | `orderTransform.js:129` |
| `unitPrice` / `qty` per item | `detail.unit_price`, `detail.quantity` | `orderTransform.js:119, 124` |
| `deliveryAddress` (full object) | `api.delivery_address` | `orderTransform.js:279` |
| `deliveryAddress.delivery_instructions` | passes through raw — already mapped on the customer side (`customerTransform.js:100`) and present on the same raw object the order receives | `customerTransform.js:100` |
| `deliveryCharge` | `api.delivery_charge` | `orderTransform.js:280` |
| `paymentType` (`prepaid` etc.) | `api.payment_type` | `orderTransform.js:214` |
| `paymentMethod` (`cash`/`upi`/`cash_on_delivery`) | `api.payment_method` | `orderTransform.js:215` |
| `fOrderStatus` (PAID-badge guard) | `api.f_order_status` | `orderTransform.js:189` |
| `customerName` + `phone` | `user` block | `orderTransform.js:200–203` |

**Conclusion**: No transform change. No new data path. Pop-up only needs to READ these fields it has been ignoring.

## NEW sub-defect to add (carry into plan)

| ID | Sub-defect | Field to read |
| --- | --- | --- |
| **45n** | Delivery instructions (if any) not shown on a delivery order | `order.deliveryAddress.delivery_instructions` (string) — show as a small italic line under the address. Hide when blank. |

(Sub-defects 45f / 45g for item-level notes and order-level note are already in the analysis — re-confirmed.)

## Reuse Map (no new code where avoidable)

| Need in pop-up | Existing source to copy from | Notes |
| --- | --- | --- |
| Item-line layout: name + variation sub-line + add-ons sub-line + item notes line | `components/reports/OrderDetailSheet.jsx` L330–395 — already renders exactly this shape (variations `(+₹)`, add-ons `+ name (+₹)`, italic notes) | Lift the JSX pattern verbatim into the pop-up's items container. Pop-up uses slightly tighter spacing — minor class tweaks only, no new component file. |
| Currency formatting | `formatCurrency` helpers already exist in `OrderTable.jsx`, `OrderDetailSheet.jsx`, `SummaryBar.jsx`, `RoomRowCard.jsx` (same implementation) + `COLORS` constants | Reuse the same `(₹{value}).toFixed(2)` shape. Do **not** add a new helper module — match the in-component constant pattern used by the file's existing siblings. |
| Address line ("street, city, pincode") | `components/order-entry/AddressPickerModal.jsx:70` — already does `[addr.address, addr.city, addr.pincode].filter(Boolean).join(', ')` | Lift the one-liner. No new utility. |
| Prepaid "PAID" badge | `components/cards/OrderCard.jsx:329–330` — exact JSX + colors | Lift verbatim. Same predicate `order.paymentType === 'prepaid' && order.fOrderStatus !== 8`. |
| Order-type → label string | `formatChannelLabel` already inside `ScanOrderPopOut.jsx` (L90) | Reuse as-is. |
| Hide pop-up while OrderEntry / Cancel modal open | Existing dashboard state `orderEntryType` + `cancelOrderEntry` | No new state. Just pass `suppressed` boolean prop derived from these. |
| Snooze / Prev / Next handlers | Existing `handleSnoozeClick`, `goPrev`, `goNext` | Untouched. |
| Item zero-price legitimate case | `item.isComplementary` / `item.isComplementaryRuntime` already on `orderTransform.fromAPI.orderItem` | Use these to render "Comp" tag in place of ₹0.00 only when intentionally complementary; otherwise show real `unitPrice × qty`. |

## Field-list per order type (final, owner-confirmed)

| Order type | Header line | Sub-header / extra rows |
| --- | --- | --- |
| **Dine-In (QR)** | `Dine-In · {section} · {tableNumber}` (degrade to `—` only when both blank) | Customer name + phone if present |
| **Delivery** | `Delivery · {address line 1}, {city}, {pincode}` | Customer name + phone · `PAID` badge if prepaid · Payment label (`Prepaid` / `COD` / etc.) · `Delivery Charge ₹{n}` · italic delivery instructions line if present |
| **Take-away** | `Takeaway` | Customer name + phone if present |
| **Walk-in (web/scan walk-in)** | `Walk-In` | Customer name + phone if present |

Order-level note (`order.orderNote`) — if present on any order type, show as one italic line above the items list (label `Order Note:`).

## Updated 45j status
**Resolved by code inspection** — `orderTransform.js:195–196` already maps `restaurantTable.table_no` → `tableNumber` and `restaurantTable.title` → `tableSectionName`. The walk-in screenshot showed `—` because walk-in orders have no `restaurantTable` (correct degrade). A true QR-dine-in YTC order will populate these because backend already ships `restaurantTable` on every regular order frame. **No backend confirmation needed.**

## Updated Open Questions
- None blocking. The single residual unknown (whether QR-dine-in YTC frames include `restaurantTable`) is degraded-gracefully — if absent, show `—`; if present, show section + table. No code branch needed beyond the existing graceful fallback.

## Updated Analysis Outcome
**Analysis Complete** — comprehensive, owner-confirmed, every field traced to an existing transform key, every UI element traced to an existing reusable pattern in the codebase. **Zero new helpers / utility files required.** All changes localized to `ScanOrderPopOut.jsx` + a one-prop addition to `DashboardPage.jsx`.

## Updated Ready For Next Stage?
Yes — Implementation Planning Agent can now refresh the BUG-045 section of the Bucket-1 plan with the Reuse Map and 45n added.

---

# BUG-046 Impact Analysis

## Source
- Intake Bug: `/app/memory/BUG_TEMPLATE.md` lines 3781–3845
- Evidence Folder: No separate evidence folder found
- Google Sheet Status Before Analysis: Not provided

## User Reported Issue
For a delivery order where the **Delivery Charge field is editable**, entering / modifying a delivery charge is accepted in the input but the **new value is not reflected in the order total / Collect Bill amount**.

## Evidence Reviewed
- Intake entry (BUG-046)
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (lazy-init L162–166, readOnly rule L938, totals L350–432, deliveryCharge consumption L358, rawFinalTotal L424)
- `frontend/src/components/order-entry/OrderEntry.jsx` (`deliveryCharge` state L165, `total` derivation L644–698, `CollectPaymentPanel` prop wiring L1173–1221)
- `frontend/src/components/order-entry/CartPanel.jsx` (inline delivery-charge input L711–742, Collect Bill button L850–869)
- BUG-019 (Apr-2026) close-out notes and CR-008 D1-Cap docs

## Module Mapping
- Primary Module: **Billing → Order Entry / Collect Bill → Delivery Charge → Grand Total**
- Downstream Impacted Modules: Place / Update Order payload (`deliveryCharge` in `placeOrder` / `updateOrder`), Audit Report delivery charge (BUG-039).
- Module decision reference: CR-008 D1-Cap (delivery-charge capture & persistence), CR-013 D-GST-1/2 (delivery GST on edit), BUG-019 (Apr-2026 — scan/re-engage delivery charge readOnly lock).

## Affected Route / Page
- `OrderEntry` overlay (per-order). Cart-Panel inline edit + Collect-Bill pre-pay edit.

## Affected Screen / Flow
There are **two edit surfaces** for the delivery charge:

### Surface A — Cart Panel inline (Order Entry, before Collect Bill click)
1. User edits `cart-delivery-charge-input` (CartPanel L726–740).
2. `onChange` invokes `onDeliveryChargeChange` → `OrderEntry.setDeliveryCharge`.
3. OrderEntry's `total` recomputes:
   - **Pre-place branch**: `total = applyRoundOff(rawLocalTotal) + deliveryAddOn` — **change IS reflected** in the Collect Bill button label.
   - **Placed branch**: `total = (orderFinancials.amount || 0) + applyRoundOff(rawUnplacedTotal)` — **change is NOT reflected**, because `orderFinancials.amount` is the backend-echoed value that already had a different delivery charge baked in. No `updateOrder` is auto-fired on delivery-charge edit. (`deliveryAddOn` is only used in the pre-place branch.)

### Surface B — Collect Bill panel (`CollectPaymentPanel`)
1. User edits the `delivery-charge-section` input (L915–950).
2. `setDeliveryChargeInput(e.target.value)` updates local state.
3. `deliveryCharge = parseFloat(deliveryChargeInput) || 0` recomputes.
4. `rawFinalTotal = subtotal + sgst + cgst + deliveryCharge` (L424) — **change IS reflected** in `finalTotal` and the Pay button label.
5. BUT: the input is `readOnly` when `isPrepaid || (isWebOrder && initialDeliveryCharge > 0)` (L938). For prepaid scan orders or web orders with a customer-entered delivery charge, edits are blocked.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/components/order-entry/OrderEntry.jsx` (L687–698) | Placed-branch `total` ignores `deliveryAddOn` — relies on backend echo. Inline edit of `deliveryCharge` after place is dropped. |
| `frontend/src/components/order-entry/CartPanel.jsx` (L711–742, L867–868) | Inline delivery-charge input + Collect Bill button label. Label uses OrderEntry's `total`, so post-place edits don't move it. |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (L162–166, L358, L424, L938) | Lazy-init of `deliveryChargeInput` from `initialDeliveryCharge`; readOnly lock for prepaid / web-order paths. If the order arrives at Collect Bill with `initialDeliveryCharge > 0` (a backend-seeded value), and the user edits via Cart Panel **after** placing but **before** opening Collect Bill, the lazy-init still re-seeds from the prop — but `initialDeliveryCharge={orderFinancials.deliveryCharge \|\| Number(deliveryCharge) \|\| 0}` (OrderEntry L1221) means the fresh local `deliveryCharge` wins over the (now-stale) backend echo. |

## API Review
- Endpoints: `placeOrder` / `updateOrder` / `BILL_PAYMENT`.
- Payload builder: `orderTransform.toAPI.collectBillExisting` carries the live `deliveryCharge` (from CollectPaymentPanel) into the bill payload — so the **payload itself does reach backend with the edited value** when paid via Collect Bill panel.
- The gap is **visual** on the placed branch's Collect Bill button (Cart Panel) — `total` shown to the user lags the actual editable value.

## Socket / Realtime Review
No direct socket involvement.

## State / Data Flow
Cart Panel inline edit → `setDeliveryCharge` (OrderEntry local state) → `total` recomputes (pre-place branch only). Once placed, the local edit no longer affects `total` until either an `updateOrder` is fired (refreshes `orderFinancials.amount`) or the user opens CollectPaymentPanel (which then uses the local value as `initialDeliveryCharge`).

## Relevant Final Documentation
- CR-008 D1-Cap (delivery charge capture in placeOrder/updateOrder) — documented.
- BUG-019 close-out (scan / re-engage delivery readOnly lock) — documented; readOnly path is intentional for prepaid + web flows.
- Final docs do **not** say whether post-place delivery-charge edit should auto-fire `updateOrder` to refresh `orderFinancials.amount`.

## Current Code Behavior
- **Pre-place**: edit reflects in total. **Works.**
- **Post-place (Cart Panel inline)**: edit does NOT reflect in `total` (Collect Bill button label) because `total = orderFinancials.amount + ...` ignores `deliveryAddOn`. **Visual lag bug.**
- **Collect Bill panel (editable path)**: edit reflects in `rawFinalTotal`. **Works.**
- **Collect Bill panel (readOnly path — prepaid / web order with delivery)**: edits blocked by design. **Works as designed; not a bug.**

## Expected Behavior
- Editable delivery charge edits must reflect in the order total live across **all surfaces** (Cart Panel Collect Bill button + Collect Bill grand total).
- Outgoing collect-bill payload must carry the entered value (already does, per analysis above).

## Root Cause Hypothesis (high-confidence)
**Frontend mapping issue — placed-branch total derivation drops `deliveryAddOn`.** Specifically, in `OrderEntry.jsx` L696–698, the placed branch uses `orderFinancials.amount` (backend echo) without re-adding `deliveryAddOn` to reflect the post-place edit. Fix is to either:
1. Add `+ (deliveryAddOn - (orderFinancials.deliveryCharge || 0))` to the placed branch, or
2. Auto-fire `updateOrder` on inline delivery-charge change to refresh `orderFinancials.amount`.

This is also consistent with the BUG-019 close-out — the readOnly lock there is intentional, and the editable path was simply not re-wired into the placed-branch total.

## Regression Risk Areas
- BUG-019 closed behavior (scan / re-engage delivery readOnly lock) — must NOT regress.
- CR-008 D1-Cap (delivery charge persists into placeOrder/updateOrder) — must NOT regress.
- CR-013 D-GST-2 (delivery GST computed from live delivery charge) — must continue to track edits.
- Room orders / walk-in / dine-in — `deliveryAddOn` is gated on `orderType === 'delivery'`, so non-delivery flows are not affected by the fix.

## Docs / Code Mismatch
- Final docs are silent on placed-branch behavior for editable delivery charge edits. **Potential docs update needed** to make the contract explicit after fix.

## Open Questions / Missing Information
- Whether owner expects the inline Cart Panel edit to auto-PATCH backend (updateOrder), or only to update the local UI total until Collect Bill is clicked. (Both fixes resolve the visual lag; the second is simpler / has lower regression risk.)
- Screenshot / repro on the placed branch.

## User Interaction Required
**Not required** — strong hypothesis; owner-preferred fix shape (local-only re-add vs auto-PATCH) is a planning-stage choice, not an analysis-stage blocker.

## Analysis Verdict
- **Frontend mapping issue** (placed-branch total derivation).

## Analysis Outcome
**Analysis Complete** — high-confidence hypothesis.

## Ready For Next Stage?
Yes — Implementation Planning can begin.

## Next Step
Bug Implementation Planning Agent. Suggest the planning agent confirm with owner whether the fix should auto-fire `updateOrder` or only re-add `deliveryAddOn` to the placed-branch total.

---

# BUG-047 Impact Analysis

## Source
- Intake Bug: `/app/memory/BUG_TEMPLATE.md` lines 3848–3909
- Evidence Folder: No separate evidence folder found
- Google Sheet Status Before Analysis: Not provided

## User Reported Issue
An order is placed from / for outlet "**Mayur's Kitchen**" but the **buzzer / new-order notification** displays "**18 March**" (treated by the reporter as a different outlet name). Mismatch between order's source outlet and the notification's outlet label.

## Evidence Reviewed
- Intake entry (BUG-047)
- `frontend/src/contexts/NotificationContext.jsx` (full file)
- `frontend/src/utils/toneMapper.js`, `frontend/src/utils/soundManager.js`
- `frontend/src/config/firebase.js` (FCM permissions / token only)
- `frontend/src/utils/restaurantRef.js` (RestaurantContext bridge for confirm-order tone override)

## Module Mapping
- Primary Module: **Notifications → FCM new-order buzzer / toast**
- Downstream Impacted Modules: Multi-outlet (restaurant) context binding, Sidebar Silent Mode, POS2-007 confirm-order tone override.
- Module decision reference: `MODULE_DECISIONS_FINAL.md` Notifications section (POS2-007 Phase 1: per-restaurant `confirm_order_tone`).

## Affected Route / Page
- Global (notifications appear on any route after login).

## Affected Screen / Flow
1. New order placed at outlet "Mayur's Kitchen".
2. Backend FCM service composes a notification (title / body / data) using the outlet's name and pushes to FCM.
3. FE `onForegroundMessage` (or service-worker forwarder) calls `processNotification(payload)`:
   - Title / body read from `data.title || notif.title` / `data.body || notif.body`.
   - Sound resolved from `data.sound` → fallback to content inference.
   - Confirm-order tone override (POS2-007) consults `restaurant.settings.confirmOrderTone` via `getRestaurantRef()`.
4. Notification displayed via toast/banner; sound played.

## Affected Code Areas

| File | Reason |
| --- | --- |
| `frontend/src/contexts/NotificationContext.jsx` (L70–154) | `processNotification` — reads title/body **verbatim** from the FCM payload (`data.title || notif.title`). No outlet-name override on the FE. |
| `frontend/src/utils/restaurantRef.js` | Bridge between FE notification context and RestaurantContext (only `confirm_order_tone` is consumed today; outlet name is not). |
| `frontend/src/config/firebase.js` | FCM token / permission only. Does not transform inbound payloads. |

## API Review
- No direct REST involvement on the FE for notification content. FCM payload is composed entirely by backend.

## Socket / Realtime Review
- FCM-only (no socket-driven notifications for buzzer / new-order in this flow). Service worker forwards background messages; foreground listener handles in-tab arrivals.

## State / Data Flow
Backend composes FCM payload (incl. outlet/restaurant context) → FCM service → FE `onForegroundMessage` / service-worker forwarder → `processNotification` → toast + sound. The outlet label "18 March" appears in the FCM payload — FE renders verbatim.

## Relevant Final Documentation
- `MODULE_DECISIONS_FINAL.md` Notifications section confirms: notification CONTENT (title / body / outlet label) is owned by backend FCM emitter; FE only consumes.
- POS2-008 (planned) reassigns more notification routing to backend; current state is FE-renders-verbatim.

## Current Code Behavior
- FE renders the FCM payload's title / body / data fields as-is. No outlet name override exists on the FE. If the FCM payload says "18 March," that is what the user sees.

## Expected Behavior
- Notifications must carry the correct outlet/restaurant context. An order from "Mayur's Kitchen" must trigger a notification labelled "Mayur's Kitchen".

## Root Cause Hypothesis (high-confidence)
**Backend response/contract issue.** The FE does not compose the outlet name. The mismatch must originate in the FCM payload composed by backend — either:
1. A multi-outlet account stores both restaurants but the FCM service uses the wrong `restaurant_id` / `outlet_name` lookup for this order's source, OR
2. A date-formatting placeholder is leaking into the restaurant-name template slot (`"18 March"` could be the formatted timestamp of the order if `{restaurant_name}` and `{order_date}` slots get swapped).

Hypothesis (2) is plausible because "18 March" looks like a formatted date — and a templating bug on the backend FCM emitter could surface it where a name is expected.

## Regression Risk Areas
- Other notification types (new-order, confirm-order, settle-bill, attend-table, rejection) would also be affected if the cause is template-slot misalignment.
- Existing POS2-007 confirm-order tone override path — independent of content rendering.

## Docs / Code Mismatch
- Final docs assign notification content to backend. **No FE code change can fix this** — fix must be on the backend FCM emitter.

## Open Questions / Missing Information
- A captured FCM payload (network / FCM admin console / chrome `chrome://gcm-internals`) showing the literal `title`, `body`, and `data` fields for an order from "Mayur's Kitchen" that displayed "18 March".
- Confirmation of whether "18 March" is a real outlet name in the operator's account OR a formatted date that has leaked into the outlet-name slot.
- Reproducibility (every order from this outlet vs intermittent).

## User Interaction Required
**Required** — owner must supply at minimum:
1. A screenshot or FCM payload sample of the wrong notification.
2. Confirmation of whether "18 March" is a literal outlet name in their account.

Without (2), it is impossible to know whether to investigate (a) outlet-id mismatch in backend FCM service or (b) template-slot misalignment.

## Analysis Verdict
- **Backend bug / API contract issue** (FCM payload composition).

## Analysis Outcome
**Analysis Complete with Clarification Required**

## Ready For Next Stage?
No — backend confirmation + FCM payload sample required.

## Next Step
Owner clarification first (FCM payload + outlet-name confirmation) → Backend confirmation → Bug Implementation Planning Agent (likely backend-only; no FE change expected).

---

# Cross-Bug Summary

## 1. Bugs Analyzed
11 bugs: **BUG-037, BUG-038, BUG-039, BUG-040, BUG-041, BUG-042, BUG-043, BUG-044, BUG-045, BUG-046, BUG-047**.

## 2. Bugs Ready For Implementation Planning (Analysis Complete, no blocker)
- **BUG-044** — Free table stale items (FE safety-net hypothesis).
- **BUG-045** — Scan/Web popup three sub-defects (View/Reject/₹0.00).
- **BUG-046** — Editable delivery charge not in placed-branch total.

**3 bugs ready.**

## 3. Bugs Needing Owner Clarification
- **BUG-038** — Exact CRM auto-populate contract (trigger + field set).
- **BUG-040** — Provided target Excel/CSV format file (BLOCKING).
- **BUG-041** — Sample misaligned PDF + expected grouping rules.
- **BUG-043** — Owner direction: remove Discount column vs correct the formula.

**4 bugs need owner clarification.**

## 4. Bugs Needing Backend Confirmation
- **BUG-037** — `def_ord_status` numeric code for "delivered" + expected `order_status` literal.
- **BUG-039** — Sample audit API response for a delivery order (where principal delivery charge lives).
- **BUG-042** — Backend response for failing UPI-on-Hold attempt.
- **BUG-047** — FCM payload sample + outlet-name confirmation (backend FCM emitter).

**4 bugs need backend confirmation.** (Some overlap with #3.)

## 5. Bugs Likely Frontend-Only
- BUG-038 (CRM wiring gap)
- BUG-040 (CSV export branch missing)
- BUG-041 (PDF layout / grouping gap)
- BUG-043 (FE-derivation of Discount)
- BUG-044 (FE safety-net for stale table state)
- BUG-045 (popup wiring + price field mapping)
- BUG-046 (placed-branch total derivation)

## 6. Bugs Likely Backend / API-Contract
- BUG-037 (incomplete `F_ORDER_STATUS_API` + likely backend contract for delivered)
- BUG-039 (`gst_tax` composite may include principal delivery)
- BUG-042 (UPI transaction_id requirement on Hold path)
- BUG-047 (FCM payload composition — backend-only fix)

## 7. Bugs Involving Report / Export Logic
- BUG-039 (audit row), BUG-040 (CSV), BUG-041 (PDF), BUG-043 (Room Orders).

## 8. Bugs Involving Socket / State / Context
- BUG-044 (handleUpdateOrder / handleUpdateTable + OrderContext).
- BUG-045 (web-order socket → OrderContext shape; popup state derivation).

## 9. Bugs That May Be Duplicates Of Older Bugs
- **BUG-037 ↔ BUG-011** — both delivery-scoped scan-confirm failures. Likely same backend root-cause family; recommend keeping them separate until backend confirmation, then either merge or close BUG-011 as resolved-by-BUG-037 (or vice-versa).
- **BUG-038 ↔ BUG-003** — adjacent but opposite-direction (BUG-003 was Walk-In auto-fill; BUG-038 is missing CRM auto-populate). Keep separate.
- **BUG-046 ↔ BUG-019** — BUG-019 introduced the readOnly lock; BUG-046 is the editable-path regression. Keep separate, document the cross-reference.

## 10. Recommended Implementation Buckets

**Bucket A — Audit Report Family (BUG-039 + BUG-040 + BUG-041)** — share the audit row builder + export module. Best implemented together to avoid back-and-forth on the audit row shape. **Blocked by**: owner-provided target format + backend audit response sample.

**Bucket B — Dashboard / Scan Popup (BUG-037 + BUG-045)** — both touch `ScanOrderPopOut.jsx` + `handleConfirmOrder` + `handleTableClick` + `handleCancelOrderFromCard`. BUG-037 needs backend confirmation; BUG-045 is FE-ready.

**Bucket C — Billing / Payment Flow (BUG-038 + BUG-042 + BUG-046)** — all touch `CollectPaymentPanel.jsx`. BUG-046 is FE-ready; BUG-038 needs owner clarification; BUG-042 needs backend trace.

**Bucket D — Socket / State Sync (BUG-044)** — standalone, FE-only safety-net.

**Bucket E — Room Orders Report (BUG-043)** — standalone, FE-only, needs owner direction.

**Bucket F — Notifications / FCM (BUG-047)** — backend-only, no FE change expected.

## 11. Recommended First Implementation Bucket
**Bucket B (Dashboard / Scan Popup) — BUG-045 sub-tasks**, simultaneously **Bucket D (BUG-044)** and **Bucket C BUG-046**.

Rationale:
- BUG-045 (P0) has high user impact, three independent FE-only sub-defects, strong hypothesis, no blocker.
- BUG-046 (P0) has high user impact, FE-only, strong hypothesis, no blocker.
- BUG-044 (P2) is FE-only safety-net, no blocker, low regression risk.

These three can be picked up immediately by the Bug Implementation Planning Agent. The other 8 bugs progress in parallel: owner clarifications for BUG-038/040/041/043, backend confirmations for BUG-037/039/042/047.

## 12. Docs Read
See the "Docs Read" section at the top of this report. All baseline `/app/memory/final/` files were reviewed, all relevant overlay docs in `/app/memory/change_requests/`, and the sprint-tagged bug intakes in `/app/memory/BUG_TEMPLATE.md` lines 3183–3909.

## 13. Baseline Conflicts Found
**None.** Two sprint bugs intersect with existing CRs but do not contradict them:
- BUG-039 ↔ CR-013 D-GST-3 (delivery GST inside `gst_tax` — confirmed by-design).
- BUG-046 ↔ BUG-019 readOnly lock (lock is intentional; editable-path total derivation gap is the new defect).

---

## End of Analysis

- **No code changes were made.**
- **`/app/memory/final/` was not updated.**
- **`/app/memory/BUG_TEMPLATE.md` was not modified.**
- This report is at `/app/memory/bugs/POS_FINAL_1_0_BUG_IMPACT_ANALYSIS.md`.
