# Session Handover — 2026-07-11 Expense Planning (Gate 2 + Gate 3)

**Date:** 2026-07-11
**Role:** PLANNING (Gate 2 → Gate 3)
**Agent Prompt:** AGENT_PROMPT_ALPHA v0.7
**Status:** Clean close — all impact analyses and implementation plans written, registry updated.

---

## Session Summary

Full planning cycle (Gate 2 + Gate 3) completed for all items arising from the expense unit investigation session. Backend brief filed. Three items ready for Gate 4 GO.

---

## Items Completed This Session

| ID | Title | Gate | Artifacts |
|---|---|---|---|
| **CR-067** | Expense Bulk Editor — Full Parity Redesign | Gate 3 ✅ | Impact: `impact/CR_067_*` · Plan: `plans/CR_067_*` |
| **BUG-175** | Entry Form Case A: hide qty when unit price exists | Gate 3 ✅ | Impact: `impact/BUG_175_*` · Plan: `plans/BUG_175_*` |
| **BUG-176** | Entry Form Case B: show optional qty/unit/physical_qty | Gate 3 ✅ | Impact: `impact/BUG_176_*` · Plan: `plans/BUG_176_*` |
| **BACKEND_BRIEF_EXPENSE** | PUT /expense/expenses/{id} + duplicate guard | Filed ✅ | `backend_briefs/BACKEND_BRIEF_EXPENSE_MODULE_2026_07_11.md` |

---

## All Owner Decisions Locked

| ID | Decision | Answer |
|---|---|---|
| CR-067 OQ-1 | Name edit on existing items | **B** — editable, save blocked with inline error "Rename not available — backend support pending (CR-065)" |
| CR-067 OQ-2 | Category change + unit price loss | **B** — block category change when item has unit price set. Error: "Cannot move — unit price set. Remove unit price first." |
| CR-067 D2 | UNIT column | Remove |
| CR-067 D3 | UNIT PRICE column | Remove (defer to CR-066) |
| BUG-175/176 | Entry form fix scope | Separate bugs, implement this sprint |
| G4 (template) | Sample template for import | Owner will provide backend file |

---

## Implementation Plans — Key Details

### CR-067 (largest — full rewrite)
**Files:** `ExpenseBulkEditor.jsx` (full rewrite ~400 lines) + `ExpenseSetupPanel.jsx` (~-30 lines)
**What changes:**
- Toolbar: Search + `+ Add Item` (header) + Save N Changes + Excel + Import + X
- Dirty tracking: amber per row, ✓/✗ per save
- Category grouping + new rows pinned to top + auto-focus
- Save logic: new rows → POST /store_expense; cat change → DELETE+POST; name change → inline error; cat change on priced item → inline error
- Removed: `onSave` prop, `handleBulkSave`, `units` fetch from parent

**Critical:** CR-067 BEFORE CR-066. Both touch `ExpenseSetupPanel.jsx`.

### BUG-175 (smallest — ~10 lines removed)
**File:** `ExpenseEntryPanel.jsx` only
**Changes:** Remove qty input from `unitPrice > 0` block; set amount = unitPrice directly (not × qty); remove `handleQtyChange`
**Fast lane eligible** — 1 file, ≤10 lines, LOW risk. Needs owner "Fast Lane Approved" to skip full gate cycle.

### BUG-176 (~30 lines added)
**Files:** `ExpenseEntryPanel.jsx` + `expenseService.js`
**Changes:** Add `physical_quantity` to EMPTY_LINE; add optional qty/unit/physical_qty block in Case B; wire physical_quantity through save + edit + service layer

---

## Execution Order for Implementation Agent

```
1. BUG-175  (1 file, simplest — do first, verify)
2. BUG-176  (2 files, additive — no conflict with 175)
3. CR-067   (full rewrite — do before CR-066)
4. CR-066   (unit price tab — runs after 067 cleans up ExpenseSetupPanel)
```

---

## Still Open / Not In This Session

| Item | Status | Notes |
|---|---|---|
| G4 Sample template | Waiting for backend file | Once file at `/bulk_upload_sample/expense/expense_stock_sample.xlsx`, add 1 button to `ExpenseSetupPanel.jsx`. Fast lane. |
| CR-065 Item inline edit | BACKEND-BLOCKED | Backend brief filed (Brief 1). Will unblock CR-067 name save as a fast-lane follow-up. |
| CR-066 Gate 3 | Waiting for CR-067 to implement first | Impact analysis confirmed accurate. OQ-1 to OQ-4 all locked. |
| BUG-166 addon_amount ×qty | **P0 Gate 4 GO** | Still highest priority — unrelated to expense module. Must not be displaced. |

---

## Backend Briefs Filed This Session

| Brief | Endpoint | Priority |
|---|---|---|
| BACKEND_BRIEF_EXPENSE_MODULE_2026_07_11 | `PUT /expense/expenses/{id}` item rename — currently 302 | P1 |
| BACKEND_BRIEF_EXPENSE_MODULE_2026_07_11 | `POST /store_expense` duplicate item guard | P2 |

---

## Registry State

| ID | Gate | Status |
|---|---|---|
| CR-067 | 3 | GATE 3 COMPLETE |
| BUG-175 | 3 | GATE 3 COMPLETE — Fast Lane eligible |
| BUG-176 | 3 | GATE 3 COMPLETE |
| CR-066 | 2 | GATE 2 COMPLETE (plan pending, after CR-067) |
| CR-064 | 1 | INTAKE |
| CR-065 | 1 | INTAKE (BACKEND-BLOCKED) |

---

## Credentials

- Preprod: `https://preprod.mygenie.online`
- Test account: `owner@cafe103.com` / `Qplazm@10`
- Login: `POST /api/v1/auth/vendoremployee/login`
