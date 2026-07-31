# QA Handover — CR-059 Phase 1 Bug Sprint
**Date:** 2026-07-06
**Prepared by:** Implementation Agent
**Items:** CR-059 (Expense Module Phase 1 — 3 fixes + DnD)

---

## 1. Inherited from Plan (Verification Matrix)

| Edit # | File | Change Description | How to Verify | Self-Test |
|--------|------|--------------------|---------------|-----------|
| 1 | `expenseTransform.js` L94–130 | BUG-CR059-A: Map API keys `'Date & Time'`, `'EXPENSE'`, `'Amount'`, `'Payment Method'`, `'Category'` | Load `/expenses`, pick today's date → transactions appear in table | ✅ Code verified |
| 2 | `ExpenseEntryPanel.jsx` L639 | BUG-CR059-B: Replaced `<input>` with `<ItemCombobox>` in inline edit row | Click edit (pencil) on a transaction → Item field shows dropdown of master items (not free-text) | ✅ Code verified |
| 3 | `ExpenseSetupPanel.jsx` | CR-059-DnD: DragDropContext wraps two-column layout; categories are Droppable; items are Draggable | Drag an item row → hover over a different category on the left → it highlights orange/dashed → release → item reassigned | ✅ Code verified |
| 4 | All files | Code marker `// CR-059` present | `grep -n "CR-059" <files>` | ✅ 9 files confirmed |

---

## 2. Test Cases

| # | Test | Steps | Expected |
|---|------|-------|---------|
| T1 | Transaction table loads | Login as cafe103 → go to `/expenses` → select today or any date with expenses | Transactions show with Item name, Category, Amount, Payment Method — NOT empty |
| T2 | Transform key mapping | Same as T1 but verify specific data | Row shows e.g. "N/A" in Item col, "misc" in Category col, "₹60" in Amount col, "Cash" in Payment |
| T3 | Edit row uses combobox | In transaction table, click pencil icon on a row | Item field shows a searchable dropdown with master items, NOT a plain text input |
| T4 | Edit save succeeds | In T3, pick an item from dropdown → click Save | No 500 error. Row updates. Toast: "Updated" |
| T5 | DnD drag handle visible | Go to `/expense-setup` → see items table | Each item row has a `⠿` grip icon on the left |
| T6 | Category highlights on drag | Drag an item row → hover slowly over a category on the left panel | Category background turns orange/dashed |
| T7 | DnD item reassignment | Drag item from category A → drop on category B | Toast "Item moved" appears. Item now shows in category B. Category B count increments |
| T8 | DnD no-op within same category | Drag item and drop back on same category | No API call. No change. No toast |

---

## 3. Regression Tests

| # | What to verify | Why |
|---|----------------|-----|
| R1 | `/expenses` page loads without blank screen | Core route must still compile |
| R2 | `/expense-setup` page loads without blank screen | Core route must still compile |
| R3 | Add new expense (quick-add form) still works | BUG-CR059-B fix must not break add flow |
| R4 | Sidebar "Expenses" links work for both routes | Route registration unchanged |
| R5 | Expense Setup — Add item / Rename category / Delete item | Existing CRUD must be unaffected by DnD addition |

---

## 4. Registry Sync Confirmation

- Registry synced: **YES**
- Items: CR-059
- Sprint: pos_5_0
- registry.json status: IMPLEMENTED
- CR_REGISTRY.md: updated to IMPLEMENTED
- FILE_OWNERSHIP.md: 11 files added
- Code markers: ✅ 9 files have `// CR-059`
- EXIT GATE: **5/5 PASS**

---

## 5. Credentials & Environment

- Account: owner@cafe103.com / (see /app/memory/test_credentials.md)
- URL: Use REACT_APP_BACKEND_URL from frontend/.env
- Routes: `/expenses`, `/expense-setup`
- Backend: preprod.mygenie.online (external — not in pod)
