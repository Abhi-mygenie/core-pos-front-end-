# SESSION HANDOVER — CR-358-P2 Gate 3 R11 Re-Probe
**Date:** 2026-09-03 | **Role:** PLANNING (probe + plan correction only — no code written)
**Status:** GATE 3 PLAN FROZEN (contracts verified) — awaiting owner **Gate 4 GO** + **SC-01 ack**

## Summary
Owner supplied preprod login (stored as alias OWNER_PREPROD in `memory/test_credentials.md`). Executed the plan §6 step-1 R11 re-probe: 11 curls, evidence in `memory/evidence/CR-358-P2/` (phones/emails masked). Plan §4 contracts corrected and frozen.

## Findings
| # | Finding | Action taken |
|---|---|---|
| 1 | `POST direct-reservation` §4.1 → **201**; backend derives `room_code` from mapping when `restaurant_table_id` sent; `notes` lands in `special_requests` verbatim (A-02 OK) | Contract confirmed |
| 2 | JSON `user-group-check-in` **without `id_type` → 500** (`id_type cannot be null`) and backend had already created `orders.id 1232204` → **orphan order** | §4.2 + Edit 5 now send `id_type: "Select document type"` + full FormData-parity keys (verified **200**, reservation → `in_house`, order 1232205). **BUG-BE-05** brief written |
| 3 | Live room mapping changed vs BUG-378 evidence: `suite → 8524/8525/8527`, `executive → 8526/8528`, rateplan codes null | §4.4 note: labels must come from live `mappings[]`; meal badge hidden when null |
| 4 | `local-reservations` shape identical to §4.3; `view=arrivals` works server-side (pending only) | Plan keeps single no-`view` fetch + client filter (feeds KPIs) |

## Preprod state left behind (owner action)
- Test guest **"CR358P2 Probe"** in-house in **r3 (8524)**, order `1232205`, booking `MG-69-A26BDA2F-…`, advance ₹200 / balance ₹800 → check out via Dashboard when convenient.
- Orphan `orders.id 1232204` (backend side, BUG-BE-05).
- Free rooms now: r4 (8525) only. WalkIn/Online JSON probes intentionally NOT run to keep a room free for QA (both share the verified P8 path).

## Docs updated
- `plans/CR-358-P2_IMPLEMENTATION_PLAN.md` — §0 R11 row, §4.1/4.2/4.4 markers, new §4.5 probe table, Edit 5 payload, §6 step 1, risk R2
- `backend_briefs/BACKEND_BRIEF_BUG-BE-05_2026_09_03.md` — NEW
- `control/registry.json`, `CR_REGISTRY.md` — note + artifact refs; `OPEN_GAPS_REGISTER.md` +OG-PMS-007
- `test_credentials.md` — OWNER_PREPROD alias + sandbox room map
- `PRD.md`

## Registry Sync
CR-358-P2: `GATE 3 — PLAN WRITTEN, awaiting Gate 4 GO (+SC-01 App.js ack)`, gate 3, 3/7 — SYNCED

## Next Step
Owner: "Gate 4 GO, SC-01 accepted" → IMPLEMENTATION role executes Edits 1-8 (no further re-probe needed unless >7 days pass).

*2026-09-03 | CR-358-P2 Gate 3 R11 re-probe COMPLETE*
