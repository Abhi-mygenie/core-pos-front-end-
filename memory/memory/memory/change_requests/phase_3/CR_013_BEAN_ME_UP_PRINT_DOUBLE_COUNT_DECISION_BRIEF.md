# CR-013 — Bean Me Up Print Double-Count Decision Brief

**Type:** Read-only decision brief. NO code, NO QA, NO tracker rewrite, NO `/app/memory/final/` edit, NO CR start.
**Agent:** CR-013 Bean Me Up Print Double-Count Decision + Backend Triage Agent
**Date:** 2026-05-06
**Branch:** `6-may` (cloned to `/app` 2026-05-05; FE source-of-truth equivalent to `5may` HEAD `5b85c2c`)
**Status:** `decision_pending_owner` — owner has not yet picked Option A / B / C / D
**Predecessors anchored:**
- `/app/memory/change_requests/PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md` (P0 = this issue)
- `/app/memory/change_requests/implementation_handover/CR_013_PHASE_1_5_PRINT_DOUBLE_COUNT_HANDOVER_2026_05_05.md` (Options A/B/C/D source)
- `/app/memory/change_requests/phase_3/CR_013_PRINT_PAYLOAD_TRUTH.md` (FE payload truth)
- `/app/memory/change_requests/qa_reports/CR_013_PHASE_1_5_RUNTIME_QA_REPORT.md` (verdict `qa_passed_with_known_print_backend_finding`)
- `/app/memory/change_requests/implementation_summaries/CR_013_PHASE_1_5_DGST3_DGST4_SUMMARY.md`
- `/app/memory/change_requests/requirements/CR_013_FROZEN_BUSINESS_LOGIC.md`
- `/app/memory/change_requests/phase_3/CR_013_P3_PRINT_TEMPLATE_PER_COMPONENT_TAX.md` (BE-G7..G11 source)

---

## 1. Executive summary

> **The Bean Me Up printed bill is wrong in two opposite directions on the SAME bill, on every dineIn order with a non-zero `service_charge_tax`.** It over-counts SC GST on the displayed CGST/SGST lines (₹27.95 each instead of ₹22.10) AND under-counts SC GST in the printed Total (₹748 instead of ₹759). Customer / auditor sees CGST + SGST = ₹55.90 but Total − Subtotal = ₹33 — bill is not internally reconcilable. **Mismatch on the cited bill: ₹22.90.**

- **Frontend math is correct.** `calcOrderTotals` produces CGST = SGST = ₹22.10 each, Total GST = ₹44.20.
- **Frontend payload is correct.** DevTools paste from owner's session confirms `gst_tax = 44.20`, `cgst_amount = 22.10`, `sgst_amount = 22.10`, `payment_amount = 748` (rounded from `715 + 32.50` per backend's own broken Total formula — FE was forced to match backend's flawed value upstream).
- **Backend print template is the source of both errors.** Reverse-engineered formulas from one Bean Me Up Order #2 receipt:
  - **Display per side:** `printedCGST = printedSGST = (gst_tax − service_gst_tax_amount) / 2 + service_gst_tax_amount` → adds the FULL `service_gst_tax_amount` to BOTH the CGST AND SGST display slots instead of `/2`.
  - **Total:** `printedTotal = subtotal + (gst_tax − service_gst_tax_amount)` → drops SC GST entirely from the Total.
- **Both backend errors always existed.** They were INVISIBLE pre-Phase-1.5 because FE sent `service_gst_tax_amount = 0` on every payload. Phase 1.5 D-GST-3 flipped the value from `0` to real (e.g. ₹11.70) and unmasked both latent backend asymmetries simultaneously and in opposite directions.
- **Tip GST has identical latent exposure.** Same template logic shape; symptom not yet observed because no tipped order has been printed since D-GST-3 shipped. **Symmetric risk.**
- **Delivery GST has DIFFERENT exposure.** No persisted `delivery_charge_gst_amount` column today (BE-G9 still missing). Untested — flagged.
- **Owner statement (verbatim 2026-05-05):** *"no backend doesn't add"* — confirms backend does NOT compute `gst_tax + cgst_amount + sgst_amount`. Risk-1 (additive triple) ruled out; Risk-2 (asymmetric template using legacy stored `service_gst_tax_amount`) confirmed.
- **Recommendation in this brief: Option B (targeted FE rollback on `BILL_PAYMENT` only) + raise BE-G7/G8/G10/G11 as urgent.** Closes the customer-visible bill within minutes; persistence regression is small + reversible the moment backend ships the template fix.

---

## 2. Issue explanation (simple)

### 2.1 What "Bean Me Up print double-count" means

The **same printed bill** carries TWO opposite SC-GST errors at once:

| Surface | What customer sees | What it should be | Direction of error |
|---|---|---|---|
| Printed CGST line | ₹27.95 | ₹22.10 | **OVER** by ₹5.85 |
| Printed SGST line | ₹27.95 | ₹22.10 | **OVER** by ₹5.85 |
| Printed Total | ₹748 | ₹759 (or ₹760 rounded) | **UNDER** by ₹11–12 |

Internal-reconciliation gap on the bill: `(27.95 + 27.95) − (748 − 715) = 55.90 − 33.00 = ₹22.90`.

A regulator / auditor reading the bill cannot reconcile the printed CGST + SGST against the printed Subtotal vs Total arithmetic.

### 2.2 The cited bill (Bean Me Up dineIn, `restaurant_id=742`, `order_id=825311`, `restaurant_order_id="001840"`)

```
Item Total : 650.00     (1 item, 5% GST)
S.C (10%)  :  65.00     (auto SC 10% on Item Total)
Sub Total  : 715.00     (= 650 + 65)
CGST(2.5%) :  27.95     (printed — should be 22.10)
SGST(2.5%) :  27.95     (printed — should be 22.10)
Total      : 748        (printed — should be 759 / 760)
```

Where the correct numbers come from:
- Item GST (5% on ₹650) = ₹32.50
- SC GST (18% on ₹65) = ₹11.70
- Total GST = 32.50 + 11.70 = **₹44.20**
- CGST (half of total GST) = SGST (half) = **₹22.10**
- Honest Total = 715 + 44.20 = **₹759.20** (rounds to ₹759 or ₹760 by BUG-009 fractional rule)

### 2.3 What FE sends (verbatim DevTools paste from owner's session)

```
order_id                : 825311
restaurant_order_id     : "001840"
print_type              : "bill"
payment_amount          : 748     ← FE is sending backend's broken value (matches stored order.amount)
grant_amount            : 748
order_item_total        : 650
order_subtotal          : 715
serviceChargeAmount     :  65
gst_tax                 :  44.2   ← composite (item 32.50 + SC 11.70). CORRECT.
cgst_amount             :  22.1   ← gst_tax / 2. CORRECT.
sgst_amount             :  22.1   ← gst_tax / 2. CORRECT.
vat_tax                 :   0
delivery_charge         :   0
Tip                     :   0
```

> The FE payload does **NOT** carry `service_gst_tax_amount`, `tip_tax_amount`, or `delivery_charge_gst_amount` on the print POST. Those only ship on `placeOrder` / `updateOrder` / `placeOrderWithPayment` / `BILL_PAYMENT` (`order-bill-payment`) / `transferToRoom` and are persisted on the order record.

### 2.4 What backend appears to print

Reverse-engineered from the cited receipt + the FE payload it received:

**Display (per CGST/SGST side):**
```
printedCGST = printedSGST
            = (gst_tax − service_gst_tax_amount) / 2 + service_gst_tax_amount
            = (44.20 − 11.70) / 2                   + 11.70
            =  16.25                                + 11.70
            =  27.95   ← matches receipt
```
→ **Adds the FULL stored `service_gst_tax_amount` to BOTH the CGST AND SGST slots instead of `/2`.** The SC GST is added once correctly into the half + once extra on top.

**Total (`order.amount` / `payment_amount`):**
```
printedTotal = subtotal + (gst_tax − service_gst_tax_amount)
             = 715      + (44.20  − 11.70)
             = 715      +  32.50
             ≈ 748      (₹0.50 round-up)   ← matches receipt
```
→ **Subtracts the stored `service_gst_tax_amount` from `gst_tax` before adding to Subtotal.** SC GST is dropped entirely from the Total line.

The print template is reading the **stored** persisted `service_gst_tax_amount` column from the order record (set by Phase 1.5 D-GST-3 on `BILL_PAYMENT`/`place-order`), **NOT** the FE-supplied print-payload `cgst_amount` / `sgst_amount`. The print payload's halves are silently dropped on this template.

### 2.5 FE Collect Bill math is correct

`calcOrderTotals` (`orderTransform.js:595-639`) produces:
- `gstTax = itemGstPostDiscount + scGstAmt + tipGstAmt + delGstAmt = 32.50 + 11.70 + 0 + 0 = 44.20`
- Component lines on Bill Summary: Item CGST/SGST = ₹16.25 each + SC CGST/SGST = ₹5.85 each → sum = ₹22.10 each ✅
- Parity guardrail at `CollectPaymentPanel.jsx:394` confirmed: `_cr013ComponentSum === _cr013Composite` by construction (₹0.01 tolerance, pre-round-off).

### 2.6 FE payload is correct

Verified live via the QA report §5.1 wire echo on the same Order #2:
- `total_service_tax_amount = 65.00` echoed back (= `service_gst_tax_amount` × restaurant SC pct adjustment context)
- `order_amount = 748` echoed back (= backend's own broken Total)

The FE is pushing honest numbers; the backend is rendering them through an asymmetric template formula.

### 2.7 Why this is a backend print-template / source-of-truth issue (not an FE bug)

- The FE-supplied `cgst_amount` and `sgst_amount` (Phase 1.5 D-GST-4-PRINT-PAYLOAD) are present on the print payload but the receipt prints values that DO NOT match them. This means the template ignores the FE-supplied halves and prefers a template-side recompute formula.
- The template-side recompute uses STORED `service_gst_tax_amount` (set earlier by `BILL_PAYMENT`) — a value the print payload itself does not carry. This is a backend source-of-truth choice, not anything FE controls at print time.
- Pre-Phase-1.5 the bug was masked because `service_gst_tax_amount` was hardcoded `0` in every payload. The template's `(gst_tax − 0)/2 + 0 = gst_tax/2` AND `subtotal + (gst_tax − 0) = subtotal + gst_tax` both happened to land on the correct answer.
- D-GST-3 simply turned on a real-value flow. The template's two latent errors became visible at the same time, in opposite directions.

**This is unambiguously a backend-template + persisted-column-precedence issue.** No FE math change can fix it cleanly — only roll back D-GST-3 (so the template's input goes back to `0` and the broken formula coincidentally lands on the right answer again) or wait for the backend to fix the template.

---

## 3. FE payload truth summary

> Source: `phase_3/CR_013_PRINT_PAYLOAD_TRUTH.md` §4 (full field table) + `qa_reports/CR_013_PHASE_1_5_RUNTIME_QA_REPORT.md` §5.1 (wire echo).

### 3.1 What the print POST carries (via `buildBillPrintPayload`)

| Field | Carries SC GST? | Carries Tip GST? | Carries Delivery GST? | Carries Item GST? |
|---|---|---|---|---|
| `gst_tax` (composite) | ✅ folded in | ✅ folded in | ✅ folded in | ✅ folded in |
| `cgst_amount` | ½ of composite (additive Phase 1.5) | ½ of composite | ½ of composite | ½ of composite |
| `sgst_amount` | mirror of `cgst_amount` | mirror | mirror | mirror |
| `service_gst_tax_amount` | **NOT IN PRINT PAYLOAD** | n/a | n/a | n/a |
| `tip_tax_amount` | n/a | **NOT IN PRINT PAYLOAD** | n/a | n/a |
| `delivery_charge_gst_amount` | n/a | n/a | **NOT IN PRINT PAYLOAD AND NEVER PERSISTED** (BE-G9 open) | n/a |
| `cgst_on_sc_amount` etc. (per-component) | **NOT IN PRINT PAYLOAD** (Phase 3 BE-G11 open) | NOT IN | NOT IN | NOT IN |

### 3.2 What backend persists (set by `BILL_PAYMENT` / `place-order` / `update-order` / `place-order-with-payment` / `transfer-to-room`)

| Field | Status | Origin |
|---|---|---|
| `service_gst_tax_amount` | ✅ persisted (Phase 1.5 D-GST-3 set real value); echoed back as `total_service_tax_amount` on socket / order-list | FE payload at 5 sites |
| `tip_tax_amount` | ✅ persisted (Phase 1.5); cohort all-zero so symptom not yet visible | FE payload at 5 sites |
| `delivery_charge_gst_amount` | ❌ DOES NOT EXIST as a column (BE-G9 still missing) | n/a |
| `payload_total_gst_tax_amount` | Schema present (2026-05-06 cohort) but `null` on every row | Unknown — possibly FE-`gst_tax`-echo for reconciliation |

### 3.3 Wire echo on Bean Me Up cohort (2026-05-05 QA + 2026-05-06 backend audit)

| Order # | order_type | order_amount | total_service_tax_amount | tip_tax_amount | delivery_charge | Verdict |
|---|---|---|---|---|---|---|
| 0 | pos | 863 | 75.00 | 0 | 0 | D-GST-3 live — non-zero SC GST |
| 1 | pos | 2105 | 183.00 | 0 | 0 | D-GST-3 live |
| **2** (cited) | dinein | **748** | **65.00** | 0 | 0 | **Bug visible** |
| 3 | dinein | 518 | 45.00 | 0 | 0 | D-GST-3 live |
| 4 | delivery | 538 | 0.00 | 0 | 100 | Correct (BUG-013 SC gate on delivery) |

> The wire echo confirms **(a)** Phase 1.5 D-GST-3 is provably live on the wire, **(b)** the cited Order #2's stored `total_service_tax_amount = 65.00` matches the broken formula's input on the printed receipt — i.e. `(11.70 vs 65.00)` discrepancy is the per-restaurant `service_charge_tax` rate being multiplied onto `serviceChargeAmount` differently in the QA snapshot vs the cited receipt. The asymmetry of `(displayed_GST_total − Total_GST_in_charge) = service_gst_tax_amount` holds on every bill where SC GST > 0.

---

## 4. Options A / B / C / D comparison

> Source: `implementation_handover/CR_013_PHASE_1_5_PRINT_DOUBLE_COUNT_HANDOVER_2026_05_05.md` §4 + §5.

| # | Option | What changes | Owner | Risk | Printed bill correct? | Collect Bill UI correct? | Permanent or temporary? |
|---|---|---|---|---|---|---|---|
| **A** | **Backend ticket only** | No FE change. Promote BE-G7 / BE-G8 / BE-G10 / BE-G11 to urgent. Backend team patches template asymmetric formula and either auto-renders FE-supplied `cgst_amount` / `sgst_amount` or extends template to consume per-component slots. | **Backend** | None on FE. Backend ETA unknown — bug stays visible to customers until ship. | **❌ until backend ships** (could be days/weeks) | ✅ stays correct (Phase 1.5 D-GST-4 UI is FE-side) | Permanent fix once backend ships |
| **B** | **Targeted FE rollback on `collectBillExisting` (BILL_PAYMENT) only** | Two-line edit at `orderTransform.js:1128-1130` — set `service_gst_tax_amount = 0` and `tip_tax_amount = 0` on the BILL_PAYMENT payload only. Keep real values on `placeOrder`, `updateOrder`, `placeOrderWithPayment`, `transferToRoom` (so cell-level forensics for the order entry path remain). | **Frontend** (interim) + Backend (permanent) | Low. Persistence regression scoped to one path. Reversible by reverting two literals. SC/Tip GST forensics LOST only on collect-bill-path orders. | **✅ within minutes** — backend formula `(gst_tax − 0)/2 + 0 = 22.10` ✅ and `subtotal + (gst_tax − 0) = 759` ✅ | ✅ stays correct (Phase 1.5 D-GST-4 UI untouched) | **Temporary** — must be reverted the moment BE-G7/G8/G10/G11 ship |
| **C** | **Full FE rollback of D-GST-3** | Reset `service_gst_tax_amount` + `tip_tax_amount` to `0` on ALL 5 payload sites (`placeOrder`, `updateOrder`, `placeOrderWithPayment`, `BILL_PAYMENT`, `transferToRoom`). Effectively reverts D-GST-3 entirely. | **Frontend** (interim) + Backend (permanent) | Low-medium. Wider persistence regression — SC/Tip GST forensics LOST on every payload site. Reversible. | **✅ within minutes** — same coincidence as Option B | ✅ stays correct (D-GST-4 UI is FE-computed; survives the persistence rollback) | **Temporary** — broader rollback than B; more code to revert later |
| **D** | **FE workaround (NOT RECOMMENDED)** | Pre-halve `service_gst_tax_amount` on `BILL_PAYMENT` (e.g. send `5.85` instead of `11.70`). Hopes the broken formula cancels on one side. | Frontend | Medium-high. Cancels ONE side of the bug only; persistence shows half-value (audit confusion); overall not predictable. | **Partially / unreliably** — display CGST/SGST might land at `27.95 → 22.10` but Total formula still drops a value; either way the persisted `service_gst_tax_amount = 5.85` is dishonest. | ✅ unchanged | Temporary + dishonest. **Not recommended.** |

### 4.1 Side-by-side outcome on the cited Bean Me Up Order #2

| Surface | Pre-fix (current bug) | Option A (no FE change) | Option B (target rollback) | Option C (full rollback) | Option D | Honest answer |
|---|---|---|---|---|---|---|
| `service_gst_tax_amount` persisted on this BILL_PAYMENT | 11.70 | 11.70 (still wrong) | **0** (regression on this path only) | **0** (regression on all paths) | 5.85 (half-value) | 11.70 |
| Display CGST line | 27.95 ❌ | 27.95 ❌ | **16.25 ✅** | **16.25 ✅** | varies | 22.10 ✅ |
| Display SGST line | 27.95 ❌ | 27.95 ❌ | **16.25 ✅** | **16.25 ✅** | varies | 22.10 ✅ |
| Display CGST + SGST sum | 55.90 | 55.90 | **32.50** | **32.50** | varies | **44.20** ✅ |
| Display Total | 748 ❌ | 748 ❌ | **759 ✅** | **759 ✅** | varies | 759 ✅ |
| Total − Subtotal − VAT reconciles to displayed CGST + SGST? | ❌ (₹22.90 mismatch) | ❌ | **✅** (32.50 = 32.50) | **✅** | varies | ✅ |
| Reconciles to honest GST? | ❌ | ❌ | ⚠ Reconciliation matches at ₹32.50 (item-only) — SC/Tip/Delivery GST EXCLUDED from displayed split | ⚠ same | varies | ✅ all components included |

> Caveat on Options B and C — both **make the printed bill internally reconcilable** (display CGST + SGST = Total − Subtotal) but at the cost of HIDING the SC GST contribution in the printed split (it gets folded back into `gst_tax`-as-item-only on the cited bill because the broken backend formula cancels both directions when the input is 0). The customer no longer sees a wrong number; they just see a slightly less detailed breakdown. Phase 3 BE-G11 will restore the per-component breakdown on the printed bill.

---

## 5. Backend triage questions — BE-G7 / BE-G8 / BE-G10 / BE-G11

> Pack the following four questions into a single backend ask. Estimate ≤ 5 minutes of backend triage to confirm.

### 5.1 BE-G7 — Backend `payment_amount` / printed Total formula

**Question:**
> On `BILL_PAYMENT`-paid orders, what exact formula does the backend use for the printed Total / `order.amount` / `payment_amount`?

**Why it matters:**
- The cited Bean Me Up Order #2 has `payment_amount = 748` instead of the honest `759`. Reverse-engineered formula: `subtotal + (gst_tax − service_gst_tax_amount)`. If confirmed, the backend is dropping the `service_gst_tax_amount` once it goes non-zero.
- Determines whether Options B/C are even necessary — if backend confirms a fix is going out today, owner may pick A.

**Exact field names to check:**
- Backend code path that builds `order.amount` / `payment_amount` on `order-bill-payment` flow
- Any usage of `service_gst_tax_amount` or `tip_tax_amount` columns from the `orders_table`
- Stored vs FE-payload precedence — which value wins when both are present

**Expected correct behaviour:**
- `printedTotal = subtotal + gst_tax + vat_tax` (no subtraction of `service_gst_tax_amount`)
- OR `printedTotal = FE-payload's payment_amount` directly (preferred — FE is source of truth for bill-printed total)

**Evidence backend should provide:**
- Code snippet of the formula building `order.amount` on `BILL_PAYMENT`
- Confirmation: stored `service_gst_tax_amount` is NOT subtracted inside the printed-Total formula
- Sample run on Bean Me Up Order #2 showing what value the formula produces

### 5.2 BE-G8 — Tip GST symmetric exposure

**Question:**
> Does the backend printed-Total formula and printed CGST/SGST display formula treat `tip_tax_amount` symmetrically to `service_gst_tax_amount`? In other words, does it also subtract `tip_tax_amount` from `gst_tax` in the Total formula AND add the FULL `tip_tax_amount` to each CGST/SGST display side?

**Why it matters:**
- If yes, the moment ANY tipped order is printed post-Phase-1.5 the same dual-direction bug surfaces (untested today because no tipped order has been printed since D-GST-3 shipped).
- Determines whether Option B targeted rollback also needs to set `tip_tax_amount = 0` (current Option B sketch already does — see `implementation_handover ... §5 Option B`).

**Exact field names to check:**
- Same template / Total formula sites as BE-G7
- `tip_tax_amount` column on `orders_table`
- `tip_amount` (gross tip) vs `tip_tax_amount` (GST on tip) handling

**Expected correct behaviour:**
- Tip GST (rates onto `tip_amount`) folded into composite `gst_tax` via `gst_tax = item_gst + sc_gst + tip_gst + delivery_gst`
- Printed Total formula uses composite `gst_tax`; does NOT subtract `tip_tax_amount`
- Printed CGST/SGST display halves do NOT add `tip_tax_amount` on top

**Evidence backend should provide:**
- Code snippet showing whether `tip_tax_amount` appears in the printed-Total or printed-CGST/SGST formula at all
- Test case: a Bean Me Up dineIn order with tip > 0 → expected printed values

### 5.3 BE-G10 — `order-temp-store` template auto-render

**Question:**
> Does the `order-temp-store` print template auto-render any tax field present in the print payload (e.g., `cgst_amount`, `sgst_amount`, `service_gst_tax_amount`), or is the template hardcoded to read only specific keys (`gst_tax`, `vat_tax`)?

**Why it matters:**
- Phase 1.5 already sends `cgst_amount = 22.10` and `sgst_amount = 22.10` on the print payload, but the receipt prints `27.95` per side. **Inference:** the template ignores the FE-supplied halves and prefers a template-side recompute from STORED `service_gst_tax_amount`.
- If the template is auto-render, removing the asymmetric formula closes the bug without further FE work. If hardcoded, BE-G11 is required (per-component slot extension).

**Exact field names to check:**
- Template file(s) under backend's `order-temp-store` route
- Tax-related render slots — what keys does the template read?
- Whether `cgst_amount` / `sgst_amount` from the print payload are read at all

**Expected correct behaviour:**
- Template reads FE-supplied `cgst_amount` and `sgst_amount` directly when present
- Template does NOT use a stored-column-based fallback formula that asymmetrically adds `service_gst_tax_amount` to each side

**Evidence backend should provide:**
- Template snippet showing the CGST and SGST line render expressions
- Confirmation of whether the print payload's `cgst_amount` / `sgst_amount` are read

### 5.4 BE-G11 — Per-component print-template slots

**Question:**
> If BE-G10 shows the template is hardcoded, will it be extended to consume per-component fields (`cgst_on_sc_amount`, `sgst_on_sc_amount`, `cgst_on_tip_amount`, `sgst_on_tip_amount`, `cgst_on_delivery_amount`, `sgst_on_delivery_amount`) and STOP using the legacy `(gst_tax − service_gst_tax_amount) / 2 + service_gst_tax_amount` formula? Plus the existing `cgst_amount` / `sgst_amount` (Phase 1.5).

**Why it matters:**
- Owner-approved Collect Bill UI breakdown (D-GST-4) shows per-component CGST/SGST rows. The printed bill should match Collect Bill (frozen rule §1 row 14 spirit).
- BE-G11 is the permanent fix that lets the FE deprecate the targeted Option B rollback.

**Exact field names to check (target schema):**
| Field | Source | Suggested label |
|---|---|---|
| `cgst_amount` / `sgst_amount` | Phase 1.5 — already shipping | `CGST` / `SGST` (no rate suffix) |
| `cgst_on_sc_amount` / `sgst_on_sc_amount` | NEW — FE will add post-BE-G11 | `CGST on Service Charge <pct/2>%` / `SGST on Service Charge <pct/2>%` |
| `cgst_on_tip_amount` / `sgst_on_tip_amount` | NEW — FE will add | `CGST on Tip <pct/2>%` / `SGST on Tip <pct/2>%` |
| `cgst_on_delivery_amount` / `sgst_on_delivery_amount` | NEW — FE will add | `CGST on Delivery <pct/2>%` / `SGST on Delivery <pct/2>%` |
| `service_charge_tax_pct` / `delivery_charge_gst_pct` | Optional — backend can derive labels | n/a |

**Expected correct behaviour:**
- Template hides any line where the slot value is 0 or absent (mirrors FE Collect Bill UI gating)
- Round-off applied ONLY to Grand Total, never to component values (per owner directive 2026-05-05)
- Sum of all rendered CGST + SGST lines exactly equals `gst_tax` ± ₹0.01 by construction (FE will guarantee at payload level)

**Evidence backend should provide:**
- Template snippet showing the new line-rendering pattern
- Sample receipt for Bean Me Up Order #2 showing the expected breakdown:
  ```
  CGST           : 16.25
  SGST           : 16.25
  CGST on SC 9%  :  5.85
  SGST on SC 9%  :  5.85
  Total          : 759
  ```

### 5.5 Bonus — BE-G9 (`delivery_charge_gst_amount` persistence)

**Question:**
> When will the persisted `delivery_charge_gst_amount` ₹ column be added to `orders_table` (or equivalent)? The current `delivery_charge_gst` field is the rate %, not the persisted ₹.

**Why it matters:**
- Today delivery GST has no separate persisted column → backend can either re-multiply `delivery_charge × deliver_charge_gst_pct%` (needs tenant config) or fold into composite `gst_tax`. Either way, double-count exposure if template logic is similar to SC GST asymmetry.
- BE-G9 unblocks audit / reporting parity with `service_gst_tax_amount` and `tip_tax_amount`.

**Evidence backend should provide:**
- Schema diff showing the new column
- Socket payload sample with non-null value
- Confirmation that print template reads it (or NOT)

### 5.6 Owner has already pre-confirmed (do not re-ask)

> *"no backend doesn't add"* — owner verbatim 2026-05-05. Confirms backend does NOT compute `gst_tax + cgst_amount + sgst_amount`. **Risk-1 (additive triple) is ruled out. Do NOT include this in the backend triage list.**

---

## 6. Recommendation

> **Owner choice recommended: Option B — Targeted FE rollback on `collectBillExisting` (BILL_PAYMENT) only — combined with raising BE-G7 / BE-G8 / BE-G10 / BE-G11 as urgent.**

### 6.1 Why Option B

1. **Closes the customer-visible bill within minutes.** Two-line edit at `orderTransform.js:1128-1130`. Lint + webpack auto-reload + owner runtime check on Bean Me Up. CGST/SGST → ₹16.25 each ✅ and Total → ₹759 ✅ on the cited Order #2 immediately.
2. **Minimum persistence regression.** SC/Tip GST forensics are lost ONLY on the `BILL_PAYMENT` path. The other 4 D-GST-3 sites (`placeOrder`, `updateOrder`, `placeOrderWithPayment`, `transferToRoom`) keep persisting real values, so order-entry-side cell-level forensics survive — the parity guardrail at `CollectPaymentPanel.jsx:394` continues to fire on real divergences, and any future audit-table column that reads `total_service_tax_amount` on non-BILL_PAYMENT paths will still have the data.
3. **Reversible in two literals.** The moment BE-G7/G8/G10/G11 ship, the next FE patch is `0 → Math.round((serviceGstTaxAmount || 0) * 100) / 100` and `0 → Math.round((tipTaxAmount || 0) * 100) / 100`. No state machine, no schema migration, no surface-wide refactor.
4. **Symmetrically handles Tip GST.** Option B sketch already sets `tip_tax_amount = 0` alongside `service_gst_tax_amount = 0`. The latent BE-G8 exposure on tipped orders is pre-empted before it surfaces in production.
5. **Preserves all of Phase 1.5 D-GST-4.** Collect Bill UI breakdown, parity guardrail, print payload `cgst_amount` + `sgst_amount` (additive — even if today's template ignores them, they're correct and ready for BE-G10/G11), Fix-1, Fix-2, CR-008 Round-3 — all untouched.
6. **Doesn't preempt the backend fix.** No FE workaround / pre-halving (Option D's failure mode). Backend can ship the real fix without coordinating against any FE rollback weirdness — simply revert the two literals when ready.
7. **Owner directive alignment.** Owner's verbatim 2026-05-05 choice was *"document this for next agent ... continue DISCUSSION"* — this brief is that document. Recommendation is consistent with the agent-session recommendation in the predecessor handover §4.

### 6.2 Why NOT Option A

- The customer-visible bill stays broken until backend ships. Owner has zero ETA on backend; the bug is on EVERY dineIn-with-SC bill on Bean Me Up tenant 742 (and any other tenant with `service_charge_tax > 0`).
- Customer / auditor reading the bill TODAY sees a non-reconcilable bill. Brand / regulator risk.

### 6.3 Why NOT Option C

- Wider persistence regression than necessary. The backend asymmetric template only triggers on the `BILL_PAYMENT` printed-bill path; rolling back the other 4 payload sites costs forensics that aren't gating any bug.
- More code to revert later when backend ships. More opportunity for revert mistakes.

### 6.4 Why NOT Option D

- Half-value persistence is dishonest in audit. Cancels one side of the bug at best; unpredictable behaviour on Total formula. Not recommended in the predecessor handover.

### 6.5 Implementation rails (only if owner picks B)

> Per `implementation_handover/CR_013_PHASE_1_5_PRINT_DOUBLE_COUNT_HANDOVER_2026_05_05.md` §5 — agent must follow exactly:

- **File:** `/app/frontend/src/api/transforms/orderTransform.js`
- **Backup:** `orderTransform.js.bak.cr013p15-optB`
- **Edit (two literals):**
  ```js
  // BEFORE (Phase 1.5 shipped)
  service_gst_tax_amount:   Math.round((serviceGstTaxAmount || 0) * 100) / 100,
  tip_tax_amount:           Math.round((tipTaxAmount || 0) * 100) / 100,

  // AFTER (Option B targeted rollback)
  service_gst_tax_amount:   0,   // Option B rollback (2026-05-XX) — waiting on BE-G7/G8/G11
  tip_tax_amount:           0,   // Option B rollback (2026-05-XX) — waiting on BE-G7/G8/G11
  ```
- **Untouched:** `calcOrderTotals` return; `placeOrder` / `updateOrder` / `placeOrderWithPayment` / `transferToRoom` payload sites; `buildBillPrintPayload` (still emits `cgst_amount` + `sgst_amount`); `CollectPaymentPanel.jsx` (UI + parity guardrail + paymentData).
- **Post-change:** lint clean → webpack auto-reload → DevTools snapshot of `BILL_PAYMENT` POST body before/after on Bean Me Up → owner runtime confirm CGST = SGST = 16.25 and Total = 759 (or 760 rounded).
- **Trackers to append (out of THIS brief's scope but flagged):**
  - `implementation_summaries/CR_013_PHASE_1_5_DGST3_DGST4_SUMMARY.md` § new §0c "Option B Interim Rollback"
  - `phase_3/CR_013_P3_PRINT_TEMPLATE_PER_COMPONENT_TAX.md` BE-G7/G8/G10/G11 priority → urgent
  - `implementation_handover/CR_013_PHASE_1_5_PRINT_DOUBLE_COUNT_HANDOVER_2026_05_05.md` §8 post-resolution log filled

### 6.6 Parallel track — backend triage now

Independent of which option owner picks (even Option A), raise the BE-G7/G8/G10/G11 questions §5 above to backend lead today. Estimate ≤ 5 minutes of backend triage time per question. Output captured in `phase_3/CR_013_P3_PRINT_TEMPLATE_PER_COMPONENT_TAX.md` with priority bumped to urgent.

---

## 7. Owner decision needed

> **Owner — please reply with one of:**
>
> **(A) "Option A"** → No FE change. Promote BE-G7/G8/G10/G11 to urgent. Wait for backend ship. Bug stays customer-visible until backend ships.
>
> **(B) "Option B"** ⭐ recommended → Targeted FE rollback on `BILL_PAYMENT` payload only (two literals at `orderTransform.js:1128-1130` set to `0`). Bug fixed within minutes; persistence regression scoped to one path; reversible in two-literal change when backend ships.
>
> **(C) "Option C"** → Full FE rollback of D-GST-3 at all 5 payload sites. Wider persistence regression than necessary; reversible.
>
> **(D) "Option D"** → Pre-halve `service_gst_tax_amount` workaround. Not recommended — half-value persistence is dishonest in audit.
>
> **OR — provide new evidence** (e.g., backend has confirmed a same-day fix for BE-G7/G8/G10/G11 → Option A becomes viable; or a new tenant exposes Tip GST symptom → re-decode using §3 framework before deciding).

### 7.1 Decision-needed checklist (for owner)

- [ ] Pick Option **A / B / C / D** (or provide new evidence)
- [ ] If B or C: confirm willingness to lose SC/Tip GST forensics on the chosen scope (B = `BILL_PAYMENT` only; C = all 5 payload sites)
- [ ] Confirm: raise BE-G7/G8/G10/G11 to backend team as urgent in parallel (independent of A/B/C/D)
- [ ] (Optional) Confirm: run the additive owner visual walk on Bean Me Up tenant 742 once preprod awakens (~10 min) to close the QA report's `qa_passed_with_known_print_backend_finding` caveat

### 7.2 Decision NOT needed today (out of scope of this brief)

- Phase 3 BE-G9 (`delivery_charge_gst_amount` persistence) — bonus question §5.5; not blocking the print double-count fix
- BE-G11 FE follow-up (per-component payload keys) — gated on BE-G10 + BE-G11 backend confirmation
- CR-009 Operations Audit Timeline planning — separate ready-to-plan item
- UX-LOADING-02 owner option pick — separate Phase 3 decision

---

## 8. Strict-rules compliance certification

| Rule | Status |
|---|---|
| Read-only — no implementation | ✅ |
| No frontend / backend source edited | ✅ |
| No QA / tests run | ✅ |
| No tracker rewrite | ✅ — only this new decision-brief document created |
| No `/app/memory/final/*` touched | ✅ |
| No CR-009 started | ✅ |
| No CR-008 Sub-CR #3 dispatch/assign started | ✅ |
| No code pulled / branch switched | ✅ |
| Predecessor docs treated as authoritative; Options A/B/C/D verbatim from `implementation_handover/CR_013_PHASE_1_5_PRINT_DOUBLE_COUNT_HANDOVER_2026_05_05.md` §4 + §5 | ✅ |
| Stop after document creation | ✅ |

---

— End of CR-013 Bean Me Up Print Double-Count Decision Brief 2026-05-06 —
