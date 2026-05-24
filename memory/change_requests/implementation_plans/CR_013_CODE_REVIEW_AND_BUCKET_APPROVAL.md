# CR-013 — Code Review & Bucket Approval

**Type:** Code review + bucket split + approval gate (NOT implementation)
**Agent:** CR-013 Code Review + Bucket Approval Agent
**Date:** 2026-05-05
**Branch:** `5may` (head `06d3c93`)
**Status:** **`awaiting_owner_approval_bucket_d_gst_1`**

> **Strict scope.** No code, no QA, no `/app/memory/final/` edits, no implementation, no tracker update, no merge. CR-008 Sub-CR #1 D1-Cap / D1-Cap-Round-2 / D1-Gate behaviour preserved verbatim.

---

## 1. Executive summary

The CR-013 Implementation Plan (`/app/memory/change_requests/implementation_plans/CR_013_IMPLEMENTATION_PLAN.md`) has been re-reviewed at code level against:
- the Frozen Business Logic (`/app/memory/change_requests/requirements/CR_013_FROZEN_BUSINESS_LOGIC.md`)
- the planning + impact analysis predecessor
- the CR-008 Sub-CR #1 QA report and three D1-* handover docs
- the live source on branch `5may` (head `06d3c93`)

**Verdict:** Plan is **fully compliant** with the frozen logic. **No `plan_mismatch_needs_owner_decision`** flag raised. Bucket split is technically clean (D-GST-1 ships as a no-op, D-GST-2 ships the rate-source switch on top). Recommend **Option A** sequential rollout. Awaiting owner approval for **Bucket D-GST-1** only.

---

## 2. Files inspected

### 2.1 Memory docs
| File | Found | Used for |
|---|---|---|
| `/app/memory/change_requests/requirements/CR_013_FROZEN_BUSINESS_LOGIC.md` | YES | Authoritative requirement source (§3 below) |
| `/app/memory/change_requests/implementation_plans/CR_013_IMPLEMENTATION_PLAN.md` | YES | Plan under review |
| `/app/memory/change_requests/impact_analysis/CR_013_GST_SERVICE_TIP_DELIVERY_PLANNING.md` | YES | Predecessor planning doc |
| `/app/memory/change_requests/qa_reports/CR_008_SUB_1_QA_REPORT.md` | YES | §10 row 5 confirms scope split between Sub-CR #1 and CR-013 |
| `/app/memory/change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` | YES | CR-013 status row reconfirmed |
| `/app/memory/change_requests/BASELINE_RECONCILIATION_REPORT_2026_05_04.md` | YES | "Delivery charge GST sourcing" row classification |
| `/app/memory/change_requests/implementation_handover/CR_BUCKET_D1_CAP_DELIVERY_CHARGE_CAPTURE_HANDOVER.md` | YES | D1-Cap preservation contract |
| `/app/memory/change_requests/implementation_handover/CR_BUCKET_D1_CAP_ROUND2_QA_NOTE.md` | YES | D1-Cap Round-2 totals fold preservation |
| `/app/memory/change_requests/implementation_handover/CR_BUCKET_D1_GATE_OVERRIDE_RULE_HANDOVER.md` | YES | D1-Gate `readOnly={isPrepaid}` preservation |
| `/app/memory/change_requests/implementation_handover/CR_008_SUB_1_ROLLBACK_PLAYBOOK.md` | YES | Backup convention reference |
| `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md` | YES | Read-only baseline; FA-03/API-02/API-03 guardrails |
| `/app/memory/final/MODULE_DECISIONS_FINAL.md` | YES | Read-only baseline; Module 4 + Module 14 ownership |
| `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md` | YES | Read-only baseline; OQ-12 deferral |
| `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md` | YES | Approval-Gate format reference |
| `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md` | YES | Required-step alignment |
| `/app/memory/final/FINAL_DOCS_APPROVAL_STATUS.md` | YES | OD-01 / OD-02 awareness |
| `/app/memory/final/FINAL_DOCS_SUMMARY.md` | YES | Hotspot-list confirmation |

### 2.2 Source files (read, not edited)
| File | Lines reviewed | Role |
|---|---|---|
| `frontend/src/api/transforms/profileTransform.js` | L86-152 | Restaurant-config parse — **target of D-GST-1** |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | L43-237, L341-395, L860-880 | Cashier-visible math + delivery input — **target of D-GST-2** |
| `frontend/src/api/transforms/orderTransform.js` | L188, L246, L544-602, L693-820, L847-918, L955-1090, L1295-1325, L1440-1470 | Payload + print transforms — **target of D-GST-2** |

### 2.3 `/app/memory/final/` modification check
- All 7 files in `/app/memory/final/` retain mtime `2026-05-05 02:27:04` — **NOT modified**.
- `git status --short` shows no source-code edits.

---

## 3. Frozen-logic compliance check (Task 1)

| Frozen rule (Frozen doc §) | Plan §/row | Compliant? | Evidence in plan |
|---|---|---|---|
| §1 SC applies to dineIn/walkIn/room | §5 row 1 / §7.2 "What NOT to change" | ✅ YES | `scApplicable` gate at CollectPaymentPanel L350 + orderTransform L1300-1301 explicitly preserved |
| §1 row 3 — SC GST source = `service_charge_tax` | §3 + §7.1 + §7.2 + §7.3 | ✅ YES | New `restaurant.serviceChargeTaxPct` plumbed through all 3 sites |
| §1 row 6 — Delivery GST source = `deliver_charge_gst` | §3 + §7.1 + §7.2 + §7.3 | ✅ YES | New `restaurant.deliveryChargeGstPct` plumbed through all 3 sites |
| §1 row 9 — Tip GST = same rate as SC; tip-GST = 0 if SC = 0 | §7.2 / §7.3 / §9 | ✅ YES | Tip multiplied by the **same** `scTaxRate` — naturally 0 when SC rate is 0 |
| §1 row 10 — Missing/null/blank/non-numeric → 0 | §7.1 safe-parse helper | ✅ YES | `parseFloat(v); !Number.isFinite(n) \|\| n < 0 → 0` covers all 5 cases |
| §1 row 10 — Explicit `"0.00"` honoured as 0 (override) | §7.1 (implicitly) | ✅ YES | `parseFloat("0.00") = 0` → multiplier × 0 = 0 |
| §1 row 13 — No new payload key | §7.3 + §9 + §12.6 | ✅ YES | `service_tax`, `tax_amount`, `gst_tax`, `delivery_charge`, `tip_amount`, `order_amount`, `round_up` all retained — only values shift |
| §9 — No backend change required | §11 (BE-G1..G4 = confirmation only) | ✅ YES | Force-0 fallback makes BE-G1/G2 non-blocking |
| §10 — `/app/memory/final/` untouched | §2A | ✅ YES | All 7 baseline file mtimes verified at `02:27:04` |
| CR-008 Sub-CR #1 D1-Cap preserved | §10 + §7.2 / §7.3 "What NOT to change" | ✅ YES | CartPanel + AddressFormModal not on edit list; `delivery_charge` payload key untouched |
| CR-008 Sub-CR #1 D1-Cap Round-2 preserved | §10 | ✅ YES | `extras.deliveryCharge` flow into `calcOrderTotals` retained verbatim |
| CR-008 Sub-CR #1 D1-Gate preserved | §10 + §7.2 explicit verifier line | ✅ YES | CollectPaymentPanel L877 `readOnly={isPrepaid}` explicitly listed as MUST NOT change |
| CRM unrelated | §8 + §12.5 | ✅ YES | `crmAxios.js` + `REACT_APP_CRM_API_KEYS` not referenced |
| BUG-009 fractional rounding preserved | §6 + §7.2 | ✅ YES | L382-388 (CollectPaymentPanel) + L551-557 (orderTransform) untouched |
| BUG-013 SC-applicability gate preserved | §5 row 1 / §7.2 | ✅ YES | `scApplicable` rule at L350 untouched |

**Conclusion:** No `plan_mismatch_needs_owner_decision` raised. Plan is **green-lit** by frozen-logic compliance check.

---

## 4. Current code review (Task 2)

### 4.1 `frontend/src/api/transforms/profileTransform.js`

| Aspect | Detail |
|---|---|
| Current function | Profile-response transform builder; emits `restaurant` object consumed by `RestaurantContext` |
| Current logic | L94-152 build the object. Tax-related keys present: `service_charge` (bool, L95), `service_charge_percentage` (rate, L99), `auto_service_charge` (bool, L100), `tax.gstPercentage` (from `api.gst_tax`, L105), `tip` (bool, L94) |
| Current issue | Backend-exposed keys `service_charge_tax` and `deliver_charge_gst` are **not parsed** — they have **zero consumers** in the FE. Today's GST math therefore ignores configured rates entirely |
| Planned replacement | Add 2 new top-level fields: `serviceChargeTaxPct` and `deliveryChargeGstPct`, both safe-parsed (force 0 on missing/null/blank/non-numeric/negative) |
| Change type | **Parsing-only / additive.** No existing key removed or renamed |
| Risk level | **LOW** |

### 4.2 `frontend/src/components/order-entry/CollectPaymentPanel.jsx`

| Aspect | Detail |
|---|---|
| Current function | Settlement panel — owns Collect Bill UI + grand total + payment payload |
| Current logic (L335-395) | Computes `serviceCharge` (L351), `avgGstRate` (L360-362 — `(taxTotals.sgst + taxTotals.cgst) / itemTotal`), then **L365-367 multiplies SC, tip, deliveryCharge × `avgGstRate`** for the 3 component GSTs |
| Current issue | `avgGstRate` is item-blended, not configured; bills over-tax SC/tip/delivery on high-item-GST carts and under-tax on low-item-GST carts; restaurants with explicit SC/delivery tax rates are ignored entirely |
| Planned replacement | New locals near L350: `scTaxRate = (restaurant?.serviceChargeTaxPct \|\| 0) / 100`; `delTaxRate = (restaurant?.deliveryChargeGstPct \|\| 0) / 100`. Replace L365-367 with `scGst = serviceCharge × scTaxRate`, `tipGst = tip × scTaxRate`, `deliveryGst = deliveryCharge × delTaxRate` |
| Change type | **Calculation-only.** No payload-key change; SGST/CGST 50/50 split untouched; rounding rule untouched; D1-Gate untouched |
| Risk level | **HIGH** (hotspot, revenue-critical) — mitigated by single-line replacements + before/after parity in plan §7.2 |

### 4.3 `frontend/src/api/transforms/orderTransform.js`

| Aspect | Detail |
|---|---|
| Current functions | `calcOrderTotals` (L544-602) — payload-side math used by `placeOrder`/`updateOrder`/`placeOrderWithPayment`; `buildBillPrintPayload` (L1161-1487) — re-print path with self-recompute fallback at L1313-1320 |
| Current logic | `calcOrderTotals` L575-577 multiplies SC/tip/delivery × `avgGstRate` (L571). `buildBillPrintPayload` L1316 mirrors the same `avgGstRate`-based fallback when `overrides.serviceChargeAmount === undefined` (re-print without CollectPaymentPanel context) |
| Current issue | Mirror of the same bug — payloads + re-prints carry the same wrong GST values as the UI |
| Planned replacement | Extend `calcOrderTotals` `extras` with `serviceChargeTaxPct` + `deliveryChargeGstPct` (defaults 0 → backward-compatible). All 3 callers (`placeOrder` L703, `updateOrder` L796, `placeOrderWithPayment` L853) plumb the new pcts. Replace L575-577 multipliers. Mirror in `buildBillPrintPayload` L1316-1320 |
| Change type | **Calculation + payload-shaping** (signature extension is backward-compatible — extras-only add) |
| Risk level | **HIGH** (hotspot, payload-shaping) — mitigated by signature backward-compat + per-caller plumbing checklist in plan §7.3 |

---

## 5. Bucket split (Task 3)

The plan's existing 2-bucket split is **technically clean** and recommended as-is.

### Bucket D-GST-1 — Parse / expose tax config keys
- **Goal:** Parse and expose `service_charge_tax` and `deliver_charge_gst` on the `restaurant` object via `profileTransform.js`.
- **File touched:** `frontend/src/api/transforms/profileTransform.js` (only).
- **Calculation behaviour change:** **None** — Bucket D-GST-1 ships as a **no-op**. New fields appear on the restaurant object but have no consumer until D-GST-2 lands.
- **Risk:** **LOW** (additive; no existing field removed/renamed).
- **Independent shippability:** YES (recommended as a separate commit/PR for clean rollback).

### Bucket D-GST-2 — Apply component-specific GST rates
- **Goal:** Switch SC/tip/delivery GST rate source from `avgGstRate` to the parsed profile pcts in all 3 sites.
- **Files touched:** `frontend/src/components/order-entry/CollectPaymentPanel.jsx` + `frontend/src/api/transforms/orderTransform.js`.
- **Calculation behaviour change:** YES — bills will reflect new GST values immediately on ship.
- **Risk:** **HIGH** (hotspot files, revenue-critical, bill-impacting).
- **Independent shippability:** Depends on D-GST-1 being live first.

### No additional buckets required
- Plan is exhaustive; no extra files surface during code review.
- No display-layer change (single SGST + CGST line preserved).
- No payload-key add/rename/remove.
- No backend ticket.

### Owner-flag for additional file (Task 5 G3 placeholder)
- **None at this time.** If D-GST-2 implementer discovers any additional file requiring edit (e.g. an indirect import propagating `avgGstRate`), they MUST stop and re-approval-gate via G3 before editing.

---

## 6. Approval table (Task 4)

| Bucket | File | Function / area | Current behavior | Proposed behavior | Risk | Validation |
|---|---|---|---|---|---|---|
| **D-GST-1** | `profileTransform.js` | Restaurant-object builder ~L94-152 | `service_charge_tax` and `deliver_charge_gst` not parsed → restaurant object lacks both fields | Add `serviceChargeTaxPct` + `deliveryChargeGstPct` (safe-parse: missing/null/blank/non-numeric/negative → 0) | LOW | (i) `yarn lint` clean, (ii) preview app boots, (iii) DevTools probe `RestaurantContext` shows new fields on a tenant where backend supplies the keys, (iv) calculation results unchanged on Collect Bill (no consumer yet) |
| **D-GST-2** | `CollectPaymentPanel.jsx` | L335-395 math block | L365-367 multiplies SC/tip/delivery × `avgGstRate` (item-blended) | Replace with `scTaxRate`/`delTaxRate` driven multipliers; tip rides SC rate; SGST/CGST 50/50 split unchanged; D1-Gate L877 untouched | **HIGH** | (i) lint, (ii) Collect Bill grand total matches expected formula across QA matrix §12 of plan, (iii) print bill mirrors Collect Bill, (iv) D1-Gate `readOnly` unchanged on prepaid scan order |
| **D-GST-2** | `orderTransform.js` | `calcOrderTotals` L544-602 + `buildBillPrintPayload` L1295-1325 | L575-577 + L1316-1320 mirror the same `avgGstRate`-bug | Extend `extras` with the 2 pcts (defaults 0 → backward-compatible); plumb from `placeOrder`/`updateOrder`/`placeOrderWithPayment` callers; mirror replacement in print recompute | **HIGH** | (i) lint, (ii) `placeOrder`/`updateOrder` payload diff shows shifted `tax_amount`/`gst_tax`/`order_amount`/`round_up` values but identical key set, (iii) re-print path matches original bill, (iv) prepaid path via `placeOrderWithPayment` retains anti-tamper lock |

### What will NOT change (explicit)
- Per-product `tax.percentage` (item-GST math) — untouched.
- Service-Charge **₹** computation (`subtotalAfterDiscount × sc% / 100`) — untouched.
- BUG-009 fractional rounding — untouched.
- BUG-013 SC-applicability gate — untouched.
- BUG-019 prepaid delivery round-trip — untouched.
- CR-008 D1-Cap capture (`AddressFormModal.jsx`, `CartPanel.jsx`, `OrderEntry.jsx`) — untouched.
- CR-008 D1-Cap Round-2 totals fold — preserved verbatim.
- CR-008 D1-Gate `readOnly={isPrepaid}` at CollectPaymentPanel L877 — untouched.
- Room billing/print **lifecycle** (OQ-12) — untouched.
- All `delivery_address` logic (BUG-007) — untouched.
- `paymentMutationService.js`, `paymentService.js`, `BILL_PAYMENT` schema — untouched.
- CRM (`crmAxios.js`, `REACT_APP_CRM_API_KEYS`) — irrelevant.

### Rollback note (per bucket)
- **D-GST-1:** revert single file → no behavioural impact (was no-op).
- **D-GST-2:** revert 2 files → bills return to today's `avgGstRate` math; CR-008 Sub-CR #1 unaffected (CR-013 never edits Sub-CR #1 surface).
- Backups (`*.bak.cr013`) authored in implementer's working dir per CR-008 Sub-CR #1 rollback-playbook convention.

---

## 7. Risk map (Task 7 of plan, recapitulated for owner)

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| Hotspot regression on `CollectPaymentPanel.jsx` | HIGH | LOW | Bucket D-GST-2 single-line replacements; before/after parity table in plan §7.2; QA matrix §12 |
| Hotspot regression on `orderTransform.js` | HIGH | LOW | Backward-compatible signature extension; per-caller plumbing checklist in plan §7.3 |
| CR-008 Sub-CR #1 collateral damage | HIGH | NONE | CR-013 file list does not intersect Sub-CR #1 file list; D1-Gate explicitly listed as MUST NOT change |
| Bills shift unexpectedly on cut-over day | LOW (owner-accepted) | HIGH (by design) | Owner directive: *"correct, coz it's bug"* — instant cut-over is the intended outcome |
| Tenant with unconfigured profile keys sees 0 GST on SC/tip/delivery | LOW (owner-accepted) | DEPENDS on backend population | Owner-confirmed safe-by-default; rollback playbook authored alongside D-GST-2 |
| Re-print path divergence from original bill | MEDIUM | LOW | Plan §7.3 explicitly mirrors the rate switch in `buildBillPrintPayload` |
| Print-overflow / display issue | LOW | NONE | No display change; single SGST + CGST line preserved |
| Reports column / aggregation issue | LOW | NONE | No new column; backend continues MC-06 aggregation |
| Backend missing `service_charge_tax` / `deliver_charge_gst` for some tenants | LOW (by design) | UNKNOWN | Force-0 fallback handles gracefully; recommended one-time `console.warn` diagnostic |

---

## 8. Validation plan per bucket (Task 8 of plan, summarised)

### 8.1 Bucket D-GST-1
- [ ] `yarn lint` clean.
- [ ] Preview build boots; no runtime warnings.
- [ ] React DevTools: `RestaurantContext.restaurant` exposes `serviceChargeTaxPct` and `deliveryChargeGstPct` as numbers ≥ 0.
- [ ] Collect Bill total **unchanged** on a representative cart (D-GST-1 is no-op).
- [ ] `placeOrder` payload **unchanged** on a representative cart.
- [ ] `git status` shows only `profileTransform.js` modified (+ optional `*.bak.cr013` if backups committed-out).

### 8.2 Bucket D-GST-2
- [ ] `yarn lint` clean.
- [ ] Preview build boots.
- [ ] QA matrix §12 of plan executed across the 10 profile-key states × 7 order-type scenarios.
- [ ] D1-Gate `readOnly` verified unchanged (prepaid scan-delivery order opens; delivery field locked).
- [ ] Print bill mirrors Collect Bill grand total to the rupee.
- [ ] Re-print path mirrors original bill.
- [ ] Audit Report row echoes FE-supplied `tax_amount` / `service_tax` / `delivery_charge`.
- [ ] No new payload keys in any of `placeOrder`/`updateOrder`/`BILL_PAYMENT`.
- [ ] No CRM endpoint hit during profile load.

---

## 9. Approval gates (Task 5)

| Gate | Subject | Required before |
|---|---|---|
| **G1** | Approve Bucket D-GST-1 (parse) | Implementer touches `profileTransform.js` |
| **G2** | Approve Bucket D-GST-2 (apply) | Implementer touches `CollectPaymentPanel.jsx` or `orderTransform.js` |
| **G3** | Approve any **extra file** not in plan §7 (raised by implementer if discovered mid-implementation) | Implementer touches that extra file |
| **G4** | Approve any **payload behaviour change** (e.g. new key, renamed key) — currently NOT planned | Implementer alters any payload key |
| **G5** | Approve **tracker / doc update** after implementation (`PENDING_TASK_REGISTER`, `BASELINE_RECONCILIATION_REPORT`, `CR_013_GST_CONFIG_CORRECTION` status row, optional Module 4 changelog informational entry) | Tracker update after D-GST-2 ships |

> **G3 + G4 are pre-emptive:** they are not active today (plan §7 covers the full file list and no payload change is planned), but exist so any deviation discovered during implementation halts and re-approves.

---

## 10. Recommendation (Task 6)

> **Option A — Sequential rollout: D-GST-1 first → validate → owner review → then D-GST-2.**

**Rationale:**
1. D-GST-1 is provably no-op (no consumer) → zero behavioural risk; ideal as a confidence-building first ship.
2. D-GST-2 is hotspot + revenue-critical; owner gets a separate review checkpoint before bills shift.
3. If D-GST-2 needs rollback, D-GST-1 can stay in place (additive, harmless).
4. Two approval gates (G1, G2) align cleanly with the plan's bucket split.
5. There is no technical reason to combine — `calcOrderTotals` extras default to 0, so D-GST-1 alone produces no math change even though its values are now plumbable.

**No reason to recommend Option B** (combined) — combining only reduces owner visibility without any speed gain (each bucket is small).

---

## 11. Owner approval question (Task 7)

> ## **Approve Bucket D-GST-1 implementation?**

**What you're approving (one-line):** Adding 2 safe-parsed fields (`serviceChargeTaxPct`, `deliveryChargeGstPct`) to the `restaurant` object in `profileTransform.js`. **No calculation change. No payload change. No bill behaviour change.** This bucket alone is a no-op preparing the ground for D-GST-2.

### Reply options
- **(a) Approve D-GST-1** → Implementation Agent proceeds with Bucket D-GST-1 only (G1 unlocked). G2 (D-GST-2) remains held for separate review after D-GST-1 lands.
- **(b) Approve D-GST-1 + D-GST-2 together** → Both buckets ship in one cycle (you waive the intermediate review checkpoint).
- **(c) Hold — questions about [X]** → tell me what to address.

> *Bucket D-GST-2 approval (G2) is intentionally NOT requested in this same approval. Per the recommended Option A, D-GST-2 will be re-presented for approval after D-GST-1 ships and validates as a confirmed no-op.*

---

**Stop here. No code, no QA, no `/app/memory/final/` edits, no implementation, no tracker update. Awaiting owner reply.**

— End of CR-013 Code Review & Bucket Approval —
