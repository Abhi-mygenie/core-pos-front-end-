# BUG-176 — Implementation Plan (Gate 3)

**ID:** BUG-176
**Title:** Expense Entry Form Case B: optional qty/unit/physical_qty hidden; physical_quantity wrongly deprecated
**Date:** 2026-07-11
**Agent:** PLANNING (AGENT_PROMPT_ALPHA v0.7)
**Stage:** Gate 3 — Implementation Plan
**Risk:** LOW
**Sprint:** pos_5_0

---

## Scope Lock

**Files WILL change:**
1. `components/expense/ExpenseEntryPanel.jsx`
2. `api/services/expenseService.js`

**Files will NOT touch:** Any other file.

---

## Edit 1 — `EMPTY_LINE` — add `physical_quantity` field

**File:** `components/expense/ExpenseEntryPanel.jsx`

**Find (L32–37):**
```js
const EMPTY_LINE = {
  categoryId: "", itemName: "", amount: "", paymentMethod: "Cash Draw", // BUG-156: default to Cash Draw
  quantity: "", unit: "",
  unitPrice: null,     // BUG-154: null = manual amount; non-null = qty×price auto-calc
  isCustomItem: false, // BUG-155: true when free-text item (not from master) → show category select
};
```

**Replace with:**
```js
const EMPTY_LINE = {
  categoryId: "", itemName: "", amount: "", paymentMethod: "Cash Draw", // BUG-156: default to Cash Draw
  quantity: "", unit: "", physical_quantity: "",                         // BUG-176: physical_quantity user-enterable
  unitPrice: null,     // BUG-154: null = manual amount; non-null = qty×price auto-calc
  isCustomItem: false, // BUG-155: true when free-text item (not from master) → show category select
};
```

---

## Edit 2 — `EntryLine` JSX — add optional qty / unit / physical_qty in Case B

**File:** `components/expense/ExpenseEntryPanel.jsx`

The current `unitPrice > 0` conditional block (which BUG-175 edits to show unit only) is Case A.
After that block and before the Amount field, add a Case B block.

**Find the Amount field div (search for `{/* Amount — editable for manual...` comment, L269):**
```jsx
      {/* Amount — editable for manual items; read-only auto-calc for priced items */}
      <div className="min-w-[110px] flex-1">
```

**Insert BEFORE the Amount div:**
```jsx
      {/* BUG-176: Case B — no unit price: optional qty / unit / physical_qty */}
      {(!line.unitPrice || line.unitPrice <= 0) && (
        <>
          <div className="min-w-[75px] w-[75px]">
            <input
              type="number" min="0" step="0.01"
              value={line.quantity}
              onChange={e => handleField("quantity", e.target.value)}
              placeholder="Qty"
              className={inputCls}
              style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
              data-testid={`expense-qty-input-${idx}`}
            />
          </div>
          <div className="min-w-[85px] w-[85px]">
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
          <div className="min-w-[75px] w-[75px]">
            <input
              type="number" min="0" step="0.01"
              value={line.physical_quantity}
              onChange={e => handleField("physical_quantity", e.target.value)}
              placeholder="Phys. Qty"
              className={inputCls}
              style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
              data-testid={`expense-physical-qty-input-${idx}`}
            />
          </div>
        </>
      )}
```

---

## Edit 3 — `handleSave` — add `physical_quantity` to the details map

**File:** `components/expense/ExpenseEntryPanel.jsx`

**Find (L454–460):**
```js
      const details = lines.map(l => ({
        expense: l.itemName,
        amount: parseFloat(l.amount),
        payment_method: l.paymentMethod,
        quantity: parseFloat(l.quantity || 0),
        unit: l.unit || "",
      }));
```

**Replace with:**
```js
      const details = lines.map(l => ({
        expense: l.itemName,
        amount: parseFloat(l.amount),
        payment_method: l.paymentMethod,
        quantity: parseFloat(l.quantity || 0),
        unit: l.unit || "",
        physical_quantity: parseFloat(l.physical_quantity || 0), // BUG-176
      }));
```

---

## Edit 4 — `startEdit` — add `physical_quantity` to editRow state

**File:** `components/expense/ExpenseEntryPanel.jsx`

**Find (L476–484):**
```js
    setEditRow({
      expense: tx.expense,
      e_dates: tx.date || formatDateDDMMYYYY(selectedDate),
      d_amount: String(tx.amount),
      payment_method: tx.paymentMethod,
      quantity: String(tx.quantity || ""),
      unit: tx.unit || "",
    });
```

**Replace with:**
```js
    setEditRow({
      expense: tx.expense,
      e_dates: tx.date || formatDateDDMMYYYY(selectedDate),
      d_amount: String(tx.amount),
      payment_method: tx.paymentMethod,
      quantity: String(tx.quantity || ""),
      unit: tx.unit || "",
      physical_quantity: String(tx.physical_quantity || ""), // BUG-176
    });
```

---

## Edit 5 — `expenseService.js` — fix physical_quantity in `addExpenseEntry`

**File:** `api/services/expenseService.js`

**Find (L138–146):**
```js
  details: lines.map((l) => ({
    expense: l.expense,
    amount: l.amount,
    payment_method: l.payment_method,
    quantity: l.quantity || 0,
    unit: l.unit || '',
    physical_quantity: 0, // deprecated — always 0
  })),
```

**Replace with:**
```js
  details: lines.map((l) => ({
    expense: l.expense,
    amount: l.amount,
    payment_method: l.payment_method,
    quantity: l.quantity || 0,
    unit: l.unit || '',
    physical_quantity: l.physical_quantity || 0, // BUG-176: user-enterable, not deprecated
  })),
```

---

## Edit 6 — `expenseService.js` — fix physical_quantity in `editExpenseEntry`

**File:** `api/services/expenseService.js`

**Find (L155–163):**
```js
  return api.put(`${EXPENSE_ENDPOINTS.EDIT_EXPENSE}/${id}`, {
    exp_name: data.expense ?? data.exp_name, // BUG-151: editRow stores "expense"; API expects "exp_name"
    e_dates: data.e_dates,
    d_amount: data.d_amount,
    payment_method: data.payment_method,
    quantity: data.quantity || 0,
    unit: data.unit || '',
    physical_quantity: 0, // deprecated — always 0
  });
```

**Replace with:**
```js
  return api.put(`${EXPENSE_ENDPOINTS.EDIT_EXPENSE}/${id}`, {
    exp_name: data.expense ?? data.exp_name, // BUG-151: editRow stores "expense"; API expects "exp_name"
    e_dates: data.e_dates,
    d_amount: data.d_amount,
    payment_method: data.payment_method,
    quantity: data.quantity || 0,
    unit: data.unit || '',
    physical_quantity: data.physical_quantity || 0, // BUG-176: user-enterable, not deprecated
  });
```

---

## Verification Matrix

| Edit # | File | Change | How to Verify |
|---|---|---|---|
| 1 | `ExpenseEntryPanel.jsx` | EMPTY_LINE has physical_quantity | New line starts with physical_quantity="" |
| 2 | `ExpenseEntryPanel.jsx` | Case B shows qty + unit + physical_qty | Select item with no unit price → 3 optional fields visible |
| 3 | `ExpenseEntryPanel.jsx` | Optional fields accept blank values | Leave all 3 blank → save succeeds |
| 4 | `ExpenseEntryPanel.jsx` | Optional fields send to API | Enter qty=3, unit=kg, physical_qty=2 → Network tab shows all 3 in request |
| 5 | `expenseService.js` | physical_quantity no longer hard-coded 0 | Network tab: physical_quantity=2 when user enters 2 |
| 6 | `ExpenseEntryPanel.jsx` | startEdit includes physical_quantity | Edit existing row → physical_qty field pre-filled from tx |
| 7 | `expenseService.js` | editExpenseEntry sends physical_quantity | Edit row → Network tab shows physical_quantity in PUT body |
| 8 | `ExpenseEntryPanel.jsx` | Case A unaffected (unit still shows, qty hidden) | Select priced item → only unit visible (BUG-175 behaviour) |
| 9 | `ExpenseEntryPanel.jsx` | resetForm() clears physical_quantity | Click Reset → field clears |

---

## Post-Code Registry Checklist

- [ ] `registry.json`: BUG-176 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] `BUG_TRACKER.md`: row updated
- [ ] `FILE_OWNERSHIP.md`: `ExpenseEntryPanel.jsx` + `expenseService.js` listed with BUG-176 + date
- [ ] Code markers: `// BUG-176` in every modified block (Edits 2, 3, 4, 5, 6)
