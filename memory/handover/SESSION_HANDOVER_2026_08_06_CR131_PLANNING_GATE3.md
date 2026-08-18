# Session Handover — 2026-08-06 CR-131 Planning Gate 3

**Date:** 2026-08-06
**Role:** PLANNING (Role 2)
**Stage dispatched:** Gate 3 — Implementation Plan
**Item:** CR-131
**Status:** GATE 3 COMPLETE — Awaiting Gate 4 GO

---

## Summary (1 line)
Gate 3 Implementation Plan complete for CR-131: 6 files with exact edit locations, full JSX for both new screens, 15-point verification matrix, EXIT GATE checklist.

---

## Boot Confirmation
- Latest handover: SESSION_HANDOVER_2026_08_06_CR131_DESIGN.md ✅
- Impact Analysis accuracy verified (all 3 new files absent, anchor lines confirmed) ✅
- crmAxios import path confirmed: `../crmAxios` ✅
- Sidebar customers group confirmed at L187-189, App.js customer lines at L33-34/138-139 ✅
- Conflict check: 12 items on target files — all CLOSED/QA PASS/IMPLEMENTED, additive changes safe ✅
- insightsCache TTL mechanism reviewed — crmReportCache uses separate Map + 5-min TTL ✅

---

## Gate 3 Output

**Plan:** `/app/memory/plans/CR-131_IMPLEMENTATION_PLAN.md`

### 6 edits — exact anchor lines

| Edit | File | Type | Anchor |
|------|------|------|--------|
| E1 | `api/constants.js` | MODIFY | After L69 `CUSTOMER_ORDER_SUGGESTIONS` |
| E2 | `api/services/crmReportService.js` | **NEW** | — |
| E3 | `pages/reports-module/CustomerIntelligenceBeta.jsx` | **NEW** | — |
| E4 | `pages/reports-module/GuestVsRegisteredBeta.jsx` | **NEW** | — |
| E5 | `components/layout/Sidebar.jsx` | MODIFY | After L189 `insights-customers-mix` |
| E6 | `App.js` | MODIFY | After L34 (imports) + after L139 (routes) |

### Critical rules for Implementation agent
1. **E2 import path:** `import crmApi from '../crmAxios'` (not from services/)
2. **data.count** for win-back badge — NOT customers.length
3. **Tier = Platinum** — zero "VIP" in code
4. **No day numbers** in lifecycle labels ("At Risk" not "31-60 days")
5. **last_visit_days_ago** null-guard everywhere (`!= null`)
6. **WhatsApp:** `window.open('https://wa.me/91' + c.phone, '_blank')`
7. **E6 anchors** may have shifted — run Entry Verification grep first
8. **Both new screens** have `data-testid` on every interactive element

---

## Docs Updated
- `memory/plans/CR-131_IMPLEMENTATION_PLAN.md` — NEW (Gate 3 output)
- `memory/control/registry.json` — CR-131 → GATE 3 COMPLETE, gate=4
- `memory/control/CR_REGISTRY.md` — CR-131 row updated

---

## Next Steps

**Owner:** Provide Gate 4 GO — record verbatim in `plans/CR-131_IMPLEMENTATION_PLAN.md` header.

**Next role: IMPLEMENTATION** — execute E1–E6 from plan. Run Entry Verification first. Self-test V1–V15. EXIT GATE 5/5. Write QA Handover.

**Credentials:** `owner@kunafamahal.com` / `Qplazm@10` (or any restaurant with CRM enabled for live API test)

---

```
Planning complete: CR-131
Stage: Implementation Plan (Gate 3)
Code reality: FULL — anchor lines verified before writing
Risk: MEDIUM
Files WILL change: constants.js, crmReportService.js (NEW), CustomerIntelligenceBeta.jsx (NEW),
                   GuestVsRegisteredBeta.jsx (NEW), Sidebar.jsx, App.js
Files WILL NOT touch: CustomersRfmMockup.jsx, CustomersMixMockup.jsx, crmAxios.js, insightsService.js
Owner decisions: ALL LOCKED (OD-1 through OD-7)
Docs: plans/CR-131_IMPLEMENTATION_PLAN.md
Next: Gate 4 GO → IMPLEMENTATION
```
