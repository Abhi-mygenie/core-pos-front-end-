# CR-013 — GST / Service Charge / Tip / Delivery Planning + Impact Analysis

**Type:** Discussion + planning + impact-analysis (NOT implementation)
**Agent:** CR-013 GST / SC / Tip / Delivery Planning Agent
**Date:** 2026-05-04 → 2026-05-05
**Branch:** `5may`
**Predecessor of record (existing CR-013 stub):** `/app/memory/change_requests/CR_013_GST_CONFIG_CORRECTION.md` (Status: Open · Backlog · `parked_owner_decision`)

> **Strict scope reminder.** This document is planning-only. No source code, no QA, no `/app/memory/final/` edits. CR-008 Sub-CR #1 delivery-charge behaviour is preserved as-is. All recommendations carry the appropriate `baseline_conflict_owner_decision_required`, `baseline_update_required_owner_approval`, `needs_backend_contract_definition`, or `owner_decision_required` markers.

---

## 1. Executive summary

### 1.1 Today's behaviour in one sentence
- GST on **Service Charge**, **Tip**, and **Delivery Charge** is computed using the **average item GST rate** (`avgGstRate = (sgst+cgst)/itemTotal`) in two places — `CollectPaymentPanel.jsx:360-369` (cashier-visible Collect Bill) and `orderTransform.calcOrderTotals` L571-583 (placeOrder / updateOrder payloads). The dedicated profile keys `service_charge_tax` and `deliver_charge_gst` exist on the backend but are NOT parsed by `profileTransform.js` and therefore have zero consumers in the frontend.

### 1.2 What CR-013 must define
1. The **GST rate** to apply on SC, Tip, Delivery (rate source per component).
2. The **applicability** of SC / Tip / Delivery by order type (dine-in, takeaway, delivery, room service, prepaid, postpaid, scan&order/web).
3. The **display + payload + print + report** treatment of these components and their GSTs.
4. The **configuration model**: global, restaurant-configurable, order-type configurable, or bill-time editable.
5. The **calculation authority**: frontend-only, backend-only, or backend-authoritative-with-frontend-preview.

### 1.3 Verdict on baseline safety (Task 1 gate, expanded in §2)
- **Baseline-safe** (no conflict with `/app/memory/final/`): Items 1, 2, 3 — these align with rule API-02 (preserve transform-mediated payload shaping) and API-03 (CollectPaymentPanel owns settlement). Implementation lives inside Module 4 (Order Entry / Cart / Payment) and Module 14 (Print / Bill) — both already named hotspots; no module-boundary change.
- **Backend-dependent for non-trivial paths**: rate sourcing (Q-G1), Tip = SC = whatever-rate scope (Q-G4), legacy-order recompute (Q-G5), order-type-wise persisted breakup (Owner question §8 row 11) — `needs_backend_contract_definition`.
- **Owner-decision-dependent**: every cell in §5 options table — `owner_decision_required`.
- **Possible baseline-update required (informational)**: Module 4 changelog could record CR-013 outcome once shipped (`baseline_update_required_owner_approval` — minor; deferred to post-implementation per IMPLEMENTATION_AGENT_RULES §"Documentation update rule").

### 1.4 Recommended verdict
- **Status:** `owner_decision_required first` → then `needs_backend_contract_definition` (in parallel) → then **frontend-only implementation possible** for the most likely option set (Option B-1 / per-restaurant config consumed FE-side, no payload-key change).
- See §15 for the precise final recommendation.

---

## 2. Baseline confirmation (Task 1)

### 2.1 `/app/memory/final/` docs inspected (in full)
| # | File | Role for CR-013 |
|---|---|---|
| 1 | `ARCHITECTURE_DECISIONS_FINAL.md` | Rules **FA-03** (do not expand hotspot files casually — `OrderEntry`, `CollectPaymentPanel`, `orderTransform` are named hotspots), **API-02** (preserve transform-mediated payload shaping for order/financial flows), **API-03** (OrderEntry → composition; CollectPaymentPanel → settlement), **SM-03** (no new localStorage governance assumed), §"Refactor guardrails" line *"Do not silently change tax, service charge, round-off, room billing, or print semantics."* |
| 2 | `MODULE_DECISIONS_FINAL.md` | Module 4 change rule *"Every change must identify whether it affects place-order, update-order, collect-bill, prepaid flow, split, room, or print"*; Module 5 (Rooms) cross-cutting; Module 10 reports presentation; Module 14 print parity rules; OQ-12 deferral note for room billing/print lifecycle |
| 3 | `OPEN_QUESTIONS_FINAL_RESOLUTION.md` | OQ-05 (OrderEntry composition, CollectPaymentPanel settlement) — directly relevant; OQ-07 (backend owns reporting aggregation) — relevant for report column impact; OQ-12 (room billing/print lifecycle DEFERRED) — relevant for room service tax breakup |
| 4 | `IMPLEMENTATION_AGENT_RULES.md` | Mandatory pre-coding workflow; high-risk-area extra caution list explicitly names `OrderEntry.jsx`, `CollectPaymentPanel.jsx`, `orderTransform.js` |
| 5 | `CHANGE_REQUEST_PLAYBOOK.md` | Required step 5 (related APIs), step 8 (regression risk — high if changes service charge / tax / round-off) |
| 6 | `FINAL_DOCS_APPROVAL_STATUS.md` | Reading-order + OD-01 (OQ-07 still verification-sensitive); OD-02 (OQ-12 deferred — room billing/print lifecycle) |
| 7 | `FINAL_DOCS_SUMMARY.md` | High-risk-areas list confirms `OrderEntry.jsx`, `CollectPaymentPanel.jsx`, `orderTransform.js` |

### 2.2 Acceptance / reconciliation docs inspected
| # | File | Role for CR-013 |
|---|---|---|
| 1 | `BASELINE_RECONCILIATION_REPORT_2026_05_04.md` | §11.2 lists CR-013 as `parked_owner_decision`; §6 surface table classifies "Delivery charge capture + totals + GST + payload" as **BU** under CR-008 Sub-CR #1 — no baseline drift introduced; CR-013 GST sourcing remains a separate ticket. |
| 2 | `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` | §3.3 row 25 / §6.2 row "CR-013" — `parked_owner_decision`, "Source doc only"; §6.3 explicit non-baseline statement |
| 3 | `PENDING_TASK_REGISTER_2026_05_04.md` | Row CR-013 — `parked_owner_decision`, priority LOW, "Not safe to start without owner prioritisation"; suggested next agent: New CR Planning Agent |
| 4 | `HYGIENE_AND_TEST_CLEANUP_FINAL_CLOSURE_2026_05_04.md` | §9.2 row CR-013 — confirmed remains parked post-hygiene cycle |
| 5 | `qa_reports/QA_REPORT_INDEX.md` | Final-recommendation block confirms CR-013 stays parked |
| 6 | `qa_reports/CR_008_SUB_1_QA_REPORT.md` | §10 row 5 "GST on SC/Delivery uses `avgGstRate` rather than profile keys — tracked under CR-013, NOT a Sub-CR #1 defect." Confirms scope split. |
| 7 | `qa_reports/RUNTIME_QA_ADDENDUM_A0A_A0B_FO_B1_01_2026_05_04.md` | Unrelated to CR-013; read for completeness only. |

### 2.3 Other CR / handover / source docs read for CR-013 context
- `CR_008_DELIVERY_AUDIT_DISPATCH_AND_NAVIGATION.md` — Sub-CR #1 parent; defines current delivery-charge contract.
- `implementation_handover/CR_BUCKET_D1_CAP_DELIVERY_CHARGE_CAPTURE_HANDOVER.md` — Sub-CR #1 D1-Cap.
- `implementation_handover/CR_BUCKET_D1_CAP_ROUND2_QA_NOTE.md` — Round-2 totals fold (the change that introduced delivery-into-`tax_amount`/`order_amount` via `avgGstRate`, which CR-013 supersedes for SC/tip/delivery rate sourcing).
- `implementation_handover/CR_BUCKET_D1_GATE_OVERRIDE_RULE_HANDOVER.md` — Override rule (`isPrepaid`-driven). Out of scope to change in CR-013.
- `implementation_handover/CR_008_SUB_1_ROLLBACK_PLAYBOOK.md` — backups + rollback steps.
- `CR_013_GST_CONFIG_CORRECTION.md` — the existing CR-013 source doc (Owner-confirmed rules + 5 open Q-G questions).

### 2.4 Baseline rules summary relevant to CR-013
| Rule | Constraint on CR-013 |
|---|---|
| **FA-03** (hotspot caution) | Touching `OrderEntry.jsx` / `CollectPaymentPanel.jsx` / `orderTransform.js` is allowed but requires explicit owner override + per-bucket impact analysis |
| **API-02** (transform-mediated payload) | New rate sources MUST flow via `orderTransform.calcOrderTotals` extras pattern — no direct payload mutation outside the transform |
| **API-03** (workflow split) | OrderEntry → composition; CollectPaymentPanel → settlement. CR-013 will mostly land in CollectPaymentPanel (tax math display) + orderTransform (payload math) |
| **MC-06** (backend owns reports) | Any new report column or per-component tax breakup is **backend's job**; frontend remains presentation/representation |
| **OQ-12** (room billing/print lifecycle deferred) | Room service rules MUST be revisited explicitly; do not silently re-tax SC/tip/delivery on room |
| **Refactor guardrail** | *"Do not silently change tax, service charge, round-off, room billing, or print semantics."* — CR-013 is exactly this; therefore explicit ownership + cut-over date are required |

### 2.5 Calculation / source-of-truth rules for CR-013
- **Today** (`avgGstRate`-based) — frontend computes, payload echoes; backend trusts frontend (verified by BUG-019 + Sub-CR #1 round-trip).
- **Owner intent (CR-013 §3)** — SC = `restaurant.service_charge_tax`; Delivery = `restaurant.deliver_charge_gst`; Tip = same rate as SC. Items continue to use per-product `tax.percentage` (no change).
- **Outstanding ambiguity** (Q-G1..Q-G5 in CR-013 source) — fallback rule when keys are missing; explicit `0.00` semantics; tip-GST when SC is hidden; legacy-order recompute.

### 2.6 API / backend ownership rules for CR-013
- Profile keys `service_charge_tax`, `deliver_charge_gst` already exist server-side per CR-013 §2 (verified absent only in `profileTransform.js`, not in backend response — this is a frontend gap, not a backend ask).
- **No new POST/PUT key needed** if FE continues to send today's `service_tax` / `tax_amount` / `gst_tax` / `delivery_charge` shape; only the *value* changes.
- **`needs_backend_contract_definition`** if Owner wants:
  - per-component persisted GST breakdown (e.g. `service_charge_gst`, `tip_gst`, `delivery_charge_gst`),
  - server-side recompute / authority (replaces `avgGstRate` math at backend layer),
  - new reports column distinguishing component GST from item GST.

### 2.7 Implementation rules constraining CR-013
- IMPLEMENTATION_AGENT_RULES §"Approval Gate format" + §"File-Level Change Plan format" required before coding.
- §"Additional guardrails for high-risk areas" explicitly lists all three target files.
- Per CR-008 Sub-CR #1 §10 known-deferral row 5: rounding divergence ≤ ₹0.50 between OrderEntry button + CollectPaymentPanel total — Owner chose Option 2A; CR-013 must not silently change rounding.

### 2.8 Baseline-safe / backend-dependent / owner-dependent classification
| Aspect | Verdict |
|---|---|
| Module boundary | **Baseline-safe** — Module 4 + Module 14 own this |
| Workflow split (API-03) | **Baseline-safe** — math change lives inside CollectPaymentPanel + orderTransform; no boundary shift |
| Transform contract (API-02) | **Baseline-safe** if FE keeps current payload keys; **`needs_backend_contract_definition`** if new keys introduced |
| Reports ownership (MC-06) | **`needs_backend_contract_definition`** if Owner wants distinct component-GST columns; **baseline-safe** if reports continue to read existing `tax_amount` / `service_tax` |
| Room billing / print (OQ-12) | **`baseline_conflict_owner_decision_required`** if room SC/tip/delivery GST behaviour differs from non-room → forces OQ-12 to leave its deferral |
| Rate sourcing | **`owner_decision_required`** (Q-G1..Q-G5) |
| Implementation rules | **Baseline-safe** with explicit Approval Gate + per-file plan + regression checklist |

---

## 3. Current behaviour discovery (Task 2)

Code references are 1-indexed and live (no patch implied).

### 3.1 Delivery-charge capture
- `OrderEntry.jsx:165` — `useState(orderData?.deliveryCharge || 0)`.
- 4 re-seed sites (`OrderEntry.jsx:314 / 350 / 428 / 2031`) — savedCart, re-engage, socket-context, split-bill.
- `AddressFormModal.jsx:90-91` — local `chargeInput` state; field at `:390-398`.
- `CartPanel.jsx:712-746` — inline-editable row gated by `orderType === 'delivery'`.
- `CollectPaymentPanel.jsx:149` — `deliveryChargeInput`, seeded from `initialDeliveryCharge`.
- Override gate: `CollectPaymentPanel.jsx:877` — `readOnly={isPrepaid}` (D1-Gate).

### 3.2 Delivery-charge total calculation
- `orderTransform.js:545` — `calcOrderTotals(cart, sc%, { discountAmount, tipAmount, deliveryCharge })`.
- Folded into `tax_amount`, `order_amount`, `round_up` at L571-583 (post-D1-Cap Round-2).
- `CollectPaymentPanel.jsx:341` reads gated input → `:377` `rawFinalTotal = subtotal + sgst + cgst + deliveryCharge`.

### 3.3 GST on delivery (TODAY — incorrect per Owner)
- `orderTransform.js:577` — `+ (deliveryCharge * avgGstRate)` (in `gstTax` composite).
- `CollectPaymentPanel.jsx:367` — `deliveryGst = deliveryCharge * avgGstRate`.
- **Profile key `deliver_charge_gst` not consumed anywhere** (verified absent in `profileTransform.js`).

### 3.4 Service-charge calculation
- Rate source: `restaurant.serviceChargePercentage` (parsed at `profileTransform.js:99` from `service_charge_percentage`).
- Auto-flag: `restaurant.autoServiceCharge` (`profileTransform.js:100`); checkbox is auto-on when true (BUG-028 rework).
- Computation: `CollectPaymentPanel.jsx:351-352` — `Math.round(subtotalAfterDiscount * sc% / 100 * 100) / 100`.
- Mirrored: `orderTransform.js:566-568` — same formula on transform-side `postDiscount`.
- Applicability gate: `CollectPaymentPanel.jsx:350` — `scApplicable = orderType === 'dineIn' || orderType === 'walkIn' || isRoom` (BUG-013).

### 3.5 GST on service charge (TODAY — incorrect per Owner)
- `orderTransform.js:575` — `+ (serviceCharge * avgGstRate)`.
- `CollectPaymentPanel.jsx:365` — `scGst = serviceCharge * avgGstRate`.
- **Profile key `service_charge_tax` not consumed anywhere**.

### 3.6 Tip handling
- Profile flag: `profileTransform.js:94` — `tip: toBoolean(api.tip)`.
- Gate: `CollectPaymentPanel.jsx:236` — `tipEnabled = !!restaurant?.features?.tip`.
- Input: `CollectPaymentPanel.jsx:237 / 836-846` — flat ₹.
- Captured value: `CollectPaymentPanel.jsx:344` — `tip = tipEnabled ? parseFloat(tipInput) : 0`.
- Persisted into `paymentData.tip` (sent on Collect Bill payment to backend via existing `BILL_PAYMENT` shape).
- **No order-type gate on tip** (unlike SC); restaurant-flag-only.

### 3.7 GST on tip (TODAY — incorrect per Owner)
- `orderTransform.js:576` — `+ (tipAmount * avgGstRate)`.
- `CollectPaymentPanel.jsx:366` — `tipGst = tip * avgGstRate`.

### 3.8 Dine-in vs takeaway vs delivery differences (today)
| Order type | SC shown? | Tip shown? | Delivery row shown? |
|---|---|---|---|
| `dineIn` | ✅ (if SC% > 0) | ✅ (if `features.tip`) | ❌ |
| `walkIn` | ✅ | ✅ | ❌ |
| `takeAway` | ❌ (BUG-013) | ✅ | ❌ |
| `delivery` | ❌ (BUG-013) | ✅ | ✅ |
| Room (`isRoom`) | ✅ (treated as dineIn) | ✅ | ❌ |

### 3.9 Room service differences
- Room is treated as dineIn for SC purposes (`isRoom` joins `scApplicable`).
- Room billing/print lifecycle is **OQ-12-deferred**; CR-013 must not silently change room SC/tip/delivery semantics.
- Room balance flows separately via `roomInfo.balancePayment` (BUG-019 / CR-004) and is not subject to per-order SC/tip/delivery GST in this model.

### 3.10 Prepaid vs postpaid differences
- Prepaid path: `orderTransform.placeOrderWithPayment()` (L847-880) — already accepts `tipAmount` + `deliveryCharge` in extras; calls `calcOrderTotals` with extras (L853-856) → same `avgGstRate` math as today.
- Postpaid path: `placeOrder` → optional `update` → `BILL_PAYMENT`. Same math.
- Override gate: D1-Gate makes delivery-charge field on Collect Bill `readOnly` only when prepaid (`OrderEntry.jsx:651-652`).

### 3.11 Scan & Order / web order differences
- Scan/web orders enter via separate channel; in POS they appear via socket / `running-orders` and use `paymentType === 'prepaid'` (anti-tamper lock — D1-Gate).
- No order-type-specific SC/tip/delivery rate today; whatever profile config is in effect applies.

### 3.12 Collect Bill calculation path
- `CollectPaymentPanel.jsx:341 / 344 / 351-377` — single calculation block.
- Output sent via `paymentData` to `BILL_PAYMENT` endpoint via `paymentMutationService.collectBillExisting()`.

### 3.13 Place Order / Update Order payload
- `orderTransform.placeOrder()` L693-740, `updateOrder()` L778-820.
- Keys sent: `service_tax` (SC ₹), `tax_amount` (item GST + SC GST + tip GST + delivery GST), `gst_tax` (alias), `delivery_charge`, `tip_amount` (in prepaid/Collect Bill paths only — NOT in plain `placeOrder`).
- `order_amount`, `total_round`, `round_up` computed from those.

### 3.14 Print Bill / receipt payload
- `orderTransform.buildBillPrintPayload()` L1161-1487.
- Mirrors the same `avgGstRate * (SC + tip + delivery)` rule (L1313-1320), reuses `printGstTax` derived from CollectPaymentPanel (L516).
- Single source of truth for print: CollectPaymentPanel passes `printGstTax` and component values; print payload also has fallback recompute when re-print path runs without CollectPaymentPanel context.

### 3.15 Report / audit totals
- `tax_amount` / `service_tax` / `delivery_charge` echoed by backend on `/order-logs-report` etc.
- Frontend reports are **presentation-layer** (MC-06).
- No FE column today distinguishes component-GST from item-GST.

### 3.16 Restaurant-level config fields used today (tax / SC)
| Profile key | Frontend variable | Used? |
|---|---|---|
| `service_charge` | `restaurant.features.serviceCharge` | ✅ (gates SC visibility) |
| `service_charge_percentage` | `restaurant.serviceChargePercentage` | ✅ (SC rate) |
| `auto_service_charge` | `restaurant.autoServiceCharge` | ✅ (auto-toggle) |
| `tip` | `restaurant.features.tip` | ✅ (gates tip visibility) |
| `service_charge_tax` | — | ❌ **Not parsed** |
| `deliver_charge_gst` | — | ❌ **Not parsed** |
| Per-product `tax.percentage` | item.tax.percentage | ✅ (per-item GST) |

### 3.17 Backend fields required but missing on FE
- `service_charge_tax` — present on backend, not parsed by `profileTransform.js`.
- `deliver_charge_gst` — present on backend, not parsed.
- (No new backend field needed for the **Owner-stated** rule; tip GST = SC GST is a derived value, not a new persisted key.)

---

## 4. Applicability matrix for discussion (Task 3)

Cell legend:
- **A** = currently applied
- **N** = currently not applied
- **U** = unclear / order-type-channel mix
- **OD** = `owner_decision_required`
- **BC** = `needs_backend_contract_definition`

| Component / Rule | Dine-in | Takeaway | Delivery | Room service | Scan & Order / Web | Prepaid | Postpaid | Collect Bill | Print Bill | Reports / audit | Backend payload |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Service charge** | A | N (BUG-013) | N (BUG-013) | A | OD (today: follows order type the scan order arrives as) | A (if SC% > 0 & app.) | A | A (gated by scApplicable) | A | A | A (`service_tax`) |
| **Tip** | A (if `features.tip`) | A | A | A | OD (no order-type gate today) | A | A | A | A | A (echoed via `tip_amount`) | A (`tip_amount` on Collect Bill / prepaid path) |
| **Delivery charge** | N | N | A | N | A (delivery channel) | A | A | A | A | A | A (`delivery_charge`) |
| **GST on service charge** | A (avgGstRate) | n/a (SC=0) | n/a | A (avgGstRate) | OD | A | A | A | A | A (folded in `tax_amount`) | A (folded) |
| **GST on tip** | A (avgGstRate) | A | A | A | OD | A | A | A | A | A (folded) | A (folded) |
| **GST on delivery charge** | n/a | n/a | A (avgGstRate) | n/a | A (delivery channel) | A | A | A | A | A (folded) | A (folded) |

**Legend caveats:**
- **A** indicates **today's** behaviour, not Owner-correct behaviour. Per CR-013 source doc, every "A" cell using `avgGstRate` is **incorrect** for SC/tip/delivery GST.
- **OD** cells must be closed by Owner before code work begins.
- **BC** cells (none currently shown) would appear if Owner mandates per-component persisted breakdown.

---

## 5. Existing keys table (Task 4)

| Key | Where it comes from | Where it is calculated | Where it is sent | Where it is displayed | Backend-owned vs FE-calculated | Risk if changed |
|---|---|---|---|---|---|---|
| `delivery_charge` | User input (AddressFormModal / CartPanel / CollectPaymentPanel inline) | `OrderEntry.jsx:165` state; gate at L737 / L791 | `placeOrder` L735, `updateOrder` L817, `placeOrderWithPayment` L912, `BILL_PAYMENT` via `paymentMutationService` | CartPanel inline row; CollectPaymentPanel input; print bill row | FE-calculated input → BE accepts as-is | **HIGH** — CR-008 Sub-CR #1 just shipped here; any rename breaks D1-Cap/D1-Gate |
| `service_charge` (profile flag) | `profileTransform.js:95` from `api.service_charge` | n/a (boolean) | n/a | Hides SC UI when false | BE-owned | LOW |
| `service_charge_percentage` | `profileTransform.js:99` from `api.service_charge_percentage` | n/a (rate) | n/a | Drives SC ₹ at CollectPaymentPanel L351 | BE-owned | MEDIUM (rate change is real-money) |
| `service_charge_amount` (synonym `service_tax` in payload) | `CollectPaymentPanel.jsx:351`; `orderTransform.calcOrderTotals` L566-568 | FE | `placeOrder` payload `service_tax`; `BILL_PAYMENT` `service_tax` | Collect Bill total; print | FE-calculated, BE echoes back | **HIGH** — direct Grand Total impact |
| `tip` / `tip_amount` (profile flag `tip`) | `profileTransform.js:94`; user input at CollectPaymentPanel L237 | FE | `paymentData.tip` → `BILL_PAYMENT`; `placeOrderWithPayment` extras | Collect Bill row; print row | FE-calculated input | MEDIUM |
| `gst_amount` / `vat_amount` / `tax_amount` / `order_total_tax_amount` | `orderTransform.calcOrderTotals` L571-583 | FE | `placeOrder` `tax_amount` / `gst_tax`, `BILL_PAYMENT` `tax_amount` | Collect Bill SGST + CGST rows; print | FE-calculated (today) → BE trusts | **HIGH** — direct Grand Total + tax-filing impact |
| `total_round` / `round_up` | `orderTransform.calcOrderTotals` L552-557 | FE (BUG-009 fractional rule) | `placeOrder` payload | Collect Bill grand total | FE-calculated | MEDIUM (Sub-CR #1 known divergence ≤ ₹0.50) |
| `order_amount` | `orderTransform.calcOrderTotals` L551-557 | FE | `placeOrder` payload | All summary surfaces (Dashboard tile, Audit) | FE-calculated, BE echoes | **HIGH** — Sub-CR #1 Round-2 just stabilised this |
| `order_sub_total_amount` (FE: `subtotal`, `subtotalAfterDiscount`) | CollectPaymentPanel L375 | FE | `BILL_PAYMENT` payload | Collect Bill summary | FE-calculated | MEDIUM |
| Payment fields (`payment_method`, `transactionId`, `splitPayments`) | UI selection | FE | `BILL_PAYMENT` | Collect Bill / print | FE input | LOW for CR-013 (orthogonal) |
| `service_charge_tax` (PROFILE) | Backend (per CR-013 §2 verified) — **NOT parsed by FE today** | — (not in `profileTransform.js`) | n/a | n/a | BE-owned, FE-blind | n/a (would be new) |
| `deliver_charge_gst` (PROFILE) | Backend — **NOT parsed by FE today** | — | n/a | n/a | BE-owned, FE-blind | n/a (would be new) |
| Hypothetical `service_charge_gst` (PAYLOAD) | Would be FE-computed from chosen rate × SC ₹ | Would live in calcOrderTotals + CollectPaymentPanel | Would extend `placeOrder` / `BILL_PAYMENT` | New report column? | **`needs_backend_contract_definition`** | HIGH (new contract surface) |
| Hypothetical `tip_gst` / `delivery_charge_gst` (PAYLOAD) | Same pattern | Same | Same | Same | **`needs_backend_contract_definition`** | HIGH |

---

## 6. Business-rule options for Owner discussion (Task 5)

Each option block lists pros / cons / implementation impact / backend impact / QA impact / risk / baseline impact. All cells are `owner_decision_required`.

### A. GST on service charge

| Opt | Description | Pros | Cons | FE impact | BE impact | QA impact | Risk | Baseline impact |
|---|---|---|---|---|---|---|---|---|
| A-1 | Always taxable (use `service_charge_tax` profile rate) | Matches Owner intent (CR-013 §3); compliance with config | Restaurants needing 0% must set `0.00` explicitly | Parse 1 new key; switch 1 line in calcOrderTotals + 1 in CollectPaymentPanel | Confirm key populated for all live restaurants | Test matrix §10 | Bill ₹ shifts on every dine-in/room order with `service_charge_tax ≠ avgGstRate` | None new (API-02 preserved) |
| A-2 | Always non-taxable (force 0%) | Simple; predictable | Diverges from configured restaurants that DO want SC GST | Hardcode `scGst = 0` | None | Verify 0 in payload + print | Significant payload diff if any restaurant currently expects SC GST | None new |
| A-3 | Configurable per restaurant (= A-1 when key present, fallback otherwise) | Most flexible; matches CR-013 Q-G1 fallback choice | Fallback policy is itself a question (Q-G1) | A-1 + fallback logic | Confirm key population | Add fallback paths to test matrix | Fallback ambiguity if not closed | None new |
| A-4 | Configurable per order type (dine-in vs room vs takeaway) | Allows different tax behaviour for room vs dine-in | Requires new BE key set | New per-order-type rate field | New BE rate dimension | Bigger matrix | Substantial complexity | **`baseline_update_required_owner_approval`** (new config dimension) + `needs_backend_contract_definition` |

### B. GST on tip

| Opt | Description | Pros | Cons | FE impact | BE impact | QA impact | Risk | Baseline impact |
|---|---|---|---|---|---|---|---|---|
| B-1 | Non-taxable (treat as payment-extra at Collect Bill, never on order) | Common interpretation; simplest | Loses tip from `tax_amount` reporting | `tipGst = 0`; remove tip from `tax_amount` calc; possibly remove from `order_amount` | None | Verify report columns | Bill diff if restaurants currently rely on tip GST | None new |
| B-2 | Taxable at SC rate | **Owner-stated** (CR-013 §3 row Tip) | Requires SC rate to be applied (SC vs tip rate decoupling) | `tipGst = tip × service_charge_tax%` | None new | Must test "tip charged when SC = 0" edge | Q-G4 unresolved | None new |
| B-3 | Taxable at item-blended rate (today) | Preserve current behaviour | Owner explicitly says this is wrong | None | None | None | High continued operational complaint | None new but contradicts Owner intent |
| B-4 | Configurable per restaurant (taxable on/off, rate from a third profile key e.g. `tip_tax`) | Most flexible | New BE key surface | Parse new key | New BE key | New matrix | Adds complexity vs Owner-stated rule | `needs_backend_contract_definition` |

### C. GST on delivery charge

| Opt | Description | Pros | Cons | FE impact | BE impact | QA impact | Risk | Baseline impact |
|---|---|---|---|---|---|---|---|---|
| C-1 | Always taxable at `deliver_charge_gst` | **Owner-stated** | Restaurants needing 0% must set explicitly | Parse 1 new key; switch 1 line in calcOrderTotals + 1 in CollectPaymentPanel | Confirm key populated | Test matrix §10 | Bill diff on all delivery orders post cut-over | None new |
| C-2 | Non-taxable | Simple | Misaligns with delivery cost reimbursement laws in some states | `deliveryGst = 0` | None | Verify 0 in payload + print | Tax filing risk | None new but high regulatory risk |
| C-3 | Configurable per restaurant (= C-1 + fallback) | Flexible | Fallback ambiguity (Q-G3) | C-1 + fallback | Confirm key | Bigger matrix | Q-G3 unresolved | None new |
| C-4 | Configurable per channel (POS-delivery vs scan-delivery vs aggregator) | Distinguishes channel-specific compliance | Requires multi-key BE | New per-channel rate set | New BE dimension | Bigger matrix + per-channel runs | High complexity | **`baseline_update_required_owner_approval`** + `needs_backend_contract_definition` |

### D. Service charge applicability

| Opt | Description | Pros | Cons | FE impact | BE impact | QA impact | Risk | Baseline impact |
|---|---|---|---|---|---|---|---|---|
| D-1 | Dine-in only | Strict; eliminates ambiguity | Excludes room billing | Tighten `scApplicable` (drop `isRoom`) | None | Smaller matrix | Room operators may protest | **`baseline_conflict_owner_decision_required`** (Module 5 + OQ-12 affected) |
| D-2 | Dine-in + room (today) | Matches current code | Today's status quo | None | None | None | Status quo | None |
| D-3 | All order types | Maximum revenue capture | Customer pushback on takeaway/delivery SC | Drop `scApplicable` gate | None | Bigger matrix (now also takeaway / delivery) | Customer-facing complaint risk | None |
| D-4 | Configurable per order type | Most flexible | New BE config | Per-order-type SC enable flag | New BE key set | Bigger matrix | Complexity | `needs_backend_contract_definition` |
| D-5 | Manually editable at bill time | Cashier discretion | Audit risk | New override field on Collect Bill | None | New audit-trail tests | Audit/control concern | None new but governance risk |

### E. Tip applicability

| Opt | Description | Pros | Cons | FE impact | BE impact | QA impact | Risk | Baseline impact |
|---|---|---|---|---|---|---|---|---|
| E-1 | Dine-in only | Conventional | Loses tip on delivery (where customers commonly tip) | Add `tipApplicable` gate | None | Smaller matrix | Customer complaint | None |
| E-2 | Delivery only | Aggregator-style | Loses dine-in tipping | Inverse gate | None | Smaller matrix | Customer complaint | None |
| E-3 | All order types (today) | Maximum capture; matches code | None obvious | None | None | None | Status quo | None |
| E-4 | Optional payment extra at Collect Bill only | Simplest UX | Loses prepaid-path tip capture | Move tip out of `placeOrderWithPayment` extras | Possibly remove `tip` from prepaid payload | Test prepaid + scan order | Prepaid scan-delivery loses tip slot | LOW |
| E-5 | Disabled unless restaurant enables it (today, via `features.tip`) | Already implemented | None | None | None | None | Status quo | None |

### F. Delivery-charge applicability

| Opt | Description | Pros | Cons | FE impact | BE impact | QA impact | Risk | Baseline impact |
|---|---|---|---|---|---|---|---|---|
| F-1 | Delivery only (today) | Matches code | Excludes room delivery if any | None | None | None | Status quo | None |
| F-2 | Delivery + room (e.g. room service charge) | Allows room-internal delivery | Conflates two concepts | Add room-aware gate; risks OQ-12 | None | More room scenarios | OQ-12 deferred — explicit conflict | **`baseline_conflict_owner_decision_required`** |
| F-3 | Manually editable only on delivery (today) | Status quo | None obvious | None | None | None | Status quo | None |
| F-4 | Configurable per restaurant / channel | Aggregator-vs-POS split | Multi-key BE | Per-channel rate + flag | New BE keys | Multi-channel runs | Complexity | `needs_backend_contract_definition` |

---

## 7. Owner decision framework (Task 8)

| Decision ID | Question | Recommended default | Alternative options | Business impact | Technical impact | Baseline impact | Backend impact | Must decide before implementation? |
|---|---|---|---|---|---|---|---|---|
| OD-G1 | Should GST apply on service charge? | A-3 (configurable; A-1 for restaurants with key) | A-1 / A-2 / A-4 | Tax filing accuracy | 1-2 file edits | None | Confirm key populated | **YES** |
| OD-G2 | Should GST apply on tip? | B-2 (Owner-stated: tip GST = SC GST) | B-1 / B-3 / B-4 | Compliance | 1 line change | None | None new | **YES** |
| OD-G3 | Should GST apply on delivery charge? | C-3 (configurable; C-1 for restaurants with key) | C-1 / C-2 / C-4 | Compliance | 1-2 file edits | None | Confirm key populated | **YES** |
| OD-O1 | Which order types should service charge apply to? | D-2 (today: dine-in + room) | D-1 / D-3 / D-4 / D-5 | Customer perception | None–medium | OQ-12 if D-1 forces room change | None | **YES** |
| OD-O2 | Which order types should tip apply to? | E-3 + E-5 (today: all + restaurant-flag) | E-1 / E-2 / E-4 | Customer / cashier UX | LOW | None | None | **YES** |
| OD-O3 | Which order types should delivery charge apply to? | F-1 (today: delivery only) | F-2 / F-3 / F-4 | Compliance | LOW–MEDIUM | OQ-12 if F-2 | F-4 only | **YES** |
| OD-D1 | Should delivery charge itself be taxable (rate question already in OD-G3) | Linked to OD-G3 | — | Compliance | — | — | — | YES — closes via OD-G3 |
| OD-C1 | Should rules be restaurant-configurable? | YES (today's profile model) | NO (global) / per-channel | Multi-tenant flexibility | LOW | None | None | YES |
| OD-C2 | Should rules be order-type configurable? | NO (status quo: per-component, not per-type) | YES (D-4 / E-1/2 / F-2/F-4) | Operational flexibility | MEDIUM-HIGH | New config dimension | YES if YES | YES |
| OD-A1 | Should backend or frontend be calculation authority? | **FE today; preserve** (BUG-019 + Sub-CR #1 already prove BE trusts FE) | BE-authoritative recompute | Audit trustworthiness | LOW (FE) / HIGH (BE switch) | API-02 preserved (FE) | Reconcile if BE switch | YES |
| OD-D2 | Should bill / print show component-wise tax breakup? | NO (status quo: single SGST + CGST) | YES (per-component lines) | Customer transparency | LOW (display) | None | None | NO (UX call only) |
| OD-D3 | Should payload store component-wise taxable / non-taxable values separately (e.g. `service_charge_gst`) | NO unless reports require | YES → new BE keys | Reporting granularity | MEDIUM-HIGH | API-02 requires transform extension | **YES** if YES | NO unless OD-D2 demands |
| OD-Q1 | Q-G1 fallback when key is missing | (a) `avgGstRate` (today) | (b) hard 0 / (c) restaurant `tax.gstPercentage` | Backwards-compat | LOW | None | None | YES |
| OD-Q2 | Q-G2 explicit `0.00` semantics for SC | Override (force 0) | Fallback to `avgGstRate` | Predictability | LOW | None | None | YES |
| OD-Q3 | Q-G3 explicit `0.00` semantics for delivery | Override (force 0) | Fallback | Same | LOW | None | None | YES |
| OD-Q4 | Q-G4 tip-GST when SC is hidden (takeaway / delivery) | Use SC-rate value even if SC line absent | Drop tip-GST when SC hidden | Predictability | LOW | None | None | YES |
| OD-Q5 | Q-G5 legacy-order recompute | New orders only (cut-over date) | Recompute legacy | Audit / GST filing | LOW (new only) / HIGH (recompute) | None | Possibly BE script | YES |

**OD-Q* answers** can be batched into a single owner pass; their defaults match CR-013 §3 Owner-stated business rule.

---

## 8. Impact analysis (Task 6)

| Surface | Change description | Risk | Hotspot? | Notes |
|---|---|---|---|---|
| `OrderEntry.jsx` | None expected if rate switch is consumed inside `CollectPaymentPanel` + `orderTransform`; possibly add restaurant-config selector | LOW | YES | Watch `onClose()` callsites + Sub-CR #1 props |
| `CartPanel.jsx` | None expected (display-only) | LOW | NO | OrderEntry button total may shift slightly per Sub-CR #1 Gap-2A allowance |
| `CollectPaymentPanel.jsx` | Replace 3 lines (L365-367) with rate-driven math; pass component rates from restaurant config | **HIGH** | YES | API-03 surface; revenue-critical |
| `AddressFormModal.jsx` | None expected | LOW | NO | |
| `orderTransform.js` (`calcOrderTotals`, `buildBillPrintPayload`) | Mirror the same 3-rate switch on payload + print sides | **HIGH** | YES | API-02 surface; preserve return-shape |
| `profileTransform.js` | Add 2 keys: `restaurant.serviceChargeTaxPct`, `restaurant.deliveryChargeGstPct` | LOW | NO | |
| Bill print payload | New rate-driven values for `tax_amount` + per-component tax (if OD-D2 = YES) | MEDIUM | YES | |
| KOT impact | None — KOT is item-only, not financial | NONE | NO | |
| Audit / report totals | Echoed from BE; FE only displays | LOW | NO | Per MC-06 |
| Delivery orders | Delivery GST recomputes against `deliveryChargeGstPct` instead of avg | MEDIUM | YES | Sub-CR #1 D1-Cap baseline preserved (delivery_charge value unchanged; only its GST changes) |
| Takeaway orders | Tip GST shifts from avg → SC-rate (B-2); SC stays absent | LOW-MEDIUM | NO | |
| Dine-in orders | SC GST + tip GST + (no delivery) recompute | MEDIUM | YES | Most volume; biggest visible bill diff |
| Room service | SC + tip on room → recompute SC GST + tip GST | MEDIUM | YES | OQ-12 deferred — preserve room billing/print path; do not change shape |
| Scan & order / web orders | Same recompute as their underlying order type | LOW | NO | |
| Prepaid | `placeOrderWithPayment` already calls calcOrderTotals with extras → recompute affects this path automatically | MEDIUM | YES | Anti-tamper lock unchanged (D1-Gate) |
| Postpaid | Same recompute via Collect Bill | MEDIUM | YES | |
| Rounding | Owner Option 2A divergence ≤ ₹0.50 may persist; do not silently change | LOW-MEDIUM | YES | |
| **CR-008 Sub-CR #1 delivery-charge fix** | **PRESERVED** — only GST rate source on delivery changes; capture / payload key / D1-Gate logic untouched | MEDIUM | YES | Verify backups still applicable |

---

## 9. Backend contract check (Task 7)

### 9.1 Fields backend must provide
- `service_charge_tax` (e.g. `"0.00"` / `"5.00"` / `"18.00"`) — **already exposed** per CR-013 §2 (verified absent only from `profileTransform.js`).
- `deliver_charge_gst` (same shape) — **already exposed**.

### 9.2 Fields frontend currently sends
- `delivery_charge`, `service_tax` (= SC ₹), `tax_amount` (= total GST including item + SC + tip + delivery components), `gst_tax` (alias), `tip_amount` (Collect Bill / prepaid only), `order_amount`, `total_round`, `round_up`. **No CR-013 change to send-keys is implied** (rate switch only).

### 9.3 Fields backend must store
- No new field for the **Owner-stated** rule. If OD-D3 = YES (component-wise persisted), then `needs_backend_contract_definition` for `service_charge_gst`, `tip_gst`, `delivery_charge_gst` (3 new persisted columns).

### 9.4 Fields backend must return in reports / bills
- No new field for default rule. If OD-D2 = YES (component-wise breakup on print/bill), then frontend can compose locally from the rate switch — no BE change. If OD-D3 = YES, BE must echo persisted breakdown columns.

### 9.5 Should backend become calculation authority?
- **OD-A1 question.** Default recommendation: NO — keep FE as authority (matches BUG-019 + Sub-CR #1 prior decisions); BE recompute would be a bigger contract change requiring a separate sub-CR.
- Risk if YES: API-02 transforms become "echo-only", no longer canonical for grand total → cashier-visible math could diverge from BE-stored math during refunds / partial pays.

### 9.6 Restaurant config new fields needed
- For Owner-stated rule: **NONE new** — both keys already on BE; FE just needs to parse.
- For OD-C2 = YES (per-order-type config): `needs_backend_contract_definition` for new keys (e.g. `service_charge_tax_dineIn` / `_takeaway` / etc.).

### 9.7 Order-type-wise config?
- Same as OD-C2.

### 9.8 Per-component persisted taxable / non-taxable values?
- OD-D3 above; default NO; if YES then `needs_backend_contract_definition`.

### 9.9 Marker summary
- Default Owner-stated path → **NO new BE contract**; only profile-key parsing on FE.
- Component-wise breakup or per-order-type config → **`needs_backend_contract_definition`**.
- BE-as-calculation-authority → **`needs_backend_contract_definition`** + significant architecture revisit.

---

## 10. QA plan / manual checklist (Task 10)

Run after Owner closes OD-G1..G3, OD-O1..O3, OD-Q1..Q5.

### 10.1 Configuration matrix
| Profile state | `service_charge_tax` | `deliver_charge_gst` | Expected behaviour |
|---|---|---|---|
| Both populated | "5.00" | "5.00" | SC GST = 5%, delivery GST = 5%, tip GST = 5% |
| Both populated, 0% | "0.00" | "0.00" | SC GST = 0, delivery GST = 0, tip GST = 0 |
| One missing | "5.00" / absent | absent / "5.00" | Per Q-G1 fallback (default: avgGstRate fallback) |
| Both missing | absent | absent | Per Q-G1 fallback |
| Non-numeric | "abc" | "abc" | Defensive `parseFloat || fallback` |
| Mixed | "5.00" | "0.00" | SC GST = 5%, delivery GST = 0, tip GST = 5% |

### 10.2 Order-type matrix
| Order type | SC | Tip | Delivery | Expected GST sources |
|---|---|---|---|---|
| Dine-in | yes | yes | no | SC × SC-tax; Tip × SC-tax; no delivery |
| Walk-in | yes | yes | no | Same |
| Takeaway | no | yes | no | No SC; Tip × SC-tax (per OD-Q4); no delivery |
| Delivery | no | yes | yes | No SC; Tip × SC-tax; Delivery × delivery-tax |
| Room | yes | yes | no | SC × SC-tax; Tip × SC-tax; preserve OQ-12 path |
| Prepaid scan delivery | no | (per OD) | yes (locked) | Anti-tamper lock preserved |

### 10.3 Surface checklist (per scenario above)
- [ ] CollectPaymentPanel grand total — exact rupee match against expected formula
- [ ] OrderEntry "Collect Bill" button total — within Owner-allowed ≤ ₹0.50 divergence
- [ ] DevTools: `placeOrder` payload `service_tax` + `tax_amount` + `delivery_charge` + `order_amount` + `round_up`
- [ ] DevTools: `BILL_PAYMENT` payload `tax_amount` + `tip` + `service_tax` + `delivery_charge`
- [ ] Print bill — line-item GSTs match Collect Bill grand total
- [ ] Audit Report row — `tax_amount` echoed back equals what FE sent
- [ ] Cancel + re-open — rate state survives
- [ ] Re-print — same totals as original

### 10.4 Regression checklist
- [ ] CR-008 Sub-CR #1 D1-Cap delivery-charge capture (CartPanel + AddressFormModal) — UNCHANGED
- [ ] CR-008 Sub-CR #1 D1-Gate `readOnly={isPrepaid}` — UNCHANGED
- [ ] CR-006 multi-select variants payload — UNCHANGED
- [ ] CR-007 A2 OrderEntry chip + Print Bill button — UNCHANGED
- [ ] CR-008 #4 Phase A `mygenie_stay_on_order_after_bill` — UNCHANGED
- [ ] BUG-009 fractional rounding — UNCHANGED
- [ ] BUG-019 readonly-when-`initialDeliveryCharge>0` (now `isPrepaid`) — UNCHANGED
- [ ] Room billing/print path — UNCHANGED (OQ-12 deferred)

---

## 11. Phased implementation plan (Task 9)

### Phase 1 — Rule finalisation / Owner decisions (Owner)
- Close OD-G1, OD-G2, OD-G3, OD-O1, OD-O2, OD-O3, OD-Q1..Q5, OD-A1, OD-C1, OD-C2.
- Decide on cut-over date (separates "old rule" vs "new rule" bills for GST filings).
- Decide on legacy-order recompute scope (Q-G5 default: new only).
- Output: closed Owner-decision register; CR-013 source doc updated with answers.

### Phase 2 — Backend contract (only if Phase 1 demands it)
- Default Owner-stated path: **no BE work required** (keys already exist).
- If OD-C2 = YES or OD-D3 = YES: Backend Contract Agent intake → new keys / recompute / column delivery.
- Output: BE keys confirmed populated for all 16 live tenants per `frontend/.env` `REACT_APP_CRM_API_KEYS` set.

### Phase 3 — Frontend implementation plan (after Phase 1 + 2)
- **Bucket D-GST-1 — Parse:** add 2 keys to `profileTransform.js`; expose via `RestaurantContext`. Low-risk standalone ship. ~5-10 lines.
- **Bucket D-GST-2 — Apply:** switch 3 GST math lines in `CollectPaymentPanel.jsx` + 3 mirror lines in `orderTransform.calcOrderTotals` + `buildBillPrintPayload` overrides. Hotspot ship — full Approval Gate + per-file plan + regression checklist required (per IMPLEMENTATION_AGENT_RULES §"Additional guardrails for high-risk areas").
- Owner-prescribed split per CR-013 §12 (kept verbatim).

### Phase 4 — QA plan
- Static + lint + webpack + boot smoke (single agent).
- Runtime walk per §10 matrix on preprod with at least 3 tenants picked across `service_charge_tax` value spread (0% / 5% / 18%).
- Cut-over verification: produce 2 sample bills before vs after; match against expected formulae.
- Owner anchor on at least one live tenant (Palm House `541` recommended per CR-008 Sub-CR #1 convention).

### Phase 5 — Docs / handover
- Update CR-013 source doc with Owner answers + shipped status.
- Add per-bucket implementation summary under `change_requests/implementation_summaries/`.
- Add QA report under `qa_reports/`.
- Update `BASELINE_RECONCILIATION_REPORT_2026_05_04.md` row "Delivery charge GST sourcing" → BU (no baseline drift) once shipped.
- Optional: `baseline_update_required_owner_approval` for Module 4 changelog entry recording CR-013.

---

## 12. Owner questions consolidation

| ID | Question | Default |
|---|---|---|
| OD-G1 | GST on SC: A-1 / A-2 / A-3 / A-4 ? | A-3 |
| OD-G2 | GST on tip: B-1 / B-2 / B-3 / B-4 ? | B-2 |
| OD-G3 | GST on delivery: C-1 / C-2 / C-3 / C-4 ? | C-3 |
| OD-O1 | SC applicability: D-1..D-5 ? | D-2 (today) |
| OD-O2 | Tip applicability: E-1..E-5 ? | E-3 + E-5 (today) |
| OD-O3 | Delivery applicability: F-1..F-4 ? | F-1 (today) |
| OD-C1 | Restaurant-configurable rates? | YES (today's profile model) |
| OD-C2 | Order-type-configurable rates? | NO |
| OD-A1 | Calculation authority: FE / BE / BE-recompute-with-FE-preview ? | FE (today) |
| OD-D1 | Bill / print component-wise tax breakup? | NO |
| OD-D2 | Payload component-wise persisted breakup? | NO |
| OD-Q1 | Fallback when profile key missing | (a) avgGstRate |
| OD-Q2 | `service_charge_tax = "0.00"` ⇒ override or fallback? | Override |
| OD-Q3 | `deliver_charge_gst = "0.00"` ⇒ override or fallback? | Override |
| OD-Q4 | Tip-GST when SC is hidden (takeaway/delivery)? | Use SC rate even if SC line is ₹0 |
| OD-Q5 | Legacy-order recompute scope? | New orders only |
| OD-CO | Cut-over date | Owner to set |

---

## 13. Backend questions consolidation

| ID | Question | Owner default expected |
|---|---|---|
| BE-G1 | Confirm `service_charge_tax` populated for all 16 live tenants in `frontend/.env` `REACT_APP_CRM_API_KEYS` | YES — provide manifest |
| BE-G2 | Same for `deliver_charge_gst` | YES |
| BE-G3 | Does backend trust client-supplied `tax_amount` / `service_tax` / `gst_tax` / `delivery_charge`, or recompute server-side? (relevant to OD-A1) | Currently trust (per BUG-019 + Sub-CR #1) — confirm |
| BE-G4 | Is there a third profile key (e.g. `tip_charge_tax`) that we missed? | NO (per CR-013 §11) |
| BE-G5 | If OD-D3 = YES, can backend persist 3 new columns (`service_charge_gst`, `tip_gst`, `delivery_charge_gst`) and echo on report endpoints? | TBD |
| BE-G6 | Cut-over flag — should bills before/after cut-over carry an explicit `tax_rule_version` for audit traceability? | TBD |

---

## 14. QA checklist (compact view) — see §10 for full matrix

- [ ] Dine-in with SC + tip: SC GST = SC × `service_charge_tax%`; tip GST = tip × same.
- [ ] Dine-in without SC (toggle off): SC GST = 0; tip GST = tip × `service_charge_tax%` (per OD-Q4) **OR** 0 (alternative).
- [ ] Takeaway SC off / on (BUG-013 keeps SC off; toggle scenario re-tests when D-3 chosen).
- [ ] Delivery with `delivery_charge > 0`: delivery GST = `delivery_charge × deliver_charge_gst%`.
- [ ] Delivery GST taxable / non-taxable variants (`deliver_charge_gst = 0.00` vs `5.00` vs `18.00`).
- [ ] Service-charge GST taxable / non-taxable variants.
- [ ] Tip-only order (no other charges) — tip GST follows OD-G2.
- [ ] Tip taxable / non-taxable per OD-G2 chosen option.
- [ ] Prepaid delivery — anti-tamper lock preserved; new GST math via `placeOrderWithPayment` extras.
- [ ] Postpaid delivery — Collect Bill recompute matches new math.
- [ ] Print Bill grand total — matches Collect Bill exactly (rounding ≤ ₹0.50 known divergence).
- [ ] Collect Bill grand total — matches expected formula per matrix.
- [ ] Rounding — BUG-009 fractional rule preserved; no silent change.
- [ ] Reports / audit totals — `tax_amount` echoed equals FE-sent.
- [ ] Room order — OQ-12 path unchanged; SC + tip GST recompute applies.

---

## 15. Final recommendation (Task 11 §15)

**Verdict:** **`owner_decision_required` first → then `frontend-only possible`** if Owner picks the recommended-default option set (A-3, B-2, C-3, D-2, E-3+E-5, F-1, OD-C1=YES, OD-C2=NO, OD-A1=FE, OD-D1=NO, OD-D2=NO).

Under that default set:
- Implementation is fully **frontend-only** (Phase 3 above) — 2 small buckets.
- **No backend contract is needed** beyond confirmation that the 2 profile keys are populated for every live tenant (BE-G1 + BE-G2). This is a confirmation, not a delivery.
- **No baseline conflict** with `/app/memory/final/`. Module 4 + Module 14 own this within existing rules; no API-02 / API-03 / MC-06 boundary shift.
- **OQ-12 (room billing/print lifecycle) remains deferred**; CR-013 explicitly preserves room SC/tip math shape.
- **CR-008 Sub-CR #1 delivery-charge behaviour preserved** — only the GST rate source changes; capture, payload key, D1-Gate stay intact.

If Owner picks any cell that introduces:
- per-component persisted breakdown (OD-D3 = YES), OR
- per-order-type config (OD-C2 = YES), OR
- BE-as-calculation-authority (OD-A1 = BE), OR
- room SC/delivery applicability divergence (D-1 / F-2),

then the verdict shifts to **`needs_backend_contract_definition`** + (where room behaviour changes) **`baseline_conflict_owner_decision_required`** with OQ-12 forced to leave its deferral.

**Recommended next step (NOT to be started by this agent):**
1. Owner closes the §12 register (16 decisions; defaults pre-filled).
2. Backend confirms BE-G1 + BE-G2 manifest.
3. New CR Planning Agent opens Bucket D-GST-1 (parse) and Bucket D-GST-2 (apply) per §11 Phase 3, with the standard Approval Gate + per-file plan + regression checklist.

**Stop point:** This planning document is complete. No code change. No QA run. No baseline edit. CR-013 stays parked until Owner closes §12.

— End of CR-013 GST / SC / Tip / Delivery Planning Document —
