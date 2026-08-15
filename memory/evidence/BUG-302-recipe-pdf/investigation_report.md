## BUG Investigation — Recipe PDF Download Fails
Date: 2026-08-06

### Error (from screenshot)
Uncaught TypeError: e.autoTable is not a function
at onClick (main.js:2:4649340)

### Root Cause
RecipeManagementPanel.jsx:6 uses old v3/v4 import pattern:
  import 'jspdf-autotable';   // side-effect only — does NOT add .autoTable() in v5
  doc.autoTable({...})        // L437 — FAILS in v5

Installed version: jspdf-autotable 5.0.8

Correct v5 pattern (already used in CurrentStockPanel.jsx:11):
  import autoTable from 'jspdf-autotable'; // named import
  autoTable(doc, {...})                     // standalone function

### Files affected
- RecipeManagementPanel.jsx L6 (import), L437 (call), L454 (lastAutoTable)

### Fix scope
- 1 file, 2-3 lines
- Fast Lane eligible pending owner GO
