# BUG-659 — Impact Analysis (Gate 2)

**ID:** BUG-659
**Date:** 2026-11-08
**Agent:** Planning (Gate 2 — Impact Analysis only)
**Code Reality:** NONE (no BUG-659 markers in codebase)
**Conflict Pre-Check:** See §3

---

## 1. Summary

Manual bill-reprint paths (P5a-c: RePrintButton, OrderCard, TableCard; P6a-b: AllOrdersReportPage, OrderReportBetaPage) pass minimal overrides to `printOrder()` → `buildBillPrintPayload()`. The builder's default branch (L1983-2033) lacks fallbacks for `discount_percentage` and `roundoff` from the stored order. Backend fix (2026-11-07) now returns `discount_value`, `discount_type`, and `round_up` from `get-single-order-new`, but `fromAPI.order` does not map these fields, so the default branch cannot fall back to them.

**Risk:** CRITICAL (financial, print, R5 hotspot)

---

## 2. Data Flow Trace

### Working Path (auto-print via CollectPaymentPanel)

```
CollectPaymentPanel.handleConfirm()
  → builds paymentData with roundOff, discounts.orderDiscountPercent
  → OrderEntry.onPaymentComplete → autoPrintNewOrderIfEnabled
  → builds overrides with:
      discountPercent: paymentData.discounts.orderDiscountPercent
      roundoff:        paymentData.roundOff
      discountAmount:  computed distribution total
      orderItemTotal:  (triggers hasFinancialOverrides=true at L1901)
  → printOrder(..., overrides)
  → buildBillPrintPayload: hasFinancialOverrides=TRUE → COLLECT BILL PATH (L1905-1982)
  → Payload includes discount_percentage, roundoff, discount_amount ✅
```

### Broken Path (manual reprint — P5a RePrintButton)

```
PrintBillButton.handlePrintBill() (RePrintButton.jsx L105)
  → printOrder(orderId, 'bill', null, order, scPctForPrint, {
      serviceChargeTaxPct: ...,     ← ONLY these two fields
      deliveryChargeGstPct: ...,
    }) (L115-118)
  → buildBillPrintPayload: hasFinancialOverrides=FALSE (L1901)
  → MANUAL PRINT PATH (L1983-2033)
  → Payload output at L2169-2173:
      discount_amount:    falls back to order.discount = parseFloat(order.discount) || 0
                          → Currently works (BUG-592 fixed this to read restaurant_discount_amount)
                          → ✅ order.discount = 119.05 (correct after BUG-592 fix)
      discount_percentage: overrides.discountPercent is undefined → conditional spread → OMITTED ❌
      roundoff:            overrides.roundoff is undefined → conditional spread → OMITTED ❌
```

### BREAK POINTS (6 total)

| # | Location | Issue | Fix Strategy |
|---|----------|-------|-------------|
| **B1** | `fromAPI.order` (orderTransform.js L196-245) | `discount_value`, `discount_type`, `round_up` NOT mapped from API | Add 3 new fields to order object |
| **B2** | `buildBillPrintPayload` L2171 | `discount_percentage` conditional spread only reads `overrides.discountPercent` — no fallback to stored order | Add order-field fallback when overrides absent |
| **B3** | `buildBillPrintPayload` L2172-2173 | `roundoff` conditional spread only reads `overrides.roundoff` — no fallback to stored order | Add order-field fallback when overrides absent |
| **B4** | `RePrintButton.jsx` L115-118 | Missing override keys | NO change needed (fix is in builder) |
| **B5** | `OrderCard.jsx` L257-260 | Missing override keys | NO change needed (fix is in builder) |
| **B6** | `TableCard.jsx` L232-235 | Missing override keys | NO change needed (fix is in builder) |

---

## 3. Conflict Pre-Check

### FILE_OWNERSHIP — Last modifiers of `orderTransform.js`

| Entry | CR/BUG | Date |
|-------|--------|------|
| `fromAPI.order` L231-233 | BUG-592 (discount_value fallback removed) | 2026-11-07 |
| `buildBillPrintPayload` L2170 | CR-513 (additive print keys) | 2026-11-07 |
| `buildBillPrintPayload` L2030-2031 | BUG-536 (SC GST manual print) | 2026-10-12 |
| `buildBillPrintPayload` L2225-2226 | BUG-556 (paymentStatus/Method) | 2026-10-16 |

### Active items on same file (status ≠ CLOSED)

| ID | Status | Scope | Conflict? |
|----|--------|-------|-----------|
| **CR-513** | GATE_5A_IMPLEMENTED (awaiting QA) | L2170-2173 (additive keys in builder output) | **YES — same lines.** BUG-659 modifies the same L2171-2173 block. Execution order: **CR-513 QA first → then BUG-659.** Fix is additive (BUG-659 adds fallback; CR-513 added the override-only conditional). No conflict if CR-513 is QA-passed first. |
| **BUG-592** | GATE_5A_IMPLEMENTED (awaiting QA) | L233 (fromAPI.order discount mapping) | **ADJACENT.** BUG-659 adds new fields near L233 but does NOT modify L233 itself. Parallel-safe. |
| BUG-487 | GATE_5A_IMPLEMENTED | roomInfo mapping (L421) | No conflict — different section |
| BUG-639/641 | GATE_3/5A | complimentary items | No conflict — different section |
| CR-409/412 | GATE_5A/6 | coupon/loyalty | No conflict — different section |

**CONFLICT DECLARATION:**
`"CONFLICT with CR-513 on orderTransform.js L2171-2173. Execution order: BUG-659 AFTER CR-513 QA (same lines, additive fix on top of CR-513's conditional spreads)."`

---

## 4. Affected Files

### Files WILL change

| # | File | Section | Change |
|---|------|---------|--------|
| **E1** | `src/api/transforms/orderTransform.js` (R5) | `fromAPI.order` (~L233) | Add 3 new mapped fields: `discountValue`, `discountType`, `roundUp` |
| **E2** | `src/api/transforms/orderTransform.js` (R5) | `buildBillPrintPayload` (~L2171-2173) | Add order-field fallbacks when overrides are absent |

### Files will NOT touch

| File | Reason |
|------|--------|
| `RePrintButton.jsx` | Fix is in builder — callers stay unchanged |
| `OrderCard.jsx` (cards/) | Fix is in builder |
| `TableCard.jsx` (cards/) | Fix is in builder |
| `AllOrdersReportPage.jsx` | Calls `get-single-order-new` → `fromAPI.order` → builder. Auto-benefits. |
| `OrderReportBetaPage.jsx` | Same — calls `get-single-order-new` → `fromAPI.order` → builder. Auto-benefits. |
| `CollectPaymentPanel.jsx` | Working path (hasFinancialOverrides=true). Not touched. |
| `OrderEntry.jsx` | Working auto-print paths. Not touched. |

---

## 5. Detailed Edit Analysis

### E1: Map new backend fields in `fromAPI.order`

**Location:** `orderTransform.js` L233 area (after `discount` field)

**Current (L233):**
```js
discount: parseFloat(api.restaurant_discount_amount || 0) || 0, // BUG-592: no discount_value fallback
```

**New fields to add (after L233):**
```js
discountValue: parseFloat(api.discount_value) || 0,          // BUG-659: raw discount input (50 for 50%)
discountType: api.discount_type || api.order_discount_type || null, // BUG-659: 'Percent' or 'Amount' or null
roundUp: parseFloat(api.round_up) || 0,                       // BUG-659: backend-stored round-up value
```

**Backend API field mapping (from post-fix probe):**

| Backend field | Value (order 1537857) | Maps to |
|---|---|---|
| `discount_value` | "50.00" | `order.discountValue` (float 50) |
| `discount_type` | "Percent" | `order.discountType` ("Percent") |
| `order_discount_type` | "Percent" | fallback for `discountType` |
| `round_up` | "0.49" | `order.roundUp` (float 0.49) |

**Downstream consumers:** Only `buildBillPrintPayload` (E2 below). No other consumer reads these fields today. Adding them is purely additive and safe.

---

### E2: Add fallbacks in `buildBillPrintPayload` default branch output

**Location:** `orderTransform.js` L2169-2173

**Current (L2169-2173):**
```js
discount_amount: overrides.discountAmount !== undefined ? overrides.discountAmount : (parseFloat(order.discount) || 0),
// CR-513: additive print keys — omitted when not applicable (owner OD-513-05/10)
...(parseFloat(overrides.discountPercent) > 0 ? { discount_percentage: parseFloat(overrides.discountPercent) } : {}),
...(Number.isFinite(parseFloat(overrides.roundoff)) && parseFloat(overrides.roundoff) !== 0
    ? { roundoff: Math.round(parseFloat(overrides.roundoff) * 100) / 100 } : {}),
```

**Analysis of current behavior:**

| Field | Override path (collect-bill) | Default path (manual reprint) | Bug |
|---|---|---|---|
| `discount_amount` (L2169) | `overrides.discountAmount` | `order.discount` (= 119.05 ✅) | **No bug** — BUG-592 fixed this |
| `discount_percentage` (L2171) | `overrides.discountPercent` (e.g. 50) | **OMITTED** (overrides undefined → spread is empty) | **BUG** ❌ |
| `roundoff` (L2172-2173) | `overrides.roundoff` (e.g. 0.50) | **OMITTED** (overrides undefined → spread is empty) | **BUG** ❌ |

**Proposed fix — add order-field fallbacks:**

For `discount_percentage` (L2171): When `overrides.discountPercent` is absent, fall back to `order.discountValue` ONLY when `order.discountType === 'Percent'` (a flat discount of ₹50 must NOT be emitted as `discount_percentage: 50`).

For `roundoff` (L2172-2173): When `overrides.roundoff` is absent, fall back to `order.roundUp`.

**Exact proposed code (L2169-2173 replacement):**
```js
discount_amount: overrides.discountAmount !== undefined ? overrides.discountAmount : (parseFloat(order.discount) || 0),
// CR-513 + BUG-659: discount_percentage — override first, then stored order fallback (percent type only)
...((() => {
  const pct = overrides.discountPercent !== undefined ? parseFloat(overrides.discountPercent) : (order.discountType === 'Percent' ? order.discountValue : 0);
  return pct > 0 ? { discount_percentage: pct } : {};
})()),
// CR-513 + BUG-659: roundoff — override first, then stored order fallback
...((() => {
  const ro = overrides.roundoff !== undefined ? parseFloat(overrides.roundoff) : (order.roundUp || 0);
  return Number.isFinite(ro) && ro !== 0 ? { roundoff: Math.round(ro * 100) / 100 } : {};
})()),
```

---

## 6. Risk Register

| # | Risk | Mitigation |
|---|------|-----------|
| R1 | `order.discountType` is null/undefined for old orders placed before backend fix | Fallback chain: `api.discount_type || api.order_discount_type || null`. When null, `order.discountType === 'Percent'` is false → `discount_percentage` omitted (same as current behavior — no regression). |
| R2 | `order.roundUp` is 0 or null for orders without roundoff | `ro = 0` → `ro !== 0` check → omitted (same as current). No regression. |
| R3 | Flat discount (₹50 off) emitted as `discount_percentage: 50` | Guarded by `order.discountType === 'Percent'` check. Flat discounts have `discountType = 'Amount'` → fallback = 0 → omitted. |
| R4 | 1-paise roundoff divergence (FE 0.50 vs backend 0.49) | Pre-existing issue documented in investigation §8. Using backend's `round_up` (0.49) on reprint is more correct than omitting entirely. Owner can decide separately. |
| R5 | CR-513 conflict on L2171-2173 | Additive — BUG-659 wraps CR-513's conditional spread with an additional fallback. Execute AFTER CR-513 QA. |
| R6 | Report reprints (P6a/P6b) call `get-single-order-new` → `fromAPI.order` | These paths auto-benefit from E1 mapping + E2 fallbacks. No additional changes needed. |

---

## 7. Owner Decisions

**None required.** Investigation resolved all unknowns. The fix is deterministic:
- Map 3 new backend fields (E1)
- Add fallbacks in builder output (E2)
- All edge cases handled by type-check guards (R1-R3)

**One informational note for owner awareness:**
- Reprint `roundoff` will use backend's `round_up` value (0.49 for order 1537857), which differs by 1 paise from the auto-print value (0.50). This is a pre-existing FE↔backend GST computation divergence, NOT a new bug. The reprint is now MORE correct (using backend's authoritative value) than the current behavior (omitting roundoff entirely).

---

## 8. Scope Summary

| Metric | Value |
|--------|-------|
| Files changed | 1 (`orderTransform.js` — R5 hotspot) |
| Edit sites | 2 (E1: `fromAPI.order`, E2: `buildBillPrintPayload`) |
| Lines added | ~6 (3 mapping + 3 fallback replacement) |
| Lines modified | 2-3 (L2171-2173 replacement) |
| Risk | CRITICAL |
| Dependency | CR-513 QA must pass first |
| Code paths fixed | P5a (RePrintButton), P5b (OrderCard), P5c (TableCard), P6a (AllOrdersReportPage), P6b (OrderReportBetaPage) — all 5 auto-benefit |
| Code paths unaffected | P1-P4 (collect-bill auto-print) — working, untouched |
| Regression risk | LOW (fallback chain preserves current behavior for null/missing fields) |

---

**Impact Analysis complete for BUG-659. Awaiting owner review → Gate 3.**
