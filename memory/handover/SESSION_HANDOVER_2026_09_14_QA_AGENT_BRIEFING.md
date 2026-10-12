# Session Handover — QA Agent Briefing

```
Written:          2026-09-14
Status at close:  MULTI-SESSION HANDOVER — full QA backlog batched and ready for agent.
Next agent role:  QA (PLANNING + APPROVAL first — do NOT start executing until owner approves plan)
Workspace:        /app  (branch 14sep, frontend-only)
Credentials:      /app/memory/test_credentials.md  (goankitchen_owner alias)
App URL:          https://react-pos-deploy-4.preview.emergentagent.com
```

---

## 1. What Was Done This Session (2026-09-14)

### Deployment
- Repo cloned from `https://github.com/Abhi-mygenie/core-pos-front-end-.git` (branch `14sep`) into `/app/frontend/`
- All env variables written to `.env`. App running on port 3000 via supervisor. Webpack compiling clean.
- Memory dir pulled from remote (626 files across 17 subdirs).

### CR-363 — Night Audit Report (PMS) — **Gate 5a IMPLEMENTED**
- Gate 2 OD decisions recorded (OD-363-07: badge, OD-363-08: ship "—")
- Backend null-fields brief filed (`BACKEND_BRIEF_CR363_CR366_NULL_FIELDS_2026_09_14.md`)
- Gate 3 Implementation Plan written + all probes done (incl. BN-6 group_by=month)
- **Implemented**: `NightAuditPage.jsx` (NEW), `nightAuditTransform.js` (NEW), pmsService +2 exports, constants +2 endpoints, App.js +2 routes, Sidebar.jsx +2 children
- Live on preprod — 8-section audit page rendering with real data
- **QA not done**

### CR-366 — Revenue Dashboard (PMS) — **Gate 5a IMPLEMENTED**
- Same gate cycle as CR-363 (joint IA + plan)
- **Implemented**: `RevenueDashboardPage.jsx` (NEW), `revenueTransform.js` (NEW)
- Live on preprod — KPI tiles, 3 charts, 4 breakdown tables
- **QA not done**

### CR-364 — Guest Folio Detail Page (PMS) — **Gate 5a IMPLEMENTED**
- Intake fully closed + CR-364-PRINT sub-CR registered (BACKEND-BLOCKED, parked)
- Gate 2 IA → Gate 3 Plan → Implementation all completed same session
- **Implemented**: `GuestFolioPage.jsx` (NEW), `folioTransform.js` (NEW), pmsService +getGuestFolio, App.js +route, 3 link re-points (InHouseGuestsPage, DeparturesPage, ReservationsPage)
- Live on preprod — folio page renders with real guest data
- Bug fixed during self-test: `API_ENDPOINTS` missing import in pmsService
- **QA not done**

### CR-357 — Room Advance `+Pay` — **PARKED 15 days**
- Owner confirmed hotel doesn't take advances currently (`advance_payment=0`)
- Zero operational impact. Priority downgraded P1→P2. Re-evaluate ~2026-09-29.

### BUG-389 — PMS Room GST slab boundary — **CLOSED: NOT A BUG**
- Re-validated: `slab2.min=7500.01` is intentional. ₹7,500=5% (intended). ₹7,500.01+=18% (intended).
- Registry, intake doc, BUG_TRACKER all updated to CLOSED.

### Excel tracker generated
- `/app/frontend/public/mygenie_cr_bug_tracker.xlsx` — 34 CRs + 32 bugs with dropdown statuses

---

## 2. Current State — 87 Items QA Pending (full list)

All items are IMPLEMENTED (Gate 5a) but have not been through Gate 5b (QA). They fall into two groups:

### Group A — Current Sprint (pos_pms_1 / CR-357 era) — 17 items
These are the freshest, highest-priority items for QA.

| ID | Priority | Title |
|---|---|---|
| BUG-374 | P0 | Cart: qty increase on one variation mirrors to all variations of same item |
| CR-363 | P1 | Night Audit Report — 8-section PMS page (live on preprod) |
| CR-364 | P1 | Guest Folio Detail Page (live on preprod) |
| BUG-368 | P1 | Split Bill reprint fails after settlement |
| BUG-369 | P1 | Print Customer Copy setting has no effect |
| BUG-372 | P1 | Transfer + Merge buttons on order card not working |
| BUG-376 | P1 | Role Add/Update: 5 API contract gaps |
| BUG-394 | P1 | Number inputs: special chars corrupt data silently (4 files) |
| CR-366 | P2 | Revenue Dashboard (live on preprod) |
| BUG-371 | P2 | Bulk Editor: variation price not editable |
| BUG-395 | P2 | Print payload missing 4 delivery address sub-fields |
| CR-372-A | P1 | Security file moves + .env cleanup (doc-only, 92 files moved) |
| BUG-390 | P3 | Normal Menu image upload hidden (Aggregator gate regression) |
| BUG-391 | P3 | Aggregator GST not enforced on menu items |
| BUG-392 | P3 | All number inputs respond to scroll wheel |
| CR-373 | P3 | Aggregator ProductForm: use item image for Swiggy toggle |
| CR-374 | P3 | BulkEditor Filter Panel — Status/Type/Category |

### Group B — Older Backlog (pre-CR-357, carried forward) — 70 items
These have been sitting since earlier sprints. Full list:

**P0 (1):** CR-140
**P1 (30):** BUG-170, 236, 294, 295, 296, 297, 298, 299, 300, 301, 302, 308, 309, 311, 314, 316, 318, 321, 322, 340, 347, 348 · BUG-SCAN-DEDUP · CR-100, 124, 127, 128, 132, 133, 139, 141, 146, 150, 155, 157, 159, 160, 161, 165
**P2 (12):** BUG-209, 292, 293, 310, 315, 317, 320 · CR-129, 131, 136, 148, 167, 169, 170 · GAP-BULK-DEFAULTS
**P3 (17):** BUG-325, 326, 327, 351, 352, 357, 358, 359, 360, 361 · CR-348, 349, 350, 351

---

## 3. QA Agent Instructions (MANDATORY — read before doing anything)

### Step 0 — Boot sequence per Alpha v0.7
```
1. Read this handover in full
2. Read /app/memory/control/CONTROL_DASHBOARD.md
3. Read /app/memory/control/CR_REGISTRY.md + BUG_TRACKER.md (skim for context)
4. Check environment:
   tail -5 /var/log/supervisor/frontend.out.log   → expect "webpack compiled successfully"
   curl -s https://react-pos-deploy-4.preview.emergentagent.com | grep -i mygenie
5. Verify test credentials work (see §5 below)
```

### Step 1 — Build the QA Plan (do NOT execute yet)
Read each QA handover doc for the items below. Build a complete plan covering:
- Test cases per item (from QA handover docs in `/app/memory/handover/QA_HANDOVER_*.md`)
- Batch grouping (see §4)
- Regression scope per batch
- Estimated risk per batch

### Step 2 — Present plan to owner for approval
Format your plan as:
```
BATCH-01 — [name]
Items: [list]
Test count: N
Regression: [scope]
Risk: LOW / MEDIUM / HIGH
Estimated: N test cases

BATCH-02 — ...
```
Then ask: "Shall I proceed with Batch-01? YES / NO / MODIFY"

### Step 3 — Execute batches one at a time, owner-approved
Only after owner says YES → execute the batch using the QA handover docs.

### RULE: Do NOT start QA until owner approves the plan. Present plan first.

---

## 4. Proposed QA Batches (agent to validate + present to owner)

### BATCH-01 — PMS New Pages (highest value, live on preprod today)
**Items:** CR-363 · CR-364 · CR-366
**QA Handovers:** `QA_HANDOVER_CR363_366_2026_09_14.md` (covers CR-363 + CR-366, 24 test cases + 4 regression) · CR-364 QA handover at `QA_HANDOVER_CR363_366_2026_09_14.md` §2 V-01..V-20
**Risk:** HIGH (money display, room billing)
**Regression scope:** Front Desk, In-House Guests, Tape Chart (existing PMS navigation)
**Note:** CR-363 + CR-366 share a QA handover. CR-364 has its own 20-check matrix in the same file.

### BATCH-02 — P0/P1 POS Bugs (current sprint, high user impact)
**Items:** BUG-374 · BUG-369 · BUG-372 · BUG-394 · BUG-368
**QA Handovers:**
- BUG-374: `QA_HANDOVER_BUG374_*.md` (testing agent timed out 2× — needs fresh run)
- BUG-369: `QA_HANDOVER_BUG369_*.md`
- BUG-372: `QA_HANDOVER_BUG372_*.md`
- BUG-394: `QA_HANDOVER_BUG394_*.md`
- BUG-368: `QA_HANDOVER_BUG368_*.md`
**Risk:** HIGH (BUG-374 P0 cart data, BUG-394 silent data corruption)
**Regression:** Order entry → cart → settle cycle

### BATCH-03 — Current Sprint Remaining (P1-P2 bugs)
**Items:** BUG-376 · BUG-395 · BUG-371 · CR-372-A
**QA Handovers:** Check `handover/` dir for matching files
**Risk:** MEDIUM
**Regression:** Role management, print flow, BulkEditor

### BATCH-04 — Current Sprint P3 (low risk)
**Items:** BUG-390 · BUG-391 · BUG-392 · CR-373 · CR-374
**Risk:** LOW-MEDIUM

### BATCH-05 — Older Backlog P0+P1 Critical (pre-CR-357)
**Items:** CR-140 (P0) · BUG-294, 295, 296, 301, 302, 308, 309, 340, 347, 348
**Note:** These are older — verify each QA handover still matches current code (R12: docs >7 days may be stale)
**Risk:** HIGH (P0 + financial bugs in the mix)

### BATCH-06 — Older Backlog P1 Remaining
**Items:** BUG-170, 236, 297, 298, 299, 300, 311, 314, 316, 318, 321, 322 · BUG-SCAN-DEDUP · CR-100, 124, 127, 128

### BATCH-07 — Older Backlog P1 CRs
**Items:** CR-132, 133, 139, 141, 146, 150, 155, 157, 159, 160, 161, 165

### BATCH-08 — Older Backlog P2
**Items:** BUG-209, 292, 293, 310, 315, 317, 320 · CR-129, 131, 136, 148, 167, 169, 170 · GAP-BULK-DEFAULTS

### BATCH-09 — Older Backlog P3
**Items:** BUG-325, 326, 327, 351, 352, 357, 358, 359, 360, 361 · CR-348, 349, 350, 351

### BATCH-10 — Full Regression
**Scope:** Critical path smoke across all sprints:
1. Login → restaurant selection → dashboard
2. Create order → add items → cart → collect payment → settle → print bill
3. PMS: check-in → in-house guest view → folio → checkout
4. Night Audit: date picker → all 8 sections → export
5. Revenue Dashboard: 7D default → switch preset → charts render
6. Reports: room orders, sales report, item ledger
7. Sidebar navigation — all PMS + Reports links functional
8. Aggregator: toggle menu item status, bulk edit
**Risk:** N/A — verification only

---

## 5. Credentials & Environment

```
Account alias:  goankitchen_owner
Email:          owner@thegoankitchen.com  password: ***
Login endpoint: POST https://preprod.mygenie.online/api/v1/auth/vendoremployee/common-login
App URL:        https://react-pos-deploy-4.preview.emergentagent.com
Night Audit:    /pms/night-audit
Revenue:        /pms/revenue
Folio:          /pms/folio/:orderId  (e.g. /pms/folio/1232245)
In-House:       /pms/in-house       (tap View Bill to reach folio)
```

Test order IDs on preprod:
- Order 1232245 — room r3, Walk-in, in-house (Test Guest GST)
- Order 1232244 — room r5, Walk-in, in-house (another live order)

---

## 6. Key Reference Docs

| Doc | Path | Purpose |
|---|---|---|
| QA Handover CR-363+CR-366+CR-364 | `handover/QA_HANDOVER_CR363_366_2026_09_14.md` | Primary QA handover for all 3 new PMS pages |
| Night Audit IA | `impact/CR-363_CR-366_JOINT_IMPACT_ANALYSIS.md` | Data shapes, OD decisions |
| Guest Folio IA | `impact/CR-364_IMPACT_ANALYSIS.md` | Scope, R6 rules, departed guest handling |
| Design (PMS pages) | `/app/frontend/public/cr364-folio-design.html` | Visual reference Option Set C |
| Null-fields brief | `backend_briefs/BACKEND_BRIEF_CR363_CR366_NULL_FIELDS_2026_09_14.md` | Known nulls — show "—" not errors |
| Agent workflow rules | `control/AGENT_PROMPT_ALPHA.md` | Full QA role playbook |
| CR/Bug tracker | `/app/frontend/public/mygenie_cr_bug_tracker.xlsx` | Full status spreadsheet |

---

## 7. Known Issues / Watch-outs for QA

| Item | What to watch |
|---|---|
| CR-363 §C Outstanding | Guest name/room code will show "—" — this is correct per OD-363-08 (BN-1 not yet fixed by BE). Do NOT raise as a bug. |
| CR-363 §H Reconciliation | Settlement total + F&B share show "—" — correct per BN-2. Delta ₹0 = pass. |
| CR-366 month view | ADR/RevPAR "Collected" lines absent for ranges >366 days — correct per BN-6. |
| CR-364 Meal Plan | Shows "—" — correct (BN-364-MEAL pending BE). Not a bug. |
| CR-364 Record Payment | Button NOT rendered — correct per OD-364-C1 (hotel disabled). Not a bug. |
| BUG-374 | Testing agent timed out 2× previously — use a fresh browser session with real order data |
| Older backlog | QA handovers may be stale (>7 days old). Cross-check plan lines against live code per R12. |

---

## 8. Do-Not-Retry (inherited)

1. Do NOT touch `Sidebar.jsx` without a fresh SC ack.
2. Do NOT recompute money in transforms — R6 strictly enforced.
3. Do NOT combine gates or skip role declaration.
4. Do NOT start QA without owner approval of the batch plan.
5. Do NOT mark any item CLOSED from QA alone — owner smoke (Gate 6) is still required after Gate 5b.

---

## 9. Alpha v0.7 QA Role Reminder

Per `control/AGENT_PROMPT_ALPHA.md` Role 4 (QA Agent):
- **Precondition:** Each QA handover must say "Registry synced: YES" and "EXIT GATE: 5/5 PASS" before you test it. If missing → return to IMPLEMENTATION agent.
- **Finding severity:** BLOCKER / MAJOR / MINOR / NOTE — not P0–P3.
- **Coverage check:** After all cases, confirm ≥1 test per changed file.
- **Registry spot-check:** Verify 2 random items in registry.json after each batch.
- **QA agent NEVER writes code** — file BUG for BLOCKER + MAJOR, owner decides MINOR.

---

*Handover written 2026-09-14 · Planning/Implementation agent (ALPHA v0.7)*
*Next agent: QA — read §3 before anything else. Present plan, get approval, then execute.*
