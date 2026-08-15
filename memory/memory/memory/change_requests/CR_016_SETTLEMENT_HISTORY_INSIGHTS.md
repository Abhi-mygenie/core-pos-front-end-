# CR-016 — Settlement Report (Insights Module) — Intake + Scope

**Status:** GATE 3 IN PROGRESS — Owner answered Q1-Q4 on 2026-06-09
**Priority:** P1
**Sprint:** POS 4.0
**Date:** 2026-06-09
**Reporter:** Owner
**Related:** CR-015 (Settlement Module — OWNER SMOKE PASSED 2026-06-09)

---

## 1. Summary

| Aspect | Detail |
|---|---|
| **What** | Settlement Report under Insights — date-range view of settlement history with per-day and per-waiter drill-down |
| **Where** | Sidebar → Insights → "Settlement Report" entry. Route: `/reports-module/settlement` |
| **Why** | Weekly/monthly audits — spot pilferage trends, unsettled balances, missed close-day actions |
| **Depends on** | CR-015 ✅ + existing `POST /waiter/get-settlement-report` API (already supports date ranges) |
| **Inherits from** | Order Ledger (S6) pattern: `Sidebar`, `ReportLoadingShield`, `useReportFetch`, inline From-To date inputs, inline Download menu, `reportExporter.js` |

---

## 2. Shared Components to Reuse

### Can Reuse Directly

| Component | Path | Usage |
|---|---|---|
| `Sidebar` | `components/layout/Sidebar.jsx` | Add entry under Insights |
| `ReportLoadingShield` | `components/reports/ReportLoadingShield.jsx` | Wrap report body (first-load splash + re-fetch ghost + error + retry) |
| `useReportFetch` | `components/reports/useReportFetch.js` | Fetch lifecycle (AbortController, debounce, hasLoadedOnce) |
| `reportExporter.js` | `utils/reportExporter.js` | Excel/PDF export (`exportReportAsExcel`, `exportReportAsPDF`) |

### Must Clone Inline (NOT shared components)

| Pattern | Source | Notes |
|---|---|---|
| **From-To DatePicker** | OrderLedgerMockup.jsx lines 208-209, 270-275, 590-600 | Inline `<input type="date">` with presets, Apply button, max range. The shared `DatePicker` component is single-day only. |
| **Download Menu** | OrderLedgerMockup.jsx lines 114-120, 237, 539-542 | Inline `DOWNLOAD_MENU` array + dropdown. The shared `ExportButtons` is for Audit Report pattern, not Insights. |
| **KPI Strip** | Build inline | 5 cards matching CR-015 KPI card pattern |

---

## 3. API (Already Exists — Live Verified)

**Endpoint:** `POST /api/v1/vendoremployee/waiter/get-settlement-report`

**Request:** `{ date_from: "DD-MM-YYYY", date_to: "DD-MM-YYYY" }`

**Response shape (verified with 9-day range on vishal@vishal.com):**
```json
{
  "success": true,
  "totals": {
    "total_opening_balance": 1000,
    "total_today_collection": 2416,
    "total_today_settlement": 2000,
    "total_balance_to_settle": 1432,
    "total_pilferage": 16,
    "total_total_funds": 3416,
    "total_sale": 3336,
    "total_paid": 2416,
    "total_unpaid": 0,
    "total_today_delivery_charge": 0,
    "total_today_service_charge": 210,
    "total_today_tips": 0,
    "total_today_given": 1000,
    "last_day_pending": 0,
    "stattlement_status": 0
  },
  "data": [
    {
      "date": "2026-06-09",
      "totals": { /* same 14 fields — missing stattlement_status */ },
      "waiters": [
        {
          "waiter_id": 449, "full_name": "Vishal",
          "opening_balance": "1000.00", "today_collection": "2416.00",
          "total_funds": "3416.00", "today_settlement": "2000.00",
          "pilferage": "16.00", "balance_to_settle": "1432.00",
          "tips_by_mode": { "cash": "0.00", "card": "0.00", ... }
        }
      ]
    }
  ]
}
```

**API Behaviors (verified):**
- Returns ALL days in range including zero-activity days
- Zero-activity days still return full waiter list (all zeros)
- Aggregate totals = sum across range
- `stattlement_status` ONLY in top-level totals, NOT per-day
- Waiter number fields are strings (need `parseFloat`)
- Date format: request `DD-MM-YYYY`, response `YYYY-MM-DD`

---

## 4. Scope

### In Scope

**Layout:** Sidebar (inherited) + main content area (Order Ledger S6 pattern)

**Header:**
- Back arrow → navigate to dashboard
- Title: "Settlement Report"
- From-To date inputs (inline, clone S6 pattern. Default last 7 days, max TBD — Q3)
- Apply button + presets (Today, Yesterday, Last 7, Last 30)
- Refresh button
- Download menu (Excel/PDF + disabled Email/WhatsApp/SMS placeholders)

**KPI Strip (across selected date range):**

| Card | Source | Formula |
|---|---|---|
| Total Opening Balance | `totals.total_opening_balance` | Direct |
| Total Cash Collected | `totals.total_today_collection` | Direct |
| Total Settled | `totals.total_today_settlement` | Direct |
| Total Expected | Computed | `total_funds − settled − pilferage` |
| Total Pilferage | `totals.total_pilferage` | `Math.abs(value)` for display |

**Day-Level Summary Table:**

| Column | Source |
|---|---|
| Date | `data[].date` → format `DD MMM YYYY` |
| Opening Balance | `data[].totals.total_opening_balance` |
| Cash Collected | `data[].totals.total_today_collection` |
| Total Funds | `data[].totals.total_total_funds` |
| Settled | `data[].totals.total_today_settlement` |
| Expected | Computed: `total_funds − settled − pilferage` |
| Pilferage | `data[].totals.total_pilferage` (abs) |
| Active Waiters | Count of waiters with `collection > 0 \|\| opening > 0` |

- Clickable rows → expand per-waiter breakdown for that day
- Default sort: date descending (latest first)
- Highlight: pilferage > 0 rows in amber

**Per-Waiter Drill-Down (expandable row):**
Same columns as CR-015 settlement panel waiter table.

**Export:**
- Excel: Sheet 1 = Day Summary, Sheet 2 = Waiter Detail (all days expanded)
- PDF: Day summary + per-waiter breakdown

### Out of Scope (deferred)
- Trend charts / graphs
- Comparison with previous period
- Email/WhatsApp/SMS share (Phase 2B placeholders)
- Anomaly alerting
- Access/permission gating
- Day Status column (API doesn't provide per-day `stattlement_status`)

---

## 5. Open Questions — RESOLVED (Owner answered 2026-06-09)

| # | Question | Owner Answer | Implementation |
|---|----------|-------------|----------------|
| **Q1** | Show zero-activity days in table? | **A) Show all days** | Render all days from API, no filtering |
| **Q2** | Day Status column (Open/Closed)? | **A) Skip** | No Day Status column — API lacks per-day `stattlement_status` |
| **Q3** | Max date range? | **1 year (365 days)** — API tested, performs well | DatePicker max range = 365 days. See §5.1 API Performance Test |
| **Q4** | Sidebar position under Insights? | **Before Sales** | Insert after "Dashboard", before "Sales" in Sidebar children array |

### 5.1 API Performance Test (1-Year Range — cafe103, 2026-06-09)

| Range | HTTP | Response Size | Response Time | Days Returned | Active Days |
|-------|------|--------------|---------------|---------------|-------------|
| 30 days | 200 | 224 KB | 4.2s | 31 | ~10 |
| 90 days | 200 | 656 KB | 4.0s | 91 | ~60 |
| 180 days | 200 | 1.3 MB | 4.4s | 181 | ~120 |
| **365 days** | **200** | **2.6 MB** | **5.2s** | **366** | **210** |

**Conclusion:** 1-year range is viable. Response time scales linearly (~1s per extra 100 days). 2.6 MB payload is acceptable for a report screen. Max waiters per day: 13.

---

## 6. Files to Create (3 new)

| File | Purpose | Est. Lines |
|---|---|---|
| `src/pages/reports-module/SettlementReportMockup.jsx` | Main page — Sidebar layout, ReportLoadingShield, useReportFetch, inline From-To, KPI strip, day table, expandable waiter rows, Download menu | ~450 |
| `src/api/services/settlementReportService.js` | `getSettlementForRange(fromDate, toDate)` — thin wrapper | ~15 |
| `src/api/transforms/settlementReportTransform.js` | Multi-day response → UI shape | ~50 |

## 7. Files to Modify (2 existing)

| File | Change | Risk |
|---|---|---|
| `App.js` | Add `/reports-module/settlement` route (protected) | LOW |
| `Sidebar.jsx` | Add entry under Insights children | LOW |

## 8. Files NOT Touched

All order-taking, dashboard, CR-015 settlement panel, menu management, other Insights reports — zero touch.

---

## 9. Regression Risk

| Area | Risk |
|---|---|
| Dashboard / Order-taking | **ZERO** |
| CR-015 Settlement Panel | **ZERO** — different route, independent |
| Other Insights reports | **ZERO** — no shared state |
| Sidebar | **LOW** — one entry |
| App.js | **LOW** — one route |

---

## 10. CR-015 Settlement Logic Reference (for next agent)

**CRITICAL — these rules were established during CR-015 owner smoke test and MUST be carried forward:**

| Rule | Formula | Notes |
|---|---|---|
| **Expected** | `Total Funds − Settled − Pilferage` | What should physically be in the drawer |
| **Pilferage sent to API** | **Negative** value: `-(expected − actualBalance)` | Backend formula ADDS pilferage, so negative = subtraction |
| **Pilferage display** | `Math.abs(pilferage)` | Always show positive in UI |
| **Settle amount cap** | `≤ Expected` | Cannot settle more than expected balance |
| **Partial settlement pilferage** | Send incremental pilferage (not zero) | Drawer gap recorded on every settlement |
| **Self-Settle** | Disabled | Unpredictable backend behavior |
| **Close Day** | Disabled | No backend API exists |
| **Transfer** | Disabled | Backend `/waiter/cash-transfer` returns 404 |

---

*End of CR-016 Scope — Gate 2 Complete. Owner answers received 2026-06-09. Gate 3 (Implementation Plan) unblocked.*
