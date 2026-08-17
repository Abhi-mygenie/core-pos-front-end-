# Bug Fix Report — BUG-302 (2026-08-06)

**Item:** BUG-302 — Recipe PDF Download: `doc.autoTable is not a function`
**Role:** BUG FIX AGENT
**Compile:** PASS — webpack compiled successfully, 0 new warnings
**EXIT GATE:** 5/5 PASS

---

## Findings

| Test | Severity | RCA Classification | Root Cause | Fix | Files | Verified |
|------|----------|-------------------|-----------|-----|-------|---------|
| Click "Download PDF" → crash | BLOCKER | CODE_ERROR | `RecipeManagementPanel.jsx:6` side-effect `import 'jspdf-autotable'` does NOT add `doc.autoTable` to jsPDF prototype in v5.0.8. `doc.autoTable({})` at L437 throws `TypeError: e.autoTable is not a function`. | L6: `import autoTable from 'jspdf-autotable'`. L437: `autoTable(doc, {...})`. | `RecipeManagementPanel.jsx` | ✅ Compile PASS, code markers confirmed |

---

## Edits Applied

| Edit | File | Line | Before | After |
|------|------|------|--------|-------|
| E1 | `RecipeManagementPanel.jsx` | L6 | `import 'jspdf-autotable';` | `import autoTable from 'jspdf-autotable'; // BUG-302` |
| E2 | `RecipeManagementPanel.jsx` | L437 | `doc.autoTable({` | `autoTable(doc, { // BUG-302` |

**L454 `doc.lastAutoTable.finalY` — NOT changed.** v5 still sets `doc.lastAutoTable` after each call (confirmed at `jspdf.plugin.autotable.js:1755`: `jsPDFDoc.lastAutoTable = table`).

---

## Scope Expansion

NONE — fix confined to 1 file, 2 lines. No other files touched.

---

## Summary

- 1/1 BLOCKER fixed
- Root cause: CODE_ERROR (wrong import pattern for jspdf-autotable v5)
- Scope expansion: NONE
- Escalated: NONE
- Correct pattern reference: `CurrentStockPanel.jsx:11` (CR-086 F3, already in codebase)
