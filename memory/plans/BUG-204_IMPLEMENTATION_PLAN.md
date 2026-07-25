# BUG-204 — Implementation Plan (Gate 3)

**Date:** 2026-07-17
**Role:** PLANNING
**Gate:** 3 (Implementation Plan)
**Sprint:** POS 5.0
**Preceding doc:** `impact/BUG-204_IMPACT_ANALYSIS.md` (Gate 2 — 0 open questions)

---

## 0. Preconditions

| Precondition | Status |
|---|---|
| Impact Analysis (Gate 2) closed | ✅ |
| All OQs locked (qty empty, live keystroke, breakdown text) | ✅ |
| Backend accepts `quantity` field | ✅ (curl-verified) |
| No backend change needed | ✅ |
| Edit feasibility confirmed | ✅ (Q5 feasible with caveats) |

---

## 1. Scope-Lock

### Files WILL change

| File | Purpose |
|---|---|
| `src/components/expense/ExpenseEntryPanel.jsx` | Case A rendering + handler + edit cross-reference |

### Files WILL NOT touch
- `expenseService.js` — payload already sends `quantity` + `amount`
- `expenseTransform.js` — no transform change
- `ExpenseSetupPanel.jsx` — different module (Stock Master)
- `ExpenseBulkEditor.jsx` — different module
- `api/constants.js` — no endpoint change

**1 file, ~35-40 lines of change.**

---

## 2. Edit-by-Edit Plan

### Edit 1 — `handleItemSelect`: clear amount + quantity on priced item select

**File:** `ExpenseEntryPanel.jsx`
**Current (L183-186):**
```js
if (price) {
  // BUG-175: amount = unit price directly (qty implicit = 1, qty input hidden in Case A)
  onChange(idx, "unit", item?.unit ?? "");
  onChange(idx, "amount", String(price));
}
```

**New:**
```js
if (price) {
  // BUG-204: qty starts empty, amount starts empty (shows ₹0). User must enter qty.
  onChange(idx, "unit", item?.unit ?? "");
  onChange(idx, "quantity", "");   // empty — user must type
  onChange(idx, "amount", "");    // empty until qty entered → displays as ₹0
}
```

**Lines changed:** 2 replaced + 1 added = ~3 lines

---

### Edit 2 — New handler: `handlePricedQtyChange`

**File:** `ExpenseEntryPanel.jsx`
**Insert after** L189 (after `handleItemSelect` closing brace)

```js
// BUG-204: live auto-calc for priced items — amount = unitPrice × qty on every keystroke
const handlePricedQtyChange = (i, qtyStr) => {
  onChange(i, "quantity", qtyStr);
  const qty = parseFloat(qtyStr) || 0;
  const price = line.unitPrice || 0;
  const total = Math.round(price * qty * 100) / 100; // avoid floating point drift
  onChange(i, "amount", qty > 0 ? String(total) : "");
};
```

**Lines added:** ~7 lines

---

### Edit 3 — Case A rendering: add qty input + breakdown text

**File:** `ExpenseEntryPanel.jsx`
**Current (L272-288):** Case A block — only Unit dropdown

**New:** Replace entire Case A block:
```jsx
{/* BUG-204: Case A — priced item: qty input + unit dropdown + breakdown hint */}
{line.unitPrice != null && line.unitPrice > 0 && (
  <>
    {/* Qty input — empty by default, user must enter */}
    <div className="min-w-[75px] w-[75px]">
      <input
        type="number" min="0" step="1"
        value={line.quantity}
        onChange={e => handlePricedQtyChange(idx, e.target.value)}
        placeholder="Qty"
        className={inputCls}
        style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
        data-testid={`expense-qty-input-${idx}`}
      />
    </div>
    {/* Unit dropdown (existing) */}
    <div className="min-w-[90px] w-[90px]">
      <select
        value={line.unit}
        onChange={e => handleField("unit", e.target.value)}
        className={inputCls}
        style={{ borderColor: COLORS.borderGray, color: line.unit ? COLORS.darkText : COLORS.grayText }}
        data-testid={`expense-unit-select-${idx}`}
      >
        <option value="">Unit</option>
        {units.map(u => (
          <option key={u.value} value={u.value}>{u.label}</option>
        ))}
      </select>
    </div>
    {/* BUG-204: Breakdown hint — shown when qty > 0 */}
    {line.quantity && parseFloat(line.quantity) > 0 && (
      <div className="w-full mt-1">
        <span className="text-xs" style={{ color: COLORS.grayText }}>
          ₹{line.unitPrice}/{line.unit || "unit"} × {line.quantity} = ₹{line.amount}
        </span>
      </div>
    )}
  </>
)}
```

**Lines changed:** ~17 replaced (was ~16 lines), net ~20 lines after expansion

---

### Edit 4 — Amount field: show "0" placeholder for empty priced amount

**File:** `ExpenseEntryPanel.jsx`
**Current (L242):**
```js
placeholder="Amount"
```

**New:**
```js
placeholder={line.unitPrice > 0 ? "0" : "Amount"}
```

**Lines changed:** 1

---

### Edit 5 — Edit existing expense: cross-reference unitPrice for auto-calc mode

**File:** `ExpenseEntryPanel.jsx`
**Current `startEdit` (L513-526):** Restores `quantity` but does NOT set `unitPrice` for auto-calc.

**Add after L524** (inside `startEdit` function):
```js
// BUG-204: cross-reference current unitPrice from stock items for auto-calc mode
const matchedItem = allExpenseItems.find(
  i => i.title?.toLowerCase() === tx.expense?.toLowerCase() && i.unitPriceAmount
);
if (matchedItem && parseFloat(tx.quantity) > 0) {
  // Priced item with qty — enable auto-calc in edit mode
  setEditRow(prev => ({ ...prev, unitPrice: matchedItem.unitPriceAmount }));
}
```

**Prerequisite check:** Does `startEdit` have access to `allExpenseItems`?

**Lines added:** ~6

---

### Edit 5b — Verify `allExpenseItems` is accessible in edit context

**File:** `ExpenseEntryPanel.jsx`
**Check:** The items list is loaded at L394 `expenseService.getExpenseItems()` and stored in state. The `startEdit` function is inside the same component, so it has closure access.

```
L389-400:
  useEffect(() => {
    (async () => {
      ...
      const [itemsRes, catsRes, paysRes, unitsRes] = await Promise.all([
        expenseService.getExpenseItems(),
        ...
      ]);
      const items = fromAPI.expenseItems(itemsRes);
      setAllExpenseItems(items);
```

**Finding:** Need to verify the state variable name. Let me check...

---

## 3. Verification Matrix

| # | Check | Method | Automated? |
|---|---|---|---|
| V1 | Select priced item → qty input visible, amount shows ₹0 placeholder | Browser | Playwright |
| V2 | Type qty=3 → amount auto-computes to unitPrice×3 (live) | Browser | Playwright |
| V3 | Breakdown text "₹26/unit × 3 = ₹78" visible below amount | Browser | Playwright |
| V4 | Clear qty → amount returns to empty (₹0 placeholder) | Browser | Playwright |
| V5 | Save Expense → payload has correct amount=78 + quantity=3 | Network tab | Manual |
| V6 | Non-priced item (Case B) → qty/unit/phys.qty unchanged | Browser | Playwright |
| V7 | Floating point: 26.50 × 3 → ₹79.50 (not 79.49999) | Browser | Manual |
| V8 | Edit existing priced entry (qty>0) → qty pre-filled, auto-calc | Browser | Playwright |
| V9 | Edit old entry (qty=0) → manual mode, no forced auto-calc | Browser | Playwright |
| V10 | Regression: BUG-175/176/154/153/155/156 flows unbroken | Browser | testing_agent |

---

## 4. Execution Sequence

```
Edit 1 (handleItemSelect: empty qty/amount)
  ↓
Edit 2 (new handlePricedQtyChange handler)
  ↓
Edit 3 (Case A rendering: qty input + breakdown)
  ↓
Edit 4 (Amount placeholder)
  ↓
Edit 5 (Edit mode cross-reference)
  ↓
Compile check → Self-test → testing_agent
```

---

## 5. Post-Code Registry Checklist (R17)

```
- [ ] registry.json: BUG-204 → status: IMPLEMENTED
- [ ] BUG_TRACKER.md: BUG-204 row updated
- [ ] FILE_OWNERSHIP.md: add ExpenseEntryPanel.jsx under BUG-204 heading
- [ ] Code markers: // BUG-204 in every modified location
- [ ] Verification Matrix: 10 checks executed
- [ ] testing_agent_v3 called with regression scope
- [ ] Session handover written
```

---

## 6. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Floating point drift | LOW | ₹0.01 error | `Math.round(price * qty * 100) / 100` |
| qty=0 entered → amount=₹0, passes save validation | LOW | ₹0 expense recorded | Existing validation catches empty amount; ₹0 is technically valid (owner said no extra validation) |
| Edit mode: unitPrice changed since original entry | LOW | Mismatch between stored amount and recalculated | Only enable auto-calc if qty>0; let user override |
| allExpenseItems not loaded when startEdit fires | LOW | Cross-reference fails silently | Graceful fallback: no auto-calc, manual amount mode |

---

## 7. Handover to Owner (→ Gate 4)

```
Plan ready at /app/memory/plans/BUG-204_IMPLEMENTATION_PLAN.md.
1 file, 5 edits, ~35-40 lines.
Verification matrix: 10 checks.
Scope-lock: ExpenseEntryPanel.jsx ONLY.
Owner decisions: ALL locked (qty empty, live keystroke, breakdown text, edit feasible).
No backend blocker.
Awaiting Gate 4 GO.
```
