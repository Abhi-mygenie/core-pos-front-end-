# QA Handover — Reports Cluster: BUG-258, BUG-259, BUG-260, BUG-261

**Document:** QA_HANDOVER_REPORTS_BUG258_261_2026_07_31.md
**Items:** BUG-258 · BUG-259 · BUG-260 · BUG-261
**Implementation Date:** 2026-07-27

---

## 1. Registry Sync Confirmation

```
Items: BUG-258, BUG-259, BUG-260, BUG-261 — IMPLEMENTED gate 5a
Code markers:
  ✅ BUG-258: PLReportPage.jsx L29-30, L38, L65, L165 · ConsumptionReportPage.jsx L163
  ✅ BUG-259: PLReportPage.jsx L220: chartData.length >= 1 (was > 1)
  ✅ BUG-260: Multiple report files — max={fmtISO(today)} on all date inputs
  ✅ BUG-261: PLReportPage.jsx L31 (activePreset '7D') · ConsumptionReportPage.jsx L24 (activePreset 'MTD')
```

---

## 2. Code Checks

| Check | Command | Expected |
|-------|---------|---------|
| C1-BUG258 | `grep -c 'BUG-258' /app/frontend/src/pages/reports-module/PLReportPage.jsx` | ≥3 |
| C2-BUG258 | `grep -c 'appliedFrom\|appliedTo' /app/frontend/src/pages/reports-module/PLReportPage.jsx` | ≥4 |
| C3-BUG259 | `grep -c 'chartData.length >= 1' /app/frontend/src/pages/reports-module/PLReportPage.jsx` | 1 |
| C4-BUG260 | `grep -c "max={fmtISO(today)}" /app/frontend/src/pages/reports-module/OrderLedgerMockup.jsx` | ≥1 |
| C5-BUG261 | `grep -c "activePreset" /app/frontend/src/pages/reports-module/PLReportPage.jsx` | ≥3 |
| C6-BUG261 | `grep -c "activePreset" /app/frontend/src/pages/reports-module/ConsumptionReportPage.jsx` | ≥3 |

---

## 3. Test Cases

### BUG-258 — P&L Calendar + Presets

| TC# | Steps | Expected |
|-----|-------|---------|
| TC-1 | Reports → P&L Report → observe header | Date range picker visible with preset pills (Today, 7D, MTD, etc.) |
| TC-2 | Click "7D" preset | Date range updates to last 7 days; report reloads |
| TC-3 | Change date range manually → Apply | Report fetches with new date range |

### BUG-259 — P&L Charts with 1 Data Point

| TC# | Steps | Expected |
|-----|-------|---------|
| TC-4 | P&L Report with single day selected | Chart renders (not hidden) even with 1 data point |

### BUG-260 — Future Dates Blocked

| TC# | Steps | Expected |
|-----|-------|---------|
| TC-5 | Reports → Order Ledger → click "To" date input | Calendar/input max date = today; tomorrow not selectable |
| TC-6 | Reports → Payments → "To" date input | Same — max = today |
| TC-7 | Reports → Hourly Sales → date input | Max = today |

### BUG-261 — Preset Pills in Consumption Report

| TC# | Steps | Expected |
|-----|-------|---------|
| TC-8 | Reports → Consumption Report → observe header | Preset pills visible (MTD default selected) |
| TC-9 | Click a preset (e.g. "7D") | Date range updates; report reloads |

---

## 4. Credentials + Environment

| Field | Value |
|---|---|
| Login | `owner@18march.com` / `Qplazm@10` |
| Route | Reports section (sidebar) |
