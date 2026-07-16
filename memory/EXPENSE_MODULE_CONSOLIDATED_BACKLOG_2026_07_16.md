# Expense Module — Consolidated Backlog (2026-07-16)

**Prepared by:** Planning role
**Purpose:** Consolidate all 31 expense-module registry items into a clean, deduplicated backlog. Apply owner ruling "no bulk import/export in Expense Module" and identify supersedances.
**No code edits.** This document only reorganizes the registry view; actual `registry.json` updates happen at closeout.

---

## Executive Summary

| Bucket | Count | What it means |
|---|---|---|
| ✅ Already shipped (QA PASS or IMPLEMENTED) | 19 | Prior-session work. No action needed except owner smoke-tests where marked. |
| 🟢 Shipping this session | 4 | BUG-199, BUG-200, BUG-201 interim, CR-074-A |
| 🟡 Blocked (backend / design) | 3 | BUG-182, BUG-202, CR-074-B |
| 🔵 Independent OPEN | 5 | BUG-162, CR-062, CR-064, CR-071 + (CR-065 to be retired — see below) |
| 🔴 To RETIRE (superseded or moot by "no import/export") | 4 | BUG-163 (moot), BUG-174 (moot), BUG-172/173 (folded into CR-074-B), CR-065 (folded into BUG-202) |

**Net effect after consolidation:** the "open + blocked" expense backlog goes from **12 items** → **8 items**.

---

## 1. Already Shipped (19 items — reference only)

| ID | Title (truncated) | Note |
|---|---|---|
| CR-059 | Expense Module — Migration from Old POS | Foundational. |
| CR-061 | Expense Report — FE Build with Client-Side Aggregation | Owner smoke pending. |
| CR-066 | Unit Price Management (owner-only) | — |
| CR-067 | Expense Bulk Editor — Full Parity Redesign | **UI patterns being superseded by CR-074-B** — no rollback needed; the file will be redesigned in place. |
| BUG-150 | DnD item bounces back — categoryId null | — |
| BUG-151 | Edit transaction fails — exp_name key | — |
| BUG-152 | Delete transaction fails — wrong endpoint | — |
| BUG-153 | Add expense UX — category required blocks free-text | — |
| BUG-154 | Add expense qty/price conditional logic | — |
| BUG-155 | Add expense: optional category dropdown after free-text | — |
| BUG-156 | Add expense: default payment method = Cash Draw | — |
| BUG-157 | Expense Setup DnD: category pill sizing | — |
| BUG-175 | Expense Entry Form Case A qty logic | — |
| BUG-176 | Expense Entry Form Case B qty/physical_quantity | — |
| BUG-177 | Expense Entry notes field missing (add form) | — |
| BUG-178 | Expense Entry item name read-only in edit mode | — |
| BUG-179 | Expense Report Excel export empty file | **Report Excel export is KEPT** — Insights/Report exports are OUT-OF-SCOPE of the "remove import/export" ruling. |
| BUG-180 | Expense Report PDF export args | **Report PDF export is KEPT** — same rationale as BUG-179. |
| BUG-181 | Expense Entry Added By column missing | — |

**Owner action on this bucket:** none required.

---

## 2. Shipping this Session (Batch A, 4 items — awaiting Phase 4 closeout)

| ID | Title | Status | Action |
|---|---|---|---|
| **BUG-199** | Category persistence on create + edit | IMPLEMENTED + QA-PASS | Flip to IMPLEMENTED at Phase 4 |
| **BUG-200** | Report category filter returns 0 | Auto-resolved | Close as DUPLICATE-OF-BUG-199 |
| **BUG-201 Phase 1 interim** | Cascade warning wording on delete modal | IMPLEMENTED + QA-PASS | Flip to PHASE 1 INTERIM IMPLEMENTED (full path still backend-blocked) |
| **CR-074-A** | Remove Import/Export + dead-code sweep | IMPLEMENTED + QA-PASS | Flip -A to IMPLEMENTED |

---

## 3. Blocked (Backend / Design — 3 items)

| ID | Title | Blocked on | Estimated unblock |
|---|---|---|---|
| **BUG-182** | Expense Report wrong employee name | Backend inconsistency | Requires backend rationalization of names. Filed backlog. |
| **BUG-202** | Expense Setup — Edit Item (rename + change category) | `BACKEND_BRIEF_BUG202` — new PUT /expense/stock-items/{id} | Owner forwards brief; ETA TBD. |
| **CR-074-B** | Expense Setup UI redesign — unified Menu-Management pattern | `design_agent_full_stack` mockup + owner approval | Ready to invoke immediately upon your green light. |

**Owner action needed:** forward BUG-202 backend brief; separately give go-ahead to invoke design agent for CR-074-B.

---

## 4. Independent OPEN Items (5 items after consolidation)

| ID | Title | Priority | Recommended path |
|---|---|---|---|
| **BUG-162** | Setup panel flickers on every mutation (fetchAll full re-fetch pattern) | P2 (perf / UX) | Small refactor: replace full re-fetch with optimistic local updates. Fits well into a "Batch B" cleanup. |
| **CR-062** | Backend Aggregation Contract for Expense Report | P2 | Blocked by CR-061 owner smoke sign-off. Once CR-061 closes, this can be scheduled as a backend-side task. Not urgent — current client-side aggregation works. |
| **CR-064** | Add Item quick-add form — include unit price field | P2 | Small UX enhancement. Consider bundling with CR-074-B redesign (row-add UI is being redesigned anyway). |
| **CR-071** | App-Wide Role Gating (Migration Phase 3) | P1 (deferred) | Big migration piece — not expense-specific. Blocks BUG-201 Phase 2 (role gate on delete). Owner previously deferred until CR-057 + CR-058 close and CR-069 ships. |
| **BUG-198** ⓘ | *(non-expense but adjacent — CR-069 employee post-delivery)* | P1 | Only listed here because CR-071 has a "blocked by CR-069 ship" note that ties into it. Not part of the expense consolidation. |

**Owner action:** decide whether Batch B picks up BUG-162 + CR-064 (small, quick wins) alongside CR-074-B redesign, or defer.

---

## 5. 🔴 Items to RETIRE (owner ruling required)

Everything below became moot or was folded into a newer/broader item during this session.

### 5.1 Moot by "no bulk import/export" ruling

| ID | Title | Why retire | Recommended new status |
|---|---|---|---|
| **BUG-174** | ExpenseBulkEditor — Download Template button missing + STOCK_SAMPLE 404 | Template exists only to seed Excel imports. With import removed (CR-074-A), the template is meaningless. | **RETIRE — OBSOLETE (superseded by CR-074-A)** |
| **BUG-163** ⚠ | CR-059 Setup — Export fails: missing `type` field in POST body | Currently marked "QA PASS — awaiting owner smoke," but the export code was just removed in CR-074-A. Fix persists as dead code before CR-074-A merged and was subsequently cleaned. | **RECLASSIFY — RESOLVED (feature removed post-fix)** |

### 5.2 Superseded by CR-074-B (bulk editor UI redesign)

| ID | Title | Why retire | Recommended new status |
|---|---|---|---|
| **BUG-172** | ExpenseBulkEditor — "+ Add Row" (footer) vs "+ Add Item" (header) design inconsistency | Full UI is being redesigned in CR-074-B to match Menu Management pattern. Header vs footer button question will be resolved by the new design. | **RETIRE — SUPERSEDED-BY-CR-074-B** |
| **BUG-173** | ExpenseBulkEditor — Unit column collected but not sent | Same reason: CR-074-B redesign decides column set. If the redesign keeps Unit, fix rolls in with it. If it drops Unit, bug is N/A. | **RETIRE — SUPERSEDED-BY-CR-074-B** |

### 5.3 Superseded by BUG-202 (Edit Item feature)

| ID | Title | Why retire | Recommended new status |
|---|---|---|---|
| **CR-065** | Item-level inline edit (rename) on Expense Setup item list | BUG-202 covers rename **and** category change with backend contract locked, semantics ruled (name = retroactive, category = snapshot), and backend brief already written. CR-065 is a strict subset. | **RETIRE — SUPERSEDED-BY-BUG-202** |

### 5.4 Historical UI CR that gets replaced

| ID | Title | Why note | Recommended new status |
|---|---|---|---|
| **CR-067** | Expense Bulk Editor — Full Parity Redesign (menu management pattern, prior sprint) | Already shipped and QA-passed. But CR-074-B is going to replace the UI patterns CR-067 introduced with a fresher take (per owner: "bulk edit UI we already discussed and noted"). No rollback needed — CR-067 stays "IMPLEMENTED" in history, but CR-074-B's registry entry references `supersedes_ui: "CR-067"` so the lineage is clear. | **NO CHANGE (historical, superseded_ui tracked)** |

---

## 6. Proposed Cleaned Expense Backlog (after consolidation)

Assuming you approve the retirements above:

### Immediate (this session, awaiting Phase 4 closeout)
1. Close-out: BUG-199, BUG-200, BUG-201-interim, CR-074-A

### Backend-blocked
2. BUG-202 (Edit Item) — awaits backend
3. BUG-201 Phase 1 full — awaits backend
4. BUG-182 (report name inconsistency) — awaits backend

### Design-gated
5. CR-074-B (Setup redesign) — invoke `design_agent_full_stack`

### Independent OPEN (candidate for Batch B or later)
6. **BUG-162** (setup panel flicker — perf)
7. **CR-064** (unit price in quick-add form — UX)
8. **CR-062** (backend aggregation — blocked by CR-061 smoke)
9. **CR-071** (app-wide role gating — big deferred migration item)

### Owner smoke-test debt (informational — not blocking)
10. 16 items in "QA PASS — AWAITING OWNER SMOKE" status. All these are already implemented but never explicitly signed off by owner. Optional: batch-sign these to keep the registry clean.

---

## 7. Owner Rulings Needed

Please confirm each retirement — or push back if I misread intent.

| ID | Proposed | Confirm? |
|---|---|---|
| **BUG-174** | Retire as OBSOLETE (import/export removed) | ✅ / ❌ |
| **BUG-163** | Reclassify as RESOLVED — feature removed post-fix | ✅ / ❌ |
| **BUG-172** | Retire as SUPERSEDED-BY-CR-074-B | ✅ / ❌ |
| **BUG-173** | Retire as SUPERSEDED-BY-CR-074-B | ✅ / ❌ |
| **CR-065** | Retire as SUPERSEDED-BY-BUG-202 | ✅ / ❌ |

### Non-blocking questions:
- **Q1** — Are you OK to bundle **CR-064** (unit price in quick-add) into the CR-074-B redesign scope, since the row-add UI is being redesigned anyway? *Recommendation: yes.*
- **Q2** — Should I roll **BUG-162** (setup panel flicker) into the CR-074-B redesign since the panel is being touched? Or file separately? *Recommendation: bundle — a redesign that still flickers on every save would be embarrassing.*
- **Q3** — What do you want to do about the 16 "awaiting owner smoke" items? Options: **(a)** batch-sign as OK based on QA-PASS status (recommended); **(b)** ask me to schedule a smoke session; **(c)** leave as-is until a monthly cleanup.

---

## 8. What happens after this consolidation

If you approve everything as recommended:

1. **Phase 4 closeout of Batch A** — flips 4 IDs to IMPLEMENTED / CLOSED (already awaiting your go).
2. **Registry cleanup pass** — updates 5 IDs to RETIRED / RESOLVED / SUPERSEDED with cross-refs.
3. **CR-074-B kickoff** — I invoke design agent (scope now expanded: matches Menu Management + BUG-202 forward-compat + CR-064 unit price in quick-add + BUG-162 no-flicker perf).
4. **Backend team** — receives BUG-201 + BUG-202 briefs (already written).
5. **Batch B candidate:** CR-062 (once CR-061 signs off), plus any residual smaller items.
6. **Deferred still:** CR-071 (waits on CR-057/058/069 chain — not expense-blocking).

**Net result:** clean, deduplicated, prioritized expense backlog of 8 items, with 3 external dependencies and 5 items ready to move once you decide on batching.

---

## Appendix — Files that will not be touched during this consolidation

Per your instruction "no code edits":

- No changes to `expenseService.js`, `ExpenseBulkEditor.jsx`, `ExpenseSetupPanel.jsx`, `constants.js`, or any other frontend/backend file.
- Only registry docs (`registry.json`, `BUG_TRACKER.md`, `CR_REGISTRY.md`) would be touched, and ONLY after you approve the retirements in §7.
