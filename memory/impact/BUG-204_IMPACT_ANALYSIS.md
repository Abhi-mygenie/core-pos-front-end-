# BUG-204 — Impact Analysis (Gate 2)

**Date:** 2026-07-17
**Role:** PLANNING
**Gate:** 2 (Impact Analysis)
**Code Reality:** PARTIAL — qty×price logic was implemented in BUG-154, then removed by BUG-175. Needs re-addition with corrected UX.
**Conflict Pre-Check:** No other active item targets `ExpenseEntryPanel.jsx` Case A block.

---

## 1. Summary

When adding an expense for a priced item (e.g., "pav" ₹26/unit), the quantity input is hidden. Amount locks to `unitPrice × 1`. User cannot enter qty > 1 for multi-unit purchases.

**Owner decisions (locked 2026-07-17):**
- OQ-1: Qty field starts **EMPTY** — user must enter quantity. No default.
- OQ-2: Total recalculates **LIVE on every keystroke**.
- OQ-3: **YES** — show breakdown text (e.g., "₹26/unit × 3 = ₹78").

---

## 2. Data Flow Trace

### Current flow (BUG-175 Case A):
```
handleItemSelect() → price = item.unitPriceAmount (e.g., 26)
  → onChange("unitPrice", 26)
  → onChange("amount", "26")          ← LOCKED to price×1
  → onChange("unit", item.unit)

Rendering (Case A: unitPrice > 0):
  Amount: ₹26 (read-only, grey bg)
  Qty: HIDDEN
  Unit: dropdown shown
```

### Proposed flow:
```
handleItemSelect() → price = item.unitPriceAmount (e.g., 26)
  → onChange("unitPrice", 26)
  → onChange("amount", "")            ← EMPTY (qty not entered yet = ₹0 display)
  → onChange("quantity", "")          ← EMPTY (user must type)
  → onChange("unit", item.unit)

User types qty = 3:
  → onChange("quantity", "3")
  → amount auto-computed: 26 × 3 = 78
  → onChange("amount", "78")          ← LIVE on keystroke

Rendering (Case A updated):
  Amount: ₹78 (read-only, auto-calc)  OR  ₹0 if qty empty
  Qty: INPUT (empty, user types)       ← NEW — visible for priced items
  Unit: dropdown shown
  Breakdown: "₹26/unit × 3 = ₹78"     ← NEW helper text
```

---

## 3. Affected Code

### File: `src/components/expense/ExpenseEntryPanel.jsx`

| Location | Current | Change | Lines |
|---|---|---|---|
| L32-35 (EMPTY_LINE) | `quantity: "", unitPrice: null` | No change needed — model already has `quantity` | 0 |
| L183-186 (handleItemSelect, price path) | `amount = String(price)` (locks to price×1) | `amount = ""`, `quantity = ""` (empty until user types) | ~3 |
| L272-288 (Case A rendering) | Only Unit dropdown | Add qty input + breakdown text + amount shows auto-calc | ~20 |
| NEW handler | — | Add `handleQtyChangeForPriced(idx, qty)`: computes `amount = unitPrice × qty`, calls `onChange(idx, "amount", computed)` | ~8 |
| L239-251 (Amount field) | `readOnly` when unitPrice > 0 | Same — stays read-only. Show "₹0" when amount empty | ~2 |
| L475 (validation) | `!l.amount` | No change — if qty empty → amount empty → validation catches it | 0 |
| L489-498 (handleSave payload) | `quantity: parseFloat(l.quantity || 0)` | No change — already sends quantity. Amount = final computed total. | 0 |

**Total estimated change: ~30-35 lines in 1 file.**

---

## 4. Rendering Detail (Case A updated)

```jsx
{/* Case A: priced item — qty input + unit + breakdown */}
{line.unitPrice != null && line.unitPrice > 0 && (
  <>
    {/* Qty input — empty by default, user must enter */}
    <div className="min-w-[75px] w-[75px]">
      <input type="number" min="1" step="1"
        value={line.quantity}
        onChange={e => handlePricedQtyChange(idx, e.target.value)}
        placeholder="Qty"
      />
    </div>
    {/* Unit dropdown (existing) */}
    <div className="min-w-[90px] w-[90px]">
      <select value={line.unit} onChange={...}>...</select>
    </div>
    {/* Breakdown hint */}
    {line.quantity && parseFloat(line.quantity) > 0 && (
      <span className="text-xs text-gray-500">
        ₹{line.unitPrice}/unit × {line.quantity} = ₹{line.amount}
      </span>
    )}
  </>
)}
```

---

## 5. Edit Existing Expense (Q5 Feasibility)

**Curl findings:** Saved expense entries have `quantity: "0.00"` and `Amount: "200"` — the backend stores both fields.

**Feasibility:** ✅ **FEASIBLE with caveats.**

When editing a previously saved expense for a priced item:
1. `startEdit(tx)` already restores `quantity` from saved data (L520: `quantity: String(tx.quantity || "")`)
2. Need to cross-reference the item's CURRENT `unitPriceAmount` from `filteredItems()` to enable auto-calc
3. If current unitPrice × saved qty ≈ saved amount → enable auto-calc mode (qty editable, amount read-only)
4. If mismatch (price changed since entry) → show saved amount as manual entry, don't force auto-calc

**Edge cases:**
- Item no longer has a unit price → fall back to manual amount (Case B)
- Item was deleted from stock master → show as manual amount (item name still in entry as text)
- Quantity was "0.00" (old entries before BUG-204) → treat as manual entry

**Implementation:** ~10 extra lines in `startEdit()` / edit row rendering to cross-reference unitPrice.

---

## 6. API Contract (no change needed)

| Field | handleSave sends | Backend accepts | Status |
|---|---|---|---|
| `amount` | Final computed total (e.g., 78) | ✅ Stored as-is | No change |
| `quantity` | User-entered qty (e.g., 3) | ✅ Stored as `"3.00"` | No change |
| `unit` | User-selected unit | ✅ Stored | No change |

**Backend does NOT compute `qty × price`.** FE always sends the final `amount`. This is correct — backend is a dumb store for the amount. FE owns the calculation.

---

## 7. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Floating point: 26.50 × 3 = 79.49999... | LOW | Wrong amount by ₹0.01 | Round to 2 decimal places: `Math.round(price * qty * 100) / 100` |
| User enters qty = 0 | LOW | Amount = ₹0, passes validation technically | Consider: qty ≥ 1 validation for priced items, OR let ₹0 pass (owner said no extra validation) |
| Old entries (qty=0) opened for edit → auto-calc shows ₹0 | LOW | Confusing if amount was ₹200 but qty=0 | Treat qty=0 as manual mode (no auto-calc) |

---

## 8. Verification Matrix (seeds QA)

| # | Check | Method |
|---|---|---|
| V1 | Select priced item → qty input visible, amount field shows ₹0 | Browser |
| V2 | Type qty=3 → amount auto-computes to unitPrice×3, read-only | Browser |
| V3 | Breakdown text "₹26/unit × 3 = ₹78" visible | Browser |
| V4 | Clear qty → amount returns to ₹0 | Browser |
| V5 | Save Expense → payload has correct amount + quantity | Network tab |
| V6 | Non-priced item (Case B) → unchanged behavior | Browser |
| V7 | Edit existing priced entry → qty pre-filled, auto-calc works | Browser |
| V8 | Edit old entry (qty=0) → manual mode, no auto-calc | Browser |
| V9 | Regression: BUG-175/176/154/153/155/156 flows unbroken | Browser |

---

## 9. Evidence

- Expense report API response: entries have `quantity: "0.00"` and `Amount: "200"` — backend stores both
- Priced items on cafe103: pav ₹20 (Kitchen), pav ₹26 (Milk), pav ₹30 (To Owner)
- `handleSave` L489-498: already sends `quantity` and `amount` as separate fields
- Backend does NOT compute qty×price — FE sends final amount

---

**Impact Analysis complete. 0 open questions (all locked). 0 backend blockers. Ready for Gate 3 (Implementation Plan).**
