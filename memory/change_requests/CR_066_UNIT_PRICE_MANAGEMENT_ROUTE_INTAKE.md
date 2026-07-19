# CR-066 — Unit Price Management: Owner-Only Route

**ID:** CR-066
**Type:** CR (Change Request — new feature)
**Created:** 2026-07-11
**Created by:** INTAKE AGENT (agent-discovered during session investigation)
**Sprint:** pos_5_0
**Status:** INTAKE

---

## 1. Description

Add a dedicated owner-only route for managing unit prices on expense stock items.
Cashiers must NOT be exposed to this screen — it is strictly owner/manager access.

Currently, all 5 service layer functions are already mapped but no UI page or route exists.
The Bulk Editor (`ExpenseBulkEditor.jsx`) renders a price input field that is silently
ignored on Save (registered separately as part of CR-064 wiring gap).

---

## 2. User Story

> As an owner, I want a dedicated page to set and manage unit prices for expense stock items,
> so that I can track the cost of goods accurately without exposing price data to cashiers.

---

## 3. What Already Exists (Code Reality: PARTIAL)

| Layer | Status | File |
|-------|--------|------|
| `getUnitPrices()` — GET /stock-unit-prices | ✅ Mapped | `api/services/expenseService.js` L200-201 |
| `getItemsWithoutPrices()` — GET /expenses-without-unit-prices | ✅ Mapped | `api/services/expenseService.js` L207-208 |
| `addUnitPrice(stockId, qty, price)` — POST /stock-unit-price | ✅ Mapped | `api/services/expenseService.js` L217-222 |
| `editUnitPrice(id, price)` — PUT /stock-unit-price/{id} | ✅ Mapped | `api/services/expenseService.js` L230-231 |
| `deleteUnitPrice(id)` — DELETE /stock-unit-price/{id} | ✅ Mapped | `api/services/expenseService.js` L238-239 |
| Route in App.js | ❌ NONE | — |
| Page component | ❌ NONE | — |
| Nav entry (owner-only) | ❌ NONE | — |

---

## 4. Classification

| Field | Value |
|-------|-------|
| **Type** | CR — new page/route |
| **Priority** | P2 (MEDIUM) |
| **Risk** | MEDIUM |
| **Risk reason** | New route with CRUD operations, permission-sensitive (owner-only). Not financial/billing — unit prices are for expense cost tracking only, not customer-facing. |
| **Fast Lane eligible** | NO — medium risk, multiple files, new route |

**Severity rationale:** P2 — feature gap with a workaround (prices can be discussed offline). P1 would apply if cashier-exposure is confirmed as a live data privacy risk.

---

## 5. Evidence

- **Source:** AGENT-DISCOVERED during session investigation (2026-07-11)
- **Confidence:** CONFIRMED — service layer curled and verified, route/page absence confirmed via App.js grep
- **Curl confirmed:** GET /expense/stock-unit-prices → `{ data: [], total: 0 }` (0 prices set — feature never used)
- **Curl confirmed:** GET /expense/expenses-without-unit-prices → `{ data: [...328 items...] }` (all items have no price)
- **Screenshot:** not applicable (no UI to screenshot)
- **Steps to reproduce gap:** Navigate to `/expense-setup` → observe no unit price management section beyond read-only display column showing `—` for all items

---

## 6. Blast Radius

| Scope | Detail |
|-------|--------|
| New file needed | 1 — `pages/UnitPricePage.jsx` (or tab within ExpenseSetupPage) |
| App.js route | 1 line — add route, owner-only ProtectedRoute |
| Nav (sidebar) | 1 entry — owner-only conditional |
| Service layer | 0 changes — all 5 functions ready |
| Blast radius | **MEDIUM** (~3-4 files, no hotspot files) |
| Hotspot files | NO |

---

## 7. Owner Decisions Required (Gate 2 must resolve)

| # | Question | Options |
|---|----------|---------|
| Q1 | **Route location** — standalone page or tab in ExpenseSetupPage? | a) `/unit-prices` standalone page  b) Tab within `/expense-setup` |
| Q2 | **Cashier restriction** — how to enforce owner-only access? | a) Route-level role guard  b) Nav-level hide only  c) Both |
| Q3 | **`quantity` field in addUnitPrice()** — what does this represent? | a) Minimum purchase qty (e.g. 1 unit)  b) Pack size (e.g. 12 bottles per case)  c) Always send 1 |
| Q4 | **Items without price** — show all items or only those missing a price? | a) Show all (set/edit/delete on any)  b) Two sections: "Priced" and "Not priced yet" |

---

## 8. Related Items

| ID | Relationship |
|----|-------------|
| CR-064 | RELATED — unit price field in Add Item quick-form (P2). Separate, smaller scope. |
| CR-065 | RELATED — item-level inline edit (P1). Shares ExpenseSetupPanel context. |
| BUG-154 | RELATED — expense entry qty/price conditional logic (IMPLEMENTED). |

---

## 9. Duplicate Check

**DISTINCT** — no existing CR covers an owner-only unit price management route.

---

## 10. Next Gate

Gate 2 (Impact Analysis) requires owner answers to Q1–Q4 before blast radius and file changes can be fully specified.

STATUS: INTAKE → awaiting owner decisions Q1–Q4 → Gate 2
