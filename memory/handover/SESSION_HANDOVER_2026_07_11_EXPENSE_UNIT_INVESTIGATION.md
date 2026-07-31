# Session Handover — 2026-07-11 Expense Unit Investigation

**Date:** 2026-07-11
**Role:** INVESTIGATION
**Agent prompt:** AGENT_PROMPT_ALPHA v0.7
**Status:** Clean close — investigation complete, all findings documented, no code written.

---

## Session Trigger

Owner reported 3 gaps on the Expense Setup Bulk Editor screen (screenshots provided):
1. `+ Add Row` at bottom vs Menu Management's `+ Add Item` in header — design inconsistency
2. UNIT column in bulk editor — no API backing suspected
3. Missing sample template for import

Investigation expanded into a full 3-level data flow trace across:
- Level 1: Stock Master (`expenses-list`)
- Level 2: Unit Price Master (`stock-unit-prices`) — CR-066 scope
- Level 3: Expense Entry Form (`store-expense-details`)

---

## Findings Summary

### Gap 1 — Design Inconsistency: Bulk Editor

`ExpenseBulkEditor.jsx` is a standalone 149-line component built independently of
`BulkEditor.jsx` (menu management, 1061 lines). The two components diverge significantly:

| Feature | Expense Bulk Editor | Menu Bulk Editor (reference) |
|---|---|---|
| Add trigger | `+ Add Row` at **bottom** | `+ Add Item` in **header toolbar** |
| Search | ❌ | ✅ |
| Column picker | ❌ | ✅ |
| Excel / Import | ❌ | ✅ |
| Dirty tracking | ❌ | ✅ per-row amber highlight |
| Save intelligence | "Save All" always | "Save N Changes" disabled when clean |
| New row position | Appended at bottom | Pinned at top, auto-focused |

**Root cause:** `PLAN_GAP` — CR-059 built a simplified variant, not a parity port.
**Classification:** MEDIUM risk, FE-only, no hotspot files.

---

### Gap 2 — UNIT and UNIT PRICE Columns in Bulk Editor

**Curl-confirmed:** `POST /store_expense` (stock master create) silently ignores both `unit` and `unit_price` fields. `GET /expenses-list` returns no `unit` field on any of 376 items.

**Root cause of UNIT column:** Unit-of-measurement (kg/ltr/pkt) belongs at **Level 3
(transaction)** only. It has no meaning at the stock master level and no API support there.

**Root cause of UNIT PRICE column:** Unit price management is the scope of **CR-066** (dedicated
tab). The bulk editor's price column was built without wiring to `POST /stock-unit-price`.
`handleBulkSave` calls `createCategoryWithItems(cat.name, [row.title.trim()])` only — price
is silently dropped. Registered as **CR-064** (unit price in quick-add form).

---

### Gap 3 — Sample Template for Import Missing

`STOCK_SAMPLE: '/bulk_upload_sample/expense/expense_stock_sample.xlsx'` — **404** on server.
No UI button wired to it in `ExpenseSetupPanel.jsx`. Menu management has "Download Template (.xlsx)" under the Excel dropdown. Expense Setup has no equivalent.

**Root cause:** `PLAN_GAP` + `BACKEND_BUG` — file not created on server, no FE button.

---

### Level 2 Deep-Dive — API Requires quantity + price

`POST /stock-unit-price` **requires both fields:**
- `price` only → `{ "errors": ["The quantity field is required."] }`
- `price + quantity` → `{ id, stock_id, quantity, price }` ✅

**Unit-of-measurement is NOT stored at Level 2.** The unit price record stores only
`stock_id`, `quantity`, `price`. Computed `unit_price = price ÷ quantity` is FE-only.

CR-066 impact analysis (Gate 2) is accurate — qty field in the Set Price form is mandatory,
not optional. No correction needed to the plan.

---

### Level 3 Deep-Dive — Entry Form Has Two Gaps vs Owner's Description

Owner clarified the correct flow:

**Case A — Item HAS a unit price:**
- Show: unit select + read-only amount (auto-filled from unit_price_amount)
- Qty: NOT shown — implicit in the unit price calculation
- Amount = unit_price_amount directly

**Case B — Item has NO unit price:**
- Show: editable amount + optional qty + optional unit + optional physical_quantity

**Current code deviates on both cases:**

| Case | Owner says | Code today | Gap |
|---|---|---|---|
| A (has unit price) | unit only + read-only amount | qty input + unit + read-only amount | Qty shown when it shouldn't be |
| B (no unit price) | amount + optional qty/unit/physical_qty | amount only (qty/unit/physical_qty hidden) | Optional fields not shown |

**`physical_quantity`** — `expenseService.js` L145 comments it as "deprecated — always 0".
Curl confirmed backend stores and returns it correctly. Comment is wrong; it is user-enterable
in Case B.

**All fields curl-confirmed:** `POST /store-expense-details` accepts and echoes back
`quantity`, `unit`, `physical_quantity`, `notes` correctly.

---

### Additional Flag — unit_price_amount Link Unverified

`GET /expenses-list` returns `unit_price_amount` per item. Currently 0 of 376 items have
a value (no unit prices set — CR-066 UI doesn't exist yet). Cannot confirm whether
`expenses-list` joins with the unit price table on the backend. **Must be smoke-tested
as first action after CR-066 is implemented.** If not joined, Case A never triggers even
after unit prices are set — that would be a backend bug.

---

## New Items for Registration

| Suggested ID | Title | Type | Priority | Risk | Notes |
|---|---|---|---|---|---|
| BUG-168 (or new) | Entry form Case A: qty shown when should be hidden | BUG | P2 | LOW | `ExpenseEntryPanel.jsx` EntryLine component only |
| BUG-new | Entry form Case B: optional qty/unit/physical_qty not shown | BUG | P2 | LOW | `ExpenseEntryPanel.jsx` EntryLine component only |
| BUG-new | physical_quantity marked "deprecated" — incorrect, is user-enterable | BUG | P3 | LOW | `expenseService.js` L145 comment + entry form |
| CR-new | Sample template for stock master import (+ server file) | CR | P2 | LOW | FE: 1 button in `ExpenseSetupPanel.jsx`; BE: create xlsx file |
| CR-new | Bulk editor design parity with menu management | CR | P2 | MEDIUM | Redesign `ExpenseBulkEditor.jsx` |

---

## Owner Decisions Pending

| # | Decision |
|---|---|
| D1 | Bulk editor UNIT PRICE column: remove (defer to CR-066) or wire to `addUnitPrice()`? |
| D2 | Bulk editor UNIT column: confirm removal (no API, wrong layer)? |
| D3 | CR-066 Gate 3 (Implementation Plan): ready to proceed? |
| D4 | Entry form gaps (Case A qty, Case B optional fields): register as bugs for next sprint, or defer? |

---

## Next Agent Priorities

1. **CR-066 Gate 3** — Implementation Plan. Impact Analysis complete and accurate (qty confirmed mandatory by API). Two files only: `ExpenseSetupPanel.jsx` (+120 lines) + `expenseTransform.js` (+10 lines). Owner decisions Q1–Q4 all locked in impact analysis.

2. **Register entry form gaps** — if owner confirms, register as BUGs with FE-only scope. No API changes needed, no hotspot files.

3. **Remove UNIT column from ExpenseBulkEditor** — pending D2 owner confirm. If approved, fast-lane eligible (1 file, <10 lines, LOW risk).

4. **P0 still open: BUG-166** — `addon_amount` not ×qty, Gate 4 GO. Two-line fix in `orderTransform.js`. Must not be displaced.

---

## Credentials

- Preprod: `https://preprod.mygenie.online`
- Test account: `owner@cafe103.com` / `Qplazm@10`
- Login: `POST /api/v1/auth/vendoremployee/login`
- Restaurant ID: 644

---

## Artifacts Written This Session

| Artifact | Path |
|---|---|
| Session Handover | `/app/memory/handover/SESSION_HANDOVER_2026_07_11_EXPENSE_UNIT_INVESTIGATION.md` |
| Investigation Report | `/app/memory/evidence/EXPENSE_UNIT_INVESTIGATION_2026_07_11.md` |
