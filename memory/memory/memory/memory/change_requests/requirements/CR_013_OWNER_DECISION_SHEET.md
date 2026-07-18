# CR-013 — Owner Decision Sheet (Business-Logic Freeze)

**Type:** Business-decision capture (NOT implementation)
**Agent:** CR-013 Business-Logic Freezing Agent
**Date:** 2026-05-05
**Branch:** `5may`
**Status:** **`owner_decisions_pending`** — frozen logic doc will be created **only after** owner answers below.

**Source-of-truth predecessors read in full:**
- `/app/memory/change_requests/impact_analysis/CR_013_GST_SERVICE_TIP_DELIVERY_PLANNING.md`
- `/app/memory/change_requests/CR_013_GST_CONFIG_CORRECTION.md` (existing CR-013 source doc with Owner-stated rule of 2026-05-03)
- `/app/memory/change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`
- `/app/memory/change_requests/BASELINE_RECONCILIATION_REPORT_2026_05_04.md`
- `/app/memory/change_requests/PENDING_TASK_REGISTER_2026_05_04.md`
- `/app/memory/change_requests/qa_reports/CR_008_SUB_1_QA_REPORT.md`
- `/app/memory/final/*` (7 baseline docs — read for guardrails; NOT edited)

> **Strict scope.** No code, no QA, no `/app/memory/final/` edits, no implementation, no CR-008 Sub-CR #1 mutation, no backend assumption, no new CR. This sheet exists only to capture owner answers.

---

## 1. Open owner decisions (Task 1) — extracted + classified

Source: planning doc §7 (16 IDs) + §12 consolidation.

Classification keys:
- **MUST** — must decide before implementation
- **LATER** — can decide later (non-blocking for Phase 1)
- **BE** — backend confirmation needed
- **BL** — baseline-impacting (touches `/app/memory/final/` rules or OQ-12)
- **PRE** — already pre-answered by owner-stated rule in `CR_013_GST_CONFIG_CORRECTION.md` §3 (2026-05-03)

| ID | Decision (short form) | Classification | Owner-stated default (if any) |
|---|---|---|---|
| OD-G1 | GST on Service Charge — taxable / not / configurable | MUST · **PRE** | Taxable; rate from `service_charge_tax` (CR-013 §3) |
| OD-G2 | GST on Tip — taxable / not / configurable | MUST · **PRE** | Taxable; rate = SC rate (CR-013 §3) |
| OD-G3 | GST on Delivery — taxable / not / configurable | MUST · **PRE** | Taxable; rate from `deliver_charge_gst` (CR-013 §3) |
| OD-O1 | SC applicability by order type | MUST | Today: dine-in + walk-in + room (BUG-013) |
| OD-O2 | Tip applicability by order type | MUST | Today: all order types if `features.tip` is on |
| OD-O3 | Delivery-charge applicability | MUST | Today: delivery only |
| OD-C1 | Restaurant-configurable rates? | MUST | YES (today's profile model) |
| OD-C2 | Order-type-configurable rates? | MUST · BL · BE (if YES) | NO |
| OD-A1 | Calculation authority — FE vs BE | MUST | FE (today; matches BUG-019 + Sub-CR #1) |
| OD-D1 | Bill / print component-wise tax breakup? | LATER | NO |
| OD-D2 | Reports / audit component-wise display? | LATER · BE (if YES) | NO |
| OD-D3 | Payload component-wise persisted breakup (`service_charge_gst` / `tip_gst` / `delivery_charge_gst`)? | LATER · BE (if YES) | NO |
| OD-Q1 | Fallback when profile key missing | MUST | (a) `avgGstRate` (today's behaviour, backwards-compatible) |
| OD-Q2 | `service_charge_tax = "0.00"` ⇒ override or fallback? | MUST | Override (force 0) |
| OD-Q3 | `deliver_charge_gst = "0.00"` ⇒ override or fallback? | MUST | Override (force 0) |
| OD-Q4 | Tip-GST when SC is hidden (takeaway / delivery) — use SC rate or 0? | MUST | Use SC rate even if SC line is ₹0 |
| OD-Q5 | Legacy-order recompute scope? | MUST | New orders only |
| OD-CO | Cut-over date for old-rule vs new-rule bills | MUST | Owner to set |

**Backend confirmations** (planning doc §13):

| ID | Backend question | Why it matters | Classification |
|---|---|---|---|
| BE-G1 | `service_charge_tax` populated on profile API for all 16 live tenants in `frontend/.env REACT_APP_CRM_API_KEYS`? | Drives whether OD-Q1 fallback path is hot or cold | BE — confirmation only |
| BE-G2 | Same for `deliver_charge_gst` | Same | BE — confirmation only |
| BE-G3 | Backend trusts client-supplied `tax_amount` / `service_tax` / `gst_tax` / `delivery_charge` (no recompute)? | OD-A1 sanity | BE — confirmation only |
| BE-G4 | Any third profile key we missed (e.g. `tip_charge_tax`)? | Prevents missed scope | BE — confirmation only |
| BE-G5 | If OD-D3 = YES, can BE persist + echo `service_charge_gst` / `tip_gst` / `delivery_charge_gst`? | New contract surface | BE — only if OD-D3 = YES |
| BE-G6 | Cut-over flag — `tax_rule_version` per bill for audit traceability? | Audit/GST filing | BE — only if owner wants forensic flag |

---

## 2. Simplified decision sheet (Task 2)

Single-page version of §1, grouped by topic per the task spec. Each row is a yes/no/option pick the owner can answer in-line.

### A. Service Charge

| # | Question | Owner answer | Recommended default |
|---|---|---|---|
| A.1 | Apply on **dine-in**? | ☐ Yes ☐ No | Yes (today) |
| A.2 | Apply on **takeaway**? | ☐ Yes ☐ No | No (today, BUG-013) |
| A.3 | Apply on **delivery**? | ☐ Yes ☐ No | No (today, BUG-013) |
| A.4 | Apply on **room service**? | ☐ Yes ☐ No | Yes (today, treated as dine-in) |
| A.5 | Apply on **scan & order / web order**? | ☐ Yes ☐ No | Follows the underlying order type (today) |
| A.6 | **Auto** vs **manually editable**? | ☐ Auto-on (per restaurant flag) ☐ Manual | Auto-on if `auto_service_charge=true`; cashier toggle otherwise (today) |
| A.7 | **Restaurant-configurable**? | ☐ Yes ☐ No | Yes — already configurable (`service_charge_percentage`, `auto_service_charge`) |
| A.8 | **Order-type configurable** (different SC % per order type)? | ☐ Yes ☐ No | No |

### B. GST on Service Charge

| # | Question | Owner answer | Recommended default |
|---|---|---|---|
| B.1 | Should GST apply on SC? | ☐ Yes ☐ No ☐ Configurable | Configurable (taxable when `service_charge_tax > 0`) |
| B.2 | Should rate come from `service_charge_tax`? | ☐ Yes ☐ No | Yes (Owner-stated, CR-013 §3) |
| B.3 | If `service_charge_tax` is **missing / null**, what to do? | ☐ Fallback to `avgGstRate` ☐ Force 0 ☐ Use restaurant `tax.gstPercentage` | (a) Fallback to `avgGstRate` (backwards compatible) |
| B.4 | If `service_charge_tax` is **explicitly `"0.00"`**, what to do? | ☐ Override (force 0) ☐ Fallback to `avgGstRate` | Override (force 0) — config wins |

### C. Delivery Charge

| # | Question | Owner answer | Recommended default |
|---|---|---|---|
| C.1 | Apply on **dine-in / walk-in / takeaway / room / scan-non-delivery**? | ☐ Yes ☐ No | No (today, delivery-only) |
| C.2 | Apply on **delivery** orders? | ☐ Yes ☐ No | Yes (today; CR-008 Sub-CR #1) |
| C.3 | **Manually editable** at order time and at Collect Bill? | ☐ Yes ☐ Cashier-edit only when not prepaid | Cashier-edit only when not prepaid (D1-Gate, today) |
| C.4 | Apply on **room service**? Use delivery charge or a separate config? | ☐ Use delivery charge ☐ Separate config ☐ Not applicable | Not applicable (today; OQ-12 deferred) |
| C.5 | Restaurant-configurable enable/disable? | ☐ Yes ☐ No | No explicit toggle today; `delivery` feature flag governs whole order type |

### D. GST on Delivery Charge

| # | Question | Owner answer | Recommended default |
|---|---|---|---|
| D.1 | Should GST apply on delivery charge? | ☐ Yes ☐ No ☐ Configurable | Configurable (taxable when `deliver_charge_gst > 0`) |
| D.2 | Should rate come from `deliver_charge_gst`? | ☐ Yes ☐ No | Yes (Owner-stated, CR-013 §3) |
| D.3 | If `deliver_charge_gst` is **missing / null**, what to do? | ☐ Fallback to `avgGstRate` ☐ Force 0 ☐ Use restaurant `tax.gstPercentage` | (a) Fallback to `avgGstRate` |
| D.4 | If `deliver_charge_gst` is **explicitly `"0.00"`**, what to do? | ☐ Override (force 0) ☐ Fallback | Override (force 0) |

### E. Tip

| # | Question | Owner answer | Recommended default |
|---|---|---|---|
| E.1 | Apply on **dine-in / walk-in**? | ☐ Yes ☐ No | Yes (today, when `features.tip = true`) |
| E.2 | Apply on **takeaway**? | ☐ Yes ☐ No | Yes (today) |
| E.3 | Apply on **delivery**? | ☐ Yes ☐ No | Yes (today) |
| E.4 | Apply on **room service**? | ☐ Yes ☐ No | Yes (today; OQ-12 deferred) |
| E.5 | Apply on **scan & order / web order**? | ☐ Yes ☐ No | Yes (today) |
| E.6 | Tip is **part of order amount** or **payment-extra at Collect Bill only**? | ☐ Order amount ☐ Payment-extra | Payment-extra at Collect Bill (today; tip flows via `paymentData.tip`, not in plain `placeOrder`) |
| E.7 | Should tip be **taxable**? | ☐ Yes ☐ No ☐ Configurable | Yes (Owner-stated, CR-013 §3) |
| E.8 | If taxable, should tip GST use **`service_charge_tax`**? | ☐ Yes ☐ No (separate `tip_tax` profile key) | Yes (Owner-stated; tip rides SC rate) |
| E.9 | When SC is **hidden** for the order type (takeaway / delivery), should tip-GST still use the SC rate? | ☐ Yes (use SC rate even if SC line is ₹0) ☐ No (drop tip-GST when SC hidden) | Yes (Q-G4) |
| E.10 | Should tip appear on **printed bill**? | ☐ Yes ☐ No | Yes (today; gated by `tipEnabled && tip > 0`) |
| E.11 | Should tip appear in **reports / audit**? | ☐ Yes ☐ No | Yes (today; backend echoes `tip_amount`) |

### F. Calculation authority

| # | Question | Owner answer | Recommended default |
|---|---|---|---|
| F.1 | Frontend calculates these amounts at order / Collect Bill time? | ☐ Yes ☐ No | Yes (today; FE-authoritative since BUG-019 + CR-008 Sub-CR #1) |
| F.2 | Should backend **store and return component-wise values** (`service_charge_gst` / `tip_gst` / `delivery_charge_gst`)? | ☐ Yes ☐ No | No (status quo: `tax_amount` is one composite) |
| F.3 | Should backend become the **final calculation authority** in the future (recompute server-side, FE shows preview)? | ☐ Yes (defer to a separate sub-CR) ☐ No | No for Phase 1 |

### G. Display / Print / Reports

| # | Question | Owner answer | Recommended default |
|---|---|---|---|
| G.1 | Should the bill / print show **component-wise tax breakup** (item-GST line + SC-GST line + tip-GST line + delivery-GST line)? | ☐ Yes ☐ No | No (status quo: single SGST + single CGST line) |
| G.2 | Should reports show these components separately? | ☐ Yes ☐ No | No (today; backend owns aggregation per MC-06) |
| G.3 | Should audit totals continue to include all components in `tax_amount`? | ☐ Yes ☐ No | Yes (status quo) |

---

## 3. Recommended default frozen logic (Task 3)

Based on (i) Owner-stated rule in `CR_013_GST_CONFIG_CORRECTION.md` §3, (ii) planning doc §15 final recommendation, and (iii) status-quo preservation for everything not explicitly contradicted by the Owner-stated rule.

> **If the Owner answers "Approve all defaults" below in §5, this becomes the frozen logic. Otherwise see overrides.**

| # | Aspect | Recommended default |
|---|---|---|
| 1 | **Service charge applies to** | Dine-in + Walk-in + Room service (today's `scApplicable`); NOT takeaway, NOT delivery |
| 2 | **Service charge GST applies** | YES |
| 3 | **Service charge GST rate source** | `restaurant.service_charge_tax` (new profile key parsed in `profileTransform.js` → `restaurant.serviceChargeTaxPct`) |
| 4 | **Delivery charge applies to** | Delivery orders only (today's behaviour; CR-008 Sub-CR #1 preserved) |
| 5 | **Delivery charge GST applies** | YES |
| 6 | **Delivery charge GST rate source** | `restaurant.deliver_charge_gst` (new profile key parsed in `profileTransform.js` → `restaurant.deliveryChargeGstPct`) |
| 7 | **Tip applies to** | All order types where `restaurant.features.tip = true` (today; Tip is a payment-extra at Collect Bill, NOT included in plain `placeOrder` payload) |
| 8 | **Tip GST applies** | YES |
| 9 | **Tip GST rate source** | Same as Service Charge → `restaurant.service_charge_tax` (Owner-stated, CR-013 §3 row Tip; tip-GST stays at SC rate even when SC line is ₹0 — Q-G4) |
| 10 | **Missing / null tax-config fallback** | Fall back to `avgGstRate` (today's behaviour; backwards-compatible). Explicit `"0.00"` is treated as **override / force 0** (Q-G2 + Q-G3) |
| 11 | **Print bill display** | Single SGST + single CGST line (status quo). No new per-component tax line. Tip + Delivery + SC values continue to display as their own lines |
| 12 | **Reports / audit display** | Status quo. `tax_amount` is composite; `service_tax`, `tip_amount`, `delivery_charge` are echoed. No new per-component GST column |
| 13 | **Backend persistence required** | NO — no new payload key; only the **value** of `tax_amount` / `gst_tax` / `service_tax` / `delivery_charge` shifts because the rate source changes |
| 14 | **Frontend-only implementation acceptable for Phase 1** | YES — provided BE-G1 + BE-G2 confirm the two profile keys are populated for all 16 live tenants. No new BE contract needed for default rule set |

---

## 4. Necessary clarification questions (Task 4)

Only the questions that **must** close before implementation can be planned. Owner-stated answers from CR-013 §3 are pre-filled where they exist; the owner only needs to **confirm** those rows. Remaining rows are genuinely open.

### Q1. **OD-G1** — GST on Service Charge — confirm rule
**Recommended answer:** YES, taxable. Rate from `restaurant.service_charge_tax`. (Owner-stated, CR-013 §3.)
**Alternative:** Force 0 (no GST on SC) / configurable per restaurant only.
**Impact if chosen:** Default → SC GST recomputes against profile rate; bill values shift on every dine-in / room order with `service_charge_tax ≠ avgGstRate`.

### Q2. **OD-G2** — GST on Tip — confirm rule
**Recommended answer:** YES, taxable, rate = SC rate (`service_charge_tax`). (Owner-stated.)
**Alternative:** Non-taxable (treat tip as payment-extra never on `tax_amount`); or separate `tip_tax` profile key.
**Impact if chosen:** Default → tip GST switches from `avgGstRate` to SC rate. **Q-G4** decides whether tip-GST applies even when SC line is ₹0 (recommended YES).

### Q3. **OD-G3** — GST on Delivery — confirm rule
**Recommended answer:** YES, taxable. Rate from `restaurant.deliver_charge_gst`. (Owner-stated.)
**Alternative:** Force 0 / per-channel configurable.
**Impact if chosen:** Default → delivery GST recomputes against profile rate. CR-008 Sub-CR #1 capture / payload key / D1-Gate untouched; only the GST value attached to the delivery line shifts.

### Q4. **OD-O1** — Service-charge applicability — confirm
**Recommended answer:** Keep today's rule — dine-in + walk-in + room service. No SC on takeaway / delivery (BUG-013 preserved).
**Alternative:** SC also on takeaway / delivery; or per-order-type configurable; or manual cashier-only.
**Impact if chosen:** Default → no UX shift. Any change forces UI gate updates + customer-perception risk.

### Q5. **OD-O3** — Delivery-charge applicability — confirm
**Recommended answer:** Delivery orders only (today). NOT room service (room balance flows separately via `roomInfo.balancePayment`; OQ-12 deferred).
**Alternative:** Apply to room service; per-channel configurable.
**Impact if chosen:** Default → status quo. Any change forces OQ-12 to leave deferral → `baseline_conflict_owner_decision_required`.

### Q6. **OD-O2** — Tip applicability — confirm
**Recommended answer:** All order types where `restaurant.features.tip = true` (today). Tip is a Collect-Bill payment-extra, not part of plain `placeOrder` payload.
**Alternative:** Dine-in only / delivery only / disable.
**Impact if chosen:** Default → no UX shift. Restricting to a subset of order types requires new gate.

### Q7. **OD-Q1 / OD-Q2 / OD-Q3** — Missing / null / `"0.00"` config behaviour — confirm
**Recommended answer (combined):** When the profile key is **missing / null** → fall back to `avgGstRate` (backwards compat). When the profile key is **explicitly `"0.00"`** → override (force 0). Same rule for both `service_charge_tax` and `deliver_charge_gst`.
**Alternative for missing case:** force 0 / use restaurant-level `tax.gstPercentage`.
**Impact if chosen:** Default → older restaurants without these keys keep current behaviour during cut-over; restaurants that explicitly set `0.00` are honoured immediately.

### Q8. **OD-Q4** — Tip GST when SC line is hidden (takeaway / delivery) — confirm
**Recommended answer:** Use SC rate even when SC line is ₹0 (i.e. tip GST = `tip × service_charge_tax%` even on takeaway / delivery).
**Alternative:** Drop tip-GST when SC is hidden (tip GST = 0 for takeaway / delivery).
**Impact if chosen:** Default → consistent tip-GST across order types regardless of SC visibility.

### Q9. **OD-Q5** — Legacy-order recompute — confirm
**Recommended answer:** New orders only after cut-over date (do NOT recompute legacy bills already settled).
**Alternative:** Recompute legacy (would need a backend script + audit trail).
**Impact if chosen:** Default → cleaner audit; older bills retain old totals.

### Q10. **OD-CO** — Cut-over date
**Recommended answer:** Owner to specify (typical pattern: ship Phase A → 2-day soak on 1-2 tenants → cut-over for all). Suggest: cut-over after CR-013 ships + 48h soak.
**Alternative:** Big-bang on ship day; or staggered per-tenant.
**Impact if chosen:** Determines audit-trail boundary for GST filings.

### Q11. **OD-A1** — Calculation authority — confirm
**Recommended answer:** FE-authoritative (today). Backend trusts FE-supplied `tax_amount` / `service_tax` / `delivery_charge` per BE-G3 confirmation pending.
**Alternative:** Switch BE to recompute (separate sub-CR; out of scope here).
**Impact if chosen:** Default → no architecture shift; keeps BUG-019 + Sub-CR #1 contract intact.

### Q12. **OD-C2** — Order-type-configurable rates — confirm
**Recommended answer:** NO. Single `service_charge_tax` and single `deliver_charge_gst` per restaurant.
**Alternative:** YES (e.g. different SC tax for dine-in vs room) → requires new BE keys → `needs_backend_contract_definition` + `baseline_update_required_owner_approval`.
**Impact if chosen:** Default → keeps Phase 1 frontend-only.

### Q13. **OD-D1 / OD-D2 / OD-D3** — Component-wise breakup on print / reports / payload — confirm
**Recommended answer:** NO for all three. Status quo (single SGST + CGST on print; composite `tax_amount` on payload + reports).
**Alternative:** YES → separate lines on print (FE-only), or per-component echo on reports (BE work), or per-component persisted columns (BE work + new payload keys).
**Impact if chosen:** Default → no transform/contract change; **`needs_backend_contract_definition`** if any of D1/D2/D3 = YES (especially D3).

### Q14. **BE-G1 + BE-G2** — Backend manifest of `service_charge_tax` + `deliver_charge_gst` populated for all 16 live tenants
**Recommended answer:** Confirm via Backend Contract Agent intake (single round-trip).
**Alternative:** If any tenant is missing the key, Q7 fallback applies for that tenant; not a blocker.
**Impact if chosen:** Confirmation only; gates the Phase A safety net.

### Q15. **BE-G3** — Backend trusts client-supplied tax fields
**Recommended answer:** Confirm.
**Alternative:** If BE recomputes, FE math must match exactly; CR-013 ship would need BE-side change too.
**Impact if chosen:** Confirmation only.

### Q16. **BE-G4** — Any third profile key we missed (e.g. `tip_charge_tax`)?
**Recommended answer:** Confirm NO.
**Alternative:** If YES (e.g. `tip_charge_tax`), Owner re-decides Q2 with that key as Tip-GST source.
**Impact if chosen:** Re-opens Q2 only.

---

## 5. Owner answer block (fill in to freeze)

The owner can answer in any of three forms. Pick one:

### Form A — One-line approval
> *"Approve all recommended defaults in §3 + §4. BE confirmations BE-G1..G4 to be requested in parallel."*

If approved, this freezes the entire CR-013 business logic at the §3 default rule set, subject only to BE-G1..G4 confirmation results.

### Form B — Targeted overrides
List only the rows you want to change. All un-listed rows take the §3 default.
```
Override Q__: <new answer>
Override Q__: <new answer>
…
```

### Form C — Full custom answer set
Use the §2 simplified-decision-sheet checkboxes (A.1..G.3) verbatim and fill them in.

**Cut-over date (Q10) is mandatory regardless of form.**

---

## 6. Items already out of scope (locked)

| Item | Reason |
|---|---|
| CR-008 Sub-CR #1 D1-Cap delivery-charge **capture** logic | Accepted; not modified by CR-013 |
| CR-008 Sub-CR #1 D1-Gate `readOnly={isPrepaid}` rule | Accepted; not modified by CR-013 |
| BUG-009 fractional rounding rule | Out of scope |
| Room-billing / room-print **lifecycle** | OQ-12 deferred — must NOT be silently changed |
| Reports backend aggregation ownership | MC-06 — backend retains aggregation; FE stays presentation |
| Per-product `tax.percentage` (item-GST) | Already correct; not modified |
| Auto-print bill block at `OrderEntry.jsx` ~L1440-1494 | Out of scope |
| Provider ordering / route map / socket contract | Out of scope |
| `placeOrderWithPayment` shape (prepaid path) | Already accepts extras correctly; not modified beyond rate-switch |

---

## 7. Items that will only be planned **after** owner answers above

- File-level edit plan (`profileTransform.js`, `CollectPaymentPanel.jsx`, `orderTransform.js`).
- Approval Gate per IMPLEMENTATION_AGENT_RULES.
- Bucket split (D-GST-1 parse vs D-GST-2 apply).
- QA scenarios + matrix instances.
- Cut-over communication / docs.
- Optional `baseline_update_required_owner_approval` for Module 4 changelog.

---

## 8. Final recommendation (Task 6)

> **`owner_decisions_pending`**

Implementation planning **cannot start** until the owner closes Q1..Q13 in §4 (or signs Form A in §5). Backend confirmations BE-G1..BE-G4 (Q14..Q16) can run in parallel and are **not blockers** for the freeze itself — the §3 default rule set survives any of their outcomes via Q7 fallback.

Once the owner answers, the next agent (CR-013 Frozen-Logic Agent) will create:

`/app/memory/change_requests/requirements/CR_013_FROZEN_BUSINESS_LOGIC.md`

with the 12 sections specified in the task spec.

---

**Stop here. No code changes. No QA. No `/app/memory/final/` edits. CR-013 remains `parked_owner_decision` until the owner answers above.**

— End of CR-013 Owner Decision Sheet —
