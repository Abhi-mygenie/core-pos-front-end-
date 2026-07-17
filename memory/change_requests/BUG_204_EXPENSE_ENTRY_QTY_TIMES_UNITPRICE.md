# BUG-204 — Add Expense: Priced Items Should Show Qty Input with Auto-Calc Total

**Registered:** 2026-07-17
**Source:** OWNER-REPORTED (smoke observation during CR-074-B Phase 6 closeout)
**Confidence:** CONFIRMED (agent verified in code)

---

## Classification
- **Type:** BUG (incorrect UX for core expense entry flow)
- **Severity:** P1 — core expense entry UX broken for multi-quantity purchases. No workaround except manually computing total and overriding.
- **Risk:** MEDIUM — touches expense entry form (financial calculation), but isolated to `ExpenseEntryPanel.jsx`
- **Fast Lane eligible:** NO (financial calculation logic + state management change)

## Duplicate Check
- **Result:** RELATED to BUG-175
- **History:** BUG-154 originally implemented qty×price auto-calc. BUG-175 then **removed** the qty input for priced items (Case A), making amount = unitPrice×1 (fixed). Owner now reverses that decision — qty input should be VISIBLE with proper auto-calc.
- **Related:** BUG-154 (original conditional logic), BUG-175 (removed qty for Case A), BUG-176 (Case B qty/unit/phys.qty)

## Description

When adding an expense for a **priced item** (e.g., "pav" at ₹26/unit):

**Current behavior (BUG-175 Case A):**
1. Select "pav" → amount auto-fills to ₹26 (read-only)
2. **Quantity input is HIDDEN** — implicit qty = 1
3. Only the Unit dropdown appears
4. User cannot enter qty > 1 → always records ₹26 regardless of actual quantity purchased

**Expected behavior (owner request):**
1. Select "pav" → unit price ₹26 is referenced
2. **Quantity input VISIBLE** — user enters qty (e.g., 3)
3. **Total = unit price × qty = ₹26 × 3 = ₹78** — auto-calculated, NON-EDITABLE
4. Unit dropdown still shown

**Impact:** Every expense entry for priced items with qty > 1 records the wrong amount today. Cashier must mentally compute total and use a non-priced item as workaround.

## Code Trace

**File:** `src/components/expense/ExpenseEntryPanel.jsx`

**BUG-175 code (lines 183-186):**
```js
// BUG-175: amount = unit price directly (qty implicit = 1, qty input hidden in Case A)
onChange(idx, "unit", item?.unit ?? "");
onChange(idx, "amount", String(price));  // ← locks to price×1
```

**Case A rendering (line 273):**
```jsx
// Case A — only Unit dropdown, NO qty input
{line.unitPrice != null && line.unitPrice > 0 && (
  <div>
    <select value={line.unit} ... />  {/* Unit dropdown only */}
  </div>
)}
```

**Fix required:**
1. In Case A block: add qty input (default 1) BEFORE amount
2. Amount field: compute `unitPrice × qty` on every qty change, keep read-only
3. On item select: set amount to `price × 1` (default qty=1), set qty to "1"
4. Display unit price reference (e.g., "₹26/unit") as helper text

## Evidence
- Screenshot: provided by owner — "pav" selected at ₹26, amount locked to ₹26, Unit dropdown visible but no qty input
- Code: `ExpenseEntryPanel.jsx` lines 183-186, 272-288

## Blast Radius
- **SMALL** — 1 file: `ExpenseEntryPanel.jsx` (~15-20 lines change)
- **Hotspot files:** NO
- **Backend dependency:** NO — backend already accepts `quantity` field in expense payload (verified in BUG-176)
- **Regression risk:** Check that Case B (non-priced items) still works correctly; check that `handleSave` payload includes qty correctly

## Owner Decisions (locked 2026-07-17)
- **OQ-1: RESOLVED → EMPTY.** Qty field starts empty — user must enter quantity. No default.
- **OQ-2: RESOLVED → LIVE ON KEYSTROKE.** Total recalculates on every keystroke for best UX responsiveness.
- **OQ-3: RESOLVED → YES.** Show breakdown text (e.g., "₹26/unit × 3 = ₹78") as helper/hint below or beside the amount field.

## Next
Planning agent for Gate 2 (Impact Analysis). **No backend blocker** — can proceed immediately.
