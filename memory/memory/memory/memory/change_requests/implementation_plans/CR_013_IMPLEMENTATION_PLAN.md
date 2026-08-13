# CR-013 Implementation Plan

**Verdict:** **`SAFE_TO_IMPLEMENT_AFTER_APPROVAL`**

**Agent:** CR-013 Implementation Planning Agent
**Date:** 2026-05-05
**Branch:** `5may`
**Scope:** Frontend-only (Phase 1). 3 files, 2 buckets, no payload-key change, no backend contract change.

---

## 1. Title and verdict

**Title:** CR-013 — Implementation Plan for GST rate-source switch (Service Charge GST, Tip GST, Delivery Charge GST)

**Verdict:** `SAFE_TO_IMPLEMENT_AFTER_APPROVAL`
- No baseline conflict found.
- No backend contract required (BE-G1..G4 are confirmations, non-blocking — frozen rule §10/§11/§12 of the Frozen Business Logic doc).
- All target code paths are well-isolated; rollback surface is minimal.
- CR-008 Sub-CR #1 D1-Cap and D1-Gate behaviour can be preserved verbatim.

---

## 2. Source documents read

| File | Status | Role |
|---|---|---|
| `/app/memory/change_requests/requirements/CR_013_FROZEN_BUSINESS_LOGIC.md` | Found | **Authoritative requirement** — frozen rules §1, applicability matrix §2, rate mapping §3, fallback §4, order-type §5, prepaid/postpaid §6, display §7, payload §8, BE contract §9, out-of-scope §10, owner register §11, readiness §12 |
| `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md` | Found at `/app/memory/final/` (NOT at `/app/memory/`; task-spec path was incorrect — corrected here) | Approval-Gate format, per-file plan format, hotspot caution rules for the 3 target files |
| `/app/memory/change_requests/CR_013_GST_CONFIG_CORRECTION.md` | Found | Original CR-013 source doc (Owner-stated rule 2026-05-03) |
| `/app/memory/change_requests/impact_analysis/CR_013_GST_SERVICE_TIP_DELIVERY_PLANNING.md` | Found | Planning + impact analysis (predecessor to freeze) |
| `/app/memory/change_requests/requirements/CR_013_OWNER_DECISION_SHEET.md` | Found | Owner-decision capture sheet |
| `/app/memory/change_requests/implementation_handover/CR_BUCKET_D1_CAP_DELIVERY_CHARGE_CAPTURE_HANDOVER.md` | Found | Sub-CR #1 D1-Cap (delivery-charge capture rule — preserved) |
| `/app/memory/change_requests/implementation_handover/CR_BUCKET_D1_CAP_ROUND2_QA_NOTE.md` | Found | Sub-CR #1 D1-Cap Round-2 (delivery-into-totals fold — preserved) |
| `/app/memory/change_requests/implementation_handover/CR_BUCKET_D1_GATE_OVERRIDE_RULE_HANDOVER.md` | Found | Sub-CR #1 D1-Gate (`readOnly={isPrepaid}` — preserved) |
| `/app/memory/change_requests/implementation_handover/CR_008_SUB_1_ROLLBACK_PLAYBOOK.md` | Found | Sub-CR #1 rollback recipe — referenced for parity rollback design |
| `/app/memory/change_requests/qa_reports/CR_008_SUB_1_QA_REPORT.md` | Found | §10 row 5 confirms "GST on SC/Delivery uses `avgGstRate` rather than profile keys — tracked under CR-013, NOT a Sub-CR #1 defect" |

---

## 2A. Baseline documents read

> All baseline files are under `/app/memory/final/` and are **read-only**. None were modified by this agent.

| Baseline file (per task spec) | Status | Relevant constraints | CR-013 conflict? | Modified? |
|---|---|---|---|---|
| `ARCHITECTURE_CURRENT_STATE.md` | **MISSING** in workspace | n/a — file not present | n/a | n/a |
| `API_DOCUMENT_V2.md` | **MISSING** in workspace | n/a — file not present | n/a | n/a |
| `HANDOFF_SUMMARY.md` | **MISSING** in workspace | n/a — file not present | n/a | n/a |
| `SOCKET_V2_FEATURE.md` | **MISSING** in workspace | n/a — file not present | n/a | n/a |
| `PROJECT_INVENTORY.md` | **MISSING** in workspace | n/a — file not present | n/a | n/a |
| `MODULE_MAP.md` | **MISSING** in workspace (its content lives inside `MODULE_DECISIONS_FINAL.md`) | n/a — see `MODULE_DECISIONS_FINAL.md` row | n/a | n/a |
| `RISK_REGISTER.md` | **MISSING** in workspace (its content is partially in `OPEN_QUESTIONS_FINAL_RESOLUTION.md`) | n/a — see substitute row | n/a | n/a |
| `ARCHITECTURE_DECISIONS_FINAL.md` | **FOUND** | Rules **FA-03** (hotspot caution — target files are named hotspots), **API-02** (transform-mediated payload shaping must be preserved), **API-03** (OrderEntry composition / CollectPaymentPanel settlement boundary), refactor guardrail line *"Do not silently change tax, service charge, round-off, room billing, or print semantics"* | **NO** — CR-013 stays inside Module 4 + Module 14 envelopes; no boundary shift; semantics change is owner-explicit per §11 of frozen doc | NOT modified |

### Substitute baseline files actually present in workspace
| File | Role |
|---|---|
| `/app/memory/final/MODULE_DECISIONS_FINAL.md` | Substitute for `MODULE_MAP.md` — Module 4 (Order Entry / Cart / Payment) + Module 14 (Print / Bill) explicitly own the CR-013 surface. Module 5 (Rooms) and OQ-12 deferral noted; CR-013 does NOT change room billing/print **lifecycle** |
| `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md` | Substitute for `RISK_REGISTER.md` — OQ-05 / OQ-07 / OQ-12 read; OQ-12 (room billing/print lifecycle) explicitly preserved |
| `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md` | Read for required-step alignment (steps 5 + 8 — related APIs + regression risk) |
| `/app/memory/final/FINAL_DOCS_APPROVAL_STATUS.md` | Read for OD-01 + OD-02 |
| `/app/memory/final/FINAL_DOCS_SUMMARY.md` | Read — high-risk-areas list confirms the 3 target files are hotspots |

### Baseline-conflict assessment
- **No conflict found.** CR-013 changes value-of-existing-keys, not key-shape; lives inside named hotspot files; complies with FA-03 hotspot caution by carrying full Approval Gate + per-file plan + regression checklist below.
- **OQ-12 preserved** — CR-013 does NOT change room billing/print lifecycle, only the GST values flowing into the existing room totals.
- **CR-008 Sub-CR #1 preserved** — D1-Cap (capture UI), D1-Cap Round-2 (totals fold), D1-Gate (`readOnly={isPrepaid}`) all untouched. CR-013 only swaps the rate source on top of CR-008's existing capture/payload contract.

---

## 3. Current code findings

All line numbers verified live on the working tree (branch `5may`, head `06d3c93`).

### 3.1 `frontend/src/api/transforms/profileTransform.js`
- L94 — `tip: toBoolean(api.tip)` (existing flag — gates tip UI)
- L95 — `serviceCharge: toBoolean(api.service_charge)` (existing flag)
- L99 — `serviceChargePercentage: parseFloat(api.service_charge_percentage) || 0`
- L100 — `autoServiceCharge: toBoolean(api.auto_service_charge)`
- L103-106 — existing `tax: { percentage, gstPercentage, gstCode }` block
- L151 — `showUserGst`
- L152 — `roomGstApplicable`
- **MISSING TODAY:** parsing for `api.service_charge_tax` and `api.deliver_charge_gst`. Both confirmed exposed by backend per CR-013 §2 source verification.
- **No fallback hierarchy** to remove — these keys are simply absent in `profileTransform`. Therefore CR-013 §10 ("force GST = 0 on missing/null") will be implemented purely as a **safe-parse helper** at the consumption site (CollectPaymentPanel + orderTransform), not via fallback removal.

### 3.2 `frontend/src/components/order-entry/CollectPaymentPanel.jsx`
- L43 — `serviceChargePercentage = restaurant?.features?.serviceCharge && restaurant?.serviceChargePercentage || 0`
- L149 — `deliveryChargeInput` state seeded from `initialDeliveryCharge`
- L180-201 — `taxTotals` (per-item `item.tax.percentage` SGST/CGST aggregator — **CR-013 leaves this alone**, items use per-product tax)
- L235-237 — `tipEnabled = !!restaurant?.features?.tip` + `tipInput` state
- L341 — `deliveryCharge = orderType === 'delivery' ? (parseFloat(deliveryChargeInput) || 0) : 0` (gated; CR-008 Sub-CR #1 preserved)
- L344 — `tip = tipEnabled ? (parseFloat(tipInput) || 0) : 0`
- L350 — `scApplicable = orderType === 'dineIn' || orderType === 'walkIn' || isRoom` (BUG-013 rule — preserved)
- L351-353 — `serviceCharge` ₹ amount (formula preserved)
- **L360-362 — `avgGstRate` compute** ← will be **deprecated** for SC/tip/delivery; can stay in code for reference but must not multiply SC/tip/delivery
- **L365-367 — the 3 broken lines:**
  ```
  const scGst       = serviceCharge  * avgGstRate;   ← REPLACE
  const tipGst      = tip            * avgGstRate;   ← REPLACE
  const deliveryGst = deliveryCharge * avgGstRate;   ← REPLACE
  ```
- L364 — `itemGstPostDiscount = (taxTotals.sgst + taxTotals.cgst) * (1 - discountRatio)` — **untouched** (per-item GST)
- L369-371 — `totalGst`, `sgst`, `cgst` aggregation — **untouched** (math sums upstream values; only the SC/tip/delivery components shift)
- L375 — `subtotal = subtotalAfterDiscount + serviceCharge + tip` — **untouched**
- L377 — `rawFinalTotal = subtotal + sgst + cgst + deliveryCharge` — **untouched**
- L382-388 — BUG-009 fractional rounding rule — **untouched**
- L485-552 — payload building (`paymentData` for `BILL_PAYMENT`) — values flow through; no key change
- L877 — **`readOnly={isPrepaid}` (D1-Gate) — UNTOUCHED**

### 3.3 `frontend/src/api/transforms/orderTransform.js`
- L188 — `tipAmount: parseFloat(api.tip_amount) || 0` (response-side; unchanged)
- L246 — `deliveryCharge: parseFloat(api.delivery_charge) || 0` (response-side; unchanged)
- **L544 — `calcOrderTotals(cart, serviceChargePercentage, extras)` signature** — preserved (no signature change). New rate values must enter via a **new helper signature** described in §7.3 below
- **L571 — `avgGstRate = subtotal > 0 ? gstTax / subtotal : 0`** — kept (still used for item-GST proration on the gross item-tax sum that flows in via `gstTax`); however SC/tip/delivery multipliers must not use it
- **L575-577 — the 3 mirror lines:**
  ```
  + (serviceCharge  * avgGstRate)   ← REPLACE
  + (tipAmount      * avgGstRate)   ← REPLACE
  + (deliveryCharge * avgGstRate)   ← REPLACE
  ```
- L693-740 — `placeOrder()` payload — `service_tax`, `tax_amount`, `gst_tax`, `delivery_charge` echoed; no key change
- L778-820 — `updateOrder()` payload — same
- L847-918 — `placeOrderWithPayment()` (prepaid path) — same; calls `calcOrderTotals` with extras at L853-856
- L1161-1487 — `buildBillPrintPayload()`
  - L1300-1308 — `scApplicable` for re-print fallback (`order.orderType === 'dineIn' || order.isRoom === true`)
  - L1303-1311 — `serviceChargeAmount` resolution from `overrides` or self-compute
  - **L1313-1320 — re-print self-recompute fallback using `avgGstRate`** ← only triggers when CollectPaymentPanel is NOT the caller (re-print path); MUST mirror Bucket D-GST-2 logic with the same rate-source switch
  - L1323-1324 — `gst_tax`, `vat_tax` rounding — untouched
  - L1440 / L1465-1470 — final payload field assembly — untouched
- L955-1090 — `buildBillPrintPayloadFromCollectBill()` (Collect Bill direct print path) — receives FE-computed `gstTax`/`sgst`/`cgst` via overrides; values flow through unchanged shape

---

## 4. Existing calculation flow

### 4.1 Today's flow — Collect Bill (postpaid, Collect Bill button pressed)
1. `CollectPaymentPanel` mounts with current cart + restaurant config.
2. `taxTotals` (per-item GST) computed at L180-201 from `item.tax.percentage`.
3. `serviceCharge` (₹) computed at L351-353.
4. **`avgGstRate` computed at L360-362 from items only.**
5. **`scGst`, `tipGst`, `deliveryGst` computed at L365-367 by multiplying ₹ amounts × `avgGstRate`** ← THE BUG.
6. `sgst`, `cgst` aggregated at L370-371.
7. `rawFinalTotal` + BUG-009 round at L377-388.
8. On Collect Bill click → `paymentData` built at L485-552 → `BILL_PAYMENT` POST.

### 4.2 Today's flow — `placeOrder` / `updateOrder` (no Collect Bill yet)
1. Caller invokes `orderTransform.placeOrder(cart, options)` at L687-740.
2. `calcOrderTotals(unplacedItems, sc%, { deliveryCharge })` at L703-704.
3. **Inside `calcOrderTotals`, `avgGstRate` (L571) multiplied by SC/tip/delivery (L575-577)** ← MIRROR BUG.
4. Payload assembled at L735+.

### 4.3 Today's flow — `placeOrderWithPayment` (prepaid path)
1. Caller invokes at L847-918.
2. `calcOrderTotals(unplacedItems, sc%, { discountAmount, tipAmount, deliveryCharge })` at L853-856.
3. Same `avgGstRate` math.

### 4.4 Today's flow — Bill print
- **Collect Bill direct print** — `buildBillPrintPayloadFromCollectBill` reads CollectPaymentPanel-computed values via `overrides`. Whatever CollectPaymentPanel computes is what prints.
- **Re-print path** (e.g. duplicate bill) — `buildBillPrintPayload` (L1161+) self-recomputes when `overrides.serviceChargeAmount === undefined`, using its own `avgGstRate` at L1316. **Must be patched to mirror new rule** so duplicates match originals.

### 4.5 Fallback today
- **No fallback exists** for the missing keys — the keys are simply absent from `profileTransform.js`. Today's behaviour is "always use `avgGstRate`" regardless of restaurant config. CR-013 introduces the rate-source pathway and a force-0 fallback in one shot.

### 4.6 SGST/CGST split today
- 50/50 split at L370-371 in CollectPaymentPanel; mirrored on print/payload via the `gst_tax` composite. CR-013 leaves the 50/50 split rule untouched — only the upstream `totalGst` value shifts.

---

## 5. Frozen business rules applied (mapping to code)

| Frozen rule (Frozen doc §1 row #) | Code area | Implementation site |
|---|---|---|
| 1 — SC applies to dine-in/walk-in/room | `scApplicable` gate | **NO CHANGE** — already correct (CollectPaymentPanel L350; orderTransform L1300-1301) |
| 2 — SC GST applies | SC GST math | Bucket D-GST-2 |
| 3 — SC GST rate source = `service_charge_tax` | New profile key parse + new multiplier | Bucket D-GST-1 + D-GST-2 |
| 4 — Delivery applies to delivery only | `deliveryCharge` gate | **NO CHANGE** — preserved (CollectPaymentPanel L341; orderTransform L704/L797) |
| 5 — Delivery GST applies | Delivery GST math | Bucket D-GST-2 |
| 6 — Delivery GST rate source = `deliver_charge_gst` | New profile key parse + new multiplier | Bucket D-GST-1 + D-GST-2 |
| 7 — Tip applies to all (gated by `features.tip`) | tip gate | **NO CHANGE** (CollectPaymentPanel L236-237) |
| 8 — Tip GST applies | tip GST math | Bucket D-GST-2 |
| 9 — Tip GST rate source = `service_charge_tax` (same as SC); tip-GST = 0 if SC rate = 0 | tip-GST multiplier | Bucket D-GST-2 — single rate variable shared with SC |
| 10 — Missing/null/blank/non-numeric → force 0 | safe-parse helper | Bucket D-GST-1 (safe-parse) consumed in D-GST-2 |
| 11 — Print bill display: single SGST + CGST line | print payload | **NO DISPLAY CHANGE** — values shift, shape unchanged |
| 12 — Reports: composite `tax_amount` echoed | report read path | **NO CHANGE** — backend echoes whatever FE sent |
| 13 — Backend persistence: no new key | payload | **NO KEY CHANGE** — only values shift |
| 14 — Frontend-only Phase 1 | architecture | Confirmed |
| 15 — FE = calculation authority | architecture | Confirmed |
| 16 — Cut-over = ship day | rollout | Rollback playbook required (§13) |

---

## 6. Baseline compatibility mapping

| Baseline behaviour | CR-013 status | Owner-explicit override? | Risk |
|---|---|---|---|
| **API-02** transform-mediated payload shaping | **PRESERVED** — no signature/key change | n/a | None |
| **API-03** OrderEntry/CollectPaymentPanel boundary | **PRESERVED** — math change lives inside CollectPaymentPanel + orderTransform | n/a | None |
| **MC-06** backend owns reports aggregation | **PRESERVED** — no new column, no FE aggregation | n/a | None |
| **OQ-12** room billing/print lifecycle deferred | **PRESERVED** — CR-013 does not change room flow shape; only GST values fold into existing totals | n/a | None |
| **FA-03** hotspot caution | **HONOURED** — Approval Gate + per-file plan + regression checklist below | n/a | Mitigated |
| Refactor guardrail: *"Do not silently change tax, service charge, round-off, room billing, or print semantics"* | **CR-013 IS the explicit, owner-approved tax-semantics change** | YES — Frozen doc §11 owner register | Mitigated by explicit ownership + cut-over date |
| **CR-008 Sub-CR #1 D1-Cap** | **PRESERVED** verbatim | n/a | None — only GST value attached to the captured delivery line shifts |
| **CR-008 Sub-CR #1 D1-Cap Round-2** | **PRESERVED** — `extras.deliveryCharge` still folds into `tax_amount`/`order_amount`/`round_up`; only the rate inside that fold changes | n/a | None |
| **CR-008 Sub-CR #1 D1-Gate** (`readOnly={isPrepaid}`) | **PRESERVED** verbatim | n/a | None |
| **BUG-009** fractional rounding | **PRESERVED** | n/a | None |
| **BUG-013** SC applicability gate | **PRESERVED** | n/a | None |
| **BUG-019** prepaid delivery round-trip | **PRESERVED** — anti-tamper lock now lives in D1-Gate | n/a | None |

**Result: NO BASELINE CONFLICT.**

---

## 7. File-level edit plan

### 7.1 `frontend/src/api/transforms/profileTransform.js` (Bucket D-GST-1)

| Aspect | Detail |
|---|---|
| Function/area | The main `transformProfileResponse` (or equivalent) function building the `restaurant` object — exact area is L94-152 (additions to be slotted near L100) |
| What to change | Add 2 new top-level fields on the `restaurant` object, parsed safely from new backend keys |
| What to add (illustrative; final wording up to implementer): | `serviceChargeTaxPct` ← parse `api.service_charge_tax` via safe-parse helper |
|  | `deliveryChargeGstPct` ← parse `api.deliver_charge_gst` via safe-parse helper |
| Safe-parse helper (illustrative): | `function parseTaxPct(v) { const n = parseFloat(v); return Number.isFinite(n) && n >= 0 ? n : 0; }` — covers missing/null/blank/non-numeric/negative all → 0. Whether this helper lives inline or in a tiny utility is the implementer's call (no new file required) |
| What NOT to change | Existing keys at L94, L95, L99, L100, L103-106, L151, L152 — all preserved |
| Expected before | Restaurant object lacks both keys; consumers default to `avgGstRate` |
| Expected after | Restaurant object exposes `serviceChargeTaxPct` and `deliveryChargeGstPct` as numbers ≥ 0 (force-0 on any unsafe input) |
| Risk level | **LOW** — additive only; no consumer breaks; no new branch logic in this file |

### 7.2 `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (Bucket D-GST-2)

| Aspect | Detail |
|---|---|
| Function/area | Inline math block at L335-395 inside the component body |
| What to change | Replace L365-367 multipliers with rate-driven ones using restaurant.serviceChargeTaxPct and restaurant.deliveryChargeGstPct |
| What to add (illustrative): | Two locals near L350: `const scTaxRate = (restaurant?.serviceChargeTaxPct \|\| 0) / 100;` and `const delTaxRate = (restaurant?.deliveryChargeGstPct \|\| 0) / 100;` |
|  | Replace L365-367 with: `const scGst = serviceCharge * scTaxRate;` `const tipGst = tip * scTaxRate;` `const deliveryGst = deliveryCharge * delTaxRate;` |
| What NOT to change | L43 (sc% read), L149 (deliveryChargeInput state), L180-201 (taxTotals — items), L235-237 (tipEnabled gate), L341 (deliveryCharge gate), L344 (tip read), L350-353 (scApplicable + serviceCharge ₹), L360-362 (`avgGstRate` block — leave for documentation/future reference; comment that it is no longer used for SC/tip/delivery), L364 (itemGstPostDiscount), L369-371 (totalGst/sgst/cgst aggregation), L375-388 (subtotal + rounding), L485-552 (paymentData), **L877 (D1-Gate `readOnly={isPrepaid}`)** |
| Expected before | SC/tip/delivery GST scaled by `avgGstRate` (item-blended) |
| Expected after | SC GST = `serviceCharge × service_charge_tax%`; Tip GST = `tip × service_charge_tax%`; Delivery GST = `deliveryCharge × deliver_charge_gst%`; if either rate missing/null/blank/NaN → that component contributes 0 |
| Risk level | **HIGH** (hotspot, revenue-critical); mitigated by single-line replacements and clear before/after parity |

### 7.3 `frontend/src/api/transforms/orderTransform.js` (Bucket D-GST-2)

| Aspect | Detail |
|---|---|
| Functions/areas | (a) `calcOrderTotals` L544-602; (b) `buildBillPrintPayload` L1295-1322 (re-print self-recompute fallback) |
| Signature change for `calcOrderTotals` | **EXTEND extras** — add 2 optional fields: `extras.serviceChargeTaxPct` and `extras.deliveryChargeGstPct`. Default both to 0 inside the destructure. Signature stays backward-compatible (callers without these fields → 0% GST on SC/tip/delivery, which matches CR-013 §10 force-0 semantics) |
| Caller update | All 3 callers — `placeOrder` L703-704, `updateOrder` L796-797, `placeOrderWithPayment` L853-856 — must pass the new pcts pulled from the restaurant object available to those functions. If they currently lack a restaurant handle, plumb it through `options` (already the established pattern — `serviceChargePercentage` is plumbed the same way) |
| Replace L575-577 with | `+ (serviceCharge  * scTaxRate)` `+ (tipAmount      * scTaxRate)` `+ (deliveryCharge * delTaxRate)` where `scTaxRate = serviceChargeTaxPct/100`, `delTaxRate = deliveryChargeGstPct/100` |
| Print path L1313-1320 fix | Mirror the same rate-driven recompute. Receive both pcts via `overrides` (e.g. `overrides.serviceChargeTaxPct`, `overrides.deliveryChargeGstPct`) OR derive from the persisted `order` shape if available. CollectPaymentPanel-driven prints already pass `overrides.gstTax` and bypass the recompute → no behaviour change for direct-print path |
| What NOT to change | L188 (response parse), L246 (response parse), L551-557 (rounding/round-up), `service_tax` / `tax_amount` / `gst_tax` / `delivery_charge` / `tip_amount` / `order_amount` / `round_up` payload keys, all `delivery_address` logic (CR-008), all D1-Cap/D1-Gate logic |
| Expected before | `avgGstRate` multiplied into SC/tip/delivery in both calc and print paths |
| Expected after | Rate-driven multipliers; missing/null pcts → 0% via the safe-parse helper at the profileTransform layer |
| Risk level | **HIGH** (hotspot, payload-shaping); mitigated by signature extension being backward-compatible (extras-only) |

### 7.4 No other files touched

`OrderEntry.jsx`, `CartPanel.jsx`, `AddressFormModal.jsx`, `crmAxios.js`, `paymentMutationService.js`, `BILL_PAYMENT` schema files, etc. — **all untouched**.

---

## 8. Bucket D-GST-1 plan — Parse

**Goal:** Normalise `service_charge_tax` and `deliver_charge_gst` from the profile API into safe numeric percentages on the FE `restaurant` object.

| Item | Detail |
|---|---|
| File | `frontend/src/api/transforms/profileTransform.js` |
| New restaurant fields | `serviceChargeTaxPct` (number, ≥ 0); `deliveryChargeGstPct` (number, ≥ 0) |
| Safe-parse rule | `parseFloat(v)` → if not `Number.isFinite` or < 0 → return `0`. Covers: missing key, null, blank string, non-numeric, negative |
| Profile-API source | Main POS backend (`https://preprod.mygenie.online/`), authenticated by `auth_token` bearer. **NOT** CRM (`crm.mygenie.online` / `REACT_APP_CRM_API_KEYS` is unrelated to this CR — confirmed by Owner) |
| No new storage/payload keys | Confirmed (Frozen rule §13) |
| Baseline compatibility | Additive; preserves API-02 and existing transform shape |
| Independent shippability | YES — Bucket D-GST-1 can ship as a no-op standalone (parsed values are not yet consumed). Recommended as a separate commit/PR for clean rollback parity |
| Test surface (lint/typecheck/visual smoke) | `yarn lint`; preview app boots; profile load logs no warning |

---

## 9. Bucket D-GST-2 plan — Apply

**Goal:** Switch the SC/tip/delivery GST rate source from `avgGstRate` to the parsed profile pcts, in all 3 calculation sites (CollectPaymentPanel, calcOrderTotals, buildBillPrintPayload re-print path).

| Item | Detail |
|---|---|
| Files | `CollectPaymentPanel.jsx` + `orderTransform.js` (calcOrderTotals + buildBillPrintPayload) |
| Calculation switch | SC GST = serviceCharge × scTaxRate · Tip GST = tip × scTaxRate · Delivery GST = deliveryCharge × delTaxRate |
| SGST/CGST split | **UNCHANGED** — 50/50 split at the aggregate `totalGst` level; only the upstream value shifts |
| Display | Single SGST line + single CGST line (status quo); per-component breakup NOT introduced (Frozen §11 / OD-D1) |
| Payload values | `service_tax` (₹) unchanged; `tax_amount`/`gst_tax`/`order_amount`/`round_up` values shift; **keys unchanged** (Frozen §13 / OD-D3) |
| Print/report | Print uses same shifted values; reports remain backend-aggregation (MC-06) |
| Order-type matrix | dineIn/walkIn/room → SC + tip + (no delivery); takeAway → no SC + tip; delivery → no SC + tip + delivery; tip-GST always at SC rate even when SC line absent (Frozen §5 / Q-G4) |
| Prepaid impact | `placeOrderWithPayment` calls `calcOrderTotals` with new extras → values reflect new math; D1-Gate `readOnly={isPrepaid}` **untouched** |
| Postpaid impact | CollectPaymentPanel + `placeOrder`/`updateOrder` paths reflect new math; D1-Gate untouched |
| CR-008 Sub-CR #1 preservation | D1-Cap capture UI + payload key + D1-Cap Round-2 totals fold + D1-Gate `readOnly={isPrepaid}` — **NONE TOUCHED** |
| Baseline compatibility | API-02 (transform owns shaping) preserved via signature-extends-not-changes; API-03 boundary preserved; MC-06 preserved; OQ-12 preserved |
| Independent shippability | Depends on D-GST-1 being live first |

---

## 10. CR-008 preservation check

| Sub-CR #1 component | Preservation method |
|---|---|
| **D1-Cap (capture UI)** in `AddressFormModal.jsx`, `CartPanel.jsx`, `OrderEntry.jsx`, `CollectPaymentPanel.jsx:149` | **NOT EDITED** — no file in CR-008 D1-Cap touch-list is on CR-013 edit list. CartPanel/AddressFormModal not opened |
| **D1-Cap delivery_charge payload key** | **NOT RENAMED** — CR-013 keeps `delivery_charge` key untouched (Frozen §13) |
| **D1-Cap Round-2 totals fold** | **PRESERVED** — `extras.deliveryCharge` continues to flow into `calcOrderTotals` exactly as today; only the multiplier rate changes |
| **D1-Gate `readOnly={isPrepaid}` at CollectPaymentPanel L877** | **NOT EDITED** — explicitly listed in §7.2 "What NOT to change"; verifier line for QA |
| **isPrepaid derivation** at `OrderEntry.jsx:651-652` | **NOT EDITED** — outside CR-013 file list |
| **Anti-tamper lock for prepaid scan/customer-app delivery orders** | **PRESERVED** via D1-Gate |
| **Sub-CR #1 backups** in `/app/memory/change_requests/implementation_handover/CR_008_SUB_1_ROLLBACK_PLAYBOOK.md` | **REFERENCED** for rollback parity in §13 |

**Risk to prepaid/postpaid settlement logic:** **NONE.** Only the rate inside the existing GST math changes; settlement keys, settlement endpoints, settlement guard rails all untouched.

---

## 11. Backend contract check

| ID | Question | Status | Code-confirmable? | Blocker for FE ship? |
|---|---|---|---|---|
| **BE-G1** | Is `service_charge_tax` exposed on the POS profile-API response? | **Per CR-013 §2 source verification: YES** | Cannot confirm in code without a live profile-API response capture; recommended one-shot capture by implementer before merge | **NO** — Frozen rule §10 "force GST = 0 on missing" makes this safe-by-default |
| **BE-G2** | Same for `deliver_charge_gst` | **Per CR-013 §2: YES** | Same | **NO** — same |
| **BE-G3** | Backend trusts client-supplied `tax_amount` / `service_tax` / `delivery_charge` (no recompute)? | **Yes per BUG-019 + CR-008 Sub-CR #1 prior decisions** | Confirmed in code: BUG-019 prepaid round-trip + Sub-CR #1 D1-Cap Round-2 both rely on FE-authoritative payloads | **NO** |
| **BE-G4** | Any third profile key (e.g. `tip_charge_tax`)? | **No per Frozen doc** | Cannot confirm in code; recommended one-shot grep on profile response by implementer | **NO** — tip rides SC rate by design |

**All four are confirmations only. None block CR-013 frontend implementation.**

---

## 12. QA matrix for future QA agent

> **Prep step (each scenario):** verify `restaurant.serviceChargeTaxPct` and `restaurant.deliveryChargeGstPct` resolve to the expected values via React DevTools or a one-line console probe.

### 12.1 Profile-key state (with a representative cart)

| # | `service_charge_tax` | `deliver_charge_gst` | Expected SC GST | Expected Tip GST | Expected Delivery GST |
|---|---|---|---|---|---|
| 1 | `"5.00"` | `"5.00"` | SC × 5% | tip × 5% | delivery × 5% |
| 2 | `"18.00"` | `"5.00"` | SC × 18% | tip × 18% | delivery × 5% |
| 3 | `"0.00"` | `"0.00"` | 0 | 0 | 0 |
| 4 | absent | absent | 0 | 0 | 0 |
| 5 | `null` | `null` | 0 | 0 | 0 |
| 6 | `""` | `""` | 0 | 0 | 0 |
| 7 | `"abc"` | `"abc"` | 0 | 0 | 0 |
| 8 | `"5.00"` | absent | SC × 5% | tip × 5% | 0 |
| 9 | absent | `"5.00"` | 0 | 0 | delivery × 5% |
| 10 | `"-1.00"` | `"-1.00"` | 0 | 0 | 0 (negative blocked) |

### 12.2 Order type × scenario

| # | Order type | Cart | SC enabled | Tip | Delivery | Expected behaviour |
|---|---|---|---|---|---|---|
| 1 | dineIn | mixed-rate | yes | ₹20 | n/a | SC + tip + item GST visible; SC/tip GST per profile rate |
| 2 | walkIn | single-rate | yes | 0 | n/a | SC + item GST; no tip line |
| 3 | takeAway | mixed | n/a | ₹20 | n/a | No SC line; tip GST at SC rate (Q-G4) |
| 4 | delivery (postpaid) | mixed | n/a | ₹20 | ₹50 | No SC; tip GST at SC rate; delivery GST at delivery rate; D1-Gate editable |
| 5 | delivery (prepaid scan) | mixed | n/a | ₹20 | ₹50 (locked) | Same math; D1-Gate `readOnly={true}` preserved |
| 6 | room (`isRoom`) | dineIn-route | yes | ₹20 | n/a | Same as dineIn; OQ-12 lifecycle untouched |
| 7 | scan & order (delivery) | mixed | n/a | ₹0 | ₹50 | Same as #5 |

### 12.3 Print/bill display checks

| # | Surface | Check |
|---|---|---|
| 1 | Collect Bill UI | Single SGST + single CGST line (no per-component breakup) |
| 2 | Collect Bill grand total | Matches expected formula to the rupee |
| 3 | Direct-print bill (printed right after Collect Bill) | Tax lines mirror Collect Bill exactly |
| 4 | Re-print path (open existing order → print) | Tax lines match original-bill totals (the `buildBillPrintPayload` self-recompute branch) |
| 5 | Audit Report row | `tax_amount` / `service_tax` / `delivery_charge` echoed equal to FE-sent values |

### 12.4 Combined SGST + CGST display
- Single SGST = single CGST = totalGst / 2 (existing rule, unchanged).
- Per-component breakup line **MUST NOT** appear (Frozen §11).

### 12.5 No CRM dependency
- `crmAxios.js` not invoked for profile-tax read.
- `REACT_APP_CRM_API_KEYS` not referenced.
- All tax data flows from the auth-bearer profile endpoint.

### 12.6 No new payload keys
- `placeOrder` / `updateOrder` / `BILL_PAYMENT` payloads diffed before vs after — same key set.
- `service_charge_gst` / `tip_gst` / `delivery_charge_gst` keys MUST NOT appear.

### 12.7 Regression protection (must remain untouched)
- CR-008 Sub-CR #1 D1-Cap capture (CartPanel + AddressFormModal + OrderEntry).
- CR-008 Sub-CR #1 D1-Gate `readOnly={isPrepaid}`.
- BUG-009 fractional rounding rule.
- BUG-013 SC applicability gate (dineIn/walkIn/room only).
- BUG-019 prepaid delivery round-trip.
- Room billing/print lifecycle (OQ-12).

---

## 13. Rollback plan

| Aspect | Detail |
|---|---|
| Files to revert | `profileTransform.js` (Bucket D-GST-1) AND/OR `CollectPaymentPanel.jsx` + `orderTransform.js` (Bucket D-GST-2) |
| Backup convention | Mirror CR-008 Sub-CR #1 — keep `*.bak.cr013` copies of each touched file before edit; document in a CR-013 rollback playbook authored at ship time (cite `CR_008_SUB_1_ROLLBACK_PLAYBOOK.md` as template) |
| Granular rollback | Bucket D-GST-2 alone may be reverted while keeping D-GST-1 (no-op when D-GST-2 reverted, since restaurant object simply gains 2 unused fields) |
| Full rollback | Revert both buckets → bills return to today's `avgGstRate`-based math |
| Expected restored behaviour | Identical to current `5may` head (`06d3c93`) behaviour pre-CR-013 |
| Risk of rollback | **LOW** — additive Bucket D-GST-1 has no consumer; Bucket D-GST-2 reverts to the well-tested current branch math |
| **Does rollback affect CR-008 Sub-CR #1?** | **NO** — D1-Cap, D1-Cap Round-2, D1-Gate are not edited by CR-013, so reverting CR-013 leaves all three intact |
| Trigger conditions for rollback | Any tenant reports unexpected GST collapse on a configured-rate scenario (i.e. backend has rate but FE shows 0) AND the cause is traced to D-GST-1 parse logic OR D-GST-2 rate plumbing |
| Diagnostic aid (recommended at ship) | One-time `console.warn('[CR-013] missing service_charge_tax / deliver_charge_gst — defaulting to 0%')` on first CollectPaymentPanel render when a key is unset; mirrors the existing `[CR-001 DIAG]` pattern |

---

## 14. Approval gate

**APPROVAL REQUIRED**

The Implementation Agent **may proceed only after explicit user approval** of:

1. **Bucket split:** D-GST-1 ships first (additive, no-op); D-GST-2 ships next (rate-source switch on top).
2. **Rate-source pattern:** `restaurant.serviceChargeTaxPct` (for SC + tip GST); `restaurant.deliveryChargeGstPct` (for delivery GST). Both safe-parsed at the profileTransform layer.
3. **Plumbing pattern for `orderTransform`:** extend `extras` of `calcOrderTotals` with `serviceChargeTaxPct` + `deliveryChargeGstPct` (backward-compatible defaults to 0), passed by all 3 callers (`placeOrder`, `updateOrder`, `placeOrderWithPayment`) and the print self-recompute.
4. **D1-Gate preservation contract:** CollectPaymentPanel L877 `readOnly={isPrepaid}` is on the §7.2 "MUST NOT change" list and will be verified at QA gate.
5. **Cut-over policy:** Owner-confirmed immediate cut-over on ship day; rollback playbook authored alongside D-GST-2.
6. **Diagnostic console.warn** (recommended; implementer may opt out with rationale).

Once approved, the Implementation Agent will:
- Open D-GST-1 via Approval Gate format per `IMPLEMENTATION_AGENT_RULES.md`.
- Make backups (`*.bak.cr013`) before each edit.
- Ship D-GST-1 first; verify no behavioural change (additive only).
- Open D-GST-2 with full per-file plan + regression checklist.
- Author rollback playbook.
- Hand off to QA Agent with the §12 matrix.

---

**Stop here. No code changes. No QA. No `/app/memory/final/` edits. CR-008 Sub-CR #1 untouched.**

— End of CR-013 Implementation Plan —
