# BUG-162 — Expense Setup panel flickers on every mutation (full re-fetch pattern)

**Registered:** 2026-07-09
**Intake by:** E1 agent (Role 1 — INTAKE, AGENT_PROMPT_ALPHA v0.7)
**Related CR:** CR-059 (Expense Module Integration)
**Related bugs:** BUG-158 (fix confirmed working via investigation 2026-07-09), BUG-161 (same pattern)

---

## 1. Summary

Every mutation in the Expense Setup panel (`/expense-setup`) triggers a full re-fetch of **3 endpoints** (`category-list` + `expenses-list` + `get-unit`) via `fetchAll()`, which calls `setLoading(true)` and re-mounts the entire table. Owner reports this looks like a "page refresh" flicker on every Add/Delete/Rename operation.

The mutation itself succeeds (BUG-158 investigation confirmed end-to-end correctness), but the UX regression is noticeable and interrupts flow, especially during bulk item entry.

## 2. Classification

| Field | Value |
|---|---|
| Type | BUG (UX regression) |
| Severity | **P2 — MEDIUM** (per §Step 1 rubric: "works but awkward" — mutation succeeds, only visual flicker) |
| Risk | **MEDIUM** (component state management, non-financial, no API contract change) |
| Sprint | POS 5.0 |
| Fast Lane eligible | **NO** — > 10 lines, touches 6 mutation handlers |
| Process required | Full gate flow (Intake → Planning → Implementation → QA) |

## 3. Duplicate Check

**Result: DISTINCT**

- ID search: no prior BUG-16x or CR registered against `optimistic`, `flicker`, `refetch`
- File search: `ExpenseSetupPanel.jsx` is under active work (CR-059 batch). BUG-DND-CR059 already applies a partial optimistic pattern in `handleDragEnd` (line 311, 314 with revert-on-error). No conflict — this bug generalises that same pattern to the remaining handlers.
- Symptom match: no prior handover mentions "flicker" or "refresh" in Expense Setup.

## 4. Evidence

- **Screenshot:** Live UI test 2026-07-09 during BUG-158 investigation. Loading spinner briefly appears; entire table re-renders after every Add. Evidence at `/app/memory/evidence/BUG-158/03_after_add_item.png`, `04_search_UI_TEST.png`.
- **Steps to reproduce:**
  1. Login to preprod as `owner@cafe103.com`
  2. Navigate to `/expense-setup`
  3. Select any category (e.g. "Others")
  4. Type an item name → press Enter (or click **Add**)
  5. Observe: brief loading spinner + full table re-render (~500ms flicker)
- **Curl output:** Not applicable — bug is FE-only.
- **Source:** OWNER-REPORTED (during BUG-158 verification session 2026-07-09)
- **Confidence:** CONFIRMED (owner observed live in current build)

## 5. Blast Radius

- **Blast radius:** SMALL (~1 file, 8 call-sites within `ExpenseSetupPanel.jsx`)
- **Hotspot files touched:** NO (not in R5 hotspot list)
- **Estimated scope:** SMALL (1–2 files, ~50 lines changed)

### Affected call-sites in `ExpenseSetupPanel.jsx`

| Handler | Line | Current behavior | Proposed behavior |
|---|---|---|---|
| `addCategory` | 158 | `fetchAll()` after POST | *Parked with BUG-159* — no change here |
| `renameCategory` | 172 | `fetchAll()` after PUT | Local `setCategories` update |
| `deleteCategory` | 188 | `fetchAll()` after Promise.all deletes | Local `setCategories` filter + `setAllItems` filter |
| `addItem` | 207 | `fetchAll()` after POST | Parse POST response `{stock_items:[{id,stock_title}]}` → `setAllItems(prev => [...prev, newMapped])` |
| `deleteItem` | 222 | `fetchAll()` after DELETE | `setAllItems(prev => prev.filter(i => i.id !== deletingItemId))` |
| `handleImport` | 251 | `fetchAll()` after import | **KEEP `fetchAll()`** — full refresh justified (bulk file, unknown row count) |
| `handleBulkSave` | 278 | `fetchAll()` after per-row POSTs | Batch collect POST responses, single `setAllItems` update |
| `handleDragEnd` | 311, 314 | Already optimistic w/ revert-on-error — refetch is intentional for ID sync | **KEEP** the post-success refetch OR replace with response-parsing (owner call in planning) |

### Files that WILL change
- `frontend/src/components/expense/ExpenseSetupPanel.jsx`

### Files that WILL NOT touch
- `frontend/src/api/services/expenseService.js` (no service change — POST response already contains required fields)
- `frontend/src/api/transforms/expenseTransform.js` (no transform change)
- `frontend/src/api/axios.js` (no interceptor change)
- Any other component

## 6. Root cause hypothesis (for planning)

The `fetchAll` helper was written as a simple always-fresh strategy during CR-059 sprint. It's correct but coarse. The `POST /store_expense` and `PUT /expenses/{id}` responses already return all fields needed to update local state without a network round-trip. Migrating each handler to an optimistic-update pattern eliminates the flicker while keeping `fetchAll` available on the header refresh button (line 375) for a manual full-sync when the user wants it.

## 7. Proposed fix (for planning)

Replace `fetchAll()` calls with local state updates in `addItem`, `deleteItem`, `renameCategory`, `deleteCategory`, `handleBulkSave`. Keep `fetchAll` for:
- Initial mount (line 138)
- Manual refresh button (line 375)
- Import handler (line 251) — bulk file, unknown result
- Error path revert (existing DnD pattern)

Estimated diff: ~50 lines across 5 handlers.

## 8. Open Questions (Owner Decisions)

| # | Question | Options |
|---|---|---|
| Q1 | Include a subtle "highlight the new row" animation after Add? | (a) Yes — highlight for 2s / (b) No — silent append |
| Q2 | Should we display "Just added" chip strip above the alphabetical list for the last 3 additions in the session? | (a) Yes — visible until reload / (b) No — rely on search |
| Q3 | Keep the manual header refresh button (line 375)? | (a) Yes / (b) Remove — optimistic is enough |

## 9. Related

- **BUG-158** — Add Item silent-fail (fixed 2026-07-08, verified working 2026-07-09). This intake is a UX polish on top of the same handler.
- **BUG-161** — Bulk Save (same code path). This intake covers its handler too.
- **BUG-DND-CR059** — DnD already partially uses optimistic pattern; will unify style.
- **BUG-159** — Add Category (parked). NOT covered by this intake — leave `addCategory` unchanged until owner UX decision.

## 10. Handover to next (→ PLANNING)

```
Item BUG-162 registered. Intake doc at /app/memory/change_requests/BUG_162_EXPENSE_SETUP_FLICKER.md.
Code reality: FULL (fetchAll pattern present at 8 sites — bug is live in current build).
Duplicate check: DISTINCT.
Severity: P2 (owner-observed, agent-confirmed via Playwright evidence).
Risk: MEDIUM (component state; non-financial; no API/transform change).
Blast radius: SMALL (1 file, ~50 lines, hotspots: NO).
Evidence: captured at /app/memory/evidence/BUG-158/03_after_add_item.png and 04_search_UI_TEST.png (BUG-158 investigation screenshots show flicker context).
Owner decisions needed: Q1/Q2/Q3 above (all optional UX polish — not blockers).
Next: Planning agent for Gates 2-3.
```

---

*Intake by: E1 agent (Emergent) — Role 1 INTAKE*
*Protocol: AGENT_PROMPT_ALPHA.md v0.7 §ROLE 1 (Steps 0a → 4 complete)*
