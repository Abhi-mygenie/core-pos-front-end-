# CR-036-FU-01: Bulk Editor — Validation UX (Specific Error + Focus + Red Border + Trash2 Delete)

> **Follow-up to CR-036.** Surfaced during owner Gate-3 smoke testing 2026-06-12.
> Owner reproduction: clicked Add Item with empty fields + a second new row with Price=0,
> clicked Save → red toast "Validation Error — 2 item(s) have errors" — but no indication
> of WHICH row or WHICH field, and no clear delete affordance for the unsaved new rows.

**Registered:** 2026-06-12
**Sprint:** pos_4_0 (same sprint as CR-036)
**Priority:** P2 — UX polish, no money/data impact
**Status:** GATE 3 COMPLETE 2026-06-12. Awaiting owner Gate-4 smoke on preprod.

---

## 0. Related CRs

| CR | Relationship |
|---|---|
| **CR-036** (parent) | Adds top-pinned rows, scrollContainerRef, pendingFocusRowId — scaffolding reused here |
| **CR-027 Phase 3** | Row-error trail (`_saveError` + tooltip + red tint + drawer) — pattern mirrored for `_validationErrors` |
| **CR-023** | `LocalTextInput` flush-on-blur — `document.activeElement?.blur()` at L390 guarantees no typing race during Save focus jump |
| **CR-014 Phase 2A/2B** | Original BulkEditor implementation |

---

## 1. Problem Statement

Two distinct UX gaps surfaced by owner during CR-036 Gate-3 smoke testing:

### Gap-1 — Validation toast is non-specific
Toast: *"Validation Error — N item(s) have errors. Check required fields."*
- N tells the count; not WHICH row, not WHICH field, not WHERE to look.
- Cashier must hunt across multiple rows × multiple required fields manually.
- `validateRow` (L378-385) computes per-row errors — `handleSave` (L399) **discards** them, only forwards `.length`.

### Gap-2 — No visible delete for unsaved (`_isNew`) rows
Mechanism exists (`resetRow` L366-373 filters `_isNew` rows out), but:
- Trigger uses `RotateCcw` icon (counter-clockwise arrow = "undo edits") — wrong semantics for "delete"
- Located in rightmost column, often off-screen
- No left-side delete affordance near the `+` indicator

---

## 2. Root Cause — One line per gap

| Gap | Root cause |
|---|---|
| **G-1** | `handleSave` aggregates `invalid.length` for toast; discards `invalid[i].errors`. No `_validationErrors` field on row state. No visual feedback on offending row/cell. |
| **G-2** | `RotateCcw` icon shared between two semantically distinct operations: "undo edits on existing row" (correct) and "delete unsaved new row" (incorrect — needs destructive icon). |

---

## 3. Scope Locked by Owner (2026-06-12)

| Behaviour | Required | Source |
|---|---|---|
| Toast surfaces first failing row identifier + first error | ✅ | Owner: *"what is there and in which line is not coming"* |
| Failing row gets **red border** | ✅ | Owner: *"may be red boundary"* |
| Grid auto-scrolls + focuses first failing row Name input | ✅ | Owner: *"can we move focus to row where error is"* |
| Red border + cell tint clears when user edits the row | ✅ | Default accepted (CR-027 Phase 3 pattern) |
| Multiple invalid rows → toast names first only + "+N more rows" suffix | ✅ | Default accepted |
| `_isNew` rows show `Trash2` (red); existing dirty rows keep `RotateCcw` (grey) | ✅ | Owner Recommendation B Approach 1 |
| No confirmation dialog on Trash2 (unsaved → no data loss) | ✅ | Default accepted |
| Tooltip: "Delete new row" / "Undo" | ✅ | Default accepted |

### Open Questions — Resolved by Owner

| # | Question | Resolution |
|---|---|---|
| OQ-1 | Auto-scroll for invalid EXISTING rows? | ✅ **YES** — `scrollIntoView({block:"center", behavior:"smooth"})` |
| OQ-2 | Toast pluralization style? | ✅ **YES, mirror footer pattern** (`needs/need`, `row/rows`) |
| OQ-3 | Red border intensity distinction? | ✅ **DISTINCT** — `red-500` validation, `red-400` save-error |
| OQ-4 | Delete animation on Trash2? | ✅ **NO** — instant removal |

---

## 4. Impact Analysis

### 4.1 Visual Behaviour (concrete walkthrough of owner's screenshot)

**Before:** 2 invalid new rows + Save → opaque toast "2 items have errors", no row/cell indication.

**After:**
- Row 1 (empty): saturated red border-left (`red-500`) + red bg (`bg-red-50/40`)
- Name + Category + Price cells all red-tinted (`bg-red-100/60`)
- Row 1's Name input is `document.activeElement`
- Grid scrolled to top
- Trash2 icon (red) on action column for both new rows
- Toast: *"Row 1 — Name is required. 1 more row needs attention."*

### 4.2 State Lifecycle Extension

Row state machine priority (highest → lowest):
1. `_validationErrors?.length > 0` → `bg-red-50/40 + border-l-4 border-l-red-500` (NEW)
2. `_saveStatus === "error"` → `bg-red-50/60 + border-l-4 border-l-red-400`
3. `_isNew: true` → `bg-green-50/40`
4. `_saveStatus === "saved"` → `bg-green-50/60`
5. `rowDirty: true` → `bg-amber-50/40`
6. (default) → `hover:bg-gray-50/50`

Per-cell tint priority:
1. `row._validationErrors?.some(e => e.field === col.key)` → `bg-red-100/60`
2. `isDirty(row, col.key)` → `bg-amber-100/60`
3. (default)

### 4.3 Code Surface (final, applied)

| # | File / Region | Description | Lines (Δ) |
|---|---|---|---|
| 1 | `BulkEditor.jsx` L378-385 | `validateRow` → return `{field, message}` objects | ~5 modified |
| 2 | `BulkEditor.jsx` L393-401 | `handleSave` — set `_validationErrors`, scroll, focus, descriptive toast | +30 |
| 3 | `BulkEditor.jsx` L325 | `updateCell` — clear `_validationErrors` on edit | +1 |
| 4 | `BulkEditor.jsx` L686-695 | Row `<tr>` className — validation red wins, distinct intensities | +5 modified |
| 5 | `BulkEditor.jsx` L699-704 | `<td>` cell className — per-cell red tint when field has error | +3 modified |
| 6 | `BulkEditor.jsx` L706-715 | Action button — `Trash2` (red) for `_isNew`, `RotateCcw` for existing dirty | +5 modified |
| 7 | `BulkEditor.jsx` L2-6 | Add `Trash2` to lucide-react import | +1 |
| **TOTAL in `BulkEditor.jsx`** | | | **~50 lines** |
| 8 | `BulkEditor.cr036.test.jsx` | Append 10 new tests across 5 describe blocks | +~120 lines |

### 4.4 Edge Cases (17 total — all covered)

| # | Scenario | Outcome |
|---|---|---|
| EC-1 | 1 invalid new row (empty Name) | Row red, Name focused, toast: *"Row 1 — Name is required."* |
| EC-2 | 2 invalid new rows (owner's screenshot) | Both red; row 1 focused; toast: *"Row 1 — Name is required. 1 more row needs attention."* |
| EC-3 | 1 row with 3 errors | 3 cells red-tinted; toast: *"…+2 more on this row."* |
| EC-4 | Invalid existing row deep in groups | `scrollIntoView({block:"center"})` brings it to viewport; named in toast |
| EC-5 | User edits failing field | Cell tint + row border clear instantly via `updateCell` |
| EC-6 | All errors fixed → state cascades | Red cleared, reverts to `_isNew` green / amber dirty |
| EC-7 | Save again after partial fix | Re-validates; only still-invalid rows keep red; focus jumps to topmost remaining |
| EC-8 | 5 invalid rows | Toast: *"…+4 more rows need attention."* (correct pluralization) |
| EC-9 | Click Trash2 on new row | Instant removal, no confirmation |
| EC-10 | Click RotateCcw on existing dirty row | Reverts to `_original` (unchanged) |
| EC-11 | Server-error red → validation-error red | Border `red-400` → `red-500` (distinct per OQ-3) |
| EC-12 | Search active + Save | New rows always visible (CR-036 Edit 4); invalid existing scrolls via `scrollIntoView` |
| EC-13 | All 5 new rows invalid | Focus on row 1 (newest `_orderIndex`) |
| EC-14 | 0 dirty rows + Save | No-op (existing L394) |
| EC-15 | Save succeeds | `_validationErrors` already cleared by edits |
| EC-16 | Trash2 on focused row | Row removed; browser default focus transition |
| EC-17 | Action column hidden | Both icons hidden (not in column picker today — no regression) |

### 4.5 Wire-format / Reporting / Audit Impact

**ZERO.** Pure UI / client-side state. `_validationErrors` never persisted, never sent to backend. Payload to `menuService.addFood` / `editFood` unchanged.

### 4.6 Risk Matrix

| # | Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|---|
| R-1 | `_validationErrors` collides with `_saveError` (CR-027 P3) | Low | Low | Distinct field names; both cleared in `updateCell` |
| R-2 | Stacked red tints | Low | Low | State machine priority chain (§4.2); only one red applies |
| R-3 | Focus jump interrupts typing | None | — | `handleSave` blurs activeElement first (CR-023 OD-023-2 at L390) |
| R-4 | `validateRow` contract change breaks consumers | None | — | Only `handleSave` consumes (verified via grep) |
| R-5 | `Trash2` bundle bloat | None | — | lucide-react tree-shakes per-icon |
| R-6 | Owner expects confirmation dialog on Trash2 | None | — | Owner default accepted: no confirmation |
| R-7 | `scrollTop=0` misses invalid existing row | Medium | Low | Mitigated: `scrollIntoView` on row `<tr>` for non-`_isNew` |
| R-8 | Infinite render loop | None | — | No useEffect depends on `_validationErrors`; edits are event-driven |
| R-9 | CR-027 Phase 3 tests break | None expected | — | Tests assert on `_saveError`, tooltip, drawer — none touch row className |
| R-10 | CR-036 tests break | None expected | — | Tests assert on position, search, placeholder, focus on Add — none touch Save validation |

---

## 5. Gating

| Gate | Description | Status |
|---|---|---|
| Gate 1 — Investigation | Root causes (§2) | ✅ COMPLETE |
| Gate 2 — Impact analysis + scope lock + OQ resolution | This doc | ✅ COMPLETE |
| Gate 3 — Implementation + automated QA | 7 code edits + 10 unit tests | ✅ **COMPLETE 2026-06-12** |
| Gate 4 — Owner smoke test on preprod | Re-reproduce owner scenario | ⛔ AWAITING OWNER |

### Gate 3 Exit Evidence
- All 7 edits applied to `BulkEditor.jsx` (~50 lines)
- 10 new tests pass: `CR-036-FU-01 G-{Toast,Focus,RedBorder,CellTint,Clear,Trash,Regression}` describe blocks
- CR-027 Phase 3 regression: 4/4 pass
- CR-036 regression: 7/7 pass
- Frontend: HTTP 200, compiles clean
- Lint: zero NEW errors (only pre-existing `LocalTextInput` warning on untouched line)

---

## 6. Rollback Plan

Single-commit diff, ~50 lines in `BulkEditor.jsx`. `git revert <commit>` restores pre-fix behaviour. No DB, no API, no contract. CR-027 Phase 3 + CR-036 untouched by revert.

---

## 7. Adjacent Observations (NOT in scope — future CRs)

1. **`validateRow` rule asymmetry** — existing rows allow `Price=0`, new rows don't. Possible CR-037 candidate.
2. **No "Validate" preview button** — cashier learns of issues only on Save click. P3 polish.
3. **Missing validation checks** — negative discount, discount > 100% on percent type, time range. Out of scope.
4. **Action column not in column picker** — always shown. P3 polish.

---

**GATES 1 + 2 + 3 COMPLETE 2026-06-12. AWAITING OWNER GATE 4 SMOKE ON PREPROD.**
