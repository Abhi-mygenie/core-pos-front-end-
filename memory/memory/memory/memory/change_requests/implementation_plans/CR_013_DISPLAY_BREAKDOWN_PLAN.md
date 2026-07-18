# CR-013 Display Breakdown — Plan & Backend-Keys Audit

**Type:** Planning + key-coverage audit (NOT implementation)
**Agent:** CR-013 Bucket-Plan Agent
**Date:** 2026-05-05
**Branch:** `5may`
**Status:** **`awaiting_owner_approval_d_gst_3_d_gst_4`**

**Owner directives captured 2026-05-05:**
1. ✅ Approve CR-008 Sub-CR #1 Round-3 hotfix (delivery double-count) — **SHIPPED in this session**
2. UX = always-visible per-component tax breakdown matching the user's reference screenshot
3. Yes — fill the existing-but-unused payload keys (`service_gst_tax_amount`, `tip_tax_amount`) with real values
4. Print bill must mirror the same breakdown — **and verify all relevant keys are present end-to-end**

> **Strict scope.** Plan only. No `/app/memory/final/` edits. CR-008 Sub-CR #1 D1-Cap / D1-Gate preserved. Existing CR-013 D-GST-1 / D-GST-2 / G3 ship intact.

---

## 1. Reference UX (locked target)

From your reference screenshot (Order #000076):

```
Bill Summary
─────────────────────────────────────────
Item Total                       ₹6300.00
Service Charge (Optional)         ₹315.00
─────────────────────────────────────────
Subtotal                         ₹6615.00
   CGST 9%                          ₹67.50      ← item GST half
   SGST 9%                          ₹67.50      ← item GST half
   VAT 22%                        ₹1221.00      ← item VAT
   CGST on SC 9%                    ₹28.35      ← SC GST half
   SGST on SC 9%                    ₹28.35      ← SC GST half
─────────────────────────────────────────
Grand Total                      ₹8028.00
```

### Key UX rules captured
- **Always-visible breakdown** — no collapsible chevron, no hover reveal
- **Each tax line carries its source AND rate** — `CGST on SC 9%`, `SGST on SC 9%`, `VAT 22%`, etc.
- **Subtotal line ABOVE tax breakdown** — "Items + SC + Tip + Delivery" pre-tax
- **Grand Total at the bottom in accent colour** (blue/primary)
- **Per-component tax lines hidden when value = 0** (avoid clutter when restaurant hasn't configured a rate)
- Math identical between **Collect Bill UI** and **printed bill**

### Extension to CR-013 components
The reference shows SC GST breakup. CR-013 introduces additional taxable components — same pattern applies:

```
Bill Summary
─────────────────────────────────────────
Item Total                          ₹X.XX
Service Charge (Optional)           ₹X.XX
Tip                                 ₹X.XX
Delivery Charge                     ₹X.XX
─────────────────────────────────────────
Subtotal                            ₹X.XX
   CGST 9%                          ₹X.XX
   SGST 9%                          ₹X.XX
   VAT 22%                          ₹X.XX
   CGST on SC <scTaxPct/2>%         ₹X.XX     ← only if SC GST > 0
   SGST on SC <scTaxPct/2>%         ₹X.XX     ← only if SC GST > 0
   CGST on Tip <scTaxPct/2>%        ₹X.XX     ← only if Tip GST > 0 (rides SC rate)
   SGST on Tip <scTaxPct/2>%        ₹X.XX     ← only if Tip GST > 0
   CGST on Delivery <delTaxPct/2>%  ₹X.XX     ← only if Delivery GST > 0
   SGST on Delivery <delTaxPct/2>%  ₹X.XX     ← only if Delivery GST > 0
─────────────────────────────────────────
Grand Total                         ₹X.XX
```

**Round-off line:** if BUG-009 fractional rounding produces a non-zero adjustment, render a single `Round Off  ₹±X.XX` line just above Grand Total (matches today's behaviour).

---

## 2. Backend-keys audit (Owner question #4)

I traced the full payload + socket-response shape. Here's the complete map.

### 2.1 Payload keys today (place-order request, sent by FE)

| Key | Today's value | Source | What it represents |
|---|---|---|---|
| `order_sub_total_amount` | computed | `calcOrderTotals` `subtotal` | Items sum (pre-discount, pre-tax) |
| `order_sub_total_without_tax` | same | same | Same value (legacy alias) |
| `tax_amount` | composite | `calcOrderTotals` `gstTax + vatTax` | Total tax composite (item GST + SC GST + tip GST + delivery GST + VAT) |
| `gst_tax` | composite | `calcOrderTotals` `gstTax` | Total GST composite |
| `vat_tax` | composite | `calcOrderTotals` `vatTax` | Total VAT composite |
| `order_amount` | composite | `calcOrderTotals` `orderAmount` | Grand Total |
| `round_up` | computed | `calcOrderTotals` | Rounding adjustment |
| `service_tax` | computed | `calcOrderTotals` `serviceCharge` | SC ₹ amount (NOT its GST) |
| **`service_gst_tax_amount`** | **hardcoded `0`** | `placeOrder` L755 | **Reserved for SC GST ₹** |
| `tip_amount` | hardcoded `0` (place-order) / real (Collect Bill `BILL_PAYMENT`) | L756 | Tip ₹ amount |
| **`tip_tax_amount`** | **hardcoded `0`** | L757 | **Reserved for Tip GST ₹** |
| `delivery_charge` | computed | L761 | Delivery ₹ amount |
| `discount_*`, `coupon_*`, `loyalty_*`, `wallet_*` | various | n/a | Untouched |

### 2.2 Socket-response keys today (echoed by backend)

| Key | Type | Today's frontend mapping | What it represents |
|---|---|---|---|
| `order_amount` | int | `order.amount` | Grand Total (echoed back) |
| `tax_amount` (NOT in your sample but earlier confirmed) | string | `order.taxAmount` | Composite tax echoed |
| **`total_service_tax_amount`** | string `"0.00"` | `serviceTax: parseFloat(api.total_service_tax_amount)` (orderTransform L187) | **SC GST ₹ — already parsed** |
| **`tip_tax_amount`** | string `"0.00"` | `tipTaxAmount: parseFloat(api.tip_tax_amount)` (L189) | **Tip GST ₹ — already parsed** |
| `tip_amount` | string `"0.00"` | `order.tipAmount` | Tip ₹ amount |
| `delivery_charge` | int `500` | `order.deliveryCharge` | Delivery ₹ amount |
| Per-line tax | array | inside `orderDetails` | Item-level GST + VAT per line |

### 2.3 Coverage matrix vs the reference UX

| Reference UX line | Data needed | Backend persisted? | Frontend has it today? | Action needed |
|---|---|---|---|---|
| **Item Total** | Items pre-tax sum | ✅ `order_sub_total_amount` | ✅ | None |
| **Service Charge (Optional)** | SC ₹ | ✅ `service_tax` | ✅ | None |
| **Tip** | Tip ₹ | ✅ `tip_amount` | ✅ | None |
| **Delivery Charge** | Delivery ₹ | ✅ `delivery_charge` | ✅ | None |
| **Subtotal** | derived (items + SC + tip + delivery, pre-tax) | n/a (compute) | ✅ via `subtotal + tip + delivery` | None |
| **CGST/SGST X%** (item) | item GST split | ✅ via per-line `gst_amount` × rate per line | ✅ via `taxTotals.sgst`/`cgst` | **Need: render with rate label** |
| **VAT X%** | item VAT | ✅ via per-line `vat_amount` × rate | ✅ via `taxTotals.vat` (if exists) or item.vat_tax | **Need: render with rate label; check if taxTotals exposes vat at all** |
| **CGST on SC X%** / **SGST on SC X%** | SC GST split | ✅ `total_service_tax_amount` (when filled) | ⚠️ today we send `service_gst_tax_amount: 0` → BE persists 0 → FE re-computes via `restaurant.serviceChargeTaxPct × service_tax / 2` for display. **Self-sufficient — no BE change.** | **D-GST-3:** fill `service_gst_tax_amount` with real value. **D-GST-4:** render with rate label |
| **CGST on Tip X%** / **SGST on Tip X%** | Tip GST split | ✅ `tip_tax_amount` (when filled) | ⚠️ today we send `0` → BE persists 0 → FE re-computes for display | **D-GST-3:** fill `tip_tax_amount`. **D-GST-4:** render with rate label |
| **CGST on Delivery X%** / **SGST on Delivery X%** | Delivery GST split | ❌ **NO dedicated key** — folded into `tax_amount` composite | FE-only (computed from `restaurant.deliveryChargeGstPct × delivery_charge / 2`) | **D-GST-4:** render with rate label (display-only, no BE persistence) |
| **Round Off** | adjustment | ✅ `round_up` | ✅ | None |
| **Grand Total** | final ₹ | ✅ `order_amount` | ✅ | None |

### 2.4 Verdict on backend coverage
- **SC GST + Tip GST:** ✅ persisted as separate columns — D-GST-3 just fills them with real values (no schema change).
- **Delivery GST:** ⚠️ NOT separately persisted. Two options:
  - **Option α (recommended for now):** display-only — FE computes `delivery_charge × deliveryChargeGstPct / 100` purely for display. Backend continues to fold delivery GST inside the `tax_amount` composite. ✅ zero backend work.
  - **Option β (future):** ask backend team to add a new persisted column `delivery_charge_gst_amount`. Out of CR-013 scope; would need a separate backend ticket.

For Phase 1 (this CR-013 follow-up), **Option α** is the path. Bills/audits stay numerically identical to today's `tax_amount` value; the per-line breakdown is a display layer only.

---

## 3. Implementation buckets

### Bucket D-GST-3 — Persist real values in existing payload keys

**Goal:** Fill `service_gst_tax_amount` and `tip_tax_amount` (and a parallel `tip_amount` on place-order paths that today hardcode 0) with the values CR-013 already computes.

| Aspect | Detail |
|---|---|
| File | `frontend/src/api/transforms/orderTransform.js` only |
| Functions touched | `placeOrder` (~L755), `updateOrder` (mirror), `placeOrderWithPayment` (already sends real tip_amount; just add real service_gst_tax_amount + tip_tax_amount) |
| What changes | Replace 3 hardcoded zeros: `service_gst_tax_amount: 0` → `service_gst_tax_amount: scGstAmount`. Same pattern for `tip_tax_amount`. `tip_amount` on `placeOrder`/`updateOrder` paths today is 0 (correct: tip is captured at Collect Bill, not at place-order time). Leave that as-is — only fill the GST sub-fields when SC ₹ and tip ₹ are non-zero |
| New computed values | `scGstAmount = serviceCharge × scTaxRate` and `tipGstAmount = tipAmount × scTaxRate`. Already computed inside `calcOrderTotals` as part of `gstTax`; need to expose them in the return value |
| Signature change to `calcOrderTotals` | Add `service_gst_tax_amount` and `tip_tax_amount` to the return object alongside existing `service_tax`. Backward-compatible (additive) |
| Risk | LOW — purely additive payload key fills; backend already accepts them |
| Backend coordination | Confirmation only — backend must continue to persist these as the FE-supplied values (echoed in `total_service_tax_amount` / `tip_tax_amount`). BE-G7 + BE-G8 below |

### Bucket D-GST-4 — Display per-component breakdown on Collect Bill + Print

**Goal:** Render the reference-UX layout in CollectPaymentPanel Bill Summary and on the printed bill.

| Aspect | Detail |
|---|---|
| Files | `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (Bill Summary section ~L1448-1480) + `frontend/src/api/transforms/orderTransform.js` `buildBillPrintPayload` (print payload — same line shapes added) + (potentially) the bill-print template renderer |
| Layout change | Replace today's combined `SGST` + `CGST` rows with: 1 item-GST pair, 1 VAT line, 1 SC-GST pair (only if `scGst > 0`), 1 tip-GST pair (only if `tipGst > 0`), 1 delivery-GST pair (only if `deliveryGst > 0`). All gated on > 0 to keep low-tax restaurants compact |
| Subtotal addition | New "Subtotal" line above the tax breakdown showing `Items + SC + Tip + Delivery` pre-tax |
| Rate labels | Computed dynamically: `CGST on SC ${scTaxPct/2}%`, `SGST on Tip ${scTaxPct/2}%`, etc. |
| Print parity | `buildBillPrintPayload` returns the same per-component lines. Print template renderer (in printer integration layer) consumes them or falls back gracefully |
| Risk | MEDIUM — Bill Summary is hotspot UI; rate-label string formatting needs i18n consideration |
| Backend coordination | None — display-only |

### Bucket D-GST-DOUBLE-FIX — ✅ ALREADY SHIPPED (this session)

`OrderEntry.jsx` L687-689 + `CartPanel.jsx:867`. Documented as **CR-008 Sub-CR #1 Round-3 hotfix**. Backups: `*.bak.cr008r3`. Will write a separate handover note.

---

## 4. Updated frozen-rule register

| OD | Original | Owner update 2026-05-05 | New status |
|---|---|---|---|
| OD-D1 — Print/bill component-wise breakup | NO | **YES** (per reference UX) | **RELAXED** |
| OD-D2 — Reports component-wise display | NO | **NO change** (BE owns reports per MC-06; FE doesn't drive reports here) | Unchanged |
| OD-D3 — Payload component-wise persistence | NO | **YES, via existing keys only** (`service_gst_tax_amount`, `tip_tax_amount`) — no new keys, no new BE schema | **RELAXED (in-place)** |

Frozen Business Logic doc rows §1.11, §1.13, §10 require an addendum. I propose appending a "Frozen Logic Addendum 2026-05-05" section to `CR_013_FROZEN_BUSINESS_LOGIC.md` rather than rewriting (keeps audit trail clean).

---

## 5. Backend confirmations — added rows

| ID | Question | Confirmation route | Blocker for ship? |
|---|---|---|---|
| **BE-G7** | Confirm backend stores `service_gst_tax_amount` from FE payload as `total_service_tax_amount` in DB and echoes it back via socket | Backend Contract Agent intake | NO — D-GST-3 is FE-only; if BE drops the value, display still works because FE computes its own |
| **BE-G8** | Same for `tip_tax_amount` | Same | NO |
| **BE-G9** *(future, optional)* | Backend exposure of `delivery_charge_gst_amount` as a separate column | Future ticket | NO — Option α handles this display-only |

---

## 6. Approval gates

| Gate | Subject | Required before |
|---|---|---|
| **G6** | Approve **D-GST-3** (persist) | Implementer touches `orderTransform.js` for `service_gst_tax_amount` / `tip_tax_amount` fill |
| **G7** | Approve **D-GST-4** (display) | Implementer touches `CollectPaymentPanel.jsx` Bill Summary section |
| **G8** | Approve **frozen-doc addendum** | Editing `CR_013_FROZEN_BUSINESS_LOGIC.md` to record OD-D1 / OD-D3 relaxation |
| **G9** | Approve **Round-3 handover doc** | Authoring `CR_008_SUB_1_ROUND_3_DELIVERY_DOUBLE_COUNT_HOTFIX.md` (records the hotfix that shipped this session) |

---

## 7. Recommended sequence

1. **Now (this session, post-approval):** D-GST-3 (persist) → small, low-risk, foundational for D-GST-4. Validate no behavioural change visible.
2. **Then:** D-GST-4 (display) → renders the reference UX. Two screens: (a) Collect Bill, (b) printed bill template.
3. **In parallel:** G8 frozen-doc addendum + G9 Round-3 handover note.
4. **Defer:** BE-G7 / BE-G8 confirmation requests (non-blocking).

---

## 8. Owner approval question

Three approvals needed; pick any combination:

> ### **Approve D-GST-3 (persist) — fill `service_gst_tax_amount` + `tip_tax_amount` with real values?**
> Single-file FE change, payload-additive, no backend schema change. Risk LOW.

> ### **Approve D-GST-4 (display) — render the reference-UX breakdown on Collect Bill + Print?**
> CollectPaymentPanel hotspot edit + print payload mirror. Risk MEDIUM.

> ### **Approve G8/G9 doc addendum + Round-3 handover note (post-implementation)?**

### Reply options
- **(a) Approve D-GST-3 + D-GST-4 together (Round-3 docs auto-approved)** → I implement both buckets sequentially, then write addendum + handover.
- **(b) Approve D-GST-3 only; review before D-GST-4** → I ship the payload-fill bucket first (no behavioural change visible yet), you review, then approve D-GST-4 separately.
- **(c) Hold D-GST-3/4 — ship only the doc addendum + Round-3 handover note for what's already done** → no further code changes until later session.

---

**Stopping here. No further code changes since the Round-3 hotfix shipped above. CR-008 Sub-CR #1 D1-Cap/D1-Gate untouched. CR-013 D-GST-1/D-GST-2/G3 untouched. `/app/memory/final/` untouched.**

— End of CR-013 Display Breakdown Plan & Backend-Keys Audit —
