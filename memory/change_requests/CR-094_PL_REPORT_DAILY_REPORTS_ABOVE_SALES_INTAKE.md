# CR-094 — P&L Report: New Screen Under Daily Reports, First Position Above Sales

**ID:** CR-094
**Type:** CR
**Created:** 2026-07-22
**Severity:** P1 (HIGH)
**Risk:** MEDIUM
**Module:** Reports — Daily Reports (new P&L screen, first position above Sales report)
**Duplicate Check:** NONE — new screen.
**Code Reality:** NONE — no P&L Report screen exists. Backend endpoint CONFIRMED (curl-verified 2026-07-22). Location: under Daily Reports, positioned ABOVE the existing Sales report.
**Source:** OWNER-REQUESTED (session 2026-07-22)
**Confidence:** CONFIRMED (endpoint + schema curl-verified 2026-07-22)

---

## Description

Owner wants a **Profit & Loss (P&L) Report** screen:
- **Location**: Under the "Daily Reports" navigation section
- **Position**: First report — ABOVE the existing Sales report
- **Backend**: `POST /api/v1/vendoremployee/profit-loss-report` (v1 endpoint — confirmed)
- **Date format**: `DD/MM/YYYY` (not ISO — frontend must convert before sending)
- **Date filter**: Custom date range picker (from → to)

### Confirmed API Response Schema
```json
{
  "report": [
    {
      "date": "16/07/2026",
      "sales": "0.00",
      "paid_revenue": "0.00",
      "expenses": "0.00",
      "purchase": "0.00",
      "total_expenses": "0.00",
      "profit_loss": "0.00"
    }
  ],
  "summary": {
    "total_sales": "0.00",
    "total_paid_revenue": "0.00",
    "total_expenses": "0.00",
    "total_purchase": "0.00",
    "total_expenses_combined": "0.00",
    "total_profit_loss": "0.00"
  }
}
```

### Display Columns (from schema)
| Column | Field | Note |
|---|---|---|
| Date | `date` | per row |
| Sales | `sales` | gross revenue |
| Paid Revenue | `paid_revenue` | actual collected |
| Expenses | `expenses` | direct expenses |
| Purchase | `purchase` | stock purchase cost |
| Total Expenses | `total_expenses` | combined expenses |
| Profit / Loss | `profit_loss` | net P&L |

Summary row uses `summary.*` totals across the date range.

---

## Evidence

- Owner curl provided: `POST https://preprod.mygenie.online/api/v1/vendoremployee/profit-loss-report`
- Curl-verified 2026-07-22 with fresh auth token — HTTP 200, schema confirmed above
- Date format required by API: `DD/MM/YYYY` (returns 400 "Invalid date format" if ISO YYYY-MM-DD used)
- No P&L screen exists in current frontend navigation
- Note: endpoint uses `/api/v1/` path (older API version) — not v2

---

## Blast Radius

- 3-4 files: New `PLReportPanel.jsx`, daily reports navigation component, `reportService.js` (or new service), `constants.js`
- ~100-150 lines (new screen)
- Scope: LARGE (new screen + navigation position change)

---

## Open Questions — ALL RESOLVED

| # | Question | Answer |
|---|---|---|
| 1 | Backend P&L endpoint URL + schema? | `POST /api/v1/vendoremployee/profit-loss-report` — schema confirmed above |
| 2 | Date filter type? | Custom date range picker (from/to), format DD/MM/YYYY |
| 3 | "Above Sales" = first tab/card in Daily Reports? | YES — first position above Sales report |

---

## Fix Plan (seeding — formal plan at Gate 3)

1. Add `P_AND_L_REPORT` to `constants.js` → `POST /api/v1/vendoremployee/profit-loss-report`
2. Add `getProfitLossReport(from, to)` to `reportService.js` (convert dates to DD/MM/YYYY before send)
3. Create `PLReportPanel.jsx` — date range pickers + table with 7 columns + summary footer row
4. Insert into Daily Reports navigation — first position above Sales

---

## Next
Planning Gate 2 (owner must answer Open Questions above) → Gate 3 → Implementation

---

## Update 2026-07-22 — Open Question RESOLVED

**Backend endpoint CONFIRMED live.** Curl-verified with `owner@cafe103.com` credentials:

```bash
POST https://preprod.mygenie.online/api/v1/vendoremployee/profit-loss-report
Body: {"date_from":"01/07/2026","date_to":"22/07/2026"}
```

Response HTTP 200 — full `report[]` + `summary{}` as documented above.

**All open questions are now RESOLVED.** CR-094 is ready for Planning Gate 2.
