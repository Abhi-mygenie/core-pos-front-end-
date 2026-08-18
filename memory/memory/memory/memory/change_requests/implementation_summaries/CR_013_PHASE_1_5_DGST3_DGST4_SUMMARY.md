# CR-013 Phase 1.5 — D-GST-3 Payload-Fill + D-GST-4 UI Breakdown · Implementation Summary

**Type:** Implementation summary (code shipped + doc artifact)
**Agent:** CR-013 / CR-008 Round-3 Continuation + Approval-Gate Agent
**Date:** 2026-05-05
**Branch:** `5may`
**Status:** **`shipped_phase_1_5_pending_runtime_qa`** (+ Fix-1 + Fix-2 applied 2026-05-05)
**Owner approval:** 2026-05-05 (Q1=yes · Q2=₹0.01 · Q3=both · Q4=defaults · plus round-off-only-for-Grand-Total directive · Fix-1 = "fix 1 only" — single-line `deliver_charge_gst` settings fallback · Fix-2 = approved screenshot reproduction — pre-place delivery-charge handoff fallback)

---

## 0b. Hotfix — Phase 1.5 Fix-2 (delivery-charge handoff OrderEntry → CollectPaymentPanel)

**Reported by owner 2026-05-05 (with screenshots):** User typed ₹500 delivery charge in OrderEntry (Collect Bill button reflected ₹920 = items + GST + 500). On Collect Payment screen, Delivery Charge field showed ₹0 → delivery row hidden, Delivery GST hidden, Pay total ₹420 (delivery silently dropped).

**Root cause:** `OrderEntry.jsx:1190` passed `initialDeliveryCharge={orderFinancials.deliveryCharge}` — only populated by backend echo (placed orders + BUG-019 prepaid scans). For pre-place fresh delivery orders the user-typed amount lived in OrderEntry's local `deliveryCharge` React state, which the prop never read → CollectPaymentPanel's lazy-init at `:149-153` saw `0`, rendered empty input.

**Fix:** `OrderEntry.jsx:1190` — additive `||` fallback to local state:
```jsx
// BEFORE
initialDeliveryCharge={orderFinancials.deliveryCharge}

// AFTER
initialDeliveryCharge={orderFinancials.deliveryCharge || (Number(deliveryCharge) || 0)}
```

**Backup:** `OrderEntry.jsx.bak.cr013p15-fix2` (107890 bytes). **Lint:** clean. **Webpack:** auto-reloaded successfully. **Frontend HTTP:** 200.

**Behaviour matrix post-fix:**

| Scenario | `orderFinancials.deliveryCharge` | local `deliveryCharge` | Final `initialDeliveryCharge` | Behaviour |
|---|---|---|---|---|
| Pre-place fresh delivery, ₹500 typed | 0 | 500 | **500** | Delivery row + GST line render; Pay correct |
| BUG-019 scan prepaid delivery | 500 (backend) | 500 (synced via setter L314/350) | 500 | Same as before; D1-Gate still locks field |
| Re-engaged placed delivery | 500 (backend) | 500 (synced via setter L428) | 500 | Same as before |
| Pre-place delivery, no charge | 0 | 0 | 0 | Same as before — no row |
| Non-delivery order | n/a | n/a | n/a (prop unused; orderType gate) | Same as before |

**Preservation checks:**
- BUG-019 prepaid scan path: first operand wins → identical behaviour ✅
- D1-Gate `readOnly={isPrepaid}` derives from order origin, not from this prop → unaffected ✅
- CR-008 D1-Cap Round-2 / Round-3 OrderEntry `total` math: untouched (this fix lives only on the prop hand-off) ✅
- CR-013 D-GST-1 / D-GST-2 / G3 / D-GST-3 / D-GST-4 / Phase 1.5 Fix-1: untouched ✅
- `/app/memory/final/`: untouched ✅
- Backend: untouched ✅

---

---

## 0. Hotfix — Phase 1.5 Fix-1 (delivery GST nested-key path)

**Reported by owner 2026-05-05:** Delivery GST breakdown line not rendering on Bean Me Up (id=742) despite tenant having `deliver_charge_gst = 18%`.

**Live profile API confirmed via preprod (`owner@beanmeup.com`):**
- `restaurants[0].service_charge_tax = "18.00"` (root) ✅ — already worked
- `restaurants[0].deliver_charge_gst = null` (root, MISSING)
- `restaurants[0].settings.deliver_charge_gst = "18.00"` (NESTED) — FE never read this path

**Fix:** `profileTransform.js:136` — additive nullish-coalescing fallback:
```js
deliveryChargeGstPct: parseTaxPct(api.deliver_charge_gst ?? api.settings?.deliver_charge_gst),
```

`service_charge_tax` (line 135) intentionally NOT given a settings fallback per owner directive "fix 1 only" — no tenant in the cohort exhibits `service_charge_tax` nesting today.

**Backup:** `profileTransform.js.bak.cr013p15-fix1` (11037 bytes)
**Lint:** clean. **Webpack:** auto-reloaded successfully. **Frontend HTTP:** 200.

**Live verification (Bean Me Up id=742):**
| Field | Pre-Fix-1 | Post-Fix-1 |
|---|---|---|
| `restaurant.deliveryChargeGstPct` | `0` | `18` |
| Bill Summary "CGST on Delivery 9.00%" line on a ₹100 delivery order | hidden | renders ₹9.00 |
| Bill Summary "SGST on Delivery 9.00%" line | hidden | renders ₹9.00 |

**Tenant cross-check:**
| Tenant | `service_charge_tax` (root) | `deliver_charge_gst` (root) | `settings.deliver_charge_gst` | Effect post-Fix-1 |
|---|---|---|---|---|
| Bean Me Up (742) | `"18.00"` | `null` | `"18.00"` | SC/Tip GST already worked; Delivery GST line now renders |
| Palm House (541) | `"0.00"` | `null` | `"0.00"` | All component GST lines stay correctly hidden (frozen-rule §10) |

**Tip GST observation (separate from Fix-1):** Owner reported "tip GST not getting added" on Bean Me Up. Live API shows `service_charge_tax = "18.00"` at root — math is therefore correct (`tipGst = tip × 0.18`). Most likely the owner was on a delivery order where SC line was hidden (BUG-013 gate) and the Tip CGST/SGST lines were visually adjacent to the (then-hidden) Delivery GST lines, making the breakdown look incomplete. Post-Fix-1, with Delivery GST lines now rendering, the full breakdown should be visible. Pending owner runtime confirmation; no code change made for this observation.

---

---

## 1. What shipped

### Bucket D-GST-3 — Persist real values in existing payload keys
| Site | File:line | Pre-Phase-1.5 | Phase 1.5 |
|---|---|---|---|
| `placeOrder` payload | `orderTransform.js:746` (was 755) | `service_gst_tax_amount: 0`, `tip_tax_amount: 0` | flow from `...totals` (calcOrderTotals) |
| `updateOrder` payload | `orderTransform.js:835` (was 844) | same hardcoded zeros | same fix |
| `placeOrderWithPayment` payload | `orderTransform.js:935` (was 944) | same hardcoded zeros | same fix |
| `BILL_PAYMENT` (collectBillExisting) | `orderTransform.js:1108-1110` (was 1102-1104) | hardcoded zeros | reads `paymentData.serviceGstTaxAmount` + `paymentData.tipTaxAmount` |
| `transferToRoom` payload | `orderTransform.js:1175-1176` (was 1168-1169) | hardcoded zeros | same — reads `paymentData.serviceGstTaxAmount` + `paymentData.tipTaxAmount` |

**Source values:** `serviceCharge × scTaxRate` and `tipAmount × scTaxRate`. `scTaxRate = restaurant.serviceChargeTaxPct / 100` (already parsed by CR-013 D-GST-1).

### Bucket D-GST-4-UI — Collect Bill component-wise breakdown
- File: `CollectPaymentPanel.jsx` Bill Summary "Taxes" block (~L1493-1574 after edit).
- Old: single `SGST` + single `CGST` row.
- New: per-component breakdown — Item GST pair + SC GST pair (gated `scGst > 0`) + Tip GST pair (gated `tipGst > 0`) + Delivery GST pair (gated `deliveryGst > 0`).
- Rate labels: SC / Tip / Delivery carry the configured rate (`<scTaxPct/2>%` or `<delTaxPct/2>%` per side). Item lines have no rate suffix because items can carry mixed rates.
- Round Off: separate row, displays only if non-zero. Round-off **does NOT** apply to component values (owner directive).
- `data-testid` anchors: `bill-tax-breakdown`, `bill-tax-cgst-items` / `bill-tax-sgst-items`, `bill-tax-cgst-sc` / `bill-tax-sgst-sc`, `bill-tax-cgst-tip` / `bill-tax-sgst-tip`, `bill-tax-cgst-delivery` / `bill-tax-sgst-delivery`, `bill-round-off`.

### Bucket D-GST-4-PARITY — Console-warn parity guardrail
- File: `CollectPaymentPanel.jsx` math block (after `cgst` rounded value).
- Tolerance: **₹0.01** (one paisa, owner-confirmed).
- Compares `itemGstPostDiscount + scGst + tipGst + deliveryGst` (LHS) vs `totalGst` (RHS) **before final round-off**.
- Output: `console.warn('[CR-013 PARITY] Component-sum vs composite GST mismatch', { ... })` with full numeric snapshot + `restaurantId` + `orderType`. Diagnostic only — never blocks the bill.

### Bucket D-GST-4-PRINT-PAYLOAD — Composite split on print
- File: `orderTransform.js:1518-1520` (`buildBillPrintPayload` return).
- Added: `cgst_amount: Math.round((finalGstTax / 2) * 100) / 100` + `sgst_amount: Math.round((finalGstTax / 2) * 100) / 100`.
- Existing `gst_tax: finalGstTax` preserved (additive change, no key removal).
- Round-off NOT applied to component values — passes raw composite halves.
- Backend-rendered template: if BE-G10 confirms auto-render, the printed bill will show CGST + SGST split immediately. Otherwise BE-G11 in Phase 3 CR.

### Round-3 hotfix preservation
- CR-008 Round-3 (delivery double-count fix) closure summary written:
  `/app/memory/change_requests/implementation_summaries/CR_008_D1_CAP_ROUND_3_DELIVERY_DOUBLE_FIX_SUMMARY.md`.

### Phase 3 CR opened (planning, no code)
- `/app/memory/change_requests/phase_3/CR_013_P3_PRINT_TEMPLATE_PER_COMPONENT_TAX.md`
- Captures BE-G10 (auto-render confirmation) + BE-G11 (per-component template slots) + BE-G9 (delivery GST persistence).

---

## 2. Files touched

| File | Backup | Lint | Net change |
|---|---|---|---|
| `frontend/src/api/transforms/orderTransform.js` | `.bak.cr013p15` ✅ | ✅ Clean | calcOrderTotals exposes 2 new return keys; 5 payload sites switch from hardcoded 0 to real values; print payload gains `cgst_amount` + `sgst_amount` |
| `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | `.bak.cr013p15` ✅ | ✅ Clean | Bill Summary tax block replaced with per-component breakdown; parity guardrail added; paymentData carries `serviceGstTaxAmount` + `tipTaxAmount` |

No other source file touched. No `/app/memory/final/` edit. No backend touch.

---

## 3. Round-off rule (owner directive 2026-05-05)

**Applies ONLY to:** the final `order_amount` (Grand Total). BUG-009 fractional rounding rule continues to govern this single line.

**Does NOT apply to:**
- `itemGstPostDiscount`
- `scGst` / `tipGst` / `deliveryGst`
- `service_gst_tax_amount` / `tip_tax_amount` payload fields
- CGST / SGST component half-splits on Bill Summary UI
- Component-sum parity check (LHS / RHS both pre-round-off)

Each component value is stored at 2-decimal precision (`Math.round(x * 100) / 100`) — but never further rounded by BUG-009 ceil/floor logic.

The "Round Off" line on the Bill Summary continues to display the difference between `rawFinalTotal` and `finalTotal` (= `orderAmount`) — i.e. the BUG-009 adjustment — and renders ABOVE Grand Total.

---

## 4. Validation done

| Check | Status |
|---|---|
| `yarn lint` on `orderTransform.js` | ✅ No issues |
| `yarn lint` on `CollectPaymentPanel.jsx` | ✅ No issues |
| Webpack compile (supervisor frontend log) | ✅ "Compiled successfully" — confirmed live |
| Frontend HTTP 200 on `localhost:3000` | ✅ |
| Backups created before edit | ✅ Both `*.bak.cr013p15` files present |
| `/app/memory/final/` untouched | ✅ |
| CR-008 D1-Cap / D1-Gate / Round-3 untouched | ✅ verified by file diff scope |
| CR-013 D-GST-1 / D-GST-2 / G3 untouched | ✅ verified |
| Backend untouched | ✅ |

---

## 5. Validation pending (for next QA session)

- **Visual matrix on preprod tenant 541** (Palm House, all 3 GST rates configured):
  1. dineIn with items + SC + tip → all 4 GST pairs render with correct labels
  2. takeAway with items + tip → only Item + Tip pairs (SC line hidden, but Tip rides SC rate)
  3. delivery (postpaid) with items + tip + delivery → 3 pairs
  4. delivery (prepaid scan) — same math + D1-Gate `readOnly={true}` preserved
  5. Profile rates all 0 → no per-component pairs render (compact UI)
  6. Discount applied → item GST proration correct; SC/Tip/Delivery GST unaffected
  7. Round-off non-zero → "Round Off" row appears between breakdown and Grand Total
  8. Re-print of an existing order via `RePrintButton` → matches original-bill totals
  9. Synthetic dev-only mismatch → parity console.warn fires with full snapshot

- **Payload diff snapshot** (`BILL_PAYMENT`) — confirm `service_gst_tax_amount` + `tip_tax_amount` shift from 0 → real values without disturbing other keys.

- **Print payload diff snapshot** — confirm `cgst_amount` + `sgst_amount` are added without disturbing `gst_tax`.

- **CR-008 Round-3 lint re-run** for audit completeness (per the Round-3 closure summary §7).

---

## 6. Regression-locked surfaces (verified untouched)

- CR-008 Sub-CR #1 D1-Cap (capture UI + payload) — not in edit set
- CR-008 Sub-CR #1 D1-Cap Round-2 (delivery fold in `calcOrderTotals`) — preserved (delivery GST math at calcOrderTotals L597-600 unchanged)
- CR-008 Sub-CR #1 D1-Cap Round-3 (`OrderEntry.jsx` symmetric `total` + `CartPanel.jsx` button label) — not in edit set
- CR-008 Sub-CR #1 D1-Gate (`readOnly={isPrepaid}` at `CollectPaymentPanel.jsx`) — not in edit set
- CR-013 D-GST-1 (profileTransform parse) — not in edit set
- CR-013 D-GST-2 (rate-driven multipliers) — preserved (math result identical; only field exposure changed)
- CR-013 G3 (re-print fallback) — not in edit set
- BUG-009 fractional rounding — preserved (still applies ONLY to `orderAmount`)
- BUG-013 SC applicability gate — preserved
- BUG-019 prepaid round-trip — preserved
- BUG-232 wording (legacy `service_gst_tax_amount` zero) — comment updated to record reversal
- Reports / Module 10 — not in edit set
- Room billing/print lifecycle (OQ-12) — not in edit set
- `/app/memory/final/` — UNTOUCHED

---

## 7. Rollback plan

| Step | Command |
|---|---|
| Restore `orderTransform.js` | `cp /app/frontend/src/api/transforms/orderTransform.js.bak.cr013p15 /app/frontend/src/api/transforms/orderTransform.js` |
| Restore `CollectPaymentPanel.jsx` | `cp /app/frontend/src/components/order-entry/CollectPaymentPanel.jsx.bak.cr013p15 /app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` |
| Verify | `yarn lint` + supervisor frontend log "Compiled successfully" |

Rolling back Phase 1.5 leaves CR-013 D-GST-1 / D-GST-2 / G3 intact (those were applied earlier with `*.bak.cr013` baselines). The `*.bak.cr013p15` files are taken from the post-D-GST-1/2/G3 state.

---

## 8. Trail of artifacts

- This file: `/app/memory/change_requests/implementation_summaries/CR_013_PHASE_1_5_DGST3_DGST4_SUMMARY.md`
- CR-008 Round-3 closure: `/app/memory/change_requests/implementation_summaries/CR_008_D1_CAP_ROUND_3_DELIVERY_DOUBLE_FIX_SUMMARY.md`
- Phase 3 backend ask: `/app/memory/change_requests/phase_3/CR_013_P3_PRINT_TEMPLATE_PER_COMPONENT_TAX.md`
- CR-013 Frozen Logic: `/app/memory/change_requests/requirements/CR_013_FROZEN_BUSINESS_LOGIC.md` (addendum recommended after BE-G10/G11 close — records OD-D1 / OD-D3 relaxation)
- Display Breakdown Plan: `/app/memory/change_requests/implementation_plans/CR_013_DISPLAY_BREAKDOWN_PLAN.md`
- Backups: `orderTransform.js.bak.cr013p15` (72.8 KB), `CollectPaymentPanel.jsx.bak.cr013p15` (115.9 KB)

---

**Stop. No further source change. Owner runtime QA + payload diff capture remain. CR-008 D1-Gate / D1-Cap / Round-3 + CR-013 D-GST-1 / D-GST-2 / G3 + `/app/memory/final/` + backend untouched.**

— End of CR-013 Phase 1.5 Implementation Summary —
