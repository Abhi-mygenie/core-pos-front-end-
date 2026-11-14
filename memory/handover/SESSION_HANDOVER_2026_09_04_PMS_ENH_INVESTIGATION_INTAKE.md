# SESSION HANDOVER — 2026-09-04 — PMS Enhancements: INVESTIGATION + INTAKE

**Role(s) this session:** INVESTIGATION → INTAKE (ALPHA v0.7)
**Branch:** `/app/frontend` = `origin/PMS1` (no code changes this session)
**Environment:** preprod.mygenie.online, restaurant 69 (sandbox-pms), owner account (creds in `test_credentials.md`, masked here)

## Summary
Investigated feasibility of 7 owner-selected post-CR-358 PMS enhancements (live curl probes + code traces, 10/10 steps), then registered them as CRs with full intake docs. Zero application code touched.

## Artifacts created
| Artifact | Path |
|---|---|
| Investigation report | `memory/PMS_ENHANCEMENTS_FEASIBILITY_INVESTIGATION.md` |
| Evidence (15 probes, PII masked) + registry script | `memory/evidence/INV-PMS-ENH/` |
| Intake docs (8) | `memory/change_requests/CR-361_…` → `CR-367_…`, `CR-358-P5_PMS_RATES_RESTRICTIONS_NO_SHOW_INTAKE.md` |
| Registry | `control/registry.json` +8 items (618 total), `control/CR_REGISTRY.md` new section, `control/CONTROL_DASHBOARD.md` header, `control/OPEN_GAPS_REGISTER.md` +OG-PMS-013 |

## Registered items
| ID | Title | Prio | Risk | Status |
|---|---|---|---|---|
| CR-361 | Room Assignment on Tape Chart | P1 | MEDIUM | INTAKE — BACKEND-BLOCKED |
| CR-362 | Booking Modification & Cancellation | P1 | CRITICAL | INTAKE — BACKEND-BLOCKED |
| CR-363 | Night Audit Report | P1 | HIGH | INTAKE (FE-only, unblocked) |
| CR-364 | Guest Folio Detail Page | P1 | HIGH | INTAKE (FE-only, unblocked) |
| CR-365 | Housekeeping Workflow | P2 | MEDIUM | INTAKE — BACKEND-BLOCKED |
| CR-366 | Revenue Dashboard / Analytics | P2 | MEDIUM | INTAKE (FE-only, unblocked) |
| CR-367 | WhatsApp / SMS Guest Notifications | P2 | HIGH | INTAKE — BACKEND-BLOCKED |
| CR-358-P5 | Rates & Restrictions + Mark No-Show | P1 | HIGH | INTAKE (entry gate cleared) |

## Owner decisions captured (2026-09-04)
- Priorities/risks agreed as proposed ("will review later").
- FULL feature scope; **no v1 workarounds** (no Assign-at-Check-In link, no wa.me share, no HK-board-only view).
- CR-358-P5 registered separately; CR-362 references it for no-show.
- Sprint key `pos_pms_1`.

## Key findings to carry forward
- Live endpoints: `mark-no-show` (booking.com/gommt only — verified 422 for Direct), `push-rates`, `fetch-rates` (200, 8 rateplans), `push-inventory-restrictions`, `push-rate-restrictions`.
- Absent (404): any assign-room, cancel/modify/extend-stay, night-audit, folio, hk-tasks, employee-list (probed paths), guest notification routes.
- **OG-PMS-013**: status board soft-allocates unassigned bookings to rooms; tape chart shows them unassigned.
- `dashboard-kpis`: ≤31-day range, `channel` always null.
- Sandbox lacks cancelled/no-show reservation samples.
- `__dev/data/cr_registry.json` dashboard data is stale (generated 2026-07-25, no `pos_pms_1` sprint) — pre-existing drift; regenerate via `gen_dashboard_sync.py` at closure.

## Open owner decisions (per intake docs)
OD-361-01..04 · OD-362-01..06 · OD-363-01..06 · OD-364-01..05 · OD-365-01..06 · OD-366-01..06 · OD-367-01..06 · OD-P5-01..04. Gate-2 blockers: OD-363-01/02, OD-366-01 (R6 revenue semantics).

## Next
1. Owner: Gate 6 smoke for CR-358-P3/P4 (still pending).
2. Owner: choose Gate 2 order among unblocked CR-363 / CR-364 / CR-366 / CR-358-P5 → PLANNING role (Impact Analysis).
3. PLANNING (Gate 2) for blocked items writes `BACKEND_BRIEF_CR-361/362/365/367`.
4. Unresolved from earlier sessions: `REACT_APP_CRM_API_KEYS` truncated; Sidebar `#3B82F6`; BUG-381 live test.
