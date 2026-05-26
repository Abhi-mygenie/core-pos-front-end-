# CR-013 Phase 3 — Print-Template Per-Component Tax Slots + Delivery GST Persistence

**Phase:** 3 (post-sprint backend coordination — gates D-GST-4 print parity)
**Type:** Backend ask — print template extension + new persisted column
**Raised:** 2026-05-05 (during CR-013 Phase 1.5 D-GST-3 + D-GST-4 implementation)
**Status:** `needs_owner_decision_and_backend_ticket`
**Risk (frontend):** None — Phase 3 is backend-only; FE already sends the data Phase 1.5 prepared
**Scope:** Backend `order-temp-store` print template + `order-bill-payment` persistence schema. No FE work in this CR — Phase 1.5 already shipped the FE side.

---

## 1. Why this CR exists

CR-013 Phase 1.5 (frontend, owner-approved 2026-05-05) shipped two surfaces:

1. **D-GST-3** — `service_gst_tax_amount` and `tip_tax_amount` are now filled with real values across `placeOrder` / `updateOrder` / `placeOrderWithPayment` / `BILL_PAYMENT` / `transferToRoom` / re-print payloads. Pre-Phase-1.5 these were hardcoded `0`.
2. **D-GST-4** — Collect Bill UI now renders the per-component GST breakdown (Item GST + SC GST + Tip GST + Delivery GST, each as CGST + SGST pair gated on `> 0`). Print payload (`buildBillPrintPayload`) emits `cgst_amount` + `sgst_amount` (50/50 split of composite `gst_tax`).

What Phase 1.5 **could not** ship (because the print template is backend-rendered):
- **Component-wise tax line rendering on the printed bill.** The backend `order-temp-store` template currently renders a single composite `gst_tax` line. It does not yet read per-component fields (`cgst_on_sc_amount`, `sgst_on_tip_amount`, etc.) even if the FE sends them.
- **Persistent `delivery_charge_gst_amount` column.** Today delivery GST is folded into composite `tax_amount` / `gst_tax`. There is no dedicated persisted column for it.

This CR coordinates the backend-side delta needed to close those two gaps.

---

## 2. Scope (3 buckets)

### Bucket BE-G10 — Confirm / extend the print template's tax field handling

**Question to backend team:** Does the `order-temp-store` print template auto-render any tax field present in the payload, or is the receipt template hardcoded to read only specific keys (`gst_tax`, `vat_tax`)?

**If auto-render:** Phase 1.5's `cgst_amount` + `sgst_amount` fields will already render on the printed bill. Confirm and close this bucket.

**If hardcoded:** Backend ticket required — see BE-G11.

### Bucket BE-G11 — Add per-component slots to the print template (blocked on BE-G10)

If the template is hardcoded:

1. Add the following slots (all optional / gated on > 0 to keep low-tax restaurants compact):

   | Field | Source | Render label (suggested) |
   |---|---|---|
   | `cgst_amount` / `sgst_amount` | Phase 1.5 already sends | `CGST` / `SGST` (no rate suffix; items have mixed rates) |
   | `cgst_on_sc_amount` / `sgst_on_sc_amount` | new — FE will send | `CGST on Service Charge <pct/2>%` / `SGST on Service Charge <pct/2>%` |
   | `cgst_on_tip_amount` / `sgst_on_tip_amount` | new — FE will send | `CGST on Tip <pct/2>%` / `SGST on Tip <pct/2>%` (rate = SC rate) |
   | `cgst_on_delivery_amount` / `sgst_on_delivery_amount` | new — FE will send | `CGST on Delivery <pct/2>%` / `SGST on Delivery <pct/2>%` |
   | `service_charge_tax_pct` / `delivery_charge_gst_pct` | optional — for label rendering on backend side | n/a — used to compute `<pct/2>%` suffixes if backend prefers FE-supplied labels |

2. If a slot value is `0` or absent, hide the line on the receipt (mirror the FE Collect Bill UI gating).

3. Confirm round-off behaviour: backend must **NOT** apply final round-off to component values. Round-off is the difference between sum-of-taxed-amounts and the rounded `order_amount`, displayed on a separate "Round Off" line near "Grand Total" only. Owner directive 2026-05-05.

**FE follow-up after BE-G11 ships:** Author a tiny FE patch that adds the 6 new component fields to `buildBillPrintPayload` (frontend). Out of Phase 1.5 scope; trivial when BE-G11 lands.

### Bucket BE-G9 — Persist `delivery_charge_gst_amount` separately

**Question:** Should backend add a `delivery_charge_gst_amount` column to the relevant tables (orders, order_logs_report, etc.) so delivery GST is forensically separable from the composite `tax_amount`?

**Trade-off:**
- **Pro:** Audit / reporting can break out delivery GST cleanly. Matches the precedent of `service_gst_tax_amount` and `tip_tax_amount` (separate persisted columns).
- **Con:** Schema change. Reporting (Module 10) may need a new column on the All Orders Report exports.

**Recommended decision:** YES — adopt for parity with SC + Tip GST persistence. FE will add `delivery_charge_gst_amount` to `placeOrder` / `updateOrder` / `placeOrderWithPayment` / `BILL_PAYMENT` payloads in a small follow-up patch.

**FE follow-up after BE-G9 ships:** Add `delivery_charge_gst_amount` field to `calcOrderTotals` return + 5 payload sites + parse from socket response in `orderTransform.fromAPI.order`. Out of Phase 1.5 scope.

---

## 3. Frontend prep already done in Phase 1.5

| Surface | Status | File / Line |
|---|---|---|
| `service_gst_tax_amount` carries real value on `placeOrder` payload | ✅ Phase 1.5 | `orderTransform.js:746` (post-removal of hardcoded 0) |
| `service_gst_tax_amount` carries real value on `updateOrder` payload | ✅ Phase 1.5 | `orderTransform.js:835` |
| `service_gst_tax_amount` carries real value on `placeOrderWithPayment` payload | ✅ Phase 1.5 | `orderTransform.js:935` |
| `service_gst_tax_amount` carries real value on `BILL_PAYMENT` payload | ✅ Phase 1.5 | `orderTransform.js:1102` |
| `service_gst_tax_amount` carries real value on `transferToRoom` payload | ✅ Phase 1.5 | `orderTransform.js:1167` |
| `tip_tax_amount` mirrors all five sites | ✅ Phase 1.5 | same 5 sites |
| `cgst_amount` + `sgst_amount` (50/50 split of composite) on print payload | ✅ Phase 1.5 | `orderTransform.js:1518-1520` (additive — `gst_tax` preserved) |
| Collect Bill UI per-component breakdown with rate labels + `> 0` gating | ✅ Phase 1.5 | `CollectPaymentPanel.jsx` Bill Summary block |
| Parity console.warn (component-sum vs composite, ₹0.01 tolerance, before round-off) | ✅ Phase 1.5 | `CollectPaymentPanel.jsx` math block |

**No FE work required to enable BE-G10 / BE-G11 / BE-G9 confirmation.** FE follow-up patches (per-component print fields + `delivery_charge_gst_amount`) authored only after backend tickets ship.

---

## 4. Backend acceptance criteria

For BE-G10 + BE-G11:
- Live test on a Palm House (tenant 541) delivery order with all three rates configured (`service_charge_tax = 18.00`, `deliver_charge_gst = 5.00`).
- Place a delivery order with items + tip + delivery charge → Collect Bill → Print Bill.
- Printed receipt should mirror the Collect Bill UI line-for-line:
  - Item Total / Service Charge / Tip / Delivery Charge (gross)
  - Subtotal (pre-tax)
  - CGST + SGST (item GST half each)
  - CGST on SC 9% + SGST on SC 9%
  - CGST on Tip 9% + SGST on Tip 9%
  - CGST on Delivery 2.5% + SGST on Delivery 2.5%
  - Round Off (if non-zero)
  - Grand Total

For BE-G9:
- Schema migration applied. `delivery_charge_gst_amount` column added.
- `order-bill-payment` and `place-order` endpoints accept the new key (silent-drop tolerance OK if FE not yet sending).
- Socket echo includes the new field on `order_amount_change` / running-orders payload.

---

## 5. Risk + rollback

- **Frontend rollback:** None needed — Phase 1.5 has its own backups (`*.bak.cr013p15`). Phase 3 is backend-only.
- **Backend rollback:** If BE-G11 print template breaks rendering for any tenant, `cgst_amount` + `sgst_amount` from FE are silently ignored when BE rolls back the template — bills return to today's single-line `gst_tax` rendering.
- **Reporting impact (BE-G9):** New column on All Orders Report export needs a column-config update in `OrderTable.jsx` + `ExportButtons.jsx` (Module 10). Plan in the FE follow-up patch.

---

## 6. Owner approval question

> **Approve raising BE-G10 / BE-G11 / BE-G9 with the backend team?**
>
> - BE-G10: confirmation only (5-minute backend triage)
> - BE-G11: schema-light template extension (1-2 day backend task)
> - BE-G9: schema migration + persistence (2-3 day backend task)
>
> All three are non-blocking for Phase 1.5 ship — they only close the print-bill parity gap.

---

## 7. Cross-references

- Phase 1.5 implementation summary: `../implementation_summaries/CR_013_PHASE_1_5_DGST3_DGST4_SUMMARY.md`
- CR-013 Frozen Business Logic: `../requirements/CR_013_FROZEN_BUSINESS_LOGIC.md` (frozen rule §11 will need an addendum once BE-G10/G11 closes — recording the new optional per-component slots)
- Display Breakdown plan: `../implementation_plans/CR_013_DISPLAY_BREAKDOWN_PLAN.md`
- Phase 3 registry: `./README.md`

---

**Stop. No code changed in this CR. Frontend is ready; backend ticket is the unblock gate.**

— End of CR-013 Phase 3 (Print Template + Delivery GST Persistence) —
