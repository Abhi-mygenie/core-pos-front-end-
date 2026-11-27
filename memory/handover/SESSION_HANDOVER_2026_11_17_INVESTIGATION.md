# Session Handover — 2026-11-17 Investigation Session

**Date:** 2026-11-17
**Role:** INVESTIGATION AGENT
**Agent Prompt:** AGENT_PROMPT_ALPHA v0.7
**Session Duration:** ~45 min
**Items Investigated:** 3

---

## Session Summary

Three items were investigated to root-cause level. All three root causes were identified with HIGH confidence. No code was modified (investigation-only gate).

| # | Item | Root Cause | Confidence | Fix Scope | Planning Skip? |
|---|------|-----------|------------|-----------|----------------|
| 1 | CR-526 | Property name mismatch: `coverage.status` should be `coverage.type` → Remove button never renders | HIGH | 2 lines, 1 file | YES (owner approval) |
| 2 | CR-493 B5 | `cancelNoteMandatory` mapped into `restaurant.settings` but consumed from `restaurant.cancellation` → always false | HIGH | 1 line primary + 3 consumers | YES (owner approval) |
| 3 | CR-509 | `OrderReportBetaPage` never integrated `OrderDetailSheet` → no Activity Log/Order Lifecycle sidebar | HIGH | 6+ files, new feature | NO (full gate cycle) |

---

## Item 1: CR-526 — Credit Management Remove/Unpaid Button Hidden

### Root Cause
`computeFifoCoverage()` returns objects with property `.type` (e.g. `{ type: 'open' }`), but `CreditRow` checks `.status` (`coverage.status === 'open'`). Since `coverage.status` is always `undefined`, the condition is always `false` and the Remove button never renders — regardless of the user having `order_unpaid` permission.

### Evidence
- API response confirms `order_unpaid` permission present for owner@mantri.com
- Code: `CreditCustomerDetailSheet.jsx` lines 156, 166 (bug) vs lines 65-68 (correct `.type`)
- User screenshot: DevTools shows `order_unpaid` in role array, ACTION column empty

### Fix (2 lines)
```
Line 156: coverage.status === 'open'    →  coverage.type === 'open'
Line 166: coverage.status === 'partial' →  coverage.type === 'partial'
```

### Secondary: Print Button
No print button exists in `CreditRow`. This is a feature gap, not a bug. Needs implementation plan.

---

## Item 2: CR-493 B5 — Cancel Note Mandatory Toggle Ignored

### Root Cause
The field `cancelNoteMandatory` is correctly parsed from API in `profileTransform.js → fromAPI.settings()` (line 429) and stored at `restaurant.settings.cancelNoteMandatory = true`. However, the UI reads from `restaurant.cancellation.cancelNoteMandatory` (via `RestaurantContext.jsx`), and the `cancellation` object at `profileTransform.js:225-230` does NOT include `cancelNoteMandatory`. Result: always `false`.

### Evidence
- API probe: `curl /api/v1/vendoremployee/profile` for owner@palmhouse.com → `settings.cancel_note_mandatory: "Yes"`
- Code: `profileTransform.js:429` (correctly parsed but wrong location) vs `profileTransform.js:225-230` (missing field)
- User screenshot: UI shows "Notes (Optional)" with DevTools showing `cancel_note_mandatory: "Yes"`

### Fix (1 line primary + 3 consumers)
**Primary:** Add to cancellation object in `profileTransform.js:225-230`:
```js
cancelNoteMandatory: api.settings?.cancel_note_mandatory === 'Yes',
```

**Secondary:** Pass `cancelNoteMandatory` prop in 3 additional consumers:
- `AllOrdersReportPage.jsx:1129` — CancelOrderModal missing prop
- `OrderReportBetaPage.jsx:899` — CancelOrderModal missing prop
- `DashboardPage.jsx:2266` — CancelOrderModal missing prop

---

## Item 3: CR-509 — Order Report Beta Missing Activity Log

### Root Cause
`OrderReportBetaPage.jsx` does NOT use `OrderDetailSheet` at all. The regular Order Report (`AllOrdersReportPage.jsx`) renders `OrderDetailSheet` as a right sidebar on row click — this sheet contains:
- Order Timeline (created → ready → served → paid/cancelled)
- Item-level KDS status timeline
- Activity Log (operations from API: bill print, payment, status changes with actor + amount diffs)
- Bill summary footer

Order Report Beta has none of this — no row-click handler, no detail sheet, no activity log.

### Registry Status
CR-509 is at `GATE_1_INTAKE_COMPLETE` with 5 open owner decisions. Full planning gate cycle recommended.

### User Request
User specifically wants the activity log "revamped" so cashiers/restaurant managers can understand it easily.

---

## Test Credentials Used

| Account | Purpose |
|---------|---------|
| owner@mantri.com / Qplazm@10 | CR-526 investigation (Credit Management) |
| owner@palmhouse.com / Qplazm@10 | CR-493 B5 investigation (Cancel Note Mandatory) |
| owner@konaseemaruchulu.com / Qplazm@10 | CR-509 / Order Report Beta |

---

## Artifacts Created This Session

| Artifact | Path |
|----------|------|
| Investigation: CR-526 | `memory/investigations/INV-CR526_CREDIT_PRINT_UNPAID_2026_11_17.md` |
| Investigation: CR-493 B5 | `memory/investigations/INV-CR493-B5_CANCEL_NOTE_MANDATORY_2026_11_17.md` |
| Investigation: CR-509 | `memory/investigations/INV-CR509_ORDER_BETA_ACTIVITY_LOG_2026_11_17.md` |
| API Evidence: CR-493 B5 | `memory/evidence/CR-493-B5/profile_response.json` |
| Session Handover | `memory/handover/SESSION_HANDOVER_2026_11_17_INVESTIGATION.md` |

---

## Recommended Next Steps

1. **CR-526 Remove button:** Apply 2-line fix (`coverage.status` → `coverage.type`). Direct bug fix — owner approval for skip.
2. **CR-493 B5 Cancel note:** Apply transform fix (1 line in `profileTransform.js`) + wire prop in 3 consumers. Direct bug fix — owner approval for skip.
3. **CR-526 Print button:** Needs intake + planning. New feature in credit/financial area.
4. **CR-509 Activity Log:** Full gate cycle. CR-509 already registered. 5 owner decisions pending.

---

## Environment State at Session End
- Frontend: RUNNING (webpack compiled successfully, port 3000)
- Branch: `main` synced with `origin/main` at `dea90636`
- No code changes made (investigation-only session)
