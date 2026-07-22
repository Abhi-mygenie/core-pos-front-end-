# VAT Item-Level Tax Fix — QA Validation Report

**Status:** PASS (static code-trace validation; no regressions identified)
**Date:** 2026-01 (validation continuation of CR `vat_mapping_gap_investigation`)
**Validation method:** Read-only static analysis — full code trace through every modified hunk **and** every downstream consumer the fix depends on. No code edits. No commits. No automated test agent invoked (handover §6.5 explicitly defers to owner's manual QA).
**Scope reference:** `/app/memory/change_requests/vat_mapping_gap_investigation/VAT_FIX_IMPLEMENTATION_HANDOVER.md`
**Implementation report:** `/app/memory/change_requests/vat_mapping_gap_investigation/VAT_FIX_IMPLEMENTATION_REPORT.md`
**Investigation reference:** `/app/memory/change_requests/vat_mapping_gap_investigation/VAT_MAPPING_GAP_INVESTIGATION.md`

---

## 0. Validation methodology

This QA was performed by reading the post-fix code at:

- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (modified — 5 hunks)
- `frontend/src/api/transforms/orderTransform.js` (NOT modified — verified the downstream consumers `collectBillExisting` and `buildOrderTempStorePayload` correctly pick up the panel's `vatAmount` / `vatTax` outputs)

and tracing each of the 8 requested cases end-to-end through the actual code (no test execution). The handover's regression sentinel — "GST-only orders must be byte-identical" — was the primary discriminator.

`git log` confirms the fix was auto-committed by the platform as `07c60b3` containing exactly:
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (+22 / -5)
- `memory/change_requests/vat_mapping_gap_investigation/VAT_FIX_IMPLEMENTATION_REPORT.md` (new)

No forbidden file is in the commit.

---

## 1. Case-by-case validation

### Case 1 — GST-only item  →  **PASS**

**Trace:**
- Items have `tax.type === 'GST'`, `tax.percentage > 0`.
- `taxTotals` memo (L204–L231): the GST `if`-branch is hit → `sgst += taxAmt/2; cgst += taxAmt/2;` byte-identical to pre-fix. The new `else if VAT` branch is skipped. Returned object: `{sgst > 0, cgst > 0, vat: 0}`.
- L412 `itemGstPostDiscount = (sgst + cgst) * (1 - discountRatio)` — unchanged.
- L417–L419: GST/SC/Tip/Delivery aggregation — unchanged.
- L458 `const vat = taxTotals.vat;` → `0`.
- L460 `rawFinalTotal = subtotal + sgst + cgst + 0` ≡ pre-fix expression.
- Bill Summary: existing CGST + SGST rows render (gating untouched). New VAT row hidden because `taxTotals.vat === 0`.
- `paymentData.vatAmount = Math.round(0 * 100)/100 = 0` → BILL_PAYMENT `vat_tax: 0` (matches pre-fix).
- Print Bill override `vatTax: 0` → `finalVatTax = 0` → printed `vat_tax: 0` (matches pre-fix).

**Verdict:** Byte-identical to pre-fix behaviour. No regression.

### Case 2 — VAT-only item  →  **PASS**

**Trace:**
- Items have `tax.type === 'VAT'`, `tax.percentage > 0`.
- `taxTotals`: GST branch skipped, VAT branch hit → `vat += taxAmt` (full, not halved). Returned `{sgst: 0, cgst: 0, vat: V}` where `V > 0`.
- L412 `itemGstPostDiscount = (0 + 0) * ... = 0`. L417: `totalGst = 0 + scGst + tipGst + deliveryGst` (only SC/Tip/Delivery GST if those are >0; for pure item-only orders this is 0). L418–L419: `sgst = cgst = 0` (or pure SC contribution if SC > 0 — addressed in Case 6).
- L458 `vat = V`. L460 `rawFinalTotal = subtotal + 0 + 0 + V` → **includes VAT**. ✅
- L465–L468 `finalTotal = roundOff(rawFinalTotal)` — VAT-inclusive.
- Bill Summary: existing CGST/SGST rows hidden (gating `sgst>0 || cgst>0` is false). New VAT row visible because `taxTotals.vat = V > 0`. Label `"VAT"`, amount `₹V.toFixed(2)`. ✅
- `paymentData.vatAmount = Math.round(V * 100)/100 = V`. `paymentData.finalTotal = effectiveTotal` (VAT-inclusive). `paymentData.printVatTax = V`.
- BILL_PAYMENT via `collectBillExisting` (orderTransform.js L1135, L1248): destructures `vatAmount`, emits `vat_tax: vatAmount || 0 = V`. ✅ **Non-zero `vat_tax`.**
- `payment_amount` (L1233) and `grant_amount` (L1249) both = `finalTotal` → **VAT-inclusive**. ✅
- Per-line `food_detail[i].vat_amount` (L1215) already correctly populated from `item.tax.type` (this code was already VAT-correct pre-fix; the fix only restored consistency at the order-level fields).

**Verdict:** Item-level VAT now flows end-to-end. Bill Summary row visible, Grand Total includes VAT, BILL_PAYMENT `vat_tax` non-zero, `payment_amount` includes VAT.

### Case 3 — No-tax item  →  **PASS**

**Trace:**
- Items have `tax.percentage === 0`.
- `taxTotals` memo (L208): `if (!tax || tax.percentage === 0) return;` — short-circuits **before** the GST/VAT branch decision. All three buckets stay 0.
- `taxTotals = {sgst: 0, cgst: 0, vat: 0}`.
- `rawFinalTotal = subtotal + 0 + 0 + 0` (identical to pre-fix).
- Bill Summary: no tax rows rendered (all three gates false).
- Per-line `food_detail[i].gst_amount = '0.00'`, `vat_amount = '0.00'` — unchanged.
- BILL_PAYMENT: `gst_tax: 0`, `vat_tax: 0`, `payment_amount: subtotal` — all byte-identical to pre-fix.

**Verdict:** Byte-identical to pre-fix behaviour. No regression.

### Case 4 — Mixed GST + VAT order  →  **PASS**

**Trace:**
- Cart has both `tax.type === 'GST'` items and `tax.type === 'VAT'` items.
- `taxTotals`: GST items add to `sgst`/`cgst` (halved), VAT items add to `vat` (full). Returned `{sgst: G/2, cgst: G/2, vat: V}`.
- L412 `itemGstPostDiscount = G * (1 - discountRatio)`.
- L460 `rawFinalTotal = subtotal + sgst + cgst + vat` → includes both GST and VAT.
- Bill Summary: existing CGST row visible (sgst+cgst > 0), existing SGST row visible, **new VAT row visible** (vat > 0). Three rows in total, in the order CGST → SGST → VAT (existing rows not reordered).
- BILL_PAYMENT: `gst_tax = sgst + cgst` (non-zero) and `vat_tax = V` (non-zero). Both fields populated correctly. ✅
- Per-line: GST items emit `gst_amount > 0, vat_amount = 0`; VAT items emit the reverse. Internally consistent with order-level totals.

**Verdict:** Bill Summary shows all three rows. BILL_PAYMENT carries both `gst_tax` and `vat_tax` non-zero. Grand Total reflects both taxes.

### Case 5 — Mixed GST + VAT + no-tax order  →  **PASS**

**Trace:** Identical to Case 4, with no-tax items contributing 0 via the early-return at L208. Their per-line `gst_amount` and `vat_amount` are both `'0.00'`. They contribute `subtotal` but not tax.

**Verdict:** Same as Case 4 plus no-tax items behave like Case 3. No regression.

### Case 6 — VAT order with service charge enabled  →  **PASS** (SC GST byte-identical)

**Trace:**
- VAT items only + `serviceCharge > 0` + `restaurant.serviceChargeTaxPct > 0`.
- `taxTotals`: `{sgst: 0, cgst: 0, vat: V}` (SC is NOT inside this memo's loop — confirmed by re-reading the entire `taxTotals` body, lines 204–231).
- L413 `scGst = serviceCharge * scTaxRate` — **unchanged from pre-fix**.
- L412 `itemGstPostDiscount = (0 + 0) * (1 - discountRatio) = 0`. L417 `totalGst = 0 + scGst + tipGst + deliveryGst = scGst` (when tip and delivery are 0). L418–L419 `sgst = cgst = scGst/2` (byte-identical to pre-fix; pre-fix produced the same numbers for a VAT-only + SC cart because the GST half of `taxTotals` was always 0 in that case anyway).
- L458 `vat = V`. L460 `rawFinalTotal = subtotal + sgst + cgst + V = subtotal + scGst + V`. **The SC GST contribution to the Grand Total is byte-identical to pre-fix; VAT is additionally folded in.** ✅
- Bill Summary: item-level CGST/SGST rows hidden (`taxTotals.sgst === 0`); new VAT row visible; SC GST CGST/SGST rows visible (gated on `scGst > 0` — completely untouched). Layout: `VAT → CGST on Service Charge → SGST on Service Charge`. ✅
- BILL_PAYMENT: `gst_tax = sgst + cgst = scGst` (matches pre-fix), `vat_tax = V`, `serviceGstTaxAmount = scGst` (untouched), `tipTaxAmount = tipGst` (untouched). ✅

**Critical regression sentinel:** SC / Tip / Delivery / GST-on-SC code paths (`scGst`, `tipGst`, `deliveryGst`, `_cr013ComponentSum`, `serviceGstTaxAmount`, `tipTaxAmount`) were not modified by the fix. CR-013 component-parity guardrail still operative. ✅

**Verdict:** SC behaviour byte-identical; VAT additively folded in on top. Owner Decision #2 honoured.

### Case 7 — VAT order with print bill (manual "Print Bill" from CollectPayment)  →  **PASS**

**Trace:**
- `handlePrintBill` (L614–L646) builds `overrides` including `vatTax: Math.round(vat * 100)/100` (was `0` pre-fix) and `paymentAmount: finalTotal` (which is now VAT-inclusive thanks to Hunk 2).
- `onPrintBill(overrides)` flows into `buildOrderTempStorePayload` (`orderTransform.js`):
  - L1579–L1581 `finalPaymentAmount = overrides.paymentAmount` → VAT-inclusive.
  - L1583 `finalVatTax = overrides.vatTax !== undefined ? overrides.vatTax : vat_tax` → uses the panel-supplied value `V`. ✅
  - L1638 `payment_amount: roomFinalPaymentAmount` (= `finalPaymentAmount` for non-room orders) → VAT-inclusive. ✅
  - L1639 `grant_amount: roomFinalPaymentAmount` → VAT-inclusive. ✅
  - L1693 `vat_tax: finalVatTax` → `V`. ✅
- The default-path VAT aggregation at L1471 (`if (taxType === 'VAT') vat_tax += taxAmt`) is intact; reprint-from-card flows (no override) also still work correctly. Regression-safe.

**Verdict:** Manual Print Bill from Collect Payment screen now emits non-zero `vat_tax` and a VAT-inclusive `payment_amount`. Default-path reprint behaviour unchanged.

### Case 8 — VAT order collect payment payload (BILL_PAYMENT)  →  **PASS**

**Trace:**
- `paymentData` built in `CollectPaymentPanel.jsx` L549–L607 includes `vatAmount: Math.round(vat * 100)/100`, `finalTotal: effectiveTotal` (VAT-inclusive), `printVatTax: Math.round(vat * 100)/100`.
- `onPaymentComplete(paymentData)` flows into `collectBillExisting` (`orderTransform.js` L1130–L1330+):
  - L1135 destructures `vatAmount = 0` default; receives `V` from panel.
  - L1188–L1215 per-line `food_detail[i]` build: `vat_amount` discriminated by `(item.tax?.type === 'VAT')`. Order-level `food_detail` rows already VAT-correct pre-fix.
  - L1233 `payment_amount: finalTotal || 0` → VAT-inclusive. ✅
  - L1246–L1248: `total_gst_tax_amount: gstTax`, `gst_tax: gstTax`, **`vat_tax: vatAmount || 0`** → **non-zero `V`**. ✅
  - L1249 `grant_amount: finalTotal || 0` → VAT-inclusive. ✅
- **Internal consistency:** sum of per-line `food_detail[i].vat_amount` for VAT items will equal order-level `vat_tax` (both derived from the same item-level taxAmt formula in `taxTotals` and `buildCartItem`). The pre-fix internal-inconsistency bug (per-line correct but order-level 0) is eliminated.

**Verdict:** BILL_PAYMENT payload now carries non-zero `vat_tax`, VAT-inclusive `payment_amount` and `grant_amount`, and is internally consistent.

---

## 2. Acceptance contract matrix (handover §5)

| # | Order composition | Bill Summary rows | Grand Total | `gst_tax` | `vat_tax` | `payment_amount` | Print Bill | Result |
|---|---|---|---|---|---|---|---|---|
| 1 | GST-only | CGST, SGST | subtotal + GST | non-zero | 0 | unchanged | unchanged | ✅ |
| 2 | VAT-only | **VAT** only | subtotal + VAT | 0 | **non-zero** | **+VAT** | **shows VAT** | ✅ |
| 3 | No-tax | none | subtotal only | 0 | 0 | unchanged | unchanged | ✅ |
| 4 | Mixed GST + VAT | CGST + SGST + **VAT** | subtotal + GST + VAT | non-zero | **non-zero** | **+VAT** | **shows both** | ✅ |
| 5 | Mixed GST + VAT + no-tax | same as #4 | same as #4 | non-zero | non-zero | +VAT | shows both | ✅ |
| 6 | VAT + SC ON | VAT + SC-CGST + SC-SGST | subtotal + VAT + SC GST (byte-identical to pre-fix on SC component) | as-today | non-zero VAT | correct | shows VAT + SC GST | ✅ |
| 7 | VAT order — Print Bill | (panel) VAT row visible | finalTotal VAT-inclusive | as-today | non-zero in printed `vat_tax` | VAT-inclusive | **shows VAT** | ✅ |
| 8 | VAT order — BILL_PAYMENT | n/a (payload) | finalTotal VAT-inclusive | as-today | **non-zero `vat_tax`** | **VAT-inclusive** | n/a | ✅ |

---

## 3. Regression analysis

| Frozen item | Verification | Result |
|---|---|---|
| GST `if`-branch inside `taxTotals` (L217–L220) | Read post-fix code at L217–L220 — `sgst += taxAmt / 2; cgst += taxAmt / 2;` identical to pre-fix | ✅ byte-identical |
| GST-only behaviour end-to-end | Case 1 trace shows identical numbers and identical payload fields | ✅ no regression |
| No-tax behaviour end-to-end | Case 3 trace shows early-return short-circuits before any new code path | ✅ no regression |
| `subtotal` expression (L454) | Read post-fix line — unchanged | ✅ untouched |
| `scGst` / `tipGst` / `deliveryGst` (L413–L415) | Read — unchanged | ✅ untouched |
| `totalGst` / GST-side `sgst` / `cgst` (L417–L419) | Read — unchanged | ✅ untouched |
| `_cr013ComponentSum` parity guardrail (L427–L442) | Read — unchanged | ✅ untouched |
| `serviceGstTaxAmount` / `tipTaxAmount` payload fields | Read — unchanged | ✅ untouched |
| `orderTransform.js` not modified | `git log` confirms HEAD commit `07c60b3` does not include this file | ✅ untouched |
| `productTransform.js` not modified | `git log` confirms not in HEAD commit | ✅ untouched |
| `OrderEntry.jsx` not modified | `git log` confirms not in HEAD commit | ✅ untouched |
| `CollectBillPanelDrawer.jsx` not modified | `git log` confirms not in HEAD commit | ✅ untouched (Hold-tab inherits fix via shared CollectPaymentPanel) |
| Backend / API / endpoint code | None of these files in HEAD commit | ✅ untouched |
| PayLater `payment_status: sucess` line in `collectBillExisting` | `orderTransform.js` not modified | ✅ preserved |
| `calcOrderTotals` VAT aggregation (orderTransform.js L598–L670) | Was already VAT-correct pre-fix; not modified | ✅ untouched |
| `buildOrderTempStorePayload` default path (L1442–L1531) | Not modified; correctly aggregates VAT for reprint-from-card | ✅ untouched |

**No regressions identified.**

---

## 4. Edge-case spot checks

| Edge case | Code-trace observation | Result |
|---|---|---|
| Inclusive-VAT items | The existing `if (tax.isInclusive)` branch in `taxTotals` (L211–L215) runs **before** the GST/VAT type discrimination, so inclusive-VAT items correctly compute `taxAmt = linePrice - linePrice/(1+pct/100)` and accumulate into the `vat` bucket. No double-count. | ✅ |
| VAT + discount / coupon / loyalty / wallet | `taxTotals` uses `getItemLinePrice(item)` (same line-price helper as GST path) — already discount-aware. VAT computed on post-discount totals, same convention as GST. | ✅ |
| Round-off ON (BUG-009) | `fractional` and `finalTotal` (L464–L468) compute against the VAT-inclusive `rawFinalTotal`. Round-off applies on the new, correct total. | ✅ |
| Split Bill of a VAT order | `effectiveTotal` (used for split shares) derives from `rawFinalTotal` (now VAT-inclusive). Each split share is proportional to VAT-inclusive Grand Total. | ✅ |
| Hold-tab Collect Bill (PayLater) | `CollectBillPanelDrawer.jsx` renders the same `CollectPaymentPanel` (verified in ON_HOLD_PAYMENT_BRANCH_VALIDATION.md). Fix applies automatically; PayLater `payment_status: sucess` line in `collectBillExisting` preserved. | ✅ |
| Runtime-complimentary VAT item | `buildCartItem` / `collectBillExisting` already emit `vat_amount = '0.00'` when `isRuntimeComp`. `billableItems` filter in CollectPaymentPanel already carves them out of the tax base. Order-level `vat_tax` excludes complimentary lines. | ✅ |
| Reprint-from-dashboard-card (no override) | `buildOrderTempStorePayload` default path at L1471 (`if (taxType === 'VAT') vat_tax += taxAmt`) was already VAT-correct; not modified. | ✅ regression-safe |
| Place-order / update-order / place-order-with-payment payload | `calcOrderTotals` was already VAT-correct (L598–L670); not modified. | ✅ regression-safe |

---

## 5. Findings summary

| Field | Value |
|---|---|
| Overall verdict | **PASS** |
| Cases validated | 8 / 8 |
| Cases pass | 8 / 8 |
| Cases fail | 0 |
| Regressions found | 0 |
| Untested-but-traced edge cases | 8 (all pass via code trace) |
| Files changed by fix | 1 source file + 1 doc (per implementation report; commit `07c60b3`) |
| Forbidden files touched | 0 |
| Lint status (re-checked) | already confirmed clean by implementer; not re-run here (read-only validation) |

---

## 6. Caveats (validation method limits)

- **No live browser test was executed.** The handover §6.5 explicitly defers manual QA to the owner and instructs not to invoke `testing_agent_v3` unless asked. The 16-case manual QA matrix in handover §6.3 remains the owner's to walk through against the running preview build.
- **No screenshot / network-tab capture.** Per the same handover guidance.
- **Code-trace confidence is high** because every consumer of the modified outputs (`vatAmount`, `vatTax`, `finalTotal`, `taxTotals.vat`) was actually read in source — not assumed.
- **One residual open question** (already flagged in implementation report §6 item 3): the backend may have had a defensive recompute on BILL_PAYMENT when `vat_tax === 0`. Now that the payload carries a real value, behaviour may flip. Coordinate with backend owner before live cutover.

---

## 7. Action items for owner

| # | Action | Priority |
|---|---|---|
| 1 | Manually walk the 16-case QA matrix (handover §6.3) against the running preview build. | Recommended |
| 2 | Confirm with backend owner that non-zero `vat_tax` on the BILL_PAYMENT endpoint is honoured (place-order already does this and works). | Recommended |
| 3 | On the first VAT-order print after cutover, visually inspect the printed bill template renders the VAT line correctly (in case the template suppressed `vat_tax === 0` rows). | Recommended |
| 4 | Decision deferred to next CR: VAT rate handling on SC / Tip / Delivery for UAE / Africa restaurants (Owner Decision #2 strictly out of scope here). | Future |

---

— End of QA report.
