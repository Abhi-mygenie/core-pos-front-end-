# QA Batch Plan — IMPLEMENTED backlog (Role 4: QA) — 2026-10-09

Source: registry.json, contract Status = IMPLEMENTED (54 items). Role: **QA (Role 4)** per AGENT_PROMPT_ALPHA v0.7.
Code under test: branch `09_oct_gyan` @ `90d231e` (deployed in /app, preview).

## A. QA-ready — 37 items in 6 batches (risk-first order)

| Batch | Items | Risk | QA handover(s) | Regression scope (Role 4 rule) |
|---|---|---|---|---|
| **QA-B1 PMS Folio / GST balance** | BUG-422, 423, 424, 425, 426, 427, 428, 429, 430 (9) | CRITICAL (money/GST) | QA_HANDOVER_BATCHA_BUG422_423_424_425, QA_HANDOVER_BATCH2_BUG426-430, QA_HANDOVER_BUG427, AGENT_HANDOVER_QA_EXECUTION_BUG419-430 | Handover regression + full critical path (login → check-in → room order → folio → checkout → report) |
| **QA-B2 Inventory / Stock** | BUG-459, CR-387, CR-388, BUG-461 (4) | CRITICAL (BUG-459) / HIGH | QA_HANDOVER_2026-09-25_BUG459_CR387_COMBINED, QA_HANDOVER_CR388_2026_09_25 · BUG-461 none (Fast Lane, derive 1-2 cases) | Handover regression + full critical path (stock audit → purchase → stock report) |
| **QA-B3 PMS Check-in / payment** | BUG-410, 411, 401, 402, 415, 416 (6) | CRITICAL (401, 411) | QA_HANDOVER_BUG411_BUG410_2026_09_15 · 401/402/415/416 none → cases derived from registry fix notes | Handover regression + full critical path |
| **QA-B4 New Check-In form** | BUG-419, 420, 421 (3) | HIGH | QA_HANDOVER_BATCH3_BUG419-421 | Handover regression + 2 cross-flow |
| **QA-B5 Sep closure + Order Entry** | BUG-451, 453, CR-386, BUG-462, 464 (5) | HIGH (451 product list, 453 sound) | QA_HANDOVER_SEP_BUG_CLOSURE_WAVE1_2026_09_24, QA_HANDOVER_CR376_FU_B_2026_09_26 | Handover regression + 2 cross-flow (order → settle) |
| **QA-B6 Reports / Aggregator / Tooling** | CR-377, CR-119, CR-418 (3) | MEDIUM | QA_HANDOVER_CR377_2026_09_11, QA_HANDOVER_CR418_2026_10_09 · CR-119 none → derive | Handover regression only (CR-377 touches reportService → +2 cross-flow) |
| **QA-B7 Evidence reconcile (no re-test)** | BUG-433, 447, 450 (3) | HIGH | Status already says QA-VERIFIED (CR-385 P3.5/P4.5/M5) | Verify evidence files exist → promote to QA; no new test run |

Per item QA agent will: precondition check (handover §4 EXIT GATE 5/5 + registry synced; if missing → REJECT back to Implementation), code-marker present in deployed branch, execute cases, severity (BLOCKER/MAJOR/MINOR/NOTE) + evidence, coverage N/N files, registry spot-check.
Output per batch: `/app/memory/test_reports/<BATCH>_QA_REPORT_2026-10-09.md`; registry → QA (Gate 5b) on PASS; BUG_TRACKER updated for BLOCKER/MAJOR; sheet `--push` once at the end.

## B. NOT QA-able — need owner routing (17 items, no QA run proposed)

| Group | Items | Why | Proposed route |
|---|---|---|---|
| Legacy back-catalogue "SHIPPED / VERIFIED" | POS2-005, CR-002, Audit Report Optimization, BUG-095, BUG-058, PROD-003, PROD-004, PROD-005, BUG-111 P1+P2, PROD-HOTFIX-004, PROD-HOTFIX-005 (11) | Pre-gate-system items, already in production; no handover | CLOSURE (owner attests) or bulk → SMOKE |
| Investigations complete | INV-ROOM-001, INV-OE-001, INV-PG-001, INV-GST-001, INV-BACKEND-001, BUG-267 (6) | No code to QA | CLOSED (findings delivered) or spawn CRs |
| Backend-blocked | BUG-268 | Blocked on BACKEND (SQL AUTO_INCREMENT) | Stay; Blocked on = BACKEND |
| In progress / incomplete | CR-053 (Training Academy, Phase 1 partial), CR-011 (Reports, awaiting Gate 2 review) | Implementation not finished | Back to IMPLEMENTATION / owner review |
| Doc-only | CR-370 (5 doc corrections) | No runtime behaviour | Owner spot-check → CLOSED |

## Owner decision (2026-10-09)
- APPROVED: run all 7 batches in order QA-B1 → QA-B7.
- Section B items: deferred to a separate CLOSURE pass.
- Credentials: QA_CAFE103 supplied (alias in memory/test_credentials.md). Login PASS (Owner, RID 644).
- Owner override: BATCH2 handover (BUG-426/428/429/430) accepted without §1 EXIT GATE line.
- Test data: owner allows creating a fresh in-house guest on preprod.
- **QA-B1 BLOCKED (2026-10-09):** CAFE 103 profile has `room=No`, `room_gst_applicable=No`, room list `[]`, Aiosell property not configured → PMS Folio/GST flows cannot be exercised on this account.

## C. Blockers before QA can start
1. **QA login credentials** for preprod (restaurant / role) — `memory/test_credentials.md` is empty in this branch. Need an alias + creds (stored masked).
2. **PMS test data** (an active room booking / checkout-able stay) for QA-B1 and QA-B3.
3. Owner approval of batch order (one batch at a time per STEP -1 §4b).

---
## REVISION 2 (2026-10-09) — owner list of 49 items → Gate 5b QA, on PASS Status → QA (registry + sheet)

Accounts: **CAFE103** (non-PMS, Owner, RID 644 — login PASS) · **PMS account** (owner to supply — CAFE103 has room=No).
Order: P0 first, then by account availability. Every batch verified by testing agent; only PASS items move to QA.

| Batch | Account | Items | P0 |
|---|---|---|---|
| R2-1 P0 non-PMS | CAFE103 | BUG-268, BUG-459 | both |
| R2-2 PMS P0 | PMS | BUG-401, BUG-411 | both |
| R2-3 Inventory | CAFE103 | CR-387, CR-388, BUG-461, BUG-267* | — |
| R2-4 Order Entry / POS core | CAFE103 | BUG-451, BUG-453, BUG-462, BUG-464, CR-386, BUG-058*, BUG-095*, PROD-003*, PROD-004*, POS2-005* | — |
| R2-5 Reports / Aggregator / Tooling | CAFE103 | CR-377, CR-119, CR-011, CR-418, CR-370, CR-002*, Audit Report Optimization* | — |
| R2-6 Training Academy | CAFE103 | CR-053 | — |
| R2-7 PMS Folio / GST | PMS | BUG-422, 423, 424, 425, 426, 427, 428, 429, 430 | — |
| R2-8 PMS Check-in / Stay | PMS | BUG-402, 410, 419, 420, 421 | — |
| R2-9 PMS UI / CR-385 follow-ups | PMS | BUG-415, 416, 433, 447, 450 | — |

`*` = closed in closure pass 2026-10-09 → needs owner decision (re-open for QA or keep CLOSED).
Notes: BUG-268 was Blocked on BACKEND — QA verifies whether backend fixed it; FAIL → stays IMPLEMENTED + BACKEND. BUG-267 still not reproducible → PARKED (per owner list). CR-053 Phase 1 only (Missions 1-3).
Live-mutation risk: BUG-268, CR-388, BUG-459 (Save Adjustments), CR-387 (Update Stock), PROD-003/004, BUG-058 require saving on preprod — needs owner OK.
