# Business Rule Approval Setup Handover — 2026-05-16

**Created by:** Continuation Setup Agent
**Date:** 2026-05-16
**Branch:** `business-rules`
**Purpose:** Handover note for the next interactive Owner Approval Agent to start the business rule review session.

---

## Setup Summary

### Repository
- **Repo:** `https://github.com/Abhi-mygenie/core-pos-front-end-.git`
- **Branch:** `business-rules`
- **Clone destination:** `/app`
- **Dependencies installed:** Yes — Yarn install complete (962 packages)

### Documents Verified

| # | Document | Path | Status | Size |
|---|---|---|---|---|
| 1 | Owner Approval Sheet (primary) | `/app/memory/memory/change_requests/final_sprint_reconciliation/BUSINESS_LOGIC_FREEZE_OWNER_APPROVAL_SHEET_2026_05_16.md` | FOUND | 644 lines |
| 2 | Owner Approval Sheet (corrected-path fallback) | `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_LOGIC_FREEZE_OWNER_APPROVAL_SHEET_2026_05_16.md` | MISSING (primary found — fallback not needed) | — |
| 3 | Freeze Candidate (primary) | `/app/memory/memory/change_requests/final_sprint_reconciliation/BUSINESS_LOGIC_FREEZE_CANDIDATE_2026_05_15.md` | FOUND | 823 lines |
| 4 | Freeze Candidate (corrected-path fallback) | `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_LOGIC_FREEZE_CANDIDATE_2026_05_15.md` | MISSING (primary found — fallback not needed) | — |
| 5 | This setup handover file | `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULE_APPROVAL_SETUP_HANDOVER_2026_05_16.md` | CREATED | — |

> **Note:** Both primary documents are confirmed present at the `/app/memory/memory/...` paths. The corrected-path fallbacks under `/app/memory/change_requests/...` do not exist, but are not needed since the primary paths are valid.

---

## Session File

A session tracking file already exists in the repo:

**Path:** `/app/memory/memory/change_requests/final_sprint_reconciliation/BUSINESS_LOGIC_OWNER_APPROVAL_SESSION_2026_05_16.md`

**Current session state (as of clone):**
- Total rules: **56**
- Ready for owner approval: **47** (all pending — 0 approved so far)
- Live smoke required: **5** (DEL-005, SCAN-003, DASH-001, DASH-004, PRINT-001/002)
- Owner decision required: **2** (SC-004, PAY-009)
- Backend confirmation required: **2** (PAY-005, PAY-007)

---

## Primary File for Next Approval Agent

The next Owner Approval Agent should load and work from:

```
/app/memory/memory/change_requests/final_sprint_reconciliation/BUSINESS_LOGIC_FREEZE_OWNER_APPROVAL_SHEET_2026_05_16.md
```

This file contains all **56 rules** across the following business areas:
- TAX (8 rules: TAX-001 to TAX-008)
- SERVICE CHARGE (6 rules: SC-001 to SC-006)
- DELIVERY (5 rules: DEL-001 to DEL-005)
- TIP (3 rules: TIP-001 to TIP-003)
- ROUND-OFF & TOTALS (6 rules: ROUND-001, ROUND-002, TOTALS-001 to TOTALS-004)
- PAYMENT FLOW (9 rules: PAY-001 to PAY-009)
- SCAN & ORDER (3 rules: SCAN-001 to SCAN-003)
- DASHBOARD (4 rules: DASH-001 to DASH-004)
- ORDER POLLING (4 rules: POLL-001 to POLL-004)
- POS BOOT (2 rules: BOOT-001 to BOOT-002)
- ROOM / HOTEL (2 rules: ROOM-001 to ROOM-002)
- PRINTER AGENT (2 rules: PRINT-001 to PRINT-002)
- MISCELLANEOUS (2 rules: MISC-001 to MISC-002)

---

## Highest-Risk Rules (P0 / High Priority)

| Rule ID | Risk | Summary |
|---|---|---|
| SC-004 + PAY-005 | **P0 — Customer-visible overbilling** | Bean Me Up print template independently adds SC GST on top of frontend value. Owner must choose Option A/B/C/D to resolve. |
| PAY-007 | Medium | Backend requires misspelled `'sucess'` for PayLater. If backend fixes typo, frontend PayLater breaks silently. |

---

## Owner Actions Required

### Immediate (approve 47 ready rules)
All 47 rules in Section 4 of the approval sheet have `[ ]` checkboxes awaiting owner sign-off.

### Priority: P0 Decision Needed
- **SC-004/PAY-005:** Owner must pick **Option A, B, C, or D** for the Bean Me Up print double-count fix before any dine-in bill is printed with service charge GST.

### Smoke Tests (5 rules blocked)
Owner or tenant must perform live smoke on:
1. DEL-005 — Web delivery charge lock
2. SCAN-003 — Web order origin enrichment
3. DASH-001 — Status-8 → Hold routing
4. DASH-004 — Web vs POS header counter
5. PRINT-001 + PRINT-002 — Printer agent on agent-configured tenant

### CRM Autofill Review
- **PAY-009** — Owner reviews gap analysis and confirms acceptable or requests specific edge-case fixes.

---

## Instructions for Next Agent

1. **Do NOT change any code.** This is an approval session only.
2. **Do NOT edit baseline docs.** Approval sheet is a read/write record; baseline docs are not.
3. **Do NOT commit.** Session decisions are recorded in the session file only.
4. **Load the primary approval sheet** (path above) and present each of the 47 ready rules to the owner one at a time.
5. **Record decisions** in `/app/memory/memory/change_requests/final_sprint_reconciliation/BUSINESS_LOGIC_OWNER_APPROVAL_SESSION_2026_05_16.md`
6. After all 47 are reviewed, present the 2 owner-decision items (SC-004, PAY-009) for owner choice.
7. Flag the 5 smoke-required rules and 2 backend-confirmation rules — do not approve them until conditions are met.

---

**Setup complete. Environment ready. No code changed. No baseline docs edited. No registers edited. No commits.**

— End of Setup Handover —
