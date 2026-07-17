# CR-036: Bulk Editor — Add Item Row Visibility (Top-Pinned, Empty Category, Auto-Focus)

> **Renumbering note (2026-06-12):** This CR was originally drafted as **CR-030** on the
> `gh/menu-bug` remote branch. On import into our main registry the number `CR-030` was
> already taken (= "Revenue by collection date (R1) + TAB out/settlements in (H5) + labels",
> IMPLEMENTED + QA PASSED 2026-06-11). Reassigned to **CR-036** (next free slot after
> CR-035) to avoid collision. Content is otherwise verbatim from `gh/menu-bug` source.

**Registered:** 2026-06-12 (imported from `gh/menu-bug` 2026-06-12)
**Sprint:** pos_4_0 (next backlog)
**Priority:** P2 — UX bug, no money/data impact; high user-friction (looks like Add Item does nothing)
**Status:** **GATE 1 + 2 COMPLETE** (investigation + impact analysis frozen). **Gate 3 implementation NOT to start until owner says GO.**
**Origin:** Investigation session 2026-06-12 — owner directive: *"in menu management, when we are in bulk screen and I click on add item, so I'm not able to see which row is added in the screen Excel view, investigation only"*
**Scope-locking directive (owner 2026-06-12):** *"this row should ideally come at the top, correct? And without any selection of category. So that is the exact change I need, because then user can see"*
**Related:**
- CR-014 Phase 2A/2B (Bulk Editor — original implementation + Excel import/export)
- CR-023 (Bulk Editor typing-lag fix via `LocalTextInput` + `document.activeElement.blur()` flush before save)
- CR-022 (Menu food-type filters — adjacent menu module)
- Adjacent observation (NOT in this CR): Category dropdown displays `—` for all rows including existing items — separate rendering bug, registered later

---

## 1. PROBLEM STATEMENT

In Menu Management → Bulk Editor (Excel-style view), clicking `+ Add Item` adds a row to React state but the user cannot find it in the viewport.

### Live evidence (owner screenshot 2026-06-12)
- Restaurant: ~101 items, Bulk Editor open
- User clicks `+ Add Item`
- Footer correctly shows *"1 item modified"* + `Save 1 Change` button enabled
- No visible new row anywhere in the viewport
- Visible top categories: "AUTHENTIC KUNAFA" (row 1 = "Astha"), "CHOCOLATES" — no `+` row, no green-tinted row

### Confirmed not-a-bug
- Row IS added to React state (`setRows` fires at L312)
- Row IS rendered in the DOM (passes through `groupedRows` memo at L600)
- Visual cues (green tint L620, `+` symbol L626) ARE applied
- Save flow works end-to-end if the row is filled

### What actually breaks
The new row is **placed somewhere outside the user's current viewport** with no auto-scroll, because:

1. `addNewRow` (L301-313) prepends to flat `rows` array via `setRows(prev => [row, ...prev])`
2. `groupedRows` memo (L248-281) **destroys the prepend** by re-grouping alphabetically by category, then alpha-sorting within each group
3. Row's `categoryId` is forced to `categories[0]?.categoryId` (L302) — whichever category that is, the row lands in that group's alphabetical slot
4. Inside its group, `productName: ""` → `"".localeCompare(anything) = -1` → sorts to top of that group (correct intra-group placement)
5. **But the group itself can be deep in the scroll** — if `categories[0]` is "Pizzas" or "Uncategorized", the row is invisible above-the-fold
6. **No `scrollIntoView`** after `setRows` — viewport stays where it was

---

## 2. ROOT CAUSE — SINGLE LINE SUMMARY

`addNewRow` writes to a flat array; `groupedRows` re-derives a grouped+sorted view that ignores insertion order — combined with no auto-scroll, the row is placed predictably but off-screen.

---

## 3. SCOPE LOCKED BY OWNER (2026-06-12)

| Behaviour | Required | Source |
|---|---|---|
| New row appears at **row #1 of the grid**, above all category headers | ✅ | Owner directive |
| New row has **no default category** — Category cell shows "Select category…" placeholder | ✅ | Owner directive |
| **Cursor auto-focuses** on the Name input of the new row | ✅ | Default accepted |
| **Grid scrolls to top** so the new row is in viewport | ✅ | Default accepted |
| **New rows always visible** regardless of active search filter | ✅ | Default accepted (D-1) |
| Validation errors → **toast only** (no inline red message) | ✅ | Default accepted (D-2) — matches current behaviour |
| Save failure → keep current red row styling at top (because row stays `_isNew`) | ✅ | Inherited from current code |
| No "NEW ITEMS" pinned section header | ✅ | Dropped per owner — just raw rows at top |
| No "NEEDS ATTENTION" pinned error section | ✅ | Dropped per owner — current red tint is sufficient |

---

## 4. IMPACT ANALYSIS

### 4.1 Visual behaviour after fix

#### Add Item click

```
┌─────────────────────────────────────────────────────────────────────┐
│  Bulk Editor   102 items                            [+ Add Item]    │
├─────────────────────────────────────────────────────────────────────┤
│  ┌────┬────────┬───────────────┬───────┬────────┬─────┬─────┬─────┐ │
│  │ +  │ [____] │ Select cat… v │ [ 0 ] │ Active │ Veg │  0  │ GST │ │ ← NEW ROW, top of grid
│  └────┴────────┴───────────────┴───────┴────────┴─────┴─────┴─────┘
│       ↑ cursor                                                       │   bg-green-50/40
│         blinking                                                     │   border-l-green-500 (optional)
├─────────────────────────────────────────────────────────────────────┤
│  ▌AUTHENTIC KUNAFA (7)                                              │  ← existing groups continue
│  1   Astha - E- Malai Kunafa   ─v   299   Active   Egg   0   GST   │
│  ...
```

#### Multiple Add Item clicks

Newest at top; previously-added new rows stack below newest, all above the first category header:

```
│  + │ [_____]    │ Select… v │ ...     │ ← newest (3rd click)
│  + │ [Pizza]    │ Pizzas  v │ ...     │ ← 2nd click
│  + │ [Burger]   │ Burgers v │ ...     │ ← 1st click
├──────────────────────────────────────────
│  ▌AUTHENTIC KUNAFA (7)
```

#### Save click with empty new row (validation error)
- Toast (red variant): *"1 item has errors. Check required fields."*
- Save aborted entirely (no API call) — matches current `handleSave` L347-350
- Row stays at top (still `_isNew: true`)
- Current `bg-green-50/40` tint preserved (NOT changed to red — only server-failures use red)

#### Save click with valid new row
- API call fires (`menuService.addFood` L362)
- During API call: row tint changes amber + spinner in `#` column (current `_saveStatus: "saving"` at L353)
- On success: row gets green check, `_saveStatus: "saved"`, `bg-green-50/60` (L372, L620)
- ~500ms later `onRefresh()` fires (L394) → backend refetch → `useEffect` L178 rebuilds local `rows` from new `foods` prop → row now has real `productId`, **loses `_isNew` flag**, **slots into alphabetical position** in its category group
- Top section becomes empty until next `+ Add Item`

#### Save click with server failure on new row
- Row gets `_saveStatus: "error"`, `bg-red-50/60` (current behaviour, L376, L620)
- Row **stays at top** because it's still `_isNew: true` (no refresh happens — only `saved` triggers refresh, L393)
- Toast: *"Partial Save — 0 saved, 1 failed. Failed items remain editable."* (current L388)
- User edits and clicks Save again to retry

### 4.2 State lifecycle

| State | `_isNew` | `_saveStatus` | Position | Tint |
|---|---|---|---|---|
| Just added | `true` | `null` | **Top of grid** | green |
| Editing | `true` | `null` | Top of grid | green + amber on edited cells |
| Validation fail on Save | `true` | `null` (no change) | Top of grid | green (unchanged) |
| Saving in-flight | `true` | `"saving"` | Top of grid | amber + spinner |
| Saved OK | `true` | `"saved"` | Top of grid for ~500ms | green-60 + check |
| After onRefresh() | `false` (gone) | `null` | Alpha position in category | none / hover |
| Server failure | `true` | `"error"` | **Top of grid** | red + alert icon |

### 4.3 Code surface (drafted — NOT applied)

| # | Change | File / line | Δ lines |
|---|---|---|---|
| 1 | `addNewRow`: drop auto-category. Set `categoryId: null, categoryName: ""` | `BulkEditor.jsx:301-313` | ~3 modified |
| 2 | `addNewRow`: add `_orderIndex: Date.now()` for stable insertion-order sort of multiple new rows | `BulkEditor.jsx:301-313` | +1 |
| 3 | `groupedRows`: split `result` into `[newRows, existingRows]`; emit `newRows` (sorted by `_orderIndex` desc → newest first) without group header, **before** the alphabetical category groups | `BulkEditor.jsx:248-281` | ~10 modified |
| 4 | `groupedRows`: search filter excludes `_isNew: true` rows (they always show regardless of search) | `BulkEditor.jsx:250-257` | +2 |
| 5 | Capture ref to the scroll container; after `setRows` in `addNewRow`, `containerRef.current.scrollTop = 0` | `BulkEditor.jsx:301-313, 579` | +5 |
| 6 | Add ref to Name `<input>` of the first new row; `useEffect` focuses it when new row appears | `BulkEditor.jsx` + `CellRenderer` | +6 |
| 7 | `CellRenderer` Category dropdown: render "Select category…" placeholder text when `value == null` | `CellRenderer` (Category cell render) | +2 |
| 8 | `buildRow`: tolerate `categoryId: null` (`f.categoryId` may be undefined) | `BulkEditor.jsx:71-130` | 0 — already handled |
| 9 | `validateRow`: already enforces `!row.categoryId → "Category is required"` (L330) | no change | 0 |
| 10 | `isRowDirty`: new rows are dirty by `_isNew:true` short-circuit at L207 (already correct) | no change | 0 |

**Total:** ~29 lines, contained in **1 file** (`BulkEditor.jsx`) plus possibly 1-2 lines in `CellRenderer` (same file at L631 — internal). Single component, blast radius = Bulk Editor only.

### 4.4 Edge cases — what each does after fix

| Scenario | Outcome |
|---|---|
| User clicks Add Item once | New row at top, cursor in Name, scroll-top fires, footer "1 item modified" |
| User clicks Add Item 5× rapidly | 5 new rows stacked at top in reverse insertion order (newest at #1). Each has unique `_id`. Scroll lands at top after each click. Focus follows the newest row. |
| User clicks Add Item with `search` active | Row appears at top regardless of search filter. Existing rows stay filtered. |
| User clicks Add Item, fills nothing, clicks Save | Validation toast appears, save aborted, row stays at top green |
| User clicks Add Item, fills it, clicks Save → API succeeds | Row briefly green-60 with check; then `onRefresh` reslots it into its category. Empty top-pinned area. |
| User clicks Add Item, fills it, clicks Save → API fails | Row turns red at top, stays at top until user fixes and retries |
| User clicks Add Item then clicks Reset (RotateCcw icon on row) | `resetRow` filters new row out of `rows` (L319), top section empty again |
| User clicks Add Item with `categories` array empty (race condition before categories load) | Row appears at top with Category cell empty "Select category…". Validation will block save until user picks one (existing rule L330). No crash. |
| User clicks Add Item, then sorts table by Price column (`sortCol = "basePrice"`) | New row still at top — sort only applies to existing-row groups, not to new rows |
| User edits an existing row to also be dirty, then clicks Add Item | New row at top; dirty existing row stays in its alphabetical group with amber tint. Save processes all dirty rows. |
| User closes editor with new rows unsaved | `beforeunload` warning fires (L192-198, already wired). Confirmed working. |
| User clicks Add Item, scrolls down to category groups, then clicks Add Item again | Scroll resets to top so the newest row is visible. Earlier new row still at top, just position #2. |

### 4.5 Reporting / audit / wire-format impact

**None.** Pure UI rearrangement. Payload to `menuService.addFood` unchanged. Save flow unchanged. Refresh flow unchanged. Backend doesn't know or care where the row visually sits.

### 4.6 Risk matrix

| Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|
| `scrollTop = 0` interferes with user's intentional scroll | Low (only on Add Item click) | Low | Only triggered by Add Item handler, not on any state update |
| Auto-focus steals focus during typing | None | — | Only triggered once, immediately after Add Item click |
| Multiple new rows confuse the user about which is which | Low | Low | Each has empty Name → user fills them one by one. Stacked order = creation order. |
| `categoryId: null` breaks `validateRow` | None | — | `validateRow` already handles null (L330: `if (!row.categoryId) errors.push("Category is required")`) |
| `categoryId: null` breaks `buildPayload` for the save call | Low | Medium | Validation blocks save when null; payload builder never sees null. But add defensive check anyway. |
| Search exemption for new rows confuses users searching for "all rows" | Low | Low | Acceptable — unsaved work always visible is the right tradeoff |
| `sortCol` interaction: user expects new rows to also sort by clicked column | Low | Low | Owner decision: new rows always at top, ignore sort. Documented behaviour. |
| Existing `groupedRows` consumers (export, count display, dirtyCount) break | Low | Low | Only render layer changes. Export uses `rows` directly (L405-415), not `groupedRows`. Counts already use `rows` (L242). |
| `Uncategorized` group disappears (since `categoryName: ""` no longer falls into it for new rows) | None | — | Existing items keep their `categoryName: "Uncategorized"` fallback (L78). Only new rows skip the group entirely. |

---

## 5. GATING

| Gate | Description | Status | Exit Criteria |
|---|---|---|---|
| **Gate 1** | Investigation | ✅ COMPLETE | Root cause identified + documented |
| **Gate 2** | Impact analysis + scope lock | ✅ COMPLETE (this doc) | Owner confirms scope = "row at top + no auto-category + auto-focus + scroll-to-top + search-exempt + toast-only validation" |
| **Gate 3** | Implementation + QA | ⏸️ **READY — awaiting owner GO** | All 11 edge cases in §4.4 pass; no regression in Save / Reset / Refresh / Excel Import/Export |
| **Gate 4** | Owner smoke test on preprod | ⛔ NOT STARTED | Click Add Item from various scroll positions + search states → row always visible at top |

**Current instruction (owner 2026-06-12):** *"Default answer is fine. Just register a CR, do the investigation and throws the impact plan. No code, only these three things."* — **STOP HERE. No code change until owner explicitly unblocks Gate 3.**

---

## 6. OPEN QUESTIONS — ✅ ALL RESOLVED (defaults accepted 2026-06-12)

| # | Question | Resolution |
|---|---|---|
| D-1 | Search active → new row visible at top, or filtered out? | **Always visible at top** (default accepted) |
| D-2 | Validation error → toast only, or also inline red field message? | **Toast only** (matches current behaviour) |
| D-3 | Auto-focus Name input on Add Item? | **Yes** (default accepted) |

No open questions remaining. CR is fully spec'd for Gate 3.

---

## 7. ROLLBACK PLAN

Single-commit, single-file diff (~29 lines). Revert = `git revert <commit>`. No DB, no contract, no shared-component changes. Risk-free rollback at any time.

---

## 8. ADJACENT OBSERVATIONS (NOT in scope for CR-036)

Flagged during investigation for separate follow-up:

1. **Category cell shows `—` for all rows** including existing items (visible in owner screenshot). Likely a value/option-type mismatch (number vs string) in `CellRenderer` Category dropdown. Recommend separate **CR-037: Bulk Editor — Category column display fix** (renumbered from menu-bug-branch draft "CR-031" — that number is already taken in our registry = "One cancellation truth: line value, qty, cancel_at, ops-amount override").
2. **No "scroll to row" affordance** for navigating large menus (101 items). Future polish: keyboard shortcut + jump-to-category sidebar. Out of CR-036 scope.
3. **No bulk Add Item** — adding 10 items requires 10 clicks. Future polish: "Add 5 items" / paste-from-clipboard. Out of CR-036 scope.

---

## 9. GATE 3 EXECUTION LOG (2026-06-12)

**Implementation summary:** Owner gave GO 2026-06-12. All 7 active edits per §4.3 of plan applied. Edit-6 refactored mid-implementation from `requestAnimationFrame` to `useState + useEffect` for jsdom test compatibility (no behavioural change in production browser).

| File | Δ Lines | Description |
|---|---|---|
| `frontend/src/components/panels/menu/BulkEditor.jsx` | +55 / −6 | E1: no auto-category in `addNewRow`; E2: `_orderIndex` stamp; E3: `groupedRows` splits `[newRows, existingRows]` (newRows pinned at top); E4: search exempts `_isNew`; E5: `scrollContainerRef` + `scrollTop=0`; E6: `pendingFocusRowId` state + `useEffect` focuses Name input; E7: "Select category…" placeholder in CellRenderer |
| `frontend/src/__tests__/components/menu/BulkEditor.cr036.test.jsx` *(new)* | +163 | 7 test cases across 5 describe blocks: G-Vis (2), G-Cat (1), G-Focus (1), G-Search (2), G-Reset (1) |

### Test results
- **New tests:** `BulkEditor.cr036.test.jsx` — **7/7 PASS**
- **Regression:** `BulkEditor.cr027p3.test.jsx` (CR-027 Phase 3) — **4/4 PASS** (no breakage)
- **Lint:** No new errors (pre-existing `LocalTextInput` warning on untouched line at L738 → L769 with my additions)
- **Frontend:** HTTP 200, compiles clean

### Gate status update

| Gate | Status |
|---|---|
| Gate 1 — Investigation | ✅ COMPLETE |
| Gate 2 — Impact analysis + scope lock | ✅ COMPLETE |
| **Gate 3 — Implementation + automated QA** | ✅ **COMPLETE 2026-06-12** |
| Gate 4 — Owner smoke test on preprod | ✅ **CONFIRMED 2026-06-12** (owner screenshot evidence — CR-036 working as designed; CR-036-FU-01 spawned from this smoke surfacing validation UX gaps) |

### Follow-up
- **CR-036-FU-01** registered 2026-06-12 — surfaced during this Gate-4 smoke: validation toast non-specific + no clear delete affordance on `_isNew` rows. Gate 3 of FU-01 also complete same day.

---

**END OF CR-036 — GATES 1 + 2 + 3 COMPLETE + GATE 4 OWNER-CONFIRMED. FU-01 spawned for validation UX polish.**
