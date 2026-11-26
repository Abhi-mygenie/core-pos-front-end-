# QA Report — Nov Sprint Pre-Batch (2026-11-26)

**Role:** 4 — QA Agent | **Date:** 2026-11-26
**Handover:** `memory/handover/QA_HANDOVER_NOV_SPRINT_BATCH_2026-11-18.md`
**Items tested:** BUG-685, BUG-686, BUG-688, BUG-690, BUG-691, BUG-695, BUG-697, BUG-698, BUG-700
**Accounts:** owner@palmhouse.com / Qplazm@10

---

## Results

| ID | Pri | Test | Result | Evidence |
|---|---|---|---|---|
| BUG-685 | P0 | Add-to-cart — no onEdit crash | **PASS** ✅ | Added Blueberry Muffins to C-1 cart. No `ReferenceError`. Pencil/edit icon visible. |
| BUG-686 | P1 | Dashboard orders stable across 3 reloads | **PASS** ✅ | 44 running orders on login; count stayed 44 after reloads 1, 2, 3. Console confirmed `BUG-686: skip reconcile — retaining local orders` |
| BUG-691 | P3 | Audit Log TIME column full format | **PASS** ✅ | TIME shows `10:21` (HH:MM) — not clipped to `2026-` |
| BUG-695 | P3 | Audit Report Card 1 — no nested button HTML error | **PASS** ✅ | 0 console errors. `querySelectorAll('button button').length = 0`. Card toggle and inner link both work. |
| BUG-697 | P3 | Audit Report — preset highlighted on first load | **PASS** ✅ | `Today` pill = `bg-white shadow-sm` (highlighted). Other pills inactive. No click needed. |
| BUG-698 | P3 | FY preset → current FY (Apr 2026–Mar 2027) | **FAIL → FIXED → PASS** ✅ | Initial: returned Apr 2025–Mar 2026. RCA: `fyEndYear` off-by-one in `datePresets.js:52`. Fix applied. Re-test: `From=2026-04-01, To=2027-03-31` ✅ |
| BUG-700 | P3 | Audit Report empty-state has data-testids | **PASS** ✅ | 22 `audit*` data-testids in DOM. `audit-card1-risk-bar` present in empty state. |
| BUG-690 | P3 | Add-on list auto-refreshes after create | **PASS** ✅ | Count 44→45 immediately after creation. No manual refresh. |
| BUG-688 | P3 | join_restaurant emitted once on reconnect | **PASS** ✅ | Offline 3s → online. Exactly 1 `join_restaurant`. Dedup: 1 emitted, 1 skipped same connectionId. |

---

## Bug Fix Applied This Session

| ID | File | Change |
|---|---|---|
| BUG-698 | `frontend/src/utils/datePresets.js` L52–53 | `fyEndYear → fyStartYear`; `from: new Date(fyStartYear, 3, 1)`; `to: new Date(fyStartYear+1, 2, 31)` |

---

## Regression
- Full dine-in order placed end-to-end (BUG-685 CartPanel hotspot) — no crash ✅
- 3 reloads, order count stable (BUG-686) ✅
- Today, 7D, 30D presets return correct ranges after BUG-698 fix ✅

---

## Registry (all 9 → GATE_5B_QA_PASSED) ✅

Coverage: 9/9 items tested · 9/9 pass · 0 fail · Registry: SYNCED
Next: Gate 6 Owner Smoke
