# BUG-302 — Recipe PDF Download Crashes: `doc.autoTable is not a function`

**ID:** BUG-302
**Type:** BUG
**Priority:** P1 — HIGH
**Risk:** MEDIUM (feature completely broken on click; not financial, not R5 hotspot, 1 file)
**Status:** INTAKE — INVESTIGATION COMPLETE
**Gate:** 1
**Sprint:** pos_5_1
**Registered:** 2026-08-06
**Source:** OWNER-REPORTED (screenshot + console error) + INVESTIGATION-CONFIRMED

---

## Description

Clicking **"Download PDF"** in Inventory Management → Recipe Management throws a JS crash and produces no file.

**Console error (from screenshot):**
```
Uncaught TypeError: e.autoTable is not a function
at onClick (main.js:2:4649340)
```

**Root cause:** `RecipeManagementPanel.jsx` uses the old jspdf-autotable v3/v4 side-effect import pattern. `jspdf-autotable` **v5.0.8** (installed) removed prototype patching — `doc.autoTable()` no longer exists. The correct v5 pattern is already documented and used elsewhere in the same codebase (`CurrentStockPanel.jsx:11` — comment: *"v5 requires named-function pattern"*).

---

## Evidence

- **Screenshot:** console error `e.autoTable is not a function` at onClick — provided by owner 2026-08-06
- **Node.js runtime probe (confirmed 2026-08-06):**
  ```js
  // After side-effect import:
  typeof doc.autoTable === 'undefined'   ← CONFIRMED crash cause
  ```
- **Investigation report:** `/app/memory/evidence/BUG-302-recipe-pdf/investigation_report.md`
- **Source:** OWNER-REPORTED
- **Confidence:** CONFIRMED — runtime probe + code trace

---

## Area

Inventory Management → Recipe Management → "Download PDF" button (`RecipeManagementPanel.jsx`)

---

## Code Reality Check — FULL

The CR-089 implementation (2026-07-24) used the wrong import pattern for jspdf-autotable v5:

| File | Line | Current (BROKEN) | Required (v5) |
|---|---|---|---|
| `RecipeManagementPanel.jsx` | L6 | `import 'jspdf-autotable';` — side-effect only | `import autoTable from 'jspdf-autotable';` |
| `RecipeManagementPanel.jsx` | L437 | `doc.autoTable({ ... })` | `autoTable(doc, { ... })` |
| `RecipeManagementPanel.jsx` | L454 | `doc.lastAutoTable.finalY` | Verify — v5 still sets `doc.lastAutoTable` after call OR use return value |

**Correct v5 pattern already in codebase:**
```js
// CurrentStockPanel.jsx:11 — CORRECT ✅
import autoTable from 'jspdf-autotable'; // CR-086 F3 (v5 requires named-function pattern)
autoTable(doc, { ... });
```

**Installed versions:**
- `jspdf`: 4.2.1
- `jspdf-autotable`: **5.0.8** (v5 — broke `doc.autoTable` prototype pattern)

---

## Duplicate Check

- **DISTINCT** — no prior bug for this crash
- **RELATED:** CR-089 (the CR that shipped the broken implementation — `RecipeManagementPanel.jsx`)
- **RELATED:** CR-086 F3 (correctly fixed the same v5 issue in `CurrentStockPanel.jsx`)

---

## Blast Radius

```bash
grep -rn "doc.autoTable" src/ → 1 hit (RecipeManagementPanel.jsx:437 only)
```

- Files affected: **1** (`RecipeManagementPanel.jsx`)
- Lines changed: **3** (import L6, call L437, lastAutoTable L454)
- Not in R5 hotspot list
- No financial logic, no API contract change, no state management change

---

## Risk Classification

- **Risk: MEDIUM**
- Trigger: UI feature crash — not financial, not auth, not order flow
- **Fast Lane eligible: YES** — 1 file, ≤10 lines, no R5 hotspot, no financial/API/state changes
- Fast Lane requires explicit owner GO before implementation

---

## Severity Rubric

**P1 — HIGH:** Feature completely broken — PDF never downloads; JS crash on click; no workaround.

---

## Next Step

**Fast Lane eligible.** Owner says GO → implement directly (2 import + 1 call change in 1 file). No Gate 2-3 needed for Fast Lane with owner approval.
