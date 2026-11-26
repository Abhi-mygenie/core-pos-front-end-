# BUG-684 — Implementation Agent Brief

**Bundle:** `BUG-684-IMPL-BUNDLE.zip`
**Date:** 2026-11-18
**Prepared by:** Planning Agent (Gate 2 + Gate 3 complete, curl-probe done)

---

## What's Inside This ZIP

| # | File | What it is |
|---|------|-----------|
| 01 | `01_INTAKE.md` | Full bug report — symptom, root cause, evidence, blast radius |
| 02 | `02_IMPACT_ANALYSIS.md` | Gate 2 — data flow trace, 2 defects identified, conflict check, affected scenarios |
| 03 | `03_IMPLEMENTATION_PLAN.md` | **Gate 3 — START HERE** — 5 exact edits with line numbers, current→new code, verification matrix |
| 04 | `04_CURL_PROBE_ANALYSIS.json` | Live data: 11/100 orders affected (11%), both ₹1 over and under |
| 05 | `05_ORDER784_DETAIL.json` | The reported order — backend shows amount=250, round_up=0.00 (correct) |
| 06 | `06_PROFILE_PROBE.json` | Restaurant 672 profile — total_round=Yes, gst_status=True |
| 07 | `07_LOGIN_PROBE_MASKED.json` | Auth response structure (tokens masked) |

---

## Reading Order for Implementation Agent

1. **Read `03_IMPLEMENTATION_PLAN.md` first** — it has everything: 5 edits, exact lines, current→new code, verification matrix, registry checklist
2. Skim `01_INTAKE.md` §5 (Root Cause) only if you need context on WHY
3. Skim `02_IMPACT_ANALYSIS.md` §2.3-2.4 only if you need the data flow trace
4. `04-07` are evidence — reference only, no action needed

---

## Summary for the Implementation Agent

**Bug:** Cart "Collect Bill ₹X" button shows ₹1 wrong (11% of orders). Backend payload is correct — display-only.

**Root cause:** `OrderEntry.jsx` has a local `applyRoundOff` helper (L1192-1196) that is inverted vs the shared CR-170 `applyGrandTotalRoundOff` in `roundOffUtils.js`. Also, per-item tax isn't rounded to 2dp before summing (paise drift).

**Fix:** 5 edits, all in `OrderEntry.jsx`, ~12 lines:
- E1: Import `applyGrandTotalRoundOff` from `roundOffUtils.js`
- E2: Round per-item tax in `localTax` reducer (L1153-1154)
- E3: Round per-item tax in `unplacedTax` reducer (L1168-1169)
- E4: Delete local `applyRoundOff`, add `roundOffEnabled` const (L1192-1196)
- E5: Wire call sites to shared helper (L1225, L1227)

**Owner Decisions (resolved):**
- OD-684-01 = Full gate flow (confirmed)
- OD-684-02 = YES, round-off OFF shows 2-decimal (confirmed)

---

## Post-Code Checklist (MANDATORY)

```
- [ ] registry.json: BUG-684 → status: IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] BUG_TRACKER.md: row updated to IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add OrderEntry.jsx with BUG-684 + date
- [ ] Code markers: // BUG-684 in every modified line/block
- [ ] Webpack compiles with 0 new warnings
```

**Then ask owner for Gate 4 GO before coding.**

---

## Risk

- **HIGH** (financial display, R5 hotspot file)
- **Conflict:** NONE (3 in-flight items on OrderEntry.jsx are 600+ lines away)
- **Payload change:** NONE
- **Backend change:** NONE
