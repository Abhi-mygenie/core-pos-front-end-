# Batch A — Expense Module Bugs (BUG-199 + BUG-200 + BUG-201 Phase 1) — Impact Analysis

**Date:** 2026-07-16
**Role:** PLANNING
**Gate:** 2 (Impact Analysis)
**Sprint:** POS 5.0
**Alpha Version:** v0.8

---

## Header

| Field | Value |
|---|---|
| **Code Reality** | PARTIAL — see per-bug section below |
| **Conflict Pre-Check** | NONE within Batch A (all three edit disjoint code paths); recent editors of the same files are BUG-175/176/163/DND-CR059 (all CLOSED). Safe to plan. |
| **Batch Risk** | MEDIUM (BUG-199: MEDIUM, BUG-200: MEDIUM, BUG-201: HIGH per intake) |
| **Batch Blast Radius** | 4 files edited, 0 new files. ~50 lines total. |
| **Financial** | No financial-formula changes. BUG-201 protects financial data (transaction records) from silent deletion — safety-positive. |
| **R25 relevance** | LOW — no update endpoints being wired; all fixes are (a) payload field additions to existing POST, (b) query-param rename on GET, (c) UI dialog enhancement. No `api.post`↔`api.put` verb corrections. |

---

## 1. BUG-199 — Expense Entry: new item always goes to "misc"

### Code Reality: PARTIAL — matches intake exactly

Grep confirms the two omission sites:

| Location | Current | Missing |
|---|---|---|
| `src/components/expense/ExpenseEntryPanel.jsx:489–497` (`handleSave` — details mapping) | `{ expense, amount, payment_method, quantity, unit, physical_quantity, notes }` | `category_id` |
| `src/api/services/expenseService.js:134–146` (`addExpenseEntry` — payload) | `{ expense, amount, payment_method, quantity, unit, physical_quantity }` | `category_id` |

Additional finding (not in intake — flagged per **R1: code is truth**):
- `EMPTY_LINE` (L33) DOES track `categoryId` in component state — plumbing exists all the way to the handler; only the last-mile serialization is missing.
- `editExpenseEntry` (`expenseService.js:154–163`) also omits category. **This is out of scope** for BUG-199 (edit flow) but is a latent bug — should be raised as **BUG-199-B** or covered in a follow-up. Owner decision needed.

### Data Flow (verified)

```
User → CategorySelect (line.categoryId set)
     → ItemCombobox (line.itemName set; also auto-fills categoryId from master, L177)
     → handleSave (L472) builds `details`  ← categoryId DROPPED HERE
     → expenseService.addExpenseEntry     ← category_id DROPPED HERE
     → POST /store-expense-details        ← backend sees no category → defaults "misc"
```

### Risk: MEDIUM
- No hotspot files (per FILE_OWNERSHIP.md, `ExpenseEntryPanel.jsx` is CR-059 territory, no high-risk marker).
- Additive field on POST payload — regression risk LOW.
- Data corruption impact: historical entries created since CR-059 release are miscategorized. **Owner decision: backfill script needed?** (parking as Owner Q-1 below.)

### Downstream Consumers
- Expense Report page category filter (BUG-200) — fixing BUG-199 in isolation surfaces the report-filter bug more prominently since new items will finally have real categories.
- Expense Setup DnD — unaffected (moves items across categories via DELETE+POST re-create).
- Category delete cascade (moves items to uncategorized) — unaffected.

### Files to edit
- `src/components/expense/ExpenseEntryPanel.jsx` (~1 line)
- `src/api/services/expenseService.js` (~1 line in `addExpenseEntry`; optionally +1 in `editExpenseEntry` if owner extends scope)

---

## 2. BUG-200 — Expense Report: category filter returns 0

### Code Reality: PARTIAL — intake accurate

| Location | Current | Problem |
|---|---|---|
| `src/api/services/expenseService.js:120–125` (`getExpenseReport`) | Sends `params.category_id = categoryId` where `categoryId` is numeric (`c.id`) | Backend returns 0 rows. Root cause is one of the 4 hypotheses in intake (param name, param value shape, unsupported filter, ID mismatch). |
| `src/pages/reports-module/ExpenseReportPage.jsx:110–114` | Passes `categoryId: categoryFilter || null` to service | This layer is correct — bug is at the wire. |

### Coupling to BUG-199
Fixing BUG-200 without fixing BUG-199 will help partially — new items go to "misc" until BUG-199 is fixed, so filtering by "Staff Salary" would still return 0 rows for those new entries. **Recommended ordering: BUG-199 → BUG-200** so end-to-end test data is coherent.

### Risk: MEDIUM
- Read-only endpoint — no data mutation.
- 1-line param rename once the correct name is known.

### Files to edit
- `src/api/services/expenseService.js` (~1–2 lines depending on hypothesis chosen)

---

## 3. BUG-201 Phase 1 — Deletion cascade warning (item delete)

### Code Reality: STALE INTAKE — flagged per R1

Intake claims delete uses `window.confirm("Delete?")`. **Reality:** delete already uses a proper modal (`ExpenseSetupPanel.jsx:897–914`) with `data-testid="delete-item-confirm"`. It's just generic wording — no cascade info, no transaction count.

Corrected scope: **enhance the existing modal**, do NOT create a new component. Blast radius shrinks vs. intake estimate.

### Current modal
```
Title: "Remove Item?"
Body:  "This action cannot be undone."
CTAs:  [Cancel] [Remove]
```

### Required modal (owner spec, per intake)
```
Title: "Delete '<item name>'?"
Body:  If has_txns:
         "This item has <N> expense transactions totaling ₹<total>.
          Deleting will permanently remove the item AND all related expense records."
       Else:
         "Delete item '<name>'? This cannot be undone."
CTAs:  [Cancel] [Delete Item + N Transactions]  (red button)
```

### Pre-delete impact source — 3 options (BLOCKER, see below)

| Option | Reliability | Effort |
|---|---|---|
| **A. Dedicated backend endpoint** (e.g. `GET /expense/expenses/{id}/impact` → `{count, total}`) | HIGH — authoritative | Depends on backend existence (OQ-1) |
| **B. Client-side count from Expense Report data** (fetch `/expenses-report?item_id=X` or filter loaded rows by item name) | MEDIUM — date-range-bounded, must widen to "all time" | +30 lines, +1 API call, potential perf hit on large datasets |
| **C. Generic warning without count** ("This item may have linked transactions…") | LOW — no numbers, but ships now | Minimal |

Owner ruling needed. Default recommendation if OQ-1 is unresolved: **Option C for Phase 1**, then upgrade to A when backend confirms endpoint.

### Risk: HIGH
- Prevents silent destruction of financial transaction records — safety-positive, but…
- If we ship with wrong transaction count (Option B with narrow date range), user may proceed thinking impact is small when it's actually larger. **Option B is risky without an "all-time" query guarantee.**
- Role-gating (owner-only) is Phase 2, deferred per intake. Do NOT add here.

### Files to edit
- `src/components/expense/ExpenseSetupPanel.jsx` — enhance existing modal (L897–914); add pre-fetch call in `setDeletingItemId(item.id)` path (L648) to load impact before opening modal.
- `src/api/services/expenseService.js` — add `getItemDeleteImpact(id)` helper (only if Option A or B).

---

## 4. Batch-level Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Backend `/store-expense-details` uses different key than `category_id` | MED | Fix ships but item still lands in misc | **CURL VERIFY before coding (see BLOCKER B-1)** |
| Backend `/expenses-report` param not `category_id` | MED | Fix ships but filter still returns 0 | **CURL VERIFY (BLOCKER B-2)** |
| Backend has no pre-delete impact endpoint | MED | Phase 1 ships as generic warning (Option C) | Owner accepts fallback (BLOCKER B-4) |
| Fixing BUG-199 accidentally overrides master-item's category (line's dropdown vs master combobox auto-fill at L177) | LOW | New items land in the WRONG explicit category | Verification test: user selects Cat X → picks item from Cat Y master → check saved category matches the dropdown, not the auto-fill |
| `editExpenseEntry` also omits category (out-of-scope but latent) | HIGH (already latent) | Edits reset category to misc | Owner decision Q-1: extend BUG-199 or file as BUG-199-B |
| No regression on BUG-175/176 (recent edits in same file) | LOW | — | Verification test: Case A (no qty) + Case B (with qty + physical_qty) still save correctly |

---

## 5. Owner Decisions — Status

### 🛑 B-1 — Backend contract for BUG-199 (curl required) — **OPEN**
**Question:** Does `POST /store-expense-details` accept `category_id` at the detail-line level, and is the exact key `category_id` (snake_case) vs `categoryId` vs `category` vs `expense_category_id`?
**How to resolve:** Fresh login → curl `POST /store-expense-details` with a test payload including `category_id` at line level → GET the created expense → verify category persisted.
**Blocks:** BUG-199 implementation.
**Owner action needed:** Confirm you want me to run the curl session (need Bearer via `owner@18march.com` per `test_credentials.md`).

### 🛑 B-2 — Backend contract for BUG-200 (curl required) — **OPEN**
**Question:** Which query param does `GET /expenses-report` accept for category filtering — `category_id` (numeric ID), `category` (name), or `category_name`?
**How to resolve:** Fresh login → three parallel curls with each candidate → whichever returns rows is correct.
**Blocks:** BUG-200 implementation.

### ✅ B-3 — Backend pre-delete impact endpoint (BUG-201) — **RESOLVED (owner-approved backend work)**
**Owner ruling (2026-07-16):** Backend will add new endpoints + change delete semantics. **New business rules:**
- **R-201-A:** Item delete blocked unless ALL its expense transactions have been deleted first.
- **R-201-B:** Category delete blocked unless it contains ZERO items (must move items out first).
- Backend to remove all cascade behavior from `DELETE /expense/expenses/{id}` and `DELETE /expense/category/{id}`; return **409 Conflict** with counts when blocked.
- Optional pre-check endpoints (`GET /expense/expenses/{id}/impact`, `GET /expense/category/{id}/impact`) requested but not blocking.
**Artifact:** `/app/memory/backend_briefs/BACKEND_BRIEF_BUG201_2026-07-16.md`
**Blocks:** BUG-201 Phase 1 backend-side. Frontend can proceed with interim generic warning while backend delivers.

### ✅ B-4 — Fallback strategy for BUG-201 — **RESOLVED**
**Owner ruling (2026-07-16):** **Escalate to backend** (Option: BACKEND_BRIEF). Do NOT ship Option B (client-side count) or Option C (generic warning) as the permanent solution.
**FE interim plan while awaiting backend:** Ship a **generic warning** copy update on the existing modal (no counts, just clearer language) — Phase 1 minimum viable safety net. Then upgrade to the 409-driven flow once backend delivers.

### ⚠ Q-1 — Non-blocker, extension question for BUG-199
Should `editExpenseEntry` also be fixed (category persists on edit), keeping BUG-199 as a single unit? Or file separately as **BUG-199-B**?
**Recommendation:** Extend BUG-199 to include edit — same key, +2 lines, same regression envelope.

### ⚠ Q-2 — Non-blocker, backfill question for BUG-199
Are historical expense entries (created after CR-059 shipped) that landed in "misc" going to be re-categorized manually by the finance team, or do you want a backfill script planned separately?
**Recommendation:** Manual re-categorization via the existing Expense Report edit flow — a backfill script is out of Batch A scope.

---

## 6. Files Touched — Scope Lock (draft, to be finalized in Impl Plan)

**WILL change:**
- `src/api/services/expenseService.js` (BUG-199 + BUG-200 + BUG-201 helper if Option A/B)
- `src/components/expense/ExpenseEntryPanel.jsx` (BUG-199)
- `src/components/expense/ExpenseSetupPanel.jsx` (BUG-201 Phase 1)
- `src/pages/reports-module/ExpenseReportPage.jsx` (BUG-200 — likely untouched; the fix lives in service, but keeping on the list in case categoryId type conversion is needed)

**WILL NOT touch:**
- `src/api/transforms/expenseTransform.js` — already handles `category_id ?? null` bidirectionally
- `src/api/constants.js` — no new endpoints unless B-3 requires a new pre-delete route
- Any file outside `expense/` — no coupling
- Role/permission code (Phase 2 deferred to CR-071)

---

## 7. Execution Sequence (recommended)

1. **Resolve blockers B-1 through B-4** via curl session + owner decisions.
2. **BUG-199 first** (2 lines, unblocks BUG-200 test data).
3. **BUG-200 second** (1 line, once param confirmed).
4. **BUG-201 Phase 1** last (largest UI change, isolated from 199/200 code).
5. Single QA pass covering all three (batch-level Verification Matrix in Impl Plan).

---

## 8. Handover

Impact Analysis complete for 3 items (BUG-199, BUG-200, BUG-201 Phase 1).
**Status (updated 2026-07-16):**
- ✅ B-3 resolved: BACKEND_BRIEF drafted at `/app/memory/backend_briefs/BACKEND_BRIEF_BUG201_2026-07-16.md` — new business rules R-201-A (item→txns first) + R-201-B (category→items first). Owner will route to backend team.
- ✅ B-4 resolved: escalate to backend; FE ships interim generic-warning wording change until backend delivers.
- 🛑 B-1 still OPEN — needs curl-verify on `POST /store-expense-details` payload key.
- 🛑 B-2 still OPEN — needs curl-verify on `/expenses-report` category param name.
- ⚠ Q-1, Q-2 non-blocking; will use planning defaults unless owner overrides.

**Awaiting:** curl session approval to resolve B-1 + B-2 → then Gate 3 Implementation Plan.

---

## 9. Scope Expansion — Batch A Extended (2026-07-16, owner-driven)

Owner added the following to Batch A during Gate 2 review:

### 9.1 BUG-202 (new intake) — Add Edit Item (rename + change category) to Expense Setup

**Problem:** Item list in `ExpenseSetupPanel.jsx` supports only Add and Delete. There is no way to rename an item or change its category without the destructive DnD workaround.

**Critical data-model question surfaced by owner:** Will edits reflect in historical transactions and reports?
- `expenseTransform.js:111–120` shows transactions carry `expense` (name string) + `category` (name string) + `categoryId` (numeric FK), but NO `expense_id`/`item_id` FK. This suggests a **snapshot model** — edits do NOT propagate to history — but must be curl-verified.

**Behavior options (owner ruling required — B-7):**
- **B-1 Snapshot (recommended):** rename/re-categorize applies to new transactions only; history preserved. Accounting-safe.
- **B-2 Retroactive:** rewrite past transactions. Fast, intuitive, but destroys audit trail — NOT recommended.
- **B-3 Hybrid:** versioned name in master + current-name display + historical fallback. Needs significant backend work.

**Backend dependency (B-6):** `PUT /expense/expenses/{id}` likely doesn't exist (DnD uses DELETE+POST workaround). If confirmed absent → BACKEND_BRIEF needed.

**Design dependency:** UI pattern should follow Menu Management (see CR-074-B). Design_agent needed before implementation.

**Risk:** HIGH (backend + data-model + design coupling).

**Files (estimated):** `ExpenseSetupPanel.jsx`, `expenseService.js`, `api/constants.js`.

### 9.2 CR-074 (new intake) — Remove Import/Export + Design Consistency Refresh

**CR-074-A — Remove Excel/CSV import & export**
Surfaces in code:
- `ExpenseBulkEditor.jsx` (L34, L230, L234, L249, L289)
- `expenseService.js` (`exportStockMaster` L89, `importStockMaster` L97, `exportExpenseReport` L181, `importExpenses` L189)
- `ExpenseReportPage.jsx` (L43–44, L236, L285) — download menu (Excel + PDF)

**Ambiguity (B-5):** Owner intent unclear between:
- Narrow — remove only item-master import/export in setup/bulk editor (recommended default).
- Broad — also remove report Excel/PDF download.

**CR-074-B — Design consistency refresh**
Owner noted Expense Setup and Bulk Editor UIs diverge from Menu Management pattern. Requested design_agent mockup after impact analysis.

**Coupling with CR-067 (Expense Bulk Editor Redesign — CLOSED 2026-07-11):** Owner ruling needed (B-8) — is CR-074-B a full replacement of CR-067's bulk editor, or a re-skin? Impact on that CR's blast radius must be assessed before Gate 3.

**Risk:** MEDIUM (UI-only; CR-074-A safe, CR-074-B is redesign — should have its own gate).

**Files (estimated):** `ExpenseBulkEditor.jsx`, `ExpenseSetupPanel.jsx`, `expenseService.js`, conditionally `ExpenseReportPage.jsx` + `utils/reportExporter.js`.

### 9.3 New Blockers (B-5..B-8)

| ID | Blocker | Blocks |
|---|---|---|
| **B-5** | CR-074 scope — Narrow vs Broad | CR-074-A implementation |
| **B-6** | BUG-202 backend model — is `PUT /expense/expenses/{id}` supported? (curl + possibly BACKEND_BRIEF) | BUG-202 implementation |
| **B-7** | BUG-202 rename/re-categorize semantics — Snapshot / Retroactive / Hybrid? | BUG-202 implementation approach |
| **B-8** | CR-074-B — replaces CR-067 bulk editor or complements it? | CR-074-B design brief |

### 9.4 Revised Batch A execution order (post-decisions)

1. Curl session resolves B-1, B-2, B-6 in one pass.
2. Owner rulings on B-5, B-7, B-8.
3. design_agent invoked with resolved constraints → mockup for owner approval.
4. Gate 3 Implementation Plan covers all 5 items:
   - BUG-199 (independent, ship first)
   - BUG-200 (independent, ship second)
   - BUG-201 Phase 1 interim (wording only, awaiting backend)
   - CR-074-A (Narrow remove — independent, low risk)
   - BUG-202 + CR-074-B (paired, gated by design approval + backend for PUT endpoint)
