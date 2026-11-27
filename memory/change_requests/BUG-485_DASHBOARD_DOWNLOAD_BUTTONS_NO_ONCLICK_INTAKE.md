# BUG-485 — Insights Dashboard: PDF and Excel download buttons do nothing

**ID:** BUG-485
**Type:** BUG
**Date:** 2026-10-05
**Registered by:** Investigation agent (session 2026-10-05)
**Status:** GATE_1_INTAKE
**Sprint:** oct_bug_batch
**Risk:** MEDIUM
**Severity:** P2

---

## Description

On the Insights Dashboard page (`/reports-module/dashboard`), clicking the **PDF** and **Excel** buttons in the header has no effect. No download, no popup, no error. Buttons appear enabled when data is loaded.

---

## Duplicate Check

- Registry keyword search: "download", "export", "PDF", "Excel", "dashboard" — no existing open BUG for this
- `DashboardMockup.jsx` — no prior BUG markers on lines 292–309
- **Duplicate check: DISTINCT**

---

## Code Reality

**NONE** — the download feature was never implemented in DashboardMockup.

Root cause confirmed (static trace):

```jsx
// DashboardMockup.jsx lines 292–309 — NO onClick on either button
<button disabled={isLoading} data-testid="reports-export-pdf-btn">
  <FileText /> PDF
</button>
<button disabled={isLoading} data-testid="reports-export-excel-btn">
  <FileSpreadsheet /> Excel
</button>
```

- `exportReportAsExcel`, `exportReportAsPDF`, `openReportWindow` are **NOT imported** in `DashboardMockup.jsx`
- These functions exist in `utils/reportExporter.js` and are correctly wired in `SalesMockup.jsx` via `handleDownloadAction()`
- DashboardMockup imports only `FileText` + `FileSpreadsheet` (lucide icons) — no export utility

**Code Reality: NONE**

---

## Severity

**P2 — MEDIUM**
- Feature is completely broken (clicking does nothing)
- Workaround exists: use `SalesMockup.jsx` (`/reports-module/sales`) which has working download
- Affects owner who needs dashboard summary export
- No financial or order data impact

---

## Risk Classification

**MEDIUM** — display/export only
- No API write, no financial mutation, no order flow
- 1 file only (`DashboardMockup.jsx`)
- Export utility functions already exist and are tested in SalesMockup
- FAST LANE eligible (1 file, but wiring may exceed 10 lines → owner to confirm)

---

## Evidence

- Screenshot: provided by owner (dashboard header visible with PDF + Excel buttons)
- Investigation report: `investigations/INV_DASHBOARD_DOWNLOAD_PAYMENT_LABELS_2026_10_05.md`
- Static trace: DashboardMockup.jsx lines 292–309 — no onClick confirmed
- Comparison: SalesMockup.jsx line 17 — `import { exportReportAsExcel, exportReportAsPDF, openReportWindow } from '../../utils/reportExporter'` (working)
- Confidence: CONFIRMED (agent code trace)

---

## Blast Radius

| File | Scope |
|------|-------|
| `DashboardMockup.jsx` | Add import + buildExportPayload() + wire onClick to both buttons |

- 1 file, no hotspot (DashboardMockup is not in the R5 list)
- **Blast radius: SMALL (1 file)**

---

## Fix Sketch (for Planning)

1. `import { exportReportAsExcel, exportReportAsPDF, openReportWindow } from '../../utils/reportExporter'`
2. Add `buildExportPayload()` mapping dashboard `data` tiles → export sheet structure (same shape as SalesMockup lines 204–279)
3. Add `handleDownloadAction(action)` wiring `exportReportAsExcel` / `exportReportAsPDF`
4. Add `onClick={...}` on both buttons

---

## Next

Planning Gate 2 → Gate 3 → Gate 4 GO → Implementation
