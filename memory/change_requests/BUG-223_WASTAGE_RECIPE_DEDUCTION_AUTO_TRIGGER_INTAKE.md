# BUG-223 — Wastage & Recipe Deduction Auto-Trigger Without Explicit Save

**ID:** BUG-223
**Type:** BUG
**Created:** 2026-07-22
**Severity:** P1 (HIGH)
**Risk:** HIGH
**Module:** Inventory — Recipe Management + Wastage (RecipeFormPanel, InventorySetupPanel)
**Duplicate Check:** NONE — fresh issue, not addressed in prior sessions.
**Code Reality:** CONFIRMED (UX confusion) — No `onBlur` or auto-save handler exists in RecipeFormPanel.jsx or InventorySetupPanel.jsx. Root cause traced to StockAuditPanel.jsx: the drift indicator (showing -X qty) updates on every `onChange` keystroke via `updateEntry()` state update — no API call on blur/scroll. Owner sees the drift preview updating and interprets it as a deduction already happening. Stock is NOT saved until "Save Adjustments" button is clicked explicitly.
**Source:** OWNER-REPORTED (session 2026-07-22, verbatim: "when I scroll get out of input field")
**Confidence:** CONFIRMED (code traced — no auto-save on blur/scroll; UX labelling fix needed)

---

## Description

Owner sees stock deductions appearing without explicitly clicking a Save button. 

**Root cause traced (2026-07-22):** The `StockAuditPanel.jsx` drift indicator updates **on every keystroke** via `updateEntry()` → `setPhysicalEntries()` (pure React state change, no API call). When the owner scrolls away from an input (causing blur), the drift column already shows e.g. `-13 bundle`. The owner interprets this live drift preview as "the deduction has been recorded" — but stock is NOT changed until the "Save Adjustments" button is clicked explicitly.

This is a **UX clarity bug**: the drift indicator has no "preview / unsaved" label. The negative red numbers are visually alarming and imply the deduction is already live.

Secondary scenario (cannot yet rule out): a different panel exists where a blur/scroll actually does fire an API call — owner must confirm which screen they are on if the Stock Audit explanation does not match their experience.

---

## Evidence

- Owner-reported: "wastage & recipe deduction auto-trigger without explicit save" / "when I scroll get out of input field"
- Code trace: `StockAuditPanel.jsx` — `updateEntry(item.id, 'qty', value)` fires on `onChange`, updates `physicalEntries` state only (no API call)
- Code trace: `handleSaveAll()` is the only function that calls `inventoryService.addStock()` — triggered by Save button click only
- Drift indicator: `const drift = (entry.qty !== '' ? (Number(entry.qty) - Number(item.current_stock)) : null)` — updates on state change, shows red negative number immediately
- No `onBlur` handler anywhere in `StockAuditPanel.jsx` that fires API calls
- Confirms: the issue is UX perception — drift looks "live" but is just a preview
- Additional finding: ingredient "ghee dosa" has `quantity: "-13.00"` on preprod — confirms stock has been inadvertently deducted previously

---

## Blast Radius

- 1 file: `StockAuditPanel.jsx`
- ~10-15 lines change (add "UNSAVED" label to drift column, add sticky unsaved-changes banner)
- Hotspot: NO
- Scope: SMALL (UX label change only)

---

## Fix Plan (seeding — formal plan at Gate 3)

1. Add `hasPendingChanges` computed value: `Object.values(physicalEntries).some(e => e.qty !== '')`
2. Show a sticky amber banner: "You have unsaved adjustments — click Save Adjustments to apply"
3. Add "(preview)" label below the drift number: `{drift} bundle (preview — not saved)`
4. Change drift colour from red → amber until saved (post-save: green or reset)
5. On successful save: flash green + reset entries

---

## Next
Planning Gate 2 → Gate 3 → Implementation
