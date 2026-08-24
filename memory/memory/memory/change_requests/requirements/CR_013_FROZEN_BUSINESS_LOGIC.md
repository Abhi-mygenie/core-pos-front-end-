# CR-013 — Frozen Business Logic

**Type:** Business-logic freeze (NOT implementation)
**Agent:** CR-013 Owner-Decision Capture Agent
**Date frozen:** 2026-05-05
**Owner:** Abhi
**Branch:** `5may`
**Status:** **`business_logic_frozen_ready_for_implementation_planning`**

**Source-of-truth predecessors:**
- `/app/memory/change_requests/CR_013_GST_CONFIG_CORRECTION.md` (original CR-013 source, Owner-stated rule 2026-05-03)
- `/app/memory/change_requests/impact_analysis/CR_013_GST_SERVICE_TIP_DELIVERY_PLANNING.md` (planning + impact analysis 2026-05-05)
- `/app/memory/change_requests/requirements/CR_013_OWNER_DECISION_SHEET.md` (decision capture sheet 2026-05-05)
- `/app/memory/final/*` (7 baseline docs — read for guardrails; NOT edited)

> **Strict scope.** This is a logic-freeze record. No code, no QA, no `/app/memory/final/` edits, no implementation, no CR-008 Sub-CR #1 mutation, no new CR. Implementation planning is the **next agent's** job.

---

## 1. Final frozen rules

| # | Rule | Frozen value |
|---|---|---|
| 1 | **Service charge applies to** | Dine-in + Walk-in + Room service (today's `scApplicable` rule, BUG-013 preserved). NOT takeaway, NOT delivery |
| 2 | **Service charge GST applies** | YES — taxable |
| 3 | **Service charge GST rate source** | `restaurant.service_charge_tax` (profile-API key; parsed FE-side into `restaurant.serviceChargeTaxPct`) |
| 4 | **Delivery charge applies to** | Delivery orders only (today; CR-008 Sub-CR #1 capture UI + payload preserved) |
| 5 | **Delivery charge GST applies** | YES — taxable |
| 6 | **Delivery charge GST rate source** | `restaurant.deliver_charge_gst` (profile-API key; parsed FE-side into `restaurant.deliveryChargeGstPct`) |
| 7 | **Tip applies to** | All order types where `restaurant.features.tip = true` (today). Tip is a Collect-Bill payment-extra; flows via `paymentData.tip`, NOT in plain `placeOrder` payload |
| 8 | **Tip GST applies** | YES — taxable |
| 9 | **Tip GST rate source** | Same as Service Charge → `restaurant.service_charge_tax`. **If SC tax = 0% (or missing), tip GST = 0**. Tip GST stays at the SC rate even on order types where the SC line itself is hidden (takeaway / delivery — Q-G4 confirmed) |
| 10 | **Missing / null tax-config fallback** | **Force GST = 0 for that component.** Applies when the profile key is absent, `null`, blank, or non-numeric. Explicit `"0.00"` is also honoured as 0% (override semantics — config wins) |
| 11 | **Print bill display** | Status quo — single SGST + single CGST line (no per-component tax breakup). Tip / Delivery / SC continue to display as their own line items with corrected GST values folded into the single SGST + CGST totals |
| 12 | **Reports / audit display** | Status quo — `tax_amount` is composite; backend continues to own aggregation per MC-06; `service_tax`, `tip_amount`, `delivery_charge` echoed unchanged. **No new column** |
| 13 | **Backend persistence required** | NO — no new payload key. Existing keys (`service_tax`, `tax_amount`, `gst_tax`, `delivery_charge`, `tip_amount`, `order_amount`, `round_up`, `total_round`) continue unchanged in **shape**; only the **values** shift |
| 14 | **Frontend-only implementation acceptable for Phase 1** | YES — provided BE-G1 + BE-G2 backend confirmation (§9) returns green |
| 15 | **Calculation authority** | Frontend (today). Backend trusts FE-supplied tax fields (matches BUG-019 + CR-008 Sub-CR #1 model). API-A1 frozen as FE-authoritative for Phase 1 |
| 16 | **Cut-over** | **Immediate / on ship day** (Owner-confirmed: "immediately, it's a known bug"). No staggered soak. Rollback playbook required as defence-in-depth |

---

## 2. Applicability matrix

Cells reflect the FROZEN behaviour after CR-013 ships. **A** = applied, **N** = not applied.

| Component | Dine-in | Walk-in | Takeaway | Delivery | Room service | Scan & Order / Web |
|---|---|---|---|---|---|---|
| **Service Charge** | A | A | N | N | A | Follows underlying order type |
| **Tip** | A | A | A | A | A | A (gated by `features.tip`) |
| **Delivery Charge** | N | N | N | A | N | A (delivery channel) |
| **GST on SC** | A | A | n/a | n/a | A | Per underlying type |
| **GST on Tip** | A | A | A | A | A | A |
| **GST on Delivery** | n/a | n/a | n/a | A | n/a | A |

> Tip-GST when SC line is hidden (takeaway / delivery): **applied at SC rate** even though the SC line is ₹0 — Q-G4 confirmed.

---

## 3. Tax-rate source mapping

| Component | Rate source (profile-API key) | FE variable | Fallback rule |
|---|---|---|---|
| **Item GST** | per-product `tax.percentage` (today) | `item.tax.percentage` | Unchanged — out of CR-013 scope |
| **Service Charge GST** | `service_charge_tax` | `restaurant.serviceChargeTaxPct` | If missing/null/blank/NaN → **0%**; if explicit `"0.00"` → 0% |
| **Tip GST** | `service_charge_tax` (rides SC rate) | `restaurant.serviceChargeTaxPct` | Same as SC GST. If SC rate = 0% then tip GST = 0 |
| **Delivery Charge GST** | `deliver_charge_gst` | `restaurant.deliveryChargeGstPct` | If missing/null/blank/NaN → **0%**; if explicit `"0.00"` → 0% |

### New math (definitive)
```
SC_RATE  = parseFloat(restaurant.serviceChargeTaxPct)
DEL_RATE = parseFloat(restaurant.deliveryChargeGstPct)

if (!isFinite(SC_RATE))  SC_RATE  = 0
if (!isFinite(DEL_RATE)) DEL_RATE = 0

scGst       = serviceCharge  × (SC_RATE  / 100)
tipGst      = tip            × (SC_RATE  / 100)   // tip rides SC
deliveryGst = deliveryCharge × (DEL_RATE / 100)
```

`avgGstRate` is **no longer used** for SC, Tip, or Delivery GST. It remains in code only for item-level proration where applicable (untouched by CR-013).

---

## 4. Missing / null config fallback rules

| Profile-key state | `service_charge_tax` behaviour | `deliver_charge_gst` behaviour |
|---|---|---|
| Key present, numeric > 0 | Use as-is | Use as-is |
| Key present, exactly `"0.00"` / 0 | Force **0** (override) | Force **0** (override) |
| Key missing | Force **0** | Force **0** |
| Key `null` | Force **0** | Force **0** |
| Key blank `""` | Force **0** | Force **0** |
| Key non-numeric (`"abc"`) | Force **0** | Force **0** |

**Owner-confirmed semantics:** "On any tenant where the backend has not yet populated `service_charge_tax` and/or `deliver_charge_gst` in the profile API, that tenant's SC GST + Tip GST + Delivery GST will instantly drop to ₹0 on every bill the moment the build deploys — that's correct because it's the bug."

Translation: charging GST on top of unconfigured rates is the bug being fixed; charging zero until a rate is explicitly configured is the safe, compliant default.

---

## 5. Order-type rules

| Order type | SC | Tip | Delivery | SC GST source | Tip GST source | Delivery GST source |
|---|---|---|---|---|---|---|
| `dineIn` | YES (if `service_charge_percentage > 0` & enabled) | YES (if `features.tip`) | NO | `service_charge_tax` | `service_charge_tax` | n/a |
| `walkIn` | YES | YES | NO | `service_charge_tax` | `service_charge_tax` | n/a |
| `takeAway` | NO (BUG-013) | YES | NO | n/a | `service_charge_tax` (even though SC line is hidden) | n/a |
| `delivery` | NO (BUG-013) | YES | YES (CR-008 Sub-CR #1) | n/a | `service_charge_tax` (even though SC line is hidden) | `deliver_charge_gst` |
| Room service (`isRoom`) | YES (treated as dineIn) | YES | NO | `service_charge_tax` | `service_charge_tax` | n/a |
| Scan & Order / Web | Per underlying order type | YES | Per underlying order type | Per type | `service_charge_tax` | Per type |

Room billing/print **lifecycle** remains OQ-12-deferred — CR-013 does NOT change room billing/print shape; it only changes the GST values folded into the existing room totals.

---

## 6. Prepaid / postpaid rules

| Path | Component | Behaviour |
|---|---|---|
| **Prepaid** (`placeOrderWithPayment`, scan-orders) | All 3 GSTs | Same rate-source switch flows through `calcOrderTotals(extras={discountAmount, tipAmount, deliveryCharge})`; payload values shift but shape unchanged |
| **Prepaid** | Delivery-charge editability | **Locked** (D1-Gate `readOnly={isPrepaid}` preserved) |
| **Postpaid** (place → optional update → Collect Bill) | All 3 GSTs | Same rate-source switch in CollectPaymentPanel + `calcOrderTotals` |
| **Postpaid** | Delivery-charge editability | Editable (D1-Gate behaviour preserved) |
| **Both** | Tip | Tip flows via `paymentData.tip` (Collect Bill / `placeOrderWithPayment` extras) — unchanged shape; only tip-GST value shifts |
| **Both** | Refunds / partial pays | Out of CR-013 scope — uses whatever was persisted at original-bill time |

CR-008 Sub-CR #1 D1-Cap (capture UI), D1-Cap Round-2 (delivery-into-totals fold), D1-Gate (override gate) — **all preserved verbatim**. CR-013 only swaps the GST rate source on top.

---

## 7. Print / bill / report display rules

| Surface | Display rule |
|---|---|
| **Collect Bill** (CollectPaymentPanel) | Single SGST line + single CGST line (composite of item GST post-discount + SC GST + tip GST + delivery GST). SC line, Tip line, Delivery line continue to display **gross** (pre-GST) values as they do today. Grand Total reflects new math |
| **Print Bill** (`buildBillPrintPayload`) | Same composite SGST/CGST presentation. `printGstTax` mirrors Collect Bill total. Re-print path uses `overrides`-driven recompute that mirrors `calcOrderTotals` rule switches |
| **KOT** | Unchanged — KOT carries no financial fields |
| **Audit Report / All Orders Report** | Unchanged — backend echoes `tax_amount` / `service_tax` / `tip_amount` / `delivery_charge`. Reports remain presentation-only per MC-06 |
| **Order summary tile / Dashboard** | Unchanged — reads `order_amount` echoed by backend (now reflecting corrected GST) |
| **CSV / PDF export** | Unchanged column shape — values reflect corrected GST automatically |

**No per-component tax breakup line on print or reports.** This was OD-D1 / OD-D2 / OD-D3 — all frozen at NO.

---

## 8. Payload / storage expectations

### 8.1 Payload keys — UNCHANGED in shape
| Key | Endpoint(s) | Source | Value change vs today |
|---|---|---|---|
| `service_tax` | `placeOrder`, `updateOrder`, `BILL_PAYMENT` | FE-computed SC ₹ | Unchanged (this is the SC amount, not its GST) |
| `tax_amount` / `gst_tax` | `placeOrder`, `updateOrder`, `BILL_PAYMENT` | FE-computed total GST (item post-discount + SC GST + tip GST + delivery GST) | **Value shifts** because rate sources change |
| `delivery_charge` | `placeOrder`, `updateOrder`, `BILL_PAYMENT` | FE-captured (CR-008 Sub-CR #1) | Unchanged value |
| `tip_amount` | `BILL_PAYMENT`, `placeOrderWithPayment` | FE-captured | Unchanged value |
| `order_amount` | `placeOrder`, `updateOrder`, `BILL_PAYMENT` | FE composite | **Value shifts** (composite reflects new GST) |
| `round_up` / `total_round` | `placeOrder`, `updateOrder` | FE BUG-009 fractional rounding rule | **Value shifts** as a knock-on |

### 8.2 No new payload keys
- No `service_charge_gst`, no `tip_gst`, no `delivery_charge_gst` — frozen at NO (OD-D3).

### 8.3 No new storage requirements
- Backend continues to persist whatever it persists today; CR-013 changes no DB column.

---

## 9. Backend contract needs

### 9.1 No new contract — only confirmations
| ID | Confirmation | Owner | Blocker for ship? |
|---|---|---|---|
| **BE-G1** | Confirm `service_charge_tax` is exposed on the POS profile-API response (it is, per CR-013 §2 verification) and document the per-tenant population state | Backend | NO — Q-G6 fallback (force 0) handles unconfigured tenants safely |
| **BE-G2** | Same for `deliver_charge_gst` | Backend | NO — same |
| **BE-G3** | Confirm backend trusts client-supplied `tax_amount` / `service_tax` / `delivery_charge` (no recompute) | Backend | NO — confirmation only; aligns with BUG-019 + CR-008 Sub-CR #1 prior decisions |
| **BE-G4** | Confirm there is no third profile key (e.g. `tip_charge_tax`) we missed | Backend | NO — confirmation only |

### 9.2 Profile-API source
- Endpoint: the existing **POS profile** endpoint consumed via `auth_token` bearer (main POS backend, e.g. `https://preprod.mygenie.online/`).
- **NOT** the CRM endpoint (`crm.mygenie.online` / `REACT_APP_CRM_API_KEYS`) — CRM is unrelated to CR-013 business logic.

### 9.3 Per-tenant manifest
- Unblocking CR-013 does **not** require a manifest. Q-G6 (force 0 on missing) is safe-by-default.
- Backend may produce a manifest of which tenants currently have the keys populated as an **operational nice-to-have** for ops to track which tenants will see a tax-revenue change on cut-over day.

---

## 10. Items explicitly out of scope

| Item | Reason |
|---|---|
| Per-product `tax.percentage` (item GST) | Already correct |
| CR-008 Sub-CR #1 D1-Cap delivery-charge **capture** UI + payload | Accepted; preserved verbatim |
| CR-008 Sub-CR #1 D1-Gate `readOnly={isPrepaid}` | Accepted; preserved verbatim |
| BUG-009 fractional rounding rule | Out of scope |
| BUG-019 prepaid delivery-charge round-trip | Already correct; out of scope |
| Room billing / room print **lifecycle** semantics | OQ-12 deferred; CR-013 does NOT change room flow shape |
| Reports backend aggregation ownership (MC-06) | Backend retains aggregation; FE stays presentation |
| Per-component persisted tax columns (`service_charge_gst` / `tip_gst` / `delivery_charge_gst`) | OD-D3 frozen NO |
| Per-component tax line on print | OD-D1 frozen NO |
| Per-component column on reports | OD-D2 frozen NO |
| Per-order-type rate config (e.g. different SC tax for room vs dine-in) | OD-C2 frozen NO |
| Backend-as-calculation-authority | OD-A1 frozen NO for Phase 1 |
| Legacy-order recompute | Q-G5 frozen — new orders only after cut-over |
| Auto-print bill block at `OrderEntry.jsx` ~L1440-1494 | Untouched |
| `placeOrderWithPayment` shape | Already accepts `tipAmount` + `deliveryCharge` extras correctly; only rate switch flows through |
| `paymentService.collectPayment` (deprecated path) | Already deleted in 2026-05-04 hygiene cycle (Batch 3B); irrelevant |
| Provider ordering / route map / socket contract / localStorage contract | Untouched |
| CRM (`crmAxios.js`, `REACT_APP_CRM_API_KEYS`) | Unrelated to CR-013 — flagged and removed from scope |

---

## 11. Owner decisions register

**Decision date:** 2026-05-05
**Owner:** Abhi
**Captured by:** CR-013 Owner-Decision Capture Agent

| Decision ID | Question (short) | Owner answer | Source |
|---|---|---|---|
| OD-G1 | GST on Service Charge | **Taxable**, rate from `service_charge_tax` | Confirmed via Q5 + Q1 elaboration approval |
| OD-G2 | GST on Tip | **Taxable**, rate = SC rate (`service_charge_tax`); if SC rate = 0 then tip GST = 0 | Q3 verbatim |
| OD-G3 | GST on Delivery | **Taxable**, rate from `deliver_charge_gst` | Confirmed via Q5 + Q1 |
| OD-O1 | SC applicability | **Dine-in + Walk-in + Room service** (today's rule, BUG-013) | Q4 |
| OD-O2 | Tip applicability | All order types where `features.tip = true` | Default accepted (no override) |
| OD-O3 | Delivery applicability | Delivery only (today) | Default accepted |
| OD-C1 | Restaurant-configurable rates | YES (today's profile model) | Default accepted |
| OD-C2 | Order-type-configurable rates | NO | Default accepted |
| OD-A1 | Calculation authority | FE-authoritative (today) | Default accepted |
| OD-D1 | Bill / print component-wise tax breakup | NO | Default accepted |
| OD-D2 | Reports component-wise display | NO | Default accepted |
| OD-D3 | Payload component-wise persisted breakup | NO | Default accepted |
| OD-Q1 | Fallback when profile key is missing/null | **Force GST = 0** *(deviation from agent's recommended default)* | Q6 verbatim |
| OD-Q2 | `service_charge_tax = "0.00"` | Override (force 0) | Q6 confirmed |
| OD-Q3 | `deliver_charge_gst = "0.00"` | Override (force 0) | Q6 confirmed |
| OD-Q4 | Tip-GST when SC line is hidden | Tip GST stays at SC rate even when SC line ₹0 | Q3 + Q1 elaboration |
| OD-Q5 | Legacy-order recompute | New orders only | Default accepted |
| OD-CO | Cut-over date | **Immediate / on ship day** ("it's a known bug") | Q2 verbatim |

### Owner clarifications during capture
1. **Q6 + Q2 risk acknowledgement (2026-05-05):** Owner explicitly confirmed *"correct, coz it's bug"* — instant ₹0 GST drop on tenants with unconfigured profile keys is the desired, compliant outcome.
2. **CRM scope correction (2026-05-05):** Owner correctly pointed out CRM is unrelated to CR-013; profile-API for `service_charge_tax` / `deliver_charge_gst` is on the main POS backend, not the CRM. Captured here so future agents do not re-conflate.

---

## 12. Implementation readiness verdict

> **`business_logic_frozen_ready_for_implementation_planning`**

### 12.1 What's unblocked
- Implementation Planning Agent may now open the file-level edit plan.
- Approval Gate per `IMPLEMENTATION_AGENT_RULES.md` is the next required artifact.
- Bucket split (per planning doc §11 Phase 3): **D-GST-1 (parse)** + **D-GST-2 (apply)**.

### 12.2 Pre-ship checklist for the implementation planner / shipper
- [ ] BE-G1, BE-G2, BE-G3, BE-G4 backend confirmations requested + received (non-blocking; nice-to-have for ops manifest).
- [ ] Backups retained per CR-008 Sub-CR #1 rollback-playbook convention (mandatory for hotspot edits to `OrderEntry.jsx` / `CollectPaymentPanel.jsx` / `orderTransform.js`).
- [ ] Rollback playbook document produced (cite BE-G1/G2 manifest if available, mitigation steps if a tenant reports unexpected GST collapse post-ship).
- [ ] One-time diagnostic console.warn on first CollectPaymentPanel render if either profile key is missing (so cashier-facing terminals leave evidence in console logs — matches existing `[CR-001 DIAG]` pattern).
- [ ] QA matrix per planning doc §10 + Decision Sheet Q14 must include 0% / 5% / 18% rate variants per profile key, plus the 4 missing/null/blank/non-numeric fallback rows.
- [ ] Static + lint + webpack + boot-smoke pass (Phase 4 of planning doc §11).

### 12.3 What's locked-out
- No CR-008 Sub-CR #1 mutation.
- No `/app/memory/final/*` edit (frozen ruleset operates within existing API-02 / API-03 / MC-06 / OQ-12 envelope).
- No new payload keys.
- No new BE columns / endpoints.

### 12.4 Baseline-impact verdict
- **Baseline-safe.** Frozen rules sit inside Module 4 (Order Entry / Cart / Payment) + Module 14 (Print / Bill) — both already named hotspots. No module-boundary change. No `baseline_conflict_owner_decision_required`. No `baseline_update_required_owner_approval` for Phase 1 (an optional Module 4 changelog entry post-ship is informational only).

### 12.5 Cut-over plan
- Ship day = cut-over day (Owner directive).
- Any tenant whose profile-API does not yet populate `service_charge_tax` / `deliver_charge_gst` will instantly drop those component GSTs to 0 — by design.
- Backend ops may pre-populate keys ahead of ship for tenants that should retain non-zero rates; this is an operations decision, not a CR-013 blocker.

---

## 13. Final recommendation

> **`business_logic_frozen_ready_for_implementation_planning`**

The next agent (Implementation Planning Agent / CR-013 Bucket-Open Agent) may proceed with:
1. File-level edit plan for `profileTransform.js`, `CollectPaymentPanel.jsx`, `orderTransform.js`.
2. Approval Gate per IMPLEMENTATION_AGENT_RULES.
3. Bucket D-GST-1 (parse) shipping path.
4. Bucket D-GST-2 (apply) shipping path with full hotspot regression checklist.
5. QA matrix and rollback playbook.

CR-013 source doc (`CR_013_GST_CONFIG_CORRECTION.md`) status row should move from `Open · Backlog` to `Frozen · Ready for implementation planning` in the next tracker-update cycle.

---

**Stop here. No code changes. No QA. No `/app/memory/final/` edits. CR-008 Sub-CR #1 untouched. Implementation planning is the next agent's task.**

— End of CR-013 Frozen Business Logic —
