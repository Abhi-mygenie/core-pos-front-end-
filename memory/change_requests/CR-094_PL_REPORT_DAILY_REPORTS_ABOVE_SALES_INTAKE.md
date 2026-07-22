# CR-094 — P&L Report: New Screen Under Daily Reports, First Position Above Sales

**ID:** CR-094
**Type:** CR
**Created:** 2026-07-22
**Severity:** P1 (HIGH)
**Risk:** MEDIUM
**Module:** Reports — Daily Reports (new P&L screen, first position above Sales report)
**Duplicate Check:** NONE — new screen.
**Code Reality:** NONE — no P&L Report screen exists. Owner confirmed a backend P&L endpoint was shared. Location: under Daily Reports, positioned ABOVE the existing Sales report.
**Source:** OWNER-REQUESTED (session 2026-07-22)
**Confidence:** REPORTED (backend endpoint shared by owner but not curl-verified this session)

---

## Description

Owner wants a **Profit & Loss (P&L) Report** screen:
- **Location**: Under the "Daily Reports" navigation section
- **Position**: First report — ABOVE the existing Sales report
- **Backend**: Owner reported that the P&L endpoint was already shared (URL/contract available in prior session context)

### Expected Content
- Revenue (total sales for date range)
- Cost of Goods Sold (COGS) — recipe cost × items sold
- Gross Profit = Revenue − COGS
- Expenses (from expense module)
- Net Profit = Gross Profit − Expenses
- Date range filter (daily, weekly, monthly, custom)
- Possibly: per-category or per-item breakdown

---

## Evidence

- Owner-reported: "profit and loss endpoint was also shared. This I need under Daily reports Above sales first report — New CR"
- No P&L screen exists in current frontend navigation
- Backend endpoint: was referenced in previous session (not verified this session — needs retrieval from prior handover or re-request from owner)

---

## Blast Radius

- 3-4 files: New `PLReportPanel.jsx` (or `ProfitLossPanel.jsx`), daily reports navigation component, `reportService.js` or new service file, possibly `constants.js`
- ~100-150 lines (new screen)
- Scope: LARGE (new screen + navigation position change)

---

## Open Questions (Gate 2 — must resolve before Gate 3)
1. What is the exact backend P&L endpoint URL and response schema? (Owner provided it in a previous session — needs retrieval)
2. Should this be date-picker based (select any date range) or fixed periods (today/week/month)?
3. Does "above Sales" mean it is the first tab/card in the Daily Reports section?

---

## Fix Plan (seeding — formal plan at Gate 3)

1. Retrieve / curl-verify P&L endpoint (owner to provide or retrieve from prior handover)
2. Create `PLReportPanel.jsx` with date range filter + P&L table (Revenue, COGS, Expenses, Net Profit)
3. Add to Daily Reports navigation — insert ABOVE Sales report (first position)
4. Wire to service function + constants

---

## Next
Planning Gate 2 (owner must answer Open Questions above) → Gate 3 → Implementation
