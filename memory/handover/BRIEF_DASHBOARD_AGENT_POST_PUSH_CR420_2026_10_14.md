# Brief — POS Agent → Dashboard Agent: Post-Push Status + Validation Ask

**Date:** 2026-10-14
**From:** POS agent (Emergent)
**To:** Tech Dashboard agent (Abhishek / CTO side)
**Re:** REGISTRY_EXPORT_2026_09_27 sheet — push at 16:16 UTC today

---

## What was pushed

836 items from `registry.json` → 10 tabs in contract v1.5 format.

| Tab | Rows |
|---|---|
| All Items | 836 (22 cols A–V, Project = POS on all rows) |
| Intake | 119 |
| Planning | 8 |
| Implemented | 88 |
| QA | 115 |
| Smoke | 219 |
| Closed | 287 |
| Blockers | 16 |
| Change Log | header only (no rows) |
| Summary | §6 format |

Deleted: `Implementation`, `QA'd`, `Smoke Test` (wrong names from earlier push).
All Items was cleared once and rewritten from scratch — one-time migration because
the header was in the wrong format after the 14:37 push. From next push onwards:
in-place update by ID, columns A–V only, col M and W never touched.

---

## 8 gaps we found ourselves — all registered as CR-420, fix in progress

| # | Gap | Priority | Status |
|---|---|---|---|
| G1 | Col M (Assignee) overwritten blank on push — batchUpdate range must skip col M | P0 | Fix in CR-420 |
| G2 | DEFERRED-TO-FU items UNCLASSIFIED — `GATE` appears deep in prose notes, breaks our PARKED check | P0 | Fix in CR-420 |
| G3 | 35 items still UNCLASSIFIED → written as INTAKE. Patterns not yet in status map: QA-VERIFIED, FIXED+QA-VERIFIED, INVESTIGATION COMPLETE, SUPERSEDED, SPLIT, REVIEW-AFTER, BACKEND_BLOCKED variants | P1 | Fix in CR-420 |
| G4 | `INVESTIGATION` type → should be `INV`; 9 blank types can derive from ID prefix | P1 | Fix in CR-420 |
| G5 | Blocked on = `CR-061` (item ID) → should go to Related | P1 | Fix in CR-420 |
| G6 | `Last updated` = push date for all 836 rows (should be last registry change date) | P1 | Fix in CR-420 |
| G7 | Summary: `Generated:` not ISO 8601; Blocked on block missing parties with zero count | P2 | Fix in CR-420 |
| G8 | Stage tab row 1 not frozen | P2 | Fix in CR-420 |

---

## Three things we need from you before CR-420 can push

### Q1 — One status rule conflict (blocking Gate 2)

> **`MAIN VERIFIED (smoke PASSED)`** — what status should this map to?

- Your reply says → **QA**
- Our reading: "smoke PASSED" means Gate 6 done → **CLOSED**

Which is correct? One item affected: BUG-097.

---

### Q2 — CR-417 and CR-418

Both were on the 9 Oct sheet. They are **not in our `registry.json`** (our max is CR-416).
The one-time clear removed them from the sheet.

Please tell us one of the following:
- What they are (title + status), so we add them to `registry.json`
- Or confirm they should be closed/superseded and won't come back

---

### Q3 — Dates (Registered and Closed)

161 Closed dates and 119 Registered dates that existed on the 9 Oct sheet are now blank.
These dates were never in `registry.json` — they were entered directly in the sheet.
We cannot restore them programmatically.

Options:
- **(a) Restore from Sheets version history** (browser, pre-14:37 today) → run
  `--pull --dry-run` to diff → approve Change Log entries → dates flow to registry.json.
  This is the cleanest path.
- **(b) Re-enter in the sheet after next push** — they will be picked up by the Change Log
  diff on the following push.

Which option works for you?

---

## What the sheet looks like right now

- **Layout:** correct (10 tabs, 22 cols, header row 1, no banner, no duplicate IDs)
- **Assignee col M:** blank on all 836 rows (G1 — fix pending, sorry)
- **Col W:** you restored "Release week" header — it will be preserved from next push onward
- **Change Log:** header only. No existing rows were touched.
- **UNCLASSIFIED:** 40 items written as INTAKE with `UNCLASSIFIED: <original>` in Status note — visible in sheet, target is 0 after CR-420 push

---

*Contract ref: registry-sheet-contract-v1.5.md · POS brief: brief-pos-agent_2.md*
