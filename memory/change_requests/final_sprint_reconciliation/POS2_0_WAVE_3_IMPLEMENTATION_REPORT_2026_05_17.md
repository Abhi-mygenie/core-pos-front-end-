# POS2.0 Wave 3 Implementation Report (FINAL) — 2026-05-17

## 1. Session Summary

This session implemented **Wave 3 (2 bugs)** + 2 owner-requested enhancements on the `17-may` branch. All code changes are in 2 files.

---

## 2. Wave 3 — Payment / Discount (2 bugs)

| # | Bug ID | Title | Smoke Test | Notes |
|---|--------|-------|------------|-------|
| 1 | BUG-080 | partial_payments UI enforcement | ✅ PASS | Owner smoke-verified. Row 1 filtered, split fixed labels, auto-fill (2 rows), validation (3 rows). |
| 2 | BUG-056 | Preset discount dropdown | ✅ PASS | Owner smoke-verified after 3 fixes: field name, root-level override, call site arg. |

---

## 3. All Files Changed

| # | File | Changes | Bugs |
|---|------|---------|------|
| 1 | `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | (1) `enabledPrimaryMethods` memo, (2) smart default payment, (3) split init per enabled method, (4) split UI fixed labels no dropdown, (5) Row 1 filter, (6) split auto-fill for 2-method, (7) split validation caps sum, (8) discount dropdown with presets | BUG-080, BUG-056 |
| 2 | `frontend/src/api/transforms/profileTransform.js` | (1) `discount_type` field name fix, (2) `discountTypesOverride` param added, (3) root-level `restaurant_discount_type` passed at call site | BUG-056 |

---

## 4. BUG-080 Implementation Details

### Change 1: `enabledPrimaryMethods` memo (~L91)
- Filters `['cash', 'upi', 'card']` by `enabledLayout.row1` (API) AND `restaurantPaymentMethods` (restaurant config booleans)

### Change 2: Smart default payment method (~L281)
- Non-hold callers default to first enabled method (was hardcoded `'cash'`)
- Hold-context path (BUG-042-A) unchanged

### Change 3: Split payment init (~L300)
- One entry per enabled primary method (was hardcoded `cash` + `card`)

### Change 4: Row 1 buttons (~L1856)
- Grid columns adapt to enabled count; uses `enabledPrimaryMethods`

### Change 5: Split-by-Payment UI (~L2007)
- **Before:** `<select>` dropdown per row
- **After:** Fixed `<span>` label per row (Cash/Card/UPI) + amount input
- Card row retains Txn ID field (BUG-241)

### Change 6 (Enhancement): Split auto-fill for 2 methods
- When exactly 2 split rows: typing in one auto-fills other with `total - typed`
- Only for 2-method restaurants; 3-method → no auto-fill

### Change 7 (Enhancement): Split validation
- Each field capped at `effectiveTotal - sum of other fields`
- Prevents total split sum from exceeding order total (works for 2 and 3 methods)

### NOT changed (out of scope per owner):
- Split-by-Station dropdowns (Bar/Kitchen) — separate CR
- `orderTransform.js` — payload builders unchanged (always 3 entries)
- `paymentMethods.js` — config registry unchanged

---

## 5. BUG-056 Implementation Details

### Change 1: Preset categories in same discount dropdown (~L865)
- `None | % | ₹ | <preset categories>` in one `<select>`
- Preset values prefixed `preset_` to disambiguate
- Mutual exclusivity: preset clears manual; manual clears preset
- When preset selected: input hidden (% fixed from category)
- Shows `-₹` calculated amount

### Change 2: Field name fix (profileTransform.js ~L258)
- API uses `discount_type` not `name` → `type.discount_type || type.name || ''`

### Change 3: Root-level override (profileTransform.js ~L77, ~L105, ~L186)
- `restaurant_discount_type` lives at API root, not inside `restaurants[0]`
- Passed as 3rd arg to `restaurant()` builder (same pattern as `print_agent`)
- `discountTypesOverride ?? api.restaurant_discount_type` with fallback

---

## 6. Validation Results

| Validation | Result |
|---|---|
| Webpack compile | ✅ Compiled successfully |
| ESLint | ✅ No issues found |
| Test suites | ✅ 34/34 passed (496 tests) |
| Owner smoke — BUG-080 (2 methods) | ✅ PASS — Cash+UPI only, Card hidden |
| Owner smoke — BUG-080 (3 methods) | ✅ PASS — Validation caps sum |
| Owner smoke — BUG-080 auto-fill | ✅ PASS — Auto-fills remainder |
| Owner smoke — BUG-056 presets | ✅ PASS — Thrive/Google Review/Complementary visible |

---

## 7. Business Rules Verification

| Rule | Status |
|------|--------|
| PAY-001/002/004 (payload contracts) | ✅ Preserved — payload builders untouched |
| PAY-008 (tab settlement) | ✅ Preserved — tab path untouched |
| Pending PAY-003 (partial_payments) | ✅ Aligned — UI enforces config; payload shape unchanged |
| TOTALS-001/002 | ✅ Preserved — financial formulas untouched |
| SC-001/002/003/006 | ✅ Preserved |
| TIP-001/002 | ✅ Preserved |
| ROUND-002 | ✅ Preserved |

---

## 8. Known Constraints

1. **Split-by-Station (Bar/Kitchen) dropdowns** NOT updated — separate CR per owner directive.
2. Preset discount categories require backend to populate `restaurant_discount_type` at API root level.
3. Auto-fill only triggers for exactly 2 enabled methods; 3 methods require manual entry.

---

## 9. Repo State

| Item | Value |
|---|---|
| Repo | `https://github.com/Abhi-mygenie/core-pos-front-end-.git` |
| Branch | `17-may` |
| Base commit | `a9d05fb02dd566dfcb7ae44523d60122e4dab845` |
| Commit allowed | No |

---

*— End of POS2.0 Wave 3 Implementation Report (FINAL) —*
