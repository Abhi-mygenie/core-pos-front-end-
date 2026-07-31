# BUG-176 — Impact Analysis (Gate 2)

**ID:** BUG-176
**Title:** Expense Entry Form — Case B: optional qty / unit / physical_qty hidden; physical_quantity incorrectly deprecated
**Date:** 2026-07-11
**Agent:** PLANNING (AGENT_PROMPT_ALPHA v0.7)
**Stage:** Gate 2 — Impact Analysis
**Risk:** LOW (additive UI fields, no financial logic change, no R5 hotspot)
**Priority:** P2
**Sprint:** pos_5_0

---

## 1. Root Cause (from investigation EXPENSE_UNIT_INVESTIGATION_2026_07_11.md)

Owner description of Case B (item has NO unit price):
> "cashier adds amount and optionally quantity and unit and physical quantity"

### Gap A — qty / unit / physical_qty are completely hidden in Case B

Current code: these three fields only appear inside the `unitPrice > 0` conditional block. When no unit price → all three are invisible.

```jsx
{line.unitPrice != null && line.unitPrice > 0 && (
  // qty + unit — only shown here
)}
```

`physical_quantity` is never shown anywhere in the form — it is hard-coded to `0` in the API call.

### Gap B — physical_quantity marked "deprecated" in code — incorrect

`expenseService.js` L144 and L162:
```js
physical_quantity: 0, // deprecated — always 0
```

Curl confirmed: `POST /store-expense-details` accepts `physical_quantity`, stores it, and `GET /expenses-report` returns it per row. Field is live on the backend. The comment is wrong and the field is never user-enterable.

---

## 2. Conflict Pre-Check

| File | Last modifier | Active items also touching it | Conflict? |
|---|---|---|---|
| `ExpenseEntryPanel.jsx` | CR-059 (2026-07-06) | None | NONE |
| `api/services/expenseService.js` | BUG-163 (2026-07-11) | CR-064 (INTAKE, files_impacted includes expenseService.js) | LOW — CR-064 adds a function, BUG-176 edits a comment in existing functions. No line conflict. |

---

## 3. Data Flow Trace

### Current (Case B — item has NO unit price)
```
EntryLine renders:
  [Item combobox]
  // unitPrice conditional = false → nothing
  [Amount — editable]
  [Payment select]

API call (addExpenseEntry):
  details: [{ expense, amount, payment_method,
              quantity: parseFloat(line.quantity || 0),   ← always 0 (field not shown)
              unit: line.unit || '',                       ← always '' (field not shown)
              physical_quantity: 0 }]                     ← hard-coded
```

### Target (Case B — item has NO unit price)
```
EntryLine renders:
  [Item combobox]
  [Amount — editable]
  [Payment select]
  ── optional fields (always visible, lightly styled) ──
  [Qty input — optional, number]
  [Unit select — optional]
  [Physical Qty input — optional, number]

API call:
  details: [{ expense, amount, payment_method,
              quantity: parseFloat(line.quantity || 0),
              unit: line.unit || '',
              physical_quantity: parseFloat(line.physical_quantity || 0) }]
```

---

## 4. Affected Files

### Files WILL change

| File | Lines | Change type | Hotspot? |
|---|---|---|---|
| `components/expense/ExpenseEntryPanel.jsx` | L32–37 (EMPTY_LINE), L239–267 (conditional block), L454–460 (save details map) | Additive — always-visible optional field block | NO |
| `api/services/expenseService.js` | L144, L162 | Fix wrong "deprecated" comment, wire to `l.physical_quantity` | NO |

**Exact changes:**

**`ExpenseEntryPanel.jsx` — EMPTY_LINE (L32–37):** Add `physical_quantity: ""` to initial state.
```js
const EMPTY_LINE = {
  categoryId: "", itemName: "", amount: "", paymentMethod: "Cash Draw",
  quantity: "", unit: "",
  unitPrice: null,
  isCustomItem: false,
  physical_quantity: "",   // ← ADD
};
```

**`ExpenseEntryPanel.jsx` — optional fields block (after Amount, before Payment):**
Move qty + unit out of the `unitPrice > 0` conditional. Show always, styled as optional (lighter placeholder, smaller width).

Restructured render logic:
```jsx
{/* BUG-175: Unit only shown when item has unit price */}
{line.unitPrice != null && line.unitPrice > 0 && (
  <Unit select />
)}

{/* BUG-176: Optional qty / unit / physical_qty always visible in Case B */}
{(!line.unitPrice || line.unitPrice <= 0) && (
  <Qty input (optional) />
  <Unit select (optional) />
  <Physical Qty input (optional) />
)}
```

**`ExpenseEntryPanel.jsx` — save details map (L454):**
```js
// Current:
quantity: parseFloat(l.quantity || 0),
unit: l.unit || "",

// Target (add physical_quantity):
quantity: parseFloat(l.quantity || 0),
unit: l.unit || "",
physical_quantity: parseFloat(l.physical_quantity || 0),  // ← ADD (BUG-176)
```

**`expenseService.js` — L144 and L162:**
```js
// Current:
physical_quantity: 0, // deprecated — always 0

// Target:
physical_quantity: l.physical_quantity || 0,  // BUG-176: user-enterable in Case B
```
Note: `editExpenseEntry` at L162 also uses `physical_quantity: 0`. Change to: `physical_quantity: data.physical_quantity || 0`. The `editRow` state in `startEdit()` must also add `physical_quantity: tx.physical_quantity || ""`.

### Files will NOT touch
- `api/transforms/expenseTransform.js` — transform already maps `unit` and `quantity` correctly at L121. `physical_quantity` is in the report transform response at L120. No change needed.
- Any R5 hotspot files

---

## 5. Risk Register

| Risk | Level | Mitigation |
|---|---|---|
| Showing qty/unit in Case B changes form layout — may look cluttered | LOW | Style as optional: smaller inputs, lighter placeholder text, grey label. Same approach as EntryLine's existing conditional fields. |
| physical_quantity in editExpenseEntry — `editRow` state doesn't currently carry it | LOW | Add `physical_quantity: tx.physical_quantity || ""` to `startEdit()` function. Covered in plan edit. |
| `expenseService.js` passes `l.physical_quantity` — but `l` is a local param in `addExpenseEntry`. Must verify variable name. | LOW | `expenseService.js` L134–146: the function receives `lines` array, iterates as `l`. `l.physical_quantity` is correct once callers pass it. |
| Inline edit form (`editRow`) doesn't show physical_qty field | LOW | In scope — `startEdit()` + inline edit TD must also show physical_qty input. Add to verification matrix. |

---

## 6. Verification Matrix

| Edit # | File | Change | How to Verify |
|---|---|---|---|
| 1 | `ExpenseEntryPanel.jsx` | Optional qty/unit/physical_qty shown in Case B | Select item with no unit price → 3 optional fields visible |
| 2 | `ExpenseEntryPanel.jsx` | Fields are optional — form saves without them | Leave qty/unit/physical_qty empty → save succeeds |
| 3 | `ExpenseEntryPanel.jsx` | Fields accept values and pass to API | Enter qty=2, unit=kg, physical_qty=1 → POST includes all 3 |
| 4 | `expenseService.js` | physical_quantity no longer hard-coded to 0 | Network tab: `physical_quantity: 1` in request body when user enters 1 |
| 5 | `ExpenseEntryPanel.jsx` | Case A unaffected — unit still shows, qty still hidden | Select item with unit price → only unit shows (BUG-175 behaviour) |
| 6 | `ExpenseEntryPanel.jsx` | Inline edit form also shows physical_qty | Edit existing row → physical_qty field visible |
| 7 | `ExpenseEntryPanel.jsx` | resetForm() clears all new fields | Click Reset → qty/unit/physical_qty cleared |

---

## 7. Post-Code Registry Checklist

- [ ] `registry.json`: BUG-176 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] `BUG_TRACKER.md`: row updated
- [ ] `FILE_OWNERSHIP.md`: `ExpenseEntryPanel.jsx` + `expenseService.js` listed with BUG-176 + date
- [ ] Code markers: `// BUG-176` in every modified block

---

## Summary

```
Planning complete: BUG-176
Stage: Impact Analysis (Gate 2)
Code reality: PARTIAL (files exist, additive changes)
Risk: LOW (no R5/R6, additive UI fields, no financial logic)
Files WILL change: ExpenseEntryPanel.jsx (~25 lines additive + 5 edit),
                   expenseService.js (2 lines comment fix + wire physical_qty)
Files WILL NOT touch: expenseTransform.js, expenseSetupPanel.jsx, all R5 hotspots
Owner decisions: NONE — owner described correct behaviour in session
Conflicts: Low-risk overlap with CR-064 on expenseService.js (different functions, no line conflict)
Fast Lane eligible: NO — touches 2 files (Fast Lane requires 1 file only)
Next: Gate 4 GO → Implementation
```
