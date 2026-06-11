# CR-010 — Code Gate / Scope Lock

**Date:** 2026-06-09
**Sprint:** POS 4.0
**Gate:** 4 (Code Gate)
**Status:** LOCKED
**Prerequisites:** Gate 2 (Impact Analysis) ✅, Gate 3 (Implementation Plan) ✅

---

## 1. Scope Lock — What Is IN

### New Files (2)
| File | Purpose |
|---|---|
| `src/utils/weightEntryPrefs.js` | localStorage getter/setter for weight prompt toggle |
| `src/components/order-entry/WeightEntryModal.jsx` | Weight entry modal (gm/ml input, +/− 50 step, pills, live total) |

### Modified Files (10)
| File | Scope of Change |
|---|---|
| `src/api/transforms/productTransform.js` | +2 fields in `fromAPI.product`: `itemUnit`, `itemUnitPrice` |
| `src/api/transforms/menuManagementTransform.js` | +2 fields inbound (`fromAPI.food`) + +2 fields outbound (`toAPI.foodInfo`) |
| `src/api/transforms/orderTransform.js` | 3 functions touched: `fromAPI.orderItem` (+3 fields), `buildCartItem` (weight-aware price+payload), `calcOrderTotals` (audit comment only) |
| `src/components/order-entry/OrderEntry.jsx` | `adaptProduct` (+3 fields), `addToCart` (weight gate), new `confirmWeightAndAdd` handler, JSX: WeightEntryModal + menu badge |
| `src/components/order-entry/CartPanel.jsx` | Weight stepper replaces integer stepper for weight items, weight display format |
| `src/components/order-entry/CancelFoodModal.jsx` | Weight-aware partial cancel (weight input instead of integer qty) |
| `src/pages/StatusConfigPage.jsx` | +1 toggle: "Weight Entry Prompt" |
| `src/components/panels/menu/ProductForm.jsx` | +2 form fields: `item_unit` dropdown + `item_unit_price` number input |
| `src/components/panels/menu/BulkEditor.jsx` | Wire existing stub columns to data read/write |
| `src/api/services/menuManagementService.js` | Verify weight fields flow through (may be zero-change) |

---

## 2. Scope Lock — What Is OUT (Explicitly Excluded)

| Item | Reason |
|---|---|
| Reports weight display (ItemSales, OrderLedger, OrderDetailSheet) | Post-MVP — Step 13 |
| Bill print weight display (`buildBillPrintPayload`) | Post-MVP — Step 14 |
| Web/Scanner weight item support | Future CR (D20) |
| Addons/variations on weight items | Not supported for now (D13) |
| In-place weight edit on placed items | Not allowed — cancel + re-add (D10) |
| Unit switcher (gm↔Kg toggle) | Removed from scope — cashier types in small unit, system converts (D2) |
| Min/max weight validation | No restriction (D17) |
| `CollectPaymentPanel.jsx` changes | Not needed — totals flow from `calcOrderTotals` unchanged |
| `SplitBillModal.jsx` changes | Not needed — splits by line total (works for weight items) |
| `ScanOrderPopOut.jsx` changes | POS-only for now |
| `MenuContext.jsx` structural changes | Not needed — product shape just carries 2 new fields |

---

## 3. Baseline Rule Amendments (Require Owner Approval Post-Implementation)

| Rule | Amendment | Status |
|---|---|---|
| TOTALS-001 | Add: "For weight items, Item Total = sum of (item_unit_price × weight)" | PENDING — freeze after implementation verified |
| PAY-001 | Add: "Cart item includes `item_unit` + `item_unit_price` for weight items" | PENDING |
| PAY-002 | Add: same as PAY-001 for update-order | PENDING |

### New Business Rules to Freeze (Post-Implementation)

| Rule ID | Rule |
|---|---|
| WEIGHT-001 | Weight item billing: `line_total = item_unit_price × weight_entered`. Tax/discount apply on this base. |
| WEIGHT-002 | Unit conversion: cashier types in small unit (gm/ml). System converts to base unit (Kg/L) by dividing by 1000. For gm/ml items, no conversion. |
| WEIGHT-003 | Detection: item is weight-based if and only if `item_unit` is non-empty. Mutually exclusive with dynamic-price (MISC-001). |

---

## 4. Flagged Items (Carried Forward)

| # | Item | Status |
|---|---|---|
| F1 | Role of catalog `price` field (₹23) on weight items — not used in billing, shown on menu card. Backend purpose unknown. | FLAGGED — owner TBD |

---

## 5. Dependencies to Verify Before Implementation

| # | Dependency | How to Verify | Blocker? |
|---|---|---|---|
| V1 | Products API (GET) returns `item_unit` + `item_unit_price` | Fetch products for a restaurant that has weight items, check response | YES — if missing, `productTransform` gets null |
| V2 | Menu Management API (GET foods-list) returns `item_unit` + `item_unit_price` | Fetch foods-list, check response | YES — if missing, BulkEditor/ProductForm show empty |
| V3 | Place-order API accepts decimal `quantity` + `item_unit` + `item_unit_price` | Place a test order with weight item | YES — if rejected, billing breaks |
| V4 | Cancel API accepts partial decimal quantity | Cancel partial weight from a placed order | MEDIUM — if rejected, partial cancel fails (full cancel still works) |

**Action:** Verify V1–V3 against preprod BEFORE writing code. V4 can be tested during implementation.

---

## 6. Risk Mitigations Locked

| Risk | Mitigation |
|---|---|
| R2 (integer coercion on qty) | Audit all `qty` references in modified files — ensure no `parseInt`/`Math.floor` on weight items |
| R3 (qty += 1 dedup in addToCart) | Weight items bypass the existing dedup path entirely — always go through weight prompt or default |
| R4 (price ambiguity) | `buildCartItem` explicitly uses `itemUnitPrice` for weight items, `price` for piece items |
| R6 (partial cancel > placed weight) | `CancelFoodModal` validates cancel_weight ≤ item.qty |

---

## 7. Approval Matrix

| Gate | Approver | Status |
|---|---|---|
| Gate 1 — Intake | Owner | ✅ COMPLETE |
| Gate 2 — Impact Analysis | Owner | ✅ COMPLETE |
| Gate 3 — Implementation Plan | Owner | ✅ APPROVED |
| **Gate 4 — Code Gate** | **Owner** | **✅ LOCKED (this document)** |
| Gate 5 — Implementation + QA | Agent | ⬜ PENDING owner GO |
| Gate 6 — Owner Smoke Sign-off | Owner | ⬜ PENDING |

---

## 8. GO / NO-GO Checklist

| # | Item | Status |
|---|---|---|
| 1 | Impact Analysis complete | ✅ |
| 2 | Implementation Plan approved | ✅ |
| 3 | Scope locked (IN/OUT defined) | ✅ |
| 4 | Baseline amendments identified | ✅ |
| 5 | Dependencies listed | ✅ |
| 6 | Risks mitigated | ✅ |
| 7 | **V1–V3 API verification** | ⬜ **DO BEFORE CODING** |
| 8 | **Owner GO** | ⬜ **AWAITING** |

---

*Generated: 2026-06-09 — CR-010 Code Gate Session*
