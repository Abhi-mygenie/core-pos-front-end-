# SESSION HANDOVER — 2026-07-11 — INTAKE (Bugs + CR Batch)

**Role:** INTAKE
**Duration:** ~15 min
**Items processed:** 14 registered (13 bugs + 1 CR) + 1 duplicate flagged

---

## Summary

Owner reported 13 bugs and 1 CR via screenshots + verbal descriptions. One additional request (scan-order popup toggle) was flagged as **DUPLICATE of existing CR-056**. All items registered in `registry.json`, `BUG_TRACKER.md`, `CR_REGISTRY.md`, and individual intake docs created.

## Items Registered

### Bugs (BUG-183 through BUG-195)

| ID | Title | Priority | Risk | Recommended Next |
|---|---|---|---|---|
| BUG-183 | Daily Report — Phone/customer name missing in Credit tab | P1 | MEDIUM | Planning |
| BUG-184 | Daily Report — CRE-Credit payment type not reflecting | P1 | MEDIUM | Planning |
| BUG-185 | Day Closure — Opening balance logic broken | **P0** | **CRITICAL** | **INVESTIGATION** |
| BUG-186 | Day Closure — Partial settlement broken | P1 | HIGH | Planning |
| BUG-187 | Validation style — red border missing on takeaway customer name | P2 | LOW | Planning (Fast Lane candidate) |
| BUG-188 | Order screen — Discount alignment issue | P2 | LOW | Planning (Fast Lane candidate) |
| BUG-189 | Delivery — Accept Order missing for rider | P1 | HIGH | **INVESTIGATION** |
| BUG-190 | Customer Notes — CRM sync broken, history not showing | P1 | MEDIUM | **INVESTIGATION** |
| BUG-191 | Customer Intelligence — Phone missing in Insights | P2 | LOW | Planning |
| BUG-192 | Prep & Serve Time — Handover time = 0, full logic investigation | P1 | MEDIUM | **INVESTIGATION** |
| BUG-193 | Room Transfer Trail — table leaks + FROM ROOM = 0 | P1 | MEDIUM | **INVESTIGATION** |
| BUG-194 | Payments report in Insights — completely empty | P1 | MEDIUM | Planning |
| BUG-195 | Takeaway — Name mandatory toggle not working | P1 | MEDIUM | Planning |

### CRs

| ID | Title | Priority | Risk | Recommended Next |
|---|---|---|---|---|
| CR-068 | Cancellation role-gating | P1 | HIGH | Planning (4 OQs pending) |

### Duplicates

| Request | Existing ID | Status |
|---|---|---|
| Scan-order popup toggle configuration | CR-056 | INTAKE (2026-07-04) |

## Priority Triage (recommended processing order)

1. **P0 CRITICAL:** BUG-185 (opening balance — financial, R6)
2. **P1 HIGH + INVESTIGATION:** BUG-186 (partial settlement), BUG-189 (delivery accept)
3. **P1 INVESTIGATION:** BUG-190 (CRM notes), BUG-192 (kitchen timing), BUG-193 (room transfers)
4. **P1 PLANNING:** BUG-183, BUG-184, BUG-194, BUG-195
5. **P1 CR:** CR-068 (cancellation role-gating — needs OQ answers first)
6. **P2 FAST LANE:** BUG-187, BUG-188 (cosmetic, low risk)
7. **P2 PLANNING:** BUG-191

## Artifacts Created
- 14 intake docs at `/app/memory/change_requests/`
- `registry.json` updated (297 total items)
- `BUG_TRACKER.md` updated
- `CR_REGISTRY.md` updated

## Next Session
- 5 items need INVESTIGATION role before planning
- 7 items ready for PLANNING (Gate 2)
- 2 items are Fast Lane candidates (owner approval needed)
- CR-068 has 4 open questions for owner
