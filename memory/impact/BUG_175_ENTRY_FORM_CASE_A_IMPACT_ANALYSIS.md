# BUG-175 — Impact Analysis (Gate 2)

**ID:** BUG-175
**Title:** Expense Entry Form — Case A: qty input shown when item has unit price (should be hidden)
**Date:** 2026-07-11
**Agent:** PLANNING (AGENT_PROMPT_ALPHA v0.7)
**Stage:** Gate 2 — Impact Analysis
**Risk:** LOW (single component, no financial logic change, no R5 hotspot)
**Priority:** P2
**Sprint:** pos_5_0

---

## 1. Root Cause (from investigation EXPENSE_UNIT_INVESTIGATION_2026_07_11.md)

When a cashier selects an expense item that has a unit price set (via CR-066), the correct UX is:
- **Unit select** — visible (cashier picks kg/ltr/pkt for this transaction)
- **Amount** — read-only, auto-filled from `unit_price_amount`
- **Qty** — **NOT shown** (implicit; amount = unit_price_amount directly)

Current code (`ExpenseEntryPanel.jsx` L239) shows **both** qty AND unit when unit price exists:
```jsx
{line.unitPrice != null && line.unitPrice > 0 && (
  <>
    <Qty input — editable>   ← should NOT be here
    <Unit select — editable>
  </>
)}
```

Amount is already read-only (`readOnly={!!(line.unitPrice && line.unitPrice > 0)}`). That part is correct.

The auto-calc on line 185 currently does `price * parseFloat(line.quantity || 1)` — with qty removed, this should auto-set `amount = unitPrice` directly (qty=1 implicit).

---

## 2. Conflict Pre-Check

| File | Last modifier | Active items also touching it | Conflict? |
|---|---|---|---|
| `ExpenseEntryPanel.jsx` | CR-059 (2026-07-06) | None | NONE |

No active CRs or BUGs touch `ExpenseEntryPanel.jsx`. Clean.

---

## 3. Data Flow Trace

### Current (Case A — item has unit price)
```
handleItemSelect(title, item)
  → line.unitPrice = item.unitPriceAmount   (e.g. ₹6)
  → line.unit = item.unit ?? ""             (always "" — Level 1 has no unit)
  → line.amount = unitPrice * qty           (qty defaults to 1 on fresh line)

EntryLine renders:
  [Item combobox]
  {unitPrice > 0}
    [Qty input — editable]    ← renders
    [Unit select — editable]  ← renders
  [Amount — read-only]
```

### Target (Case A — item has unit price)
```
handleItemSelect(title, item)
  → line.unitPrice = item.unitPriceAmount
  → line.unit = ""
  → line.amount = String(unitPrice)   ← set directly, no qty multiply

EntryLine renders:
  [Item combobox]
  {unitPrice > 0}
    [Unit select — editable]  ← only this
  [Amount — read-only, shows unitPrice]
```

---

## 4. Affected Files

### Files WILL change

| File | Lines | Change | Hotspot? |
|---|---|---|---|
| `components/expense/ExpenseEntryPanel.jsx` | L183–196 (handleItemSelect + handleQtyChange) | Remove qty from conditional block; set amount = unitPrice directly | NO |

**Exact changes:**

**L183–186 (handleItemSelect) — currently:**
```js
if (price) {
  onChange(idx, "unit", item?.unit ?? "");
  onChange(idx, "amount", String(price * parseFloat(line.quantity || 1)));
}
```
**Target:**
```js
if (price) {
  onChange(idx, "unit", item?.unit ?? "");
  onChange(idx, "amount", String(price));  // qty implicit = 1
}
```

**L239–267 (EntryLine JSX) — currently:**
```jsx
{line.unitPrice != null && line.unitPrice > 0 && (
  <>
    <div className="min-w-[80px] w-[80px]">
      <input type="number" ... value={line.quantity} onChange={handleQtyChange} />
    </div>
    <div className="min-w-[90px] w-[90px]">
      <select value={line.unit} ... />
    </div>
  </>
)}
```
**Target:** Remove the Qty `<div>` block. Keep only the Unit `<select>` block.

**handleQtyChange function (L192–196):** Can be removed entirely (qty no longer editable in Case A). `quantity` field is still sent to API as `parseFloat(line.quantity || 0)` — this will send `0` which is acceptable.

### Files will NOT touch
- `api/services/expenseService.js` — no payload change (quantity sent as 0 by default)
- `api/transforms/expenseTransform.js` — no change
- Any R5 hotspot files

---

## 5. Risk Register

| Risk | Level | Mitigation |
|---|---|---|
| `quantity` field sent as 0 when unit price is set | LOW | Backend accepts `quantity: 0` — confirmed in probe. Unit + amount are the meaningful fields. |
| `handleQtyChange` removal — check no other callers | LOW | Only called from EntryLine Qty input. Safe to remove. |
| unit_price_amount is always null currently (CR-066 UI not built) | LOW | Fix is safe to ship now. Case A renders only when `unitPrice > 0`, which never fires until CR-066 builds prices. No visible change to cashiers until CR-066 goes live. |

---

## 6. Verification Matrix

| Edit # | File | Change | How to Verify |
|---|---|---|---|
| 1 | `ExpenseEntryPanel.jsx` | Qty input removed from Case A block | Set a test unit price via API, select that item → qty input NOT shown |
| 2 | `ExpenseEntryPanel.jsx` | Unit select still shows in Case A | Unit dropdown visible when item has unit price |
| 3 | `ExpenseEntryPanel.jsx` | Amount auto-fills as unit_price_amount directly | Amount = ₹X (not ₹X × qty) |
| 4 | `ExpenseEntryPanel.jsx` | Amount remains read-only | Cannot type in amount when unit price is set |
| 5 | `ExpenseEntryPanel.jsx` | Case B unaffected | Item without unit price: shows only Amount editable, no unit/qty |

---

## 7. Post-Code Registry Checklist

- [ ] `registry.json`: BUG-175 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] `BUG_TRACKER.md`: row updated
- [ ] `FILE_OWNERSHIP.md`: `ExpenseEntryPanel.jsx` listed with BUG-175 + date
- [ ] Code markers: `// BUG-175` in modified block

---

## Summary

```
Planning complete: BUG-175
Stage: Impact Analysis (Gate 2)
Code reality: PARTIAL (file exists, ~8 lines to change)
Risk: LOW (single component, no R5/R6, no API changes)
Files WILL change: ExpenseEntryPanel.jsx (~8 lines removed)
Files WILL NOT touch: expenseService.js, expenseTransform.js, all R5 hotspots
Owner decisions: NONE — owner described correct behaviour in session
Conflicts: NONE
Fast Lane eligible: YES (≤10 lines, 1 file, LOW risk, no financial/API/hotspot) — owner approval required
Next: Gate 4 GO or Fast Lane approval → Implementation
```
