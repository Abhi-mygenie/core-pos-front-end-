# Session Handover — 2026-08-11 — Investigation: 3 Bugs

**Role:** INVESTIGATION (Role 6)
**Branch:** `printer`
**Date:** 2026-08-11
**Steps used:** 8/10

---

## Session Arc
1. Read AGENT_PROMPT_ALPHA.md → selected INVESTIGATION role (QA reported failures, root cause unknown)
2. Boot: read CONTROL_DASHBOARD, BUG_TRACKER, FILE_OWNERSHIP, BUG-296 investigation report
3. Environment check: frontend compiling, preprod login working (cafe103)
4. Investigated all 3 bugs via code trace + live API probes

---

## Findings Summary

### Bug 1 — BUG-296 "not fixed yet"
- BUG-296 fix IS in code (sort_by:collect_bill, filter foodStatus≠3 in foodCourtService.js)
- Fix was validated against Shimla QoH Food Court (rid=598), NOT cafe103
- cafe103 is a regular restaurant (435 July orders, no food court setup)
- The "difference in reports" cannot be reproduced without user clarifying WHICH two reports + which restaurant

### Bug 2 — P&L Report junk values
- **RC1 CONFIRMED (HIGH):** `PLReportPage.jsx:89` reads `s.paid_revenue` but API returns `s.total_paid_revenue` → Paid Revenue KPI always shows ₹0
- **RC2 CONFIRMED (MEDIUM):** API returns single row (today's date, all zeros) regardless of date range params — backend issue or cafe103 has no expense/purchase data
- Fix for RC1: 1 line (`s.paid_revenue` → `s.total_paid_revenue ?? s.paid_revenue`)

### Bug 3 — Item level discount: GST/VAT
- **CONFIRMED (HIGH confidence):** `discountRatio = totalDiscount / itemTotal` uses full itemTotal (includes non-discountable items)
- `taxTotals` includes ALL items' GST/VAT — no separation between discountable/non-discountable
- `itemGstPostDiscount = total_gst * (1 - discountRatio)` incorrectly reduces non-discountable items' GST AND under-reduces discountable items' GST
- Fix requires splitting taxTotals by giveDiscount flag + using discountableTotal as denominator
- Risk: HIGH (CollectPaymentPanel hotspot, R5+R6) — full Gate 2-3 required

---

## Evidence Artifacts
- `/app/memory/evidence/PLN_API_response.json` — P&L API raw response
- `/app/memory/evidence/taxTotals_code.txt` — CollectPaymentPanel GST computation code
- `/app/memory/investigation/INVESTIGATION_REPORT_THREE_BUGS_2026_08_11.md` — full report

---

## Next Agent Boot
```
1. Read this handover
2. Ask owner: "For BUG-296 — which two reports show different numbers? Which restaurant?"
3. P&L RC1: DIRECT_BUG_FIX eligible (owner approval needed for fast lane)
4. P&L RC2: file backend brief
5. Item discount GST: full PLANNING Gate 2-3 (HIGH risk)
```
