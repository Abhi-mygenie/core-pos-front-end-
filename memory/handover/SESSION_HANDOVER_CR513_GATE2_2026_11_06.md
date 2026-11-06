# SESSION HANDOVER — CR-513 Gate 2 Impact Analysis (2026-11-06)

**From:** PLANNING agent (Role 2) — Impact Analysis only
**To:** Owner (ODs) → PLANNING agent Gate 3
**Entry doc:** `impact/CR-513_IMPACT_ANALYSIS.md`

## 0. 4-Line State Header
- **Sprint:** TBD (proposed `nov_cr_batch`)
- **Shipped this session:** CR-513 → GATE_2_IMPACT_ANALYSIS_COMPLETE. No code.
- **Blocked/parked:** P5-P7 reprint paths need backend fields (Option C) — not blocking Option A.
- **Critical open:** OD-513-04 (scope A/B/C), OD-513-06 (which %), OD-513-07 (round-off sign), OD-513-08 (sequence with BUG-592).

## 1. Key facts
- Live paths P1-P4 (CPP Print Bill + 5 OrderEntry auto-print override sites) already hold discount % (`orderDiscountPercent` / `presetDiscountPercent`) and `roundOff`.
- `get-single-order-new` has NO discount and NO round_up; `employee-orders-list` lacks `order_discount_type` + `round_up`; `order-logs-report` has all three.
- Side findings for other items: socket refresh zeroes `order.discount` (→ BUG-592); PMS callers pass `rawOrderDetails` array as `order` (pre-existing gap).

## 2. Docs updated
`impact/CR-513_IMPACT_ANALYSIS.md` · `evidence/CR-513/CR-513_order_source_field_probe_2026_11_06.json` · `control/registry.json` · `control/CR_REGISTRY.md`

## 3. Owner decisions locked (2026-11-06, later in session)
- OD-513-06: only one discount at a time (existing rule; IA R2 corrected) → send the active % (manual or preset); coupon never; flat ₹ = OD-513-05 (open).
- OD-513-07: `roundoff` signed — + when rounded up, − when rounded down (CR-170 floor case).
- OD-513-08: (i) one combined Gate 3 plan + coding pass with BUG-592 FE fix → `plans/CR-513_BUG-592_IMPLEMENTATION_PLAN.md`.
- PMS paths → separate follow-up CR.
- Still OPEN: OD-513-04 (scope A/B/C), OD-513-01/02/03/05.
- BUG-592 row added to BUG_TRACKER.md top table (was missing — registry.json only).

## 4. GATE 2 CLOSED (owner, 2026-11-06)
- Final decision box: top of `impact/CR-513_IMPACT_ANALYSIS.md`.
- CR-487 + CR-502 SUBSUMED into CR-513. BUG-592 FE fix combined (OD-592-A: remove L234 `discount_value` fallback).
- Backend brief: `backend_briefs/BACKEND_BRIEF_BUG-592_CR-513_2026_11_06.md` (non-blocking).
- BUG-652 (dashboard ReferenceError) fixed + QA PASS (iteration_25) — awaiting owner smoke.
- **Next agent:** PLANNING Gate 3 on owner "Gate 3 GO" → `plans/CR-513_BUG-592_IMPLEMENTATION_PLAN.md` (exact edits, Verification Matrix, Post-Code Registry Checklist). No code before Gate 4 GO.
