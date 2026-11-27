# BUG-659 — Implementation Plan (Gate 3)

**ID:** BUG-659
**Date:** 2026-11-08
**Agent:** Planning (Gate 3 — Implementation Plan)
**Impact Analysis:** `impact/BUG-659_IMPACT_ANALYSIS.md` (Gate 2 — 2026-11-08)
**Anchors verified at HEAD:** YES (2026-11-08, file 2291 lines)
**Conflict:** CR-513 on L2171-2173 — BUG-659 AFTER CR-513 QA

---

## 1. Scope Lock

**Files WILL change:**
- `src/api/transforms/orderTransform.js` (R5)

**Files will NOT touch:**
- `RePrintButton.jsx` — fix is in builder, callers unchanged
- `OrderCard.jsx` (cards/) — same
- `TableCard.jsx` (cards/) — same
- `AllOrdersReportPage.jsx` — auto-benefits from builder fix
- `OrderReportBetaPage.jsx` — auto-benefits from builder fix
- `CollectPaymentPanel.jsx` — working path, untouched
- `OrderEntry.jsx` — working auto-print paths, untouched

---

## 2. Edits

### E1: Map new backend fields in `fromAPI.order`

**File:** `src/api/transforms/orderTransform.js`
**Location:** After L233 (the `discount:` line), before L234 (the `// BUG-538` comment)

**Current (L233-234):**
```js
      discount: parseFloat(api.restaurant_discount_amount || 0) || 0, // BUG-592: no discount_value fallback
      // BUG-538: role-base discount applied by authorized user before collection.
```

**New (L233 → L236, inserting 3 lines after L233):**
```js
      discount: parseFloat(api.restaurant_discount_amount || 0) || 0, // BUG-592: no discount_value fallback
      // BUG-659: new backend fields from get-single-order-new (post-fix 2026-11-07)
      discountValue: parseFloat(api.discount_value) || 0,                           // BUG-659: raw discount input (50 for 50%, 100 for ₹100)
      discountType: api.discount_type || api.order_discount_type || null,           // BUG-659: 'Percent' | 'Amount' | null
      roundUp: parseFloat(api.round_up) || 0,                                      // BUG-659: backend-stored round-up (e.g. 0.49)
      // BUG-538: role-base discount applied by authorized user before collection.
```

**Rationale:**
- `discountValue`: Maps `discount_value` (string "50.00") → float 50. Used by E2 as fallback for `discount_percentage`.
- `discountType`: Maps `discount_type` ("Percent") with fallback to `order_discount_type`. Guards E2 from emitting a flat discount amount as a percentage.
- `roundUp`: Maps `round_up` (string "0.49") → float 0.49. Used by E2 as fallback for `roundoff`.
- All three return safe defaults (0/null) for orders placed before the backend fix.

---

### E2: Add order-field fallbacks in `buildBillPrintPayload` output

**File:** `src/api/transforms/orderTransform.js`
**Location:** L2170-2173

**Current (L2170-2173):**
```js
      // CR-513: additive print keys — omitted when not applicable (owner OD-513-05/10)
      ...(parseFloat(overrides.discountPercent) > 0 ? { discount_percentage: parseFloat(overrides.discountPercent) } : {}),
      ...(Number.isFinite(parseFloat(overrides.roundoff)) && parseFloat(overrides.roundoff) !== 0
          ? { roundoff: Math.round(parseFloat(overrides.roundoff) * 100) / 100 } : {}),
```

**New (L2170-2177, replacing 4 lines):**
```js
      // CR-513 + BUG-659: discount_percentage — override first, stored order fallback (percent-type only)
      ...((() => {
        const pct = overrides.discountPercent !== undefined ? parseFloat(overrides.discountPercent) : (order.discountType === 'Percent' ? order.discountValue : 0);
        return pct > 0 ? { discount_percentage: pct } : {};
      })()),
      // CR-513 + BUG-659: roundoff — override first, stored order fallback
      ...((() => {
        const ro = overrides.roundoff !== undefined ? parseFloat(overrides.roundoff) : (order.roundUp || 0);
        return Number.isFinite(ro) && ro !== 0 ? { roundoff: Math.round(ro * 100) / 100 } : {};
      })()),
```

**Rationale:**
- **`discount_percentage`:** Override-first (collect-bill path passes `overrides.discountPercent`). Fallback: `order.discountValue` ONLY when `order.discountType === 'Percent'`. This prevents a flat discount (e.g. ₹50 off) from being emitted as `discount_percentage: 50`.
- **`roundoff`:** Override-first. Fallback: `order.roundUp` from E1 mapping. The `Number.isFinite && !== 0` check is preserved to omit when not applicable.
- **IIFE pattern:** Required because conditional-spread `...()` cannot contain `const` declarations inline. IIFEs are already used elsewhere in this file (e.g. L267, L343, L358).

---

## 3. Execution Sequence

| Step | Action |
|------|--------|
| 1 | Verify E1 anchor: L233 reads `discount: parseFloat(api.restaurant_discount_amount ...)` |
| 2 | Verify E2 anchor: L2170-2173 reads CR-513 additive keys |
| 3 | Apply E1: Insert 3 lines after L233 |
| 4 | Apply E2: Replace L2170-2173 (4 lines → 8 lines) |
| 5 | **Line shift check:** E1 adds 3 lines → E2's original L2170-2173 shifts to L2173-2176. Apply E2 at shifted lines. |
| 6 | Compile check: `webpack compiled successfully` in supervisor logs |
| 7 | Self-test: Verification Matrix (§4) |

**CRITICAL — Line Shift:** E1 inserts 3 lines. All line references after L233 shift by +3. Implementation agent MUST apply E1 first, then E2 at the shifted position (L2173-2176).

---

## 4. Verification Matrix

| V# | Edit | File | Change Description | How to Verify | Automated? |
|----|------|------|--------------------|---------------|:---:|
| V1 | E1 | orderTransform.js ~L234-236 | `discountValue`, `discountType`, `roundUp` mapped | Code review: fields exist in `fromAPI.order` return object | YES (grep) |
| V2 | E1 | orderTransform.js ~L234 | `discountValue` is float 50 for "50.00" | Unit: `parseFloat("50.00") === 50` | YES |
| V3 | E1 | orderTransform.js ~L235 | `discountType` reads `discount_type` with `order_discount_type` fallback | Code review: `api.discount_type \|\| api.order_discount_type \|\| null` | YES (grep) |
| V4 | E1 | orderTransform.js ~L236 | `roundUp` is float 0.49 for "0.49" | Unit: `parseFloat("0.49") === 0.49` | YES |
| V5 | E2 | orderTransform.js ~L2173-2180 | `discount_percentage` has order fallback when overrides absent | Code review: IIFE checks `overrides.discountPercent !== undefined` then `order.discountType === 'Percent'` | YES (grep) |
| V6 | E2 | orderTransform.js ~L2173 | Flat discount NOT emitted as `discount_percentage` | Code review: guard `order.discountType === 'Percent'` → flat ('Amount') returns 0 → omitted | YES (unit test) |
| V7 | E2 | orderTransform.js ~L2178 | `roundoff` has order fallback when overrides absent | Code review: IIFE checks `overrides.roundoff !== undefined` then `order.roundUp` | YES (grep) |
| V8 | E2 | orderTransform.js ~L2178 | `roundoff` omitted when `order.roundUp` is 0 or null | Code review: `ro !== 0` check preserved | YES (unit test) |
| V9 | — | webpack | 0 new warnings | `tail /var/log/supervisor/frontend.out.log` → "compiled successfully" | YES |
| V10 | — | Collect-bill path | Override path unchanged — `hasFinancialOverrides=true` still takes L1905 branch | Code review: E2 only modifies output object, not the if/else branching | YES |
| V11 | — | Browser | Manual reprint of discounted order shows correct `discount_percentage` + `roundoff` in Network tab | Network tab: POST `order-temp-store` payload | NO (browser) |
| V12 | — | Browser | Auto-print (collect-bill) still works identically | Place prepaid order with discount → check payload | NO (browser) |

---

## 5. Post-Code Registry Checklist

The Implementation agent MUST execute this after coding:

```
- [ ] registry.json: BUG-659 → status: GATE_5A_IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] BUG_TRACKER.md: BUG-659 row updated with GATE_5A_IMPLEMENTED status
- [ ] FILE_OWNERSHIP.md: add `src/api/transforms/orderTransform.js` entry for BUG-659 with date
- [ ] Code markers: // BUG-659 comment on every modified/added line
```

---

## 6. Risk Register (inherited from IA, implementation-specific additions)

| # | Risk | Mitigation | Owner? |
|---|------|-----------|--------|
| R1 | `order.discountType` null for old orders | Fallback = 0 → omitted → no regression | NO |
| R2 | `order.roundUp` 0/null for no-roundoff orders | `ro !== 0` → omitted → no regression | NO |
| R3 | Flat discount emitted as percentage | `discountType === 'Percent'` guard | NO |
| R4 | 1-paise FE↔backend roundoff divergence | Pre-existing. Using backend `round_up` is MORE correct. | Informational |
| R5 | CR-513 conflict (L2171-2173) | Execute AFTER CR-513 QA. Additive on top. | NO |
| R6 | IIFE inside spread operator | Pattern already used in this file (L267, L343, L358) | NO |
| R7 | E1 line shift affects E2 position | Sequence: E1 first → E2 at shifted lines (+3) | NO |

---

## 7. Dependency

**CR-513 QA must pass before BUG-659 implementation.** Both touch L2171-2173. BUG-659's E2 replaces the lines CR-513 added. If CR-513 QA fails and its code is reverted, E2 must be adjusted to add the full conditional-spread + fallback (not just fallback).

If owner approves implementing BUG-659 before CR-513 QA: E2 must include the full CR-513 additive logic (already incorporated in the proposed code — the IIFE preserves CR-513's override-first behavior). **This is safe** because BUG-659's E2 is a superset of CR-513's L2171-2173.

---

**Implementation Plan complete. Awaiting Gate 4 GO.**
