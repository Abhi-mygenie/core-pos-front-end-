# BUG-175 — Implementation Plan (Gate 3)

**ID:** BUG-175
**Title:** Expense Entry Form Case A: qty input shown when item has unit price — should be hidden
**Date:** 2026-07-11
**Agent:** PLANNING (AGENT_PROMPT_ALPHA v0.7)
**Stage:** Gate 3 — Implementation Plan
**Risk:** LOW
**Sprint:** pos_5_0

---

## Scope Lock

**File WILL change:** `components/expense/ExpenseEntryPanel.jsx`
**Files will NOT touch:** Any other file.

---

## Edit 1 — `handleItemSelect` — set amount directly from unitPrice (no qty multiply)

**File:** `components/expense/ExpenseEntryPanel.jsx`

**Find (L183–186):**
```js
    if (price) {
      // auto-fill unit from item, auto-calc amount
      onChange(idx, "unit", item?.unit ?? "");
      onChange(idx, "amount", String(price * parseFloat(line.quantity || 1)));
    } else {
      onChange(idx, "amount", ""); // clear any previous auto-calc
    }
```

**Replace with:**
```js
    if (price) {
      // BUG-175: amount = unit price directly (qty implicit = 1, qty input hidden in Case A)
      onChange(idx, "unit", item?.unit ?? "");
      onChange(idx, "amount", String(price));
    } else {
      onChange(idx, "amount", ""); // clear any previous auto-calc
    }
```

---

## Edit 2 — `handleQtyChange` — remove function (no longer needed)

**File:** `components/expense/ExpenseEntryPanel.jsx`

**Find and remove entire function (L192–196):**
```js
  // BUG-154: recalculate amount when qty changes (only when item has a unit price)
  const handleQtyChange = (val) => {
    onChange(idx, "quantity", val);
    if (line.unitPrice && val) {
      onChange(idx, "amount", String(line.unitPrice * parseFloat(val || 0)));
    }
  };
```

Note: `handleQtyChange` is only called from the Qty input inside the `unitPrice > 0` block (which is being removed in Edit 3). Safe to delete.

---

## Edit 3 — `EntryLine` JSX — remove qty input from Case A conditional block

**File:** `components/expense/ExpenseEntryPanel.jsx`

**Find (L238–267) — the entire `unitPrice > 0` conditional block:**
```jsx
      {/* BUG-154: Qty + Unit — shown only when item has a unit price */}
      {line.unitPrice != null && line.unitPrice > 0 && (
        <>
          <div className="min-w-[80px] w-[80px]">
            <input
              type="number" min="0" step="0.01"
              value={line.quantity}
              onChange={e => handleQtyChange(e.target.value)}
              placeholder="Qty"
              className={inputCls}
              style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
              data-testid={`expense-qty-input-${idx}`}
            />
          </div>
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
        </>
      )}
```

**Replace with (qty div removed, unit select kept, updated comment):**
```jsx
      {/* BUG-175: Case A — item has unit price: show unit select only (qty implicit = 1) */}
      {line.unitPrice != null && line.unitPrice > 0 && (
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
      )}
```

---

## Verification Matrix

| Edit # | File | Change | How to Verify |
|---|---|---|---|
| 1 | `ExpenseEntryPanel.jsx` | amount = unitPrice directly (not × qty) | Set test unit price via API, select item → amount auto-fills as flat unit price |
| 2 | `ExpenseEntryPanel.jsx` | handleQtyChange removed | No console error "handleQtyChange is not defined" |
| 3 | `ExpenseEntryPanel.jsx` | Qty input absent in Case A | Select priced item → no qty input visible |
| 4 | `ExpenseEntryPanel.jsx` | Unit select still visible in Case A | Select priced item → unit dropdown visible |
| 5 | `ExpenseEntryPanel.jsx` | Amount read-only in Case A | Select priced item → amount field not editable |
| 6 | `ExpenseEntryPanel.jsx` | Case B unaffected — no qty/unit shown | Select item with no unit price → only amount (editable) + payment visible |

---

## Post-Code Registry Checklist

- [ ] `registry.json`: BUG-175 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] `BUG_TRACKER.md`: row updated
- [ ] `FILE_OWNERSHIP.md`: `ExpenseEntryPanel.jsx` listed with BUG-175 + date
- [ ] Code markers: `// BUG-175` comment added near Edit 3 block
