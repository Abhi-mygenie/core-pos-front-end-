# BUG-220 — Ingredient Category: No Duplicate Alert, No Edit/Delete

**ID:** BUG-220
**Type:** BUG
**Created:** 2026-07-22
**Severity:** P2 (MEDIUM)
**Risk:** MEDIUM
**Module:** Inventory — Ingredients Setup (InventorySetupPanel — Category sidebar)
**Duplicate Check:** RELATED to CR-090 (Inventory Categories Edit & Delete — new CR). BUG-220 covers the MISSING DUPLICATE CHECK as a bug; CR-090 covers edit/delete as a change request. Both are captured separately.
**Code Reality:** CONFIRMED — `InventorySetupPanel.jsx:74-83`: `addCategory()` calls `inventoryService.storeCategory()` with no duplicate name check. Category sidebar has Add input + button only; no edit/delete controls for existing categories.
**Source:** OWNER-REPORTED (session 2026-07-22)
**Confidence:** CONFIRMED (code verified)

---

## Description

Two issues on the Ingredient Category sidebar:

### A — No Duplicate Alert (BUG)
- Owner can add a category named "Dairy" twice — no frontend check, no warning
- `addCategory()` (line 74-83) calls the API immediately after a name trim-check
- If the backend returns a duplicate error, it shows only a generic `toast.error`
- Owner creates accidental duplicates that pollute the category list

### B — No Edit / Delete (cross-referenced to CR-090)
- Category list shows only category names + ingredient count pills
- No Pencil (edit) icon to rename a category
- No Trash (delete) icon to remove an empty category
- This is registered as a separate CR (CR-090) for the Edit & Delete capability

---

## Evidence

- Code: `InventorySetupPanel.jsx:74-83` — `addCategory()`, no dup check
- Code: `InventorySetupPanel.jsx:186-210` — category sidebar JSX, no edit/delete controls
- Categories list is rendered at lines 186-210 with only click-to-filter behavior

---

## Blast Radius

- 1 file: `InventorySetupPanel.jsx`
- ~15-20 lines change for dup check (compare against existing `categories` state before API call)
- Edit/Delete is scoped under CR-090
- Hotspot: NO
- Scope: SMALL (1 file, frontend-only dup check)

---

## Fix Plan (seeding — formal plan at Gate 3)

1. Before `storeCategory()` call: check `categories.some(c => c.name.trim().toLowerCase() === newCatName.trim().toLowerCase())`
2. If duplicate: `toast.error('Category "${name}" already exists')` and return — do NOT call API
3. Edit/Delete controls deferred to CR-090

---

## Next
Planning Gate 2 → Gate 3 → Implementation
