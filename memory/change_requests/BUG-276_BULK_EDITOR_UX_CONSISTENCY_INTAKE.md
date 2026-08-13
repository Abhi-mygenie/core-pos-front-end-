# BUG-276 — Bulk Editor UX: Category Move Causes Item to Jump / Disappear + Inconsistent Delete Behavior

**ID:** BUG-276
**Type:** BUG (UX)
**Created:** 2026-07-29
**Severity:** P2 (MEDIUM)
**Risk:** LOW
**Module:** Expense Bulk Editor + Ingredient Bulk Editor
**Duplicate Check:** DISTINCT (related to BUG-274 which covers ingredient delete-not-saving)
**Code Reality:** CONFIRMED — groupedRows re-sorts immediately on category change
**Source:** OWNER-REPORTED (with screenshot of Expense Bulk Editor)
**Confidence:** CONFIRMED

---

## Description

### Problem 1: Category Move → Item Jumps (Expense Bulk Editor)
When user selects items and uses "Move to Category", the moved items instantly reappear under the new category group header. Since `groupedRows` sorts by category name alphabetically, the item "teleports" — user loses visual context and can't find what happened.

**Flow:** Select 2 items in "Bills" → Move to "Marketing" → items vanish from "Bills" section → appear under "Marketing" section (potentially far down the list) → no scroll/highlight to new position → user confused.

### Problem 2: Delete After Category Move → Items Shift
After any operation (delete/move), remaining rows re-render and shift positions. No animation or visual cue.

### Problem 3: Inconsistent Behavior Between Editors

| Behavior | Expense Bulk Editor | Ingredient Bulk Editor |
|---|---|---|
| Delete | API called immediately (good) | Marks `_deleted`, waits for Save (BROKEN — BUG-274) |
| Delete confirmation | Proper dialog with confirm/cancel | `window.confirm()` (basic) |
| Category move | "Move to Category" dropdown (good) | Not available |
| Save status | `_saveStatus` indicators (saving/saved/error) | Similar but less polished |
| Grouping | By category, alphabetical | By category, alphabetical |
| Item jump on category change | YES — items teleport | N/A (no category move) |

## Evidence

- Screenshot: Owner-provided showing Expense Bulk Editor with 2 selected items, "Move to Category" dropdown open
- Code: `ExpenseBulkEditor.jsx:86-118` — `groupedRows` re-computes on any `rows` state change, re-sorts by category
- Code: `ExpenseBulkEditor.jsx:285-295` — After move, `categoryName` updated in state → `groupedRows` re-sorts → item jumps

## Blast Radius

- 2 files: `ExpenseBulkEditor.jsx`, `IngredientBulkEditor.jsx`
- ~30-50 lines per editor
- Hotspot: NO
- Scope: MEDIUM

## Suggested UX Improvements

1. **After category move:** Don't re-sort immediately. Keep item in visual position with a "Moved to [Category]" badge. Re-sort only on next page load or explicit refresh.
2. **After delete:** Fade-out animation (300ms) before removing from DOM, so user sees what disappeared.
3. **Scroll + highlight:** After category move, if re-sorting is kept, auto-scroll to the moved item's new position and flash-highlight it (green pulse for 2s).
4. **Undo capability:** "Undo" toast after delete/move (5s window) — reverses the operation.
5. **Consistent delete:** Ingredient editor should match Expense editor — immediate API call with confirmation dialog (not `window.confirm`).

## Owner Questions

1. **Preferred approach for category move:** Keep item in place with badge (Option A) or re-sort + scroll-to-highlight (Option B)?
2. **Should ingredient bulk editor get "Move to Category" feature too?** (Currently only expense has it.)
3. **Undo toast — worth the effort?** Or just confirmation dialog is enough?
