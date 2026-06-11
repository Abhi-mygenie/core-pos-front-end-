# PRD — MyGenie Core POS Frontend

## Original Problem Statement (2026-06-11)
Deploy repo https://github.com/Abhi-mygenie/core-pos-front-end-.git (branch `11-june`) directly into /app (wipe local), configure env variables, then summarize the latest insight report audit document. No code edits.

## Architecture
- React frontend (CRACO) at /app/frontend, supervisor-managed on port 3000
- FastAPI backend at /app/backend (port 8001), MongoDB local
- External APIs: preprod.mygenie.online (REACT_APP_API_BASE_URL), presocket.mygenie.online (socket), crm.mygenie.online (CRM), Firebase (mygenie-restaurant project)

## What's been implemented (2026-06-11)
- Wiped /app (preserved .git/.emergent), pulled branch `11-june` via fetch + checkout
- Created /app/frontend/.env with all user-provided variables (REACT_APP_BACKEND_URL kept as existing preview URL per user choice)
- Recreated /app/backend/.env (MONGO_URL, DB_NAME — gitignored in repo)
- yarn install + pip install, services restarted, login page verified via screenshot
- Summarized /app/INSIGHTS_REPORTS_AUDIT.md (dated 2026-06-10) for the user

## Update 2026-06-11 — Palm House audit
- Ran same-methodology Insights audit for The Palm House (rid 541, owner@palmhouse.com), Mar 1 – Jun 10 2026
- Rebuilt /app/audit_data/ (fetch_data.py + analyze.py + results.json + raw payloads ~150MB)
- Report: /app/INSIGHTS_REPORTS_AUDIT_PALMHOUSE.md — confirms all cafe103 findings; room-revenue split (₹1.78L Mar) and after-midnight tail loss are LIVE here; settlement "total sale" exceeds all frontend figures (open backend question)
- No application code modified

## Update 2026-06-11 (later) — Gate process entered for audit findings
- Batch-registered 10 items in control layer (registry.json, 181 items now): BUG-125..129, CR-029..033
- Gates 0+1+2 complete for all 10: intake docs (memory/memory/{bugs,crs}/intake/) + impact analyses (memory/memory/bugs/ + change_requests/)
- Trackers synced: control/BUG_TRACKER.md + control/CR_REGISTRY.md (new audit-batch sections)
- Gate 3 ready: BUG-125, BUG-126, BUG-128, CR-032 · Gate 3 blocked on owner: BUG-127, CR-029, CR-030, CR-031 · Backend-blocked: BUG-129, CR-033
- Note: scripts/create_intake.py + gen_dashboard_data.js missing from 11-june branch — registration done manually

## Update 2026-06-11 (later-2) — Question freeze complete + Gate 3 plans produced
- ~35 owner decisions locked across 2 Q&A rounds (OWNER_DECISION_QUEUE.md Category H + addendum): revenue = collection date (R1); room food included everywhere; TAB out of revenue, settlements in by method, GST stays; Items punch-dated with Ledger-style buckets; cancellation = line value/qty/cancel_at with operations.previous_order_amount override; per-screen basis labels; harness = QA fixture; per-screen freeze-log at Gate 4
- Live-verified: complementary_price key; operations[].order_cancel.previous_order_amount (partial coverage caveats); room_revenue = food-at-checkout (to the rupee); discount zeroed on all 823 cancelled lines; no settlements ever recorded (₹4.4L credit outstanding genuine)
- Gate 3 artifacts created: implementation plans for BUG-125/126/127/128, CR-029/030/031/032/034; CR-034 registered (intake+impact+plan); BACKEND_BRIEF_2026_06_11.md (7 asks); registry at 182 items, batch completeness 3/7
- STATUS: awaiting owner Gate 4 GO per item. NO CODE WRITTEN (freeze rule R3 honoured)
- Handover for implementation agent: /app/memory/handover/INSIGHTS_BATCH_HANDOVER_2026_06_11.md (env, creds, locked spec, waves, QA rule, API facts, code map, gotchas)

## Notes
- /app/audit_data/ referenced in the audit doc is NOT present in this branch
- No code edits made (per user instruction)

## Backlog / Next
- P0: Apply quick-win fixes from audit (A3 cancellation string match, A8 round_off→round_up, A7 duplicate fetch, A6 dead TAB tile) — pending user approval
- P1: TAB revenue policy alignment, shared tax helper, canonical cancellation formula
- P2: Punch-vs-collection attribution toggle on all screens
