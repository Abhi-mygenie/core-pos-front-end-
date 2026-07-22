# CR-083 Implementation Plan — Expense Split Payment

**Date:** 2026-07-20
**Gate:** 3 (Implementation Plan)
**Risk:** MEDIUM
**Frozen Mockup:** `/app/frontend/public/cr083-expense-split-payment-mockup.html`

---

## Code Reality: NONE
No split payment code exists in ExpenseEntryPanel.jsx.

## Conflict Pre-Check: CLEAN
FILE_OWNERSHIP: ExpenseEntryPanel.jsx last modified by BUG-199 agent. No active item touches this file.

---

## Scope Lock

**Files WILL change:**
1. `components/expense/ExpenseEntryPanel.jsx` — all changes in this file

**Files will NOT touch:**
- `expenseService.js` ❌ (no API change — backend already supports multi-line)
- `expenseTransform.js` ❌
- `ExpenseSetupPanel.jsx` ❌
- `ExpenseBulkEditor.jsx` ❌

---

## Edit Plan (7 edits, ~80 lines, 1 file)

### EDIT 1 — EMPTY_LINE: Add splitPayments field (~1 line)
**Location:** Line 32, `EMPTY_LINE` constant
**Current:**
```js
const EMPTY_LINE = {
  categoryId: "", itemName: "", amount: "", paymentMethod: "Cash Draw",
  quantity: "", unit: "", physical_quantity: "",
  unitPrice: null, isCustomItem: false, notes: "",
};
```
**Add:**
```js
  splitPayments: null,   // CR-083: null=single payment, [{method,amount}]=split mode
```

### EDIT 2 — Split state helpers in ExpenseEntryPanel (~15 lines)
**Location:** After line 484 (resetForm)
**Add:**
```js
// CR-083: Split payment helpers
const handleSplitToggle = (idx) => {
  setLines(prev => prev.map((l, i) => {
    if (i !== idx) return l;
    if (l.splitPayments) return { ...l, splitPayments: null }; // unsplit → restore single
    // Split → create 2 rows: current method+amount as Row 1, empty Row 2 with remainder
    const currentAmount = parseFloat(l.amount) || 0;
    return {
      ...l,
      splitPayments: [
        { method: l.paymentMethod, amount: String(currentAmount) },
        { method: '', amount: '' },
      ],
    };
  }));
};

const handleSplitChange = (lineIdx, splitIdx, field, val) => {
  setLines(prev => prev.map((l, i) => {
    if (i !== lineIdx || !l.splitPayments) return l;
    const updated = l.splitPayments.map((sp, si) =>
      si === splitIdx ? { ...sp, [field]: val } : sp
    );
    return { ...l, splitPayments: updated };
  }));
};

const removeSplitRow = (lineIdx, splitIdx) => {
  setLines(prev => prev.map((l, i) => {
    if (i !== lineIdx || !l.splitPayments) return l;
    const remaining = l.splitPayments.filter((_, si) => si !== splitIdx);
    if (remaining.length <= 1) {
      // Only 1 row left → unsplit, restore to single payment
      return { ...l, splitPayments: null, paymentMethod: remaining[0]?.method || l.paymentMethod, amount: remaining[0]?.amount || l.amount };
    }
    return { ...l, splitPayments: remaining };
  }));
};
```

### EDIT 3 — Cash Draw balance state (~5 lines)
**Location:** After line 395 (deletingId state)
**Add:**
```js
// CR-083: Cash Draw available balance (from last store-expense response)
const [cashDrawBalance, setCashDrawBalance] = useState(null);
```
And in fetchRef (line 404), after fetching payment methods, if "Cash Draw" is in the list, make one probe call to get balance:
```js
// CR-083: Extract cash draw balance from a probe response
// The store-expense response includes cash_opening_balance + total_cash_collections
```
Actually, the balance comes from `store-expense-details` response (`cash_opening_balance`, `total_cash_available`). We can extract it from the report fetch or a lightweight probe. For now, show the balance from the last save response.

### EDIT 4 — Validation: split amounts must sum (~8 lines)
**Location:** Inside `handleSave` (line 487), extend validation
**Add before existing hasErrors check:**
```js
// CR-083: Validate split payment sums
const splitErrors = lines.some(l => {
  if (!l.splitPayments) return false;
  const total = parseFloat(l.amount) || 0;
  const splitSum = l.splitPayments.reduce((acc, sp) => acc + (parseFloat(sp.amount) || 0), 0);
  return Math.abs(splitSum - total) > 0.01 || l.splitPayments.some(sp => !sp.method);
});
if (splitErrors) {
  setShowErrors(true);
  toast({ title: "Split payment error", description: "Split amounts must equal the line total and each must have a payment method.", variant: "destructive" });
  return;
}
```

### EDIT 5 — Save: Expand split lines for API (~10 lines)
**Location:** Line 504, inside handleSave, replace `details` build
**Current:**
```js
const details = lines.map(l => ({ expense: l.itemName, amount: parseFloat(l.amount), payment_method: l.paymentMethod, ... }));
```
**New:**
```js
const details = lines.flatMap(l => {
  if (!l.splitPayments) {
    return [{ expense: l.itemName, amount: parseFloat(l.amount), payment_method: l.paymentMethod, quantity: ..., unit: ..., ... }];
  }
  // CR-083: expand split into multiple API lines
  return l.splitPayments.map(sp => ({
    expense: l.itemName,
    amount: parseFloat(sp.amount),
    payment_method: sp.method,
    quantity: parseFloat(l.quantity || 0),
    unit: l.unit || "",
    physical_quantity: parseFloat(l.physical_quantity || 0),
    notes: l.notes || "",
    category_id: l.categoryId ? parseInt(l.categoryId, 10) : null,
  }));
});
```

### EDIT 6 — EntryLine UI: Split button (~5 lines)
**Location:** Inside EntryLine component, after the payment `<select>` (line 279)
**Add:**
```jsx
{/* CR-083: Split Payment button */}
<button onClick={() => /* parent passes handler */} className="split-btn" data-testid={`expense-split-btn-${idx}`}>
  Split
</button>
```
And pass `onSplitToggle`, `onSplitChange`, `onRemoveSplit`, `cashDrawBalance` as props.

### EDIT 7 — Split payment rows UI inside EntryLine (~35 lines)
**Location:** After the existing line-row div, before the close of EntryLine
**Add:** Conditionally render split rows when `line.splitPayments` is not null:
```jsx
{line.splitPayments && (
  <div className="split-rows">
    {line.splitPayments.map((sp, si) => (
      <div key={si} className="split-row">
        <span className="split-row-label">{si + 1}</span>
        <select value={sp.method} onChange={...}>
          {paymentMethods.map(pm => <option key={pm}>{pm}</option>)}
        </select>
        <input type="number" value={sp.amount} onChange={...} />
        {sp.method === 'Cash Draw' && cashDrawBalance != null && (
          <span className="cash-draw-hint">Available: ₹{cashDrawBalance}</span>
        )}
        <button onClick={() => onRemoveSplit(si)}>×</button>
      </div>
    ))}
    {/* Validation bar */}
    <SplitValidationBar total={parseFloat(line.amount)} splits={line.splitPayments} />
  </div>
)}
```

---

## Verification Matrix

| # | Edit | How to Verify | Automated? |
|---|---|---|---|
| 1 | Split button visible | Browser: see "Split" button on each entry line | NO |
| 2 | Click Split → 2 rows appear | Browser: click Split → Row 1 (current method) + Row 2 (empty) | NO |
| 3 | Amounts must sum | Browser: set mismatched amounts → red bar + Save disabled | NO |
| 4 | Amounts match → green bar | Browser: ₹500 + ₹500 = ₹1000 → green bar | NO |
| 5 | Save sends 2 API lines | Network tab: POST store-expense-details → details array has 2 items | NO |
| 6 | Half Paid + Half Unpaid | Browser: UPI + Unpaid split → both lines saved | NO |
| 7 | Cash Draw hint | Browser: select Cash Draw → see available balance | NO |
| 8 | Remove split row → unsplit | Browser: click × on Row 2 → reverts to single payment | NO |
| 9 | Compile | webpack 0 new warnings | YES |

---

## Post-Code Registry Checklist
- [ ] registry.json: CR-083 → IMPLEMENTED
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: ExpenseEntryPanel.jsx + CR-083
- [ ] Code markers: // CR-083 in every modified section
- [ ] Compile: 0 new warnings
